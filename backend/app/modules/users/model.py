from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from app.core.db import Base
from sqlalchemy import String, Enum as SAENUM, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
import enum
from datetime import datetime


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


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    hashed_token: Mapped[str] = mapped_column(String(255), index=True, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    replaced_by: Mapped[int] = mapped_column(ForeignKey("refresh_tokens.id"), nullable=True)
    
    # Relationship to track token rotation
    # replaced_by points to the new token that replaced this one
