import uuid
from datetime import datetime
from typing import Literal

from fastapi_users import schemas
from pydantic import ConfigDict, EmailStr

from .model import UserRole


class UserResponse(schemas.BaseUser[uuid.UUID]):
    id: uuid.UUID
    first_name: str
    last_name: str
    role: UserRole
    must_change_password: bool = False
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(schemas.BaseUserCreate):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    is_active: Literal[True] = True
    is_superuser: Literal[False] = False
    is_verified: Literal[False] = False
    model_config = ConfigDict(extra="forbid")


class UserUpdate(schemas.BaseUserUpdate):
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    is_superuser: Literal[False] | None = None
    is_verified: Literal[False] | None = None
    must_change_password: bool | None = None
    model_config = ConfigDict(extra="forbid")
