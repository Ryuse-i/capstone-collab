from app.core.base_repo import BaseRepo
from .model import MemberSnapshot


class MemberSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberSnapshot)
