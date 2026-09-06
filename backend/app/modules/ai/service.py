import json
import re
import logging

from app.modules.ai.client import call_ai
from pydantic import ValidationError
from .schema import TaskComplexityResult

logger = logging.getLogger(__name__)

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
  },
   "rationale": "<1-2 sentence justification for the four scores above>"
}

Return ONLY the JSON object, no markdown code fences or preamble.
Do not omit "rationale" under any circumstances."""


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


async def score_task_complexity(
    task_name: str,
    task_description: str,
) -> TaskComplexityResult:
    user_prompt = f"Task: {task_name}\nDescription: {task_description}"
    system_prompt = TASK_COMPLEXITY_SYSTEM_PROMPT
    last_error: Exception | None = None

    for attempt in range(2):  # 1 initial attempt + 1 repair retry
        raw_content = await call_ai(
            prompt=user_prompt,
            system=system_prompt,
            max_tokens=1024,
            reasoning_effort="minimal"
        )

        try:
            parsed = _parse_json_response(raw_content)
            result = TaskComplexityResult.model_validate(parsed)

            if result.task.strip().lower() != task_name.strip().lower():
                raise ValueError(
                    f"AI returned unexpected task name. "
                    f"Expected: {task_name!r}, Got: {result.task!r}"
                )

            return result

        except (ValueError, ValidationError) as e:
            missing = []
            if isinstance(e, ValidationError):
                missing = [
                    ".".join(str(loc) for loc in err["loc"])
                    for err in e.errors()
                    if err["type"] == "missing"
                ]
            logger.warning(
                "AI response failed schema validation on attempt %d (missing: %s): %s",
                attempt + 1,
                missing,
                raw_content[:500],
            )
            last_error = e

            if attempt == 0:
                system_prompt = (
                    TASK_COMPLEXITY_SYSTEM_PROMPT
                    + f"\n\nYour previous response was invalid or missing "
                    f"required fields ({missing or 'malformed JSON'}). "
                    "Return the COMPLETE JSON object with every field."
                )
                continue

            raise ValueError(
                f"AI response failed schema validation after retry:\n{e}\n"
                f"Raw response:\n{raw_content[:2000]}"
            ) from e

    # Unreachable in practice: every branch above either returns or raises.
    # This exists only so the type checker can prove the function has no
    # implicit None-returning path.
    raise AssertionError(
        f"score_task_complexity exhausted retries unexpectedly: {last_error}"
    )
