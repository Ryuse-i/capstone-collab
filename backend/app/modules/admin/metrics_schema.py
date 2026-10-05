from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class AdminUserMetrics(BaseModel):
    total: int
    active: int
    inactive: int
    verified: int
    unverified: int
    new_last_7_days: int
    new_last_30_days: int
    active_last_7_days: int
    active_last_30_days: int
    unverified_older_than_7_days: int
    soft_deleted_total: int
    failed_logins_last_24h: int
    by_role: dict[str, int]


class AdminProjectMetrics(BaseModel):
    total: int
    without_instructor: int
    memberships: int
    new_last_30_days: int


class AdminTaskMetrics(BaseModel):
    total: int
    overdue: int
    unassigned: int
    new_last_30_days: int
    by_status: dict[str, int]


class AdminStoredFileItem(BaseModel):
    id: UUID
    filename: str
    content_type: str
    size: int
    created_at: datetime


class AdminFileTypeMetrics(BaseModel):
    content_type: str
    count: int
    total_size_bytes: int


class AdminFileMetrics(BaseModel):
    total: int
    total_size_bytes: int
    new_last_30_days: int
    by_type: list[AdminFileTypeMetrics]
    recent: list[AdminStoredFileItem]


class RecentActivityItem(BaseModel):
    id: UUID
    type: str
    actor_name: str
    actor_role: str | None
    target_label: str
    created_at: datetime


class AdminActionItem(BaseModel):
    id: UUID
    admin_name: str
    action: str
    target_label: str
    created_at: datetime


class AdminActivityMetrics(BaseModel):
    recent: list[RecentActivityItem]
    admin_actions: list[AdminActionItem]


class SystemServiceHealth(BaseModel):
    status: Literal["operational", "degraded", "down"]
    response_time_ms: float


class SystemStorageHealth(BaseModel):
    used_bytes: int
    limit_bytes: int | None


class AdminSystemHealth(BaseModel):
    api: SystemServiceHealth
    database: SystemServiceHealth
    storage: SystemStorageHealth
    checked_at: datetime


class AdminMetricsOverview(BaseModel):
    generated_at: datetime
    users: AdminUserMetrics
    projects: AdminProjectMetrics
    tasks: AdminTaskMetrics
    files: AdminFileMetrics
    activity: AdminActivityMetrics
    system: AdminSystemHealth