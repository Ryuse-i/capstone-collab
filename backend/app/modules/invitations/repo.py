from app.core.base_repo import BaseRepo
from .model import ProjectInvitation


class ProjectInvitationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectInvitation)
