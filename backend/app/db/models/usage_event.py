"""UsageEvent model — append-only log of billable + analytics events.

Single events table per ADR audit P2 item #14:
  `events(actor_id, event_type, payload jsonb, ts)` — simple, queryable
  from day 1, no SaaS yet.

Schema-wise we use `astrologer_id` (most events have a known astrologer)
plus an optional `client_id` and `session_id` for context. The
`event_type` discriminator + JSONB `payload` lets us add new event
types without migrations.

Examples:
  event_type='ai_question' payload={topic, tokens_in, tokens_out, model, cost_inr}
  event_type='chart_generated' payload={birth_date, place}
  event_type='client_portal_opened' payload={portal_slug, ip_hash}
  event_type='top_up_purchased' payload={pack_size, amount_inr}
  event_type='match_scan_run' payload={candidate_count, match_count}

For the AI quota counter on Subscription, the source of truth is
ai_questions_used_this_period (cheap O(1) read). UsageEvent is the
audit trail (recompute if needed, or query for analytics).

This table will grow fast — partition by month if it gets large.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    pass  # No relationships back to this table — append-only log.


class UsageEvent(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "usage_events"

    # ─── Who ──────────────────────────────────────────────────────────
    # ON DELETE SET NULL so deleting an astrologer doesn't destroy
    # historical usage events (we may want them for retroactive billing
    # reconciliation or refund disputes).
    astrologer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("astrologers.id", ondelete="SET NULL"),
        nullable=True,
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
    )
    chart_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chart_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ─── What ─────────────────────────────────────────────────────────
    # Discriminator — see module docstring for known values. Loose by
    # design so future event types ship without migrations.
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)

    # ─── Detail ───────────────────────────────────────────────────────
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)

    # ─── Cost (optional, populated for AI events) ─────────────────────
    # Store cost in PAISE (₹0.01) to avoid float drift. NULL for events
    # that aren't billed (analytics-only). Captured here AND mirrored
    # into Subscription.ai_questions_used_this_period for fast quota math.
    cost_paise: Mapped[Optional[int]] = mapped_column(
        comment="Cost of this event in paise (₹0.01). NULL for non-billed events.",
    )

    __table_args__ = (
        # Per-astrologer recent-events listing (admin dashboards).
        Index(
            "ix_usage_events_astrologer_created",
            "astrologer_id",
            "created_at",
        ),
        # Event-type filtering ('all ai_question events this month').
        Index(
            "ix_usage_events_type_created",
            "event_type",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return f"<UsageEvent id={self.id} type={self.event_type}>"
