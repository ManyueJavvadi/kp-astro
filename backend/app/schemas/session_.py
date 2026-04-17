"""Pydantic schemas for Session CRUD."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    client_id: uuid.UUID
    session_type: str = Field(pattern="^(natal|horary|transit|muhurtha|marriage|followup|walkin)$")
    scheduled_at: Optional[datetime] = None  # null = start right now (walkin)
    query_text: Optional[str] = None
    horary_number: Optional[int] = Field(default=None, ge=1, le=249)


class SessionUpdate(BaseModel):
    query_text: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    fee_charged: Optional[float] = None
    is_paid: Optional[bool] = None
    status: Optional[str] = Field(
        default=None, pattern="^(scheduled|in_progress|completed|cancelled|no_show)$"
    )


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    session_type: str
    scheduled_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_minutes: Optional[int]
    status: str
    query_text: Optional[str]
    horary_number: Optional[int]
    summary: Optional[str]
    transcript: Optional[str]
    ai_summary: Optional[str]
    fee_charged: Optional[float]
    currency: str
    is_paid: bool
    created_at: datetime
    updated_at: datetime


class SessionSummarizeRequest(BaseModel):
    transcript: str = Field(min_length=10)


class SessionListResponse(BaseModel):
    items: list[SessionOut]
    total: int
