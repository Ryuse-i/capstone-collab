from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.repo import AdminUserRepo
from app.modules.users.auth import delete_refresh_tokens_for_user
from app.modules.users.manager import UserManager
from app.modules.users.model import User, UserRole


class AdminUserService:
    """Business logic for admin-created and admin-managed user accounts."""

    @staticmethod
    async def list_users(
        db: AsyncSession,
        *,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[User], int]:
        """Return a paginated list of user accounts for admin views."""
        repo = AdminUserRepo(db)
        offset = (page - 1) * page_size
        users, total = await repo.list_users(
            search=search,
            role=UserRole(role) if role else None,
            is_active=is_active,
            offset=offset,
            limit=page_size,
        )
        return users, total

    @staticmethod
    async def get_user(db: AsyncSession, user_id: UUID) -> User:
        """Return a single user, or raise a 404 if it does not exist."""
        repo = AdminUserRepo(db)
        user = await repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    @staticmethod
    async def create_instructor(
        db: AsyncSession,
        *,
        payload: dict,
        user_manager: UserManager,
    ) -> User:
        """Create a new instructor account from the admin interface."""
        repo = AdminUserRepo(db)
        normalized_email = payload["email"].strip().lower()
        existing = await repo.get_by_email(normalized_email)
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

        role_value = UserRole(payload.get("role", "instructor"))
        if role_value != UserRole.INSTRUCTOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only instructor accounts can be created here")

        password = payload["password"]
        user = User(
            email=normalized_email,
            first_name=payload["first_name"].strip(),
            last_name=payload["last_name"].strip(),
            role=role_value,
            is_active=payload.get("is_active", True),
            hashed_password=user_manager.password_helper.hash(password),
            is_verified=False,
            is_superuser=False,
            must_change_password=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_user(db: AsyncSession, *, actor: User, user_id: UUID, payload: dict) -> User:
        """Update a user account while enforcing admin safety checks."""
        user = await AdminUserService.get_user(db, user_id)

        requested_role = UserRole(payload["role"]) if payload.get("role") is not None else user.role
        if actor.id == user.id and payload.get("role") is not None and requested_role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot demote yourself")
        if actor.id == user.id and payload.get("is_active") is False:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot deactivate your own account")

        remains_active_admin = (
            requested_role == UserRole.ADMIN
            and payload.get("is_active", user.is_active)
            and user.deleted_at is None
        )
        if user.role == UserRole.ADMIN and user.is_active and not remains_active_admin:
            if await AdminUserRepo(db).count_admins() <= 1:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The last admin cannot be removed")

        if payload.get("role") is not None:
            user.role = UserRole(payload["role"])
        if payload.get("first_name") is not None:
            user.first_name = payload["first_name"].strip()
        if payload.get("last_name") is not None:
            user.last_name = payload["last_name"].strip()
        if payload.get("is_active") is not None:
            user.is_active = payload["is_active"]
        if payload.get("must_change_password") is not None:
            user.must_change_password = payload["must_change_password"]

        if user.role == UserRole.ADMIN:
            user.is_superuser = True
        else:
            user.is_superuser = False

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def deactivate_user(db: AsyncSession, *, actor: User, user_id: UUID) -> User:
        """Disable a user account and revoke their active session tokens."""
        user = await AdminUserService.get_user(db, user_id)
        if actor.id == user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot deactivate your own account")
        if user.role == UserRole.ADMIN and user.is_active and await AdminUserRepo(db).count_admins() <= 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The last admin cannot be removed")
        user.is_active = False
        await delete_refresh_tokens_for_user(str(user.id), db)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def reactivate_user(db: AsyncSession, *, user_id: UUID) -> User:
        """Reactivate a previously deactivated account."""
        user = await AdminUserService.get_user(db, user_id)
        if user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Soft-deleted accounts cannot be reactivated")
        user.is_active = True
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def reset_password(db: AsyncSession, *, user_id: UUID, password: str, user_manager: UserManager) -> User:
        """Reset a user's password and require them to change it at next login."""
        user = await AdminUserService.get_user(db, user_id)
        user.hashed_password = user_manager.password_helper.hash(password)
        user.must_change_password = True
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def soft_delete_user(db: AsyncSession, *, actor: User, user_id: UUID) -> User:
        """Soft delete a user while blocking last-admin and active-membership cases."""
        user = await AdminUserService.get_user(db, user_id)
        if actor.id == user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete your own account")

        if user.role == UserRole.ADMIN:
            admin_count = await AdminUserRepo(db).count_admins()
            if admin_count <= 1:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The last admin cannot be removed")

        if await AdminUserRepo(db).has_active_project_memberships(user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This user has active project memberships and cannot be removed",
            )

        user.is_active = False
        user.deleted_at = datetime.now(timezone.utc)
        await delete_refresh_tokens_for_user(str(user.id), db)
        await db.commit()
        await db.refresh(user)
        return user
