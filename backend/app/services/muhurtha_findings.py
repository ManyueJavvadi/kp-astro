"""
PR A2.2a.3 — Muhurtha findings module (findings-first prompting).

Purpose: move deterministic rule-LOOKUP from the LLM to Python. The
LLM today wastes ~35-50% of its output tokens re-deriving facts like
"Trayodashi is a good tithi per §3.1" or "Swati is Chara class" when
these are pure table lookups. By precomputing these as structured
findings and feeding them to the LLM, the LLM's tokens shift from
"reciting tables" to "judging, comparing, recommending" — which is
where the LLM actually adds value.

Design principles (see .claude/research/muhurtha-audit.md discussion
with user):

1. Findings are DESCRIPTIVE, never PRESCRIPTIVE.
   GOOD: "lagna_csl_signifies_denial": ["H12"]
   BAD:  "lagna_csl_verdict": "reject"

2. The LLM still has the full KB in its system prompt — it still
   reasons over rules, it just doesn't waste tokens recreating
   lookups it doesn't need to.

3. Findings include their KB §cite so the LLM can ground its prose
   in verifiable references without hunting through the KB.

4. Each finding is a bare fact + its rule context. The LLM decides
   how (or whether) to use it.

This module is pure data transformation — no I/O, no LLM calls, no
network. Safe to call per window inline.
"""

from typing import Dict, List, Any, Optional

# ────────────────────────────────────────────────────────────────────
# LOOKUP TABLES (sourced from backend/app/kp_knowledge/muhurtha.md)
# ────────────────────────────────────────────────────────────────────

# Muhurtha Chintamani 10-class nakshatra taxonomy (KB §3.2)
# 0-indexed by standard nakshatra order (Ashwini=0 → Revati=26)
NAKSHATRA_CLASS = {
    # Dhruva (fixed) — foundations, installations, long-term contracts
    3: "Dhruva", 11: "Dhruva", 20: "Dhruva", 25: "Dhruva",
    # Chara (movable) — vehicles, travel, trade, changing residence
    14: "Chara", 6: "Chara", 21: "Chara", 22: "Chara", 23: "Chara",
    # Kshipra (swift) — education, medicine, short travel, quick txns
    0: "Kshipra", 7: "Kshipra", 12: "Kshipra",
    # Mridu (mild/soft) — marriage, arts, jewelry, romance
    4: "Mridu", 13: "Mridu", 16: "Mridu", 26: "Mridu",
    # Mishra (mixed) — both benefic and malefic
    2: "Mishra", 15: "Mishra",
    # Ugra (fierce) — demolition, debt collection — AVOID for auspicious
    1: "Ugra", 9: "Ugra", 10: "Ugra", 19: "Ugra", 24: "Ugra",
    # Tikshna (sharp) — surgery, tantrik, incantations — AVOID general
    5: "Tikshna", 8: "Tikshna", 17: "Tikshna", 18: "Tikshna",
}

# Nakshatra index → readable name (for findings output)
NAKSHATRA_NAMES_26 = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","P-Phalguni","U-Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Moola","P-Ashadha","U-Ashadha","Shravana","Dhanishta","Shatabhisha",
    "P-Bhadrapada","U-Bhadrapada","Revati",
]

# Event → preferred nakshatra classes (KB §9.x per-event playbooks)
# First class = strongly preferred; second = acceptable; others = suboptimal
EVENT_PREFERRED_NAK_CLASSES = {
    "vehicle":       ["Chara", "Kshipra"],
    "travel":        ["Chara", "Kshipra"],
    "house_warming": ["Dhruva", "Mridu"],
    "marriage":      ["Mridu", "Dhruva"],
    "business":      ["Kshipra", "Chara"],
    "education":     ["Kshipra", "Dhruva"],
    "medical":       ["Tikshna", "Kshipra"],   # surgery prefers Tikshna
    "investment":    ["Dhruva", "Kshipra"],
    "legal":         ["Ugra", "Tikshna"],       # aggression, sharpness
    "general":       ["Kshipra", "Mridu"],
}

