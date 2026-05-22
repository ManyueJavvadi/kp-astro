"""
Timezone resolution from geographic coordinates.
Uses timezonefinder (offline, pure Python) + zoneinfo (stdlib).
Singleton pattern — TimezoneFinder loads shape data on first init.
"""
from timezonefinder import TimezoneFinder
from zoneinfo import ZoneInfo
from datetime import datetime, timezone
from typing import Optional, Tuple
import logging

_tf: Optional[TimezoneFinder] = None
_log = logging.getLogger("timezone_utils")


def _get_tf() -> TimezoneFinder:
    global _tf
    if _tf is None:
        _tf = TimezoneFinder()
    return _tf


def resolve_timezone(lat: float, lon: float, target_date: Optional[datetime] = None) -> Tuple[float, str]:
    """
    Given lat/lon, return (utc_offset_hours, iana_tz_name).
    Handles DST and half-hour offsets (India +5.5, Nepal +5.75).
    Falls back to (0.0, "UTC") for ocean coordinates.

    `target_date` must be in UTC (or naive — assumed UTC). The local
    offset is computed at THIS moment, so historical DST is handled
    automatically (e.g. California in Oct 2000 → PDT/UTC-7, Russia
    pre-2011 still uses DST, Indiana pre-2006 has no DST, etc.).
    """
    tf = _get_tf()
    tz_name = tf.timezone_at(lng=lon, lat=lat)
    if tz_name is None:
        return (0.0, "UTC")
    tz_info = ZoneInfo(tz_name)
    if target_date is None:
        target_date = datetime.now(timezone.utc)
    if target_date.tzinfo is None:
        target_date = target_date.replace(tzinfo=timezone.utc)
    local_dt = target_date.astimezone(tz_info)
    offset_hours = local_dt.utcoffset().total_seconds() / 3600
    return (offset_hours, tz_name)


# PR A1.12 — birth-time-correct timezone resolution for chart generation.
#
# Why this exists: every chart-generating router used to trust the
# `timezone_offset` float that the frontend sent. That offset defaulted
# to 5.5 (IST) and only updated if the place picker's bigdatacloud
# reverse-geocode lookup succeeded AND returned a timezone object —
# both of which silently failed for many non-IN locations. Result:
# charts for any non-Indian birthplace were computed at the wrong UTC
# instant by up to 13 hours. Lagna, every cusp, every planet position,
# every dasha boundary — all wrong.
#
# This helper makes the BACKEND the source of truth: given the chart's
# lat/lon and the birth datetime, it computes the correct historical
# UTC offset using timezonefinder (offline lat/lon → IANA name lookup)
# + zoneinfo (full historical DST rules including pre-2007 US, pre-2006
# Indiana, pre-2011 Russia, etc.). The frontend's `timezone_offset` is
# kept only as a last-resort fallback for the (~0.1% of) cases where
# timezonefinder can't resolve a coordinate (deep ocean, Antarctica).
def resolve_birth_offset(
    latitude: float,
    longitude: float,
    date: str,
    time: str,
    fallback_offset: float = 5.5,
) -> Tuple[float, str]:
    """
    Resolve the correct UTC offset for a birth event at (lat, lon) on
    the given local date+time. Returns (offset_hours, iana_tz_name).

    `date` is "YYYY-MM-DD", `time` is "HH:MM" — both in the chart's
    LOCAL wall-clock (the form values the user typed). The function:

      1. Constructs a tentative UTC instant by treating the local
         wall-clock as if it were UTC. This is approximate (off by
         the offset itself), but accurate enough to pick the right
         DST window for any sane offset ≤ 14h.
      2. Looks up the IANA timezone via timezonefinder.
      3. Reads the historical UTC offset at that instant via
         zoneinfo (handles all DST rules, gov't tz changes, etc.).

    Edge case — DST "fall back" hour: clocks read e.g. "01:30" twice
    on the autumn switch day. zoneinfo defaults to the first (pre-DST)
    occurrence. KP charts at sub-minute precision are rare for those
    rolled-back hours; if a user knows their birth was the second
    occurrence they can subtract one hour from their typed time. Not
    worth complicating the API for this <0.01% case.

    Falls back to `fallback_offset` if timezonefinder can't resolve the
    coordinate (only happens for deep ocean / Antarctica) and logs a
    warning so we notice if real users start hitting it.
    """
    try:
        # Parse local wall-clock as naive datetime. We pass it to
        # resolve_timezone (which treats naive as UTC); the small
        # offset error in picking the DST window is irrelevant
        # because DST windows are days/months long, not hours.
        birth_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    except (ValueError, TypeError) as e:
        _log.warning(
            "resolve_birth_offset: bad date/time %r %r (%s) — using fallback %.2f",
            date, time, e, fallback_offset,
        )
        return (fallback_offset, "UTC")

    offset, tz_name = resolve_timezone(latitude, longitude, birth_dt)

    # If timezonefinder couldn't resolve (returns 0.0/"UTC" for ocean
    # coords), only override fallback if lat/lon are actually near
    # 0,0. Otherwise the fallback is more trustworthy than "UTC".
    if tz_name == "UTC" and not (abs(latitude) < 1 and abs(longitude) < 1):
        _log.warning(
            "resolve_birth_offset: lat=%.4f lon=%.4f unresolved by "
            "timezonefinder — falling back to %.2f",
            latitude, longitude, fallback_offset,
        )
        return (fallback_offset, "UTC")

    return (offset, tz_name)
