"""/me — current astrologer profile endpoints (Phase 1).

GET  /me            — return the authenticated astrologer's row
                      (provisions on first call)
PATCH /me           — update profile fields (display_name, bio,
                      photo_url, phone, years_practicing, default_language)

The first call from a fresh user provisions the row implicitly via
get_current_astrologer dependency. So the frontend can hit GET /me
right after signup and get a populated record back without an explicit
"create my profile" step.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentAstrologer
from app.db import get_db

router = APIRouter()


# ─── Response schema ──────────────────────────────────────────────────


class AstrologerPublic(BaseModel):
    """Astrologer profile as returned to the frontend.

    Excludes Supabase-internal fields (supabase_user_id) and any
    pre-launch private fields. If we ever expose this to the public
    client portal page, we filter it further.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: Optional[str]
    bio: Optional[str]
    photo_url: Optional[str]
    phone: Optional[str]
    years_practicing: Optional[int]
    is_verified: bool
    default_language: str
    onboarded_at: Optional[date]
    created_at: datetime
    updated_at: datetime


class AstrologerUpdate(BaseModel):
    """Fields the astrologer can update via PATCH /me.

    All optional. Email + supabase_user_id are NOT editable here — email
    changes go through Supabase Auth (separate flow), and supabase_user_id
    is system-managed.
    """

    display_name: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=4000)
    photo_url: Optional[str] = Field(default=None, max_length=2048)
    phone: Optional[str] = Field(default=None, max_length=20)
    years_practicing: Optional[int] = Field(default=None, ge=0, le=100)
    default_language: Optional[str] = Field(default=None, pattern=r"^(en|te|te_en)$")


# ─── Routes ───────────────────────────────────────────────────────────


@router.get("", response_model=AstrologerPublic)
async def get_me(astrologer: CurrentAstrologer) -> AstrologerPublic:
    """Return the current astrologer's profile.

    Provisions the DB row on first request (lazy first-touch). Subsequent
    calls are a single indexed lookup by supabase_user_id (sub-millisecond).
    """
    return AstrologerPublic.model_validate(astrologer)


@router.patch("", response_model=AstrologerPublic)
async def update_me(
    payload: AstrologerUpdate,
    astrologer: CurrentAstrologer,
    db: AsyncSession = Depends(get_db),
) -> AstrologerPublic:
    """Update one or more profile fields.

    `exclude_unset=True` is the key — clients send only the fields they
    want to change, and we don't accidentally null out the rest.
    """
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(astrologer, field, value)

    # P1-8 (deep-scan-2): explicit flush + refresh of updated_at so
    # the response contains the FRESH timestamp (Postgres-side
    # onupdate=func.now()). Without this, the in-memory ORM object
    # carries the pre-update value until next read, and the frontend's
    # "last updated" indicator shows a stale time.
    await db.flush()
    await db.refresh(astrologer, ["updated_at"])

    return AstrologerPublic.model_validate(astrologer)
