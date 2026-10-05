from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo
from app.modules.users.model import User, UserRole


class AdminUserRepo(BaseRepo):
    """Repository for admin-managed user operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, User)

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by normalized email address."""
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_users(
        self,
        *,
        search: str | None = None,
        role: UserRole | str | None = None,
        is_active: bool | None = None,
        include_deleted: bool = False,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        """Return filtered users and the matching total count."""
        filters = []
        if not include_deleted:
            filters.append(User.deleted_at.is_(None))
        if search:
            search_term = f"%{search}%"
            filters.append(
                (User.email.ilike(search_term))
                | (User.first_name.ilike(search_term))
                | (User.last_name.ilike(search_term))
            )
        if role is not None:
            role_value = UserRole(role) if isinstance(role, str) else role
            filters.append(User.role == role_value)
        if is_active is not None:
            filters.append(User.is_active == is_active)

        count_stmt = select(User).where(*filters)
        total_result = await self.db.execute(count_stmt)
        total = len(total_result.scalars().all())

        stmt = select(User).where(*filters).order_by(User.id)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def count_admins(self) -> int:
        """Count active admin accounts."""
        stmt = select(User).where(
            User.role == UserRole.ADMIN,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())

    async def has_active_project_memberships(self, user_id: UUID) -> bool:
        """Return true if the user is still attached to an active project membership."""
        from app.modules.project_members.model import ProjectMember

        stmt = select(ProjectMember).where(ProjectMember.user_id == user_id)
        result = await self.db.execute(stmt.limit(1))
        return result.first() is not None
