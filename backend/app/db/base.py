"""SQLAlchemy async base + session factory for Phase 1 SaaS layer.

Keeps the existing synchronous KP engine (chart_engine, llm_service etc.)
completely untouched. Only new CRUD endpoints use this async layer.
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
# SQLAlchemy needs postgresql+asyncpg:// (already in our .env file)


class Base(DeclarativeBase):
    """Shared declarative base for all v2 ORM models."""


engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an AsyncSession and closes it at request end."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
