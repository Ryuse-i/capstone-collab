from fastapi import Depends
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users.db import SQLAlchemyUserDatabase
from app.core.db import get_async_session
from app.core.config import settings
from .model import User, UserRole
from typing import List
from sqlalchemy import select, func


class UserDB(SQLAlchemyUserDatabase):
    async def get_by_email(self, email: str) -> User | None:
        return await super().get_by_email(email)

    async def search_by_email_and_role(self, email: str, role: UserRole) -> List[User]:
        stmt = select(User).where(
            func.lower(User.email).like(f"%{email.lower()}%"),
            User.role == role,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield UserDB(session, User)


bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)
