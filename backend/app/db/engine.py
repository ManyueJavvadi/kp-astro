"""Async SQLAlchemy engine + sessionmaker (Phase 1, ADR-001).

One engine per process, lazily constructed on first call. Engine + pool
are reused across requests; each request gets its own AsyncSession via
the get_db() dependency in session.py.

Why lazy:
  - Tests can monkeypatch DATABASE_URL before the engine is built.
  - The chart/horary/muhurtha/etc. read-only endpoints still work when
    DATABASE_URL isn't set yet (e.g., a fresh dev machine without
    Postgres configured) — engine is only created on first DB-touching
    request.

Pool sizing:
  Default pool_size=5, max_overflow=10 → up to 15 concurrent connections
  per worker process. Railway Postgres free tier allows up to ~25-100
  connections depending on plan; with 1 Uvicorn worker we're well under.
  Scale these explicitly if we move to multiple workers.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    """Build (or return cached) async engine for the configured DATABASE_URL.

    Raises RuntimeError if DATABASE_URL isn't set — callers should check
    `get_settings().database_configured` first if the endpoint is meant
    to degrade gracefully.
    """
    settings = get_settings()
    url = settings.database_url_async
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in Railway env vars "
            "(or .env for local dev) before calling DB-backed endpoints."
        )
    return create_async_engine(
        url,
        # echo=False in production. Set true via env var for SQL trace
        # debugging during integration work.
        echo=settings.ENVIRONMENT == "development" and settings.LOG_LEVEL == "DEBUG",
        # pool_pre_ping rescues connections that timed out behind a load
        # balancer (Railway closes idle connections after ~5 min) — extra
        # round-trip, negligible cost, prevents the dreaded 'connection
        # already closed' on first DB call after a quiet period.
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Cached sessionmaker bound to the engine.

    `expire_on_commit=False` so freshly-committed objects stay accessible
    in the request response — avoids surprise lazy loads after commit.
    """
    return async_sessionmaker(
        bind=get_engine(),
        expire_on_commit=False,
        class_=AsyncSession,
    )


async def dispose_engine() -> None:
    """Tear down the engine (graceful shutdown). Call from FastAPI's
    shutdown event handler if needed; not required for ephemeral dynos."""
    eng: Optional[AsyncEngine] = None
    try:
        eng = get_engine()
    except RuntimeError:
        # No engine ever built — nothing to dispose.
        return
    await eng.dispose()
    # Clear the lru_cache so a subsequent get_engine() rebuilds (useful
    # in tests). Production processes typically exit instead.
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
