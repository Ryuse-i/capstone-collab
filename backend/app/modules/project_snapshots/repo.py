from .model import ProjectSnapshot
from .schema import ProjectSnapshotUpsert
from app.core.base_repo import BaseRepo
from datetime import date
from sqlalchemy.dialects.postgresql import insert
from uuid import UUID


class ProjectSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectSnapshot)

    async def upsert_today_snapshot(
        self, project_id: UUID, metrics: ProjectSnapshotUpsert
    ):
        today = date.today()

        values = metrics.model_dump(exclude_unset=True)
        stmt = insert(ProjectSnapshot).values(
            project_id=project_id,
            snapshot_date=today,
            **values,
        )

        stmt = (
            stmt.on_conflict_do_update(
                index_elements=["project_id", "snapshot_date"], set_=values
            )
            if values
            else stmt.on_conflict_do_nothing(
                index_elements=["project_id", "snapshot_date"]
            )
        ).returning(ProjectSnapshot)

        snapshot = await self.db.execute(stmt)

        return snapshot.scalar_one_or_none()
