from app.core.base_repo import BaseRepo
from .model import MemberSnapshot
from .schema import MemberSnapshotUpsert
from datetime import date
from sqlalchemy.dialects.postgresql import insert
from uuid import UUID
from sqlalchemy import select

CARRY_FIELDS = (
    "workload_status",
    "total_effective_points",
    "expected_points",
    "capacity_multiplier",
    "silence_warning",
    "consecutive_fallback_count",
)
CONFLICT_COLS = ["member_id", "snapshot_date"]

class MemberSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberSnapshot)

    async def upsert_today_member_snapshot(
        self, member_id: UUID, metrics: MemberSnapshotUpsert
    ):
        today = date.today()

        # only fields explicitly sent; never touch the keys
        updates = metrics.model_dump(
            exclude_unset=True, exclude_none=True, exclude={"member_id"}
        )

        # carry forward from the latest snapshot (may be yesterday or older)
        latest = await self.get_latest_member_snapshot(member_id)
        carried = (
            {f: getattr(latest, f) for f in CARRY_FIELDS} if latest else {}
        )

        stmt = insert(MemberSnapshot).values(
            member_id=member_id,
            snapshot_date=today,
            **{**carried, **updates},  # updates win over carried values
        )
        if updates:
            stmt = stmt.on_conflict_do_update(
                index_elements=CONFLICT_COLS, set_=updates
            )
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=CONFLICT_COLS)

        result = await self.db.execute(stmt.returning(MemberSnapshot))
        snapshot = result.scalar_one_or_none()

        # DO NOTHING returns no row on conflict, so fetch today's row
        if snapshot is None:
            result = await self.db.execute(
                select(MemberSnapshot).where(
                    MemberSnapshot.member_id == member_id,
                    MemberSnapshot.snapshot_date == today,
                )
            )
            snapshot = result.scalar_one()
        return snapshot

    async def get_latest_member_snapshot(self, member_id: UUID):
        stmt = (
            select(MemberSnapshot)
            .where(MemberSnapshot.member_id == member_id)
            .order_by(MemberSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
