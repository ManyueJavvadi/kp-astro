"""Application settings — env-var validation at startup (Phase 1, 2026-06-01).

Why this exists:
  Pre-Phase-1 the backend read env vars via bare `os.getenv(...)` everywhere
  with no validation. A missing `RAZORPAY_KEY_SECRET` would silently fail on
  the first checkout request (a paying customer experience), not at boot.

  This module loads + validates every env var the app needs ONCE at startup
  via pydantic-settings. If a required var is missing or malformed, the
  process exits before serving any traffic. Fail fast = fail safe.

Adding a new env var:
  1. Add a typed field below.
  2. If required, omit a default (Pydantic raises if unset).
  3. If optional, give it a sensible default and document why.
  4. Reference it via `get_settings().YOUR_VAR` — NEVER bare `os.getenv`.

Env precedence (highest first):
  1. Process environment (e.g., set in Railway dashboard)
  2. `.env` file in repo root (local dev only; .gitignored)
  3. Field defaults in this file

For local dev: copy `.env.example` to `.env` and fill in your values.
For production: set vars in the Railway dashboard for the backend service.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded once at import time.

    Access via `get_settings()` (cached) so each import shares the same
    instance — Pydantic re-validates on every construction, which is wasted
    work for an immutable singleton.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # Allow unknown env vars to coexist (Railway injects many of its
        # own like RAILWAY_GIT_COMMIT_SHA that we read directly elsewhere).
        extra="ignore",
        # Variable names in .env / environment are case-insensitive for
        # convenience (DATABASE_URL or database_url both work).
        case_sensitive=False,
    )

    # ──────────────────────────────────────────────────────────────────
    # Runtime environment
    # ──────────────────────────────────────────────────────────────────
    ENVIRONMENT: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment. Affects logging level + safety guards.",
    )

    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Standard Python logging level for the root logger.",
    )

    # ──────────────────────────────────────────────────────────────────
    # Database (Phase 1, ADR-001 — SQLAlchemy 2.0 async + Alembic)
    # ──────────────────────────────────────────────────────────────────
    # Railway auto-injects DATABASE_URL when the Postgres add-on is attached.
    # Local dev: set in .env to a local Postgres or a Railway shadow DB.
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description=(
            "Postgres connection string. Required for DB-backed endpoints "
            "(astrologer profile, chart sessions, etc.). If unset, the "
            "chart/horary/muhurtha/panchang/match read-only endpoints still "
            "work — they're stateless. Auth-gated endpoints will return 503."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # Supabase Auth (Phase 1, ADR-002)
    # ──────────────────────────────────────────────────────────────────
    # We use Supabase ONLY for auth tokens. Our app DB lives on Railway.
    # SUPABASE_URL: e.g., https://abcdefghijklmnop.supabase.co
    # SUPABASE_JWT_SECRET: the project's JWT secret (Project Settings → API).
    #   Used for HS256 token verification. We use HS256 not RS256 because
    #   Supabase signs project JWTs with the project's shared secret — no
    #   JWKS round-trip needed, no external network dep, much faster.
    SUPABASE_URL: Optional[str] = Field(
        default=None,
        description="Supabase project URL, e.g. https://xxxx.supabase.co",
    )
    SUPABASE_JWT_SECRET: Optional[str] = Field(
        default=None,
        description=(
            "Supabase JWT secret (HS256). Get from Supabase Dashboard → "
            "Project Settings → API → JWT Settings → JWT Secret. NEVER "
            "commit. Keep in Railway env vars only."
        ),
    )
    SUPABASE_JWT_ISSUER: Optional[str] = Field(
        default=None,
        description=(
            "Expected `iss` claim. Format: {SUPABASE_URL}/auth/v1 — "
            "auto-derived from SUPABASE_URL if left unset."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # AI / Anthropic (already in use pre-Phase-1; surfacing here for
    # validation rather than scattered os.getenv calls)
    # ──────────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: Optional[str] = Field(
        default=None,
        description="Anthropic API key. AI endpoints fail gracefully if unset.",
    )

    # ──────────────────────────────────────────────────────────────────
    # CORS / rate limiting (already env-controlled in main.py; surfacing
    # for one-stop validation)
    # ──────────────────────────────────────────────────────────────────
    CORS_ALLOWED_ORIGINS: Optional[str] = Field(
        default=None,
        description="Comma-separated list. Falls back to defaults in main.py.",
    )
    CORS_ALLOWED_ORIGIN_REGEX: Optional[str] = Field(
        default=None,
        description="Single regex for wildcard CORS origins (e.g. Vercel previews).",
    )
    MAX_REQUEST_BODY_BYTES: int = Field(
        default=256 * 1024,
        description="Reject POSTs whose Content-Length exceeds this.",
    )
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Set to false in load tests / local dev to disable rate limiter.",
    )

    # ──────────────────────────────────────────────────────────────────
    # Derived helpers
    # ──────────────────────────────────────────────────────────────────
    @model_validator(mode="after")
    def _derive_supabase_issuer(self):
        """Auto-derive SUPABASE_JWT_ISSUER from SUPABASE_URL if unset.

        Saves one env var to manage. The pattern is fixed:
            {SUPABASE_URL.rstrip('/')}/auth/v1
        """
        if self.SUPABASE_URL and not self.SUPABASE_JWT_ISSUER:
            self.SUPABASE_JWT_ISSUER = (
                self.SUPABASE_URL.rstrip("/") + "/auth/v1"
            )
        return self

    @property
    def database_configured(self) -> bool:
        """True if DB-backed endpoints can be served."""
        return bool(self.DATABASE_URL)

    @property
    def auth_configured(self) -> bool:
        """True if Supabase JWT verification can run.

        Only SUPABASE_URL is strictly required — it gives us both the
        expected `iss` claim AND the JWKS endpoint URL for asymmetric
        (RS256/ES256) verification of tokens issued by the new "JWT
        Signing Keys" system.

        SUPABASE_JWT_SECRET is only needed to verify HS256 tokens (the
        legacy symmetric flow). Modern Supabase projects don't issue
        HS256 user tokens, so the secret is optional. If a token DOES
        arrive with HS256 alg and the secret isn't set, the verifier
        raises invalid_token cleanly.
        """
        return bool(self.SUPABASE_URL)

    @property
    def database_url_async(self) -> Optional[str]:
        """Normalize DATABASE_URL for SQLAlchemy async driver.

        Railway/Heroku-style URLs come as `postgres://` or `postgresql://`,
        but SQLAlchemy's async path needs `postgresql+asyncpg://`. Convert
        once here so callers don't have to.
        """
        if not self.DATABASE_URL:
            return None
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Cached singleton. Call this from anywhere.

    Use:
        from app.config import get_settings
        settings = get_settings()
        db_url = settings.database_url_async

    NEVER store the result on a module-level global at import time —
    that breaks tests that override env vars via monkeypatch. Always
    call get_settings() inside the function/handler that needs it.
    """
    return Settings()
