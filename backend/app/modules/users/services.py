import uuid
from fastapi import Depends, HTTPException, status
from fastapi_users import FastAPIUsers
from .model import User, UserRole
from .auth import auth_backend
from .manager import get_user_manager

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)


async def current_active_user(user: User = Depends(fastapi_users.current_user(active=True))) -> User:
    """Ensure the current user is active and not soft-deleted."""
    if not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    return user


async def require_admin(user: User = Depends(current_active_user)) -> User:
    """Guard admin-only endpoints."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user