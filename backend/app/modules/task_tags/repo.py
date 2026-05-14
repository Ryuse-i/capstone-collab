from app.core.base_repo import BaseRepo
from app.modules.task_tags.model import Tag, TaskTag


class TagRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Tag)


class TaskTagRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskTag)
