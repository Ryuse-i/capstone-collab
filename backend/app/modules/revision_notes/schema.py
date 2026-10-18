from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RevisionNoteCreate(BaseModel):
    """Body for rejecting a task. task_id comes from the path."""

    problem: str = Field(min_length=1, max_length=5000)
    recommended_changes: str | None = Field(default=None, max_length=5000)

    @field_validator("problem")
    @classmethod
    def problem_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("problem must not be blank")
        return v

    @field_validator("recommended_changes")
    @classmethod
    def blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class RevisionNoteResponse(BaseModel):
    id: UUID
    task_id: UUID
    revision_number: int
    problem: str
    recommended_changes: str | None = None
    rejected_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)