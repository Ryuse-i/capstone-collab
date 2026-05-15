from app.core.base_repo import BaseRepo
from .model import MemberActivity


class MemberActivityRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberActivity)
