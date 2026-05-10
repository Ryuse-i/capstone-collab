from app.core.base_repo import BaseRepo
from app.modules.projects.model import Project
from app.modules.projects.model import ProjectMember


class ProjectRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Project)

    @staticmethod
    async def create_project_member(db, item):
        db_item = ProjectMember(**item.model_dump(exlude_unset=True))

        db.add(db_item)
        db.commit()
        db.refresh()
        return db_item
