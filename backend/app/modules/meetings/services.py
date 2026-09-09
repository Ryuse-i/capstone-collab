from fastapi import HTTPException, status
from uuid import UUID
from typing import NoReturn

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.project_members.model import ProjectRole
from app.modules.project_members.repo import ProjectMemberRepo
from app.modules.projects.repo import ProjectRepo
from app.modules.users.model import User, UserRole

from .model import Meeting
from .providers import (
    MeetingProviderAPIError,
    MeetingProviderError,
    MeetingProviderNotConfigured,
    get_meeting_provider,
)
from .repo import MeetingRepo
from .schema import CreateMeetingRequest

MANAGER_ROLES = {
    ProjectRole.LEADER,
    ProjectRole.ADVISOR,
    ProjectRole.INSTRUCTOR,
}


class MeetingService:
    @staticmethod
    def _raise_provider_http_error(error: MeetingProviderError) -> NoReturn:
        if isinstance(error, MeetingProviderNotConfigured):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Meeting provider is not configured",
            ) from error

        if isinstance(error, MeetingProviderAPIError):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Meeting provider request failed",
            ) from error

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported meeting provider",
        ) from error

    @staticmethod
    async def _require_project_access(
        db: AsyncSession,
        project_id: UUID,
        current_user: User,
        require_manager: bool = False,
    ):
        project = await ProjectRepo(db).get_by_id(project_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        member = await ProjectMemberRepo(db).get_by_user_and_project(
            current_user.id, project_id
        )
        is_admin = current_user.role == UserRole.ADMIN

        if member is None and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this project",
            )

        if require_manager and not is_admin:
            if member is None or member.project_role not in MANAGER_ROLES:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to manage project meetings",
                )

        return project

    @staticmethod
    async def create_meeting(
        db: AsyncSession,
        current_user: User,
        request: CreateMeetingRequest,
    ) -> Meeting:
        await MeetingService._require_project_access(
            db, request.project_id, current_user, require_manager=True
        )

        try:
            provider = get_meeting_provider(request.provider)
            provider_result = await provider.create_meeting(
                topic=request.topic,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                join_url=request.join_url,
            )
        except MeetingProviderError as error:
            MeetingService._raise_provider_http_error(error)

        meeting = Meeting(
            project_id=request.project_id,
            created_by=current_user.id,
            provider=request.provider,
            meeting_id=provider_result.meeting_id,
            join_url=provider_result.join_url,
            host_url=provider_result.host_url,
            topic=request.topic,
            start_time=provider_result.start_time,
            end_time=provider_result.end_time,
        )
        return await MeetingRepo(db).create(meeting)

    @staticmethod
    async def get_project_meetings(
        db: AsyncSession,
        current_user: User,
        project_id: UUID,
    ) -> list[Meeting]:
        await MeetingService._require_project_access(db, project_id, current_user)
        return await MeetingRepo(db).get_by_project(project_id)

    @staticmethod
    async def get_meeting(
        db: AsyncSession,
        current_user: User,
        meeting_id: UUID,
    ) -> Meeting:
        meeting = await MeetingRepo(db).get_by_id(meeting_id)
        if meeting is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        await MeetingService._require_project_access(
            db, meeting.project_id, current_user
        )
        return meeting

    @staticmethod
    async def cancel_meeting(
        db: AsyncSession,
        current_user: User,
        meeting_id: UUID,
    ) -> Meeting:
        meeting = await MeetingService.get_meeting(db, current_user, meeting_id)
        await MeetingService._require_project_access(
            db, meeting.project_id, current_user, require_manager=True
        )

        try:
            provider = get_meeting_provider(meeting.provider)
            await provider.cancel_meeting(meeting.meeting_id)
        except MeetingProviderError as error:
            MeetingService._raise_provider_http_error(error)

        return await MeetingRepo(db).cancel(meeting)