# Nakshatra classes to AVOID per event type
EVENT_AVOID_NAK_CLASSES = {
    "vehicle":       ["Ugra", "Tikshna"],
    "travel":        ["Ugra"],
    "house_warming": ["Ugra", "Tikshna"],
    "marriage":      ["Ugra", "Tikshna"],
    "business":      ["Ugra"],
    "education":     ["Ugra"],
    "medical":       ["Mridu"],                 # mild is wrong for surgery
    "investment":    ["Ugra"],
    "legal":         ["Mridu"],                 # mild is wrong for legal
    "general":       ["Ugra", "Tikshna"],
}

# Event → preferred weekdays (KB §3.4, per-event overrides global rule)
# weekday 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
EVENT_PREFERRED_VARAS = {
    "vehicle":       {0, 2, 3, 4},              # Mon, Wed, Thu, Fri
    "travel":        {0, 2, 3},                 # Mon, Wed, Thu
    "house_warming": {0, 2, 3, 4},
    "marriage":      {0, 2, 3, 4},
    "business":      {2, 3, 4},                 # Wed/Thu (Merc/Jup), Fri
    "education":     {2},                        # Wed (Mercury)
    "medical":       {1},                        # Tue (Mars) — surgery
    "investment":    {2, 3},                     # Wed/Thu
    "legal":         {1, 5},                     # Tue (Mars), Sat (Saturn)
    "general":       {0, 2, 3, 4},
}

# Weekdays to AVOID per event (direct opposition)
EVENT_AVOID_VARAS = {
    "vehicle":       {1, 5},                    # Tue (Mars=accident), Sat
    "travel":        {1, 5},
    "house_warming": {1, 5, 6},                 # Sun too (arguments)
    "marriage":      {1, 5, 6},                 # Sat, Sun, Tue
    "business":      {1, 5},
    "education":     {5},
    "medical":       {2},                        # Wed bad for surgery
    "investment":    {5},
    "legal":         {2},                        # Wed slippery for legal
    "general":       {1, 5},
}

# Lagna type preferences by event (KB §5.1)
#   Movable (Chara)  = Aries, Cancer, Libra, Capricorn
#   Fixed (Sthira)   = Taurus, Leo, Scorpio, Aquarius
#   Dual (Dwisvabh)  = Gemini, Virgo, Sagittarius, Pisces
EVENT_PREFERRED_LAGNA_TYPE = {
    "vehicle":       ["Movable"],                # movable = good for purchases/starts
    "travel":        ["Movable"],
    "house_warming": ["Fixed"],                  # permanence
    "marriage":      ["Fixed", "Dual"],
    "business":      ["Fixed", "Dual"],
    "education":     ["Dual"],                   # communications
    "medical":       ["Movable"],                # quick recovery
    "investment":    ["Fixed"],
    "legal":         ["Movable"],
    "general":       ["Fixed", "Dual"],
}

# Tithi groups (KB §3.1)
AUSPICIOUS_TITHIS = {2, 3, 5, 7, 10, 11, 13}
RIKTA_NANDA_AVOID_TITHIS = {4, 9, 14}            # Rikta classical avoid
INAUSPICIOUS_TITHIS = {6, 8, 12, 15, 30}

# Yoga groups (KB §3.3) — indices 0-26
MALEFIC_YOGAS = {0, 5, 8, 9, 12, 14, 16, 18, 26}  # Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti
BENEFIC_YOGAS_ESPECIALLY_GOOD = {15, 17, 19, 20, 21, 22, 23, 24, 25}  # Siddhi, Variyan, Shiva, Siddha, Sadhya, Shubha, Shukla, Brahma, Indra

# Per-event practical-hours (local time, 24h). A window whose
# start_time falls outside these is operationally impractical
# (e.g., vehicle showroom closed at 1 AM).
EVENT_PRACTICAL_HOURS = {
    "vehicle":       (9, 19),   # dealer/showroom hours
    "business":      (6, 22),   # shop opening range
    "house_warming": (6, 20),
    "travel":        (0, 24),   # anytime
    "education":     (6, 20),
    "medical":       (6, 22),   # scheduled hours
    "marriage":      (0, 24),   # Indian evening muhurthas normal
    "investment":    (9, 18),   # market/bank hours
    "legal":         (9, 18),   # court hours
    "general":       (6, 22),
}


