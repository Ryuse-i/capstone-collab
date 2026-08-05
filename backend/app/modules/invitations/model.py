from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID, String
from app.modules.project_members.model import ProjectRole
from sqlalchemy import Enum as SAEnum
import enum
from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from app.modules.projects.model import Project
    from app.modules.notifications.model import Notification


class InviteStatus(str, enum.Enum):
    PENDING = ("pending",)
    ACCEPTED = ("accepted",)
    REJECTED = ("rejected",)


class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    # what project is the user invited to
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    # who invited the user
    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    # the one being invited but used the email
    email: Mapped[str] = mapped_column(String, nullable=False)  # The email invited
    # what role are you being invited to
    role: Mapped[ProjectRole] = mapped_column(
        SAEnum(
            ProjectRole,
            name="invited_role",
            values_callable=lambda obj: [e.value for e in obj],
        )
    )
    # status of the invitation, this would be reflected for the project leader
    status: Mapped[InviteStatus] = mapped_column(
        SAEnum(InviteStatus, name="invite_status"), default="pending"
    )  # pending, accepted, declined
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="invitations",
        foreign_keys=[project_id],
    )

    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="invitation",
    )

    # timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
