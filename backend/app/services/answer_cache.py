"""
answer_cache.py — Per-chart 24h LLM answer cache (PR A1.3-fix-16).

Same chart + same topic + same calendar day + same question + same mode
deterministically produces the same answer (because the engine compute
is deterministic for a fixed birth chart, and the system prompt's date
field is the same within a calendar day).

Caching the LLM output server-side for 24 hours saves cost on:
  - User refreshing the page and re-asking the same question
  - User asking the exact same question again (memory test, comparison)
  - Multiple users asking the same canonical questions on shared
    example charts

Implementation: simple in-memory dict with TTL. Resets on backend
restart. Later upgrade to Redis when scale demands persistence.

Cache key = SHA256 of:
  birth_date | birth_time | latitude | longitude | gender | topic |
  today_date_iso | mode | normalized_question

Question normalization is intentionally minimal (lowercase + strip
whitespace) so substantive question changes miss the cache. We err on
the side of MISSING (compute fresh) rather than serving wrong cached
content for a different question.

Capacity: 1024 entries (~5MB at 5KB output each). LRU eviction.
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict
from datetime import datetime
from typing import Any, Optional

_log = logging.getLogger("answer_cache")

_TTL_SECONDS = 24 * 60 * 60  # 24 hours
_MAX_ENTRIES = 1024


class _LRUCache:
    """Simple ordered-dict-based LRU with per-entry TTL."""

    def __init__(self, max_entries: int = _MAX_ENTRIES, ttl_seconds: int = _TTL_SECONDS):
        self._store: "OrderedDict[str, tuple[float, str, dict]]" = OrderedDict()
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[tuple[str, dict]]:
        """Return (answer, analysis_meta) if cache-fresh, else None."""
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
        if key in self._store:
            self._store.pop(key)
        self._store[key] = (time.time(), answer, meta or {})
        # Evict oldest if over capacity
        while len(self._store) > self._max_entries:
            self._store.popitem(last=False)

    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_pct": round(100 * self._hits / total, 2) if total else 0.0,
        }


_cache = _LRUCache()


def _normalize_question(q: str) -> str:
    """Conservative normalization — lowercase + collapse whitespace.

    Intentionally NOT stemming or paraphrase-matching. Two slightly
    different wordings should miss cache (and pay full LLM cost) rather
    than risk serving the wrong cached answer.
    """
    return " ".join((q or "").strip().lower().split())


def make_key(
    *,
    birth_date: str,
    birth_time: str,
    latitude: float,
    longitude: float,
    gender: str,
    topic: str,
    mode: str,
    question: str,
) -> str:
    """Build the cache key. today_date is included so caches roll over
    daily — important because the engine's "current dasha" output and
    "today's date" in the system prompt change at midnight."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    raw = "|".join([
        birth_date or "",
        birth_time or "",
        f"{latitude:.4f}",
        f"{longitude:.4f}",
        (gender or "").lower(),
        (topic or "").lower(),
        today,
        (mode or "").lower(),
        _normalize_question(question),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get(key: str) -> Optional[tuple[str, dict]]:
    return _cache.get(key)


def put(key: str, answer: str, meta: dict | None = None) -> None:
    _cache.put(key, answer, meta)


def stats() -> dict:
    return _cache.stats()


def clear() -> None:
    """Test helper — wipe the cache."""
    _cache._store.clear()
    _cache._hits = 0
    _cache._misses = 0
