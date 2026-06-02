"""get_current_astrologer dependency — JWT → DB row resolution.

The next layer above `verify_supabase_jwt`. It:
  1. Verifies the JWT (delegates to verify_supabase_jwt)
  2. Looks up the Astrologer row by sub claim
  3. Creates the row on first request (lazy provision) if missing
  4. Returns the live SQLAlchemy Astrologer instance

Why lazy provision (not signup → create-row at signup time):
  - Signup happens 100% on Supabase. Our backend isn't in the loop.
  - First time the user hits an authenticated endpoint, we get a valid
    JWT for a user we've never seen. Create the row then.
  - Avoids a "user signed up but row missing" race condition forever.
  - Also enables future imports (e.g., bulk-add astrologers via
    Supabase Auth dashboard → they all just work on first login).
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase_jwt import SupabaseJWTPayload, verify_supabase_jwt
from app.config import Settings, get_settings
from app.db import get_db
from app.db.models import Astrologer

_log = logging.getLogger("kp_astro.auth")


async def get_current_astrologer(
    jwt_payload: SupabaseJWTPayload = Depends(verify_supabase_jwt),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Astrologer:
    """Return the Astrologer row for the authenticated user, creating
    it on first request.

    Raises:
      503 db_not_configured — DATABASE_URL not set (degrades cleanly
                              instead of crashing with cryptic SQLAlchemy)
      401 invalid_user      — JWT decoded but sub isn't a valid UUID
      500 user_lookup_failed — DB error during lookup or insert
    """
    if not settings.database_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "db_not_configured",
                "hint": "DATABASE_URL is not set on the backend. "
                "Auth-gated endpoints can't run without DB.",
            },
        )

    # Parse sub as UUID — Supabase user IDs are always UUIDs.
    try:
        supabase_user_id = uuid.UUID(jwt_payload.sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_user_id_in_token"},
        )

    # Try lookup first.
    stmt = select(Astrologer).where(
        Astrologer.supabase_user_id == supabase_user_id
    )
    result = await db.execute(stmt)
    astrologer = result.scalar_one_or_none()

    if astrologer is not None:
        return astrologer

    # First-touch provision. We require the email from the JWT — it's
    # always present on Supabase auth users. If somehow absent, fail
    # explicitly rather than insert a row with NULL email.
    if not jwt_payload.email:
        _log.warning(
            "first_touch_no_email sub=%s — Supabase JWT missing email "
            "claim. Cannot provision Astrologer row.",
            jwt_payload.sub,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_missing_email"},
        )

    # Optional display name from user_metadata (signup form's "name" field).
    display_name = None
    if jwt_payload.user_metadata:
        display_name = (
            jwt_payload.user_metadata.get("display_name")
            or jwt_payload.user_metadata.get("name")
        )

    astrologer = Astrologer(
        supabase_user_id=supabase_user_id,
        email=jwt_payload.email,
        display_name=display_name,
    )
    db.add(astrologer)
    try:
        await db.flush()  # get the id without committing yet
    except Exception as e:
        # Most likely: email already exists for a different sub (e.g.,
        # the user deleted + recreated their Supabase auth account).
        # Surface clearly so the user can be merged manually rather than
        # silently masked.
        _log.exception(
            "astrologer_provision_failed sub=%s email=%s err=%s",
            jwt_payload.sub, jwt_payload.email, e,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "astrologer_provision_failed",
                "hint": "Email may already be linked to a different "
                "Supabase user. Contact support.",
            },
        )

    _log.info(
        "astrologer_provisioned id=%s email=%s",
        astrologer.id, astrologer.email,
    )
    return astrologer


# Convenience type alias for route handlers.
CurrentAstrologer = Annotated[Astrologer, Depends(get_current_astrologer)]
