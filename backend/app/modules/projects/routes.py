from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.projects.schema import ProjectCreate, ProjectUpdate
from app.modules.projects.services import ProjectService

router = APIRouter()


@router.get("/")
async def get_all(db: AsyncSession = Depends(get_async_session)):
    return await ProjectService.get_all_projects(db)


@router.get("/{project_id}")
async def get_one_project(
    project_id: int, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectService.get_one_project(db, project_id)


@router.post("/")
async def create_project(
    project: ProjectCreate, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectService.create_project(db, project)


@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    project: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    return ProjectService.update_project(db, db_item, project)


@router.delete("/{project_id}")
async def delete_project(
    project_id: int, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectService.get_one_project(db, project_id)
    return await ProjectService.delete_project(db, db_item)
