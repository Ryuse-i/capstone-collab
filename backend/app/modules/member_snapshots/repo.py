from app.core.base_repo import BaseRepo
from .model import MemberSnapshot
from datetime import date
from .schema import MemberSnapshotUpsert
from uuid import UUID
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select


class MemberSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberSnapshot)

    async def upsert_today_member_snapshot(
        self, member_id: UUID, metrics: MemberSnapshotUpsert
    ):
        today = date.today()

        # Only include fields that were explicitly set to avoid using defaults
        # when the user didn't provide a value (to respect database defaults)
        values = {
            k: v
            for k, v in metrics.model_dump().items()
            if k in metrics.model_fields_set
        }

        # Try to get existing snapshot for today
        stmt = select(MemberSnapshot).where(
            MemberSnapshot.member_id == member_id,
            MemberSnapshot.snapshot_date == today
        )
        result = await self.db.execute(stmt)
        existing_snapshot = result.scalar_one_or_none()

        if existing_snapshot:
            # Update existing snapshot with only the fields that were explicitly set
            for key, value in values.items():
                setattr(existing_snapshot, key, value)
            await self.db.flush()
            await self.db.refresh(existing_snapshot)
            return existing_snapshot
        else:
            # Create new snapshot
            # Always include required fields plus any explicitly set fields
            create_data = {
                'member_id': member_id,
                'snapshot_date': today,
                **values
            }
            new_snapshot = MemberSnapshot(**create_data)
            self.db.add(new_snapshot)
            await self.db.flush()
            await self.db.refresh(new_snapshot)
            return new_snapshot

    async def get_latest_member_snapshot(self, member_id: UUID):
        stmt = (
            select(MemberSnapshot)
            .where(MemberSnapshot.member_id == member_id)
            .order_by(MemberSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
