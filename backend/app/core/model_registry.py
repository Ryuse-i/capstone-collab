import importlib

modules = [
    "app.modules.users.model",
    "app.modules.projects.model",
    "app.modules.project_members.model",
    "app.modules.supertasks.model",
    "app.modules.task_contents.model",
    "app.modules.assigned_members.model",
    "app.modules.peer_evaluations.model",
    "app.modules.task_comments.model",
    "app.modules.task_relations.model",
    "app.modules.task_submissions.model",
    "app.modules.task_tags.model",
    "app.modules.redistribution_recommendations.model"
]

for module in modules:
    importlib.import_module(module)
