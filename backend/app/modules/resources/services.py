from __future__ import annotations

from urllib.parse import urlparse
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.files.services import FileService
from app.modules.project_members.model import ProjectMember, ProjectRole
from app.modules.projects.model import Project
from app.modules.resources.model import Resource
from app.modules.resources.repo import ResourceRepo
from app.modules.resources.schema import ResourceCategory, ResourceResponse, ResourceUpdate
from app.modules.users.model import User, UserRole


class ResourceService:
    @staticmethod
    async def get_resource(db: AsyncSession, resource_id: UUID):
        repo = ResourceRepo(db)
        return await repo.get_by_id(resource_id)

    @staticmethod
    async def _get_accessible_project(
        db: AsyncSession, project_id: UUID, user: User
    ) -> Project:
        project = await db.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if user.role == UserRole.ADMIN or user.id in {
            project.created_by,
            project.instructor,
            project.advisor,
        }:
            return project

        member_id = await db.scalar(
            select(ProjectMember.id)
            .where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
            )
            .limit(1)
        )
        if member_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project access required")
        return project

    @staticmethod
    def _response(resource: Resource) -> ResourceResponse:
        return ResourceResponse(
            id=resource.id,
            project_id=resource.project_id,
            created_by=resource.created_by,
            title=resource.title,
            category=resource.category,
            description=resource.description,
            file=resource.file,
            creator=resource.creator,
            pinned=resource.pinned,
            uses=resource.uses,
            created_at=resource.created_at,
            updated_at=resource.updated_at,
        )

    @staticmethod
    async def list_for_project(
        db: AsyncSession, project_id: UUID, user: User
    ) -> list[ResourceResponse]:
        await ResourceService._get_accessible_project(db, project_id, user)
        resources = await ResourceRepo(db).get_by_project(project_id)
        return [ResourceService._response(item) for item in resources]

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        project_id: UUID,
        user: User,
        title: str,
        category: ResourceCategory,
        description: str,
        attachment: UploadFile | None,
    ) -> ResourceResponse:
        await ResourceService._get_accessible_project(db, project_id, user)

        title = title.strip()
        description = description.strip()
        if not title or not description:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Title and description are required",
            )

        stored_file = None
        if attachment is not None:
            stored_file = await FileService.upload(
                db, attachment, purpose="resource", uploaded_by=user.id
            )

        try:
            resource = Resource(
                project_id=project_id,
                created_by=user.id,
                file_id=stored_file.id if stored_file else None,
                title=title,
                category=category,
                description=description,
            )
            db.add(resource)
            await db.flush()
            resource = await ResourceRepo(db).get_by_id_with_relations(resource.id)
            return ResourceService._response(resource)
        except Exception:
            if stored_file is not None:
                await FileService.remove_object(stored_file.key)
            raise

    @staticmethod
    async def open_resource(
        db: AsyncSession, resource_id: UUID, user: User
    ) -> str:
        resource = await ResourceRepo(db).get_by_id_with_relations(resource_id)
        if resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
        await ResourceService._get_accessible_project(db, resource.project_id, user)

        # Atomic increment; keep updated_at so opening doesn't reorder the list
        await db.execute(
            update(Resource)
            .where(Resource.id == resource.id)
            .values(uses=Resource.uses + 1, updated_at=Resource.updated_at)
        )
        await db.flush()

        # Return first link URL if available
        if resource.links:
            # Sort by created_at to get the first created link
            sorted_links = sorted(resource.links, key=lambda l: l.created_at)
            return sorted_links[0].url

        # Fall back to file if available
        if resource.file_id is not None:
            return await FileService.get_url(db, resource.file_id)

        # If neither links nor file, resource has no accessible content
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource has no accessible content (no links or file)",
        )

    @staticmethod
    async def update(
        db: AsyncSession,
        resource_id: UUID,
        user: User,
        *,
        title: str | None = None,
        category: ResourceCategory | None = None,
        description: str | None = None,
        pinned: bool | None = None,
    ) -> ResourceResponse:
        resource = await ResourceRepo(db).get_by_id_with_relations(resource_id)
        if resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
        project = await ResourceService._get_accessible_project(db, resource.project_id, user)

        is_project_manager = user.role == UserRole.ADMIN or user.id in {
            project.created_by, project.instructor, project.advisor,
        }
        if resource.created_by != user.id and not is_project_manager:
            member = await db.scalar(
                select(ProjectMember)
                .where(ProjectMember.project_id == project.id, ProjectMember.user_id == user.id)
                .limit(1)
            )
            is_project_manager = member is not None and member.project_role in {
                ProjectRole.LEADER, ProjectRole.INSTRUCTOR, ProjectRole.ADVISOR,
            }
        if resource.created_by != user.id and not is_project_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the resource owner or project managers can edit it",
            )

        if title is not None:
            title = title.strip()
            if not title:
                raise HTTPException(status_code=422, detail="Title cannot be empty")
            resource.title = title
        if description is not None:
            description = description.strip()
            if not description:
                raise HTTPException(status_code=422, detail="Description cannot be empty")
            resource.description = description
        if category is not None:
            resource.category = category
        if pinned is not None:
            resource.pinned = pinned

        await db.flush()
        await db.refresh(resource)
        resource = await ResourceRepo(db).get_by_id_with_relations(resource.id)
        return ResourceService._response(resource)

    @staticmethod
    async def delete(db: AsyncSession, resource_id: UUID, user: User) -> None:
        resource = await ResourceRepo(db).get_by_id_with_relations(resource_id)
        if resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
        project = await ResourceService._get_accessible_project(db, resource.project_id, user)
        is_project_manager = user.role == UserRole.ADMIN or user.id in {
            project.created_by,
            project.instructor,
            project.advisor,
        }
        if resource.created_by != user.id and not is_project_manager:
            member = await db.scalar(
                select(ProjectMember)
                .where(
                    ProjectMember.project_id == project.id,
                    ProjectMember.user_id == user.id,
                )
                .limit(1)
            )
            is_project_manager = member is not None and member.project_role in {
                ProjectRole.LEADER,
                ProjectRole.INSTRUCTOR,
                ProjectRole.ADVISOR,
            }
        if resource.created_by != user.id and not is_project_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the resource owner or project managers can delete it",
            )

        file_id = resource.file_id
        await db.delete(resource)   # resource row first
        await db.flush()
        if file_id is not None:
            await FileService.delete(db, file_id)  # then file row, then storage object