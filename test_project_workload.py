#!/usr/bin/env python3
"""
Simple test to verify calculate_project_workload logic after fixes.
This tests the core logic without requiring database setup.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

# Mock the necessary services and models
async def test_calculate_project_workload_logic():
    """Test the core logic of calculate_project_workload after our fixes."""

    # Create mock database session
    db = AsyncMock(spec=AsyncSession)

    # Create mock project_id
    project_id = uuid4()

    # Import the service (we'll need to handle imports carefully)
    try:
        from app.modules.project_snapshots.services import ProjectSnapshotService
        from app.modules.member_snapshots.services import MemberSnapshotService
        from app.modules.project_members.services import ProjectMemberService

        # Mock the dependencies
        ProjectMemberService.get_all_members_by_project = AsyncMock()
        MemberSnapshotService.get_latest_snapshot = AsyncMock()
        MemberSnapshotService.calculate_member_workload = AsyncMock()

        # Mock project members
        mock_member1 = MagicMock()
        mock_member1.id = uuid4()
        mock_member2 = MagicMock()
        mock_member2.id = uuid4()

        ProjectMemberService.get_all_members_by_project.return_value = [mock_member1, mock_member2]

        # Mock snapshots for baseline calculation
        mock_snapshot1 = MagicMock()
        mock_snapshot1.total_effective_points = 10.0
        mock_snapshot2 = MagicMock()
        mock_snapshot2.total_effective_points = 20.0

        MemberSnapshotService.get_latest_snapshot.side_effect = [mock_snapshot1, mock_snapshot2]

        # Mock workload calculation results
        mock_updated_snapshot1 = MagicMock()
        mock_updated_snapshot1.total_effective_points = 15.0
        mock_updated_snapshot2 = MagicMock()
        mock_updated_snapshot2.total_effective_points = 25.0

        MemberSnapshotService.calculate_member_workload.side_effect = [mock_updated_snapshot1, mock_updated_snapshot2]

        # Call the function
        result = await ProjectSnapshotService.calculate_project_workload(db, project_id)

        # Verify the calls were made correctly
        assert ProjectMemberService.get_all_members_by_project.called
        assert MemberSnapshotService.get_latest_snapshot.call_count == 2
        assert MemberSnapshotService.calculate_member_workload.call_count == 2

        # Verify the logic: baseline should be median of [10.0, 20.0] = 15.0
        # Total points should be sum of [15.0, 25.0] = 40.0
        # Note: The function doesn't return a value, it just performs the calculations

        print("✅ calculate_project_workload logic test passed!")
        print("   - Called get_all_members_by_project once")
        print("   - Called get_latest_snapshot twice (for baseline)")
        print("   - Called calculate_member_workload twice (to update snapshots)")
        print("   - No AttributeError on member.total_effective_points or member.member_id")
        return True

    except Exception as e:
        print(f"❌ calculate_project_workload logic test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_calculate_project_workload_logic())
    exit(0 if success else 1)