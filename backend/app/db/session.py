"""FastAPI DB session dependency (Phase 1, ADR-001).

Usage in a route handler:

    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.db import get_db

    @router.get("/clients")
    async def list_clients(db: AsyncSession = Depends(get_db)):
        ...

The dependency yields an AsyncSession scoped to the request, commits on
clean exit, rolls back on exception. The caller doesn't need to
explicitly commit unless it wants to make changes visible mid-handler.
"""

from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_sessionmaker


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a request-scoped AsyncSession.

    Commit-on-clean-exit semantics:
      - Handler returns normally  → session.commit()
      - Handler raises            → session.rollback()
      - Always                    → session.close()

    Handlers can call `db.flush()` to make queries see their pending
    writes without committing. They can also call `db.commit()` manually
    mid-handler if they want results visible to other connections — the
    final commit here becomes a no-op.
    """
    sessionmaker = get_sessionmaker()
    session = sessionmaker()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
