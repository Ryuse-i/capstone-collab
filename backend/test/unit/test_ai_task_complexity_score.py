import json
import pytest

from app.modules.ai.service import score_task_complexity


@pytest.mark.asyncio
async def test_real_ai_task_complexity_score():
    task_name = "Design Workload Monitor"
    task_description = (
        "Design the workload redistribution algorithm that evaluates "
        "member workload, task complexity, skills, availability, and "
        "recommends suitable task transfers."
    )

    print("\n")
    print("=" * 70)
    print("REAL AI TASK COMPLEXITY TEST")
    print("=" * 70)

    print("\n=== TASK ===")
    print(task_name)

    print("\n=== DESCRIPTION ===")
    print(task_description)

    print("\n=== CALLING AI API ===")
    print("Waiting for AI response...")

    try:
        result = await score_task_complexity(
            task_name,
            task_description,
        )

        print("\n=== AI RESPONSE ===")
        print(json.dumps(result, indent=2))

        print("\n=== DIMENSION SCORES ===")

        dimensions = result["dimension_scores"]

        for dimension, score in dimensions.items():
            print(f"  {dimension:<20} → {score}")

        print("\n=== VALIDATION ===")

        expected_dimensions = {
            "reasoning_demand",
            "unfamiliarity",
            "component_load",
            "coordinative_load",
        }

        valid_levels = {"Low", "Moderate", "High"}

        assert set(dimensions.keys()) == expected_dimensions

        for dimension, score in dimensions.items():
            assert score in valid_levels

        print("✓ All four dimensions present")
        print("✓ All scores are valid")
        print("✓ AI response successfully parsed")

    except Exception as exc:
        print("\n=== AI API ERROR ===")
        print(type(exc).__name__)
        print(str(exc))
        raise

    print("\n" + "=" * 70)
    print("TEST PASSED")
    print("=" * 70)
