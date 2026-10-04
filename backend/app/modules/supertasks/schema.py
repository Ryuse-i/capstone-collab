from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SupertaskCreate(BaseModel):
    # created_by is intentionally NOT here: it comes from the authenticated user.
    name: str
    description: str | None = None
    project_id: UUID


class SupertaskUpdate(BaseModel):
    # project_id and created_by are intentionally NOT editable: moving a
    # supertask would leave its tasks pointing at the wrong project.
    name: str | None = None
    description: str | None = None


class SupertaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_by: UUID | None
    project_id: UUID
    created_at: datetime | None
    updated_at: datetime | None