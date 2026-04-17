"""Organizations + org members — for the Team tier (future)."""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(
        String(16), default="solo", server_default=text("'solo'"), nullable=False
    )
    seat_count: Mapped[int] = mapped_column(default=1, server_default=text("1"), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("plan IN ('solo','team','enterprise')", name="orgs_plan_check"),
    )


class OrgMember(Base):
    __tablename__ = "org_members"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('owner','admin','astrologer','assistant')",
            name="org_members_role_check",
        ),
    )