# ────────────────────────────────────────────────────────────────────
# HOUSE-SIGNIFICATION HELPERS
# ────────────────────────────────────────────────────────────────────

def _houses_intersect(planet_houses: list, target: list) -> list:
    """Return the intersection of planet-signified houses and the target list."""
    if not planet_houses or not target:
        return []
    return sorted(set(int(h) for h in planet_houses) & set(target))


def _signification_summary(
    planet_houses: list,
    primary: int,
    supporting: list,
    denial: list,
) -> Dict[str, Any]:
    """Break a planet's house significations into primary/supporting/denial buckets."""
    if not planet_houses:
        return {
            "has_primary": False,
            "supporting_hit": [],
            "denial_hit": [],
            "houses_summary": [],
        }
    signified = sorted(set(int(h) for h in planet_houses))
    return {
        "has_primary": primary in signified,
        "supporting_hit": _houses_intersect(signified, supporting),
        "denial_hit": _houses_intersect(signified, denial),
        "houses_summary": signified,
    }


# ────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ────────────────────────────────────────────────────────────────────

def compute_findings(window: Dict[str, Any], event_type: str) -> Dict[str, Any]:
    """Derive structured findings from a muhurtha window + event type.

    Returns a dict of DESCRIPTIVE facts with KB §citations. The LLM
    uses these to shortcut rule-lookups and spend its tokens on
    judgment instead. Never returns a verdict or quality classification
    — only facts the LLM then weighs.

    Structure (all keys always present, null when not computable):

        {
          "event": {"type": str, "primary": int, "supporting": [int], "denial": [int]},
          "lagna_csl": {...signification summary + §cite},
          "event_csl": {...signification summary + §cite},
          "h11_csl":   {...signification summary + §cite},
          "h11_same_as_lagna_csl": bool,
          "panchang": {
            "tithi": {"name": str, "num": int, "class": str, "§": str},
            "nakshatra": {"name": str, "idx": int, "class": str, "§": str,
                          "event_class_match": bool, "event_class_avoid": bool},
            "yoga": {"name": str, "idx": int, "class": str, "§": str},
            "vara": {"weekday": int, "approved_for_event": bool,
                     "avoided_for_event": bool, "§": str},
            "shuddhi_score": int,  # 0-5, count of clean layers
          },
          "lagna_type": {"name": str, "event_preferred": bool, "§": str},
          "moon_sl_favorable": bool,
          "badhaka_pass": bool,
          "maraka_hit": bool,
          "time_of_day": {"hh": int, "practical_for_event": bool, "§": str},
          "warnings": [str],
        }
    """
    from .muhurtha_engine import EVENT_HOUSE_GROUPS  # avoid circular import at module load

    # --- Event house group lookup ---
    group = EVENT_HOUSE_GROUPS.get(event_type, EVENT_HOUSE_GROUPS.get("general", {}))
    primary_h = int(group.get("primary", 1))
    supporting_h = [int(h) for h in group.get("supporting", [])]
    denial_h = [int(h) for h in group.get("denial", [])]

    findings: Dict[str, Any] = {
        "event": {
            "type": event_type,
            "primary": primary_h,
            "supporting": supporting_h,
            "denial": denial_h,
            "§": "§2",
        }
    }

    # --- Lagna CSL signification ---
    lagna_houses = window.get("signified_houses") or []
    findings["lagna_csl"] = {
        "planet": window.get("lagna_sublord"),
        "star_lord": window.get("lagna_star_lord"),
        **_signification_summary(lagna_houses, primary_h, supporting_h, denial_h),
        "§": "§1, §2",
    }

    # --- Event cusp CSL signification ---
    event_csl_houses = window.get("event_cusp_houses") or []
    findings["event_csl"] = {
        "planet": window.get("event_cusp_csl"),
        **_signification_summary(event_csl_houses, primary_h, supporting_h, denial_h),
        "confirms_per_engine": bool(window.get("event_cusp_confirms", False)),
        "§": "§1 Analysis Rule 3",
    }

    # --- H11 CSL signification ---
    h11_houses = window.get("h11_houses") or []
    findings["h11_csl"] = {
        "planet": window.get("h11_csl"),
        **_signification_summary(h11_houses, primary_h, supporting_h, denial_h),
        "confirms_per_engine": bool(window.get("h11_confirms", False)),
        "§": "§1 Analysis Rule 4",
    }

    # --- Same-planet double-confirmation check ---
    findings["h11_same_as_lagna_csl"] = (
        findings["lagna_csl"]["planet"] is not None
        and findings["lagna_csl"]["planet"] == findings["h11_csl"]["planet"]
    )

    # --- Panchang ---
    p = window.get("panchang", {}) or {}
    tithi_num = None
    try:
        tithi_num = int(p.get("tithi_num") or p.get("tithi_number") or 0)
    except (TypeError, ValueError):
        tithi_num = 0
    tithi_name = p.get("tithi") or ""
    # Fallback: derive tithi number from name if engine didn't send it
    if not tithi_num and tithi_name:
        try:
            from .muhurtha_engine import TITHI_NAMES
            stripped_name = tithi_name.split("/")[0].strip()
            for idx, tn in enumerate(TITHI_NAMES):
                if tn == stripped_name or tn.startswith(stripped_name):
                    # idx is 0-based (0..14); map to 1..15 (paksha-agnostic)
                    tithi_num = idx + 1
                    break
        except Exception:
            tithi_num = 0
    # PR A2.2c.1 — same paksha-agnostic fix as muhurtha_engine.py.
    # AUSPICIOUS_TITHIS / INAUSPICIOUS_TITHIS / RIKTA_NANDA_AVOID_TITHIS
    # are 1-15 cycle positions; raw tithi_num 1-30 never matched for
    # Krishna paksha without the modulo.
    tithi_cycle_pos = ((tithi_num - 1) % 15) + 1 if tithi_num else 0
    if tithi_cycle_pos in AUSPICIOUS_TITHIS:
        tithi_class = "good"
    elif tithi_cycle_pos in RIKTA_NANDA_AVOID_TITHIS:
        tithi_class = "rikta_nanda_avoid"
    elif tithi_cycle_pos in INAUSPICIOUS_TITHIS or tithi_num in {15, 30}:
        tithi_class = "inauspicious"
    else:
        tithi_class = "neutral"

    # Nakshatra class + event fit
    moon_nak_idx = window.get("moon_nakshatra_idx")
    if moon_nak_idx is None:
        # fallback: try to resolve by name
        try:
            moon_nak_idx = NAKSHATRA_NAMES_26.index(window.get("moon_nakshatra", "").split()[0])
        except (ValueError, AttributeError):
            moon_nak_idx = None
    nak_class = NAKSHATRA_CLASS.get(moon_nak_idx) if moon_nak_idx is not None else None
    preferred_classes = EVENT_PREFERRED_NAK_CLASSES.get(event_type, [])
    avoided_classes = EVENT_AVOID_NAK_CLASSES.get(event_type, [])

    # Yoga class
    yoga_idx = window.get("yoga_idx")
    yoga_name = p.get("yoga") or ""
    if yoga_idx is None:
        try:
            from .muhurtha_engine import YOGA_NAMES
            yoga_idx = YOGA_NAMES.index(yoga_name) if yoga_name in YOGA_NAMES else None
        except Exception:
            yoga_idx = None
    if yoga_idx is None:
        yoga_class = "unknown"
    elif yoga_idx in MALEFIC_YOGAS:
        yoga_class = "malefic"
    elif yoga_idx in BENEFIC_YOGAS_ESPECIALLY_GOOD:
        yoga_class = "benefic_strong"
    else:
        yoga_class = "benefic_normal"

    # Vara (weekday)
    weekday = window.get("weekday_idx")
    if weekday is None:
        vara_name = (p.get("vara") or "").lower()
        weekday_map = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6,
        }
        weekday = weekday_map.get(vara_name)
    preferred_varas = EVENT_PREFERRED_VARAS.get(event_type, set())
    avoided_varas = EVENT_AVOID_VARAS.get(event_type, set())
    vara_approved = weekday in preferred_varas if weekday is not None else False
    vara_avoided = weekday in avoided_varas if weekday is not None else False

    # Panchanga Shuddhi score — count clean layers (0-5)
    shuddhi_score = 0
    if tithi_class == "good":
        shuddhi_score += 1
    if nak_class in preferred_classes:
        shuddhi_score += 1
    if yoga_class in ("benefic_strong", "benefic_normal"):
        shuddhi_score += 1
    if vara_approved:
        shuddhi_score += 1
    # karana clean (no Vishti/Bhadra, no fixed malefic karana)
    if not window.get("is_vishti", False):
        shuddhi_score += 1

    findings["panchang"] = {
        "tithi": {
            "name": tithi_name,
            "num": tithi_num or None,
            "paksha": p.get("paksha"),
            "class": tithi_class,
            "§": "§3.1",
        },
        "nakshatra": {
            "name": window.get("moon_nakshatra") or NAKSHATRA_NAMES_26[moon_nak_idx] if moon_nak_idx is not None else None,
            "idx": moon_nak_idx,
            "class": nak_class,
            "event_class_match": nak_class in preferred_classes if nak_class else False,
            "event_class_avoid": nak_class in avoided_classes if nak_class else False,
            "§": "§3.2",
        },
        "yoga": {
            "name": yoga_name,
            "idx": yoga_idx,
            "class": yoga_class,
            "§": "§3.3",
        },
        "vara": {
            "weekday": weekday,
            "name": p.get("vara"),
            "approved_for_event": vara_approved,
            "avoided_for_event": vara_avoided,
            "§": "§3.4",
        },
        "shuddhi_score": shuddhi_score,
    }

    # --- Lagna type ---
    lagna_name = (window.get("lagna") or "").strip()
    # Try to extract the sign from "Gemini" or "Gemini (Dual)" style strings
    movable_signs = {"Aries", "Cancer", "Libra", "Capricorn"}
    fixed_signs = {"Taurus", "Leo", "Scorpio", "Aquarius"}
    dual_signs = {"Gemini", "Virgo", "Sagittarius", "Pisces"}
    lagna_sign = lagna_name.split()[0] if lagna_name else ""
    if lagna_sign in movable_signs:
        lagna_type = "Movable"
    elif lagna_sign in fixed_signs:
        lagna_type = "Fixed"
    elif lagna_sign in dual_signs:
        lagna_type = "Dual"
    else:
        lagna_type = None
    preferred_lagna = EVENT_PREFERRED_LAGNA_TYPE.get(event_type, [])
    findings["lagna_type"] = {
        "name": lagna_type,
        "event_preferred": lagna_type in preferred_lagna if lagna_type else False,
        "event_preferred_list": preferred_lagna,
        "§": "§5.1",
    }

    # --- Day-level filters ---
    findings["moon_sl_favorable"] = bool(window.get("moon_sl_favorable", False))
    bc = window.get("badhaka_check", {}) or {}
    findings["badhaka_pass"] = bool(bc.get("passed", True))
    findings["maraka_hit"] = bool(bc.get("maraka_hit", False))
    findings["badhaka_hit"] = bool(bc.get("badhaka_hit", False))

    # --- Time of day practicality ---
    start_time = window.get("start_time") or ""
    try:
        hh = int(start_time.split(":")[0])
    except (ValueError, IndexError):
        hh = -1
    prac_start, prac_end = EVENT_PRACTICAL_HOURS.get(event_type, (0, 24))
    findings["time_of_day"] = {
        "start_hh": hh if hh >= 0 else None,
        "practical_window": [prac_start, prac_end],
        "within_practical_hours": (prac_start <= hh < prac_end) if hh >= 0 else None,
        "§": "§9.x practical-hours",
    }

    # --- Engine warnings (already computed) ---
    warnings = []
    if window.get("in_rahu_kalam"):
        warnings.append("Rahu Kalam")
    if window.get("is_vishti"):
        warnings.append("Vishti Karana")
    if window.get("in_yamagandam"):
        warnings.append("Yamagandam")
    if window.get("in_gulika"):
        warnings.append("Gulika Kalam")
    if window.get("in_durmuhurtha"):
        warnings.append("Durmuhurtha")
    findings["warnings"] = warnings

    return findings


