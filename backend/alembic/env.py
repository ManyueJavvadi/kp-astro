"""Alembic environment script.

Bridges Alembic's CLI to our application's:
  - Pydantic Settings (for DATABASE_URL)
  - SQLAlchemy Base metadata (for autogenerate)

Run migrations:
    cd backend
    alembic upgrade head

Generate a new migration after editing models:
    alembic revision --autogenerate -m "add foo column"

(Always review the generated file before applying — autogenerate is
good but not perfect; it sometimes misses index/constraint renames.)
"""

from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ──────────────────────────────────────────────────────────────────────
# Path setup — Alembic is invoked from backend/ so the app package
# resolves naturally. The prepend below covers the case where alembic
# is invoked from elsewhere.
# ──────────────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.db import Base  # noqa: E402 — also triggers model imports

# ──────────────────────────────────────────────────────────────────────
# Alembic Config object — reads alembic.ini.
# ──────────────────────────────────────────────────────────────────────
config = context.config

# Wire logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject the DB URL at runtime from Pydantic Settings. Async-compatible
# URL (postgresql+asyncpg://...).
settings = get_settings()
db_url = settings.database_url_async
if not db_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Cannot run Alembic migrations.\n"
        "Set DATABASE_URL in your .env (local) or Railway env vars (prod)."
    )
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    """Sync-context helper. Alembic itself runs synchronously; we adapt."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Useful for safe DDL on Postgres — single transaction per
        # migration; rolls back on error.
        transaction_per_migration=True,
        # Compare server defaults so autogenerate notices if we change
        # a `server_default="false"` to `server_default="true"`.
        compare_server_default=True,
        # Compare column types — catches accidental int↔bigint flips.
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online_async() -> None:
    """Run migrations against an async engine (asyncpg)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_offline() -> None:
    """Generate SQL without a live DB (used by `alembic upgrade head --sql`)."""
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_server_default=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online_async())
