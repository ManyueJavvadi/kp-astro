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
import jwt as pyjwt
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
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

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


# JWKS cache. We fetch {SUPABASE_URL}/auth/v1/.well-known/jwks.json via
# httpx (same client we proved works from Railway) and parse into PyJWK
# objects. Keeps the JSON in memory for 1 hour; refetched on miss.
_JWKS_KEYS: dict[str, "pyjwt.PyJWK"] = {}
_JWKS_FETCHED_AT: float = 0.0
_JWKS_TTL_SECONDS = 3600


async def _fetch_jwks(force: bool = False) -> None:
    """Populate _JWKS_KEYS from Supabase. Safe to call on every verify."""
    global _JWKS_FETCHED_AT
    now = time.time()
    if not force and _JWKS_KEYS and (now - _JWKS_FETCHED_AT) < _JWKS_TTL_SECONDS:
        return

    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:  # noqa: BLE001
        # Don't wipe an existing cache if refresh fails; fall back to old keys.
        if _JWKS_KEYS:
            return
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not fetch Supabase JWKS: {e}",
        )

    new_keys: dict[str, "pyjwt.PyJWK"] = {}
    for jwk_dict in data.get("keys", []):
        kid = jwk_dict.get("kid")
        if not kid:
            continue
        try:
            new_keys[kid] = pyjwt.PyJWK(jwk_dict)
        except Exception:  # noqa: BLE001
            continue
    if new_keys:
        _JWKS_KEYS.clear()
        _JWKS_KEYS.update(new_keys)
        _JWKS_FETCHED_AT = now


async def _verify_token_locally(token: str) -> dict:
    """Decode + verify a Supabase JWT without a /auth/v1/user network hop.

    Supabase signs access tokens with either:
      - HS256 using SUPABASE_JWT_SECRET (legacy / default for old projects)
      - ES256 or RS256 using keys served at /auth/v1/.well-known/jwks.json
        (newer projects, including any created after ~late 2025)

    We detect which algorithm the token uses from its unverified header
    and use the right verification path. Both are fully local once the
    JWKS is cached — no per-request Supabase roundtrip.
    """
    try:
        unverified_header = pyjwt.get_unverified_header(token)
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = unverified_header.get("alg", "").upper()

    try:
        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server misconfigured: SUPABASE_JWT_SECRET missing",
                )
            claims = pyjwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["sub", "exp"]},
            )
        elif alg in ("ES256", "RS256"):
            # Fetch the public key for this token's kid from Supabase JWKS.
            kid = unverified_header.get("kid")
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing kid header",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            await _fetch_jwks()
            jwk = _JWKS_KEYS.get(kid)
            if jwk is None:
                # Key rotated? force refresh once.
                await _fetch_jwks(force=True)
                jwk = _JWKS_KEYS.get(kid)
            if jwk is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Unknown signing key (kid={kid})",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            claims = pyjwt.decode(
                token,
                jwk.key,
                algorithms=[alg],
                audience="authenticated",
                options={"require": ["sub", "exp"]},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported JWT algorithm: {alg}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Return payload in the shape the old /auth/v1/user call produced so
    # callers don't have to change.
    return {
        "id": claims["sub"],
        "email": claims.get("email", ""),
        "role": claims.get("role"),
        "app_metadata": claims.get("app_metadata", {}),
        "user_metadata": claims.get("user_metadata", {}),
        "raw_claims": claims,
    }


async def _verify_token_with_supabase(token: str) -> dict:
    """Verify a Supabase JWT — local HS256 decode with 5-min cache."""
    now = time.time()
    cached = _TOKEN_CACHE.get(token)
    if cached and cached[1] > now:
        return cached[0]

    payload = await _verify_token_locally(token)
    _TOKEN_CACHE[token] = (payload, now + _CACHE_TTL_SECONDS)
    return payload


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
