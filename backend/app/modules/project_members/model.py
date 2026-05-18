from datetime import datetime, timezone
from uuid import UUID, uuid4
from decimal import Decimal
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, ForeignKey, Numeric, UUID as PG_UUID, String
import enum
from sqlalchemy import Enum as SAEnum


class ProjectRole(str, enum.Enum):
    ADMIN = "admin"
    LEADER = "leader"
    MEMBER = "member"
    NONE = "none"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    project_role: Mapped[ProjectRole] = mapped_column(
        SAEnum(ProjectRole, name="projectrole"),  # named enum + correct type
        default=ProjectRole.NONE,
        nullable=True,
    )
    workload_points: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    contribution_points: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )


class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    email: Mapped[str] = mapped_column(String, nullable=False)  # The email invited
    role: Mapped[ProjectRole] = mapped_column(
        SAEnum(ProjectRole, name="invite_role"), default=ProjectRole.MEMBER
    )
    status: Mapped[str] = mapped_column(
        String, default="pending"
    )  # pending, accepted, declined
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
