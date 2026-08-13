import json
import re

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


VALID_LEVELS = {"Low", "Moderate", "High"}

EXPECTED_DIMENSIONS = {
    "reasoning_demand",
    "unfamiliarity",
    "component_load",
    "coordinative_load",
}


def _parse_json_response(raw_content: str) -> dict:
    """
    Parse a JSON object from an AI response.

    Handles:
    - Pure JSON
    - Markdown fenced JSON
    - <thought>...</thought> followed by JSON
    - Extra text/preamble surrounding JSON
    """

    if not raw_content or not raw_content.strip():
        raise ValueError("AI provider returned empty content")

    raw_content = raw_content.strip()

    # ---------------------------------------------------------
    # 1. Best case: response is already valid JSON
    # ---------------------------------------------------------
    try:
        result = json.loads(raw_content)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")

        return result

    except json.JSONDecodeError:
        pass

    # ---------------------------------------------------------
    # 2. Remove complete <thought>...</thought> blocks
    # ---------------------------------------------------------
    cleaned = re.sub(
        r"<thought>.*?</thought>",
        "",
        raw_content,
        flags=re.DOTALL | re.IGNORECASE,
    ).strip()

    # ---------------------------------------------------------
    # 3. Handle an unclosed/truncated <thought> block
    # ---------------------------------------------------------
    if "<thought>" in cleaned.lower():
        cleaned = re.sub(
            r"<thought>.*",
            "",
            cleaned,
            flags=re.DOTALL | re.IGNORECASE,
        ).strip()

    # ---------------------------------------------------------
    # 4. Remove markdown code fences
    # ---------------------------------------------------------
    cleaned = re.sub(
        r"```(?:json)?",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = cleaned.replace("```", "").strip()

    # ---------------------------------------------------------
    # 5. Try the cleaned response directly
    # ---------------------------------------------------------
    try:
        result = json.loads(cleaned)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")

        return result

    except json.JSONDecodeError:
        pass

    # ---------------------------------------------------------
    # 6. Find the JSON object inside surrounding text
    # ---------------------------------------------------------
    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end == -1 or end < start:
        raise ValueError(
            "Could not locate a JSON object in AI response.\n"
            f"Raw response:\n{raw_content[:2000]}"
        )

    json_text = cleaned[start : end + 1]

    try:
        result = json.loads(json_text)

    except json.JSONDecodeError as e:
        raise ValueError(
            "Found a possible JSON object, but it could not be parsed.\n"
            f"JSON error: {e}\n"
            f"Raw response:\n{raw_content[:2000]}"
        ) from e

    if not isinstance(result, dict):
        raise ValueError("Expected a JSON object")

    return result


def _validate_task_complexity_result(
    result: dict,
    expected_task_name: str,
) -> dict:
    """
    Validate the structure and values returned by the AI model.

    Expected structure:

    {
        "task": "...",
        "dimension_scores": {
            "reasoning_demand": "Low|Moderate|High",
            "unfamiliarity": "Low|Moderate|High",
            "component_load": "Low|Moderate|High",
            "coordinative_load": "Low|Moderate|High"
        }
    }
    """

    # ---------------------------------------------------------
    # Validate top-level keys
    # ---------------------------------------------------------
    required_keys = {"task", "dimension_scores"}

    missing_keys = required_keys - result.keys()

    if missing_keys:
        raise ValueError(
            f"AI response is missing required keys: {sorted(missing_keys)}"
        )

    # ---------------------------------------------------------
    # Validate task
    # ---------------------------------------------------------
    task = result["task"]

    if not isinstance(task, str):
        raise ValueError("AI response 'task' must be a string")

    if not task.strip():
        raise ValueError("AI response 'task' cannot be empty")

    # The model should return the task that was given to it.
    # We don't require exact matching because models may normalize
    # capitalization or spacing.
    if task.strip().lower() != expected_task_name.strip().lower():
        raise ValueError(
            f"AI returned unexpected task name. "
            f"Expected: {expected_task_name!r}, "
            f"Got: {task!r}"
        )

    # ---------------------------------------------------------
    # Validate dimension_scores
    # ---------------------------------------------------------
    dimensions = result["dimension_scores"]

    if not isinstance(dimensions, dict):
        raise ValueError("AI response 'dimension_scores' must be a JSON object")

    actual_dimensions = set(dimensions.keys())

    missing_dimensions = EXPECTED_DIMENSIONS - actual_dimensions
    extra_dimensions = actual_dimensions - EXPECTED_DIMENSIONS

    if missing_dimensions:
        raise ValueError(
            f"AI response is missing dimensions: {sorted(missing_dimensions)}"
        )

    if extra_dimensions:
        raise ValueError(
            f"AI response contains unexpected dimensions: {sorted(extra_dimensions)}"
        )

    # ---------------------------------------------------------
    # Validate dimension values
    # ---------------------------------------------------------
    for dimension in EXPECTED_DIMENSIONS:
        score = dimensions[dimension]

        if score not in VALID_LEVELS:
            raise ValueError(
                f"Invalid score for '{dimension}': {score!r}. "
                f"Expected one of: {sorted(VALID_LEVELS)}"
            )

    return {
        "task": task,
        "dimension_scores": {
            dimension: dimensions[dimension] for dimension in EXPECTED_DIMENSIONS
        },
    }


async def score_task_complexity(
    task_name: str,
    task_description: str,
) -> dict:
    """
    Score a documentation task using the AI task-complexity model.

    Returns:

    {
        "task": "...",
        "dimension_scores": {
            "reasoning_demand": "Low|Moderate|High",
            "unfamiliarity": "Low|Moderate|High",
            "component_load": "Low|Moderate|High",
            "coordinative_load": "Low|Moderate|High"
        }
    }

    The AI provider can return either:
    - Pure JSON
    - JSON surrounded by markdown
    - JSON preceded by a <thought>...</thought> block
    """

    user_prompt = f"Task: {task_name}\nDescription: {task_description}"

    raw_content = await call_ai(
        prompt=user_prompt,
        system=TASK_COMPLEXITY_SYSTEM_PROMPT,
        max_tokens=1024,
    )

    result = _parse_json_response(raw_content)

    return _validate_task_complexity_result(
        result=result,
        expected_task_name=task_name,
    )
