from .model import ProjectSnapshot
from app.core.base_repo import BaseRepo


class ProjectSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectSnapshot)
