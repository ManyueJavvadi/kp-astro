"""Prediction — the USP. Tracks every prediction made with outcome verification."""
from __future__ import annotations

import uuid
from datetime import datetime, date
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE")
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

    prediction_text: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(24), nullable=False)
    target_window_start: Mapped[date | None] = mapped_column(Date)
    target_window_end: Mapped[date | None] = mapped_column(Date)

    # KP reasoning snapshot
    kp_basis: Mapped[dict | None] = mapped_column(
        JSONB
    )  # {csl, star_lord, sub_lord, signifies_houses, dasha, ruling_planets}

    outcome: Mapped[str] = mapped_column(
        String(16), default="pending", server_default=text("'pending'"), nullable=False
    )
    outcome_notes: Mapped[str | None] = mapped_column(Text)
    outcome_recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_predictions_astrologer_outcome", "astrologer_id", "outcome"),
        Index(
            "ix_predictions_pending_window",
            "target_window_start",
            "target_window_end",
            postgresql_where=text("outcome = 'pending'"),
        ),
        Index("ix_predictions_client_id", "client_id"),
        CheckConstraint(
            "domain IN ('career','marriage','health','finance','education','travel',"
            "'foreign','property','children','litigation','spiritual','other')",
            name="predictions_domain_check",
        ),
        CheckConstraint(
            "outcome IN ('pending','correct','partial','wrong','unverifiable')",
            name="predictions_outcome_check",
        ),
    )
