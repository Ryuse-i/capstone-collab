import importlib

modules = [
    "app.modules.users.model",
    "app.modules.projects.model",
    "app.modules.project_members.model",
    "app.modules.project_snapshots.model",
    "app.modules.supertasks.model",
    "app.modules.task_contents.model",
    "app.modules.assigned_members.model",
    "app.modules.peer_evaluations.model",
    "app.modules.task_comments.model",
    "app.modules.task_relations.model",
    "app.modules.task_submissions.model",
    "app.modules.task_tags.model",
    "app.modules.tasks.model",
    "app.modules.redistribution_recommendations.model",
    "app.modules.member_snapshots.model",
    "app.modules.member_activities.model",
    "app.modules.notifications.model",
    "app.modules.invitations.model",
    "app.modules.meetings.model",
]


#    "app.modules.users.model",
#   "app.modules.projects.model",
#   "app.modules.project_members.model",
#   "app.modules.project_snapshots.model",
#   "app.modules.supertasks.model",
#   "app.modules.task_contents.model",
#   "app.modules.assigned_members.model",
#   "app.modules.peer_evaluations.model",
#   "app.modules.task_comments.model",
#   "app.modules.task_relations.model",
#   "app.modules.task_submissions.model",
#   "app.modules.task_tags.model",
#   "app.modules.tasks.model",
#   "app.modules.redistribution_recommendations.model",
#   "app.modules.member_snapshots.model",
#   "app.modules.member_activities.model",
#   "app.modules.notifications.model",

for module in modules:
    importlib.import_module(module)
