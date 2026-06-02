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
from app.db.models import Client, ClientNote

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
    created_at: datetime
    updated_at: datetime


class NoteList(BaseModel):
    items: list[NotePublic]
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
