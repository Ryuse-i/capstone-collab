from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.modules.files.schema import FileResponse


class TaskAttachmentCreate(BaseModel):
    task_id: UUID
    file_id: UUID


class TaskAttachmentResponse(BaseModel):
    id: UUID
    task_id: UUID
    file_id: UUID
    created_at: datetime
    file: FileResponse

    model_config = ConfigDict(from_attributes=True)