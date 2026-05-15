import uuid
from fastapi_users import schemas
from .model import UserRole


class UserRead(schemas.BaseUser[uuid.UUID]):
    first_name: str
    last_name: str
    role: UserRole
    # what gets returned when you read a user


class UserCreate(schemas.BaseUserCreate):
    first_name: str
    last_name: str
    role: UserRole
    # what's required to register (email + password minimum)


class UserUpdate(schemas.BaseUserUpdate):
    first_name: str | None = None
    last_name: str | None = None
    role: UserRole | None = None
    # what fields can be updated
