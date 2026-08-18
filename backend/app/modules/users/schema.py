import uuid
from fastapi_users import schemas
from .model import UserRole
from uuid import UUID
from pydantic import ConfigDict


class UserResponse(schemas.BaseUser[uuid.UUID]):
    id: UUID
    first_name: str
    last_name: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class UserCreate(schemas.BaseUserCreate):
    first_name: str
    last_name: str
    role: UserRole = UserRole.STUDENT


class UserUpdate(schemas.BaseUserUpdate):
    first_name: str | None = None
    last_name: str | None = None
    role: UserRole | None = UserRole.STUDENT
