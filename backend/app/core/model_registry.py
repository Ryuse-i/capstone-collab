import importlib

modules = ["app.modules.users.model", "app.modules.projects.model"]

for module in modules:
    importlib.import_module(module)
