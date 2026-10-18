from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select

from app.core.base_repo import BaseRepo
from app.modules.revision_notes.model import RevisionNote


class RevisionNoteRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, RevisionNote)

    async def get_by_task(self, task_id: UUID) -> list[RevisionNote]:
        """All notes for a task, newest revision first."""
        stmt = (
            select(RevisionNote)
            .where(RevisionNote.task_id == task_id)
            .order_by(RevisionNote.revision_number.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_open_by_task(self, task_id: UUID) -> list[RevisionNote]:
        """Notes the assignee has not resolved yet."""
        stmt = (
            select(RevisionNote)
            .where(RevisionNote.task_id == task_id)
            .where(RevisionNote.resolved_at.is_(None))
            .order_by(RevisionNote.revision_number.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_next_revision_number(self, task_id: UUID) -> int:
        stmt = select(func.coalesce(func.max(RevisionNote.revision_number), 0)).where(
            RevisionNote.task_id == task_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() + 1

    async def create_note(
        self,
        task_id: UUID,
        problem: str,
        recommended_changes: str | None,
    ) -> RevisionNote:
        note = RevisionNote(
            task_id=task_id,
            revision_number=await self.get_next_revision_number(task_id),
            problem=problem,
            recommended_changes=recommended_changes,
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def mark_resolved(self, note: RevisionNote) -> RevisionNote:
        note.resolved_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def resolve_open_for_task(self, task_id: UUID) -> int:
        """Resolve every open note on a task. Returns how many were resolved."""
        notes = await self.get_open_by_task(task_id)
        now = datetime.now(timezone.utc)
        for note in notes:
            note.resolved_at = now
        if notes:
            await self.db.commit()
        return len(notes)