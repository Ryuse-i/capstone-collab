from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.projects.schema import ProjectCreate, ProjectUpdate
from app.modules.projects.services import ProjectService
from uuid import UUID

router = APIRouter()


@router.get("/")
async def get_all(db: AsyncSession = Depends(get_async_session)):
    return await ProjectService.get_all_projects(db)


@router.get("/{project_id}")
async def get_one_project(
    project_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectService.get_one_project(db, project_id)
    if not db_item:
        # This is what makes your test pass 'assert verify_res.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


@router.post("/")
async def create_project(
    project: ProjectCreate, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectService.create_project(db, project)


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    return await ProjectService.update_project(db, db_item, project)


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,  # Ensure this matches your ID type (UUID)
    db: AsyncSession = Depends(get_async_session),
):
    # 1. Fetch the item
    db_item = await ProjectService.get_one_project(db, project_id)

    # 2. Check if it exists before trying to delete
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # 3. Perform the delete and AWAIT it
    return await ProjectService.delete_project(db, db_item)
