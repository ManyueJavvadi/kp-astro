"""Application settings — env-var validation at startup (Phase 1, 2026-06-01).

Why this exists:
  Pre-Phase-1 the backend read env vars via bare `os.getenv(...)` everywhere
  with no validation. A missing `RAZORPAY_KEY_SECRET` would silently fail on
  the first checkout request (a paying customer experience), not at boot.

  This module loads + validates every env var the app needs ONCE at startup
  via pydantic-settings. If a required var is missing or malformed, the
  process exits before serving any traffic. Fail fast = fail safe.

THE ONE RULE
  This file is the ONLY place in `app/` that reads the environment.
  Nothing else may call `os.getenv` or touch `os.environ`.

  `tests/test_config_single_door.py` enforces this — it greps the whole
  `app/` package and fails the build on any new env read outside this
  module. If you need a new setting, declare it here; do not reach for
  os.getenv, however small the value seems.

  Why the rule is worth enforcing (2026-09-27): before this, 20 env vars
  were read directly across main.py, db/engine.py, routers/ and
  services/, and six of them were ALSO declared here. Two sources of
  truth, and they had drifted:

    - MAX_REQUEST_BODY_BYTES defaulted to 256 KB here and 2 MB in
      main.py. main.py won, so this file's value was simply a lie that
      anyone reading it would have believed.
    - RATE_LIMIT_ENABLED was tested with `os.getenv(...) != "1"`, so
      setting the obvious-looking RATE_LIMIT_ENABLED=true silently
      DISABLED the rate limiter — the one cost control on paid LLM
      endpoints.

  Both are the same failure mode: config that is wrong but plausible,
  failing quietly. Typed fields in one file make that class of bug
  impossible to write.

Adding a new env var:
  1. Add a typed field below.
  2. If required, omit a default (Pydantic raises if unset).
  3. If optional, give it a sensible default and document why.
  4. Reference it via `get_settings().YOUR_VAR` — NEVER bare `os.getenv`.
  5. Add it to `.env.example` so the next person knows it exists.

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

from pydantic import Field, field_validator, model_validator
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

    @field_validator("ENVIRONMENT", "LOG_LEVEL", mode="before")
    @classmethod
    def _normalise_case(cls, v):
        """Accept any casing for the two Literal-typed settings.

        main.py previously did `os.getenv("LOG_LEVEL", "INFO").upper()`,
        so a deployment carrying LOG_LEVEL=info worked fine. Moving the
        read into a Literal field would have started rejecting that at
        startup — turning a cosmetic difference into a boot failure on
        the next deploy. Normalise here so the typed field is strictly
        more permissive than the code it replaced, never less.

        ENVIRONMENT gets the same treatment (lower) for symmetry, since
        "Production" is an equally easy thing to type into a dashboard.
        """
        if not isinstance(v, str):
            return v
        v = v.strip()
        return v.lower() if v.lower() in {
            "development", "staging", "production"
        } else v.upper()

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
    # CORS
    # ──────────────────────────────────────────────────────────────────
    CORS_ALLOWED_ORIGINS: Optional[str] = Field(
        default=None,
        description=(
            "Comma-separated explicit allow-list. Highest priority. When "
            "unset, main.py falls back to its built-in default list."
        ),
    )
    CORS_ALLOWED_ORIGIN_REGEX: Optional[str] = Field(
        default=None,
        description=(
            "Single regex for wildcard origins (e.g. Vercel previews). "
            "When unset, main.py falls back to its built-in project regex."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # Request limits / rate limiting
    # ──────────────────────────────────────────────────────────────────
    MAX_REQUEST_BODY_BYTES: int = Field(
        default=2 * 1024 * 1024,  # 2 MB
        description=(
            "Reject POSTs whose Content-Length exceeds this. "
            "Raised 256 KB -> 2 MB on 2026-06-16: chart-session saves "
            "carry the full workspace blob plus a growing AI Q&A history, "
            "and at ~25 long KP answers the PATCH body crossed 256 KB and "
            "was rejected with 413 (answers silently failed to persist). "
            "2 MB is still a sane DoS backstop."
        ),
    )
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description=(
            "Set false in load tests / local dev to disable the rate "
            "limiter. Accepts the usual truthy/falsy spellings "
            "(true/false, 1/0, yes/no, on/off)."
        ),
    )
    RATE_LIMIT_MAX_KEYS: int = Field(
        default=20_000,
        description=(
            "Cap on tracked rate-limit buckets. Prevents the in-memory "
            "request log from growing without bound; the oldest 25% are "
            "evicted when the cap is reached."
        ),
    )
    TRUSTED_PROXY_HOPS: int = Field(
        default=1,
        ge=1,
        description=(
            "Number of trusted reverse-proxy hops in front of the app. The "
            "rate-limit client IP is taken this many entries from the RIGHT "
            "of X-Forwarded-For — the value our own edge appended, which a "
            "client cannot forge. Railway appends exactly one entry, so 1 is "
            "correct there. Too low buckets distinct users together (false "
            "429s); too high re-opens IP spoofing."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # Observability — Sentry
    # ──────────────────────────────────────────────────────────────────
    SENTRY_DSN: Optional[str] = Field(
        default=None,
        description="Sentry DSN. Error monitoring is disabled when unset.",
    )
    SENTRY_ENVIRONMENT: str = Field(
        default="production",
        description="Environment tag attached to Sentry events.",
    )
    SENTRY_TRACES_SAMPLE_RATE: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description=(
            "Fraction of transactions sampled for performance tracing. "
            "0.1 shows latency patterns while staying under the free tier."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # Database pool tuning
    # ──────────────────────────────────────────────────────────────────
    DB_POOL_SIZE: int = Field(
        default=10,
        ge=1,
        description="SQLAlchemy connection pool size.",
    )
    DB_MAX_OVERFLOW: int = Field(
        default=20,
        ge=0,
        description="Extra connections SQLAlchemy may open beyond the pool.",
    )

    # ──────────────────────────────────────────────────────────────────
    # Operator / debug
    # ──────────────────────────────────────────────────────────────────
    ADMIN_DEBUG_TOKEN: Optional[str] = Field(
        default=None,
        description=(
            "Shared secret for GET /version/full. When unset that endpoint "
            "returns 404, so its existence is not advertised."
        ),
    )
    CACHE_DIAG: bool = Field(
        default=False,
        description="Emit answer-cache hit/miss diagnostics to the log.",
    )
    WORKSPACE_AUTH_REQUIRED: bool = Field(
        default=True,
        description=(
            "When false, the astrologer workspace endpoints skip auth. "
            "Escape hatch for local development ONLY — never set false in "
            "any deployed environment."
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # Platform-injected (Railway sets these automatically on deploy — we
    # only ever read them). Declared here so that `get_settings()` really
    # is the single door, and so /health and /version have one typed
    # source instead of six scattered os.getenv calls.
    # ──────────────────────────────────────────────────────────────────
    RAILWAY_GIT_COMMIT_SHA: Optional[str] = Field(default=None)
    RAILWAY_GIT_COMMIT_MESSAGE: Optional[str] = Field(default=None)
    RAILWAY_GIT_BRANCH: Optional[str] = Field(default=None)
    RAILWAY_DEPLOYMENT_DRAINING_SECONDS: Optional[str] = Field(default=None)

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
    def commit_sha(self) -> str:
        """Deployed git commit, or "unknown" outside a Railway deploy.

        Railway injects RAILWAY_GIT_COMMIT_SHA on every deploy. The
        fallback to RAILWAY_GIT_COMMIT_MESSAGE is historical: some early
        Railway builds populated only the message field.
        """
        return (
            self.RAILWAY_GIT_COMMIT_SHA
            or self.RAILWAY_GIT_COMMIT_MESSAGE
            or "unknown"
        )

    @property
    def commit_sha_short(self) -> str:
        """First 12 chars of `commit_sha` — what /health reports."""
        return self.commit_sha[:12]

    @property
    def git_branch(self) -> str:
        """Deployed git branch, or "unknown" outside a Railway deploy."""
        return self.RAILWAY_GIT_BRANCH or "unknown"

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
