"""DB layer — SQLAlchemy 2.0 async + Alembic migrations.

Public surface:
    from app.db import Base, get_db, get_engine, get_sessionmaker

    Base       — DeclarativeBase for all ORM models
    get_db()   — FastAPI dependency yielding an AsyncSession
    get_engine() / get_sessionmaker() — for non-request contexts (workers,
                  startup tasks, Alembic env.py)

Models are imported in app.db.models.__init__ so Alembic autogenerate
sees the full metadata.
"""

from app.db.base import Base
from app.db.engine import get_engine, get_sessionmaker
from app.db.session import get_db

# Import all models so Base.metadata is populated for Alembic autogenerate.
# Side-effectful import on purpose — without this, `alembic revision
# --autogenerate` produces an empty migration.
from app.db import models  # noqa: F401

__all__ = ["Base", "get_db", "get_engine", "get_sessionmaker"]
