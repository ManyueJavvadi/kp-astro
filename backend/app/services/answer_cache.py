"""
answer_cache.py — Per-chart 24h LLM answer cache.

PR A1.3-fix-16: initial in-memory LRU cache with TTL.
PR A1.3-fix-17: cache audit fixes
  - Added timezone_offset to cache key (rare but real collision risk:
    same birth_time but different TZ → different chart, was same key)
  - Switched date-roll boundary from UTC to IST (since this is an
    Indian-targeting product; IST midnight is what users perceive as
    "today" rolling over, not UTC midnight which is 5:30 AM IST)
  - Added stats() exposure path so admin endpoint can inspect hit rate

Same chart + same topic + same IST calendar day + same question + same
mode deterministically produces the same answer (because the engine
compute is deterministic for a fixed birth chart, and the system
prompt's date field is the same within a calendar day).

Caching the LLM output server-side for 24 hours saves cost on:
  - User refreshing the page and re-asking the same question
  - User asking the exact same question again (memory test, comparison)
  - Multiple users asking the same canonical questions on shared
    example charts

Implementation: simple in-memory dict with TTL. Resets on backend
restart. Later upgrade to Redis when scale demands persistence.

Cache key = SHA256 of:
  birth_date | birth_time | latitude | longitude | timezone_offset |
  gender | topic | today_ist_iso | mode | normalized_question

Question normalization is intentionally minimal (lowercase + strip
whitespace) so substantive question changes miss the cache. We err on
the side of MISSING (compute fresh) rather than serving wrong cached
content for a different question.

Capacity: 1024 entries (~5MB at 5KB output each). LRU eviction.
Thread safety: relies on Python asyncio's single-threaded event loop.
NOT safe under multi-threaded concurrent access — add a lock if you
move to a thread-pool model.
"""

from __future__ import annotations

import hashlib
import logging
import threading  # PR A1.3-fix-24 — concurrency safety for the LRU
import time
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

_log = logging.getLogger("answer_cache")

# Phase 13 / PR 32 — same-chart, same-question cached responses now
# survive 30 days instead of 24 hours. Combined with removing
# `today_ist_iso` from the cache key (see make_key below), the same
# birth chart entered any time within a month returns the cached
# response without paying for a fresh Sonnet call.
#
# Why 30 days, not "forever":
#   - The AI response embeds age ("Male, Age 25") which ticks over on
#     birthdays. 30d means at most one stale-by-age cached entry per
#     chart per year.
#   - Current dasha period dates ("Mercury AD 2029-2031") are 3-year
#     windows so they're fine across 30d.
#   - "Today's RPs" content does drift, but it's a small section of
#     the response.
# Trade-off chosen: massively lower cost vs. minor occasional staleness.
_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days
_MAX_ENTRIES = 1024

# PR A1.3-fix-17 — Indian-targeting product → IST midnight is the
# "today changed" boundary, not UTC midnight. Hardcoding +5:30 to avoid
# pytz dependency.
_IST = timezone(timedelta(hours=5, minutes=30))


class _LRUCache:
    """Thread-safe ordered-dict-based LRU with per-entry TTL.

    PR A1.3-fix-24 — added `_lock` to prevent `RuntimeError: OrderedDict
    mutated during iteration` under FastAPI concurrency. The cache is
    touched by:
      - sync `def` endpoints (run on threadpool — `/astrologer/analyze`,
        `/prediction/ask`)
      - async endpoints (run on event loop — `/astrologer/analyze-stream`,
        `/prediction/ask-stream`)
    Both can race on `move_to_end` / `popitem`. The lock is uncontended
    in steady state (LRU ops are O(1) and fast).
    """

    def __init__(self, max_entries: int = _MAX_ENTRIES, ttl_seconds: int = _TTL_SECONDS):
        self._store: "OrderedDict[str, tuple[float, str, dict]]" = OrderedDict()
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._hits = 0
        self._misses = 0
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[tuple[str, dict]]:
        """Return (answer, analysis_meta) if cache-fresh, else None."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            ts, answer, meta = entry
            if (time.time() - ts) > self._ttl_seconds:
                # Expired
                self._store.pop(key, None)
                self._misses += 1
                return None
            # Move to end (most-recently-used)
            self._store.move_to_end(key)
            self._hits += 1
            return answer, meta

    def put(self, key: str, answer: str, meta: dict | None = None) -> None:
        with self._lock:
            if key in self._store:
                self._store.pop(key)
            self._store[key] = (time.time(), answer, meta or {})
            # Evict oldest if over capacity
            while len(self._store) > self._max_entries:
                self._store.popitem(last=False)

    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "entries": len(self._store),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_pct": round(100 * self._hits / total, 2) if total else 0.0,
            }

    def clear_unsafe_for_tests(self) -> None:
        """Test-only helper. NEVER call from production paths."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0


