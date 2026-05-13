from app.core.base_repo import BaseRepo
from app.modules.supertasks.model import Supertask


class SupertaskRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Supertask)
