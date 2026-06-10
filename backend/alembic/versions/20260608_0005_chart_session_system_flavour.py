"""chart_sessions.system — astrology-flavour discriminator (KP today, Vedic later)

Revision ID: 20260608_0005
Revises: 20260603_0004
Create Date: 2026-06-08

2026-06-08 audit fix (P2 extensibility groundwork). Today every stored
chart_data / workspace_data blob is "KP by omission" — there is no marker
of which astrology system produced it. The day a second flavour (Vedic,
etc.) ships, every existing row and cached payload becomes ambiguous and
would need a retrofit data migration over production JSONB.

Adding the column NOW is free: a single nullable-with-server-default
ADD COLUMN is metadata-only on PostgreSQL 11+ (no table rewrite, no long
lock), and it backfills every existing row to 'kp' automatically. This is
the same cheap-forward-compat move the project already made for
clients.matching_opt_in.

The column is intentionally a loose String (not a Postgres ENUM) so new
flavours need no type migration — same convention as note_type / tool.

Non-breaking: no existing column modified, no data touched beyond the
server_default backfill. The KP analysis pipeline, prompts, and KB
files are NOT involved — this is pure data-model groundwork.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic identifiers
revision: str = "20260608_0005"
down_revision: Union[str, None] = "20260603_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chart_sessions",
        sa.Column(
            "system",
            sa.String(20),
            nullable=False,
            server_default="kp",
            comment=(
                "Astrology system / flavour that produced chart_data + "
                "workspace_data. 'kp' today; future: 'vedic', etc. Loose "
                "string for cheap expansion (no ENUM migration needed)."
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("chart_sessions", "system")
