"""
Timezone resolution from geographic coordinates.
Uses timezonefinder (offline, pure Python) + zoneinfo (stdlib).
Singleton pattern — TimezoneFinder loads shape data on first init.
"""
from timezonefinder import TimezoneFinder
from zoneinfo import ZoneInfo
from datetime import datetime, timezone
from typing import Optional, Tuple

_tf: Optional[TimezoneFinder] = None


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
