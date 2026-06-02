"""SQLAlchemy DeclarativeBase + shared mixins.

All ORM models inherit from `Base` so Alembic can autogenerate migrations
from `Base.metadata`.

Mixins:
    TimestampMixin  — adds created_at / updated_at columns auto-managed by
                      the DB (so we don't trust Python clock).
    UUIDPKMixin     — adds an `id: UUID` primary key with server-side default.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base.

    Empty by design — concrete models add columns + relationships.
    Mixins below provide the boilerplate that repeats across most tables.
    """


# Type aliases for column types we use a lot. Annotated[] lets us write
# `created_at: Mapped[datetime_tz]` instead of repeating the column args.
_DateTimeTZ = Annotated[
    datetime,
    mapped_column(DateTime(timezone=True), nullable=False),
]


class TimestampMixin:
    """Auto-managed created_at / updated_at columns.

    Both stored as `timestamptz` (UTC). Database is the clock — we never
    pass a Python datetime here, because clock drift across workers /
    deploy regions silently corrupts ordering.

    created_at: set by `server_default=NOW()` on insert.
    updated_at: set by `server_default=NOW()` AND `onupdate=NOW()` so it
                bumps on every row change without ORM cooperation.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDPKMixin:
    """UUID v4 primary key with server-side default.

    Why UUID not bigint:
      - Client portal URLs use `/c/<uuid>` — guessability is a security
        property, sequential bigints would be enumerable.
      - Cross-table joins keep IDs unique even after merges.
      - No coordination needed when we eventually shard.

    Server-side default (gen_random_uuid()) means we can insert without
    pre-computing in Python, and the value is visible after flush. Needs
    pgcrypto OR Postgres 13+ (which exposes gen_random_uuid built-in).
    The initial migration enables pgcrypto explicitly to be safe.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
