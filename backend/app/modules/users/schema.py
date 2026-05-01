import uuid
from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    username: str
    full_name: str | None
    # what gets returned when you read a user


class UserCreate(schemas.BaseUserCreate):
    username: str
    full_name: str | None = None
    # what's required to register (email + password minimum)


class UserUpdate(schemas.BaseUserUpdate):
    username: str | None = None
    full_name: str | None = None
    # what fields can be updated
