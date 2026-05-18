from .model import ProjectMember, ProjectInvitation
from sqlalchemy.ext.asyncio import AsyncSession
from .schema import (
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectInvitationCreate,
    ProjectInvitationUpdate,
)
from .repo import ProjectMemberRepo, ProjectInvitationRepo


class ProjectMemberService:
    @staticmethod
    async def get_one_member(db: AsyncSession, project_member_id):
        repo = ProjectMemberRepo(db)
        return await repo.get_by_id(project_member_id)

    @staticmethod
    async def get_all_members(db: AsyncSession):
        repo = ProjectMemberRepo(db)
        return await repo.get_all()

    @staticmethod
    async def add_member(db: AsyncSession, project_member: ProjectMemberCreate):
        repo = ProjectMemberRepo(db)
        return await repo.create(project_member)

    @staticmethod
    async def update_member(
        db: AsyncSession,
        db_item: ProjectMemberUpdate,
        project_member: ProjectMemberUpdate,
    ):
        repo = ProjectMemberRepo(db)
        return await repo.update(db_item, project_member)

    @staticmethod
    async def delete_member(db: AsyncSession, db_item: ProjectMember):
        repo = ProjectMemberRepo(db)
        return await repo.delete(db_item)


class ProjectInvitationService:
    @staticmethod
    async def get_one_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        return await repo.get_by_id(invitation_id)

    @staticmethod
    async def get_all_invitations(db: AsyncSession):
        repo = ProjectInvitationRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_invitation(db: AsyncSession, invitation: ProjectInvitationCreate):
        repo = ProjectInvitationRepo(db)
        return await repo.create(invitation)

    @staticmethod
    async def update_invitation(
        db: AsyncSession,
        db_item: ProjectInvitation,
        invitation: ProjectInvitationUpdate,
    ):
        repo = ProjectInvitationRepo(db)
        return await repo.update(db_item, invitation)

    @staticmethod
    async def delete_invitation(db: AsyncSession, db_item: ProjectInvitation):
        repo = ProjectInvitationRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def accept_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        invitation = await repo.get_by_id(invitation_id)
        if invitation:
            update_data = ProjectInvitationUpdate(status="accepted")
            return await repo.update(invitation, update_data)
        return None

    @staticmethod
    async def decline_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        invitation = await repo.get_by_id(invitation_id)
        if invitation:
            update_data = ProjectInvitationUpdate(status="declined")
            return await repo.update(invitation, update_data)
        return None
