from app.core.base_repo import BaseRepo
from app.modules.task_contents.model import TaskContent


class TaskContentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskContent)
