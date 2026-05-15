from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from .model import Type


class RedisRecomCreate(BaseModel):
    name: str
    details: str
    project_id: UUID
    suggestion_type: Type
    rank: int
    expected_workload_after: str
    deadline_impact: str


class RedisRecomUpdate(BaseModel):
    name: str | None = None
    details: str | None = None
    project_id: UUID | None = None
    suggestion_type: Type | None = None
    rank: int | None = None
    expected_workload_after: str | None = None
    deadline_impact: str | None = None


class RedisRecomResponse(BaseModel):
    id: UUID
    name: str
    details: str
    project_id: UUID
    suggestion_type: Type
    rank: int
    expected_workload_after: str
    deadline_impact: str
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True
