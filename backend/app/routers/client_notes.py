"""/clients/{client_id}/notes — CRUD for astrologer-curated client notes.

Phase 3 Slice 1 (2026-06-02). Notes are the substance of the client
portal: every consultation reading, every observation, every
prediction with an expected resolution date — all surfaces here
chronologically.

Ownership model:
  - All endpoints require auth (Bearer JWT).
  - Each note belongs to a client; each client belongs to an
    astrologer. We verify the requesting astrologer owns the parent
    client before any mutation. 404 (not 403) on cross-astrologer
    access — same pattern as clients.py + chart_sessions.py.

is_private:
  - When TRUE (default): note is the astrologer's private reference,
    NEVER shown on the public /c/{slug} portal page.
  - When FALSE: note is visible on the public portal.
  - PATCH can flip the flag — astrologer can later promote a private
    observation to a public note or vice versa.

Notes are NEVER hard-deleted in v1? Wait — they ARE hard-deleted
(simpler). If we want soft-delete later we'll add a deleted_at column.

What's NOT in this slice:
  - Note attachments (photos, audio) — Phase M+
  - AI-suggested note phrasing — Phase M+
  - Notes search across clients — Phase M+

Endpoints:
  GET    /clients/{client_id}/notes              — list (full set, astrologer view)
  POST   /clients/{client_id}/notes              — create
  PATCH  /clients/{client_id}/notes/{note_id}    — update
  DELETE /clients/{client_id}/notes/{note_id}    — delete
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentAstrologer
from app.db import get_db
from app.db.models import ChartSession, Client, ClientNote

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────


class NoteBase(BaseModel):
    """Shared input fields."""

    text: Optional[str] = Field(default=None)
    language: Optional[str] = Field(default=None, pattern=r"^(en|te|te_en)$")
    note_type: Optional[str] = Field(default=None, max_length=40)
    is_private: Optional[bool] = None
    expected_resolution_date: Optional[date] = None
    resolved: Optional[bool] = None
    resolved_at: Optional[date] = None
    resolution_note: Optional[str] = None
    # Phase 2 polish (2026-06-02 migration 0002) — outcome + source
    outcome: Optional[str] = Field(
        default=None,
        pattern=r"^(pending|confirmed|partial|disconfirmed|na)$",
    )
    source: Optional[str] = Field(
        default=None,
        pattern=r"^(astrologer|ai_draft)$",
    )
    # C5 fix (2026-06-02 migration 0003) — exact link to the AI Q&A
    # this note was promoted from. Format: "<session_id>:<idx>".
    promoted_from_key: Optional[str] = Field(default=None, max_length=80)


class NoteCreate(NoteBase):
    """POST body — text is required."""

    text: str = Field(..., min_length=1)


class NoteUpdate(NoteBase):
    """PATCH body — all optional, only changed fields applied."""

    pass


class NotePublic(NoteBase):
    """Response shape, includes server-set fields."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    text: str
    language: str
    note_type: str
    is_private: bool
    # C2 hardening (2026-06-02): defaults provided here so legacy rows
    # that pre-date migration 0002 (or any deploy where the migration
    # hasn't yet applied) don't 500. Server_default in the model means
    # rows touched after the migration always have non-NULL values, but
    # the Pydantic side gives belt-and-braces safety.
    outcome: str = "na"
    source: str = "astrologer"
    promoted_from_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class NoteList(BaseModel):
    items: list[NotePublic]
    total: int


# ─── AI drafts (analysis_messages projection) ─────────────────────────


class AiDraft(BaseModel):
    """One AI Q&A from chart_session.analysis_messages, projected as
    a draft candidate for the portal-notes lane.

    NOT a DB row — we don't persist these. They're derived on every
    fetch from the immutable analysis_messages JSON column. The
    astrologer can "Make public" any draft, which creates a real
    client_note with source='ai_draft'. The draft itself stays in
    analysis_messages forever as an audit record of what the engine
    actually said at time T.

    `key` is a stable identifier for client-side dismissal/dedup
    bookkeeping (format: ``<session_id>:<message_index>``).
    """

    key: str
    session_id: UUID
    message_index: int
    question: str
    answer: str
    is_topic: bool = False
    # Best-effort timestamp — analysis_messages doesn't carry a per-
    # message timestamp today, so we fall back to the session's
    # updated_at as a reasonable proxy. Future: store per-message
    # timestamps in the JSON when the SSE stream completes.
    approx_created_at: datetime


class AiDraftList(BaseModel):
    items: list[AiDraft]
    total: int


# ─── Helpers ──────────────────────────────────────────────────────────


async def _get_owned_client_or_404(
    client_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession,
) -> Client:
    """Verify the astrologer owns this client; raise 404 if not.

    Returns the Client row so subsequent note operations can use its id.
    """
    stmt = select(Client).where(
        Client.id == client_id,
        Client.astrologer_id == astrologer.id,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "client_not_found"},
        )
    return row


async def _get_owned_note_or_404(
    client_id: UUID,
    note_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession,
) -> ClientNote:
    """Verify the note exists, belongs to the client, AND the client
    belongs to the astrologer. Two-tier ownership check."""
    # Step 1 — confirm astrologer owns the client (fails fast)
    await _get_owned_client_or_404(client_id, astrologer, db)
    # Step 2 — note exists + belongs to this client
    stmt = select(ClientNote).where(
        ClientNote.id == note_id,
        ClientNote.client_id == client_id,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "note_not_found"},
        )
    return row


