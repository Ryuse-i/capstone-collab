from datetime import datetime
from uuid import UUID
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    TypeAdapter,
    field_validator,
)
from app.modules.users.schema import UserResponse

_http_url = TypeAdapter(HttpUrl)


def _check_url(value: str) -> str:
    """Accept only well-formed http(s) URLs. Blocks javascript:, data:, etc."""
    value = value.strip()
    _http_url.validate_python(value)  # HttpUrl only allows http and https
    return value


class TaskLinkCreate(BaseModel):
    """Request body. task_id comes from the path and created_by from the session."""

    url: str = Field(max_length=2048)
    title: str | None = Field(default=None, max_length=150)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return _check_url(v)


class TaskLinkInsert(BaseModel):
    """Internal shape passed to the repo."""

    task_id: UUID
    created_by: UUID
    url: str
    title: str | None = None


class TaskLinkUpdate(BaseModel):
    url: str | None = Field(default=None, max_length=2048)
    title: str | None = Field(default=None, max_length=150)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        return _check_url(v) if v is not None else v


class TaskLinkResponse(BaseModel):
    id: UUID
    task_id: UUID
    created_by: UUID | None = None
    url: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    creator: UserResponse | None = None

    model_config = ConfigDict(from_attributes=True)