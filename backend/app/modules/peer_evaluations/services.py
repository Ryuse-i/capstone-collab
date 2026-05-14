from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.peer_evaluations.model import PeerEvaluation
from app.modules.peer_evaluations.repo import PeerEvaluationRepo
from app.modules.peer_evaluations.schema import PeerEvaluationCreate, PeerEvaluationUpdate


class PeerEvaluationService:
    @staticmethod
    async def get_one_peer_evaluation(db: AsyncSession, peer_evaluation_id):
        repo = PeerEvaluationRepo(db)
        return await repo.get_by_id(peer_evaluation_id)

    @staticmethod
    async def get_all_peer_evaluations(db: AsyncSession):
        repo = PeerEvaluationRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_peer_evaluation(db: AsyncSession, peer_evaluation: PeerEvaluationCreate):
        repo = PeerEvaluationRepo(db)
        return await repo.create(peer_evaluation)

    @staticmethod
    async def update_peer_evaluation(db: AsyncSession, db_item: PeerEvaluationUpdate, peer_evaluation: PeerEvaluationUpdate):
        repo = PeerEvaluationRepo(db)
        return await repo.update(db_item, peer_evaluation)

    @staticmethod
    async def delete_peer_evaluation(db: AsyncSession, db_item: PeerEvaluation):
        repo = PeerEvaluationRepo(db)
        return await repo.delete(db_item)
