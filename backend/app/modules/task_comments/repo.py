from app.core.base_repo import BaseRepo
from app.modules.task_comments.model import TaskComment


class TaskCommentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskComment)
