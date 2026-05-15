"""Anthropic API cost audit logger.

Phase 13.2 — added 2026-05-07 in response to user reporting unexplained
billing changes that did not correlate with their actions ("typed a
question without sending and lost 40 cents").

Every Anthropic call site in this codebase routes its cost-relevant
metadata (endpoint label, model, mode, input/output/cache token counts,
estimated USD cost) through `log_anthropic_call()` so it lands in
Railway logs as a single grep-able line:

    [ANTHROPIC_AUDIT] ts=... endpoint=... model=... mode=... in=... cached_in=... out=... cost_usd=...

Operators can `railway logs | grep ANTHROPIC_AUDIT` and reconcile
against the Anthropic dashboard — every dashboard charge MUST have a
matching audit line. If a charge appears with no audit line, something
outside this codebase is calling Anthropic with our key (key leak).
If an audit line appears the user can't account for, the endpoint
column tells us exactly which router fired the call.

This module does NOT make any Anthropic calls. It only formats and
emits log lines. Zero network, zero cost.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("anthropic_audit")

# Per-1M-token prices (USD), Anthropic published rates as of 2026-05.
# Update if pricing changes; keys are model-id substrings (lowercased).
_PRICING: dict[str, dict[str, float]] = {
    # Haiku 4.5 — cheap, used for user mode + topic detection
    "haiku-4-5": {"input": 1.0, "output": 5.0, "cache_write": 1.25, "cache_read": 0.10},
    # Sonnet 4.6 — used for astrologer mode
    "sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30},
    "sonnet-4-5": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30},
}


def _resolve_pricing(model: str) -> dict[str, float]:
    """Return the per-1M USD rate for a given model id. Falls back to
    Sonnet pricing if model unrecognized — pessimistic default (we'd
    rather over-estimate cost in the audit than under-estimate)."""
    m = (model or "").lower()
    for key, rates in _PRICING.items():
        if key in m:
            return rates
    return _PRICING["sonnet-4-6"]


def estimate_cost_usd(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_creation_input_tokens: int = 0,
    cache_read_input_tokens: int = 0,
) -> float:
    """Estimate USD cost for a single Anthropic call given its usage stats."""
    rates = _resolve_pricing(model)
    cost = (
        (input_tokens * rates["input"])
        + (output_tokens * rates["output"])
        + (cache_creation_input_tokens * rates["cache_write"])
        + (cache_read_input_tokens * rates["cache_read"])
    ) / 1_000_000.0
    return round(cost, 6)


def log_anthropic_call(
    endpoint: str,
    model: str,
    mode: str = "unknown",
    usage: Any = None,
    note: str = "",
) -> None:
    """Emit a single audit line for one Anthropic API call.

    `endpoint` should be a stable, grep-able label for the call site,
    e.g. 'astrologer.analyze_stream', 'prediction.ask_stream',
    'llm.detect_topic', 'compatibility.match', 'muhurtha.analyze'.

    `usage` accepts either an `anthropic.types.Usage` object (with
    .input_tokens / .output_tokens / .cache_creation_input_tokens /
    .cache_read_input_tokens attributes) or a plain dict with the same
    keys. Pass None and we'll log the call with zero token counts
    (still useful — proves the call happened).
    """
    in_tok = 0
    out_tok = 0
    cache_w = 0
    cache_r = 0

    if usage is not None:
        # Tolerate both the SDK Usage object and a plain dict.
        def _read(field: str) -> int:
            if isinstance(usage, dict):
                return int(usage.get(field) or 0)
            return int(getattr(usage, field, 0) or 0)

        in_tok = _read("input_tokens")
        out_tok = _read("output_tokens")
        cache_w = _read("cache_creation_input_tokens")
        cache_r = _read("cache_read_input_tokens")

    cost = estimate_cost_usd(model, in_tok, out_tok, cache_w, cache_r)
    ts = datetime.now(timezone.utc).isoformat()
    line = (
        f"[ANTHROPIC_AUDIT] ts={ts} endpoint={endpoint} model={model} "
        f"mode={mode} in={in_tok} cached_in={cache_r} cache_write={cache_w} "
        f"out={out_tok} cost_usd={cost:.6f}"
    )
    if note:
        line += f" note={note}"
    # Use WARNING so it bypasses default INFO filters in Railway and is
    # always visible without changing log level.
    logger.warning(line)
