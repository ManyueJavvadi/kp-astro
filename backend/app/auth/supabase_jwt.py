"""Supabase JWT verification (Phase 1, ADR-002).

Supports BOTH Supabase signing systems:

  1. JWT Signing Keys (new, asymmetric — default for projects created
     after Supabase's 2025 migration). JWTs are signed with RS256 or
     ES256. We verify against the project's public JWKS endpoint at
     `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Public keys are
     cached per process — one network fetch per process, not per request.

  2. Legacy JWT Secret (old, symmetric HS256). JWTs are signed with the
     project's shared HMAC secret (env var SUPABASE_JWT_SECRET). Used by
     older projects + still available on new projects as the "Legacy JWT
     Secret" for backwards compatibility.

The flow decides per-token at verification time by reading the JWT
header's `alg` field — no env-var toggle required. Both flows go through
the same `verify_supabase_jwt` dependency and produce identical
SupabaseJWTPayload responses.

Why support both:
  - New projects (post-2025 migration) — only have JWT Signing Keys
    active; HS256 wouldn't work
  - Old projects — only have the legacy HS256 secret; no JWKS endpoint
  - Projects mid-migration — may issue either
  Auto-detection insulates us from the choice forever.

Performance:
  - HS256: zero network calls; pure crypto from the in-memory secret
  - RS256/ES256: one JWKS fetch per process lifetime (cached), then
    pure crypto per request. Adds ~50ms to FIRST authenticated request
    after each cold start; 0ms after that.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Annotated, Any, Optional

import jwt
from jwt import PyJWKClient
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


# ─── JWKS client (cached) ─────────────────────────────────────────────


@lru_cache(maxsize=4)
def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Build (or return cached) a PyJWKClient for the given JWKS URL.

    PyJWKClient itself caches the fetched keys for `lifespan` seconds.
    We additionally cache the client itself per-URL via lru_cache so the
    same JWKS instance is reused — important because each PyJWKClient
    has its own thread-safe internal cache and we don't want N copies.

    `lifespan=3600` means keys are refetched at most once per hour. This
    is a balance between catching Supabase key rotations promptly and
    avoiding too many JWKS HTTP calls.
    """
    return PyJWKClient(
        jwks_url,
        cache_keys=True,
        lifespan=3600,
        # cache_jwk_set defaults to True; explicit for clarity:
        cache_jwk_set=True,
        # max_cached_keys defaults to 16; plenty for a single Supabase
        # project (it typically rotates 2-3 active signing keys at most).
    )


def _jwks_url(supabase_url: str) -> str:
    """Construct the Supabase JWKS endpoint URL.

    Format: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    """
    return supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"


# ─── Bearer token extraction ──────────────────────────────────────────


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


# ─── Algorithm-aware decode ───────────────────────────────────────────


# Algorithms we accept. RS256/ES256 = JWT Signing Keys (new, asymmetric).
# HS256 = Legacy JWT Secret (old, symmetric). Anything else is rejected.
_ACCEPTED_ASYMMETRIC = {"RS256", "ES256", "RS384", "RS512", "ES384", "ES512"}
_ACCEPTED_SYMMETRIC = {"HS256", "HS384", "HS512"}


def _decode_with_correct_algorithm(
    token: str,
    settings: Settings,
) -> dict[str, Any]:
    """Decode + verify a JWT, choosing the verification method by alg.

    Reads the JWT's `alg` header without verifying signatures (safe —
    we only use it to pick the verifier), then:
      - RS256/ES256 → fetch public key from Supabase JWKS, verify
      - HS256       → use SUPABASE_JWT_SECRET, verify

    Common decode kwargs (audience/issuer/required claims) apply to both.
    Raises jwt.InvalidTokenError subclasses on any failure.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as e:
        raise jwt.InvalidTokenError(f"malformed JWT header: {e}")

    alg = header.get("alg")
    if not alg:
        raise jwt.InvalidTokenError("JWT header missing 'alg'")

    common_decode_kwargs = dict(
        # Supabase user tokens always have aud = "authenticated".
        audience="authenticated",
        # Issuer matches `{SUPABASE_URL}/auth/v1` (auto-derived in settings).
        issuer=settings.SUPABASE_JWT_ISSUER,
        options={
            "require": ["sub", "exp", "iat", "iss", "aud"],
        },
    )

    if alg in _ACCEPTED_ASYMMETRIC:
        # ── New JWT Signing Keys flow ──
        # Need SUPABASE_URL to know which JWKS endpoint to query.
        if not settings.SUPABASE_URL:
            raise jwt.InvalidTokenError(
                "SUPABASE_URL not configured; cannot fetch JWKS for "
                "asymmetric signature verification."
            )
        jwks_url = _jwks_url(settings.SUPABASE_URL)
        try:
            jwks_client = _get_jwks_client(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
        except Exception as e:
            # PyJWKClientError, network errors, missing kid, etc. — all
            # treated as invalid_token externally. Log for debugging.
            _log.warning("jwks_lookup_failed alg=%s err=%s", alg, e)
            raise jwt.InvalidTokenError(f"JWKS lookup failed: {e}")
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            **common_decode_kwargs,
        )

    if alg in _ACCEPTED_SYMMETRIC:
        # ── Legacy JWT Secret flow ──
        if not settings.SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError(
                "Token signed with HS256 but SUPABASE_JWT_SECRET not "
                "configured on backend."
            )
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[alg],
            **common_decode_kwargs,
        )

    raise jwt.InvalidTokenError(f"unsupported alg: {alg!r}")


# ─── FastAPI dependency ───────────────────────────────────────────────


async def verify_supabase_jwt(
    authorization: Annotated[Optional[str], Header()] = None,
    settings: Settings = Depends(get_settings),
) -> SupabaseJWTPayload:
    """FastAPI dependency: validate the Authorization header's JWT.

    Returns the decoded payload on success. Raises:
      401 missing_authorization_header   — header absent
      401 malformed_authorization_header — present but not "Bearer <x>"
      503 auth_not_configured            — backend has no Supabase URL
      401 invalid_token                  — signature/claims invalid
      401 token_expired                  — exp in the past
      401 invalid_issuer                 — iss claim doesn't match
      401 invalid_audience               — aud claim isn't "authenticated"

    Algorithm-agnostic: auto-detects RS256/ES256 (new JWT Signing Keys)
    vs HS256 (legacy JWT Secret) from the JWT header's `alg` field.
    """
    token = _extract_bearer_token(authorization)

    # auth_configured requires SUPABASE_URL (always needed — issuer +
    # JWKS URL derived from it). JWT secret is only needed for HS256
    # flow; absence is fine if the token uses asymmetric signing.
    if not settings.auth_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "auth_not_configured",
                "hint": "SUPABASE_URL must be set on the backend. "
                "SUPABASE_JWT_SECRET only required for legacy HS256 tokens.",
            },
        )

    try:
        decoded = _decode_with_correct_algorithm(token, settings)
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
        _log.warning("jwt_invalid kind=%s detail=%s", type(e).__name__, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "hint": str(e)},
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
