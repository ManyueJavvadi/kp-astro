"""AuditLog model — security + compliance trail.

Different from UsageEvent (which tracks billable + analytics activity):
AuditLog records security-significant actions:

  - Astrologer login / logout / password reset
  - Permission changes (matching_opt_in toggled on a client)
  - Data exports (PDF generation, all-clients export)
  - Subscription state changes (plan upgrade, cancel)
  - Client portal page accessed (anonymous + IP-hashed)
  - Razorpay webhook received (with signature verification result)

Why separate from UsageEvent:
  - Different retention policy possible (audit must be kept longer for
    compliance; usage events can be aggregated + pruned)
  - Different access pattern (we rarely query audit logs unless
    investigating an incident; usage events are read for dashboards)
  - Different schema rigor (audit requires actor + ip + ua details)

Designed for low write volume: only events worth keeping for security.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class AuditLog(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "audit_log"

    # ─── Actor (may be null for anonymous events like portal opens) ───
    astrologer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("astrologers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ─── Action ───────────────────────────────────────────────────────
    # Loose string. Convention: snake_case verb. Examples:
    #   'login_success', 'login_failure', 'password_reset_requested',
    #   'password_reset_completed', 'matching_opt_in_toggled',
    #   'client_portal_accessed', 'subscription_canceled',
    #   'razorpay_webhook_received', 'pdf_exported', 'account_deleted'
    action: Mapped[str] = mapped_column(String(80), nullable=False)

    # ─── Target (the thing acted on, if any) ──────────────────────────
    target_type: Mapped[Optional[str]] = mapped_column(
        String(40),
        comment="e.g. 'client', 'subscription', 'chart_session'",
    )
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    # ─── Request context ──────────────────────────────────────────────
    # IP is hashed (not stored raw) for privacy. UA truncated.
    ip_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        comment="SHA-256 of (IP || daily-salt). Re-identifiable only "
        "within ~24h window for incident investigation.",
    )
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    request_id: Mapped[Optional[str]] = mapped_column(
        String(40),
        comment="Cross-reference with main.py RequestIdMiddleware's "
        "X-Request-ID header for log correlation.",
    )

    # ─── Detail ───────────────────────────────────────────────────────
    detail: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)

    __table_args__ = (
        Index("ix_audit_log_astrologer_created", "astrologer_id", "created_at"),
        Index("ix_audit_log_action_created", "action", "created_at"),
        Index("ix_audit_log_target", "target_type", "target_id"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action}>"
