"""
schema.py  -> app/modules/dashboard/schema.py

Response models for GET /dashboard/instructor. Field names are snake_case to match the
rest of the API (the frontend types use snake_case too).
"""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel
from app.modules.member_activities.schema import RecentActivityItem

DashboardRole = Literal["instructor", "advisor"]
HealthLevel = Literal["healthy", "watch", "at_risk"]  # same values as HealthStatus
Urgency = Literal["overdue", "today", "soon", "later"]


class DashboardProject(BaseModel):
    id: UUID
    name: str
    role: DashboardRole
    health: HealthLevel | None = None  # None = could not be calculated
    health_score: float | None = None  # 0-100, None = N/A
    progress: int  # 0-100, from the latest project snapshot
    pending_submissions: int  # submitted tasks where this user is an assigned reviewer


class DashboardDeadline(BaseModel):
    id: UUID  # task id
    project_id: UUID
    project_name: str
    role: DashboardRole
    title: str
    student_names: list[str]
    note: str | None = None  # Task.description
    deadline: date
    days_from_now: int  # negative = overdue (Asia/Manila calendar day)
    urgency: Urgency


class DashboardStats(BaseModel):
    total_projects: int
    at_risk_projects: int  # health is watch or at_risk
    pending_submissions: int
    overdue_deadlines: int


class DashboardActivityItem(BaseModel):
    """PLACEHOLDER. Shape only; nothing fills it yet."""

    id: str
    project_id: UUID
    project_name: str
    message: str
    timestamp: datetime  # ISO string in JSON; the frontend formats "time ago"


class InstructorDashboardResponse(BaseModel):
    projects: list[DashboardProject]
    deadlines: list[DashboardDeadline]
    stats: DashboardStats
    recent_activity: list[RecentActivityItem] = []

