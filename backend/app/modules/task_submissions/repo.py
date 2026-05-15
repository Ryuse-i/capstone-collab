from app.core.base_repo import BaseRepo
from app.modules.task_submissions.model import TaskSubmission


class TaskSubmissionRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskSubmission)
