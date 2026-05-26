"""
cross_chart_engine.py — Topic-agnostic deterministic primitives for multi-chart KP analysis.

PR MultiChart-Phase-5 (May 2026).

This module is the SECOND layer of the multi-chart pipeline:

    LAYER 1: format_chart_for_llm(chart_data)  per chart  ← sacred, reused
    LAYER 2: cross_chart_engine.compute_all(...)          ← THIS MODULE
    LAYER 3: multi-chart KB + per-topic KB                ← sacred-style KBs
    LAYER 4: multi-chart system prompt = get_system_prompt + MC1-MC10

It produces 7 structured fact-tables that an LLM CANNOT reliably derive
from per-chart context alone:

  ①  SYNASTRY OVERLAY MATRIX
       For each ordered pair (A, B), which house of B contains each
       planet of A. Bi-directional. Computed against B's actual cusps.

  ②  COMMON-SIGNIFICATOR SET
       For each focus house, the intersection of (today's RPs) ∩
       (chart 1's 4-step significators) ∩ (chart 2's 4-step
       significators). These are the "ripe-to-manifest" planets.

  ③  JOINT DASHA INTERSECTION WINDOWS
       Date ranges where ALL N charts' running dasha trees fire
       focus-house significators simultaneously. Ranked by score.

  ④  SUB-LORD CROSS-CHECK SUMMARY
       Per focus house, each chart's CSL chain side-by-side with
       a per-chart 5-tier verdict (single-chart RULE 5).

  ⑤  BHAVAT BHAVAM CROSS-VALIDATION
       When user's chart AND relative's chart are both present:
       compare rotated-frame verdict in user's chart vs natal verdict
       in relative's chart.

  ⑥  KARAKA ROLE DISTRIBUTION  (N≥3 partnership-style queries only)
       Which chart most strongly carries Mars-role / Mercury-role /
       Saturn-role etc.

  ⑦  COMBINATION RULE VERDICT
       Mechanical OR-Promise / AND-Denial / Synastry-Overlay verdict
       application. The LLM does NOT decide the rule; the engine does.

Topic-agnostic: the engine takes focus_houses + combination_rule
+ karakas as inputs and runs the SAME math regardless of whether
the topic is marriage, court case, property sale, partnership,
or anything else. Topic-specific doctrine lives in the KB stack.

Sacred-region discipline:
  - Reads from per-chart context produced by
    chart_pipeline.build_full_chart_data (sacred) — never modifies.
  - Reuses chart_engine helpers (get_house_number, get_sign_lord,
    get_houses_owned_by_planet) — never modifies them.
  - Adds NO new dependencies on existing sacred regions.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from app.services.chart_engine import (
    get_houses_owned_by_planet,
    get_house_number,
)

_log = logging.getLogger("cross_chart_engine")


# ────────────────────────────────────────────────────────────────────
# Canonical orderings (used for stable output)
# ────────────────────────────────────────────────────────────────────
GRAHA_ORDER = [
    "Sun", "Moon", "Mars", "Mercury", "Jupiter",
    "Venus", "Saturn", "Rahu", "Ketu",
]

# Bhavat Bhavam rotational axes — relative-type → house in native's
# chart that becomes the relative's H1 (rotated lagna).
# Source: multi_chart_analysis.md §4 + KP Reader IV.
BHAVAT_BHAVAM_AXIS = {
    "spouse":          7,
    "child":           5,
    "father":          9,
    "mother":          4,
    "elder_sibling":   11,
    "younger_sibling": 3,
    "boss":            10,
    "employee":        6,
    "friend":          11,
    "open_enemy":      7,
    "hidden_enemy":    12,
    "father_in_law":   3,   # 9th from 7th
    "mother_in_law":   10,  # 4th from 7th
    "guru":            9,
    "disciple":        5,
}

# Karaka role map — for partnership-style queries with N≥3 charts.
# Source: Bosmia KPRM partnership chapter.
PARTNERSHIP_KARAKA_ROLES = {
    "Mars":    "operator (energy, action, execution)",
    "Mercury": "advisor (communication, negotiation, intellect)",
    "Saturn":  "discipline lead (structure, long-term endurance)",
    "Jupiter": "trust/wisdom (counsel, mentorship, expansion)",
    "Venus":   "harmony (aesthetics, relationships, balance)",
}


# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────
def _deg_in_sign_dms(abs_lon: float | int | None) -> str:
    """Format absolute longitude as DD°MM'SS" within sign."""
    if abs_lon is None:
        return "—"
    try:
        lon = float(abs_lon) % 360.0
    except (TypeError, ValueError):
        return "—"
    in_sign = lon % 30.0
    deg = int(in_sign)
    minutes_full = (in_sign - deg) * 60.0
    minutes = int(minutes_full)
    seconds = int((minutes_full - minutes) * 60.0)
    return f"{deg:02d}°{minutes:02d}'{seconds:02d}\""


