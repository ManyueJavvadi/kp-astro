"""today.py — Single source of truth for "today's date".

PR A1.3-fix-24 — created to fix the 5.5-hour-per-day silent staleness bug:

Before: chart_engine.py used `datetime.now().strftime("%Y-%m-%d")` which is
the SERVER's local date (typically UTC on Railway/Vercel). answer_cache.py
already used IST midnight as its rollover boundary. Mismatch meant that
during UTC time 18:30-23:59 (= IST time 00:00-05:29 next day):
  - Cache key reflected the new IST date (rolled over)
  - Engine still computed "current dasha" using yesterday's date
  - Result: wrong cached answer pinned for 5.5 hours every day

After: every "what is today" check goes through `today_ist_str()` here.
Cache and engine agree on the same boundary.

This is an India-targeting product. IST midnight is what users perceive as
"today changing". UTC midnight is incidental server detail.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone

# IST = UTC+5:30 (no DST).
IST = timezone(timedelta(hours=5, minutes=30))


def today_ist_str() -> str:
    """Return today's date in IST as YYYY-MM-DD."""
    return datetime.now(IST).strftime("%Y-%m-%d")


def now_ist() -> datetime:
    """Return current datetime in IST (timezone-aware)."""
    return datetime.now(IST)
