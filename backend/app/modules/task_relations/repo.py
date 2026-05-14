from app.core.base_repo import BaseRepo
from app.modules.task_relations.model import TaskRelation


class TaskRelationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskRelation)