_cache = _LRUCache()


def _normalize_question(q: str) -> str:
    """Conservative normalization — lowercase + collapse whitespace.

    Intentionally NOT stemming or paraphrase-matching. Two slightly
    different wordings should miss cache (and pay full LLM cost) rather
    than risk serving the wrong cached answer.
    """
    return " ".join((q or "").strip().lower().split())


def _today_ist() -> str:
    """Return today's date in IST as YYYY-MM-DD.

    PR A1.3-fix-17 — switched from UTC to IST. Cache rolls at IST
    midnight (00:00 IST = 18:30 UTC previous day). This matches what
    Indian users perceive as "today changed" and aligns with the
    system prompt's `TODAY'S DATE` field which dasha calculations
    depend on.

    PR A1.3-fix-24 — delegates to the canonical helper in app/services/today.py
    so the cache and chart_engine ALWAYS agree on the boundary. Local _IST
    constant retained (above) for module-internal back-compat but no longer
    used here.
    """
    from app.services.today import today_ist_str
    return today_ist_str()


def make_key(
    *,
    birth_date: str,
    birth_time: str,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    gender: str,
    topic: str,
    mode: str,
    question: str,
    question_type: str = "",
) -> str:
    """Build the cache key.

    Phase 13 / PR 32 — `today_ist_iso` REMOVED from the key.
    Previously the cache rolled over at IST midnight so the same chart
    re-analysed on day N+1 paid for a fresh Sonnet call. Per the user's
    intent ("any time the same chart is entered, use what we have"),
    the date stamp is now out of the key — same chart + same question
    + same mode returns the cached answer for up to 30 days
    (`_TTL_SECONDS`). The known minor staleness this introduces (age
    ticking over, "today's RPs" section drifting) is documented at
    the top of this file and is the deliberate trade-off.

    PR A1.3-fix-17 — added timezone_offset. Without it, two users with
    same birth_time but different TZ would collide (rare but real:
    same chart name + birth time + lat/lon, different TZ = different
    chart, was same cache key).

    PR A1.3-fix-23 — added question_type. Without it, a Format A answer
    cached for a question would be replayed for the same question hit
    again as Format B (or vice versa), serving the wrong shape. Default
    "" preserves existing behavior for callers that don't pass it.
    """
    raw = "|".join([
        birth_date or "",
        birth_time or "",
        f"{latitude:.4f}",
        f"{longitude:.4f}",
        f"{timezone_offset:.2f}",
        (gender or "").lower(),
        (topic or "").lower(),
        # `today_ist_iso` deliberately omitted (Phase 13 / PR 32).
        (mode or "").lower(),
        _normalize_question(question),
        (question_type or "").lower(),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get(key: str) -> Optional[tuple[str, dict]]:
    return _cache.get(key)


def put(key: str, answer: str, meta: dict | None = None) -> None:
    _cache.put(key, answer, meta)


def stats() -> dict:
    return _cache.stats()


def clear() -> None:
    """Test helper — wipe the cache.

    PR A1.3-fix-24 — was reaching into private attributes without the lock;
    delegates to the locked test helper now.
    """
    _cache.clear_unsafe_for_tests()
