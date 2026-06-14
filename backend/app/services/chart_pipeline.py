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
# PR A1.12 + A1.17 — CSL 4-step chain + Pattern D2 detector wired into pipeline
# so Analysis tab (/analyze + /analyze-stream) gets the full chain text + the
# topic-specific D2 warning. Previously csl_chains was only computed in
# /workspace + /quick-insights (the latter is hard-disabled), meaning Analysis
# was missing the structured 4-step data entirely.
from app.services.csl_chains import (
    compute_csl_chains, format_csl_chains_for_llm,
    detect_pattern_d2, format_pattern_d2_for_llm,
    compute_joint_period_significations, format_joint_period_for_llm,
)

_log = logging.getLogger("chart_pipeline")


# ────────────────────────────────────────────────────────────────────
# Ruling-Planet source resolution + rp_meta helper (trust contract).
# ────────────────────────────────────────────────────────────────────
# Every chart-generating router used to do its own ad-hoc fallback:
#
#     rp_lat = req.live_latitude if req.live_latitude is not None else req.latitude
#     rp_lon = req.live_longitude if req.live_longitude is not None else req.longitude
#     rp_tz  = req.live_timezone_offset if req.live_timezone_offset is not None else tz_offset
#
# Two problems with that pattern:
#
#   1. **Partial mix.** If one live_* is missing, the router silently
#      mixed live lat/lon with natal tz — which produces the WRONG
#      day-lord (sunrise check uses tz) for the wrong location.
#   2. **Silent source.** The router computed RPs and returned them
#      without any signal of WHICH location/time they came from.  The
#      AI system prompt (RULE 39) tells Claude "RPs are at the user's
#      current location" — a lie when natal fallback fires, but the
#      astrologer reading the answer has no way to know.
#
# `_resolve_rp_triple` enforces all-or-nothing live → consistent
# triple, and `build_rp_meta` returns the metadata block the frontend
# uses to render the source pill + inline labels everywhere RPs are
# consumed.

def _resolve_rp_triple(
    *,
    natal_lat: float, natal_lon: float, natal_tz: float,
    live_lat: float | None, live_lon: float | None, live_tz: float | None,
) -> tuple[float, float, float, str]:
    """Return (rp_lat, rp_lon, rp_tz, source). All-or-nothing on live —
    if any one of the three live_* is missing, we fall back to the natal
    triple entirely (never mix)."""
    if live_lat is not None and live_lon is not None and live_tz is not None:
        return (live_lat, live_lon, live_tz, "live")
    return (natal_lat, natal_lon, natal_tz, "natal_fallback")


def build_rp_meta(
    rp_lat: float, rp_lon: float, rp_tz: float, *, source: str,
    place_name: str | None = None,
) -> dict[str, Any]:
    """Build the rp_meta block consumed by the frontend.

    Fields:
      source            "live" | "natal_fallback" | "event" | "partner_natal"
                        (last two used by Muhurtha / Match call sites)
      lat, lon, tz_offset   exact numbers that were passed to get_ruling_planets
      tz_name           IANA name resolved via timezonefinder (may be None
                        if lookup fails — non-fatal, frontend falls back
                        to showing the offset).
      place_name        Human display string if the caller knows one
                        (frontend's `useLiveLocation` knows "Hyderabad,
                        India"; pipeline only sees lat/lon).
      computed_at_local "HH:MM" wall-clock at rp_tz, used in inline
                        labels like "Hyderabad · 14:32".

    All enrichment is wrapped in try/except — a name-lookup hiccup
    cannot break workspace generation. Frontend treats missing fields
    gracefully (falls back to coords / offset).
    """
    meta: dict[str, Any] = {
        "source": source,
        "lat": rp_lat,
        "lon": rp_lon,
        "tz_offset": rp_tz,
        "tz_name": None,
        "place_name": place_name,
        "computed_at_local": None,
    }
    try:
        from app.services.timezone_utils import resolve_timezone
        from datetime import datetime as _dt_now, timezone as _dt_tz, timedelta as _td
        _utc_now = _dt_now.now(_dt_tz.utc)
        _, _tz_name = resolve_timezone(rp_lat, rp_lon, _utc_now)
        meta["tz_name"] = _tz_name
        _local_dt = _utc_now + _td(hours=rp_tz)
        meta["computed_at_local"] = f"{_local_dt.hour:02d}:{_local_dt.minute:02d}"
    except Exception as _e:  # noqa: BLE001 — non-critical metadata
        _log.warning("rp_meta enrichment failed: %s", _e)
    return meta