# ────────────────────────────────────────────────────────────────────
# LLM INPUT FORMATTER
# ────────────────────────────────────────────────────────────────────

def format_findings_for_llm(findings: Dict[str, Any]) -> str:
    """Render the findings dict into a compact text block the LLM reads.

    Kept deliberately terse — the LLM doesn't need prose here, just
    facts with §cites it can reference in its output.
    """
    lines = []
    ev = findings["event"]
    lines.append(f"  EVENT {ev['type']}: primary=H{ev['primary']}, supporting={ev['supporting']}, denial={ev['denial']} ({ev['§']})")

    # Lagna CSL
    lcsl = findings["lagna_csl"]
    lines.append(
        f"  LAGNA CSL: {lcsl['planet']} → {lcsl.get('houses_summary', [])} | "
        f"primary_H{ev['primary']}_hit={lcsl['has_primary']} | "
        f"supporting_hit={lcsl['supporting_hit']} | "
        f"denial_hit={lcsl['denial_hit']} ({lcsl['§']})"
    )

    # Event CSL
    ecsl = findings["event_csl"]
    lines.append(
        f"  EVENT CSL: {ecsl['planet']} → {ecsl.get('houses_summary', [])} | "
        f"primary_hit={ecsl['has_primary']} | "
        f"denial_hit={ecsl['denial_hit']} | "
        f"confirms={ecsl['confirms_per_engine']} ({ecsl['§']})"
    )

    # H11 CSL
    hcsl = findings["h11_csl"]
    lines.append(
        f"  H11 CSL: {hcsl['planet']} → {hcsl.get('houses_summary', [])} | "
        f"denial_hit={hcsl['denial_hit']} | "
        f"confirms={hcsl['confirms_per_engine']} ({hcsl['§']})"
    )

    if findings["h11_same_as_lagna_csl"]:
        lines.append("  DOUBLE CONFIRM: Lagna CSL == H11 CSL (same planet)")

    # Panchang
    p = findings["panchang"]
    t, n, y, v = p["tithi"], p["nakshatra"], p["yoga"], p["vara"]
    lines.append(
        f"  PANCHANG: Tithi={t['name']} ({t['class']}, {t['§']}) | "
        f"Nakshatra={n['name']} class={n['class']} event_match={n['event_class_match']} event_avoid={n['event_class_avoid']} ({n['§']}) | "
        f"Yoga={y['name']} ({y['class']}, {y['§']}) | "
        f"Vara approved={v['approved_for_event']} avoided={v['avoided_for_event']} ({v['§']}) | "
        f"Shuddhi {p['shuddhi_score']}/5"
    )

    # Lagna type
    lt = findings["lagna_type"]
    lines.append(
        f"  LAGNA TYPE: {lt['name']} | event_preferred={lt['event_preferred']} "
        f"(preferred={lt['event_preferred_list']}, {lt['§']})"
    )

    # Day-level
    lines.append(
        f"  DAY-LEVEL: moon_sl_favorable={findings['moon_sl_favorable']} | "
        f"badhaka_pass={findings['badhaka_pass']} | "
        f"maraka_hit={findings['maraka_hit']}"
    )

    # Time of day
    tod = findings["time_of_day"]
    lines.append(
        f"  TIME OF DAY: start_hh={tod['start_hh']} | "
        f"practical_window={tod['practical_window']} | "
        f"within_practical={tod['within_practical_hours']} ({tod['§']})"
    )

    # Warnings
    if findings["warnings"]:
        lines.append(f"  WARNINGS: {', '.join(findings['warnings'])}")

    return "\n".join(lines)
