"""Consultation sessions — create, list, summarize, complete."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone as dt_tz

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_astrologer
from app.db.base import get_db
from app.db.models.client import Client
from app.db.models.session_ import Session
from app.schemas.session_ import (
    SessionCreate,
    SessionListResponse,
    SessionOut,
    SessionSummarizeRequest,
    SessionUpdate,
)

router = APIRouter()


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    # Ensure client belongs to this astrologer
    client_check = await db.execute(
        select(Client.id).where(
            and_(Client.id == data.client_id, Client.astrologer_id == user.id)
        )
    )
    if client_check.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Client not found")

    now = datetime.now(tz=dt_tz.utc)
    scheduled = data.scheduled_at or now
    started = now if data.scheduled_at is None else None
    status_ = "in_progress" if started else "scheduled"

    sess = Session(
        client_id=data.client_id,
        astrologer_id=user.id,
        session_type=data.session_type,
        scheduled_at=scheduled,
        started_at=started,
        status=status_,
        query_text=data.query_text,
        horary_number=data.horary_number,
    )
    db.add(sess)
    # Bump client's last_seen_at when starting a walk-in
    if started:
        upd = await db.execute(select(Client).where(Client.id == data.client_id))
        c = upd.scalar_one()
        c.last_seen_at = now
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    client_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    stmt = select(Session).where(Session.astrologer_id == user.id)
    if client_id:
        stmt = stmt.where(Session.client_id == client_id)
    if status_filter:
        stmt = stmt.where(Session.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(Session.scheduled_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return SessionListResponse(
        items=[SessionOut.model_validate(r) for r in rows],
        total=total,
    )


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    stmt = select(Session).where(
        and_(Session.id == session_id, Session.astrologer_id == user.id)
    )
    sess = (await db.execute(stmt)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionOut.model_validate(sess)


@router.put("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: uuid.UUID,
    data: SessionUpdate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    stmt = select(Session).where(
        and_(Session.id == session_id, Session.astrologer_id == user.id)
    )
    sess = (await db.execute(stmt)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sess, k, v)
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@router.post("/{session_id}/end", response_model=SessionOut)
async def end_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    stmt = select(Session).where(
        and_(Session.id == session_id, Session.astrologer_id == user.id)
    )
    sess = (await db.execute(stmt)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(tz=dt_tz.utc)
    sess.ended_at = now
    if sess.started_at:
        delta = (now - sess.started_at).total_seconds() / 60.0
        sess.duration_minutes = int(delta)
    sess.status = "completed"
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@router.post("/{session_id}/summarize", response_model=SessionOut)
async def summarize_session(
    session_id: uuid.UUID,
    data: SessionSummarizeRequest,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """AI-summarize a session transcript using Claude."""
    stmt = select(Session).where(
        and_(Session.id == session_id, Session.astrologer_id == user.id)
    )
    sess = (await db.execute(stmt)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Lazy import to avoid loading anthropic at module init
    from app.services.llm_service import client as anth_client

    try:
        resp = anth_client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize this astrology consultation in 3-5 sentences. "
                        "Capture (1) what the client asked, (2) what the astrologer "
                        "analyzed (specific KP terms: Sub Lord, houses, dashas), and "
                        "(3) what was predicted or recommended. Write in concise English.\n\n"
                        f"TRANSCRIPT:\n{data.transcript}"
                    ),
                }
            ],
        )
        summary = resp.content[0].text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI summarization failed: {e}")

    sess.transcript = data.transcript
    sess.ai_summary = summary
    await db.commit()
    await db.refresh(sess)

    # Fire-and-forget email with the summary. Env-gated, so no-op in dev.
    try:
        client_row = (
            await db.execute(select(Client).where(Client.id == sess.client_id))
        ).scalar_one_or_none()
        if client_row and user.email:
            from app.services.email_service import send_session_summary
            await send_session_summary(
                to=user.email,
                astrologer_name=user.full_name or "",
                client_name=client_row.full_name,
                summary_md=summary,
                session_id=str(sess.id),
            )
    except Exception:  # noqa: BLE001
        # Email failures should never break the API response.
        pass

    return SessionOut.model_validate(sess)


@router.delete("/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(Session).where(
        and_(Session.id == session_id, Session.astrologer_id == user.id)
    )
    sess = (await db.execute(stmt)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(sess)
    await db.commit()
    return {"ok": True, "id": str(session_id)}
