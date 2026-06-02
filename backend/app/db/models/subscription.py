"""Subscription model — per-astrologer billing state.

Reflects the LOCKED pricing model (pricing-payment-business-spec.md):
  - Plus  ₹499/mo  → 5  AI questions/mo + unlimited deterministic features
  - Pro   ₹1,499/mo → 30 AI questions/mo + everything in Plus
  - Top-up packs   ₹200 / ₹500 / ₹1000  → +5 / +15 / +35 AI questions

This model captures the SUBSCRIPTION (the recurring plan). Top-up packs
add credit balance tracked separately on the same row (`topup_credits`)
or as `usage_event` rows aggregated — design TBD when Razorpay
integration starts. For now we model the subscription itself.

Payment processor: Razorpay (ADR/spec). Razorpay's subscription objects
are referenced by `razorpay_subscription_id`. UPI Autopay (eMandate)
billing happens server-side via Razorpay webhooks; we mirror state here.

Free trial: 30 days of Plus, no credit card upfront (spec). When trial
starts: status='trialing', plan='plus', trial_ends_at=now+30d. When
trial ends without paid conversion: status='trial_expired'. When user
pays: status='active', razorpay_subscription_id set.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from .astrologer import Astrologer


class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("astrologers.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ─── Plan ─────────────────────────────────────────────────────────
    # String enum (loose) — adding a tier later is one INSERT not a
    # migration. Constraint enforced in app layer.
    # Values: 'plus', 'pro' (LOCKED spec).
    plan: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment="Pricing tier: 'plus' or 'pro' per locked spec.",
    )

    # ─── Status ───────────────────────────────────────────────────────
    # Mirrors Razorpay subscription status with our own pre-paid states.
    #   'trialing'        — 30-day free trial active
    #   'trial_expired'   — trial ended, no payment converted
    #   'active'          — paying customer (Razorpay subscription active)
    #   'past_due'        — payment failed, in grace period
    #   'canceled'        — user canceled, runs out at period_end
    #   'expired'         — canceled and period ended
    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment="Subscription lifecycle state.",
    )

    # ─── Period boundaries ────────────────────────────────────────────
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    current_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # ─── AI quota tracking (per billing period) ───────────────────────
    # Plus = 5/mo, Pro = 30/mo. Resets on current_period_start.
    # Top-up purchases add to `topup_credits` (non-expiring, per spec).
    ai_questions_included_per_period: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Plan's base AI quota per period. 5 for Plus, 30 for Pro.",
    )
    ai_questions_used_this_period: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
    )
    topup_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        comment="Carry-over AI questions purchased via top-up packs. "
        "Per spec: never expire.",
    )

    # ─── Razorpay linkage ─────────────────────────────────────────────
    # Nullable while user is on free trial (no Razorpay sub created yet).
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(String(120))
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(120),
        unique=True,
        comment="Razorpay's sub_xxx id. Unique → one Razorpay sub per row.",
    )

    # ─── Relationships ────────────────────────────────────────────────
    astrologer: Mapped["Astrologer"] = relationship(back_populates="subscriptions")

    __table_args__ = (
        # Look up an astrologer's active sub fast. We allow multiple
        # rows per astrologer over time (historical subs preserved for
        # billing reconciliation); add a partial unique index in a future
        # migration if we want to enforce "only one active sub at a time".
        Index(
            "ix_subscriptions_astrologer_id_status",
            "astrologer_id",
            "status",
        ),
        UniqueConstraint(
            "razorpay_subscription_id",
            name="uq_subscriptions_razorpay_subscription_id",
        ),
    )

    def __repr__(self) -> str:
        return f"<Subscription id={self.id} plan={self.plan} status={self.status}>"
