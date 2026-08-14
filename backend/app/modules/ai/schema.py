from typing import Literal

from pydantic import BaseModel, computed_field, field_validator


ComplexityLevel = Literal["Low", "Moderate", "High"]

_LEVEL_TO_INT = {"Low": 1, "Moderate": 2, "High": 3}


class DimensionScores(BaseModel):
    reasoning_demand: ComplexityLevel
    unfamiliarity: ComplexityLevel
    component_load: ComplexityLevel
    coordinative_load: ComplexityLevel

    model_config = {"extra": "forbid"}


class TaskComplexityResult(BaseModel):
    task: str
    dimension_scores: DimensionScores
    rationale: str

    model_config = {"extra": "forbid"}

    @field_validator("task")
    @classmethod
    def task_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("task cannot be empty")
        return v

    @field_validator("rationale")
    @classmethod
    def rationale_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("rationale cannot be empty")
        return v

    @computed_field
    @property
    def verdict(self) -> int:
        """
        Verdict = max(dimension scores), mapped Low=1 / Moderate=2 / High=3.
        Computed deterministically from validated dimension_scores rather
        than trusted from the model, so it can never disagree with the
        dimensions that produced it.
        """
        scores = self.dimension_scores
        return max(
            _LEVEL_TO_INT[scores.reasoning_demand],
            _LEVEL_TO_INT[scores.unfamiliarity],
            _LEVEL_TO_INT[scores.component_load],
            _LEVEL_TO_INT[scores.coordinative_load],
        )
