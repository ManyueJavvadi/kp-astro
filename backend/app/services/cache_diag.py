"""Anthropic prompt-cache diagnostics — opt-in via CACHE_DIAG=1 env var.

Cost-optimization arc (May 2026). See
.claude/research/cost-optimization-2026-05.md for the full investigation
context. TL;DR: our cache write amortization sits at 1.58x for Sonnet
and 0.64x for Haiku — i.e., cache writes are barely paying for themselves
and on Haiku they're net-negative. We need to know WHY consecutive
requests are missing the cache before we can fix the leak.

Anthropic's `cache-diagnosis-2026-04-07` beta header solves this exactly:
pass the previous response's `id` on each new request, and the API
attaches a `diagnostics.cache_miss_reason` field telling you whether it
was `system_changed`, `messages_changed`, `tools_changed`, `model_changed`,
or `previous_message_not_found`. That tells us where the leak is.

Per Anthropic docs (https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics):
  - "Diagnostics never blocks or fails your request."
  - "Fingerprints contain only hashes and token-count estimates
    (never raw prompt content)."
  - ZDR-eligible; fingerprints expire after a short period.

This module is OPT-IN. With CACHE_DIAG unset (the default), every
helper here returns a no-op value and llm_service.py takes the existing
code paths byte-identically. Flip CACHE_DIAG=1 in Railway env to collect
data for 48h, then read `railway logs | grep diag_reason` and bring the
distribution back to the cost-optimization session for analysis.

CRITICAL — every interaction with the diag helpers is wrapped in
try/except by callers. If the SDK shape changes, the beta is sunset, or
anything else goes wrong, diagnostics silently degrades to "off" and
user-facing behavior is unaffected. This module never raises.
"""
from __future__ import annotations

import os
from collections import OrderedDict
from typing import Any

# Beta header value from official Anthropic docs (2026-04-07 cohort).
# If Anthropic rotates the beta name, only this constant changes.
BETA_HEADER = "cache-diagnosis-2026-04-07"

# In-memory LRU of session_key -> previous response.id. Capped so a
# long-running Railway process doesn't grow unboundedly even if the
# session-key derivation produces many distinct keys. 500 entries × ~40
# bytes per id = ~20 KB max — negligible.
_PREV_IDS: "OrderedDict[str, str]" = OrderedDict()
_MAX_ENTRIES = 500


def is_enabled() -> bool:
    """Diagnostics is opt-in via env var. Default OFF."""
    return os.getenv("CACHE_DIAG", "0").strip() == "1"


def session_key(
    endpoint: str,
    chart_hash: str | None = None,
    topic: str | None = None,
    mode: str | None = None,
    lang: str | None = None,
) -> str:
    """Build the in-memory key used to thread previous_message_id across
    consecutive calls. Two distinct chart+topic+mode combos count as
    separate conversations so the comparison stays meaningful."""
    parts = [endpoint or "?", chart_hash or "?", topic or "?", mode or "?", lang or "?"]
    return ":".join(str(p) for p in parts)


def get_prev_id(key: str) -> str | None:
    """Return the previous response.id for this session, or None on first turn."""
    if not is_enabled():
        return None
    val = _PREV_IDS.get(key)
    if val is not None:
        # LRU touch — move to end.
        _PREV_IDS.move_to_end(key)
    return val


def set_prev_id(key: str, response_id: str | None) -> None:
    """Store the latest response.id so the next turn can thread it back."""
    if not is_enabled() or not response_id:
        return
    _PREV_IDS[key] = response_id
    _PREV_IDS.move_to_end(key)
    # LRU eviction.
    while len(_PREV_IDS) > _MAX_ENTRIES:
        _PREV_IDS.popitem(last=False)


def build_call_kwargs(prev_id: str | None) -> dict:
    """Return the extra kwargs to splice into `client.beta.messages.create(...)`
    or `.stream(...)` when diagnostics is enabled. Returns empty dict
    when disabled so callers can splat unconditionally."""
    if not is_enabled():
        return {}
    return {
        "betas": [BETA_HEADER],
        "diagnostics": {"previous_message_id": prev_id},
    }


def extract(response_or_message: Any) -> tuple[str | None, int]:
    """Pull (reason_type, missed_tokens) from either a Message object
    (non-streaming) or the BetaMessage inside a streaming `message_start`
    event. Returns (None, 0) for any edge case — never raises."""
    try:
        diag = getattr(response_or_message, "diagnostics", None)
        if diag is None:
            return (None, 0)
        # The diag object may be `None`, `{"cache_miss_reason": None}`, or
        # `{"cache_miss_reason": {"type": "...", "cache_missed_input_tokens": N}}`
        reason = getattr(diag, "cache_miss_reason", None)
        if reason is None:
            # Could be a dict (older SDK) — try dict access.
            if isinstance(diag, dict):
                reason = diag.get("cache_miss_reason")
        if reason is None:
            return (None, 0)
        # Extract type + missed_tokens with tolerance for object vs dict.
        if isinstance(reason, dict):
            rtype = reason.get("type")
            missed = int(reason.get("cache_missed_input_tokens") or 0)
        else:
            rtype = getattr(reason, "type", None)
            missed = int(getattr(reason, "cache_missed_input_tokens", 0) or 0)
        return (str(rtype) if rtype else None, missed)
    except Exception:
        # Never let diagnostics extraction crash a real call.
        return (None, 0)
