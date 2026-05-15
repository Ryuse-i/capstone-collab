from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.peer_evaluations.schema import PeerEvaluationCreate, PeerEvaluationUpdate, PeerEvaluationResponse
from app.modules.peer_evaluations.services import PeerEvaluationService
from uuid import UUID
from typing import List

# Standardizing on peer_evaluation_router
peer_evaluation_router = APIRouter()


@peer_evaluation_router.get("/", response_model=List[PeerEvaluationResponse])
async def get_all_peer_evaluations(db: AsyncSession = Depends(get_async_session)):
    """Fetch all peer evaluations from the database."""
    return await PeerEvaluationService.get_all_peer_evaluations(db)


@peer_evaluation_router.get("/{peer_evaluation_id}", response_model=PeerEvaluationResponse)
async def get_one_peer_evaluation(peer_evaluation_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single peer evaluation by its UUID."""
    db_item = await PeerEvaluationService.get_one_peer_evaluation(db, peer_evaluation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Peer evaluation not found"
        )
    return db_item


@peer_evaluation_router.post("/", response_model=PeerEvaluationResponse, status_code=status.HTTP_201_CREATED)
async def create_peer_evaluation(peer_evaluation: PeerEvaluationCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new peer evaluation. Returns 201 Created on success."""
    return await PeerEvaluationService.create_peer_evaluation(db, peer_evaluation)


@peer_evaluation_router.patch("/{peer_evaluation_id}", response_model=PeerEvaluationResponse)
async def update_peer_evaluation(
    peer_evaluation_id: UUID,
    peer_evaluation: PeerEvaluationUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing peer evaluation."""
    db_item = await PeerEvaluationService.get_one_peer_evaluation(db, peer_evaluation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Peer evaluation not found"
        )
    return await PeerEvaluationService.update_peer_evaluation(db, db_item, peer_evaluation)


@peer_evaluation_router.delete("/{peer_evaluation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_peer_evaluation(
    peer_evaluation_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a peer evaluation. Returns 204 No Content on success."""
    db_item = await PeerEvaluationService.get_one_peer_evaluation(db, peer_evaluation_id)

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Peer evaluation not found"
        )

    await PeerEvaluationService.delete_peer_evaluation(db, db_item)
    return None
