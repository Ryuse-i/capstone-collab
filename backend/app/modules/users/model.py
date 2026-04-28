from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from app.core.db import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    pass
