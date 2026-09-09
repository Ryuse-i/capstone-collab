from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo

from .model import Meeting, MeetingStatus


class MeetingRepo(BaseRepo):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Meeting)

    async def get_by_id(self, meeting_id: UUID) -> Meeting | None:
        query = select(Meeting).where(Meeting.id == meeting_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_project(self, project_id: UUID) -> list[Meeting]:
        query = (
            select(Meeting)
            .where(Meeting.project_id == project_id)
            .order_by(Meeting.start_time.asc().nullslast(), Meeting.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, meeting: Meeting) -> Meeting:
        self.db.add(meeting)
        await self.db.flush()
        await self.db.refresh(meeting)
        return meeting

    async def cancel(self, meeting: Meeting) -> Meeting:
        meeting.status = MeetingStatus.CANCELLED
        await self.db.flush()
        await self.db.refresh(meeting)
        return meeting
