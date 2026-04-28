import uuid
from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    # what gets returned when you read a user
    pass


class UserCreate(schemas.BaseUserCreate):
    # what's required to register (email + password minimum)
    pass


class UserUpdate(schemas.BaseUserUpdate):
    # what fields can be updated
    pass