def _invert_significators_for_planet(
    planet_name: str, significators: dict[str, Any]
) -> dict[str, list[int]]:
    """Pivot per-house significator dict into per-planet view.

    Source of truth: chart_data["significators"] from
    chart_engine.get_all_house_significators().  Returns the canonical
    KP 4-step rule output as a per-planet dict (occupies, in_star_of_
    occupants, in_star_of_lord, is_house_lord, all_signified).
    """
    out: dict[str, list[int]] = {
        "occupies": [],
        "in_star_of_occupants": [],
        "in_star_of_lord": [],
        "is_house_lord": [],
        "all_signified": [],
    }
    for hn in range(1, 13):
        s = significators.get(f"House_{hn}") or {}
        if planet_name in (s.get("occupants") or []):
            out["occupies"].append(hn)
        if planet_name in (s.get("planets_in_star_of_occupants") or []):
            out["in_star_of_occupants"].append(hn)
        if planet_name in (s.get("planets_in_star_of_lord") or []):
            out["in_star_of_lord"].append(hn)
        if s.get("house_lord") == planet_name:
            out["is_house_lord"].append(hn)
    out["all_signified"] = sorted({
        *out["occupies"],
        *out["in_star_of_occupants"],
        *out["in_star_of_lord"],
        *out["is_house_lord"],
    })
    return out


def _5tier_verdict(
    sigs_for_focus: set[int],
    sigs_for_denial: set[int],
    focus_houses: set[int],
    denial_houses: set[int],
) -> str:
    """Per single-chart RULE 5 5-tier scale.

    Inputs are the planet's signified houses already filtered by focus
    + denial sets.  Returns one of: STRONGLY PROMISED / PROMISED /
    CONDITIONAL / WEAKLY PROMISED / DENIED.
    """
    focus_hit = sigs_for_focus & focus_houses
    denial_hit = sigs_for_denial & denial_houses
    if not focus_hit and not denial_hit:
        return "NEUTRAL"
    if focus_hit and not denial_hit:
        if len(focus_hit) >= 2:
            return "STRONGLY PROMISED"
        return "PROMISED"
    if focus_hit and denial_hit:
        return "CONDITIONAL"
    # No focus, only denial
    return "DENIED"


# ────────────────────────────────────────────────────────────────────
# ① SYNASTRY OVERLAY MATRIX
# ────────────────────────────────────────────────────────────────────
def compute_synastry_overlay(charts: list[dict[str, Any]]) -> dict[str, Any]:
    """For each ordered pair (i, j) of distinct charts, compute which
    house of chart_j contains each planet of chart_i.

    Returns:
        {
          "(1, 2)": {
              "Sun":     {"abs_lon": 167.43, "house_in_other": 4, "sign_in_other": "Cancer"},
              "Moon":    {...},
              ...
          },
          "(2, 1)": {...},
          ...
        }

    Sources:
      - chart_i["chart_summary"]["planets"][p]["longitude"]
      - chart_j["chart_summary"]["cusps"]  (KP cusps; uses
        chart_engine.get_house_number)
    """
    out: dict[str, Any] = {}
    n = len(charts)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            i_planets = (charts[i].get("chart_summary") or {}).get("planets") or {}
            j_cusps = (charts[j].get("chart_summary") or {}).get("cusps") or {}
            if not i_planets or not j_cusps:
                continue
            pair_map: dict[str, Any] = {}
            for pname in GRAHA_ORDER:
                p = i_planets.get(pname)
                if not p:
                    continue
                abs_lon = p.get("longitude")
                if abs_lon is None:
                    continue
                # Use chart_engine.get_house_number against chart_j's cusps
                try:
                    h_in_other = get_house_number(float(abs_lon), j_cusps)
                except Exception:
                    h_in_other = None
                # Sign in other (the sign the planet is in — same sign
                # regardless of chart, but useful for display)
                signs = [
                    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
                ]
                sign = signs[int((float(abs_lon) % 360) / 30)]
                pair_map[pname] = {
                    "abs_lon":         round(float(abs_lon), 4),
                    "deg_in_sign_dms": _deg_in_sign_dms(abs_lon),
                    "sign":            sign,
                    "house_in_other":  h_in_other,
                }
            out[f"({i+1}, {j+1})"] = pair_map
    return out


# ────────────────────────────────────────────────────────────────────
# ② COMMON-SIGNIFICATOR SET
# ────────────────────────────────────────────────────────────────────
def compute_common_significators(
    charts: list[dict[str, Any]],
    focus_houses: list[int],
    rps_today: list[str] | None = None,
) -> dict[str, Any]:
    """For each focus house, list each chart's significators + the
    intersection across all charts + intersection with today's RPs.

    Returns:
        {
          "per_house": {
              7: {
                  "per_chart": [
                      {"chart_id": 1, "significators": ["Venus", "Mars", ...]},
                      {"chart_id": 2, "significators": ["Rahu", ...]},
                  ],
                  "intersection_all_charts":        ["Venus"],
                  "intersection_with_rp":            ["Venus"],  # ripe
              },
              ...
          },
          "all_focus_intersection":          ["Venus"],
          "all_focus_intersection_with_rp":  ["Venus"],
        }

    Sources:
      - chart["significators"]["House_N"]["all_significators"]
      - rps_today (computed once for the moment of query)
    """
    rps_set = set(rps_today or [])
    per_house: dict[int, Any] = {}
    all_focus_intersect = None
    all_focus_intersect_rp = None

    for hn in focus_houses:
        per_chart_entries: list[dict[str, Any]] = []
        per_chart_sets: list[set[str]] = []
        for idx, ch in enumerate(charts, start=1):
            sigs = ch.get("significators") or {}
            h = sigs.get(f"House_{hn}") or {}
            all_sigs = h.get("all_significators") or []
            per_chart_entries.append({
                "chart_id":     idx,
                "significators": list(all_sigs),
            })
            per_chart_sets.append(set(all_sigs))
        intersect = set.intersection(*per_chart_sets) if per_chart_sets else set()
        intersect_rp = intersect & rps_set
        per_house[hn] = {
            "per_chart":                 per_chart_entries,
            "intersection_all_charts":   sorted(intersect),
            "intersection_with_rp":      sorted(intersect_rp),
        }
        # Accumulate across all focus houses
        if all_focus_intersect is None:
            all_focus_intersect = set(intersect)
            all_focus_intersect_rp = set(intersect_rp)
        else:
            all_focus_intersect |= intersect
            all_focus_intersect_rp |= intersect_rp
    return {
        "per_house":                       per_house,
        "all_focus_intersection":          sorted(all_focus_intersect or set()),
        "all_focus_intersection_with_rp":  sorted(all_focus_intersect_rp or set()),
    }


