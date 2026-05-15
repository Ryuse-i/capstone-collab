from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from app.modules.tasks.enums import Result


class TaskSubmissionCreate(BaseModel):
    task_id: UUID
    result: Result
    comment: str | None = None


class TaskSubmissionUpdate(BaseModel):
    task_id: UUID | None = None
    result: Result | None = None
    comment: str | None = None


class TaskSubmissionResponse(BaseModel):
    id: UUID
    task_id: UUID
    result: Result
    comment: str | None = None
    submitted_at: datetime | None = None

    class ConfigDict:
        from_attributes = True
