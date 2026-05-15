from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID
from sqlalchemy import Text, DateTime, ForeignKey, UUID as PG_UUID


"""
    This is the assigned member for each tasks
"""


class MemberActivity(Base):
    __tablename__ = "member_activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_members.id")
    )
    detail: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
