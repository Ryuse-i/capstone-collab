import json
from app.modules.ai.client import call_ai

TASK_COMPLEXITY_SYSTEM_PROMPT = """You are scoring documentation tasks for an IT capstone/thesis project using
an adapted Wood (1986) task-complexity model plus Robinson's task
complexity vs. task difficulty distinction (Zou et al. 2025, PLOS ONE).

Assume the performer is a normal-skill IT capstone student — average
research ability, average writing proficiency, no prior thesis-writing
experience. Do not adjust scores for a specific individual; this baseline
is fixed.

Score the task on four dimensions, each Low / Moderate / High:
- reasoning_demand: original reasoning/argument/judgment required, vs.
  recall, description, or transcription of decisions already made
- unfamiliarity: how far the content is from what the student knows
  firsthand about their own project, vs. external/technical/statistical
  material they must newly learn
- component_load: number of distinct facts, sources, or sub-elements that
  must be gathered before writing
- coordinative_load: how much those pieces must be cross-referenced or
  kept consistent with each other, the actual system, or other chapters

Return strict JSON:
{
  "task": "<task name>",
  "dimension_scores": {
    "reasoning_demand": "Low|Moderate|High",
    "unfamiliarity": "Low|Moderate|High",
    "component_load": "Low|Moderate|High",
    "coordinative_load": "Low|Moderate|High"
  }
}

Return ONLY the JSON object, no markdown code fences or preamble."""



def _parse_json_response(raw_content: str) -> dict:
    """Handles models that wrap JSON in markdown fences despite instructions."""
    try:
        return json.loads(raw_content)
    except json.JSONDecodeError:
        cleaned = (
            raw_content.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )
        return json.loads(cleaned)


async def score_task_complexity(task_name: str, task_description: str) -> dict:
    """
    Scores a task on the four Wood/Robinson complexity dimensions via the AI API.
    Returns dimension scores only — verdict is computed separately (see compute_verdict).
    """
    user_prompt = f"Task: {task_name}\nDescription: {task_description}"

    raw_content = await call_ai(
        prompt=user_prompt,
        system=TASK_COMPLEXITY_SYSTEM_PROMPT,
        max_tokens=300,
    )

    return _parse_json_response(raw_content)


