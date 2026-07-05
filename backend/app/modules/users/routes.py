from fastapi import APIRouter, Depends, HTTPException

from app.modules.users.manager import UserManager, get_user_manager
from .services import fastapi_users, current_active_user
from .auth import auth_backend
from .schema import UserCreate, UserResponse, UserUpdate
from .model import User, UserRole

router = APIRouter()


# your own custom routes go here too
@router.get("/users/me/profile")
async def get_my_profile(user: User = Depends(current_active_user)):
    return user


@router.get("/users/by-email/{email}", tags=["users"])
async def get_user_by_email(
    email: str, user_manager: UserManager = Depends(get_user_manager)
):
    user = await user_manager.get_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    return user


@router.get("/users/search_users")
async def get_users_by_email_and_role(
    email: str, role: UserRole, user_manager: UserManager = Depends(get_user_manager)
):
    return await user_manager.search_by_email_and_role(email, role)


# built-in fastapi-users routers
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
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
