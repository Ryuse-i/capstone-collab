from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class PeerEvaluationCreate(BaseModel):
    evaluator_id: UUID
    evaluated_id: UUID
    task_id: UUID
    score: int


class PeerEvaluationUpdate(BaseModel):
    evaluator_id: UUID | None = None
    evaluated_id: UUID | None = None
    task_id: UUID | None = None
    score: int | None = None


class PeerEvaluationResponse(BaseModel):
    id: UUID
    evaluator_id: UUID
    evaluated_id: UUID
    task_id: UUID
    score: int
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True
