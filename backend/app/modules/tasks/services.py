from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tasks.model import Task, Category, Complexity
from app.modules.tasks.repo import TaskRepo
from app.modules.tasks.schema import (
    TaskCreate,
    TaskResponseWithMembers,
    TaskUpdate,
)
from app.modules.project_members.model import Skills
from app.modules.ai.service import score_task_complexity
from app.modules.project_snapshots.services import ProjectSnapshotService
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert
from app.modules.member_activities.model import ActivityType
from app.modules.member_activities.services import MemberActivityService
from .enums import Status
from app.modules.assigned_members.repo import AssignedMemberRepo
from uuid import UUID

_VERDICT_TO_COMPLEXITY: dict[int, Complexity] = {
    1: Complexity.LOW,
    2: Complexity.MEDIUM,
    3: Complexity.HIGH,
}


class TaskService:
    @staticmethod
    async def get_one_task(db: AsyncSession, task_id):
        repo = TaskRepo(db)
        return await repo.get_by_id(task_id)

    @staticmethod
    async def get_all_project_tasks(db: AsyncSession, project_id):
        repo = TaskRepo(db)
        return await repo.get_all_project_tasks(project_id)

    @staticmethod
    async def get_all_tasks(db: AsyncSession):
        repo = TaskRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task(
        db: AsyncSession, task: TaskCreate, user_id: UUID | None = None
    ):
        repo = TaskRepo(db)

        # Create the task first
        created_task = await repo.create(task)

        # Capture now: later commits can expire the instance, and attribute
        # access on an expired instance fails on an async session
        project_id = created_task.project_id
        task_id = created_task.id
        task_name = created_task.name

        # Sync the unassigned tasks count for the project
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)

        if user_id:
            await MemberActivityService.log(
                db,
                project_id=project_id,
                user_id=user_id,
                type=ActivityType.TASK_CREATED,
                message=f'Created task "{task_name}"',
                task_id=task_id,
            )

        return created_task

    @staticmethod
    async def update_task(
        db: AsyncSession,
        db_item: Task,
        task: TaskUpdate,
        user_id: UUID | None = None,
    ):
        # Lazy import, same pattern you use elsewhere to avoid circular imports
        from app.modules.member_snapshots.services import MemberSnapshotService

        repo = TaskRepo(db)

        # Capture BEFORE the update, since repo.update likely mutates db_item in place
        old_status = db_item.status
        new_status = getattr(task, "status", None)

        updated_task = await repo.update(db_item, task)

        # Capture now: later commits can expire the instance
        project_id = updated_task.project_id
        task_id = updated_task.id
        task_name = updated_task.name
        complexity = updated_task.complexity

        just_completed = (
            new_status == Status.COMPLETED and old_status != Status.COMPLETED
        )
        just_uncompleted = (
            old_status == Status.COMPLETED
            and new_status is not None
            and new_status != Status.COMPLETED
        )

        if just_completed or just_uncompleted:
            points = MemberSnapshotService.complexity_to_points(complexity)
            if points:
                delta = points if just_completed else -points
                # Query directly instead of touching task.assigned_members,
                # which would lazy-load and fail on an async session
                assignments = await AssignedMemberRepo(db).get_task_members(task_id)
                for assignment in assignments:
                    if assignment.member_id:
                        await MemberSnapshotService.add_contribution_points(
                            db, assignment.member_id, delta
                        )

        # Log status transitions only (not every field edit)
        if user_id and new_status is not None and new_status != old_status:
            if just_completed:
                message = f'Completed task "{task_name}"'
            elif just_uncompleted:
                message = f'Reopened task "{task_name}"'
            else:
                status_label = getattr(new_status, "value", new_status)
                message = f'Moved task "{task_name}" to {status_label}'

            await MemberActivityService.log(
                db,
                project_id=project_id,
                user_id=user_id,
                type=ActivityType.TASK_STATUS_CHANGED,
                message=message,
                task_id=task_id,
            )

        return updated_task

    @staticmethod
    async def delete_task(db: AsyncSession, db_item: Task):
        from app.modules.task_attachments.services import TaskAttachmentService
        from app.modules.project_snapshots.services import ProjectSnapshotService
        repo = TaskRepo(db)
        project_id = db_item.project_id
        for att in await TaskAttachmentService.get_by_task(db, db_item.id):
            await TaskAttachmentService.delete(db, att.id)
        result = await repo.delete(db_item)
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)
        await ProjectSnapshotService.calculate_project_workload(db, project_id)
        return result

    @staticmethod
    def _determine_task_category(primary_skill: Skills) -> Category:
        category_map: dict[Category, list[Skills]] = {
            Category.DEVELOPMENT: [
                Skills.BACKEND_DEVELOPMENT,
                Skills.FRONTEND_DEVELOPMENT,
                Skills.MOBILE_DEVELOPMENT,
                Skills.IOT_DEVELOPMENT,
                Skills.DATABASE_DESIGN,
                Skills.SYSTEM_ARCHITECTURE,
                Skills.UI_UX_DESIGN,
                Skills.TESTING_AND_QUALITY_ASSURANCE,
            ],
            Category.RESEARCH: [
                Skills.LITERATURE_REVIEW,
                Skills.DATA_COLLECTION,
                Skills.SURVEY_AND_QUESTIONNAIRE_DESIGN,
                Skills.INTERVIEW_AND_OBSERVATION,
                Skills.DATA_ANALYSIS,
            ],
            Category.DOCUMENT: [
                Skills.TECHNICAL_WRITING,
                Skills.DOCUMENTATION,
                Skills.DIAGRAM_AND_MODELING,
                Skills.EDITING_AND_PROOFREADING,
            ],
            Category.FINANCE: [
                Skills.FINANCIAL_DOCUMENTATION,
                Skills.BUDGET_PLANNING,
                Skills.RESOURCE_MANAGEMENT,
            ],
        }

        for category, skills in category_map.items():
            if primary_skill in skills:
                return category

        raise ValueError(f"No category found for skill: {primary_skill}")

    @staticmethod
    async def get_assigned_members(db: AsyncSession, project_id: UUID):
        repo = TaskRepo(db)
        tasks = await repo.get_assigned_members(project_id)
        return [
            TaskResponseWithMembers.model_validate(
                {
                    **{
                        col: getattr(task, col) for col in task.__table__.columns.keys()
                    },
                    "member_id": task.assigned_members[0].members.id
                    if task.assigned_members
                    else None,
                    "assigned_members": [
                        member.members.user for member in task.assigned_members
                    ],
                }
            )
            for task in tasks
        ]

    @staticmethod
    async def get_tasks_for_user(db: AsyncSession, user_id: UUID):
        repo = TaskRepo(db)
        tasks = await repo.get_tasks_for_user(user_id)

        # Convert to TaskResponseWithMembers format - matching the pattern in get_assigned_members
        from app.modules.tasks.schema import TaskResponseWithMembers

        result = []
        for task in tasks:
            # Get the assigned members for this task (already loaded via selectinload)
            assigned_members_obj = task.assigned_members or []

            # Extract user objects from assigned members (matching get_assigned_members pattern)
            assigned_members = [
                am.members.user for am in assigned_members_obj if am.members and am.members.user
            ]

            # Build the TaskResponseWithMembers object
            task_dict = {
                col: getattr(task, col) for col in task.__table__.columns.keys()
            }
            task_dict["assigned_members"] = assigned_members
            # For tasks fetched by user_id, we need to set member_id to one of the member ids
            # for this task and user. Since a user can only be assigned once to a task,
            # we can take the first one.
            member_id = None
            if assigned_members_obj:
                member_id = assigned_members_obj[0].member_id
            task_dict["member_id"] = member_id

            result.append(TaskResponseWithMembers.model_validate(task_dict))

        return result

    @staticmethod
    async def batch_get_task(db: AsyncSession, ids: Sequence[UUID]):
        repo = TaskRepo(db)
        return await repo.batch_get_task(ids)

    @staticmethod
    async def get_eligible_tasks(db: AsyncSession, ids: Sequence[UUID]):
        repo = TaskRepo(db)
        return await repo.get_eligible_tasks(ids)


    @staticmethod
    async def get_tasks_for_reviewer(db: AsyncSession, user_id: UUID, project_id: UUID):
        repo = TaskRepo(db)
        tasks = await repo.get_tasks_by_reviewer(user_id, project_id)

        result = []
        for task in tasks:
            assigned_members_obj = task.assigned_members or []

            assigned_members = [
                am.members.user
                for am in assigned_members_obj
                if am.members and am.members.user
            ]

            task_dict = {
                col: getattr(task, col) for col in task.__table__.columns.keys()
            }
            task_dict["assigned_members"] = assigned_members
            task_dict["member_id"] = (
                assigned_members_obj[0].member_id if assigned_members_obj else None
            )

            result.append(TaskResponseWithMembers.model_validate(task_dict))

        return result