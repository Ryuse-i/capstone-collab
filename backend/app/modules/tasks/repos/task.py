from app.core.base_repo import BaseRepo
from app.modules.tasks.models.task import Task


class TaskRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Task)