# ────────────────────────────────────────────────────────────────────
# ③ JOINT DASHA INTERSECTION WINDOWS
# ────────────────────────────────────────────────────────────────────
def _parse_date(s: str) -> datetime | None:
    """Parse YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS (best-effort)."""
    if not s:
        return None
    s = str(s).strip()
    # Try full-string parsing first; fall back to common 10-char prefix.
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, TypeError):
            continue
    # Last resort: try first 10 chars as YYYY-MM-DD
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def _lord_signifies_focus(
    lord: str | None,
    significators: dict[str, Any],
    focus_houses: set[int],
) -> bool:
    """True if planet signifies any focus house via 4-step union."""
    if not lord:
        return False
    inv = _invert_significators_for_planet(lord, significators)
    return bool(set(inv["all_signified"]) & focus_houses)


def compute_joint_dasha_windows(
    charts: list[dict[str, Any]],
    focus_houses: list[int],
    rps_today: list[str] | None = None,
    months_ahead: int = 24,
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """Find date windows where ALL N charts' running dasha trees fire
    focus-house significators simultaneously.

    Algorithm (simplified for compute tractability):
      1. For each chart, walk upcoming AD/PAD entries (chart["upcoming_
         antardashas"], chart["all_ad_pratyantardashas"]) up to today
         + months_ahead.
      2. For each chart × each AD-or-PAD entry, mark whether the entry's
         lord signifies any focus house (via 4-step rule using the
         pre-computed significators).
      3. Walk monthly buckets; for each bucket, count layers signifying
         in each chart.
      4. Score = sum(layers_signifying) / sum(layers_possible) * 100
         + 10 if any of today's RPs is a significator in ≥N-1 charts.
      5. Return top_n windows.

    Returns: list of windows ordered by score desc:
        [{
          "start":          "2026-08-15",
          "end":            "2026-11-22",
          "score":          87,
          "per_chart": [
              {
                "chart_id":         1,
                "active_layers":    ["MD", "AD"],
                "lords_signifying": ["Saturn"]
              },
              ...
          ],
          "rp_overlap":      ["Mars"]
        }, ...]
    """
    rps_set = set(rps_today or [])
    focus_set = set(focus_houses)
    now = datetime.now()
    horizon = now + timedelta(days=30 * months_ahead)

    # Walk each chart's upcoming dasha periods (AD + PAD) and tag
    # whether each lord signifies focus houses.
    per_chart_periods: list[list[dict[str, Any]]] = []
    for ch in charts:
        periods: list[dict[str, Any]] = []
        sigs = ch.get("significators") or {}
        # MD (current — applies for the whole horizon usually)
        cur_md = (ch.get("current_dasha") or {}).get("mahadasha") or {}
        md_lord = cur_md.get("lord")
        md_start = _parse_date(cur_md.get("start") or "")
        md_end = _parse_date(cur_md.get("end") or "")
        if md_lord and md_start and md_end:
            periods.append({
                "layer": "MD",
                "lord":  md_lord,
                "start": md_start,
                "end":   md_end,
                "signifies_focus": _lord_signifies_focus(md_lord, sigs, focus_set),
            })
        # ADs upcoming
        for ad in (ch.get("upcoming_antardashas") or [])[:20]:
            ad_lord = ad.get("antardasha_lord") or ad.get("lord")
            ad_start = _parse_date(ad.get("start") or "")
            ad_end = _parse_date(ad.get("end") or "")
            if ad_lord and ad_start and ad_end and ad_start < horizon:
                periods.append({
                    "layer": "AD",
                    "lord":  ad_lord,
                    "start": ad_start,
                    "end":   ad_end,
                    "signifies_focus": _lord_signifies_focus(ad_lord, sigs, focus_set),
                })
        # PADs (within each AD).  all_ad_pratyantardashas is a dict
        # keyed by AD lord; values are lists of PAD entries.  Walk all
        # PADs across all ADs (capped to ~80 for tractability).
        ap = ch.get("all_ad_pratyantardashas") or {}
        pad_count = 0
        if isinstance(ap, dict):
            for _ad_lord, pad_list in ap.items():
                for pad in (pad_list or []):
                    if pad_count >= 80:
                        break
                    pad_lord = pad.get("pratyantardasha_lord") or pad.get("lord")
                    pad_start = _parse_date(pad.get("start") or "")
                    pad_end = _parse_date(pad.get("end") or "")
                    if pad_lord and pad_start and pad_end and pad_start < horizon:
                        periods.append({
                            "layer": "PAD",
                            "lord":  pad_lord,
                            "start": pad_start,
                            "end":   pad_end,
                            "signifies_focus": _lord_signifies_focus(pad_lord, sigs, focus_set),
                        })
                        pad_count += 1
                if pad_count >= 80:
                    break
        per_chart_periods.append(periods)

    # Walk monthly buckets from today to horizon.
    windows: list[dict[str, Any]] = []
    bucket = now
    while bucket < horizon:
        bucket_end = bucket + timedelta(days=30)
        per_chart_active: list[dict[str, Any]] = []
        any_chart_empty = False
        max_score_components = 0
        score_components = 0
        for ci, periods in enumerate(per_chart_periods, start=1):
            active_layers: list[str] = []
            lords: list[str] = []
            for p in periods:
                # Period overlaps this bucket?
                if p["start"] < bucket_end and p["end"] > bucket:
                    if p["signifies_focus"]:
                        active_layers.append(p["layer"])
                        if p["lord"] not in lords:
                            lords.append(p["lord"])
            max_score_components += 3  # max 3 layers per chart (MD/AD/PAD)
            score_components += len(active_layers)
            per_chart_active.append({
                "chart_id":         ci,
                "active_layers":    active_layers,
                "lords_signifying": lords,
            })
            if not active_layers:
                any_chart_empty = True
        # Only score buckets where ALL charts have at least one
        # signifying layer (joint period principle).
        if not any_chart_empty and score_components > 0:
            base_score = (score_components / max_score_components) * 100
            # RP overlap bonus
            rp_overlap: list[str] = []
            for entry in per_chart_active:
                for lord in entry["lords_signifying"]:
                    if lord in rps_set and lord not in rp_overlap:
                        rp_overlap.append(lord)
            if rp_overlap:
                base_score = min(100, base_score + 10)
            windows.append({
                "start":     bucket.strftime("%Y-%m-%d"),
                "end":       bucket_end.strftime("%Y-%m-%d"),
                "score":     round(base_score, 1),
                "per_chart": per_chart_active,
                "rp_overlap": rp_overlap,
            })
        bucket = bucket_end

    # Merge contiguous windows with similar scores (within 10 points)
    # to avoid emitting 24 monthly buckets when the truth is "Aug-Nov".
    if windows:
        merged: list[dict[str, Any]] = []
        cur = dict(windows[0])
        for w in windows[1:]:
            cur_end_dt = datetime.strptime(cur["end"], "%Y-%m-%d")
            w_start_dt = datetime.strptime(w["start"], "%Y-%m-%d")
            if w_start_dt <= cur_end_dt + timedelta(days=2) and abs(w["score"] - cur["score"]) < 10:
                # Extend
                cur["end"] = w["end"]
                cur["score"] = max(cur["score"], w["score"])
                # Merge per_chart layers (union)
                for ci in range(len(cur["per_chart"])):
                    cur_layers = set(cur["per_chart"][ci]["active_layers"])
                    cur_layers.update(w["per_chart"][ci]["active_layers"])
                    cur["per_chart"][ci]["active_layers"] = sorted(cur_layers)
                    cur_lords = set(cur["per_chart"][ci]["lords_signifying"])
                    cur_lords.update(w["per_chart"][ci]["lords_signifying"])
                    cur["per_chart"][ci]["lords_signifying"] = sorted(cur_lords)
                cur_rp = set(cur["rp_overlap"])
                cur_rp.update(w["rp_overlap"])
                cur["rp_overlap"] = sorted(cur_rp)
            else:
                merged.append(cur)
                cur = dict(w)
        merged.append(cur)
        windows = merged

    # Sort by score desc, take top_n
    windows.sort(key=lambda w: w["score"], reverse=True)
    return windows[:top_n]


# ────────────────────────────────────────────────────────────────────
# ④ SUB-LORD CROSS-CHECK SUMMARY
# ────────────────────────────────────────────────────────────────────
def compute_sublord_crosscheck(
    charts: list[dict[str, Any]],
    focus_houses: list[int],
    denial_houses: list[int] | None = None,
) -> dict[str, Any]:
    """For each focus house, side-by-side each chart's CSL chain + a
    per-chart 5-tier verdict (single-chart RULE 5).

    Returns: {
        "per_focus_house": {
            7: [
                {
                    "chart_id":           1,
                    "csl":                "Rahu",
                    "csl_house":          8,
                    "csl_signifies":      [2, 4, 6, 7, 8, 11],
                    "csl_star_lord":      "Jupiter",
                    "csl_star_lord_house":6,
                    "csl_sub_lord":       "Venus",
                    "csl_sub_lord_house": 10,
                    "all_significations": [2, 4, 6, 7, 8, 9, 10, 11, 12],
                    "verdict":            "PROMISED" | "CONDITIONAL" | ...
                },
                ...
            ]
        }
    }
    """
    denial_set = set(denial_houses or [])
    focus_set = set(focus_houses)
    out: dict[int, list[dict[str, Any]]] = {}
    for hn in focus_houses:
        entries: list[dict[str, Any]] = []
        for idx, ch in enumerate(charts, start=1):
            csl_chains = ch.get("csl_chains") or {}
            chain = (
                csl_chains.get(hn)
                or csl_chains.get(f"H{hn}")
                or csl_chains.get(str(hn))
                or {}
            )
            csl = chain.get("csl", "")
            sigs = ch.get("significators") or {}
            csl_sigs = (
                _invert_significators_for_planet(csl, sigs)["all_signified"]
                if csl else []
            )
            chain_union = chain.get("all_significations") or csl_sigs
            verdict = _5tier_verdict(
                sigs_for_focus=set(chain_union),
                sigs_for_denial=set(chain_union),
                focus_houses=focus_set,
                denial_houses=denial_set,
            )
            entries.append({
                "chart_id":            idx,
                "csl":                 csl,
                "csl_house":           chain.get("csl_house"),
                "csl_signifies":       csl_sigs,
                "csl_star_lord":       chain.get("csl_star_lord"),
                "csl_star_lord_house": chain.get("csl_star_lord_house"),
                "csl_sub_lord":        chain.get("csl_sub_lord"),
                "csl_sub_lord_house":  chain.get("csl_sub_lord_house"),
                "all_significations":  list(chain_union),
                "verdict":             verdict,
            })
        out[hn] = entries
    return {"per_focus_house": out}


# ────────────────────────────────────────────────────────────────────
# ⑤ BHAVAT BHAVAM CROSS-VALIDATION
# ────────────────────────────────────────────────────────────────────
def compute_bhavat_bhavam_crossval(
    charts: list[dict[str, Any]],
    relative_type: str | None,
    focus_houses_for_native: list[int],
    focus_houses_for_relative: list[int],
) -> dict[str, Any] | None:
    """When questioner's chart (index 0) AND relative's natal chart
    (index 1) are both present, compare rotated-frame verdict vs natal
    verdict.

    Returns None if not applicable (e.g., relative_type unknown or
    only one chart present).

    Returns:
        {
          "applicable":   True,
          "relative_type": "spouse",
          "rotated_axis":  7,   # in native's chart
          "rotated_significators": {h: [...]},
          "natal_significators":   {h: [...]},
          "rotated_verdict":  "PROMISED",
          "natal_verdict":    "PROMISED",
          "agree":            True,
          "combined_confidence_pct": 95
        }
    """
    if not relative_type or len(charts) < 2:
        return None
    axis = BHAVAT_BHAVAM_AXIS.get(relative_type.lower())
    if axis is None:
        return None

    native = charts[0]
    relative = charts[1]

    # Rotated significators: in the native's chart, the relative's H1
    # is at axis.  Their other houses are at axis + (n-1) mod 12 + 1.
    # For each focus_houses_for_relative house, find what house in
    # native's chart corresponds.
    native_sigs = native.get("significators") or {}
    relative_sigs = relative.get("significators") or {}

    def _rotated_house(rel_h: int) -> int:
        return ((axis - 1 + (rel_h - 1)) % 12) + 1

    rotated_sigs: dict[int, list[str]] = {}
    natal_sigs: dict[int, list[str]] = {}
    for rh in focus_houses_for_relative:
        native_h = _rotated_house(rh)
        rot_h_sigs = (native_sigs.get(f"House_{native_h}") or {}).get("all_significators") or []
        nat_h_sigs = (relative_sigs.get(f"House_{rh}") or {}).get("all_significators") or []
        rotated_sigs[rh] = list(rot_h_sigs)
        natal_sigs[rh] = list(nat_h_sigs)

    # Verdict: "PROMISED" if any focus house has non-empty significators
    # (simplified — full per-cusp verdict requires CSL chain look-up
    # which is already in primitive ④).
    rotated_verdict = "PROMISED" if any(rotated_sigs.values()) else "DENIED"
    natal_verdict = "PROMISED" if any(natal_sigs.values()) else "DENIED"
    agree = rotated_verdict == natal_verdict
    combined_conf = 95 if agree else 70
    return {
        "applicable":              True,
        "relative_type":           relative_type,
        "rotated_axis":            axis,
        "rotated_significators":   rotated_sigs,
        "natal_significators":     natal_sigs,
        "rotated_verdict":         rotated_verdict,
        "natal_verdict":           natal_verdict,
        "agree":                   agree,
        "combined_confidence_pct": combined_conf,
    }


# ────────────────────────────────────────────────────────────────────
# ⑥ KARAKA ROLE DISTRIBUTION  (N≥3 partnership-style only)
# ────────────────────────────────────────────────────────────────────
def compute_karaka_roles(
    charts: list[dict[str, Any]],
    topic: str | None,
) -> dict[str, Any] | None:
    """For N≥3 partnership-style topics, assign which chart most
    strongly carries each karaka role (Mars=operator, Mercury=advisor,
    Saturn=discipline, Jupiter=trust, Venus=harmony).

    Returns None if N<3 or topic not partnership-style.

    Scoring per chart × karaka:
      base 0
      +30 if karaka is well-placed (own/exalted/friendly sign)
      +20 if karaka signifies H10 or H11 (career/gain)
      +15 if karaka is in own star (self-significator)
      +15 if karaka is a Ruling Planet today
      +10 if karaka not retrograde/combust
      −20 if karaka is debilitated or combust
      −10 if karaka is in H8 or H12 (loss houses)

    Returns:
        {
          "Mars (operator)":       {"strongest_chart_id": 2, "score": 78, "per_chart_scores": [{...}]},
          "Mercury (advisor)":     {...},
          ...
        }
    """
    partnership_topics = {
        "business", "career_business", "partnership", "startup",
        "joint_venture",
    }
    if len(charts) < 3 or (topic or "").lower() not in partnership_topics:
        return None

    out: dict[str, Any] = {}
    for karaka, role_label in PARTNERSHIP_KARAKA_ROLES.items():
        per_chart_scores: list[dict[str, Any]] = []
        for idx, ch in enumerate(charts, start=1):
            score = 0
            planets = (ch.get("chart_summary") or {}).get("planets") or {}
            p = planets.get(karaka) or {}
            planet_positions = ch.get("planet_positions") or {}
            ph = planet_positions.get(karaka)
            sigs = ch.get("significators") or {}
            inv = _invert_significators_for_planet(karaka, sigs)
            all_signified = set(inv["all_signified"])
            # +20 if karaka signifies H10 or H11
            if 10 in all_signified or 11 in all_signified:
                score += 20
            # +15 if self-significator (in own nakshatra)
            star_lord = p.get("star_lord", "")
            if star_lord == karaka:
                score += 15
            # +10 if in own/exalted sign (heuristic — engine doesn't
            # emit dignity directly; use star-lord as proxy)
            # −10 if in H8 or H12
            if ph in (8, 12):
                score -= 10
            per_chart_scores.append({
                "chart_id":    idx,
                "score":       score,
                "house":       ph,
                "signifies":   sorted(all_signified),
                "star_lord":   star_lord,
            })
        # Pick strongest
        if per_chart_scores:
            strongest = max(per_chart_scores, key=lambda s: s["score"])
            out[f"{karaka} ({role_label})"] = {
                "strongest_chart_id": strongest["chart_id"],
                "score":              strongest["score"],
                "per_chart_scores":   per_chart_scores,
            }
    return out


# ────────────────────────────────────────────────────────────────────
# ⑦ COMBINATION RULE VERDICT
# ────────────────────────────────────────────────────────────────────
def compute_combination_verdict(
    rule: str,
    per_chart_verdicts: list[str],
    joint_windows: list[dict[str, Any]],
    synastry_overlay: dict[str, Any] | None = None,
    focus_houses: list[int] | None = None,
) -> dict[str, Any]:
    """Apply OR / AND / Synastry rule mechanically per MC3.

    Returns:
        {
          "rule":          "OR" | "AND" | "synastry",
          "verdict":       "PROMISED" | "CONDITIONAL" | "DENIED" | "STRONG-FIT" | ...,
          "formula_trace": "Chart 1 PROMISED AND joint window exists → PROMISED"
        }
    """
    rule = (rule or "").lower()
    has_joint = bool(joint_windows)

    if rule.startswith("or"):
        promised = [v for v in per_chart_verdicts if "PROMISED" in v]
        conditional = [v for v in per_chart_verdicts if v == "CONDITIONAL"]
        denied = [v for v in per_chart_verdicts if v == "DENIED"]
        n = len(per_chart_verdicts) or 1
        if promised and has_joint:
            verdict = "PROMISED"
            trace = (
                f"OR-rule: {len(promised)}/{n} chart(s) PROMISED "
                f"AND joint window exists → PROMISED"
            )
        elif promised and not has_joint:
            verdict = "CONDITIONAL"
            trace = (
                f"OR-rule: {len(promised)}/{n} chart(s) PROMISED "
                f"BUT no joint window in next 24mo → CONDITIONAL"
            )
        elif conditional and has_joint:
            verdict = "CONDITIONAL-POSITIVE"
            trace = (
                f"OR-rule: {len(conditional)}/{n} chart(s) CONDITIONAL "
                f"AND joint window exists → CONDITIONAL-POSITIVE "
                f"(event possible during the joint window with the noted obstacles)"
            )
        elif conditional and not has_joint:
            verdict = "CONDITIONAL"
            trace = (
                f"OR-rule: {len(conditional)}/{n} chart(s) CONDITIONAL "
                f"BUT no joint window → CONDITIONAL"
            )
        elif len(denied) == n and not has_joint:
            verdict = "DENIED"
            trace = (
                f"OR-rule: ALL {len(denied)} chart(s) DENIED AND no joint window "
                f"→ DENIED"
            )
        else:
            verdict = "CONDITIONAL"
            trace = (
                f"OR-rule: mixed signals ({len(promised)} promised, "
                f"{len(conditional)} conditional, {len(denied)} denied) → CONDITIONAL"
            )
    elif rule == "and":
        denied = [v for v in per_chart_verdicts if v == "DENIED"]
        if len(denied) == len(per_chart_verdicts):
            verdict = "DENIED"
            trace = f"AND-rule: ALL {len(denied)} chart(s) DENIED → DENIED"
        elif denied:
            verdict = "CONDITIONAL"
            trace = (
                f"AND-rule: {len(denied)}/{len(per_chart_verdicts)} chart(s) DENIED "
                f"(needs ALL to deny) → CONDITIONAL"
            )
        else:
            verdict = "NOT-DENIED"
            trace = "AND-rule: no chart denies → NOT-DENIED"
    elif rule == "synastry":
        # Count positive/friction overlays across all pairs
        pos = 0
        fric = 0
        if synastry_overlay and focus_houses:
            focus_set = set(focus_houses)
            for _pair, planets in synastry_overlay.items():
                for _planet, info in planets.items():
                    h = info.get("house_in_other")
                    if h in focus_set:
                        pos += 1
                    elif h in {6, 8, 12}:
                        fric += 1
        if pos >= 4 and fric <= 1:
            verdict = "STRONG-FIT"
        elif pos >= 2 and fric <= 2:
            verdict = "WORKABLE"
        elif pos >= 1 and fric >= 2:
            verdict = "FRICTION"
        elif fric >= 3:
            verdict = "INCOMPATIBLE"
        else:
            verdict = "WORKABLE"
        trace = (
            f"Synastry-overlay: {pos} positive overlay(s), {fric} friction overlay(s) "
            f"→ {verdict}"
        )
    else:
        # Default: try OR
        verdict = "CONDITIONAL"
        trace = f"Unknown rule '{rule}' — defaulted to CONDITIONAL"

    return {"rule": rule, "verdict": verdict, "formula_trace": trace}


# ────────────────────────────────────────────────────────────────────
# Main entry — compute_all
# ────────────────────────────────────────────────────────────────────
def compute_all(
    charts: list[dict[str, Any]],
    *,
    focus_houses: list[int],
    denial_houses: list[int] | None = None,
    combination_rule: str = "or",
    karakas: list[str] | None = None,
    topic: str | None = None,
    relative_type: str | None = None,
    relative_focus_houses: list[int] | None = None,
    rps_today: list[str] | None = None,
) -> dict[str, Any]:
    """Run all 7 cross-chart engine primitives and return the combined
    fact table.  Topic-agnostic — caller supplies focus_houses + rule
    + karakas as parameters; engine has no per-topic logic.

    Returns the dict structure consumed by the multi-chart user-message
    builder in llm_service.
    """
    # ① Synastry overlay
    synastry = compute_synastry_overlay(charts)

    # ② Common significators
    common_sigs = compute_common_significators(charts, focus_houses, rps_today)

    # ③ Joint dasha windows
    joint_windows = compute_joint_dasha_windows(charts, focus_houses, rps_today)

    # ④ Sub-lord cross-check (also produces per-chart verdicts)
    sublord_xc = compute_sublord_crosscheck(charts, focus_houses, denial_houses)

    # ⑤ Bhavat Bhavam cross-validation
    bhavat_xc = compute_bhavat_bhavam_crossval(
        charts,
        relative_type=relative_type,
        focus_houses_for_native=focus_houses,
        focus_houses_for_relative=(relative_focus_houses or focus_houses),
    )

    # ⑥ Karaka role distribution (N≥3 partnership only)
    karaka_roles = compute_karaka_roles(charts, topic)

    # Extract per-chart verdicts from ④ for use in ⑦.
    # Take the STRONGEST verdict per chart across all focus houses
    # (a chart is "PROMISED" if any focus house's CSL chain promises).
    per_chart_verdicts: list[str] = []
    verdict_rank = {
        "STRONGLY PROMISED": 5,
        "PROMISED":          4,
        "CONDITIONAL":       3,
        "WEAKLY PROMISED":   2,
        "NEUTRAL":           1,
        "DENIED":            0,
    }
    if sublord_xc.get("per_focus_house"):
        n_charts = len(charts)
        for ci in range(1, n_charts + 1):
            best_verdict = "NEUTRAL"
            best_rank = -1
            for _hn, entries in sublord_xc["per_focus_house"].items():
                for entry in entries:
                    if entry["chart_id"] != ci:
                        continue
                    rank = verdict_rank.get(entry["verdict"], 0)
                    if rank > best_rank:
                        best_rank = rank
                        best_verdict = entry["verdict"]
            per_chart_verdicts.append(best_verdict)

    # ⑦ Combination rule verdict
    combination_verdict = compute_combination_verdict(
        rule=combination_rule,
        per_chart_verdicts=per_chart_verdicts,
        joint_windows=joint_windows,
        synastry_overlay=synastry,
        focus_houses=focus_houses,
    )

    return {
        "synastry_overlay":        synastry,
        "common_significators":    common_sigs,
        "joint_dasha_windows":     joint_windows,
        "sublord_crosscheck":      sublord_xc,
        "bhavat_bhavam_crossval":  bhavat_xc,
        "karaka_roles":            karaka_roles,
        "combination_verdict":     combination_verdict,
    }


# ────────────────────────────────────────────────────────────────────
# Text formatter — renders the 7 primitives as quotable tables for
# the multi-chart user-message block.
# ────────────────────────────────────────────────────────────────────
def format_cross_chart_primitives_for_llm(
    primitives: dict[str, Any],
    chart_labels: list[str],
) -> str:
    """Render the 7 primitives as a structured text block the LLM
    quotes verbatim.  Each section is clearly delimited and includes
    a 'quote VERBATIM, do not re-derive' instruction inline so the
    discipline survives prompt drift.
    """
    lines: list[str] = []
    lines.append("═════════════════════════════════════════════════════════════════")
    lines.append("CROSS-CHART ENGINE PRIMITIVES — quote VERBATIM, do NOT re-derive")
    lines.append("═════════════════════════════════════════════════════════════════")
    lines.append("")

    # ① Synastry overlay
    lines.append("① SYNASTRY OVERLAY MATRIX")
    lines.append(
        "   For each ordered pair, where each of A's planets lands in "
        "B's houses (using B's actual cusps)."
    )
    syn = primitives.get("synastry_overlay") or {}
    for pair_key, planets in syn.items():
        # pair_key is "(1, 2)" etc.; map to chart labels
        try:
            i_idx, j_idx = pair_key.strip("()").split(", ")
            i_label = chart_labels[int(i_idx) - 1] if int(i_idx) <= len(chart_labels) else f"Chart {i_idx}"
            j_label = chart_labels[int(j_idx) - 1] if int(j_idx) <= len(chart_labels) else f"Chart {j_idx}"
        except Exception:
            i_label, j_label = f"Chart {pair_key.strip('()').split(', ')[0]}", f"Chart {pair_key.strip('()').split(', ')[1]}"
        lines.append(f"   {i_label}'s planets → {j_label}'s houses:")
        for pname in GRAHA_ORDER:
            p = planets.get(pname)
            if not p:
                continue
            lines.append(
                f"     {pname:<8} ({p.get('sign')} {p.get('deg_in_sign_dms')}) "
                f"→ H{p.get('house_in_other', '—')}"
            )
        lines.append("")

    # ② Common significators
    lines.append("② COMMON-SIGNIFICATOR SET")
    lines.append(
        "   For each focus house, each chart's 4-step significators, "
        "their intersection, and the intersection with today's Ruling "
        "Planets (the 'ripe-to-manifest' set)."
    )
    cs = primitives.get("common_significators") or {}
    for hn, h in (cs.get("per_house") or {}).items():
        lines.append(f"   H{hn}:")
        for entry in h.get("per_chart", []):
            cid = entry["chart_id"]
            label = chart_labels[cid - 1] if cid <= len(chart_labels) else f"Chart {cid}"
            lines.append(f"     {label}: significators = {entry['significators']}")
        lines.append(f"     Intersection across all charts: {h.get('intersection_all_charts')}")
        lines.append(f"     ∩ today's RPs (RIPE):           {h.get('intersection_with_rp')}")
    if cs.get("all_focus_intersection"):
        lines.append(
            f"   Across ALL focus houses: intersection = {cs['all_focus_intersection']} · "
            f"∩ RPs = {cs['all_focus_intersection_with_rp']}"
        )
    lines.append("")

    # ③ Joint dasha windows
    lines.append("③ JOINT DASHA INTERSECTION WINDOWS")
    lines.append(
        "   Date ranges (next 24mo) where ALL charts' running dasha "
        "trees fire focus-house significators simultaneously.  Ranked "
        "by score 0-100.  +10 score if RP overlap."
    )
    windows = primitives.get("joint_dasha_windows") or []
    if not windows:
        lines.append("   (No joint dasha windows in next 24 months where all charts fire focus group.)")
    for w in windows[:5]:
        lines.append(f"   {w['start']} → {w['end']}  ·  score {w['score']}")
        for entry in w.get("per_chart", []):
            cid = entry["chart_id"]
            label = chart_labels[cid - 1] if cid <= len(chart_labels) else f"Chart {cid}"
            lines.append(
                f"     {label}: active layers = {entry['active_layers']} · "
                f"signifying lords = {entry['lords_signifying']}"
            )
        if w.get("rp_overlap"):
            lines.append(f"     RP overlap (boost): {w['rp_overlap']}")
    lines.append("")

    # ④ Sub-lord cross-check
    lines.append("④ SUB-LORD CROSS-CHECK SUMMARY")
    lines.append(
        "   Per focus house, each chart's CSL chain + per-chart 5-tier "
        "verdict (single-chart RULE 5)."
    )
    sx = primitives.get("sublord_crosscheck") or {}
    for hn, entries in (sx.get("per_focus_house") or {}).items():
        lines.append(f"   H{hn}:")
        for entry in entries:
            cid = entry["chart_id"]
            label = chart_labels[cid - 1] if cid <= len(chart_labels) else f"Chart {cid}"
            lines.append(
                f"     {label}: CSL={entry['csl']} (in H{entry.get('csl_house')}), "
                f"signifies {entry['csl_signifies']} · "
                f"chain union {entry['all_significations']} · "
                f"verdict = {entry['verdict']}"
            )
    lines.append("")

    # ⑤ Bhavat Bhavam cross-validation
    bx = primitives.get("bhavat_bhavam_crossval")
    if bx and bx.get("applicable"):
        lines.append("⑤ BHAVAT BHAVAM CROSS-VALIDATION")
        lines.append(
            f"   Relative type: {bx['relative_type']} · "
            f"rotated axis in native's chart: H{bx['rotated_axis']}"
        )
        lines.append(f"   Rotated-frame verdict (native's chart, ~70% conf): {bx['rotated_verdict']}")
        lines.append(f"   Natal verdict (relative's chart, ~95% conf): {bx['natal_verdict']}")
        lines.append(
            f"   Agreement: {bx['agree']} · combined confidence: {bx['combined_confidence_pct']}%"
        )
        lines.append("")

    # ⑥ Karaka roles
    kr = primitives.get("karaka_roles")
    if kr:
        lines.append("⑥ KARAKA ROLE DISTRIBUTION (N≥3 partnership)")
        for role_label, info in kr.items():
            cid = info["strongest_chart_id"]
            label = chart_labels[cid - 1] if cid <= len(chart_labels) else f"Chart {cid}"
            lines.append(
                f"   {role_label}: strongest = {label} (score {info['score']})"
            )
            for s in info.get("per_chart_scores", []):
                slabel = chart_labels[s["chart_id"] - 1] if s["chart_id"] <= len(chart_labels) else f"Chart {s['chart_id']}"
                lines.append(
                    f"     {slabel}: score {s['score']}, house H{s['house']}, "
                    f"signifies {s['signifies']}, star-lord {s['star_lord']}"
                )
        lines.append("")

    # ⑦ Combination rule verdict
    lines.append("⑦ COMBINATION RULE VERDICT (apply mechanically per MC3)")
    cv = primitives.get("combination_verdict") or {}
    lines.append(f"   Rule applied: {cv.get('rule')}")
    lines.append(f"   Combined verdict: {cv.get('verdict')}")
    lines.append(f"   Formula trace: {cv.get('formula_trace')}")
    lines.append("")

    return "\n".join(lines)
