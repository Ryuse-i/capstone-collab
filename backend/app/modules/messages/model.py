from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, String

if TYPE_CHECKING: 
    from app.modules.users.model import User
    from app.modules.projects.model import Project 

class Message(Base):
    __tablename__="messages"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str]  = mapped_column(String)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )


    users: Mapped["User"] = relationship(
        "User",
        back_populates="messages",
        foreign_keys=[sender_id],
        
    )

    project: Mapped["Project"] = relationship(
        "Project",
        fore
    ) 
