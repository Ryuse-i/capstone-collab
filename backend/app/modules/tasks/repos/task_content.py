from app.core.base_repo import BaseRepo
from app.modules.tasks.models.task_content import TaskContent


class TaskContentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskContent)
