"""astrologers.last_active_at — retention / churn tracking

Revision ID: 20260610_0006
Revises: 20260608_0005
Create Date: 2026-06-10

2026-06-10 tracking foundation. Adds a nullable last_active_at column to
astrologers, touched (throttled to ~15 min) in get_current_astrologer.

WHY: the app currently has no way to answer "who has been inactive for N
days" — Supabase's last_sign_in_at lives in a different database and is
stale (tokens refresh silently). This column is the prerequisite for the
3-day-inactivity check-in email and every churn/retention query.

Nullable ADD COLUMN — metadata-only on PostgreSQL 11+ (no rewrite, no
lock). Existing rows backfill lazily on each astrologer's next request.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic identifiers
revision: str = "20260610_0006"
down_revision: Union[str, None] = "20260608_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "astrologers",
        sa.Column(
            "last_active_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Last authenticated-request time (throttled). Retention/churn.",
        ),
    )


def downgrade() -> None:
    op.drop_column("astrologers", "last_active_at")
