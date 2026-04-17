"""Client CRUD — multi-tenant, scoped by astrologer_id.

Every query filters by `Client.astrologer_id == current_user.id` on top of
Postgres RLS for defense in depth. Returns 404 (not 403) for cross-tenant
access so users can't probe for existence.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone as dt_timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_astrologer, get_current_user
from app.db.base import get_db
from app.db.models.client import Client
from app.schemas.client import (
    ClientCreate,
    ClientListItem,
    ClientListResponse,
    ClientOut,
    ClientUpdate,
)

router = APIRouter()


def _combine_to_utc(
    date_str: str, time_str: str, tz: str
) -> tuple[datetime, str]:
    """Merge YYYY-MM-DD + HH:MM[:SS] + IANA tz into a UTC datetime.

    Returns (utc_datetime, local_iso_string).
    """
    try:
        zone = ZoneInfo(tz)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {tz!r}",
        ) from e

    # Normalize time to HH:MM:SS
    parts = time_str.split(":")
    if len(parts) == 2:
        time_str = f"{time_str}:00"

    try:
        naive = datetime.fromisoformat(f"{date_str}T{time_str}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date/time: {e}",
        ) from e

    local_dt = naive.replace(tzinfo=zone)
    utc_dt = local_dt.astimezone(dt_timezone.utc)
    return utc_dt, naive.isoformat()


# ═══════════════════════════════════════════════════════════════════════
# POST /clients — create
# ═══════════════════════════════════════════════════════════════════════


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> ClientOut:
    utc_dt, local_str = _combine_to_utc(
        data.birth_date, data.birth_time, data.birth_timezone
    )

    client = Client(
        astrologer_id=user.id,
        full_name=data.full_name,
        preferred_name=data.preferred_name,
        gender=data.gender,
        phone=data.phone,
        email=str(data.email) if data.email else None,
        birth_dt_utc=utc_dt,
        birth_dt_local_str=local_str,
        birth_timezone=data.birth_timezone,
        birth_lat=data.birth_lat,
        birth_lon=data.birth_lon,
        birth_place=data.birth_place,
        tags=data.tags,
        notes_private=data.notes_private,
        relation_to_astrologer=data.relation_to_astrologer,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientOut.model_validate(client)


# ═══════════════════════════════════════════════════════════════════════
# GET /clients — paginated list with search + tag filter
# ═══════════════════════════════════════════════════════════════════════


@router.get("", response_model=ClientListResponse)
async def list_clients(
    q: Optional[str] = Query(default=None, description="Search name/phone/email/place"),
    tag: Optional[str] = Query(default=None, description="Filter by single tag"),
    include_archived: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> ClientListResponse:
    base = select(Client).where(Client.astrologer_id == user.id)
    if not include_archived:
        base = base.where(Client.is_archived.is_(False))
    if q:
        needle = f"%{q}%"
        base = base.where(
            or_(
                Client.full_name.ilike(needle),
                Client.phone.ilike(needle),
                Client.email.ilike(needle),
                Client.birth_place.ilike(needle),
            )
        )
    if tag:
        # ARRAY contains single tag
        base = base.where(text(":t = ANY(tags)").bindparams(t=tag))

    # Total count
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Page
    page_stmt = base.order_by(Client.updated_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(page_stmt)).scalars().all()

    return ClientListResponse(
        items=[ClientListItem.model_validate(r) for r in rows],
        total=total,
    )


# ═══════════════════════════════════════════════════════════════════════
# GET /clients/:id — fetch one
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> ClientOut:
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.astrologer_id == user.id)
    )
    client = (await db.execute(stmt)).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientOut.model_validate(client)


# ═══════════════════════════════════════════════════════════════════════
# PUT /clients/:id — update
# ═══════════════════════════════════════════════════════════════════════


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> ClientOut:
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.astrologer_id == user.id)
    )
    client = (await db.execute(stmt)).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k == "email" and v is not None:
            v = str(v)
        setattr(client, k, v)

    await db.commit()
    await db.refresh(client)
    return ClientOut.model_validate(client)


# ═══════════════════════════════════════════════════════════════════════
# DELETE /clients/:id — soft delete (archive)
# ═══════════════════════════════════════════════════════════════════════


@router.delete("/{client_id}")
async def archive_client(
    client_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.astrologer_id == user.id)
    )
    client = (await db.execute(stmt)).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    client.is_archived = True
    await db.commit()
    return {"ok": True, "id": str(client_id)}


# ═══════════════════════════════════════════════════════════════════════
# GET /clients/count/summary — dashboard helper
# ═══════════════════════════════════════════════════════════════════════


@router.get("/count/summary")
async def summary(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Counts for the dashboard KPI tiles. Works for any role."""
    stmt = (
        select(
            func.count().filter(Client.is_archived.is_(False)).label("active"),
            func.count().filter(Client.is_archived.is_(True)).label("archived"),
        )
        .select_from(Client)
        .where(Client.astrologer_id == user.id)
    )
    row = (await db.execute(stmt)).one()
    return {"active": row.active or 0, "archived": row.archived or 0}
