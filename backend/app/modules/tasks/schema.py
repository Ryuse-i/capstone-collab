from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from app.modules.tasks.enums import Status, Priority, Complexity, Category
from app.modules.project_members.model import Skills

class TaskCreate(BaseModel):
    name: str
    description: str
    created_by: UUID
    project_id: UUID
    supertask_id: UUID | None = None
    status: Status | None = None
    priority: Priority
    complexity: Complexity | None = None
    complexity_points: int | None = None 
    category: Category | None = None
    primary_skills: Skills
    secondary_skills: list[Skills] | None = None
    deadline: datetime
    completed_at: datetime | None = None
    total_time_spent: int | None = None


class TaskUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    project_id: UUID | None = None
    supertask_id: UUID | None = None
    status: Status | None = None
    priority: Priority | None = None
    complexity: Complexity | None = None
    complexity_points: int | None = None
    category: Category | None = None
    primary_skills: Skills
    secondary_skills: list[Skills] | None = None
    deadline: datetime | None = None
    completed_at: datetime | None = None
    total_time_spent: int | None = None


class TaskResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    created_by: UUID | None = None
    project_id: UUID | None = None
    supertask_id: UUID | None = None
    status: Status | None = None
    priority: Priority | None = None
    complexity: Complexity | None = None
    complexity_points: int | None = None
    category: Category | None = None
    primary_skills: Skills
    secondary_skills: list[Skills] | None = None
    deadline: datetime | None = None
    completed_at: datetime | None = None
    total_time_spent: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class ConfigDict:
        from_attributes = True
