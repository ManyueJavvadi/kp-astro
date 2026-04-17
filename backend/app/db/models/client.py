"""Client — an astrologer's client record. Multi-tenant scoped by astrologer_id."""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )

    # Identity
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_name: Mapped[str | None] = mapped_column(Text)
    gender: Mapped[str | None] = mapped_column(String(16))
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))

    # Birth data (KP core)
    birth_dt_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    birth_dt_local_str: Mapped[str] = mapped_column(String(32), nullable=False)
    birth_timezone: Mapped[str] = mapped_column(String(48), nullable=False)
    birth_lat: Mapped[float] = mapped_column(Float, nullable=False)
    birth_lon: Mapped[float] = mapped_column(Float, nullable=False)
    birth_place: Mapped[str] = mapped_column(Text, nullable=False)

    # Organization
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), default=list, server_default=text("ARRAY[]::text[]"), nullable=False
    )
    notes_private: Mapped[str | None] = mapped_column(Text)  # astrologer-only jot

    # Cached computed data (nullable — regenerated on demand)
    chart_cache: Mapped[dict | None] = mapped_column(JSONB)
    cache_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationship
    relation_to_astrologer: Mapped[str | None] = mapped_column(
        String(32)
    )  # e.g. "self", "spouse", "child", "client"

    # Lifecycle
    is_archived: Mapped[bool] = mapped_column(
        default=False, server_default=text("false"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_clients_astrologer_id", "astrologer_id"),
        Index("ix_clients_org_id", "org_id"),
        Index("ix_clients_tags_gin", "tags", postgresql_using="gin"),
        Index(
            "ix_clients_fulltext",
            text(
                "to_tsvector('simple', coalesce(full_name,'') || ' ' || "
                "coalesce(phone,'') || ' ' || coalesce(email,'') || ' ' || "
                "coalesce(birth_place,''))"
            ),
            postgresql_using="gin",
        ),
        CheckConstraint(
            "gender IS NULL OR gender IN ('male','female','other','unspecified')",
            name="clients_gender_check",
        ),
    )
