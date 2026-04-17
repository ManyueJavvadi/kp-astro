"""Auth layer — Supabase JWT verification + tenant scoping for FastAPI."""
from app.auth.dependencies import (
    CurrentUser,
    get_current_user,
    get_current_astrologer,
    require_tier,
)

__all__ = [
    "CurrentUser",
    "get_current_user",
    "get_current_astrologer",
    "require_tier",
]
