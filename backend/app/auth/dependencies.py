"""FastAPI auth dependencies.

Validates Supabase JWTs by calling Supabase's /auth/v1/user endpoint with the
Bearer token. Valid → returns user info. Invalid → 401.

Caches validated tokens for 5 minutes to avoid a roundtrip per request.
"""
from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models.profile import Profile

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get(
    "SUPABASE_ANON_KEY", ""
)

# In-memory cache: token -> (user_payload, expiry_ts)
# For multi-worker deployments, switch to Redis.
_TOKEN_CACHE: dict[str, tuple[dict, float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


@dataclass
class CurrentUser:
    """Minimal authenticated user info from Supabase JWT."""

    id: uuid.UUID
    email: str
    role: str  # consumer | astrologer | admin (from profiles)
    tier: str  # free | consumer_pro | astrologer_pro | team
    full_name: Optional[str] = None
    raw_auth: dict | None = None  # full Supabase user payload for advanced use


async def _verify_token_with_supabase(token: str) -> dict:
    """Hit Supabase auth to verify + decode the JWT. Cached 5 minutes."""
    now = time.time()
    cached = _TOKEN_CACHE.get(token)
    if cached and cached[1] > now:
        return cached[0]

    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_PUBLISHABLE_KEY,
            },
        )
        if r.status_code == 200:
            payload = r.json()
            _TOKEN_CACHE[token] = (payload, now + _CACHE_TTL_SECONDS)
            return payload
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Parse Bearer token, verify with Supabase, load profile, return user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:].strip()
    supabase_user = await _verify_token_with_supabase(token)

    user_id = uuid.UUID(supabase_user["id"])
    email = supabase_user.get("email", "")

    # Teach Postgres RLS who the current user is. Supabase RLS policies
    # reference auth.uid() which reads request.jwt.claim.sub. Our backend
    # connects directly to Postgres (not via PostgREST), so we need to
    # inject the claim manually — otherwise every RLS check returns NULL
    # = NULL = false, producing "permission denied" → 500s / empty rows.
    #
    # is_local=false sets it for the whole database session (connection),
    # so subsequent queries in this request all see it.
    await db.execute(
        text("SELECT set_config('request.jwt.claim.sub', :sub, false)"),
        {"sub": str(user_id)},
    )

    # Load profile (the trigger created it on signup)
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()

    if profile is None:
        # Extremely rare race: token validated but profile row not yet created.
        # Could happen if the on-signup trigger is disabled or delayed.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete signup.",
        )

    return CurrentUser(
        id=user_id,
        email=email,
        role=profile.role,
        tier=profile.tier,
        full_name=profile.full_name,
        raw_auth=supabase_user,
    )


async def get_current_astrologer(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Only astrologer-role users may pass."""
    if user.role != "astrologer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Astrologer role required",
        )
    return user


def require_tier(*allowed_tiers: str):
    """Factory for a tier-gating dependency. Use as Depends(require_tier('consumer_pro','astrologer_pro','team'))."""

    async def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.tier not in allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires tier one of: {', '.join(allowed_tiers)}",
            )
        return user

    return _check
