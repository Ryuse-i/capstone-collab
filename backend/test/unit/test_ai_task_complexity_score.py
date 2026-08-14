import json
import pytest

from app.modules.ai.service import (
    TASK_COMPLEXITY_SYSTEM_PROMPT,
    _parse_json_response,
)
from app.modules.ai.client import call_ai


@pytest.mark.asyncio
async def test_real_ai_task_complexity_statistical_analysis():
    task_name = "Create System use case Diagram"

    task_description = (
        "Create the system use case diagram by identifying the system's actors, defining the major use cases, and"
        "establishing the relationships between actors and use cases based on the system's documented"
        "requirements and planned functionality."
    )

    expected = {
        "reasoning_demand": "Moderate",
        "unfamiliarity": "Low",
        "component_load": "Moderate",
        "coordinative_load": "High",
    }

    prompt = f"Task: {task_name}\nDescription: {task_description}"

    print("\n" + "=" * 70)
    print("SENDING AI TASK COMPLEXITY REQUEST")
    print("=" * 70)
    print(f"Task: {task_name}")

    try:
        raw_content = await call_ai(
            prompt=prompt,
            system=TASK_COMPLEXITY_SYSTEM_PROMPT,
            max_tokens=1024,
        )
    except Exception as e:
        pytest.fail(f"AI request failed: {type(e).__name__}: {e}")

    print("\n" + "=" * 70)
    print("RAW AI RESPONSE")
    print("=" * 70)
    print(raw_content)

    try:
        result = _parse_json_response(raw_content)


    except (ValueError, json.JSONDecodeError) as e:
        pytest.fail(f"AI response could not be parsed/validated:\n{e}")

    dimensions = result["dimension_scores"]

    print("\n" + "=" * 70)
    print("AI TASK COMPLEXITY RESULT")
    print("=" * 70)

    total_checks = 0
    total_matches = 0

    for dimension, expected_level in expected.items():
        actual = dimensions[dimension]

        matched = actual == expected_level

        total_checks += 1

        if matched:
            total_matches += 1

        mark = "✓" if matched else "⚠"

        print(f"  {mark} {dimension}: expected~{expected_level}, got {actual}")

    print("-" * 70)

    pct = (total_matches / total_checks) * 100 if total_checks else 0

    print(f"Dimension-level accuracy: {total_matches}/{total_checks} ({pct:.1f}%)")

    print("-" * 70)

    print(json.dumps(result, indent=2))

    print("=" * 70)

    # Schema validation already happens above.
    # These assertions are the calibration expectations.
    for dimension, expected_level in expected.items():
        assert dimensions[dimension] == expected_level, (
            f"{task_name}: {dimension} expected "
            f"{expected_level}, got {dimensions[dimension]}"
        )
