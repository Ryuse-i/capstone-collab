from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tasks.model import Task, Category, Complexity
from app.modules.tasks.repo import TaskRepo
from app.modules.tasks.schema import TaskCreate, TaskUpdate
from app.modules.project_members.model import Skills
from app.modules.ai.service import score_task_complexity
from app.modules.project_snapshots.services import ProjectSnapshotService
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert

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
    async def create_task(db: AsyncSession, task: TaskCreate):
        repo = TaskRepo(db)

        ai_result = await score_task_complexity(task.name, task.description)
        category = TaskService._determine_task_category(task.primary_skill)
        complexity = _VERDICT_TO_COMPLEXITY[ai_result.verdict]
        complexity_points = ai_result.verdict

        task_item = task.model_copy(
            update={
                "category": category,
                "complexity": complexity,
                "complexity_points": complexity_points,
            }
        )

        # update the project_snapshot to have +1 unassigned_tasks
        snapshot = await ProjectSnapshotService.get_latest_snapshot(
            db, task_item.project_id
        )
        u_tasks = snapshot.unassigned_tasks + 1
        update_snapshot = ProjectSnapshotUpsert(unassigned_tasks=u_tasks)
        # update the snapshot
        await ProjectSnapshotService.upsert_today_snapshot(
            db, task_item.project_id, update_snapshot
        )

        return await repo.create(task_item)
        # send http request towards openrouter free model for the

    @staticmethod
    async def update_task(db: AsyncSession, db_item: TaskUpdate, task: TaskUpdate):
        repo = TaskRepo(db)
        return await repo.update(db_item, task)

    @staticmethod
    async def delete_task(db: AsyncSession, db_item: Task):
        repo = TaskRepo(db)

        task = await repo.get_assigned_members(db_item.id)

        if not task.assigned_members:
            snapshot = await ProjectSnapshotService.get_latest_snapshot(
                db, db_item.project_id
            )
            u_tasks = 0
            if snapshot.unassigned_tasks > 0:
                u_tasks = snapshot.unassigned_tasks - 1

            update_snapshot = ProjectSnapshotUpsert(unassigned_tasks=u_tasks)
            # update the snapshot
            await ProjectSnapshotService.upsert_today_snapshot(
                db, db_item.project_id, update_snapshot
            )
        return await repo.delete(db_item)

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
