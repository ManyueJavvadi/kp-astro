"""Auth package (Phase 1, ADR-002) — Supabase JWT verification.

Public surface:
    from app.auth import verify_supabase_jwt, get_current_astrologer

    verify_supabase_jwt    — FastAPI dep, decodes + validates the bearer
                              token. Returns SupabaseJWTPayload.
    get_current_astrologer — Higher-level dep: looks up the Astrologer
                              row by the JWT's sub claim. Auto-creates
                              the row on first request (lazy provision).
"""

from app.auth.supabase_jwt import (
    SupabaseJWTPayload,
    verify_supabase_jwt,
)
from app.auth.current_user import CurrentAstrologer, get_current_astrologer

__all__ = [
    "SupabaseJWTPayload",
    "verify_supabase_jwt",
    "get_current_astrologer",
    "CurrentAstrologer",
]
