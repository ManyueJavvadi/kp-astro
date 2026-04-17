"""Pydantic schemas for Client CRUD."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClientCreate(BaseModel):
    """Request body for POST /clients.

    Birth data comes from the form as separate date/time/tz; the backend
    derives birth_dt_utc from them.
    """

    full_name: str = Field(min_length=1, max_length=200)
    preferred_name: Optional[str] = None
    gender: Optional[str] = Field(
        default=None, pattern="^(male|female|other|unspecified)$"
    )
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None

    # Birth data (raw from form)
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    birth_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")  # HH:MM or HH:MM:SS
    birth_timezone: str = Field(
        min_length=2, max_length=48
    )  # IANA, e.g. "Asia/Kolkata"
    birth_lat: float = Field(ge=-90, le=90)
    birth_lon: float = Field(ge=-180, le=180)
    birth_place: str = Field(min_length=1, max_length=300)

    # Optional
    tags: list[str] = Field(default_factory=list)
    notes_private: Optional[str] = None
    relation_to_astrologer: Optional[str] = Field(default=None, max_length=32)


class ClientUpdate(BaseModel):
    """Request body for PUT /clients/:id. All fields optional."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    preferred_name: Optional[str] = None
    gender: Optional[str] = Field(
        default=None, pattern="^(male|female|other|unspecified)$"
    )
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None
    tags: Optional[list[str]] = None
    notes_private: Optional[str] = None
    relation_to_astrologer: Optional[str] = Field(default=None, max_length=32)


class ClientOut(BaseModel):
    """Response body for GET/POST /clients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    preferred_name: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    birth_dt_utc: datetime
    birth_dt_local_str: str
    birth_timezone: str
    birth_lat: float
    birth_lon: float
    birth_place: str
    tags: list[str]
    notes_private: Optional[str]
    relation_to_astrologer: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    last_seen_at: Optional[datetime]


class ClientListItem(BaseModel):
    """Compact shape for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    preferred_name: Optional[str]
    gender: Optional[str]
    birth_place: str
    tags: list[str]
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime
    last_seen_at: Optional[datetime]
    is_archived: bool


class ClientListResponse(BaseModel):
    items: list[ClientListItem]
    total: int
