"""Pydantic schemas for Followup CRUD."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FollowupCreate(BaseModel):
    client_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    prediction_id: Optional[uuid.UUID] = None
    due_at: datetime
    note: str = Field(min_length=3, max_length=1000)
    source: str = Field(
        default="manual",
        pattern="^(manual|prediction_window|dasha_transition|session_ended|system)$",
    )


class FollowupUpdate(BaseModel):
    note: Optional[str] = None
    due_at: Optional[datetime] = None
    completed: Optional[bool] = None
    dismissed: Optional[bool] = None


class FollowupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    session_id: Optional[uuid.UUID]
    prediction_id: Optional[uuid.UUID]
    due_at: datetime
    note: str
    source: str
    completed_at: Optional[datetime]
    dismissed_at: Optional[datetime]
    created_at: datetime


class FollowupListResponse(BaseModel):
    items: list[FollowupOut]
    total: int
    overdue: int  # how many items in result are past due
