from datetime import datetime, timedelta, timezone
from time import perf_counter

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.activity_model import ActivityLog
from app.modules.files.model import StoredFile
from app.modules.project_members.model import ProjectMember
from app.modules.projects.model import Project
from app.modules.tasks.enums import Status
from app.modules.tasks.model import Task
from app.modules.users.model import User, UserRole


class AdminMetricsService:
    """Compute system overview metrics directly from persisted domain records."""

    @staticmethod
    async def get_overview(db: AsyncSession) -> dict:
        started = perf_counter()
        now = datetime.now(timezone.utc)
        week_cutoff = now - timedelta(days=7)
        recent_cutoff = now - timedelta(days=30)
        day_cutoff = now - timedelta(hours=24)

        database_started = perf_counter()
        await db.execute(select(1))
        database_response_ms = round((perf_counter() - database_started) * 1000, 2)

        user_rows = await db.execute(
            select(
                User.role,
                User.is_active,
                User.is_verified,
                func.count(User.id),
                func.count(case((User.created_at >= week_cutoff, User.id))),
                func.count(case((User.created_at >= recent_cutoff, User.id))),
                func.count(
                    case(
                        (
                            User.is_active.is_(True)
                            & (User.last_login_at >= week_cutoff),
                            User.id,
                        )
                    )
                ),
                func.count(
                    case(
                        (
                            User.is_active.is_(True)
                            & (User.last_login_at >= recent_cutoff),
                            User.id,
                        )
                    )
                ),
                func.count(
                    case(
                        (
                            User.is_verified.is_(False)
                            & (User.created_at < week_cutoff),
                            User.id,
                        )
                    )
                ),
            )
            .where(User.deleted_at.is_(None))
            .group_by(User.role, User.is_active, User.is_verified)
        )
        by_role = {role.value: 0 for role in UserRole}
        user_total = active_users = inactive_users = verified_users = 0
        new_last_7_days = new_last_30_days = 0
        active_last_7_days = active_last_30_days = unverified_older_than_7_days = 0
        for (
            role,
            is_active,
            is_verified,
            count,
            new_7,
            new_30,
            active_7,
            active_30,
            unverified_older,
        ) in user_rows:
            count = int(count)
            user_total += count
            by_role[role.value] += count
            active_users += count if is_active else 0
            inactive_users += count if not is_active else 0
            verified_users += count if is_verified else 0
            new_last_7_days += int(new_7 or 0)
            new_last_30_days += int(new_30 or 0)
            active_last_7_days += int(active_7 or 0)
            active_last_30_days += int(active_30 or 0)
            unverified_older_than_7_days += int(unverified_older or 0)

        soft_deleted_total = await db.scalar(
            select(func.count(User.id)).where(User.deleted_at.is_not(None))
        )
        failed_logins_last_24h = await db.scalar(
            select(func.count(ActivityLog.id)).where(
                ActivityLog.event_type == "login_failed",
                ActivityLog.created_at >= day_cutoff,
            )
        )

        project_row = (
            await db.execute(
                select(
                    func.count(Project.id),
                    func.count(case((Project.instructor.is_(None), Project.id))),
                    func.count(case((Project.created_at >= recent_cutoff, Project.id))),
                )
            )
        ).one()
        project_memberships = await db.scalar(
            select(func.count(ProjectMember.id)).where(
                ProjectMember.project_id.is_not(None),
                ProjectMember.user_id.is_not(None),
            )
        )

        today = now.date()
        overdue_condition = (
            Task.deadline < today
        ) & Task.status.in_([Status.NOT_STARTED, Status.IN_PROGRESS])
        task_rows = await db.execute(
            select(
                Task.status,
                func.count(Task.id),
                func.count(case((overdue_condition, Task.id))),
                func.count(case((~Task.assigned_members.any(), Task.id))),
                func.count(case((Task.created_at >= recent_cutoff, Task.id))),
            ).group_by(Task.status)
        )
        by_status = {
            Status.NOT_STARTED.value: 0,
            Status.IN_PROGRESS.value: 0,
            Status.SUBMITTED.value: 0,
            Status.COMPLETED.value: 0,
            "unknown": 0,
        }
        task_total = overdue_tasks = unassigned_tasks = new_tasks = 0
        for task_status, count, overdue_count, unassigned_count, recent_count in task_rows:
            status_key = task_status.value if task_status is not None else "unknown"
            count = int(count)
            by_status[status_key] = count
            task_total += count
            overdue_tasks += int(overdue_count or 0)
            unassigned_tasks += int(unassigned_count or 0)
            new_tasks += int(recent_count or 0)

        recent_rows = await db.execute(
            select(
                ActivityLog,
                User.first_name,
                User.last_name,
                User.email,
                User.role,
            )
            .outerjoin(User, User.id == ActivityLog.actor_id)
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id)
            .limit(10)
        )
        admin_rows = await db.execute(
            select(
                ActivityLog,
                User.first_name,
                User.last_name,
                User.email,
            )
            .join(User, User.id == ActivityLog.actor_id)
            .where(User.role == UserRole.ADMIN)
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id)
            .limit(10)
        )

        def actor_name(first_name, last_name, email) -> str:
            return " ".join(part for part in (first_name, last_name) if part) or email or "System"

        recent_activity = [
            {
                "id": log.id,
                "type": log.event_type,
                "actor_name": actor_name(first_name, last_name, email),
                "actor_role": role.value if role is not None else None,
                "target_label": str(log.details.get("target_label") or log.target_type),
                "created_at": log.created_at,
            }
            for log, first_name, last_name, email, role in recent_rows
        ]
        admin_actions = [
            {
                "id": log.id,
                "admin_name": actor_name(first_name, last_name, email),
                "action": log.event_type,
                "target_label": str(log.details.get("target_label") or log.target_type),
                "created_at": log.created_at,
            }
            for log, first_name, last_name, email in admin_rows
        ]

        storage_used = await db.scalar(
            select(func.coalesce(func.sum(StoredFile.size), 0))
        )
        file_summary = (
            await db.execute(
                select(
                    func.count(StoredFile.id),
                    func.coalesce(func.sum(StoredFile.size), 0),
                    func.count(case((StoredFile.created_at >= recent_cutoff, StoredFile.id))),
                )
            )
        ).one()
        file_type_rows = await db.execute(
            select(
                func.coalesce(StoredFile.content_type, "unknown").label("content_type"),
                func.count(StoredFile.id).label("file_count"),
                func.coalesce(func.sum(StoredFile.size), 0).label("total_size_bytes"),
            )
            .group_by("content_type")
            .order_by(func.count(StoredFile.id).desc(), "content_type")
        )
        recent_file_rows = await db.execute(
            select(StoredFile)
            .order_by(StoredFile.created_at.desc(), StoredFile.id)
            .limit(5)
        )
        api_response_ms = round((perf_counter() - started) * 1000, 2)

        return {
            "generated_at": now,
            "users": {
                "total": user_total,
                "active": active_users,
                "inactive": inactive_users,
                "verified": verified_users,
                "unverified": user_total - verified_users,
                "new_last_7_days": new_last_7_days,
                "new_last_30_days": new_last_30_days,
                "active_last_7_days": active_last_7_days,
                "active_last_30_days": active_last_30_days,
                "unverified_older_than_7_days": unverified_older_than_7_days,
                "soft_deleted_total": int(soft_deleted_total or 0),
                "failed_logins_last_24h": int(failed_logins_last_24h or 0),
                "by_role": by_role,
            },
            "projects": {
                "total": int(project_row[0]),
                "without_instructor": int(project_row[1]),
                "memberships": int(project_memberships or 0),
                "new_last_30_days": int(project_row[2]),
            },
            "tasks": {
                "total": task_total,
                "overdue": overdue_tasks,
                "unassigned": unassigned_tasks,
                "new_last_30_days": new_tasks,
                "by_status": by_status,
            },
            "files": {
                "total": int(file_summary[0]),
                "total_size_bytes": int(file_summary[1] or 0),
                "new_last_30_days": int(file_summary[2] or 0),
                "by_type": [
                    {
                        "content_type": str(row.content_type),
                        "count": int(row.file_count),
                        "total_size_bytes": int(row.total_size_bytes or 0),
                    }
                    for row in file_type_rows
                ],
                "recent": [
                    {
                        "id": file.id,
                        "filename": file.filename,
                        "content_type": file.content_type,
                        "size": int(file.size or 0),
                        "created_at": file.created_at,
                    }
                    for file in recent_file_rows.scalars()
                ],
            },
            "activity": {
                "recent": recent_activity,
                "admin_actions": admin_actions,
            },
            "system": {
                "api": {
                    "status": "degraded" if api_response_ms > 1000 else "operational",
                    "response_time_ms": api_response_ms,
                },
                "database": {
                    "status": "degraded" if database_response_ms > 500 else "operational",
                    "response_time_ms": database_response_ms,
                },
                "storage": {
                    "used_bytes": int(storage_used or 0),
                    "limit_bytes": None,
                },
                "checked_at": now,
            },
        }