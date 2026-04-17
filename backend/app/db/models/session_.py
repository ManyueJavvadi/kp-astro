"""Consultation session — a single client meeting with notes, summary, and AI embedding.

Renamed to Session (module session_.py to avoid shadowing SQLAlchemy's Session class).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.db.base import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )

    session_type: Mapped[str] = mapped_column(String(24), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        String(16), default="scheduled", server_default=text("'scheduled'"), nullable=False
    )

    # Content
    query_text: Mapped[str | None] = mapped_column(Text)
    horary_number: Mapped[int | None] = mapped_column(Integer)  # for KP horary 1-249
    summary: Mapped[str | None] = mapped_column(Text)  # short astrologer summary
    transcript: Mapped[str | None] = mapped_column(Text)  # long-form notes
    ai_summary: Mapped[str | None] = mapped_column(Text)  # Claude-generated summary

    # Embedding for semantic search (nullable — generated async)
    summary_embedding: Mapped[list[float] | None] = mapped_column(Vector(1536))

    # Artifacts
    audio_url: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    snapshot: Mapped[dict | None] = mapped_column(JSONB)  # dasha/RPs/CSL at session time

    # Billing
    fee_charged: Mapped[float | None] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(
        String(8), default="INR", server_default=text("'INR'"), nullable=False
    )
    is_paid: Mapped[bool] = mapped_column(
        default=False, server_default=text("false"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_sessions_client_id_scheduled", "client_id", "scheduled_at"),
        Index("ix_sessions_astrologer_id_scheduled", "astrologer_id", "scheduled_at"),
        Index("ix_sessions_status", "status"),
        Index(
            "ix_sessions_embedding_hnsw",
            "summary_embedding",
            postgresql_using="hnsw",
            postgresql_ops={"summary_embedding": "vector_cosine_ops"},
        ),
        CheckConstraint(
            "session_type IN ('natal','horary','transit','muhurtha','marriage','followup','walkin')",
            name="sessions_type_check",
        ),
        CheckConstraint(
            "status IN ('scheduled','in_progress','completed','cancelled','no_show')",
            name="sessions_status_check",
        ),
        CheckConstraint(
            "horary_number IS NULL OR (horary_number BETWEEN 1 AND 249)",
            name="sessions_horary_range",
        ),
    )
