from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

class MemberActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    member_id: UUID
    task_id: UUID | None = None
    type: str | None = None
    detail: str
    created_at: datetime
    actor_name: str | None = None
    task_name: str | None = None

class RecentActivityItem(BaseModel):
    """Shape for the dashboard 'Recent activity' card."""
    id: str
    project_id: str
    project_name: str
    message: str
    timestamp: datetime
    type: str | None = None
    actor_name: str | None = None