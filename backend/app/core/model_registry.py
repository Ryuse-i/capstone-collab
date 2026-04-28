import importlib

modules = ["app.modules.users.model"]

for module in modules:
    importlib.import_module(module)
