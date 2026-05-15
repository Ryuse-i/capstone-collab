from app.core.base_repo import BaseRepo
from .model import ProjectMember

class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)
