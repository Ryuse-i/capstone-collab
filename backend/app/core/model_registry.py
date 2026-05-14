import importlib

modules = [
    "app.modules.users.model",
    "app.modules.projects.model",
    "app.modules.tasks.model",
    "app.modules.supertasks.model",
    "app.modules.task_contents.model",
    "app.modules.assigned_members.model",
    "app.modules.peer_evaluations.model",
    "app.modules.task_comments.model",
    "app.modules.task_relations.model",
    "app.modules.task_submissions.model",
    "app.modules.task_tags.model",
]

for module in modules:
    importlib.import_module(module)
