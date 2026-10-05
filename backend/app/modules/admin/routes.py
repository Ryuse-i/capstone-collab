from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.admin.activity_service import ActivityLogService
from app.modules.admin.schema import (
    AdminUserCreate,
    AdminUserListResponse,
    AdminUserPasswordReset,
    AdminUserResponse,
    AdminUserUpdate,
)
from app.modules.admin.metrics_schema import AdminMetricsOverview
from app.modules.admin.metrics_service import AdminMetricsService
from app.modules.admin.services import AdminUserService
from app.modules.users.manager import UserManager, get_user_manager
from app.modules.users.model import User, UserRole
from app.modules.users.services import require_admin

admin_router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@admin_router.get("/metrics/overview", response_model=AdminMetricsOverview, tags=["admin"])
async def get_metrics_overview(db: AsyncSession = Depends(get_async_session)):
    """Return aggregate account, project, and task metrics for the admin dashboard."""
    return await AdminMetricsService.get_overview(db)


@admin_router.get("/users", response_model=AdminUserListResponse, tags=["admin"])
async def list_users(
    search: str | None = Query(default=None),
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session),
):
    """List account records in a paginated admin view."""
    users, total = await AdminUserService.list_users(
        db,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return {
        "items": [AdminUserResponse.model_validate(user) for user in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@admin_router.get("/users/{user_id}", response_model=AdminUserResponse, tags=["admin"])
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single user for admin management screens."""
    user = await AdminUserService.get_user(db, user_id)
    return AdminUserResponse.model_validate(user)


@admin_router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED, tags=["admin"])
async def create_user(
    payload: AdminUserCreate,
    db: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    _admin: User = Depends(require_admin),
):
    """Create a new user account from the admin dashboard."""
    user = await AdminUserService.create_instructor(db, payload=payload.model_dump(), user_manager=user_manager)
    await ActivityLogService.record(
        db,
        event_type="account_created",
        actor_id=_admin.id,
        target_type="user",
        target_id=user.id,
        details={"target_label": user.email, "role": user.role.value},
    )
    return AdminUserResponse.model_validate(user)


@admin_router.patch("/users/{user_id}", response_model=AdminUserResponse, tags=["admin"])
async def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_admin),
):
    """Update a user account while maintaining admin safeguards."""
    previous_user = await AdminUserService.get_user(db, user_id)
    previous_role = previous_user.role
    previous_active = previous_user.is_active
    user = await AdminUserService.update_user(db, actor=current_user, user_id=user_id, payload=payload.model_dump(exclude_unset=True))
    if previous_role != user.role:
        await ActivityLogService.record(
            db,
            event_type="role_changed",
            actor_id=current_user.id,
            target_type="user",
            target_id=user.id,
            details={
                "target_label": user.email,
                "from_role": previous_role.value,
                "to_role": user.role.value,
            },
        )
    if previous_active != user.is_active:
        await ActivityLogService.record(
            db,
            event_type="account_reactivated" if user.is_active else "account_deactivated",
            actor_id=current_user.id,
            target_type="user",
            target_id=user.id,
            details={"target_label": user.email},
        )
    return AdminUserResponse.model_validate(user)


@admin_router.post("/users/{user_id}/deactivate", response_model=AdminUserResponse, tags=["admin"])
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_admin),
):
    """Disable a user account and delete their refresh tokens."""
    user = await AdminUserService.deactivate_user(db, actor=current_user, user_id=user_id)
    await ActivityLogService.record(
        db,
        event_type="account_deactivated",
        actor_id=current_user.id,
        target_type="user",
        target_id=user.id,
        details={"target_label": user.email},
    )
    return AdminUserResponse.model_validate(user)


@admin_router.post("/users/{user_id}/reactivate", response_model=AdminUserResponse, tags=["admin"])
async def reactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    _admin: User = Depends(require_admin),
):
    """Re-enable a previously deactivated account."""
    user = await AdminUserService.reactivate_user(db, user_id=user_id)
    await ActivityLogService.record(
        db,
        event_type="account_reactivated",
        actor_id=_admin.id,
        target_type="user",
        target_id=user.id,
        details={"target_label": user.email},
    )
    return AdminUserResponse.model_validate(user)


@admin_router.post("/users/{user_id}/reset-password", response_model=AdminUserResponse, tags=["admin"])
async def reset_password(
    user_id: UUID,
    payload: AdminUserPasswordReset,
    db: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    _admin: User = Depends(require_admin),
):
    """Reset a user's password and force a change on next login."""
    user = await AdminUserService.reset_password(db, user_id=user_id, password=payload.password, user_manager=user_manager)
    await ActivityLogService.record(
        db,
        event_type="password_reset",
        actor_id=_admin.id,
        target_type="user",
        target_id=user.id,
        details={"target_label": user.email},
    )
    return AdminUserResponse.model_validate(user)


@admin_router.delete("/users/{user_id}", response_model=AdminUserResponse, tags=["admin"])
async def soft_delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a user and block unsafe cases such as removing the last admin."""
    user = await AdminUserService.soft_delete_user(db, actor=current_user, user_id=user_id)
    await ActivityLogService.record(
        db,
        event_type="account_soft_deleted",
        actor_id=current_user.id,
        target_type="user",
        target_id=user.id,
        details={"target_label": user.email},
    )
    return AdminUserResponse.model_validate(user)
