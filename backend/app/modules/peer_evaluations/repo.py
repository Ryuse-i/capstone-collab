from app.core.base_repo import BaseRepo
from app.modules.peer_evaluations.model import PeerEvaluation


class PeerEvaluationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, PeerEvaluation)
