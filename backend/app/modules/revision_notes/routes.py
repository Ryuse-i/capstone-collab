from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.admin.activity_service import ActivityLogService
from app.modules.revision_notes.schema import (
    RevisionNoteCreate,
    RevisionNoteResponse,
)
from app.modules.revision_notes.services import RevisionNoteService
from app.modules.tasks.services import TaskService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

# Register with prefix="/revision-notes" in your main app
revision_note_router = APIRouter()


@revision_note_router.post(
    "/tasks/{task_id}/reject",
    response_model=RevisionNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def reject_task(
    task_id: UUID,
    payload: RevisionNoteCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Reject a submitted task by creating a revision note."""
    task = await TaskService.get_one_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    # TODO: confirm current_user is an assigned reviewer of this task
    # (check AssignedReviewer) before allowing the rejection.

    try:
        note = await RevisionNoteService.reject_task(db, task, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    await ActivityLogService.record(
        db,
        event_type="task_rejected",
        actor_id=current_user.id,
        target_type="task",
        target_id=task_id,
        details={"target_label": task.name},
    )
    return note


@revision_note_router.get(
    "/tasks/{task_id}", response_model=list[RevisionNoteResponse]
)
async def get_task_revision_notes(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Full rejection history for a task, newest first."""
    task = await TaskService.get_one_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return await RevisionNoteService.get_by_task(db, task_id)


@revision_note_router.patch(
    "/{note_id}/resolve", response_model=RevisionNoteResponse
)
async def resolve_revision_note(
    note_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Manually mark a single note as resolved."""
    note = await RevisionNoteService.get_one(db, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Revision note not found"
        )
    return await RevisionNoteService.resolve(db, note)