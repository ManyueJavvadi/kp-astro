"""Supabase JWT verification (Phase 1, ADR-002).

How Supabase auth works for us:
  1. Frontend calls supabase.auth.signInWithPassword(...) → gets JWT
  2. Frontend sets `Authorization: Bearer <jwt>` on every backend request
  3. Backend verifies the JWT signature + claims, extracts user id
  4. Backend looks up the corresponding Astrologer row by sub claim

JWT verification details:
  - Algorithm: HS256 (Supabase uses a project-shared secret, NOT RSA)
  - Secret: SUPABASE_JWT_SECRET env var
  - Required claims: sub (user UUID), iss (matches our SUPABASE_JWT_ISSUER),
    exp (not expired), aud (typically "authenticated")
  - We do NOT call Supabase's API per request — verification is
    cryptographic + offline. Saves ~100ms RTT per request.

Why HS256 + secret instead of RS256 + JWKS:
  Supabase signs project JWTs with the project's shared secret. There's
  no public/private split, no JWKS endpoint to fetch. HS256 is the
  expected algorithm for Supabase Auth tokens; RS256 is reserved for
  Supabase Admin / service_role tokens (not what users get).
"""

from __future__ import annotations

import logging
from typing import Annotated, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.config import Settings, get_settings

_log = logging.getLogger("kp_astro.auth")


class SupabaseJWTPayload(BaseModel):
    """Decoded Supabase JWT claims.

    Forward-compatible: Pydantic ignores unknown claims so when Supabase
    adds new ones (or our extensions add custom claims), we don't break.
    """

    model_config = ConfigDict(extra="ignore")

    # ─── Standard JWT claims ──────────────────────────────────────────
    sub: str  # User UUID (Supabase auth.users.id)
    iss: str  # Issuer, e.g. https://xxxx.supabase.co/auth/v1
    aud: Optional[str] = None  # Typically "authenticated"
    exp: int  # Expiry (unix ts)
    iat: Optional[int] = None  # Issued at
    role: Optional[str] = None  # "authenticated" for real users

    # ─── Supabase-injected user metadata ──────────────────────────────
    # `email` is on every Supabase auth user. We need it to populate
    # Astrologer.email on first-touch row creation.
    email: Optional[str] = None
    phone: Optional[str] = None

    # User-supplied metadata (passed via signup options.data); useful
    # for capturing display_name at signup time.
    user_metadata: Optional[dict] = None
    app_metadata: Optional[dict] = None


def _extract_bearer_token(authorization: Optional[str]) -> str:
    """Pull the JWT out of `Authorization: Bearer <jwt>`.

    Raises 401 if missing or malformed. Keep this strict — silently
    falling back to anonymous would mask client bugs.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_authorization_header"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "malformed_authorization_header"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return parts[1].strip()


async def verify_supabase_jwt(
    authorization: Annotated[Optional[str], Header()] = None,
    settings: Settings = Depends(get_settings),
) -> SupabaseJWTPayload:
    """FastAPI dependency: validate the Authorization header's JWT.

    Returns the decoded payload on success. Raises:
      401 missing_authorization_header   — header absent
      401 malformed_authorization_header — present but not "Bearer <x>"
      503 auth_not_configured            — backend has no JWT secret yet
      401 invalid_token                  — signature/claims invalid
      401 token_expired                  — exp in the past

    Use as a route dependency:
        @router.get("/me")
        async def me(jwt: SupabaseJWTPayload = Depends(verify_supabase_jwt)):
            ...
    """
    token = _extract_bearer_token(authorization)

    if not settings.auth_configured:
        # The backend hasn't been wired up to Supabase yet (env vars
        # missing). Return 503 so the frontend treats it as a server
        # config issue, not a bad credential.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "auth_not_configured",
                "hint": "SUPABASE_URL + SUPABASE_JWT_SECRET must be set "
                "on the backend.",
            },
        )

    try:
        decoded = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            # Supabase JWTs always set audience to "authenticated" for
            # user-tier tokens. If we ever issue service-role tokens
            # (which use a different audience), they should NOT reach
            # these user endpoints — narrow validation here is a security
            # property.
            audience="authenticated",
            issuer=settings.SUPABASE_JWT_ISSUER,
            options={
                "require": ["sub", "exp", "iat", "iss", "aud"],
            },
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_issuer"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_audience"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        _log.warning("jwt_invalid kind=%s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = SupabaseJWTPayload(**decoded)
    except Exception as e:
        _log.warning("jwt_payload_unparseable err=%s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unparseable_token_payload"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
