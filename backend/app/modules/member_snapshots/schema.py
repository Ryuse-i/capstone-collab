from pydantic import BaseModel, ConfigDict
from datetime import date
from uuid import UUID
from .model import MemberStatus
from decimal import Decimal


class MemberSnapshotUpsert(BaseModel):
    member_id: UUID | None = None
    workload_status: MemberStatus | None = None
    total_effective_points: Decimal | None = None
    capacity_multiplier: Decimal | None = None
    silence_warning: bool | None = None
    consecutive_fallback_count: int | None = None


class MemberSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_id: UUID
    workload_status: MemberStatus
    total_effective_points: Decimal
    capacity_multiplier: Decimal
    silence_warning: bool
    consecutive_fallback_count: int
    snapshot_date: date
