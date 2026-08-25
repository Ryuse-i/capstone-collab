from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert
from app.modules.projects.model import Project
from app.modules.projects.repo import ProjectRepo
from app.modules.projects.schema import (
    ProjectCreate,
    ProjectResponseSnapshot,
    ProjectUpdate,
    ProjectResponse,
)
from app.modules.project_snapshots.repo import ProjectSnapshotRepo
from app.modules.project_snapshots.schema import ProjectSnapshotResponse


class ProjectService:
    @staticmethod
    async def get_one_project(db: AsyncSession, project_id):
        repo = ProjectRepo(db)
        return await repo.get_by_id(project_id)

    @staticmethod
    async def get_all_projects(db: AsyncSession):
        repo = ProjectRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_project(db: AsyncSession, project: ProjectCreate):
        # initialize the repos
        project_repo = ProjectRepo(db)
        snapshot_repo = ProjectSnapshotRepo(db)

        try:
            project_result = await project_repo.create(project)
            await snapshot_repo.upsert_today_snapshot(
                project_result.id, ProjectSnapshotUpsert()
            )

            return project_result
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def update_project(
        db: AsyncSession, db_item: ProjectUpdate, project: ProjectUpdate
    ):
        repo = ProjectRepo(db)
        return await repo.update(db_item, project)

    @staticmethod
    async def delete_project(db: AsyncSession, db_item: Project):
        repo = ProjectRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def get_project_by_user(db: AsyncSession, user_id) -> Project | None:
        repo = ProjectRepo(db)
        return await repo.get_by_creator(user_id)

    @staticmethod
    async def get_project_with_snapshot(db: AsyncSession, user_id) -> Project | None:
        repo = ProjectRepo(db)
        return await repo.get_by_creator_with_latest_snapshot(user_id)

    @staticmethod
    async def get_projects_for_instructor(db: AsyncSession, user_id):
        repo = ProjectRepo(db)
        return await repo.get_projects_for_instructor(user_id)

    @staticmethod
    async def get_projects_for_instructor_with_snapshot(db: AsyncSession, user_id):
        repo = ProjectRepo(db)
        return await repo.get_projects_for_user_with_snapshot(user_id)

    @staticmethod
    async def get_by_id_with_snapshot(
        db: AsyncSession, project_id
    ) -> ProjectResponseSnapshot | None:
        repo = ProjectRepo(db)
        project = await repo.get_by_id(project_id)
        if project is None:
            return None

        from app.modules.project_snapshots.services import ProjectSnapshotService

        latest_snapshot = await ProjectSnapshotService.get_latest_snapshot(
            db, project_id
        )

        return ProjectResponseSnapshot(
            **ProjectResponse.model_validate(
                project, from_attributes=True
            ).model_dump(),
            snapshot=(
                ProjectSnapshotResponse.model_validate(
                    latest_snapshot, from_attributes=True
                )
                if latest_snapshot is not None
                else None
            ),
        )

    @staticmethod
    async def get_project_with_latest_snapshot(db, project_id):
        repo = ProjectRepo(db)
        return await repo.get_project_with_latest_snapshot(project_id)
