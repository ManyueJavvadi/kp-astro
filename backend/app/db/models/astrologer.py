"""Astrologer model — the paying user.

One row per astrologer account. Joined to Supabase Auth via
`supabase_user_id` (the JWT's `sub` claim is a UUID). We never store
passwords here — Supabase Auth handles all credential management.

Profile fields (bio, photo, etc.) live here so they're queryable
without a Supabase round-trip. Used by:
  - Sidebar (display name + photo)
  - Client portal pages (astrologer-first branding per portal spec)
  - Phase M matching network (verification status, years_practicing,
    num_clients shown in match notifications as trust signal)
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    # Avoid runtime circular imports — only needed for type hints.
    from .client import Client
    from .chart_session import ChartSession
    from .subscription import Subscription


class Astrologer(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "astrologers"

    # ─── Identity (Supabase Auth bridge) ──────────────────────────────
    # Supabase JWT's `sub` claim. Unique per account. We index this
    # because every authenticated request looks up the astrologer by it.
    supabase_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(320),  # RFC 5321 max
        unique=True,
        nullable=False,
        index=True,
    )

    # ─── Public profile (shown on client portal pages, future
    #     astrologer directory, match notifications) ───────────────────
    display_name: Mapped[Optional[str]] = mapped_column(String(120))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    photo_url: Mapped[Optional[str]] = mapped_column(String(2048))
    # E.164 phone (optional; used for WhatsApp consult-back deep-link
    # per client portal spec).
    phone: Mapped[Optional[str]] = mapped_column(String(20))

    # ─── Practice metadata (trust signals for Phase M matching) ───────
    years_practicing: Mapped[Optional[int]] = mapped_column(Integer)
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )

    # ─── Localization defaults (per-astrologer; client portal can
    #     override per-client) ──────────────────────────────────────────
    default_language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default="en",
        comment="One of: en, te, te_en (matches frontend i18n modes)",
    )

    # ─── Onboarding state ─────────────────────────────────────────────
    onboarded_at: Mapped[Optional[date]] = mapped_column(Date)

    # ─── Relationships ────────────────────────────────────────────────
    # cascade='all, delete-orphan' so deleting an astrologer (rare —
    # only on full account deletion) wipes their clients + sessions.
    # Adjust to soft-delete if we ever need to retain orphaned data.
    clients: Mapped[list["Client"]] = relationship(
        back_populates="astrologer",
        cascade="all, delete-orphan",
        lazy="raise",  # force explicit loading to catch N+1 bugs
    )
    chart_sessions: Mapped[list["ChartSession"]] = relationship(
        back_populates="astrologer",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="astrologer",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    __table_args__ = (
        # Defense-in-depth on email uniqueness — already declared on the
        # column but explicit table-level constraint is what migrations
        # autogenerate cleanly.
        UniqueConstraint("supabase_user_id", name="uq_astrologers_supabase_user_id"),
        UniqueConstraint("email", name="uq_astrologers_email"),
    )

    def __repr__(self) -> str:
        return f"<Astrologer id={self.id} email={self.email}>"
