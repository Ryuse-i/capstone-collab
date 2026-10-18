from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from app.core.base_repo import BaseRepo
from .model import ProjectInviteLink


class ProjectInviteLinkRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectInviteLink)
        self.db = db

    async def get_by_token_hash(self, token_hash: str, lock: bool = False):
        stmt = select(ProjectInviteLink).where(
            ProjectInviteLink.token_hash == token_hash
        )
        if lock:
            stmt = stmt.with_for_update()  # serialize concurrent accepts
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_by_project(self, project_id: UUID):
        stmt = (
            select(ProjectInviteLink)
            .where(
                ProjectInviteLink.project_id == project_id,
                ProjectInviteLink.revoked_at.is_(None),
                ProjectInviteLink.expires_at > datetime.now(timezone.utc),
            )
            .order_by(ProjectInviteLink.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())