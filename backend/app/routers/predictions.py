"""Predictions CRUD + accuracy scoreboard. The USP of the platform."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone as dt_tz

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_astrologer
from app.db.base import get_db
from app.db.models.client import Client
from app.db.models.prediction import Prediction
from app.schemas.prediction import (
    AccuracyByDomain,
    AccuracySummary,
    PredictionCreate,
    PredictionListResponse,
    PredictionOut,
    PredictionUpdate,
)

router = APIRouter()


@router.post("", response_model=PredictionOut, status_code=status.HTTP_201_CREATED)
async def create_prediction(
    data: PredictionCreate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> PredictionOut:
    # Verify client ownership
    check = await db.execute(
        select(Client.id).where(
            and_(Client.id == data.client_id, Client.astrologer_id == user.id)
        )
    )
    if check.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Client not found")

    pred = Prediction(
        astrologer_id=user.id,
        client_id=data.client_id,
        session_id=data.session_id,
        prediction_text=data.prediction_text,
        domain=data.domain,
        target_window_start=data.target_window_start,
        target_window_end=data.target_window_end,
        kp_basis=data.kp_basis,
    )
    db.add(pred)
    await db.commit()
    await db.refresh(pred)
    return PredictionOut.model_validate(pred)


@router.get("", response_model=PredictionListResponse)
async def list_predictions(
    client_id: uuid.UUID | None = Query(default=None),
    outcome: str | None = Query(default=None),
    domain: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> PredictionListResponse:
    stmt = select(Prediction).where(Prediction.astrologer_id == user.id)
    if client_id:
        stmt = stmt.where(Prediction.client_id == client_id)
    if outcome:
        stmt = stmt.where(Prediction.outcome == outcome)
    if domain:
        stmt = stmt.where(Prediction.domain == domain)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(Prediction.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return PredictionListResponse(
        items=[PredictionOut.model_validate(r) for r in rows],
        total=total,
    )


@router.put("/{prediction_id}", response_model=PredictionOut)
async def update_prediction(
    prediction_id: uuid.UUID,
    data: PredictionUpdate,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> PredictionOut:
    stmt = select(Prediction).where(
        and_(Prediction.id == prediction_id, Prediction.astrologer_id == user.id)
    )
    pred = (await db.execute(stmt)).scalar_one_or_none()
    if pred is None:
        raise HTTPException(status_code=404, detail="Prediction not found")

    changes = data.model_dump(exclude_unset=True)
    outcome_changed = "outcome" in changes and changes["outcome"] != pred.outcome
    for k, v in changes.items():
        setattr(pred, k, v)
    if outcome_changed and changes.get("outcome") != "pending":
        pred.outcome_recorded_at = datetime.now(tz=dt_tz.utc)
    await db.commit()
    await db.refresh(pred)
    return PredictionOut.model_validate(pred)


@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(Prediction).where(
        and_(Prediction.id == prediction_id, Prediction.astrologer_id == user.id)
    )
    pred = (await db.execute(stmt)).scalar_one_or_none()
    if pred is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    await db.delete(pred)
    await db.commit()
    return {"ok": True, "id": str(prediction_id)}


@router.get("/accuracy/summary", response_model=AccuracySummary)
async def accuracy_summary(
    user: CurrentUser = Depends(get_current_astrologer),
    db: AsyncSession = Depends(get_db),
) -> AccuracySummary:
    """Overall accuracy + per-domain breakdown. Drives the dashboard scoreboard."""
    # Totals
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Prediction.outcome == "correct", 1), else_=0)).label("correct"),
            func.sum(case((Prediction.outcome == "partial", 1), else_=0)).label("partial"),
            func.sum(case((Prediction.outcome == "wrong", 1), else_=0)).label("wrong"),
            func.sum(case((Prediction.outcome == "pending", 1), else_=0)).label("pending"),
            func.sum(case((Prediction.outcome == "unverifiable", 1), else_=0)).label("unverifiable"),
        ).where(Prediction.astrologer_id == user.id)
    )
    row = result.one()
    total = row.total or 0
    correct = row.correct or 0
    partial = row.partial or 0
    wrong = row.wrong or 0
    pending = row.pending or 0
    unverifiable = row.unverifiable or 0
    verified = correct + partial + wrong
    pct = ((correct + 0.5 * partial) / verified * 100) if verified > 0 else 0

    # Per domain
    dom_result = await db.execute(
        select(
            Prediction.domain,
            func.count().label("total"),
            func.sum(case((Prediction.outcome == "correct", 1), else_=0)).label("correct"),
            func.sum(case((Prediction.outcome == "partial", 1), else_=0)).label("partial"),
            func.sum(case((Prediction.outcome == "wrong", 1), else_=0)).label("wrong"),
            func.sum(case((Prediction.outcome == "pending", 1), else_=0)).label("pending"),
        )
        .where(Prediction.astrologer_id == user.id)
        .group_by(Prediction.domain)
    )
    by_domain = []
    for dr in dom_result.all():
        d_correct = dr.correct or 0
        d_partial = dr.partial or 0
        d_wrong = dr.wrong or 0
        d_verified = d_correct + d_partial + d_wrong
        d_pct = (
            ((d_correct + 0.5 * d_partial) / d_verified * 100) if d_verified > 0 else 0
        )
        by_domain.append(
            AccuracyByDomain(
                domain=dr.domain,
                total=dr.total or 0,
                correct=d_correct,
                partial=d_partial,
                wrong=d_wrong,
                pending=dr.pending or 0,
                accuracy_pct=round(d_pct, 1),
            )
        )

    return AccuracySummary(
        total=total,
        correct=correct,
        partial=partial,
        wrong=wrong,
        pending=pending,
        unverifiable=unverifiable,
        accuracy_pct=round(pct, 1),
        by_domain=sorted(by_domain, key=lambda d: d.total, reverse=True),
    )
