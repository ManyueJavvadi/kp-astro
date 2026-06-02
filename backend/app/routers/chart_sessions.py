"""/chart-sessions — CRUD for the astrologer's saved chart sessions.

Replaces the localStorage `devastroai:savedSessions` array. The frontend
will hit these endpoints via TanStack Query hooks (Phase 1.5).

Endpoints:
  GET    /chart-sessions               — list current astrologer's sessions
  POST   /chart-sessions               — create a new session
  GET    /chart-sessions/{id}          — read one
  PATCH  /chart-sessions/{id}          — partial update
  DELETE /chart-sessions/{id}          — delete
  POST   /chart-sessions/migrate       — bulk import from localStorage
                                          (one-time call from frontend
                                          on first login post-Phase-1)

Authorization model:
  Every endpoint requires a valid JWT. We then filter by
  `astrologer_id == current_astrologer.id` so one astrologer can never
  see/touch another's sessions. No row-level security needed at the
  Postgres layer — the app enforces it.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentAstrologer
from app.db import get_db
from app.db.models import ChartSession
from fastapi import Depends

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────


class ChartSessionBase(BaseModel):
    """Shared input fields for create/update.

    All optional on update (PATCH semantics). `name` is required on create.
    """

    name: Optional[str] = Field(default=None, max_length=200)
    client_id: Optional[UUID] = None

    birth_name: Optional[str] = Field(default=None, max_length=200)
    birth_date: Optional[str] = Field(default=None, max_length=10)
    birth_time: Optional[str] = Field(default=None, max_length=8)
    birth_ampm: Optional[str] = Field(default=None, max_length=2)
    birth_place_name: Optional[str] = Field(default=None, max_length=500)
    birth_latitude: Optional[float] = None
    birth_longitude: Optional[float] = None
    birth_timezone_offset: Optional[float] = None
    birth_gender: Optional[str] = Field(default=None, max_length=10)

    chart_data: Optional[dict[str, Any]] = None
    workspace_data: Optional[dict[str, Any]] = None
    analysis_messages: Optional[list[dict[str, Any]]] = None
    ui_state: Optional[dict[str, Any]] = None
    session_notes: Optional[str] = None


class ChartSessionCreate(ChartSessionBase):
    """POST body — name is required to render in the sidebar."""

    name: str = Field(..., max_length=200)


class ChartSessionUpdate(ChartSessionBase):
    """PATCH body — every field optional, only changed fields applied."""

    pass


class ChartSessionPublic(ChartSessionBase):
    """Response shape — includes server-set fields."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    astrologer_id: UUID
    name: str
    created_at: datetime
    updated_at: datetime


class ChartSessionList(BaseModel):
    """List response wrapper.

    Wrapper (not bare array) so we can add pagination / totals later
    without a breaking change.
    """

    items: list[ChartSessionPublic]
    total: int


class ChartSessionMigrateRequest(BaseModel):
    """POST /chart-sessions/migrate body — bulk import from localStorage.

    Frontend sends the array it has in localStorage. We dedup by
    `localstorage_id` (the client's old uuid) so re-running the migration
    is safe.

    Returns a count of imported / skipped rows.
    """

    sessions: list[ChartSessionCreate] = Field(default_factory=list)


class ChartSessionMigrateResult(BaseModel):
    imported: int
    skipped: int
    total_in_db_after: int


# ─── Helpers ──────────────────────────────────────────────────────────


async def _get_owned(
    session_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession,
) -> ChartSession:
    """Look up a chart session and verify the current astrologer owns it.

    Raises 404 if missing OR owned by someone else (don't leak existence).
    """
    stmt = select(ChartSession).where(
        ChartSession.id == session_id,
        ChartSession.astrologer_id == astrologer.id,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "chart_session_not_found"},
        )
    return row


# ─── Routes ───────────────────────────────────────────────────────────


@router.get("", response_model=ChartSessionList)
async def list_sessions(
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionList:
    """List the current astrologer's chart sessions, newest activity first."""
    stmt = (
        select(ChartSession)
        .where(ChartSession.astrologer_id == astrologer.id)
        .order_by(ChartSession.updated_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return ChartSessionList(
        items=[ChartSessionPublic.model_validate(r) for r in rows],
        total=len(rows),
    )


@router.post("", response_model=ChartSessionPublic, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: ChartSessionCreate,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionPublic:
    """Create a new chart session owned by the current astrologer."""
    row = ChartSession(
        astrologer_id=astrologer.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(row)
    await db.flush()  # populate row.id + created_at
    return ChartSessionPublic.model_validate(row)


@router.get("/{session_id}", response_model=ChartSessionPublic)
async def get_session(
    session_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionPublic:
    """Read one session by id (must be owned by current astrologer)."""
    row = await _get_owned(session_id, astrologer, db)
    return ChartSessionPublic.model_validate(row)


@router.patch("/{session_id}", response_model=ChartSessionPublic)
async def update_session(
    session_id: UUID,
    payload: ChartSessionUpdate,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionPublic:
    """Update one or more fields. Unset fields are not touched."""
    row = await _get_owned(session_id, astrologer, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(row, field, value)
    await db.flush()
    return ChartSessionPublic.model_validate(row)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a session. Idempotent — 404 if it doesn't exist."""
    row = await _get_owned(session_id, astrologer, db)
    await db.delete(row)


@router.post(
    "/migrate",
    response_model=ChartSessionMigrateResult,
    status_code=status.HTTP_201_CREATED,
)
async def migrate_sessions(
    payload: ChartSessionMigrateRequest,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionMigrateResult:
    """Bulk-import sessions from the user's localStorage.

    Idempotency: callers MAY call this multiple times. We use the
    session `name + birth_date + birth_time + birth_place_name` tuple
    as a soft-dedup key (chart sessions are uniquely identified by the
    astrologer's intent — same name + same birth = same chart). Existing
    matches are skipped so the user can re-trigger migration safely.

    Returns counts so the frontend can show "Migrated N of M (K already
    present)".
    """
    imported = 0
    skipped = 0

    # Pull existing sessions once so dedup is O(1) per candidate.
    existing_stmt = select(
        ChartSession.name,
        ChartSession.birth_date,
        ChartSession.birth_time,
        ChartSession.birth_place_name,
    ).where(ChartSession.astrologer_id == astrologer.id)
    existing_rows = (await db.execute(existing_stmt)).all()
    existing_keys = {
        (r[0], r[1] or "", r[2] or "", r[3] or "") for r in existing_rows
    }

    for s in payload.sessions:
        key = (
            s.name or "",
            s.birth_date or "",
            s.birth_time or "",
            s.birth_place_name or "",
        )
        if key in existing_keys:
            skipped += 1
            continue
        db.add(
            ChartSession(
                astrologer_id=astrologer.id,
                **s.model_dump(exclude_unset=True),
            )
        )
        existing_keys.add(key)
        imported += 1

    await db.flush()

    # Final count.
    count_stmt = select(ChartSession).where(
        ChartSession.astrologer_id == astrologer.id
    )
    total_after = len((await db.execute(count_stmt)).scalars().all())

    return ChartSessionMigrateResult(
        imported=imported,
        skipped=skipped,
        total_in_db_after=total_after,
    )
