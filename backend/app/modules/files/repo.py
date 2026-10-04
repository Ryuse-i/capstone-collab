from app.core.base_repo import BaseRepo
from app.modules.files.model import StoredFile


class FileRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, StoredFile)