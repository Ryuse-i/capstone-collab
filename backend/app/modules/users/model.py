from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from app.core.db import Base
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
