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
from app.modules.resources.schema import ResourceCategory, ResourceResponse
from app.modules.users.model import User, UserRole


class ResourceService:
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
            source_url=resource.source_url,
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
        source_url: str | None,
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

        clean_url = source_url.strip() if source_url and source_url.strip() else None
        if clean_url:
            parsed = urlparse(clean_url)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or len(clean_url) > 2048
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Resource links must be a valid HTTP or HTTPS URL",
                )
        if not clean_url and attachment is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A link or file is required",
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
                source_url=clean_url,
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

        if resource.source_url:
            return resource.source_url
        if resource.file_id is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource file not found")
        return await FileService.get_url(db, resource.file_id)

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