#!/usr/bin/env python3
"""
Simple test to verify calculate_project_workload logic after fixes.
This tests that the AttributeError bugs are fixed by examining the source code.
"""

import inspect

def test_calculate_project_workload_source():
    """Test that calculate_project_workload no longer has the AttributeError bugs."""

    try:
        from app.modules.project_snapshots.services import ProjectSnapshotService

        # Get the source code of the method
        source = inspect.getsource(ProjectSnapshotService.calculate_project_workload)

        # Check that we don't have the old buggy patterns
        assert "member.total_effective_points" not in source, \
            "Found buggy 'member.total_effective_points' - should use snapshots"
        assert "member.member_id" not in source, \
            "Found buggy 'member.member_id' - should use 'member.id'"

        # Check that we have the correct patterns
        assert "member.id" in source, \
            "Should use 'member.id' to access member ID"
        assert "get_latest_snapshot" in source, \
            "Should get snapshots to access total_effective_points"
        assert "calculate_member_workload" in source, \
            "Should call calculate_member_workload to update snapshots"

        print("✅ Source code analysis passed!")
        print("   - No 'member.total_effective_points' found (fixed)")
        print("   - No 'member.member_id' found (fixed)")
        print("   - Uses 'member.id' correctly")
        print("   - Uses get_latest_snapshot to access snapshot data")
        print("   - Calls calculate_member_workload to update snapshots")
        return True

    except Exception as e:
        print(f"❌ Source code analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_calculate_project_workload_source()
    exit(0 if success else 1)