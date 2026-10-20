from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from .model import Type

class SplitPart(BaseModel):
    title: str
    description: str
    complexity_points: int
    primary_skill: str
    secondary_skills: list[str] = []


class SplitDetails(BaseModel):
    task_name: str | None = None
    donor_part: SplitPart
    recipient_part: SplitPart
    split_rationale: str

class RedisRecomCreate(BaseModel):
    detail: str
    project_id: UUID
    suggestion_type: Type
    rank: int
    expected_workload_after: str
    deadline_impact: str
    split: SplitDetails | None = None
    # References / type-specific data (all optional)
    task_id: UUID | None = None
    from_member_id: UUID | None = None
    to_member_id: UUID | None = None
    task_name: str | None = None
    from_member_name: str | None = None
    to_member_name: str | None = None
    current_deadline: date | None = None
    suggested_deadline: date | None = None
    extension_days: int | None = None
    points_moved: Decimal | None = None
    recipient_points: int | None = None


class RedisRecomUpdate(BaseModel):
    detail: str | None = None
    project_id: UUID | None = None
    suggestion_type: Type | None = None
    rank: int | None = None
    expected_workload_after: str | None = None
    deadline_impact: str | None = None
    split: SplitDetails | None = None
    task_id: UUID | None = None
    from_member_id: UUID | None = None
    to_member_id: UUID | None = None
    task_name: str | None = None
    from_member_name: str | None = None
    to_member_name: str | None = None
    current_deadline: date | None = None
    suggested_deadline: date | None = None
    extension_days: int | None = None
    points_moved: Decimal | None = None
    recipient_points: int | None = None


class RedisRecomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    detail: str
    project_id: UUID
    suggestion_type: Type
    rank: int
    expected_workload_after: str
    deadline_impact: str
    split: SplitDetails | None = None
    task_id: UUID | None = None
    from_member_id: UUID | None = None
    to_member_id: UUID | None = None
    task_name: str | None = None
    from_member_name: str | None = None
    to_member_name: str | None = None
    current_deadline: date | None = None
    suggested_deadline: date | None = None
    extension_days: int | None = None
    points_moved: Decimal | None = None
    recipient_points: int | None = None

    created_at: datetime
    updated_at: datetime
