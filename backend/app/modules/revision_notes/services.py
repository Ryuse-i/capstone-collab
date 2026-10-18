from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.revision_notes.model import RevisionNote
from app.modules.revision_notes.repo import RevisionNoteRepo
from app.modules.revision_notes.schema import RevisionNoteCreate
from app.modules.tasks.enums import Status
from app.modules.tasks.schema import TaskUpdate
from app.modules.tasks.services import TaskService


class RevisionNoteService:
    @staticmethod
    async def get_by_task(db: AsyncSession, task_id: UUID):
        repo = RevisionNoteRepo(db)
        return await repo.get_by_task(task_id)

    @staticmethod
    async def get_one(db: AsyncSession, note_id: UUID):
        repo = RevisionNoteRepo(db)
        return await repo.get_by_id(note_id)

    @staticmethod
    async def reject_task(
        db: AsyncSession,
        task,
        payload: RevisionNoteCreate,
    ) -> RevisionNote:
        """Create a revision note and send the task back to the assignee.

        Raises ValueError if the task is not currently SUBMITTED.
        """
        if task.status != Status.SUBMITTED:
            raise ValueError("Only submitted tasks can be rejected")

        repo = RevisionNoteRepo(db)
        note = await repo.create_note(
            task_id=task.id,
            problem=payload.problem,
            recommended_changes=payload.recommended_changes,
        )

        # Send the task back so the assignee can rework it.
        # TODO: swap for a dedicated REVISION / REJECTED status if you add one.
        await TaskService.update_task(db, task, TaskUpdate(status=Status.IN_PROGRESS))
        return note

    @staticmethod
    async def resolve(db: AsyncSession, note: RevisionNote) -> RevisionNote:
        repo = RevisionNoteRepo(db)
        return await repo.mark_resolved(note)

    @staticmethod
    async def resolve_open_for_task(db: AsyncSession, task_id: UUID) -> int:
        """Call this when a task is resubmitted (status -> SUBMITTED)."""
        repo = RevisionNoteRepo(db)
        return await repo.resolve_open_for_task(task_id)