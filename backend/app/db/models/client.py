"""Client model — a person the astrologer is reading for.

One row per real-world person. Many ChartSessions can reference the same
Client (e.g., birth chart + horary at different times for the same
person — though horary usually goes against the astrologer, not a client).

Birth details live HERE (not on ChartSession) because the same person
has the same birth data forever. Time-of-event data (horary moment,
muhurtha event window) lives on ChartSession instead.

Phase M (matching network) opt-in toggle lives here. When TRUE, this
client's chart enters the cross-astrologer KP compatibility pool. Per
the matching spec, NO client data ever crosses astrologer boundaries
— only chart math runs in the background batch job.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from .astrologer import Astrologer
    from .chart_session import ChartSession
    from .client_note import ClientNote


class Client(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "clients"

    astrologer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("astrologers.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ─── Identity (the bare minimum to render a profile) ──────────────
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Optional contact info — astrologers may store these to enable
    # WhatsApp deep-links from client portal pages.
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    email: Mapped[Optional[str]] = mapped_column(String(320))
    gender: Mapped[Optional[str]] = mapped_column(
        String(10),
        comment="One of: male, female (or empty). Loose by design — KP "
        "compatibility uses 'opposite gender' filter so we keep this "
        "denormalized as a string instead of an enum.",
    )

    # ─── Birth data (immutable for this person — never edit retroactively
    #     except for rectification, where audit log captures the change) ─
    birth_date: Mapped[Optional[str]] = mapped_column(
        String(10),
        comment="YYYY-MM-DD (string for timezone-flexible chart engine "
        "input — engine resolves to UTC instant internally).",
    )
    birth_time: Mapped[Optional[str]] = mapped_column(
        String(8),
        comment="HH:MM:SS local civil time, 24h. Empty until rectified.",
    )
    birth_place_name: Mapped[Optional[str]] = mapped_column(String(500))
    birth_latitude: Mapped[Optional[float]] = mapped_column()
    birth_longitude: Mapped[Optional[float]] = mapped_column()
    birth_timezone_offset: Mapped[Optional[float]] = mapped_column(
        comment="Hours from UTC, e.g. 5.5 for IST. Historical DST "
        "resolved server-side by the chart engine.",
    )

    # ─── Phase M opt-in (matching network) ────────────────────────────
    # Default FALSE — astrologers must explicitly opt clients in AFTER
    # getting written consent (per matching spec). Adding this column
    # NOW (before Phase M ships) is free and saves a retrofit migration.
    matching_opt_in: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        comment="Per Phase M matching network spec — client consents to "
        "appear in cross-astrologer KP compatibility scans. No PII ever "
        "crosses astrologer boundaries; only chart math runs.",
    )

    # ─── Client portal page (the killer differentiator) ───────────────
    # Each client gets a public read-only portal URL: /c/<portal_slug>
    # We use a separate slug column (not the row's UUID id) so:
    #   (a) astrologers can regenerate the URL if leaked
    #   (b) future analytics on portal opens don't conflate with internal IDs
    # Slug is a fresh UUID v4 cast to string — 2^128 entropy, not
    # enumerable, matches privacy spec.
    portal_slug: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
        # CRITICAL: server_default must be declared on the model (not
        # just in the migration) so SQLAlchemy knows to fetch the
        # value via RETURNING after INSERT. Without it, row.portal_slug
        # is None after db.flush(), and ClientPublic's UUID validation
        # fails → 500 in response serialization. (Bug discovered
        # 2026-06-02 — every POST /clients failed silently until the
        # CORS hardening unmasked the 500.)
        server_default=func.gen_random_uuid(),
        comment="Public client portal URL slug — /c/<portal_slug>. "
        "Regeneratable via /clients/{id}/regenerate-portal endpoint.",
    )

    # ─── Astrologer-private notes summary (free-form, NOT for portal) ──
    # Lives here for quick read; full timeline lives in client_notes table.
    summary: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="Astrologer's private TL;DR summary of this client. "
        "Never shown on the public client portal page.",
    )

    # ─── Relationships ────────────────────────────────────────────────
    astrologer: Mapped["Astrologer"] = relationship(back_populates="clients")
    chart_sessions: Mapped[list["ChartSession"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    notes: Mapped[list["ClientNote"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    __table_args__ = (
        # Common query: list clients for one astrologer. Composite index
        # so we don't need a sort step in Postgres.
        Index(
            "ix_clients_astrologer_id_created_at",
            "astrologer_id",
            "created_at",
        ),
        # Phase M batch job: scan opt-in clients by gender + birth year.
        # Partial index keeps it small (most clients won't opt in).
        Index(
            "ix_clients_matching_opt_in_true",
            "gender",
            "birth_date",
            postgresql_where="matching_opt_in = true",
        ),
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r}>"
