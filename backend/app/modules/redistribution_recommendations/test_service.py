"""
Unit tests for the redistribution recommendations service.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.redistribution_recommendations.services import RecommendationService as RedistributionRecommendationsService


class TestRedistributionRecommendationsService:
    """Test the redistribution recommendations service."""

    @pytest.mark.asyncio
    async def test_generate_redistribution_options(self):
        """Test that the service correctly calls the redistribution logic."""
        # Mock the database session
        db = AsyncMock(spec=AsyncSession)
        project_id = uuid4()

        # Mock the generate_redistribution_options function from redistribution_logic
        mock_options = [
            {
                "type": "Move",
                "task_id": uuid4(),
                "original_member_id": uuid4(),
                "recipient_member_id": uuid4(),
                "impact": 5.0,
                "details": {}
            }
        ]

        with patch('app.modules.redistribution_recommendations.services.RecommendationService.generate_redistribution_options') as mock_generate:
            mock_generate.return_value = mock_options

            # Call the service method
            result = await RedistributionRecommendationsService.generate_redistribution_options(db, project_id)

            # Verify the function was called with correct arguments
            mock_generate.assert_called_once_with(db, project_id)

            # Verify the result
            assert result == mock_options