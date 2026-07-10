from .model import ProjectSnapshot
from app.core.base_repo import BaseRepo
from datetime import date
from sqlalchemy.dialects.postgresql import insert
from uuid import UUID


class ProjectSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectSnapshot)

    async def upsert_today_snapshot(self, project_id: UUID, metrics: dict):
        today = date.today()

        stmt = insert(ProjectSnapshot).values(
            project_id=project_id,
            snapshot_date=today,
            **metrics,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["project_id", "snapshot_date"],
            set_=metrics,  #
        )
        await self.db.execute(stmt)
        await self.db.commit()
