from fastapi import APIRouter
from app.modules.users.routes import router as users_router
from app.modules.projects.routes import project_router

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(project_router, prefix="/projects")
