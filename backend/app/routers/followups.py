"""Follow-ups — dashboard reminders. Also auto-generated from prediction windows."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone as dt_tz

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_astrologer
from app.db.base import get_db
from app.db.models.client import Client
from app.db.models.followup import Followup
from app.db.models.profile import Profile
from app.schemas.followup import (
    FollowupCreate,
    FollowupListResponse,
    FollowupOut,
    FollowupUpdate,
)

router = APIRouter()


@router.post("", response_model=FollowupOut, status_code=status.HTTP_201_CREATED)
async def create_followup(
    data: FollowupCreate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> FollowupOut:
    check = await db.execute(
        select(Client.id).where(
            and_(Client.id == data.client_id, Client.astrologer_id == user.id)
        )
    )
    if check.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Client not found")

    fu = Followup(
        astrologer_id=user.id,
        client_id=data.client_id,
        session_id=data.session_id,
        prediction_id=data.prediction_id,
        due_at=data.due_at,
        note=data.note,
        source=data.source,
    )
    db.add(fu)
    await db.commit()
    await db.refresh(fu)
    return FollowupOut.model_validate(fu)


@router.get("", response_model=FollowupListResponse)
async def list_followups(
    client_id: uuid.UUID | None = Query(default=None),
    include_completed: bool = Query(default=False),
    include_dismissed: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> FollowupListResponse:
    stmt = select(Followup).where(Followup.astrologer_id == user.id)
    if client_id:
        stmt = stmt.where(Followup.client_id == client_id)
    if not include_completed:
        stmt = stmt.where(Followup.completed_at.is_(None))
    if not include_dismissed:
        stmt = stmt.where(Followup.dismissed_at.is_(None))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(Followup.due_at.asc()))).scalars().all()

    now = datetime.now(tz=dt_tz.utc)
    overdue = sum(1 for r in rows if r.due_at < now and r.completed_at is None)
    return FollowupListResponse(
        items=[FollowupOut.model_validate(r) for r in rows],
        total=total,
        overdue=overdue,
    )


@router.put("/{followup_id}", response_model=FollowupOut)
async def update_followup(
    followup_id: uuid.UUID,
    data: FollowupUpdate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> FollowupOut:
    stmt = select(Followup).where(
        and_(Followup.id == followup_id, Followup.astrologer_id == user.id)
    )
    fu = (await db.execute(stmt)).scalar_one_or_none()
    if fu is None:
        raise HTTPException(status_code=404, detail="Followup not found")

    changes = data.model_dump(exclude_unset=True)
    if "completed" in changes:
        fu.completed_at = datetime.now(tz=dt_tz.utc) if changes["completed"] else None
    if "dismissed" in changes:
        fu.dismissed_at = datetime.now(tz=dt_tz.utc) if changes["dismissed"] else None
    if "note" in changes:
        fu.note = changes["note"]
    if "due_at" in changes:
        fu.due_at = changes["due_at"]
    await db.commit()
    await db.refresh(fu)
    return FollowupOut.model_validate(fu)


@router.delete("/{followup_id}")
async def delete_followup(
    followup_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(Followup).where(
        and_(Followup.id == followup_id, Followup.astrologer_id == user.id)
    )
    fu = (await db.execute(stmt)).scalar_one_or_none()
    if fu is None:
        raise HTTPException(status_code=404, detail="Followup not found")
    await db.delete(fu)
    await db.commit()
    return {"ok": True, "id": str(followup_id)}


@router.post("/send-due-reminders")
async def send_due_reminders(
    db: AsyncSession = Depends(get_db),
    x_cron_secret: str | None = Header(default=None),
) -> dict:
    """
    Admin / cron endpoint. Sends reminder emails for every follow-up whose
    due_at is in the past and that hasn't been reminded yet.

    Protected by a shared secret (CRON_SECRET env var). Hit daily from
    Vercel Cron / GitHub Actions / external scheduler:
        curl -X POST $API/followups/send-due-reminders \\
             -H "X-Cron-Secret: $CRON_SECRET"

    Idempotent: each follow-up only gets one reminder (we track
    `reminded_at`).
    """
    expected = os.getenv("CRON_SECRET")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=401, detail="Bad cron secret")

    from app.services.email_service import send_followup_reminder

    now = datetime.now(dt_tz.utc)
    # Pull pending follow-ups that are due and not yet reminded.
    # Gracefully handles the case where `reminded_at` column was never added.
    stmt = select(Followup, Client, Profile).join(
        Client, Client.id == Followup.client_id
    ).join(Profile, Profile.id == Followup.astrologer_id).where(
        and_(
            Followup.due_at <= now,
            Followup.completed_at.is_(None),
        )
    )
    rows = (await db.execute(stmt)).all()

    sent = 0
    for fu, client, profile in rows:
        # Skip if already reminded (if column exists)
        reminded_at = getattr(fu, "reminded_at", None)
        if reminded_at:
            continue
        # Look up astrologer email from auth — profile doesn't store email,
        # but Supabase auth.users row does. For now, rely on a stored email
        # hint if present. If no email on profile, skip.
        email = getattr(profile, "email", None) or getattr(profile, "contact_email", None)
        if not email:
            continue

        await send_followup_reminder(
            to=email,
            astrologer_name=profile.full_name or "",
            client_name=client.full_name,
            note=fu.note or "Follow up with client",
            due_date=fu.due_at.strftime("%d %b %Y"),
            client_id=str(client.id),
        )
        if hasattr(fu, "reminded_at"):
            fu.reminded_at = now
        sent += 1

    await db.commit()
    return {"ok": True, "sent": sent, "scanned": len(rows)}
