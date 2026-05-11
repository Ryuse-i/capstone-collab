from app.core.base_repo import BaseRepo
from app.modules.projects.model import Project
from app.modules.projects.model import ProjectMember


class ProjectRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Project)


class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)
