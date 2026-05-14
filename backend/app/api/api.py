from fastapi import APIRouter
from app.modules.users.routes import router as users_router
from app.modules.projects.routes import project_router, project_member_router
from app.modules.tasks.routes import task_router
from app.modules.supertasks.routes import supertask_router
from app.modules.task_contents.routes import task_content_router
from app.modules.assigned_members.routes import assigned_member_router
from app.modules.peer_evaluations.routes import peer_evaluation_router
from app.modules.task_comments.routes import task_comment_router
from app.modules.task_relations.routes import task_relation_router
from app.modules.task_submissions.routes import task_submission_router
from app.modules.task_tags.routes import tag_router, task_tag_router

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(project_router, prefix="/projects")
api_router.include_router(project_member_router, prefix="/project_members")
api_router.include_router(task_router, prefix="/tasks")
api_router.include_router(supertask_router, prefix="/supertasks")
api_router.include_router(task_content_router, prefix="/task_contents")
api_router.include_router(assigned_member_router, prefix="/assigned_members")
api_router.include_router(peer_evaluation_router, prefix="/peer_evaluations")
api_router.include_router(task_comment_router, prefix="/task_comments")
api_router.include_router(task_relation_router, prefix="/task_relations")
api_router.include_router(task_submission_router, prefix="/task_submissions")
api_router.include_router(tag_router, prefix="/tags")
api_router.include_router(task_tag_router, prefix="/task_tags")
