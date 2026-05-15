from app.core.base_repo import BaseRepo
from app.modules.projects.model import Project


class ProjectRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Project)


