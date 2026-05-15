from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from app.modules.tasks.enums import Relation


class TaskRelationCreate(BaseModel):
    task_id: UUID 
    related_to: UUID 
    relation: Relation 


class TaskRelationUpdate(BaseModel):
    task_id: UUID | None = None
    related_to: UUID | None = None
    relation: Relation | None = None


class TaskRelationResponse(BaseModel):
    id: int 
    task_id: UUID 
    related_to: UUID 
    relation: Relation 
    created_at: datetime 
    updated_at: datetime 

    class ConfigDict:
        from_attributes = True
