"""Alembic async env.

Loads DATABASE_URL from backend/.env, imports all models so autogenerate
picks up every table, and supports pgvector's Vector column type.
"""
import asyncio
import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Load env before anything else so DATABASE_URL is available
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

# Import Base and all models — registers them in Base.metadata
from app.db.base import Base  # noqa: E402
from app.db import models  # noqa: E402, F401  (side effect: register models)

config = context.config

# Inject DATABASE_URL from .env into Alembic config
db_url = os.environ["DATABASE_URL"]
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """Skip Supabase-managed schemas when autogenerating."""
    if type_ == "table":
        schema = getattr(object, "schema", None)
        if schema in ("auth", "storage", "realtime", "graphql", "graphql_public", "vault"):
            return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_schemas=False,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        include_schemas=False,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
