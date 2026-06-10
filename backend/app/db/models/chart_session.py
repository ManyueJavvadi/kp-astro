"""ChartSession model — a stored chart-and-analysis snapshot.

What this replaces: the localStorage `devastroai:savedSessions` array.

A ChartSession is one row per "saved chart" in the astrologer's sidebar.
It MAY reference a Client (if the astrologer linked it), OR it MAY be
anonymous (a one-off chart the astrologer pasted without saving as a
client — e.g., for a quick reading they're not building a relationship
with).

The bulk of the session is JSONB:
  - chart_data       — raw chart engine output (planets, cusps, dashas)
  - workspace_data   — derived workspace bundle (CSL chains, panchang)
  - analysis_messages — AI conversation history (Analysis tab)

Why JSONB instead of separate tables for each:
  - These objects are read whole or not at all (no row-level queries)
  - Schema is the chart engine's API contract, not a normalized model
  - Engine output evolves frequently; column migrations would be painful
  - PostgreSQL JSONB compresses well + supports indexes if we ever need
    to query inside (we don't today)

When migrated to DB, the frontend stops touching localStorage for this
data entirely — TanStack Query becomes the cache.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from .astrologer import Astrologer
    from .client import Client


class ChartSession(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "chart_sessions"

    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("astrologers.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Nullable — anonymous chart sessions ("quick reading not saved as a
    # client") are valid. When set, deleting the client cascades the
    # sessions too (per spec — clients own their charts).
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=True,
    )

    # ─── Display ──────────────────────────────────────────────────────
    # Astrologer-editable label shown in the sidebar. Defaults to the
    # birth name when the session is created from a chart; can be renamed.
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Sidebar label. Initial value = client/birth name.",
    )

    # ─── Astrology flavour (migration 0005, 2026-06-08) ───────────────
    # Which system produced chart_data + workspace_data. 'kp' today;
    # future flavours (vedic, …) ship as new values without a type
    # migration. Loose string by design (same convention as note_type).
    # Forward-compat groundwork only — the KP pipeline ignores it.
    system: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="kp",
        comment="Astrology system: 'kp' (default) | future 'vedic' etc.",
    )

    # ─── Birth input snapshot (denormalized for anonymous sessions) ───
    # When client_id is set, this duplicates Client.birth_*. The duplication
    # is intentional: it captures the exact input the astrologer used at
    # this session, even if the Client's birth data is later rectified.
    # Rectification creates a new ChartSession, doesn't mutate the old one.
    birth_name: Mapped[Optional[str]] = mapped_column(String(200))
    birth_date: Mapped[Optional[str]] = mapped_column(String(10))
    birth_time: Mapped[Optional[str]] = mapped_column(String(8))
    birth_ampm: Mapped[Optional[str]] = mapped_column(String(2))
    birth_place_name: Mapped[Optional[str]] = mapped_column(String(500))
    birth_latitude: Mapped[Optional[float]] = mapped_column()
    birth_longitude: Mapped[Optional[float]] = mapped_column()
    birth_timezone_offset: Mapped[Optional[float]] = mapped_column()
    birth_gender: Mapped[Optional[str]] = mapped_column(String(10))

    # ─── Engine output payloads (JSONB) ───────────────────────────────
    # `chart_data`: output of /chart/generate — planets, cusps, asc, etc.
    # `workspace_data`: output of /astrologer/workspace — derived
    #   bundle with CSL chains, dasha tree, panchang, Tara chakra, etc.
    # Stored separately so workspace_data can be recomputed when the
    # engine changes (KP accuracy hotfixes) without losing chart_data.
    chart_data: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        comment="Raw chart engine output. Schema = chart_engine.generate_chart() return.",
    )
    workspace_data: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        comment="Derived workspace bundle from /astrologer/workspace endpoint.",
    )

    # ─── Analysis tab state (AI conversation) ─────────────────────────
    # List of { q, a, isTopic? }. Persisted so the astrologer can resume
    # a conversation across devices / browser restarts.
    analysis_messages: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(
        JSONB,
        comment="Analysis tab AI chat history: [{q, a, isTopic?}, ...]",
    )
    # Per-session UI prefs (which topic last shown, language, selected
    # house). Tiny dict, no need for a separate table.
    ui_state: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        comment="Tab-local UI state to restore on session reload: "
        "{ activeTopic, analysisLang, selectedHouse, chatQ, activeTab }",
    )

    # ─── Free-text astrologer notes about THIS session specifically ───
    # (different from Client.summary which is across-sessions and from
    # client_notes which is a timeline.)
    session_notes: Mapped[Optional[str]] = mapped_column(Text)

    # ─── Relationships ────────────────────────────────────────────────
    astrologer: Mapped["Astrologer"] = relationship(back_populates="chart_sessions")
    client: Mapped[Optional["Client"]] = relationship(back_populates="chart_sessions")

    __table_args__ = (
        # Sidebar lists astrologer's recent sessions.
        Index(
            "ix_chart_sessions_astrologer_id_updated_at",
            "astrologer_id",
            "updated_at",
        ),
        # Client detail page lists that client's sessions.
        Index(
            "ix_chart_sessions_client_id_created_at",
            "client_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return f"<ChartSession id={self.id} name={self.name!r}>"
