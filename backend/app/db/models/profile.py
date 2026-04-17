"""Profile — extends Supabase auth.users with application-level fields.

Supabase manages auth.users (email, password hash, confirmation, etc.).
We never write to it. Instead, public.profiles has a FK to auth.users(id)
and holds tier/role/stripe_customer_id, etc. A trigger keeps these in sync
on signup.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    # NOTE: FK to auth.users(id) is added via raw SQL in the migration because
    # auth is a Supabase-managed schema not in our ORM metadata.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(32))
    role: Mapped[str] = mapped_column(
        String(16), default="consumer", server_default=text("'consumer'"), nullable=False
    )
    tier: Mapped[str] = mapped_column(
        String(24), default="free", server_default=text("'free'"), nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    locale: Mapped[str] = mapped_column(
        String(16), default="en", server_default=text("'en'"), nullable=False
    )
    onboarding_complete: Mapped[bool] = mapped_column(
        default=False, server_default=text("false"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("role IN ('consumer','astrologer','admin')", name="profiles_role_check"),
        CheckConstraint(
            "tier IN ('free','consumer_pro','astrologer_pro','team')",
            name="profiles_tier_check",
        ),
    )
