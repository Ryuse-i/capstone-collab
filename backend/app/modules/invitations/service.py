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
    async def create_invitation(db: AsyncSession, invitation: ProjectInvitationCreate):
        user = UserDB(db, User)
        repo = ProjectInvitationRepo(db)

        invited_user = await user.get_by_email(invitation.email)

        # check if user exists
        if invited_user is None:
            return None

        # automatic commit if successful and rollback for failure
        async with db.begin_nested():
            invitation_result = await repo.create(invitation)

            # create the noticication
            notification = CreateNotification(
                user_id=invited_user.id,
                title="Project Invitation",
                body=f"Hello {invited_user.first_name} we would like to invite you to our project as a {invitation.role}",
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
        db: AsyncSession, invitation_list: list[ProjectInvitationCreate]
    ):
        user_repo = UserDB(db, User)
        inv_repo = ProjectInvitationRepo(db)
        results = []

        # iterate over invitation list
        for invitation in invitation_list:
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
                        title="Project Invitation",
                        body=f"Hello {invited_user.first_name} we would like to invite you to our project as a {invitation.role}",
                        type=NotificationType.PROJECT_INVITATION,
                        invitation_id=invitation_result.id,
                    )
                    # create notification
                    await NotificationService.create_notification(db, notification)
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
    async def accept_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        invitation = await repo.get_by_id(invitation_id)
        if invitation:
            update_data = ProjectInvitationUpdate(status=InviteStatus.ACCEPTED)
            return await repo.update(invitation, update_data)
        return None

    @staticmethod
    async def decline_invitation(db: AsyncSession, invitation_id):
        repo = ProjectInvitationRepo(db)
        invitation = await repo.get_by_id(invitation_id)
        if not invitation:
            return None
        update_data = ProjectInvitationUpdate(status=InviteStatus.REJECTED)
        return await repo.update(invitation, update_data)
