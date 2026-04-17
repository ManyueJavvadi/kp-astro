"""Stripe mirror — subscriptions + events (for idempotent webhook processing)."""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # Stripe subscription id
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    tier: Mapped[str] = mapped_column(String(24), nullable=False)

    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(
        default=False, server_default=text("false"), nullable=False
    )
    trial_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    price_id: Mapped[str | None] = mapped_column(String(64))
    raw: Mapped[dict | None] = mapped_column(JSONB)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class StripeEvent(Base):
    """Idempotency log — every event.id seen is recorded once."""

    __tablename__ = "stripe_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # Stripe event.id
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    payload: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
