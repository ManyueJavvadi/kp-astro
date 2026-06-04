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


def _session_to_public(row: ChartSession) -> ChartSessionPublic:
    """Build ChartSessionPublic explicitly from a ChartSession row.

    2026-06-03 fix (user reported PATCH 500): switched from
    `ChartSessionPublic.model_validate(row)` (from_attributes=True) to
    an explicit constructor. Same class of bug we fixed for
    `_client_to_public` in clients.py — when Pydantic introspects the
    SQLAlchemy row, it can incidentally access relationship attributes
    (`row.astrologer`, `row.client`), and depending on the load state
    those raise / require an extra round trip and the response throws.

    The frontend reports every save attempt returns 500 with
    `internal_server_error`. Console traces showed the save firing
    correctly; the body was being PATCHed; the row was being mutated;
    but the response serialization failed. Explicit scalar-only mapping
    sidesteps the problem the same way clients.py did.

    NB: if any of these column fields is renamed/removed in a future
    migration, update here. Pydantic won't auto-detect the drift.
    """
    return ChartSessionPublic(
        id=row.id,
        astrologer_id=row.astrologer_id,
        client_id=row.client_id,
        name=row.name,
        birth_name=row.birth_name,
        birth_date=row.birth_date,
        birth_time=row.birth_time,
        birth_ampm=row.birth_ampm,
        birth_place_name=row.birth_place_name,
        birth_latitude=row.birth_latitude,
        birth_longitude=row.birth_longitude,
        birth_timezone_offset=row.birth_timezone_offset,
        birth_gender=row.birth_gender,
        chart_data=row.chart_data,
        workspace_data=row.workspace_data,
        analysis_messages=row.analysis_messages,
        ui_state=row.ui_state,
        session_notes=row.session_notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ─── Routes ───────────────────────────────────────────────────────────


@router.get("", response_model=ChartSessionList)
async def list_sessions(
    astrologer: CurrentAstrologer,
    client_id: Optional[UUID] = None,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionList:
    """List the current astrologer's chart sessions, newest activity first.

    Query params (all optional):
      client_id  — filter to one client's sessions (C8 fix: per-client
                   workspace pages no longer re-read the entire roster)
      limit      — page size, 1-500 (default 200)
      offset     — pagination
    """
    limit_b = max(1, min(int(limit), 500))
    offset_b = max(0, int(offset))

    base_where = [ChartSession.astrologer_id == astrologer.id]
    if client_id is not None:
        base_where.append(ChartSession.client_id == client_id)

    # Total count for pagination header
    from sqlalchemy import func as _func
    total_stmt = select(_func.count(ChartSession.id)).where(*base_where)
    total = int((await db.execute(total_stmt)).scalar() or 0)

    stmt = (
        select(ChartSession)
        .where(*base_where)
        .order_by(ChartSession.updated_at.desc())
        .offset(offset_b)
        .limit(limit_b)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return ChartSessionList(
        items=[_session_to_public(r) for r in rows],
        total=total,
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
    return _session_to_public(row)


@router.get("/{session_id}", response_model=ChartSessionPublic)
async def get_session(
    session_id: UUID,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> ChartSessionPublic:
    """Read one session by id (must be owned by current astrologer)."""
    row = await _get_owned(session_id, astrologer, db)
    return _session_to_public(row)


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
    return _session_to_public(row)


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
    # P0-6 fix (deep-scan-2): use func.count() instead of loading every
    # row to call len(). Old code hauled the entire ChartSession table
    # (including workspace_data JSONB columns) into Python memory just
    # to take its length — OOM bomb when the astrologer's legacy list
    # was large.
    from sqlalchemy import func as _func
    count_stmt = select(_func.count(ChartSession.id)).where(
        ChartSession.astrologer_id == astrologer.id
    )
    total_after = int((await db.execute(count_stmt)).scalar() or 0)

    return ChartSessionMigrateResult(
        imported=imported,
        skipped=skipped,
        total_in_db_after=total_after,
    )
