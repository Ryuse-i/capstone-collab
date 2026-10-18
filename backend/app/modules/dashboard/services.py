"""
service.py  -> app/modules/dashboard/service.py

Builds the whole instructor/advisor dashboard payload for the current user. Everything is
scoped to "projects where Project.instructor or Project.advisor == user" (same rule as
ProjectRepo.get_projects_for_instructor). No role restrictions yet, by design.
"""
from datetime import timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.repo import ProjectRepo
from app.modules.member_activities.services import MemberActivityService

from .repo import DashboardRepo
from .schema import (
    DashboardDeadline,
    DashboardProject,
    DashboardStats,
    InstructorDashboardResponse,
)

UPCOMING_DAYS = 30  # how far ahead the deadlines list looks


def _urgency(days: int) -> str:
    if days < 0:
        return "overdue"
    if days == 0:
        return "today"
    if days <= 3:
        return "soon"
    return "later"


async def _health_for(db: AsyncSession, project_id: UUID):
    """
    (status, score) from the live health service, or (None, None) if it fails so one bad
    project can't break the whole dashboard. NOTE: this runs several queries per project
    (one per open task); fine for a handful of projects, batch or cache it if it gets slow.
    """
    try:
        from app.modules.project_health.project_health_service import (  # lazy: avoids circular imports
            ProjectHealthService,
        )

        health = await ProjectHealthService.calculate_project_health(db, project_id)
        score = float(health.score) if health.score is not None else None
        return health.status.value, score
    except Exception:
        return None, None


class DashboardService:
    @staticmethod
    async def get_instructor_dashboard(
        db: AsyncSession, user_id: UUID
    ) -> InstructorDashboardResponse:
        from app.modules.project_snapshots.services import app_today  # lazy; Asia/Manila date

        today = app_today()
        repo = DashboardRepo(db)

        projects = await ProjectRepo(db).get_projects_for_instructor(user_id)
        project_ids = [p.id for p in projects]

        progress = await repo.latest_progress(project_ids)
        pending = await repo.pending_by_project(user_id, project_ids)

        health: dict[UUID, tuple[str | None, float | None]] = {}
        for p in projects:  # sequential on purpose: one AsyncSession can't run concurrent queries
            health[p.id] = await _health_for(db, p.id)

        # One row per role, like the Projects page (a user who is both gets two rows).
        rows: list[DashboardProject] = []
        for p in projects:
            roles = []
            if p.instructor == user_id:
                roles.append("instructor")
            if p.advisor == user_id:
                roles.append("advisor")
            for role in roles:
                status, score = health[p.id]
                rows.append(
                    DashboardProject(
                        id=p.id,
                        name=p.name,
                        role=role,
                        health=status,
                        health_score=score,
                        progress=progress.get(p.id, 0),
                        pending_submissions=pending.get(p.id, 0),
                    )
                )

        # Deadlines
        role_by_project = {r.id: r.role for r in rows}  # first role wins for the label
        name_by_project = {p.id: p.name for p in projects}
        tasks = await repo.open_tasks_due_by(
            project_ids, today + timedelta(days=UPCOMING_DAYS)
        )
        deadlines: list[DashboardDeadline] = []
        for t in tasks:
            days = (t.deadline - today).days
            names = [
                f"{am.members.user.first_name} {am.members.user.last_name}".strip()
                for am in (t.assigned_members or [])
                if am.members and am.members.user
            ]
            deadlines.append(
                DashboardDeadline(
                    id=t.id,
                    project_id=t.project_id,
                    project_name=name_by_project.get(t.project_id, ""),
                    role=role_by_project.get(t.project_id, "instructor"),
                    title=t.name,
                    student_names=names,
                    note=t.description or None,
                    deadline=t.deadline,
                    days_from_now=days,
                    urgency=_urgency(days),
                )
            )

        # Stats count each project once, even if the user holds both roles on it.
        unique_ids = {p.id for p in projects}
        stats = DashboardStats(
            total_projects=len(unique_ids),
            at_risk_projects=sum(
                1 for pid in unique_ids if health[pid][0] in ("watch", "at_risk")
            ),
            pending_submissions=sum(pending.get(pid, 0) for pid in unique_ids),
            overdue_deadlines=await repo.overdue_count(project_ids, today),
        )

        recent_activity = await MemberActivityService.get_recent_for_dashboard(
            db, project_ids, limit=10
        )

        return InstructorDashboardResponse(
            projects=rows,
            deadlines=deadlines,
            stats=stats,
            recent_activity=recent_activity,
        )