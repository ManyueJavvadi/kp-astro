"""Best-effort UsageEvent logging.

2026-06-10 tracking foundation. A thin helper so routers can append an
analytics/billing event without boilerplate. Events ride the request's
existing get_db transaction (committed on clean exit) — we do NOT flush
here, keeping logging off the response hot-path.

Design rules:
  - Best-effort: building the row must never raise into the caller. (The
    commit itself is the caller's transaction; we only guard row
    construction here.)
  - Append-only: UsageEvent has no relationships, so this never triggers
    a lazy load or the MissingGreenlet pattern.

See backend/app/db/models/usage_event.py for the known event_type values
and the PostHog-vs-Postgres split (this table holds money/compliance/
quota events; behavioral analytics go to PostHog).
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UsageEvent

_log = logging.getLogger("kp_astro.usage")


def record_event(
    db: AsyncSession,
    *,
    event_type: str,
    astrologer_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    chart_session_id: Optional[UUID] = None,
    payload: Optional[dict[str, Any]] = None,
    cost_paise: Optional[int] = None,
) -> None:
    """Queue a UsageEvent insert on the current session (commits with the
    request). Best-effort — swallows any row-construction error so
    telemetry can never break the actual endpoint.
    """
    try:
        db.add(
            UsageEvent(
                event_type=event_type,
                astrologer_id=astrologer_id,
                client_id=client_id,
                chart_session_id=chart_session_id,
                payload=payload,
                cost_paise=cost_paise,
            )
        )
    except Exception:  # noqa: BLE001 — telemetry must not break the request
        _log.warning("usage_event_skip type=%s", event_type, exc_info=True)
