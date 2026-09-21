from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
import enum
from sqlalchemy import Enum as SAEnum
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from app.modules.member_snapshots.model import MemberSnapshot
    from app.modules.projects.model import Project
    from app.modules.member_activities.model import MemberActivity
    from app.modules.users.model import User
    from app.modules.assigned_members.model import AssignedMember


class ProjectRole(str, enum.Enum):
    LEADER = "leader"
    ADVISOR = "advisor"
    MEMBER = "member"
    INSTRUCTOR = "instructor"


class Skills(str, enum.Enum):
    BACKEND_DEVELOPMENT = "Backend Development"
    FRONTEND_DEVELOPMENT = "Frontend Development"
    MOBILE_DEVELOPMENT = "Mobile Development"
    IOT_DEVELOPMENT = "IOT Development"
    DATABASE_DESIGN = "Database Design"
    SYSTEM_ARCHITECTURE = "System Architecture"
    UI_UX_DESIGN = "UI/UX Design"
    TESTING_AND_QUALITY_ASSURANCE = "Testing and Quality Assurance"
    LITERATURE_REVIEW = "Literature Review"
    DATA_COLLECTION = "Data Collection"
    SURVEY_AND_QUESTIONNAIRE_DESIGN = "Survey and Questionnaire Design"
    INTERVIEW_AND_OBSERVATION = "Interview and Observation"
    DATA_ANALYSIS = "Data Analysis"
    TECHNICAL_WRITING = "Technical Writing"
    DOCUMENTATION = "Documentation"
    DIAGRAM_AND_MODELING = "Diagram and Modeling"
    EDITING_AND_PROOFREADING = "Editing and Proofreading"
    FINANCIAL_DOCUMENTATION = "Financial Documentation"
    BUDGET_PLANNING = "Budget Planning "
    RESOURCE_MANAGEMENT = "Resource Management"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="members",
        foreign_keys=[project_id],
    )
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )

    @property
    def projects(self) -> "Project | None":
        return self.project

    @property
    def users(self) -> "User | None":
        return self.user

    project_role: Mapped[ProjectRole] = mapped_column(
        SAEnum(
            ProjectRole,
            name="projectrole",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=ProjectRole.MEMBER,
        nullable=True,
    )

    skills: Mapped[Skills] = mapped_column(
        SAEnum(
            Skills,
            name="member_skills",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=True,
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

    # Relationships
    snapshots: Mapped[list["MemberSnapshot"]] = relationship(
        "MemberSnapshot",
        back_populates="member",
        cascade="all, delete-orphan",
    )

    activities: Mapped[list["MemberActivity"]] = relationship(
        "MemberActivity",
        back_populates="member",
        cascade="all, delete-orphan",
    )

    assigned_members: Mapped[list["AssignedMember"]] = relationship(
        "AssignedMember",
        back_populates="members",
        cascade="all, delete-orphan",
    )
