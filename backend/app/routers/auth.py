"""Auth router — session introspection endpoints."""
from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Return the authenticated user's profile. Used to validate JWT roundtrip."""
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "tier": user.tier,
    }
