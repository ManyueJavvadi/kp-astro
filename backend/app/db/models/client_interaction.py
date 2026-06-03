"""ClientInteraction model — universal per-tool interaction history.

Records every tool usage in client context (Analysis Q&A, Horary
question, Match query, Muhurtha computation, Panchang lookup, etc.)
with a tool-specific JSONB payload. The portal admin AI Drafts lane
projects from this table — the astrologer sees a single timeline of
"everything I've ever done for this client" with per-tool filter
chips, and can promote any interaction to a public client portal
note via Make-public.

See migration 0004 docstring for the full schema rationale and
``result_payload`` shape examples per tool. ADR-005 §5.4 documents
the Project-don't-Mirror architecture choice.

**Schema-only in this commit.** Only Analysis tab Q&As are persisted
(via the existing chart_session.analysis_messages path — fixed in
Wave 12 Part A). Post-launch waves wire Horary, Match, Muhurtha,
Panchang to INSERT rows here when those tools fire in client context.

Why a separate table (not extending chart_session JSONB per tool):
  - Chart_session.workspace_data is already heavy (~50 KB+ per row);
    appending tool histories there would balloon the row and make
    every SELECT slower
  - Per-tool JSONB columns on chart_session (horary_history,
    match_history…) would require a migration for every new tool
  - One table + tool varchar lets us add tools without schema change
  - The per-client timeline is a clean indexable query
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPKMixin

if TYPE_CHECKING:
    from .chart_session import ChartSession
    from .client import Client
    from .client_note import ClientNote


class ClientInteraction(Base, UUIDPKMixin):
    """One per-tool interaction with a client's chart.

    Note: no TimestampMixin — we have only ``created_at``, no
    ``updated_at``. Interactions are immutable by design (audit
    trail). The astrologer's curation lives in the linked
    ``client_notes`` row instead.
    """

    __tablename__ = "client_interactions"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    chart_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chart_sessions.id", ondelete="SET NULL"),
        nullable=True,
        comment=(
            "Which chart session was active when the interaction happened. "
            "SET NULL on chart_session delete — preserves the audit trail "
            "even if the session is later removed."
        ),
    )
    tool: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment=(
            "Source tool: analysis | horary | match | muhurtha | panchang. "
            "Loose string (not Postgres ENUM) so adding new tools doesn't "
            "require a migration."
        ),
    )
    question_text: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="Astrologer's question or synthesized query string.",
    )
    result_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        comment=(
            "Tool-specific structured result. See migration 0004 docstring "
            "for shape examples per tool."
        ),
    )
    result_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="One-line human-readable summary for the timeline view.",
    )
    promoted_to_note_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_notes.id", ondelete="SET NULL"),
        nullable=True,
        comment=(
            "When the astrologer promotes this interaction to a public "
            "portal note, the resulting client_notes.id is stored here. "
            "Lets the AI Drafts lane render a 'Published' badge without "
            "fragile text matching."
        ),
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.current_timestamp(),
    )

    # ─── Relationships ────────────────────────────────────────────────
    client: Mapped["Client"] = relationship(
        # No back_populates — Client model doesn't yet declare a
        # `interactions` collection. Adding it would force a model
        # change with no current consumer. Wire it when the first
        # query needs `client.interactions`.
    )
    chart_session: Mapped[Optional["ChartSession"]] = relationship()
    promoted_to_note: Mapped[Optional["ClientNote"]] = relationship()

    __table_args__ = (
        Index(
            "ix_client_interactions_client_id_created_at",
            "client_id",
            "created_at",
        ),
        Index(
            "ix_client_interactions_tool",
            "tool",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ClientInteraction id={self.id} client_id={self.client_id} "
            f"tool={self.tool!r}>"
        )
