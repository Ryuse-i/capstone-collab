from app.core.base_repo import BaseRepo
from .model import Notification
from uuid import UUID

class NotificationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Notification)

    @staticmethod
    async def get_user_notification(user_id: UUID):
        
