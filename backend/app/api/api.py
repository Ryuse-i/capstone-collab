from fastapi import APIRouter
from app.modules.users.routes import router as users_router
from app.modules.projects.routes import project_router, project_member_router
from app.modules.tasks.routes.task import task_router
from app.modules.supertasks.routes import supertask_router
from app.modules.tasks.routes.task_content import task_content_router

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(project_router, prefix="/projects")
api_router.include_router(project_member_router, prefix="/project_members")
api_router.include_router(task_router, prefix="/tasks")
api_router.include_router(supertask_router, prefix="/supertasks")
api_router.include_router(task_content_router, prefix="/task_contents")
