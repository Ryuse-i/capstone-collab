from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.model import UserRole


class AdminUserBase(BaseModel):
    """Shared admin user payload fields."""

    email: EmailStr
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class AdminUserCreate(AdminUserBase):
    """Model for creating instructor accounts from the admin dashboard."""

    password: str = Field(min_length=8)
    role: Literal["instructor"] = "instructor"
    is_active: bool = True
    must_change_password: Literal[True] = True


class AdminUserUpdate(BaseModel):
    """Partial update payload for an account managed by admin."""

    first_name: str | None = None
    last_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    must_change_password: bool | None = None
    model_config = ConfigDict(extra="forbid")


class AdminUserPasswordReset(BaseModel):
    """Password reset payload for admin-initiated user resets."""

    password: str = Field(min_length=8)


class AdminUserResponse(AdminUserBase):
    """Response model for user records returned to admin screens."""

    id: UUID
    role: str
    is_active: bool
    is_superuser: bool
    is_verified: bool
    must_change_password: bool = False
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminUserListResponse(BaseModel):
    """Paginated list of users for admin screens."""

    items: list[AdminUserResponse]
    total: int
    page: int
    page_size: int
    model_config = ConfigDict(from_attributes=True)
