"""ClientNote model — timeline of astrologer notes on a client.

Per client portal spec, the per-client portal page shows a chronological
timeline of notes the astrologer wrote. Notes have:
  - author (the astrologer)
  - text + language (EN / TE / TE_EN)
  - note_type (reading, follow_up, prediction, observation)
  - is_private (TRUE = never on portal; FALSE = visible to client on portal)

Predictions can carry an `expected_resolution_date` so future timeline
views can highlight "this prediction resolves around <date>".

Why a separate table (not JSONB on Client):
  - Notes grow over years; we want pagination and date filtering.
  - Per-note privacy toggle would be cumbersome in JSONB.
  - Future Phase: track prediction accuracy needs queryable rows.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from .client import Client


class ClientNote(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "client_notes"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ─── Content ──────────────────────────────────────────────────────
    text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default="en",
        comment="One of: en, te, te_en (matches frontend i18n modes)",
    )
    # Free-form-ish; loose by design. Common values:
    #   "reading"       — general session note
    #   "follow_up"     — to-do for next session
    #   "prediction"    — testable prediction with resolution date
    #   "observation"   — astrologer's neutral observation
    note_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        server_default="reading",
    )

    # ─── Privacy ──────────────────────────────────────────────────────
    # TRUE = visible to ONLY the astrologer.
    # FALSE = visible on the client portal page (public via /c/<slug>).
    # Default TRUE — explicit opt-in to share with client.
    is_private: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
    )

    # ─── Predictions ──────────────────────────────────────────────────
    # When `note_type == 'prediction'`, the astrologer may set a date
    # when the prediction should resolve. Used for future "prediction
    # accuracy tracking" feature (P1 launch tracker item, pending design).
    expected_resolution_date: Mapped[Optional[date]] = mapped_column(Date)
    # Astrologer marks resolution: true = came true, false = didn't,
    # null = pending evaluation.
    resolved: Mapped[Optional[bool]] = mapped_column(Boolean)
    resolved_at: Mapped[Optional[date]] = mapped_column(Date)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text)

    # ─── Outcome enum + source (added 2026-06-02, migration 0002) ─────
    # `outcome` is the richer prediction status — preferred over the
    # boolean `resolved` going forward, but BOTH exist for transitional
    # safety (resolved can be deprecated later once UI fully cuts over).
    # Values: pending / confirmed / partial / disconfirmed / na.
    # `na` = the default for non-prediction notes (reading / follow_up /
    # observation), so this column is always populated even when the
    # prediction concept doesn't apply.
    outcome: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="na",
        comment=(
            "Prediction outcome: pending/confirmed/partial/disconfirmed/na."
        ),
    )
    # `source` tracks origin of the note text — important for the
    # AI-drafts-to-public-notes flow. When the astrologer promotes an
    # AI Q&A from chart_session.analysis_messages into a curated note,
    # the new row gets source='ai_draft' so we can badge it in the
    # portal admin and audit-query "% of public notes that were AI-
    # drafted." All hand-written notes (legacy + new) get 'astrologer'.
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="astrologer",
        comment="Origin: astrologer (typed) or ai_draft (promoted from AI Q&A).",
    )

    # ─── Relationships ────────────────────────────────────────────────
    client: Mapped["Client"] = relationship(back_populates="notes")

    __table_args__ = (
        # Timeline query: notes for a client, newest first.
        Index(
            "ix_client_notes_client_id_created_at",
            "client_id",
            "created_at",
        ),
        # Portal-visible notes: filter is_private=false in code, then
        # this index speeds the per-client lookup.
        Index(
            "ix_client_notes_portal_visible",
            "client_id",
            "created_at",
            postgresql_where="is_private = false",
        ),
    )

    def __repr__(self) -> str:
        return f"<ClientNote id={self.id} type={self.note_type}>"
