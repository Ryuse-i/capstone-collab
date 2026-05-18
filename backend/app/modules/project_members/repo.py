from app.core.base_repo import BaseRepo
from .model import ProjectMember, ProjectInvitation

class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)


class ProjectInvitationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectInvitation)