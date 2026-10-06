import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.modules.papers.model import Paper, PaperChunk
from app.modules.papers.schema import PaperCreate, PaperUpdate
from app.modules.papers.services import PaperService
from app.modules.papers.repo import PaperRepo, PaperChunkRepo


@pytest.mark.asyncio
async def test_create_paper():
    """Test creating a paper."""
    # Mock dependencies
    mock_db = AsyncMock()
    mock_paper_repo = AsyncMock()
    mock_paper = Paper(
        id=1,
        title="Test Paper",
        abstract="Test abstract",
        authors=["Author 1"],
        adviser=None,
        published_date=None,
        keywords=[],
        file_path=None,
    )

    # Configure mocks
    with patch('app.modules.papers.services.PaperRepo', return_value=mock_paper_repo), \
         patch('app.modules.papers.services.PaperService._index_paper_contents'):
        mock_paper_repo.create.return_value = mock_paper

        # Test data
        paper_data = PaperCreate(
            title="Test Paper",
            abstract="Test abstract",
            authors=["Author 1"],
        )

        # Call service
        result = await PaperService.create_paper(mock_db, paper_data)

        # Assertions
        assert result.title == "Test Paper"
        assert result.abstract == "Test abstract"
        assert result.authors == ["Author 1"]
        mock_paper_repo.create.assert_called_once()


@pytest.mark.asyncio
async def test_get_paper_not_found():
    """Test getting a paper that doesn't exist."""
    # Mock dependencies
    mock_db = AsyncMock()
    mock_paper_repo = AsyncMock()

    # Configure mocks
    with patch('app.modules.papers.services.PaperRepo', return_value=mock_paper_repo):
        mock_paper_repo.get_by_id.return_value = None

        # Call service
        result = await PaperService.get_paper(mock_db, 999)

        # Assertions
        assert result is None
        mock_paper_repo.get_by_id.assert_called_once_with(999)


@pytest.mark.asyncio
async def test_search_papers_empty_query():
    """Test searching with empty query."""
    # Mock dependencies
    mock_db = AsyncMock()

    # Call service
    result = await PaperService.search_papers(mock_db, "")

    # Assertions
    assert result == []


@pytest.mark.asyncio
async def test_paper_chunk_model():
    """Test PaperChunk model instantiation."""
    chunk = PaperChunk(
        id=1,
        paper_id=1,
        chunk_index=0,
        content="Test content",
        embedding=[0.1, 0.2, 0.3] * 128,  # 384 dimensions
    )

    assert chunk.id == 1
    assert chunk.paper_id == 1
    assert chunk.chunk_index == 0
    assert chunk.content == "Test content"
    assert len(chunk.embedding) == 384


@pytest.mark.asyncio
async def test_paper_model():
    """Test Paper model instantiation."""
    paper = Paper(
        id=1,
        title="Test Paper",
        abstract="Test abstract",
        authors=["Author 1", "Author 2"],
        adviser="Dr. Advisor",
        published_date=None,
        keywords=["test", "research"],
        file_path=None,
    )

    assert paper.id == 1
    assert paper.title == "Test Paper"
    assert paper.abstract == "Test abstract"
    assert paper.authors == ["Author 1", "Author 2"]
    assert paper.adviser == "Dr. Advisor"
    assert paper.keywords == ["test", "research"]