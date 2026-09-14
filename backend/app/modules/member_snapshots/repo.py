from app.core.base_repo import BaseRepo
from .model import MemberSnapshot
from .schema import MemberSnapshotUpsert
from datetime import date
from sqlalchemy.dialects.postgresql import insert
from uuid import UUID
from sqlalchemy import select


class MemberSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberSnapshot)

    async def upsert_today_member_snapshot(
        self, member_id: UUID, metrics: MemberSnapshotUpsert
    ):
        today = date.today()
        values = metrics.model_dump(exclude_unset=True)
        stmt = insert(MemberSnapshot).values(
            member_id=member_id,
            snapshot_date=today,
            **values,
        )
        stmt = (
            stmt.on_conflict_do_update(
                index_elements=["member_id", "snapshot_date"], set_=values
            )
            if values
            else stmt.on_conflict_do_nothing(
                index_elements=["member_id", "snapshot_date"]
            )
        ).returning(MemberSnapshot)
        snapshot = await self.db.execute(stmt)
        return snapshot.scalar_one_or_none()

    async def get_latest_member_snapshot(self, member_id: UUID):
        stmt = (
            select(MemberSnapshot)
            .where(MemberSnapshot.member_id == member_id)
            .order_by(MemberSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
