from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from app.core.db import Base
from sqlalchemy import String, Enum as SAENUM
from sqlalchemy.orm import Mapped, mapped_column
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STUDENT = "student"
    INSTRUCTOR = "instructor"


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"
    first_name: Mapped[str] = mapped_column(String(150))
    last_name: Mapped[str] = mapped_column(String(150))
    role: Mapped[UserRole] = mapped_column(
        SAENUM(UserRole, name="user_role"), default=UserRole.STUDENT
    )
