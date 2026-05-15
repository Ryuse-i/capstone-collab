from app.core.base_repo import BaseRepo
from .model import RedistributionRecommendation


class RedisRecomRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, RedistributionRecommendation)


