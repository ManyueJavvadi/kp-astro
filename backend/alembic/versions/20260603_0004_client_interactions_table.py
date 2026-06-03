"""client_interactions table — universal per-tool interaction history

Revision ID: 20260603_0004
Revises: 20260602_0003
Create Date: 2026-06-03

Per ADR-005 §5.4 follow-up and the 2026-06-03 product discussion
(item #4 "capture every client interaction into portal"). Path B
chosen: a single ``client_interactions`` table records every tool
usage in client context — Analysis, Horary, Match, Muhurtha,
Panchang, etc. — with a tool-specific JSONB payload.

The portal admin AI Drafts lane will eventually project from THIS
table instead of (or in addition to) ``chart_session.analysis_messages``,
giving the astrologer a single timeline of "everything I ever did
for this client" with per-tool filter chips.

**Schema-only in this migration.** No UI wiring beyond what already
exists (Analysis tab Q&As continue to persist via
``chart_sessions.analysis_messages``; that path is fixed in Wave 12
Part A). Post-launch waves wire Horary, Match, Muhurtha, Panchang
to INSERT rows here.

Columns:

* ``tool`` (varchar 40) — interaction source. Recognized v1:
  ``analysis | horary | match | muhurtha | panchang``. Loose string
  (not Postgres ENUM) for cheap future expansion.

* ``question_text`` (text, nullable) — the question the astrologer
  typed (or a synthesized one — e.g., for muhurtha "find marriage
  window between Apr-Sep 2027").

* ``result_payload`` (jsonb, nullable) — tool-specific structured
  data. Examples:
    - analysis → ``{topic, answer_full, history_snapshot}``
    - horary → ``{verdict, csl_chain, dasha_lord, scoring_table}``
    - match → ``{partner_birth_details, score, h7_verdict}``
    - muhurtha → ``{event_type, selected_window_start, selected_window_end, score}``
    - panchang → ``{date, location, tithi, nakshatra, hora_table}``

* ``result_summary`` (text, nullable) — ONE-line human-readable
  summary for the timeline view. e.g. "Marriage window: Sep 14 -
  Oct 2, 2027 (score 8.4)" or "H7 sub-lord Saturn — slight delays,
  marriage still indicated within 5y".

* ``promoted_to_note_id`` (UUID, nullable) — exact link to the
  ``client_notes`` row created when the astrologer promotes this
  interaction to a public portal note. Same pattern as
  ``client_notes.promoted_from_key`` (migration 0003), but pointing
  the OTHER direction (interaction → note). Lets the AI Drafts lane
  show a "Published" badge on promoted interactions without text
  matching.

Indexes:
* ``(client_id, created_at DESC)`` — main query (per-client timeline,
  newest first).
* ``(tool)`` — for tool-filter chips ("show only horary"). Partial
  index could be tighter (per tool) but a single low-cardinality
  index serves all current queries.

Cascade behavior:
* ``client_id`` FK → ON DELETE CASCADE (delete client removes
  history). Matches chart_sessions + client_notes behavior — the
  client is the unit of data ownership.
* ``chart_session_id`` FK → ON DELETE SET NULL (a deleted chart
  session shouldn't orphan the interaction history; we want the
  audit trail to survive).
* ``promoted_to_note_id`` FK → ON DELETE SET NULL (if the curated
  note is deleted, the interaction stays but the "Published" badge
  goes away).

This migration is non-breaking: no existing row touched, no existing
column modified. New table, new indexes only.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# Alembic identifiers
revision: str = "20260603_0004"
down_revision: Union[str, None] = "20260602_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_interactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chart_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chart_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "tool",
            sa.String(40),
            nullable=False,
            comment="Source tool: analysis | horary | match | muhurtha | panchang",
        ),
        sa.Column(
            "question_text",
            sa.Text(),
            nullable=True,
            comment="Astrologer's question / query text (or synthesized for tools without text input)",
        ),
        sa.Column(
            "result_payload",
            postgresql.JSONB(),
            nullable=True,
            comment="Tool-specific structured result. See migration 0004 docstring for shape examples.",
        ),
        sa.Column(
            "result_summary",
            sa.Text(),
            nullable=True,
            comment="One-line human-readable summary for the per-client timeline view",
        ),
        sa.Column(
            "promoted_to_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_notes.id", ondelete="SET NULL"),
            nullable=True,
            comment="If astrologer promoted this interaction to a public note, the resulting client_notes.id",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    # Primary access pattern — per-client timeline, newest first.
    op.create_index(
        "ix_client_interactions_client_id_created_at",
        "client_interactions",
        ["client_id", sa.text("created_at DESC")],
    )

    # Tool filter chips on the per-client timeline.
    op.create_index(
        "ix_client_interactions_tool",
        "client_interactions",
        ["tool"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_client_interactions_tool", table_name="client_interactions"
    )
    op.drop_index(
        "ix_client_interactions_client_id_created_at",
        table_name="client_interactions",
    )
    op.drop_table("client_interactions")
