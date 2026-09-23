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
from .model import User, UserRole, RefreshToken
from typing import List, Optional
from sqlalchemy import select, func, delete
from uuid import UUID
import secrets
import hashlib
from datetime import datetime, timedelta


class UserDB(SQLAlchemyUserDatabase):
    async def get_by_email(self, email: str) -> User | None:
        return await super().get_by_email(email)

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await super().get(user_id)

    async def search_by_email_and_role(self, email: str, role: UserRole) -> List[User]:
        stmt = select(User).where(
            func.lower(User.email).like(f"%{email.lower()}%"),
            User.role == role,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield UserDB(session, User)


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_SECONDS)


bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


# Helper functions for access token
async def create_access_token(user: User) -> str:
    """Create a JWT access token for the given user."""
    strategy = get_jwt_strategy()
    return await strategy.write_token(user)


async def validate_access_token(token: str) -> Optional[User]:
    """Validate an access token and return the user if valid."""
    strategy = get_jwt_strategy()
    try:
        user = await strategy.read_token(token)
        return user
    except Exception:
        return None


# Refresh token helpers
def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    """Generate a cryptographically secure random refresh token."""
    return secrets.token_urlsafe(32)


async def create_refresh_token_for_user(user_id: str, db: AsyncSession) -> str:
    """Create a new refresh token for the user, store its hash, and return the plain token."""
    refresh_token = generate_refresh_token()
    hashed_token = hash_refresh_token(refresh_token)

    expires_at = datetime.utcnow() + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRE_SECONDS)

    db_refresh = RefreshToken(
        user_id=user_id,
        hashed_token=hashed_token,
        expires_at=expires_at,
    )
    db.add(db_refresh)
    await db.commit()
    await db.refresh(db_refresh)
    return refresh_token


async def validate_refresh_token(token: str, db: AsyncSession) -> Optional[RefreshToken]:
    """Validate a refresh token and return the token record if valid and not expired/revoked."""
    hashed_token = hash_refresh_token(token)

    # Find the token by hash
    query = select(RefreshToken).where(RefreshToken.hashed_token == hashed_token)
    result = await db.execute(query)
    db_token = result.scalar_one_or_none()

    if not db_token:
        return None

    # Check if expired
    if db_token.expires_at < datetime.utcnow():
        return None

    # Check if revoked (we don't have a revoked field; we assume token is valid if not expired and not replaced)
    # For simplicity, we consider a token valid if it's not expired and not replaced by a newer token.
    # If replaced_by is set, this token has been rotated and should not be used.
    if db_token.replaced_by is not None:
        return None

    return db_token


async def rotate_refresh_token(old_token_id: int, db: AsyncSession) -> str:
    """Rotate a refresh token: invalidate the old one and create a new one for the same user.
    Returns the new plain refresh token.
    """
    # Get the old token
    query = select(RefreshToken).where(RefreshToken.id == old_token_id)
    result = await db.execute(query)
    old_token = result.scalar_one_or_none()

    if not old_token:
        raise ValueError("Refresh token not found")

    # Mark the old token as replaced by setting replaced_by to a new token we'll create
    # Actually, we'll create a new token and set old_token.replaced_by = new_token.id
    new_plain_token = generate_refresh_token()
    new_hashed = hash_refresh_token(new_plain_token)
    new_expires = datetime.utcnow() + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRE_SECONDS)

    new_token = RefreshToken(
        user_id=old_token.user_id,
        hashed_token=new_hashed,
        expires_at=new_expires,
        replaced_by=None,  # will be set when this token is rotated
    )
    db.add(new_token)
    await db.flush()  # to get the new token's id

    # Now set the old token's replaced_by to the new token's id
    old_token.replaced_by = new_token.id

    await db.commit()
    await db.refresh(new_token)
    return new_plain_token


async def revoke_refresh_tokens_for_user(user_id: str, db: AsyncSession) -> None:
    """Revoke all refresh tokens for a user (e.g., on logout)."""
    # We can delete them or mark them as revoked. For simplicity, delete.
    stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
    await db.execute(stmt)
    await db.commit()