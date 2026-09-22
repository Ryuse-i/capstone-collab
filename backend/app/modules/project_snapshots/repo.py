from .model import ProjectSnapshot
from .schema import ProjectSnapshotUpsert
from app.core.base_repo import BaseRepo
from datetime import date
from sqlalchemy.dialects.postgresql import insert
from uuid import UUID
from sqlalchemy import select, func

class ProjectSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectSnapshot)

    async def upsert_today_snapshot(
        self, project_id: UUID, metrics: ProjectSnapshotUpsert
    ):
        today = date.today()

        #dumps all fields towards values 
        values = metrics.model_dump(exclude_unset=True)
        #explicit set project_id and snapshot_date
        #uses dialects.postgresql insert rather than normal insert from sqlalchemy
        #if the project with unique constraints already exist then go to on_conflict_do_update
        stmt = insert(ProjectSnapshot).values(
            project_id=project_id,
            snapshot_date=today,
            **values,
        )


        #updates snapshot
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
    
    async def get_latest_snapshot(self, project_id: UUID):
        stmt = (
            select(ProjectSnapshot)
            .where(ProjectSnapshot.project_id == project_id)
            .order_by(ProjectSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def count_unassigned_tasks(self, project_id: UUID) -> int:
        from app.modules.tasks.model import Task
        from app.modules.assigned_members.model import AssignedMember

        stmt = (
            select(func.count(Task.id))
            .select_from(Task)
            .outerjoin(AssignedMember, Task.id == AssignedMember.task_id)
            .where(Task.project_id == project_id)
            .where(AssignedMember.id.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
