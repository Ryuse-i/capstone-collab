from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.modules.users.manager import UserManager, get_user_manager
from .services import fastapi_users, current_active_user
from .auth import (
    validate_access_token,
    create_access_token,
    create_refresh_token_for_user,
    validate_refresh_token,
    rotate_refresh_token,
    revoke_refresh_tokens_for_user,
)
from .model import User
from app.core.db import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel


class RefreshTokenRequest(BaseModel):
    refresh_token: str


router = APIRouter()


# Custom login endpoint
@router.post("/auth/jwt/login", tags=["auth"])
async def login(
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager: UserManager = Depends(get_user_manager),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Login endpoint that returns access and refresh tokens.
    """
    user = await user_manager.authenticate(credentials)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Create access token
    access_token = await create_access_token(user)

    # Create refresh token
    refresh_token = await create_refresh_token_for_user(str(user.id), db)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# Custom logout endpoint
@router.post("/auth/jwt/logout", tags=["auth"])
async def logout(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Logout endpoint that revokes all refresh tokens for the user.
    """
    await revoke_refresh_tokens_for_user(str(user.id), db)
    return {"detail": "Successfully logged out"}


# Custom profile endpoint (as in original routes.py)
@router.get("/users/me/profile", tags=["users"])
async def get_my_profile(user: User = Depends(current_active_user)):
    return user


# Refresh token endpoint
@router.post("/auth/refresh-token", tags=["auth"])
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Exchange a refresh token for a new access token and a new refresh token (rotation).
    """
    refresh_token = request.refresh_token

    # Validate the refresh token
    token_record = await validate_refresh_token(refresh_token, db)
    if token_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Get the user
    user_id = token_record.user_id
    from .model import User
    from sqlalchemy import select

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Create new access token
    new_access_token = await create_access_token(user)

    # Rotate refresh token: invalidate the old one and create a new one
    new_refresh_token = await rotate_refresh_token(token_record.id, db)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


# Include other FastAPI Users routers (register, users, etc.)
from .schema import UserResponse, UserCreate, UserUpdate

router.include_router(
    fastapi_users.get_register_router(UserResponse, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserResponse, UserUpdate),
    prefix="/users",
    tags=["users"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserResponse),
    prefix="/auth",
    tags=["auth"],
)