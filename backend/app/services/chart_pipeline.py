"""
chart_pipeline.py — Shared chart compute pipeline (PR A1.3-fix-14).

Used by BOTH /astrologer/analyze AND /prediction/ask so user mode and
astrologer mode have IDENTICAL structural accuracy.

Before this module existed, /prediction/ask (general user mode) was
running only the basic compute (chart, dashas, promise, timing, RPs,
basic significators) — missing the entire advanced compute suite that
fixes 6-10 added to the astrologer route. That meant general users
were getting structurally LESS accurate analyses than astrologers,
including the unfixed gender-hallucination and age-hedging bugs.

This module is the single source of truth. It returns the full
`chart_data` dict that `get_prediction()` expects, with EVERY engine
signal:

  - NATIVE PROFILE block (gender + age + birth_date) — kills the PCOD-
    for-male hallucination + "if you're 30+" hedging
  - Basic chart (planets + cusps)
  - Dashas: MD + AD + PAD + Sookshma (with current values + full upcoming
    sequences + 4-level depth for current AD + next 2 ADs)
  - check_promise + check_dasha_relevance (basic)
  - Ruling planets + full A/B/C/D significators per house
  - Planet → house positions
  - Advanced compute (compute_advanced_for_topic): Star-Sub Harmony
    3-layer split with Rahu/Ketu proxy, A/B/C/D significator strengths,
    fruitful significators (sig ∩ RP), supporting cusp activations,
    AD-sublord triggers, partner profile, Ashtakavarga BAV/SAV, dignity,
    vargottama, gandanta, intercepted-sign detection, stelliums, lagna
    lord disposition, divisional charts D7/D9/D10/D12
  - Transit bundle (compute_transit_bundle): current transits, Sade Sati,
    key cusp transits, upcoming 48-month windows, planetary returns
  - Yogini Dasha cross-check (parallel 36-yr cycle)
  - decision_support_score (calibrated 0-100 confidence with weighted
    ledger and penalty system from fix-10)
  - flag_dasha_conflicts (Vimsottari ↔ Yogini convergence/conflict)
  - rank_sookshmas_by_fire_score (pre-ranked day-precision sookshmas
    so the LLM cites them directly per RULE 18 instead of recomputing)

All errors in optional compute (transits, Yogini, decision support,
sookshma ranking) are caught with logging fallbacks — same pattern as
the astrologer route — so a broken sub-compute never blocks an
analysis.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from app.services.chart_engine import (
    generate_chart,
    calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    calculate_pratyantardashas, get_current_pratyantardasha,
    calculate_sookshma_dashas, get_current_sookshma,
    check_promise, check_dasha_relevance,
    get_ruling_planets, get_all_house_significators,
    get_planet_house_positions,
)

_log = logging.getLogger("chart_pipeline")


def compute_age_years(birth_date_str: str) -> int:
    """Compute current age in whole years from a YYYY-MM-DD birth date."""
    try:
        bd = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.utcnow()
        years = today.year - bd.year - (
            (today.month, today.day) < (bd.month, bd.day)
        )
        return max(0, years)
    except Exception:
        return 0


def build_full_chart_data(
    *,
    name: str,
    date: str,
    time: str,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    gender: str,
    topic: str,
) -> dict[str, Any]:
    """
    Run the full KP compute pipeline and return a chart_data dict
    suitable for get_prediction().

    Args:
        name: Native's name (used as-is in NATIVE PROFILE).
        date: YYYY-MM-DD birth date.
        time: HH:MM 24h birth time.
        latitude / longitude / timezone_offset: birth location.
        gender: "male" / "female" / "other" / "" (empty if unknown).
        topic: Detected/passed topic for advanced compute (e.g. "marriage",
               "job"). Pass "general" if no specific topic.

    Returns:
        chart_data dict matching the shape /astrologer/analyze produces.
        Optional sub-computes (transits / yogini / decision_support /
        ranked sookshmas) degrade silently with logging on error.
    """
    # ── 1. Basic chart ──────────────────────────────────────────────
    chart = generate_chart(date, time, latitude, longitude, timezone_offset)
    moon_longitude = chart["planets"]["Moon"]["longitude"]

    # ── 2. Dasha tree (MD → AD → PAD → Sookshma) ─────────────────────
    dashas = calculate_dashas(date, time, moon_longitude, timezone_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    pratyantardashas = calculate_pratyantardashas(current_ad)
    current_pad = get_current_pratyantardasha(pratyantardashas)

    all_ad_pratyantardashas: dict = {}
    for ad in antardashas:
        ad_lord = ad["antardasha_lord"]
        all_ad_pratyantardashas[ad_lord] = calculate_pratyantardashas(ad)

    # ── 3. Sookshma (4th level) — full depth for current AD + next 2 ─
    sookshmas_current_ad: dict = {}
    for pad in pratyantardashas:
        pad_lord = pad.get("pratyantardasha_lord")
        sookshmas_current_ad[pad_lord] = calculate_sookshma_dashas(pad)
    current_sookshma = (
        get_current_sookshma(
            sookshmas_current_ad.get(current_pad.get("pratyantardasha_lord"), [])
        )
        if current_pad
        else {}
    )

    sookshmas_upcoming_ads: dict = {}
    try:
        current_ad_lord = current_ad.get("antardasha_lord") if current_ad else None
        cur_idx = next(
            (
                i for i, a in enumerate(antardashas)
                if a.get("antardasha_lord") == current_ad_lord
                and a.get("start") == current_ad.get("start")
            ),
            -1,
        )
        for offset in (1, 2):
            j = cur_idx + offset
            if 0 <= j < len(antardashas):
                future_ad = antardashas[j]
                future_pads = calculate_pratyantardashas(future_ad)
                ad_label = (
                    f"{future_ad.get('antardasha_lord')} "
                    f"({future_ad.get('start')} → {future_ad.get('end')})"
                )
                sookshmas_upcoming_ads[ad_label] = {
                    pad.get("pratyantardasha_lord"): calculate_sookshma_dashas(pad)
                    for pad in future_pads
                }
    except Exception as e:
        _log.warning("sookshmas_upcoming_ads compute failed: %s", e)
        sookshmas_upcoming_ads = {}

    # ── 4. Promise + timing (basic) ─────────────────────────────────
    promise = check_promise(topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(
        topic, current_md, current_ad, chart["planets"], chart["cusps"]
    )

    # ── 5. RP + full significators + planet houses ──────────────────
    ruling_planets = get_ruling_planets(latitude, longitude, timezone_offset)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    planet_positions = get_planet_house_positions(chart["planets"], chart["cusps"])

    # ── 6. Advanced compute (Star-Sub Harmony, A/B/C/D, partner, etc) ──
    from app.services.kp_advanced_compute import compute_advanced_for_topic
    promise_verdict_hint = (
        "STRONGLY PROMISED" if promise.get("is_promised") else "WEAKLY PROMISED"
    )
    rp_list = (
        (ruling_planets.get("rp_context", {}) or {}).get("slot_assignments", [])
        if isinstance(ruling_planets, dict)
        else []
    )
    advanced = compute_advanced_for_topic(
        topic=topic,
        planets=chart["planets"],
        cusps=chart["cusps"],
        planet_positions=planet_positions,
        ruling_planets_list=rp_list,
        current_md_lord=(current_md or {}).get("lord"),
        current_ad_lord=(current_ad or {}).get("antardasha_lord"),
        upcoming_antardashas=antardashas,
        promise_verdict=promise_verdict_hint,
    )

    # ── 7. Transit bundle (degrades silently) ───────────────────────
    try:
        from app.services.kp_transit_compute import compute_transit_bundle
        transits = compute_transit_bundle(
            chart["cusps"], moon_longitude, chart["planets"]
        )
    except Exception as e:
        _log.warning("compute_transit_bundle failed: %s", e)
        transits = {}

    # ── 8. Yogini Dasha cross-check (degrades silently) ─────────────
    try:
        from app.services.kp_yogini_dasha import (
            calculate_yogini_dashas, get_current_yogini, cross_check_with_vimsottari,
        )
        yogini_list = calculate_yogini_dashas(date, time, moon_longitude)
        current_yogini = get_current_yogini(yogini_list)
        yogini_xcheck = cross_check_with_vimsottari(yogini_list, antardashas[:9])
        yogini_data = {
            "current": current_yogini,
            "next_3_yoginis": yogini_list[1:4] if len(yogini_list) > 1 else [],
            "vimsottari_xcheck": yogini_xcheck,
        }
    except Exception as e:
        _log.warning("Yogini Dasha compute failed: %s", e)
        yogini_data = {}

    # ── 9. Decision support + dasha conflicts (degrades silently) ───
    try:
        from app.services.kp_advanced_compute import (
            decision_support_score, flag_dasha_conflicts,
        )
        decision_data = decision_support_score(advanced)
        conflict_flags = flag_dasha_conflicts(advanced, yogini_data)
    except Exception as e:
        _log.warning("decision_support / flag_dasha_conflicts failed: %s", e)
        decision_data = {}
        conflict_flags = []

    # ── 10. Sookshma fire-rank (degrades silently) ──────────────────
    try:
        from app.services.kp_advanced_compute import rank_sookshmas_by_fire_score
        ranked_sookshmas_current_ad: dict = {}
        for pad_lord, sookshmas in sookshmas_current_ad.items():
            ranked_sookshmas_current_ad[pad_lord] = rank_sookshmas_by_fire_score(
                sookshmas,
                advanced.get("relevant_houses", []),
                advanced.get("denial_houses", []),
                chart["planets"],
                chart["cusps"],
                planet_positions,
                rp_list,
                advanced.get("vargottama", {}),
            )
    except Exception as e:
        _log.warning("Sookshma ranking failed: %s", e)
        ranked_sookshmas_current_ad = sookshmas_current_ad

    # ── 10b. Tara Chakra (PR A1.3-fix-20) ───────────────────────────
    # Native's Janma Nakshatra is determined from natal Moon's nakshatra.
    # Also compute today's Tara (current Moon's nakshatra → Tara for native)
    # and transit Taras for each currently-transiting planet.
    try:
        from app.services.kp_tara_chakra import (
            compute_tara_chakra, compute_today_tara, compute_transit_taras,
        )
        natal_moon_nak = chart["planets"].get("Moon", {}).get("nakshatra", "")
        tara_chakra_full = compute_tara_chakra(natal_moon_nak)
        today_tara = None
        transit_taras: list = []
        if transits.get("current_transits"):
            cur_moon_nak = transits["current_transits"].get("Moon", {}).get("nakshatra", "")
            today_tara = compute_today_tara(natal_moon_nak, cur_moon_nak)
            transit_taras = compute_transit_taras(
                natal_moon_nak, transits["current_transits"]
            )
        tara_data = {
            "chakra": tara_chakra_full,
            "today_tara": today_tara,
            "transit_taras": transit_taras,
        }
    except Exception as e:
        _log.warning("Tara Chakra compute failed: %s", e)
        tara_data = {}

    # ── 11. Assemble chart_data dict ────────────────────────────────
    chart_data: dict[str, Any] = {
        "name": name,
        # NATIVE PROFILE — gender + age + birth_date kill the
        # PCOD-for-male hallucination + age-hedging.
        "gender": gender or "",
        "birth_date": date,
        "age_years": compute_age_years(date),
        "chart_summary": {
            "planets": chart["planets"],
            "cusps": chart["cusps"],
        },
        "promise_analysis": promise,
        "timing_analysis": timing,
        "current_dasha": {
            "mahadasha": current_md,
            "antardasha": current_ad,
            "pratyantardasha": current_pad,
            "sookshma": current_sookshma,
        },
        "upcoming_antardashas": antardashas,
        "all_ad_pratyantardashas": all_ad_pratyantardashas,
        "sookshmas_current_ad": ranked_sookshmas_current_ad,
        "sookshmas_upcoming_ads": sookshmas_upcoming_ads,
        "ruling_planets": ruling_planets,
        "significators": all_significators,
        "planet_positions": planet_positions,
        "advanced_compute": advanced,
        "transits": transits,
        "yogini_dasha": yogini_data,
        "decision_support": decision_data,
        "dasha_conflicts": conflict_flags,
        "tara_chakra": tara_data,  # PR A1.3-fix-20
        # Raw chart for the response payload (kept separately so the
        # routers can return it to the frontend without re-running the
        # compute).
        "_chart_raw": chart,
        "_moon_longitude": moon_longitude,
    }

    return chart_data