# ─── Routes ──────────────────────────────────────────────────────────


@router.get("/{client_id}/notes", response_model=NoteList)
async def list_notes(
    client_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> NoteList:
    """List ALL notes for a client (both private + public)."""
    await _get_owned_client_or_404(client_id, astrologer, db)
    stmt = (
        select(ClientNote)
        .where(ClientNote.client_id == client_id)
        .order_by(ClientNote.created_at.desc())
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return NoteList(
        items=[NotePublic.model_validate(r) for r in rows],
        total=len(rows),
    )


@router.post(
    "/{client_id}/notes",
    response_model=NotePublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    client_id: UUID,
    payload: NoteCreate,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> NotePublic:
    """Create a new note on a client."""
    await _get_owned_client_or_404(client_id, astrologer, db)
    row = ClientNote(
        client_id=client_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(row)
    await db.flush()
    return NotePublic.model_validate(row)


@router.patch(
    "/{client_id}/notes/{note_id}",
    response_model=NotePublic,
)
async def update_note(
    client_id: UUID,
    note_id: UUID,
    payload: NoteUpdate,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> NotePublic:
    """Update one or more fields of a note. Unset fields untouched."""
    row = await _get_owned_note_or_404(client_id, note_id, astrologer, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(row, field, value)
    await db.flush()
    # 2026-06-08 audit fix (P1): same MissingGreenlet bug class fixed in
    # chart_sessions.update_session (commit 0988654). NotePublic declares
    # updated_at, so model_validate reads row.updated_at, which flush()
    # just expired via TimestampMixin's onupdate=func.now(); the sync read
    # would lazy-load outside the greenlet → 500. Every note PATCH (edit
    # text, flip is_private to publish/unpublish on the portal, mark
    # prediction outcome) was failing. refresh() repopulates first.
    await db.refresh(row)
    return NotePublic.model_validate(row)


@router.delete(
    "/{client_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_note(
    client_id: UUID,
    note_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Hard-delete a note. Idempotent — 404 if it doesn't exist."""
    row = await _get_owned_note_or_404(client_id, note_id, astrologer, db)
    await db.delete(row)


# ─── AI drafts endpoint ──────────────────────────────────────────────


@router.get("/{client_id}/ai-drafts", response_model=AiDraftList)
async def list_ai_drafts(
    client_id: UUID,
    astrologer: CurrentAstrologer,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> AiDraftList:
    """List every AI Q&A asked for this client, projected as draft
    candidates for the portal notes lane.

    Architecture (Project, per master plan discussion 2026-06-02):
    we do NOT duplicate Q&As into client_notes when they happen.
    chart_session.analysis_messages stays the immutable source of
    truth — every question the astrologer ever asked + every answer
    the engine ever returned, full audit trail. This endpoint projects
    that data into draft items the portal admin UI can show alongside
    curated notes; the astrologer chooses which to promote into real
    public notes via POST /clients/{id}/notes (with source='ai_draft').

    Returns newest-first. Drafts that have already been promoted into
    a client_note row are NOT filtered out here — the frontend cross-
    references by the exact `client_notes.promoted_from_key` column
    (migration 0003) to avoid duplicates in the UI. The lane shows a
    green "Published" badge on promoted drafts instead of Make-public
    buttons.
    """
    await _get_owned_client_or_404(client_id, astrologer, db)

    # P0-2 fix (deep-scan-2): SELECT only the three columns we need.
    # Previously hydrated the whole ChartSession row including the giant
    # workspace_data JSONB — for a chatty astrologer one portal admin
    # open shuffled MB of unused JSONB across the wire.
    stmt = (
        select(
            ChartSession.id,
            ChartSession.updated_at,
            ChartSession.analysis_messages,
        )
        .where(ChartSession.client_id == client_id)
        .order_by(ChartSession.updated_at.desc())
    )
    rows = list((await db.execute(stmt)).all())

    items: list[AiDraft] = []
    for row in rows:
        # Row is a tuple of (id, updated_at, analysis_messages)
        sess_id, sess_updated_at, messages = row
        if not isinstance(messages, list):
            # Defensive: legacy rows might have garbage; skip silently.
            continue
        for idx, msg in enumerate(messages):
            if not isinstance(msg, dict):
                continue
            q = msg.get("q") or msg.get("question") or ""
            a = msg.get("a") or msg.get("answer") or ""
            if not q or not a:
                continue
            items.append(
                AiDraft(
                    key=f"{sess_id}:{idx}",
                    session_id=sess_id,
                    message_index=idx,
                    question=str(q),
                    answer=str(a),
                    is_topic=bool(msg.get("isTopic", False)),
                    approx_created_at=sess_updated_at,
                )
            )

    # Newest first — most recent session's last message at the top.
    # Within a session, later messages were asked later; reverse the
    # index-ascending insertion so head-of-list is freshest.
    items.reverse()

    # C3 fix (2026-06-02): paginate. A chatty astrologer with 50
    # sessions × 30 Q&As could send a single multi-MB response;
    # cap-by-default keeps the portal admin page snappy.
    limit_b = max(1, min(int(limit), 200))
    offset_b = max(0, int(offset))
    total = len(items)
    items = items[offset_b : offset_b + limit_b]

    return AiDraftList(items=items, total=total)
