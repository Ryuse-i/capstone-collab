from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modules.files.schema import FileResponse

ResourceCategory = Literal["Links", "Paper Files", "Code"]


class ResourceCreator(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    model_config = ConfigDict(from_attributes=True)


class ResourceResponse(BaseModel):
    id: UUID
    project_id: UUID
    created_by: UUID | None
    title: str
    category: ResourceCategory
    description: str
    file: FileResponse | None
    creator: ResourceCreator | None
    pinned: bool
    uses: int
    created_at: datetime
    updated_at: datetime

class ResourceUpdate(BaseModel):
    title: str | None = None
    category: ResourceCategory | None = None
    description: str | None = None
    pinned: bool | None = None