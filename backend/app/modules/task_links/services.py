from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_links.repo import TaskLinkRepo
from app.modules.task_links.schema import (
    TaskLinkCreate,
    TaskLinkInsert,
    TaskLinkUpdate,
)
from app.modules.tasks.services import TaskService


class TaskLinkService:
    @staticmethod
    async def add(
        db: AsyncSession, task_id: UUID, data: TaskLinkCreate, user_id: UUID
    ):
        task = await TaskService.get_one_task(db, task_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

        repo = TaskLinkRepo(db)
        created = await repo.create(
            TaskLinkInsert(
                task_id=task_id,
                created_by=user_id,
                url=data.url,
                title=data.title,
            )
        )
        return await repo.get_with_creator(created.id)

    @staticmethod
    async def get_by_task(db: AsyncSession, task_id: UUID):
        repo = TaskLinkRepo(db)
        return await repo.get_by_task(task_id)

    @staticmethod
    async def _get_owned(repo: TaskLinkRepo, link_id: UUID, user_id: UUID):
        """Fetch a link and make sure the current user is the one who added it."""
        link = await repo.get_by_id(link_id)
        if not link:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
        if link.created_by != user_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Only the user who added this link can modify it"
            )
        return link

    @staticmethod
    async def update(
        db: AsyncSession, link_id: UUID, data: TaskLinkUpdate, user_id: UUID
    ):
        repo = TaskLinkRepo(db)
        link = await TaskLinkService._get_owned(repo, link_id, user_id)
        await repo.update(link, data)
        return await repo.get_with_creator(link_id)

    @staticmethod
    async def delete(db: AsyncSession, link_id: UUID, user_id: UUID):
        repo = TaskLinkRepo(db)
        link = await TaskLinkService._get_owned(repo, link_id, user_id)
        return await repo.delete(link)