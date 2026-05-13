import importlib

modules = [
    "app.modules.users.model",
    "app.modules.projects.model",
    "app.modules.tasks.models.task",
    "app.modules.supertasks.model",
    "app.modules.tasks.models.task_content",
]

for module in modules:
    importlib.import_module(module)
