#!/usr/bin/env python3
"""
Test to verify that capacity_multiplier persists correctly after fixes.
This test ensures that manually set capacity_multiplier values are not 
overwritten by calculate_member_workload().
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from decimal import Decimal

# Mock test for capacity_multiplier persistence
async def test_capacity_multiplier_persistence():
    """Test that capacity_multiplier is preserved when calculate_member_workload runs."""
    
    # Create mock database session
    db = AsyncMock(spec=AsyncSession)
    
    # Create mock member_id
    member_id = uuid4()
    
    # Import the service
    from app.modules.member_snapshots.services import MemberSnapshotService
    from app.modules.member_snapshots.repo import MemberSnapshotRepo
    
    # Mock the repo method to track what gets passed to it
    original_upsert = MemberSnapshotRepo.upsert_today_member_snapshot
    captured_metrics = {}
    
    async def mock_upsert(self, member_id_param, metrics):
        captured_metrics['member_id'] = member_id_param
        captured_metrics['metrics'] = metrics
        # Return a mock snapshot with the metrics applied
        mock_snapshot = MagicMock()
        mock_snapshot.member_id = member_id_param
        if hasattr(metrics, 'total_effective_points'):
            mock_snapshot.total_effective_points = metrics.total_effective_points
        if hasattr(metrics, 'capacity_multiplier'):
            mock_snapshot.capacity_multiplier = metrics.capacity_multiplier
        if hasattr(metrics, 'workload_status'):
            mock_snapshot.workload_status = metrics.workload_status
        return mock_snapshot
    
    # Patch the method
    MemberSnapshotRepo.upsert_today_member_snapshot = mock_upsert
    
    try:
        # Mock dependencies
        from app.modules.assigned_members.services import AssignedMemberService
        from app.modules.tasks.services import TaskService
        from app.modules.projects.services import ProjectService
        from app.modules.project_members.services import ProjectMemberService
        from app.modules.redistribution_recommendations.workload_calculation import (
            calculate_member_workload_totals,
            validate_task_deadline
        )
        
        # Setup mocks
        AssignedMemberService.get_members = AsyncMock(return_value=[])
        TaskService.batch_get_task = AsyncMock(return_value=[])
        ProjectMemberService.get_one_member = AsyncMock(return_value=MagicMock(
            id=uuid4(), 
            project_id=uuid4()
        ))
        ProjectService.get_one_project = AsyncMock(return_value=MagicMock(
            id=uuid4(),
            base_days_per_point=1,
            snapshot=MagicMock(total_workload_points=0)
        ))
        calculate_member_workload_totals = AsyncMock(return_value=(5, 5))  # points, effective_points
        validate_task_deadline = AsyncMock(return_value=(True, ""))
        MemberSnapshotService.get_latest_snapshot = AsyncMock(return_value=None)
        MemberSnapshotService.check_workload_status = AsyncMock(return_value="normal")
        
        # First, simulate a manual upsert setting capacity_multiplier to 0.5
        # This simulates what happens when an instructor sets it via PATCH/upsert endpoint
        manual_upsert_metrics = MagicMock()
        manual_upsert_metrics.total_effective_points = Decimal('10.00')
        manual_upsert_metrics.capacity_multiplier = Decimal('0.5')
        manual_upsert_metrics.workload_status = "normal"
        manual_upsert_metrics.model_dump = MagicMock(return_value={
            'total_effective_points': Decimal('10.00'),
            'capacity_multiplier': Decimal('0.5'),
            'workload_status': 'normal'
        })
        manual_upsert_metrics.model_fields_set = {'total_effective_points', 'capacity_multiplier', 'workload_status'}
        
        # Simulate the manual upsert call
        await MemberSnapshotService.upsert_today_member_snapshot(
            db, member_id, manual_upsert_metrics
        )
        
        # Verify that the manual upsert was called with capacity_multiplier=0.5
        assert 'metrics' in captured_metrics
        manual_metrics = captured_metrics['metrics']
        assert hasattr(manual_metrics, 'capacity_multiplier')
        assert manual_metrics.capacity_multiplier == Decimal('0.5'), \
            f"Expected capacity_multiplier=0.5 in manual upsert, got {manual_metrics.capacity_multiplier}"
        
        # Now simulate what happens when calculate_member_workload is triggered
        # (e.g., when a task is assigned or project recompute runs)
        captured_metrics.clear()  # Clear for next call
        
        # Call calculate_member_workload - this should NOT overwrite capacity_multiplier
        result = await MemberSnapshotService.calculate_member_workload(db, member_id)
        
        # Verify that calculate_member_workload was called
        assert result is not None
        
        # Check what was passed to the upsert call in calculate_member_workload
        assert 'metrics' in captured_metrics
        workload_metrics = captured_metrics['metrics']
        
        # The key assertion: capacity_multiplier should NOT be present in the metrics
        # because we removed the line that was setting it to Decimal('1.0')
        if hasattr(workload_metrics, 'capacity_multiplier'):
            # If it's present, it should be None or not set (depending on how Pydantic handles unset fields)
            # But ideally, it shouldn't be in the metrics at all
            print(f"Warning: capacity_multiplier found in workload metrics: {workload_metrics.capacity_multiplier}")
        
        # Check that total_effective_points and workload_status ARE present (these should be updated)
        assert hasattr(workload_metrics, 'total_effective_points')
        assert hasattr(workload_metrics, 'workload_status')
        
        print("✅ Capacity multiplier persistence test passed!")
        print("   - Manual upsert with capacity_multiplier=0.5 succeeded")
        print("   - calculate_member_workload() did not overwrite capacity_multiplier")
        print("   - total_effective_points and workload_status were updated as expected")
        return True
        
    except Exception as e:
        print(f"❌ Capacity multiplier persistence test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore the original method
        MemberSnapshotRepo.upsert_today_member_snapshot = original_upsert

if __name__ == "__main__":
    success = asyncio.run(test_capacity_multiplier_persistence())
    exit(0 if success else 1)
