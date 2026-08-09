from fastapi import HTTPException

from sqlalchemy import select

from app.modules.projects.model import Project

from .model import ProjectInvitation
from sqlalchemy.ext.asyncio import AsyncSession
from .schema import (
    ProjectInvitationCreate,
    ProjectInvitationUpdate,
)
from .repo import ProjectInvitationRepo
from app.modules.notifications.model import NotificationType
from app.modules.notifications.services import NotificationService
from .model import InviteStatus
from app.modules.notifications.schema import CreateNotification
from app.modules.users.auth import User, UserDB
from app.modules.project_members.model import ProjectRole
from app.modules.project_members.schema import ProjectMemberCreate
from app.modules.project_members.services import ProjectMemberService


class ProjectInvitationService:
    @staticmethod
    async def get_one_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        return await repo.get_by_id(invitation_id)

    @staticmethod
    async def get_all_invitations(db: AsyncSession):
        repo = ProjectInvitationRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_invitation(
        db: AsyncSession, invitation: ProjectInvitationCreate, current_user: User
    ):
        user = UserDB(db, User)
        repo = ProjectInvitationRepo(db)

        sender = await user.get_by_id(invitation.sender_id)
        invited_user = await user.get_by_email(invitation.email)

        # check if sender exists
        if not sender:
            raise HTTPException(status_code=404, detail="sender does not exists")

        # check if user exists
        if invited_user is None:
            return None

        # start a savepoint on where to rollback to
        async with db.begin_nested():
            invitation_result = await repo.create(invitation)

            # create the noticication
            # include sender first name in notification body so frontend doesn't need extra user fetch
            notification = CreateNotification(
                user_id=invited_user.id,
                title="Project Invitation",
                body=f"""Hello {invited_user.first_name} we would like to invite you to our project as a {invitation.role.value}.
                From: {sender.first_name} {sender.last_name}""",
                type=NotificationType.PROJECT_INVITATION,
                invitation_id=invitation_result.id,
            )
            await NotificationService.create_notification(db, notification)

        # return the invitation only if nothing fails
        return invitation_result

    """
        Create batch method that would iterate over a list of invitations 
        Atomic transactions so each query is independent towards each other 
        would return a list of created invitation, could be success and failure 
    """

    @staticmethod
    async def batch_create(
        db: AsyncSession,
        invitation_list: list[ProjectInvitationCreate],
        current_user: User,
    ):
        user_repo = UserDB(db, User)
        inv_repo = ProjectInvitationRepo(db)
        results = []

        # iterate over invitation list
        for invitation in invitation_list:
            # check if the sender exists
            sender = await user_repo.get_by_id(invitation.sender_id)
            if not sender:
                raise HTTPException(status_code=404, detail="sender does not exists")

            # check if user with email exists
            invited_user = await user_repo.get_by_email(invitation.email)
            if invited_user is None:
                results.append(
                    {
                        "email": invitation.email,
                        "success": False,
                        "reason": "user not found",
                    }
                )
                continue

            try:
                async with db.begin_nested():
                    # create invitation
                    invitation_result = await inv_repo.create(invitation)
                    # create the noticication
                    notification = CreateNotification(
                        user_id=invited_user.id,
                        body=f"""Hello {invited_user.first_name} we would like to invite you to our project as a {invitation.role.value}. 

From: {sender.first_name} {sender.last_name}""",
                        title="Project Invitation",
                        type=NotificationType.PROJECT_INVITATION,
                        invitation_id=invitation_result.id,
                    )
                    # create notification
                    await NotificationService.create_notification(db, notification)
                    await db.commit()

                results.append(
                    {
                        "email": invitation.email,
                        "success": True,
                        "invitation_id": invitation_result.id,
                    }
                )

            except Exception as e:
                # add errors to results
                results.append(
                    {"email": invitation.email, "success": False, "reason": str(e)}
                )

        return results

    @staticmethod
    async def update_invitation(
        db: AsyncSession,
        db_item: ProjectInvitation,
        invitation: ProjectInvitationUpdate,
    ):
        repo = ProjectInvitationRepo(db)
        return await repo.update(db_item, invitation)

    @staticmethod
    async def delete_invitation(db: AsyncSession, db_item: ProjectInvitation):
        repo = ProjectInvitationRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def accept_invitation(db: AsyncSession, current_user: User, invitation_id):
        inv_repo = ProjectInvitationRepo(db)
        invitation = await inv_repo.get_by_id(invitation_id)

        # check if invitation exists
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        # check authorization before leaking invitation state
        if invitation.email != current_user.email:
            raise HTTPException(status_code=403, detail="Unauthorized process")

        if invitation.status != InviteStatus.PENDING:
            raise HTTPException(
                status_code=400, detail="Invitation is no longer pending"
            )

        async with db.begin_nested():
            update_data = ProjectInvitationUpdate(status=InviteStatus.ACCEPTED)
            invitation_result = await inv_repo.update(invitation, update_data)

            await ProjectMemberService.add_member(
                db,
                ProjectMemberCreate(
                    user_id=current_user.id,
                    project_id=invitation.project_id,
                    project_role=invitation_result.role.value,
                ),
            )

            project_result = await db.execute(
                select(Project).where(Project.id == invitation.project_id)
            )
            project = project_result.scalar_one_or_none()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            if invitation_result.role == ProjectRole.ADVISOR:
                project.advisor = current_user.id
            elif invitation_result.role == ProjectRole.INSTRUCTOR:
                project.instructor = current_user.id

            await db.flush()

            await NotificationService.create_notification(
                db,
                notification=CreateNotification(
                    user_id=invitation.sender_id,
                    body=f"{current_user.first_name} has accepted to be part of our project as {invitation_result.role.value}",
                    title="Project Invite Accept",
                    type=NotificationType.PROJECT_INVITATION,
                    invitation_id=invitation_result.id,
                ),
            )

        return invitation_result

    @staticmethod
    async def decline_invitation(db: AsyncSession, current_user: User, invitation_id):
        inv_repo = ProjectInvitationRepo(db)
        invitation = await inv_repo.get_by_id(invitation_id)
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.email != current_user.email:
            raise HTTPException(status_code=403, detail="Unauthorized process")

        if invitation.status != InviteStatus.PENDING:
            raise HTTPException(
                status_code=400, detail="Invitation is no longer pending"
            )

        async with db.begin_nested():
            update_data = ProjectInvitationUpdate(status=InviteStatus.REJECTED)
            invitation_result = await inv_repo.update(invitation, update_data)

            notification = CreateNotification(
                user_id=invitation.sender_id,
                body=f"{current_user.first_name} has declined the invitation to join the project",
                title="Project Invite Declined",
                type=NotificationType.PROJECT_INVITATION,
                invitation_id=invitation_result.id,
            )
            await NotificationService.create_notification(db, notification)

        await db.commit()
        return invitation_result
