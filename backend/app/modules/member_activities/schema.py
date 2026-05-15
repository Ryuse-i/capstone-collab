from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class MemberActivityCreate(BaseModel):
    member_id: UUID
    detail: str


class MemberActivityUpdate(BaseModel):
    member_id: UUID | None = None
    detail: str | None = None


class MemberActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    member_id: UUID
    detail: str
    created_at: datetime
