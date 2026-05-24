from app.core.base_repo import BaseRepo
from .model import ProjectMember, ProjectInvitation
from sqlalchemy import select

class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)

    @staticmethod
    async def get_all_members_by_project(db, project_id):
        query = select(ProjectMember).where(ProjectMember.project_id == project_id)
        result = await db.execute(query)

        return result.scalar().all()

    @staticmethod
    async def get_all_project_by_member(db, member_id):
        query = select(ProjectMember).where(ProjectMember.user_id == member_id)
        result = await db.execute(query)

        return result.scalar().all()
    

class ProjectInvitationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectInvitation)

