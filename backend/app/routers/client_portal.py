"""/c/{portal_slug} — PUBLIC client portal endpoint.

Phase 3 Slice 1 (2026-06-02). No auth required — the URL itself is
the access token (UUID v4 = 2^128 entropy, unguessable in practice).

The astrologer shares `https://devastroai.com/c/<portal_slug>` with
their client; the client opens it on their phone and sees:
  - Their name + birth details (read-only)
  - Simplified KP snapshot: Lagna, Moon sign, Sun sign, current MD-AD
    (NOT the full chart — too overwhelming for non-astrologers per
    client-portal-spec Q1 recommendation)
  - Timeline of notes from astrologer (newest first, EXCLUDING
    notes marked is_private=true)
  - Astrologer's name + WhatsApp link for consult-back

Privacy + abuse mitigation:
  - Portal slugs are UUID v4. Brute-force enumeration is infeasible.
  - portal_enabled boolean on the client lets the astrologer revoke
    access at any time (Slice 4 adds the toggle UI).
  - Rate limiting added in Slice 4: 60 req/min per UUID, 600/min
    per IP. Not in this slice — minimal-surface-first.

What the frontend renders is driven entirely by this response shape.
Schema decisions (per spec):
  - Use English labels only for now. Telugu labels can be folded in
    Slice 4 when we wire Noto Sans Telugu in the frontend.
  - Don't expose astrologer's email or phone in raw — give a
    pre-built whatsapp_consult_url (uses E.164 phone if present).

NOT in this endpoint (intentional):
  - No bulk endpoints (one portal at a time)
  - No client_id leakage — only portal_slug appears in URLs
  - No astrologer_id leakage — sanitized to display_name only
  - No matching_opt_in or summary (those are astrologer-private)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.db.models import Astrologer, Client, ClientNote

router = APIRouter()


# ─── Response schemas ────────────────────────────────────────────────


class PortalNote(BaseModel):
    """A single note as seen by the client on their portal.

    Excludes is_private (always false in this output — we filter in
    the query). Excludes resolved/resolution_note (those are for
    astrologer's prediction tracking, not client-facing).
    """

    model_config = ConfigDict(from_attributes=True)

    text: str
    language: str  # "en" | "te" | "te_en"
    note_type: str  # "reading" | "follow_up" | "prediction" | "observation"
    created_at: datetime


class PortalKpSnapshot(BaseModel):
    """The simplified KP snapshot shown at the top of the portal page.

    NOT the full chart. Just the 3-4 things every Indian astrology
    user already knows about themselves (Lagna, Moon, Sun, current
    Mahadasha-Bhukti).

    All optional — if a client doesn't have a chart_session yet, we
    return the portal page with snapshot=None and the frontend just
    skips that section.
    """

    lagna_en: Optional[str] = None
    moon_sign_en: Optional[str] = None
    moon_nakshatra_en: Optional[str] = None
    sun_sign_en: Optional[str] = None
    current_mahadasha_lord: Optional[str] = None
    current_antardasha_lord: Optional[str] = None
    current_mahadasha_period_end: Optional[str] = None


class PortalAstrologer(BaseModel):
    """Sanitized astrologer view (for the consult-back card)."""

    display_name: Optional[str] = None
    years_practicing: Optional[int] = None
    is_verified: bool
    # Frontend uses this directly as the href. Pre-built so the client
    # can't easily reverse-engineer the astrologer's raw phone.
    whatsapp_consult_url: Optional[str] = None


class PortalResponse(BaseModel):
    """The complete payload the client's browser sees."""

    # Client identity
    client_name: str
    client_birth_date: Optional[str] = None  # "DD/MM/YYYY" or "YYYY-MM-DD"
    client_birth_time: Optional[str] = None  # "HH:MM"
    client_birth_place: Optional[str] = None
    client_gender: Optional[str] = None

    snapshot: Optional[PortalKpSnapshot] = None

    notes: list[PortalNote]

    astrologer: PortalAstrologer


# ─── Helpers ─────────────────────────────────────────────────────────


def _build_whatsapp_url(
    phone: Optional[str],
    astrologer_name: Optional[str],
) -> Optional[str]:
    """Construct a pre-filled WhatsApp deep link for consult-back.

    Phone must be E.164 (e.g., +919876543210). If absent or malformed,
    returns None — frontend hides the consult-back button entirely.
    """
    if not phone:
        return None
    # Strip non-digit chars except leading +
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if not cleaned.startswith("+"):
        # Assume India (+91) default. Best-effort; if astrologer
        # entered a 10-digit number we prepend.
        if len(cleaned) == 10:
            cleaned = "+91" + cleaned
        else:
            return None
    # WhatsApp accepts wa.me/<phone-without-plus>?text=<urlencoded>
    digits = cleaned.lstrip("+")
    greeting = (
        f"Namaste {astrologer_name},\n\nI have a follow-up question about my reading…"
        if astrologer_name
        else "Namaste, I have a follow-up question about my reading…"
    )
    return f"https://wa.me/{digits}?text={quote(greeting)}"


def _extract_snapshot(workspace_data: Optional[dict[str, Any]]) -> Optional[PortalKpSnapshot]:
    """Pull the simplified snapshot fields out of a chart_session's
    workspace_data JSONB blob.

    Defensive — workspace_data shape is the chart engine's output and
    could vary across versions. Return None if structure isn't what
    we expect.
    """
    if not workspace_data:
        return None
    wd = workspace_data
    try:
        # Lagna (ascendant sign) — engine returns either lagna_en or
        # lagna depending on the field naming era.
        lagna_en = wd.get("lagna_en") or wd.get("lagna") or None

        # Moon + Sun signs from the planets list. Each planet entry
        # has planet_en, sign_en, nakshatra_en.
        moon_sign_en = None
        moon_nakshatra_en = None
        sun_sign_en = None
        planets = wd.get("planets")
        if isinstance(planets, list):
            for p in planets:
                if not isinstance(p, dict):
                    continue
                name = (p.get("planet_en") or "").lower()
                if name == "moon":
                    moon_sign_en = p.get("sign_en") or p.get("sign")
                    moon_nakshatra_en = p.get("nakshatra_en") or p.get("nakshatra")
                elif name == "sun":
                    sun_sign_en = p.get("sign_en") or p.get("sign")

        # Current dasha state — chart engine returns current_dasha +
        # current_antardasha objects with lord_en + period_end.
        md = wd.get("current_dasha") or wd.get("mahadasha")
        ad = wd.get("current_antardasha")
        md_lord = (md or {}).get("lord_en") or (md or {}).get("lord")
        ad_lord = (ad or {}).get("lord_en") or (ad or {}).get("lord")
        md_end = (md or {}).get("end_date") or (md or {}).get("period_end")
        if isinstance(md_end, str) and len(md_end) > 10:
            md_end = md_end[:10]  # YYYY-MM-DD prefix

        return PortalKpSnapshot(
            lagna_en=lagna_en,
            moon_sign_en=moon_sign_en,
            moon_nakshatra_en=moon_nakshatra_en,
            sun_sign_en=sun_sign_en,
            current_mahadasha_lord=md_lord,
            current_antardasha_lord=ad_lord,
            current_mahadasha_period_end=md_end if isinstance(md_end, str) else None,
        )
    except Exception:
        # Defensive — if engine output doesn't match expected shape,
        # return None rather than 500. Portal still renders.
        return None


# ─── Routes ──────────────────────────────────────────────────────────


@router.get("/{portal_slug}", response_model=PortalResponse)
async def get_portal(
    portal_slug: UUID,
    db: AsyncSession = Depends(get_db),
) -> PortalResponse:
    """Public client portal endpoint. No auth.

    Returns the snapshot + visible notes for the client with this
    portal_slug. Returns 404 if slug doesn't exist OR if the
    astrologer has disabled the portal (portal_enabled=false —
    schema field for Slice 4).
    """
    # Load client + its astrologer + its most-recent chart_session
    stmt = (
        select(Client)
        .options(selectinload(Client.astrologer))
        .options(selectinload(Client.chart_sessions))
        .options(selectinload(Client.notes))
        .where(Client.portal_slug == portal_slug)
    )
    result = await db.execute(stmt)
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "portal_not_found"},
        )

    # S5 (2026-06-02, migration 0003): kill switch. When the astrologer
    # has toggled portal off, return 404 (NOT 403) so the URL looks
    # invalid from the outside — protects against "I shared the link
    # with X, why can they still see I changed my mind?" inferences.
    if not getattr(client, "portal_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "portal_not_found"},
        )

    # Pick the most-recent chart_session for the snapshot (could be
    # None if no chart computed yet)
    sessions = list(client.chart_sessions) if client.chart_sessions else []
    sessions.sort(key=lambda s: s.updated_at, reverse=True)
    latest_session = sessions[0] if sessions else None
    workspace_data = latest_session.workspace_data if latest_session else None

    # Filter notes: only is_private=false, newest first
    visible_notes = [n for n in (client.notes or []) if not n.is_private]
    visible_notes.sort(key=lambda n: n.created_at, reverse=True)

    # C10 (2026-06-02, migration 0003): per-field privacy. Missing keys
    # in portal_visibility dict default to TRUE — preserves existing
    # behavior for clients whose row was created before this feature.
    visibility = getattr(client, "portal_visibility", {}) or {}

    def _show(key: str) -> bool:
        v = visibility.get(key)
        return True if v is None else bool(v)

    return PortalResponse(
        client_name=client.name,
        client_birth_date=client.birth_date,
        client_birth_time=client.birth_time if _show("show_birth_time") else None,
        client_birth_place=(
            client.birth_place_name if _show("show_birth_place") else None
        ),
        client_gender=client.gender if _show("show_gender") else None,
        snapshot=_extract_snapshot(workspace_data),
        notes=[PortalNote.model_validate(n) for n in visible_notes],
        astrologer=PortalAstrologer(
            display_name=client.astrologer.display_name,
            years_practicing=client.astrologer.years_practicing,
            is_verified=client.astrologer.is_verified,
            whatsapp_consult_url=_build_whatsapp_url(
                phone=client.astrologer.phone,
                astrologer_name=client.astrologer.display_name,
            ),
        ),
    )
