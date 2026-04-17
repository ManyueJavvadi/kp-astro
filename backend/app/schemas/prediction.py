"""Pydantic schemas for Prediction CRUD + accuracy tracking."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PredictionCreate(BaseModel):
    client_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    prediction_text: str = Field(min_length=3, max_length=2000)
    domain: str = Field(
        pattern="^(career|marriage|health|finance|education|travel|foreign|property|children|litigation|spiritual|other)$"
    )
    target_window_start: Optional[date] = None
    target_window_end: Optional[date] = None
    kp_basis: Optional[dict] = None


class PredictionUpdate(BaseModel):
    outcome: Optional[str] = Field(
        default=None, pattern="^(pending|correct|partial|wrong|unverifiable)$"
    )
    outcome_notes: Optional[str] = None


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    session_id: Optional[uuid.UUID]
    prediction_text: str
    domain: str
    target_window_start: Optional[date]
    target_window_end: Optional[date]
    kp_basis: Optional[dict]
    outcome: str
    outcome_notes: Optional[str]
    outcome_recorded_at: Optional[datetime]
    created_at: datetime


class PredictionListResponse(BaseModel):
    items: list[PredictionOut]
    total: int


class AccuracyByDomain(BaseModel):
    domain: str
    total: int
    correct: int
    partial: int
    wrong: int
    pending: int
    accuracy_pct: float  # (correct + 0.5 * partial) / verified × 100


class AccuracySummary(BaseModel):
    total: int
    correct: int
    partial: int
    wrong: int
    pending: int
    unverifiable: int
    accuracy_pct: float
    by_domain: list[AccuracyByDomain]
