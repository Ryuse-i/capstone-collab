import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.model import Project
from app.modules.users.model import User
from app.modules.project_members.model import ProjectMember, ProjectRole
from app.modules.project_members.schema import ProjectMemberCreate
from app.modules.project_members.services import ProjectMemberService

from .model import ProjectInviteLink
from .repo import ProjectInviteLinkRepo
from .schema import (
    InviteLinkCreate,
    InviteLinkResponse,
    InviteLinkCreated,
    InviteLinkPreview,
    InviteLinkAccepted,
)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _invalid_reason(link: ProjectInviteLink) -> str | None:
    if link.revoked_at is not None:
        return "revoked"
    if link.expires_at < datetime.now(timezone.utc):
        return "expired"
    if link.max_uses is not None and link.use_count >= link.max_uses:
        return "used_up"
    return None


class ProjectInviteLinkService:
    @staticmethod
    async def _get_membership(db: AsyncSession, project_id: UUID, user_id: UUID):
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_link(
        db: AsyncSession, data: InviteLinkCreate, current_user: User
    ) -> InviteLinkCreated:
        project = await db.get(Project, data.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # light permission check: creator must belong to the project.
        # swap this for your leader/admin check if you have one
        membership = await ProjectInviteLinkService._get_membership(
            db, data.project_id, current_user.id
        )
        if not membership:
            raise HTTPException(status_code=403, detail="Unauthorized process")

        raw_token = secrets.token_urlsafe(32)
        link = ProjectInviteLink(
            project_id=data.project_id,
            created_by=current_user.id,  # from the session, not the request body
            role=data.role,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=data.expires_in_days),
            max_uses=data.max_uses,
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)

        base = InviteLinkResponse.model_validate(link).model_dump()
        return InviteLinkCreated(**base, token=raw_token)

    @staticmethod
    async def list_active(db: AsyncSession, project_id: UUID, current_user: User):
        membership = await ProjectInviteLinkService._get_membership(
            db, project_id, current_user.id
        )
        if not membership:
            raise HTTPException(status_code=403, detail="Unauthorized process")
        return await ProjectInviteLinkRepo(db).get_active_by_project(project_id)

    @staticmethod
    async def revoke(db: AsyncSession, link_id: UUID, current_user: User):
        repo = ProjectInviteLinkRepo(db)
        link = await repo.get_by_id(link_id)
        if not link:
            raise HTTPException(status_code=404, detail="Invite link not found")

        membership = await ProjectInviteLinkService._get_membership(
            db, link.project_id, current_user.id
        )
        if not membership:
            raise HTTPException(status_code=403, detail="Unauthorized process")

        link.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(link)
        return link

    @staticmethod
    async def preview(db: AsyncSession, token: str) -> InviteLinkPreview:
        link = await ProjectInviteLinkRepo(db).get_by_token_hash(_hash_token(token))
        if not link:
            raise HTTPException(status_code=404, detail="Invite link not found")

        project = await db.get(Project, link.project_id)
        inviter = await db.get(User, link.created_by)
        reason = _invalid_reason(link)

        return InviteLinkPreview(
            project_name=project.name if project else "Unknown project",
            role=link.role.value,
            inviter_name=f"{inviter.first_name} {inviter.last_name}" if inviter else "",
            valid=reason is None,
            reason=reason,
        )

    @staticmethod
    async def accept(
        db: AsyncSession, token: str, current_user: User
    ) -> InviteLinkAccepted:
        # row lock so concurrent accepts can't exceed max_uses
        link = await ProjectInviteLinkRepo(db).get_by_token_hash(
            _hash_token(token), lock=True
        )
        if not link:
            raise HTTPException(status_code=404, detail="Invite link not found")

        reason = _invalid_reason(link)
        if reason:
            raise HTTPException(status_code=410, detail=f"Invite link is {reason}")

        # idempotent: already a member, nothing to do, don't burn a use
        existing = await ProjectInviteLinkService._get_membership(
            db, link.project_id, current_user.id
        )
        if existing:
            await db.rollback()  # release the row lock
            return InviteLinkAccepted(
                project_id=link.project_id, role=link.role.value, already_member=True
            )

        async with db.begin_nested():
            await ProjectMemberService.add_member(
                db,
                ProjectMemberCreate(
                    user_id=current_user.id,
                    project_id=link.project_id,
                    project_role=link.role.value,
                ),
            )

            project = await db.get(Project, link.project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            # same behavior as the email-invite accept
            if link.role == ProjectRole.ADVISOR:
                project.advisor = current_user.id
            elif link.role == ProjectRole.INSTRUCTOR:
                project.instructor = current_user.id

            link.use_count += 1
            await db.flush()

        await db.commit()
        return InviteLinkAccepted(project_id=link.project_id, role=link.role.value)