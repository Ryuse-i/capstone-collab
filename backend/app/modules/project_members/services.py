from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.model import Project
from app.modules.projects.schema import ProjectResponseSnapshot
from app.modules.users.model import User
from app.modules.member_snapshots.schema import MemberSnapshotUpsert

from .model import ProjectMember
from .repo import ProjectMemberRepo
from .schema import ProjectMemberCreate, ProjectMemberUpdate


class ProjectMemberService:
    @staticmethod
    async def get_current_member(db: AsyncSession, member_id: UUID):
        repo = ProjectMemberRepo(db)
        return await repo.get_current_member(member_id)

    @staticmethod
    async def get_one_member(db: AsyncSession, project_member_id):
        repo = ProjectMemberRepo(db)
        return await repo.get_by_id(project_member_id)

    @staticmethod
    async def get_member_by_user_id(db: AsyncSession, user_id: UUID):
        repo = ProjectMemberRepo(db)
        return await repo.get_by_user_id(user_id)

    @staticmethod
    async def get_all_members(db: AsyncSession):
        repo = ProjectMemberRepo(db)
        return await repo.get_all()

    @staticmethod
    async def get_all_members_by_project(db: AsyncSession, project_id: UUID):
        repo = ProjectMemberRepo(db)
        return await repo.get_all_members_by_project(project_id)

    @staticmethod
    async def get_all_projects_by_member(db: AsyncSession, member_id: UUID):
        repo = ProjectMemberRepo(db)
        return await repo.get_all_projects_by_member(member_id)

    @staticmethod
    async def add_member(db: AsyncSession, project_member: ProjectMemberCreate):
        repo = ProjectMemberRepo(db)

        if project_member.user_id is None or project_member.project_id is None:
            raise HTTPException(
                status_code=400, detail="user_id and project_id are required"
            )

        existing_member = await repo.get_by_user_and_project(
            project_member.user_id, project_member.project_id
        )
        if existing_member:
            raise HTTPException(status_code=409, detail="Project member already exists")

        # conflict of python in fastapiusers User.id fields type matching
        user_result = await db.execute(
            select(User).where(User.id == project_member.user_id)  # pyright: ignore[reportArgumentType]
        )
        if not user_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="User not found")

        project_result = await db.execute(
            select(Project).where(Project.id == project_member.project_id)
        )
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Project not found")

        try:
            result = await repo.create(project_member)

            from app.modules.member_snapshots.services import MemberSnapshotService

            # create member_snapshot
            await MemberSnapshotService.upsert_today_member_snapshot(
                db, result.id, MemberSnapshotUpsert()
            )

            return result

            # create the project member snapshot here
        except IntegrityError as exc:
            raise HTTPException(
                status_code=409, detail="Unable to create project member"
            ) from exc

    @staticmethod
    async def update_member(
        db: AsyncSession,
        db_item: ProjectMember,
        project_member: ProjectMemberUpdate,
    ):
        repo = ProjectMemberRepo(db)
        return await repo.update(db_item, project_member)

    @staticmethod
    async def get_project_for_member_with_snapshot(
        db: AsyncSession, user_id: UUID, project_id: UUID
    ) -> ProjectResponseSnapshot | None:
        member_repo = ProjectMemberRepo(db)
        member = await member_repo.get_by_user_and_project(user_id, project_id)
        if not member:
            return None

        from app.modules.projects.services import ProjectService

        return await ProjectService.get_by_id_with_snapshot(db, project_id)

    @staticmethod
    async def delete_member(db: AsyncSession, db_item: ProjectMember):
        repo = ProjectMemberRepo(db)
        await repo.delete(db_item)
        return None

    @staticmethod
    async def get_members_by_project_with_member_snapshot(
        db: AsyncSession, project_id: UUID
    ):
        repo = ProjectMemberRepo(db)
        return await repo.get_members_by_project_with_member_snapshot(project_id)