def compute_age_years(birth_date_str: str) -> int:
    """Compute current age in whole years from a YYYY-MM-DD birth date."""
    try:
        bd = datetime.strptime(birth_date_str, "%Y-%m-%d")
        # PR A1.3-fix-24 — datetime.utcnow() is deprecated in Python 3.12+.
        # Switched to IST helper so age boundary aligns with Indian users'
        # perceived "today" (small but real edge case at IST midnight).
        from app.services.today import now_ist
        today = now_ist()
        years = today.year - bd.year - (
            (today.month, today.day) < (bd.month, bd.day)
        )
        return max(0, years)
    except Exception as e:
        # PR A1.3-fix-24 — log instead of silent 0 (was hiding date-parse
        # bugs as "age 0" which the LLM then hedges around in output)
        import logging
        logging.getLogger("chart_pipeline").warning(
            "compute_age_years failed for %r: %s — defaulting to 0", birth_date_str, e
        )
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
    live_latitude: float | None = None,
    live_longitude: float | None = None,
    live_timezone_offset: float | None = None,
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
    # PR A1.12 — Override caller-supplied timezone_offset with the
    # birth-date-correct value resolved from lat/lon. Frontend's
    # number is now a fallback only — see timezone_utils.resolve_birth_offset
    # docstring for the full bug story (silent IST fallback corrupted
    # every non-IST chart).
    from app.services.timezone_utils import resolve_birth_offset
    timezone_offset, _resolved_tz_name = resolve_birth_offset(
        latitude, longitude, date, time, fallback_offset=timezone_offset,
    )

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
    # Live location wins; natal lat/lon/tz is a fallback only — but we
    # ALWAYS record which one was used (see build_rp_meta below) so the
    # frontend can show the astrologer the exact source of every RP
    # citation via the workspace header pill, the AI answer wrap, and
    # every per-tab inline source label.
    rp_lat, rp_lon, rp_tz, _rp_source = _resolve_rp_triple(
        natal_lat=latitude, natal_lon=longitude, natal_tz=timezone_offset,
        live_lat=live_latitude, live_lon=live_longitude, live_tz=live_timezone_offset,
    )

    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=_rp_source)
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

    # ── 6b. Marriage TYPE — deterministic five-signal classification ────
    # 2026-06-14: the five-signal love-vs-arranged classifier already exists
    # in compatibility_engine (used by the Match feature) but was never wired
    # into the single-chart marriage Q&A. Result: the LLM re-derived the five
    # signals in prose on every call and gave inconsistent verdicts across
    # re-asks (love-cum-arranged → family-arranged → "love denied" on the
    # SAME chart). Here we compute the deterministic verdict ONCE so the
    # narration can TRANSCRIBE it (see RULE 33) instead of recomputing.
    #
    # Import is safe: compatibility_engine does NOT import chart_pipeline (no
    # cycle); it only depends on chart_engine/kp_advanced_compute siblings.
    # Degrades silently — a failure here just omits the block; the LLM then
    # falls back to the framework, i.e. never worse than before this change.
    if topic == "marriage":
        try:
            from app.services.compatibility_engine import (
                _five_signal_classification, get_sub_lord as _get_sub_lord,
            )
            _cusp_lons = [
                chart["cusps"][f"House_{i}"]["cusp_longitude"] for i in range(1, 13)
            ]
            advanced["marriage_classification"] = _five_signal_classification({
                "planets": chart["planets"],
                "cusp_lons": _cusp_lons,
                "moon_lon": chart["planets"].get("Moon", {}).get("longitude", 0),
                "h7_sub_lord": _get_sub_lord(_cusp_lons[6] % 360),
            })
        except Exception as e:
            _log.warning("marriage_classification compute failed: %s", e)

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

    # ── 10b. Tara Chakra + Chandra Bala (PR A1.3-fix-20 / fix-21) ────
    # Tara Bala uses NAKSHATRAS (27/9-tara). Chandra Bala uses SIGNS
    # (12-rashi). Both axes paired for full muhurtha favorability.
    try:
        from app.services.kp_tara_chakra import (
            compute_tara_chakra, compute_today_tara, compute_transit_taras,
            compute_today_chandra_bala, TARA_PARIHARAM,
        )
        natal_moon_nak = chart["planets"].get("Moon", {}).get("nakshatra", "")
        natal_moon_sign = chart["planets"].get("Moon", {}).get("sign", "")
        tara_chakra_full = compute_tara_chakra(natal_moon_nak)
        today_tara = None
        today_chandra_bala = None
        transit_taras: list = []
        if transits.get("current_transits"):
            cur_moon_nak = transits["current_transits"].get("Moon", {}).get("nakshatra", "")
            cur_moon_sign = transits["current_transits"].get("Moon", {}).get("sign", "")
            today_tara = compute_today_tara(natal_moon_nak, cur_moon_nak)
            today_chandra_bala = compute_today_chandra_bala(natal_moon_sign, cur_moon_sign)
            transit_taras = compute_transit_taras(
                natal_moon_nak, transits["current_transits"]
            )
        tara_data = {
            "chakra": tara_chakra_full,
            "natal_moon_sign": natal_moon_sign,
            "today_tara": today_tara,
            "today_chandra_bala": today_chandra_bala,
            "transit_taras": transit_taras,
            "pariharam": TARA_PARIHARAM,
        }
    except Exception as e:
        _log.warning("Tara/Chandra Bala compute failed: %s", e)
        tara_data = {}

    # ── 10a. Relief calendar — upcoming favourable PADs in next 33 months ──
    # (PR A1.22)
    # When a user is in a heavy current dasha period (Saturn AD/PAD, hostile
    # transits, depressive content in question), surface upcoming "lighter
    # window" PADs so the AI can ground hope in math instead of platitudes.
    # Heuristic: Mercury / Venus / Jupiter / Moon are the "lighter" planet
    # lords. Mars / Saturn / Rahu / Ketu / Sun are "heavier" or "mixed".
    # The lighter lords' PADs within the current Antardasha are the relief windows.
    relief_calendar = []
    try:
        from datetime import datetime as _dt
        _today = _dt.now()
        _LIGHTER_LORDS = {"Mercury", "Venus", "Jupiter", "Moon"}
        # Combine current AD's PADs + first 2 upcoming ADs' PADs
        pads_to_scan = []
        if pratyantardashas:
            pads_to_scan.extend(pratyantardashas)
        # Cap at 18 months ahead so we don't list far-future irrelevant windows
        for pad in pads_to_scan[:24]:  # up to 24 PADs across current + next ADs
            pad_lord = pad.get("pratyantardasha_lord") or pad.get("lord", "")
            if pad_lord not in _LIGHTER_LORDS:
                continue
            try:
                # Engine uses fields "start" and "end" (not "_date" suffix)
                pad_end = _dt.strptime(pad.get("end", ""), "%Y-%m-%d")
                if pad_end < _today:
                    continue  # already past
                pad_start = _dt.strptime(pad.get("start", ""), "%Y-%m-%d")
                days_to_start = max(0, (pad_start - _today).days)
                if days_to_start > 1000:  # skip beyond ~33 months
                    continue
                relief_calendar.append({
                    "lord": pad_lord,
                    "start": pad.get("start"),
                    "end": pad.get("end"),
                    "days_to_start": days_to_start,
                    "kind": "PAD",
                })
            except Exception:
                continue
    except Exception as e:
        _log.warning("Relief calendar build failed: %s", e)

    # ── 10b. CSL 4-step chain + Pattern D2 detection (PR A1.12 + A1.17) ──
    # Compute structured 4-step CSL chain for every house and detect Pattern D2
    # (offer-then-withdrawn) for the user's specific topic. Both surface into
    # the LLM prompt — chain_text gives Claude the exact 4-step union per cusp,
    # d2_text adds a structural warning when present.
    csl_chains_data: dict = {}
    csl_chains_text = ""
    pattern_d2_text = ""
    try:
        # chart["cusps"] keys are "House_1".."House_12"; values have cusp_longitude + sub_lord
        cusps_list = [
            {
                "house_num": int(str(h).replace("House_", "")),
                "cusp_longitude": c.get("cusp_longitude", 0),
                "sub_lord_en": c.get("sub_lord", ""),
            }
            for h, c in chart["cusps"].items()
        ]
        planets_list = [
            {"planet_en": pname, "longitude": p.get("longitude", 0)}
            for pname, p in chart["planets"].items()
        ]
        csl_chains_data = compute_csl_chains(cusps_list, planets_list)
        csl_chains_text = format_csl_chains_for_llm(csl_chains_data)
        # Pattern D2 detection runs against the topic Claude is answering for.
        # Topic strings: "marriage", "career", "job_employment", "wealth",
        # "children", "education", "property", "foreign", "litigation", "health".
        d2 = detect_pattern_d2(csl_chains_data, topic)
        pattern_d2_text = format_pattern_d2_for_llm(d2)
    except Exception as e:
        _log.warning("CSL chains + Pattern D2 compute failed: %s", e)

    # ── 10c. Joint Period signification helper (PR A1.18) ───────────
    # Pre-compute the MD+AD+PAD+Sookshma lord signification union per Pattern T1.
    # Saves AI from manually walking each lord's CSL chain during every reading.
    # Note: current_md uses field "lord"; ad/pad/sookshma use full-name fields.
    joint_period_text = ""
    try:
        md_lord = current_md.get("lord") if current_md else None
        ad_lord = current_ad.get("antardasha_lord") if current_ad else None
        pad_lord = current_pad.get("pratyantardasha_lord") if current_pad else None
        sk_lord = current_sookshma.get("sookshma_lord") if current_sookshma else None
        if md_lord and ad_lord and pad_lord:
            jp = compute_joint_period_significations(
                csl_chains_data, md_lord, ad_lord, pad_lord, sk_lord
            )
            joint_period_text = format_joint_period_for_llm(jp)
    except Exception as e:
        _log.warning("Joint period compute failed: %s", e)

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
        # rp_meta — surface which location & time were used to compute the
        # RPs above.  Frontend uses this to render the source pill on the
        # workspace header AND inline labels above every AI answer / RP
        # block, so the astrologer always knows where the RPs came from.
        "rp_meta": rp_meta,
        "significators": all_significators,
        "planet_positions": planet_positions,
        "advanced_compute": advanced,
        "transits": transits,
        "yogini_dasha": yogini_data,
        "decision_support": decision_data,
        "dasha_conflicts": conflict_flags,
        "tara_chakra": tara_data,  # PR A1.3-fix-20
        # PR A1.12 + A1.17 — CSL 4-step chain + Pattern D2 detection
        "csl_chains": csl_chains_data,
        "csl_chains_text": csl_chains_text,
        "pattern_d2_text": pattern_d2_text,
        # PR A1.18 — Joint Period signification union
        "joint_period_text": joint_period_text,
        # PR A1.22 — relief calendar (upcoming lighter PADs in next ~33 months)
        "relief_calendar": relief_calendar,
        # Raw chart for the response payload (kept separately so the
        # routers can return it to the frontend without re-running the
        # compute).
        "_chart_raw": chart,
        "_moon_longitude": moon_longitude,
    }

    return chart_data
