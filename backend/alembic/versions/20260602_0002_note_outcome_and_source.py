"""note outcome enum + source column (prediction ledger groundwork)

Revision ID: 20260602_0002
Revises: 20260601_0001
Create Date: 2026-06-02

Per master plan §7a discussion (2026-06-02) — schema groundwork for the
prediction ledger AND the AI-drafts-to-public-notes feature. NO UI ships
in this migration; the columns sit empty until the corresponding UX
lands. Adding them now saves a future migration round-trip and keeps
the data model honest from day one.

Two additions to ``client_notes``:

1. ``outcome`` (text, nullable, default 'na')
   A richer status than the existing boolean ``resolved``. Values:
       - ``pending``       — prediction made, resolution date in future
       - ``confirmed``     — astrologer marked it correct
       - ``partial``       — partially correct (timing off, gist right…)
       - ``disconfirmed``  — astrologer marked it wrong
       - ``na``            — non-prediction note (default, applies to
                             reading/follow_up/observation note_types)
   String column (not a Postgres ENUM) for cheap future expansion — KP
   astrologers may want sub-categories like "timing-off" later.

2. ``source`` (text, nullable, default 'astrologer')
   Tracks where the note text originally came from:
       - ``astrologer``    — typed by hand (default for legacy + new)
       - ``ai_draft``      — promoted from an analysis_messages Q&A
   Lets the portal admin highlight AI-derived notes with a small badge,
   and makes audit queries trivial (e.g. "what % of public notes
   started as AI drafts?").

Both columns are NULLABLE with server_default so existing rows pick up
the default automatically — zero-downtime migration.

NO INDEX added. Outcome filtering is per-client (small N); a roster-
wide "show me all pending predictions" query would benefit from an
index later — defer until the feature actually exists.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Alembic identifiers
revision: str = "20260602_0002"
down_revision: Union[str, None] = "20260601_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # outcome — see module docstring for values
    op.add_column(
        "client_notes",
        sa.Column(
            "outcome",
            sa.String(20),
            nullable=False,
            server_default="na",
            comment=(
                "Prediction outcome status: pending/confirmed/partial/"
                "disconfirmed/na. 'na' for non-prediction notes."
            ),
        ),
    )
    # source — astrologer vs ai_draft
    op.add_column(
        "client_notes",
        sa.Column(
            "source",
            sa.String(20),
            nullable=False,
            server_default="astrologer",
            comment=(
                "Where the note text originated: astrologer (typed by "
                "hand) or ai_draft (promoted from chart_session."
                "analysis_messages via 'Make public')."
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("client_notes", "source")
    op.drop_column("client_notes", "outcome")
