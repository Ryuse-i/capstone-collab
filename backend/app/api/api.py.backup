from fastapi import APIRouter
from app.modules.users.routes import router as users_router
from app.modules.admin.routes import admin_router
from app.modules.projects.routes import project_router
from app.modules.project_members.routes import project_member_router
from app.modules.tasks.routes import task_router
from app.modules.supertasks.routes import supertask_router
from app.modules.task_attachments.routes import task_attachment_router
from app.modules.assigned_members.routes import assigned_member_router
from app.modules.assigned_reviewer.routes import assigned_reviewer_router
from app.modules.peer_evaluations.routes import peer_evaluation_router
from app.modules.papers.routes import papers_router
from app.modules.task_comments.routes import task_comment_router
from app.modules.task_relations.routes import task_relation_router
from app.modules.task_submissions.routes import task_submission_router
from app.modules.task_tags.routes import tag_router, task_tag_router
from app.modules.member_snapshots.routes import member_snapshot_route
from app.modules.member_activities.routes import member_activity_route
from app.modules.redistribution_recommendations.routes import recommendation_route
from app.modules.project_snapshots.routes import project_snapshot_router
from app.modules.notifications.routes import notification_router
from app.modules.invitations.route import project_invitation_router
from app.modules.meetings.routes import meeting_router
from app.modules.messages.routes import message_router
from app.modules.files.routes import files_router
from app.modules.task_links.routes import task_link_router 
from app.modules.resources.routes import resources_router


api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(admin_router)
api_router.include_router(resources_router, prefix="/resources", tags=["resources"])
api_router.include_router(project_router, prefix="/projects", tags=["project"])
api_router.include_router(
    project_member_router, prefix="/project_members", tags=["project_member"]
)
api_router.include_router(task_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(supertask_router, prefix="/supertasks", tags=["supertasks"])
api_router.include_router(
    task_attachment_router, prefix="/task_attachments", tags=["task_attachments"]
)
api_router.include_router(
    assigned_member_router, prefix="/assigned_members", tags=["assigned_members"]
)
api_router.include_router(
    assigned_reviewer_router, prefix="/assigned_reviewer", tags=["assigned_reviewer"])
api_router.include_router(
    peer_evaluation_router, prefix="/peer_evaluations", tags=["peer_evaluations"]
)
api_router.include_router(
    papers_router, prefix="/papers", tags=["papers"]
)
api_router.include_router(
    task_comment_router, prefix="/task_comments", tags=["task_comments"]
)
api_router.include_router(
    task_relation_router, prefix="/task_relations", tags=["task_relations"]
)
api_router.include_router(
    task_submission_router, prefix="/task_submissions", tags=["task_submissions"]
)
api_router.include_router(tag_router, prefix="/tags", tags=["tags"])
api_router.include_router(task_tag_router, prefix="/task_tags", tags=["task_tags"])
api_router.include_router(
    member_snapshot_route, prefix="/member_snapshots", tags=["member_snapshots"]
)
api_router.include_router(
    member_activity_route, prefix="/member_activities", tags=["member_activity"]
)
api_router.include_router(
    recommendation_route, prefix="/recommendations", tags=["recommendations"]
)
api_router.include_router(
    project_snapshot_router, prefix="/project_snapshots", tags=["project_snapshots"]
)
api_router.include_router(
    notification_router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(
    project_invitation_router, prefix="/invitations", tags=["invitations"]
)
api_router.include_router(meeting_router, prefix="/meetings", tags=["meetings"])
api_router.include_router(message_router, prefix="/messages", tags=["messages"])
api_router.include_router(files_router, prefix="/files", tags=["files"])
api_router.include_router(task_link_router, prefix="/task_links", tags=["task_links"])
