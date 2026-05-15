from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from .model import MemberStatus
from decimal import Decimal


class MemberSnapshotCreate(BaseModel):
    member_id: UUID
    workload_points: Decimal
    workload_status: MemberStatus


class MemberSnapshotUpdate(BaseModel):
    member_id: UUID | None = None
    workload_points: Decimal | None = None
    workload_status: MemberStatus | None = None


class MemberSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_id: UUID
    workload_points: float
    workload_status: MemberStatus
    created_at: datetime
