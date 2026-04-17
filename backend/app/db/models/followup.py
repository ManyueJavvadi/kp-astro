"""Follow-up — dashboard reminders for the astrologer."""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Followup(Base):
    __tablename__ = "followups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL")
    )
    prediction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("predictions.id", ondelete="SET NULL")
    )
    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )

    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(
        String(24), default="manual", server_default=text("'manual'"), nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "ix_followups_astrologer_due_open",
            "astrologer_id",
            "due_at",
            postgresql_where=text("completed_at IS NULL AND dismissed_at IS NULL"),
        ),
        CheckConstraint(
            "source IN ('manual','prediction_window','dasha_transition','session_ended','system')",
            name="followups_source_check",
        ),
    )
