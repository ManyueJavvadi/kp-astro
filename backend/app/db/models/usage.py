"""Daily usage counters — enforces freemium limits per user."""
from __future__ import annotations

import uuid
from datetime import date
from sqlalchemy import Date, ForeignKey, Integer, PrimaryKeyConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UsageDaily(Base):
    __tablename__ = "usage_daily"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    day: Mapped[date] = mapped_column(Date, nullable=False)

    ai_questions: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    charts_generated: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    pdf_exports: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    muhurtha_searches: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    horary_queries: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))

    __table_args__ = (PrimaryKeyConstraint("user_id", "day"),)
