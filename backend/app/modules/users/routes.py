from fastapi import APIRouter, Depends
from .services import fastapi_users, current_active_user
from .auth import auth_backend
from .schema import UserCreate, UserRead, UserUpdate
from .model import User

router = APIRouter()

# built-in fastapi-users routers
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


# your own custom routes go here too
@router.get("/users/me/profile")
async def get_my_profile(user: User = Depends(current_active_user)):
    return user
