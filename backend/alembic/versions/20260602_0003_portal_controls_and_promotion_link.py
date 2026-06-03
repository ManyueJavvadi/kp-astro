"""portal_enabled + portal_visibility on clients, promoted_from_key on notes

Revision ID: 20260602_0003
Revises: 20260602_0002
Create Date: 2026-06-02

Per 2026-06-02 deep-scan audit (S5, C5, C10). Three additions:

1. ``clients.portal_enabled`` (boolean, NOT NULL, default TRUE)
   S5 — astrologer kill switch for a leaked portal URL. The
   PUBLIC GET /c/{slug} endpoint will 404 when this is FALSE,
   so a regenerated slug (or simply pulling the link) is one
   toggle away. Default TRUE preserves existing behavior — old
   clients aren't suddenly invisible.

2. ``clients.portal_visibility`` (JSONB, NOT NULL, default {} )
   C10 — per-client privacy control over what the public portal
   shows. Frontend & portal endpoint inspect specific keys:
     show_birth_time   (default true)
     show_birth_place  (default true)
     show_gender       (default true)
   Stored as JSONB so we can add more toggles (show_snapshot,
   show_notes_<type>, etc.) without another migration. The
   model holds explicit getter helpers that default missing
   keys to TRUE — preserves current behavior.

3. ``client_notes.promoted_from_key`` (text, nullable)
   C5 — exact link between a curated note and the AI-draft Q&A
   it was promoted from. Previously we detected "already published"
   by substring-matching the draft's answer text against existing
   notes (fragile — could false-positive). Now Make-public stores
   the draft's stable key ("<session_id>:<message_index>") and the
   AiDraftsLane checks an exact set.
   Nullable because hand-written notes have no source draft.

All three columns are NULLABLE-with-default OR populated by the model's
server_default — zero-downtime migration. Existing rows pick up the
defaults automatically.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# Alembic identifiers
revision: str = "20260602_0003"
down_revision: Union[str, None] = "20260602_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── clients.portal_enabled ─────────────────────────────────────
    op.add_column(
        "clients",
        sa.Column(
            "portal_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
            comment=(
                "Astrologer kill switch — when FALSE, the public "
                "/c/{slug} portal endpoint 404s. Use to revoke a "
                "leaked URL without rotating the slug (which would "
                "also blow away the existing share). Toggle in the "
                "portal admin page."
            ),
        ),
    )

    # ── clients.portal_visibility ──────────────────────────────────
    op.add_column(
        "clients",
        sa.Column(
            "portal_visibility",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
            comment=(
                "Per-client privacy controls for the public portal. "
                "Keys checked by the portal endpoint: "
                "show_birth_time, show_birth_place, show_gender. "
                "Missing keys default to TRUE (current behavior). "
                "Empty object = show everything."
            ),
        ),
    )

    # ── client_notes.promoted_from_key ─────────────────────────────
    op.add_column(
        "client_notes",
        sa.Column(
            "promoted_from_key",
            sa.Text(),
            nullable=True,
            comment=(
                "When source='ai_draft', stores the stable key "
                "'<chart_session_id>:<message_index>' identifying the "
                "originating AI Q&A. Lets the AiDraftsLane UI mark "
                "a draft as already-published exactly (instead of "
                "fragile substring matching against note text). NULL "
                "for hand-written notes."
            ),
        ),
    )
    # Lightweight index — primarily used by the AI drafts lane query
    # which checks "is this key already promoted?" Without it that
    # would be a sequential scan for every page load. Partial index
    # keeps it small (most notes won't have a promotion key).
    op.create_index(
        "ix_client_notes_promoted_from_key",
        "client_notes",
        ["client_id", "promoted_from_key"],
        postgresql_where=sa.text("promoted_from_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_client_notes_promoted_from_key", table_name="client_notes"
    )
    op.drop_column("client_notes", "promoted_from_key")
    op.drop_column("clients", "portal_visibility")
    op.drop_column("clients", "portal_enabled")
