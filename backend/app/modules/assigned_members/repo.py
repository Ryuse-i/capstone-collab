from app.core.base_repo import BaseRepo
from app.modules.assigned_members.model import AssignedMember


class AssignedMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, AssignedMember)
