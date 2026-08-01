"""
match_individual_screen.py — per-chart screens for Stage 1 of the Match tab.

WHY (2026-08-01)
----------------
An experienced astrologer reads each chart ALONE before touching a
compatibility score. Papa Samyam (south_indian_matching.py) covers the
affliction load. This module adds the remaining individual dimensions the
classical literature says to check before recommending a marriage:

    1. Overall chart strength   — lagna & lagna lord, Venus condition
    2. Mental / emotional stability — Moon, Mercury, Jupiter
    3. Progeny capacity         — 5th house & lord, Jupiter (putra dosha)
    4. Longevity indicators     — for the cross-chart balance question

METHODOLOGY NOTE (important, and deliberate)
--------------------------------------------
These are *Parashari* (traditional) techniques, not KP. They use whole-sign
(rasi) house counting, NOT the Placidus cusps the KP engine uses. That is
correct for the technique — but it means results here must be presented to
the user as a clearly-labelled "traditional layer" beside the KP verdict,
never blended into it. The app's KP verdict remains the primary reading.

HONESTY BOUNDARY
----------------
`assess_longevity_indicators` does NOT compute classical Ayurdaya
(Pindayu / Amsayu / Nisargayu). Those are intricate, disputed between
authorities, and easy to get wrong; a wrong longevity number in a marriage
consultation is genuinely harmful. What we return is a transparent set of
longevity-relevant INDICATORS for the astrologer to weigh. It is labelled
as such everywhere it surfaces.

Self-contained apart from one import of the existing combustion helper.
Imports nothing from compatibility_engine → no circular import.
"""

from __future__ import annotations

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

OWN_SIGNS = {
    "Sun": {"Leo"}, "Moon": {"Cancer"}, "Mars": {"Aries", "Scorpio"},
    "Mercury": {"Gemini", "Virgo"}, "Jupiter": {"Sagittarius", "Pisces"},
    "Venus": {"Taurus", "Libra"}, "Saturn": {"Capricorn", "Aquarius"},
}

# Exaltation sign per planet; debilitation is the opposite sign.
EXALTATION = {
    "Sun": "Aries", "Moon": "Taurus", "Mars": "Capricorn",
    "Mercury": "Virgo", "Jupiter": "Cancer", "Venus": "Pisces",
    "Saturn": "Libra",
}
DEBILITATION = {
    p: SIGNS[(SIGNS.index(s) + 6) % 12] for p, s in EXALTATION.items()
}

NATURAL_MALEFICS = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}
NATURAL_BENEFICS = {"Jupiter", "Venus", "Moon", "Mercury"}


def _sign_index(lon: float) -> int:
    return int((lon % 360) // 30)


def _sign_of(lon: float) -> str:
    return SIGNS[_sign_index(lon)]


def _house_from(planet_lon: float, reference_lon: float) -> int:
    """Whole-sign house of a planet counted from a reference (1..12)."""
    return ((_sign_index(planet_lon) - _sign_index(reference_lon)) % 12) + 1


def _lon(planets: dict, name: str):
    p = planets.get(name)
    if not p:
        return None
    return p.get("longitude")


def _dignity(planet: str, lon: float) -> str:
    """own / exalted / debilitated / neutral."""
    sign = _sign_of(lon)
    if sign in OWN_SIGNS.get(planet, set()):
        return "own"
    if EXALTATION.get(planet) == sign:
        return "exalted"
    if DEBILITATION.get(planet) == sign:
        return "debilitated"
    return "neutral"


def _sep(a: float, b: float) -> float:
    """Smallest angular separation in degrees."""
    d = abs((a - b) % 360)
    return min(d, 360 - d)


def _is_conjunct(planets: dict, p1: str, p2: str, orb: float = 10.0) -> bool:
    a, b = _lon(planets, p1), _lon(planets, p2)
    if a is None or b is None:
        return False
    return _sep(a, b) <= orb


def _afflictors_of(planets: dict, target: str, orb: float = 10.0) -> list[str]:
    """Malefics conjunct the target within orb."""
    out = []
    for m in ("Saturn", "Mars", "Rahu", "Ketu", "Sun"):
        if m == target:
            continue
        if _is_conjunct(planets, target, m, orb):
            out.append(m)
    return out


# ── 1. Overall chart strength ─────────────────────────────────────────

def assess_chart_strength(planets: dict, lagna_lon: float) -> dict:
    """
    Is the chart itself structurally sound enough to carry a marriage?

    Classical concerns: a debilitated/afflicted lagna lord weakens the
    native's overall capacity to sustain relationships; a combust or
    debilitated Venus weakens the capacity to relate at all.
    """
    lagna_sign = _sign_of(lagna_lon)
    lagna_lord = SIGN_LORDS.get(lagna_sign, "")
    factors: list[str] = []
    supports: list[str] = []

    ll_lon = _lon(planets, lagna_lord)
    lagna_lord_dignity = None
    lagna_lord_house = None
    if ll_lon is not None:
        lagna_lord_dignity = _dignity(lagna_lord, ll_lon)
        lagna_lord_house = _house_from(ll_lon, lagna_lon)
        if lagna_lord_dignity == "debilitated":
            factors.append(f"Lagna lord {lagna_lord} debilitated in {_sign_of(ll_lon)}")
        elif lagna_lord_dignity in ("own", "exalted"):
            supports.append(f"Lagna lord {lagna_lord} {lagna_lord_dignity} — strong")
        if lagna_lord_house in (6, 8, 12):
            factors.append(f"Lagna lord {lagna_lord} in H{lagna_lord_house} (dusthana)")
        ll_afflict = _afflictors_of(planets, lagna_lord)
        if ll_afflict:
            factors.append(f"Lagna lord {lagna_lord} conjunct {', '.join(ll_afflict)}")

    # Venus — capacity to relate
    v_lon = _lon(planets, "Venus")
    venus_dignity = None
    venus_combust = False
    if v_lon is not None:
        venus_dignity = _dignity("Venus", v_lon)
        s_lon = _lon(planets, "Sun")
        if s_lon is not None and _sep(v_lon, s_lon) <= 10.0:
            venus_combust = True
            factors.append("Venus combust (within 10° of the Sun)")
        if venus_dignity == "debilitated":
            factors.append(f"Venus debilitated in {_sign_of(v_lon)}")
        elif venus_dignity in ("own", "exalted"):
            supports.append(f"Venus {venus_dignity} — relating capacity supported")

    # Malefics sitting on the lagna itself
    lagna_malefics = [
        m for m in NATURAL_MALEFICS
        if _lon(planets, m) is not None and _house_from(_lon(planets, m), lagna_lon) == 1
    ]
    if lagna_malefics:
        factors.append(f"Malefic(s) on the lagna: {', '.join(sorted(lagna_malefics))}")

    if len(factors) >= 3:
        level = "Weak"
    elif len(factors) == 2:
        level = "Mixed"
    elif len(factors) == 1:
        level = "Mostly sound"
    else:
        level = "Sound"

    return {
        "level": level,
        "lagna_sign": lagna_sign,
        "lagna_lord": lagna_lord,
        "lagna_lord_dignity": lagna_lord_dignity,
        "lagna_lord_house": lagna_lord_house,
        "venus_dignity": venus_dignity,
        "venus_combust": venus_combust,
        "concerns": factors,
        "supports": supports,
        "note": (f"{level} — " + ("; ".join(factors) if factors
                                  else "no structural weakness flagged")),
    }


# ── 2. Mental / emotional stability ───────────────────────────────────

def assess_mental_stability(planets: dict, lagna_lon: float) -> dict:
    """
    Moon (mind/emotion), Mercury (nervous system) and Jupiter (wisdom /
    steadying influence) are the classical trio for mental wellbeing.

    NOT a clinical statement. This flags classical affliction patterns for
    the astrologer to weigh, and must never be surfaced as a diagnosis.
    """
    concerns: list[str] = []
    supports: list[str] = []

    m_lon = _lon(planets, "Moon")
    moon_afflictors: list[str] = []
    moon_dignity = None
    if m_lon is not None:
        moon_dignity = _dignity("Moon", m_lon)
        moon_afflictors = [a for a in _afflictors_of(planets, "Moon")
                           if a in ("Saturn", "Rahu", "Ketu", "Mars")]
        for a in moon_afflictors:
            concerns.append(f"Moon conjunct {a}")
        if moon_dignity == "debilitated":
            concerns.append("Moon debilitated in Scorpio")
        if _is_conjunct(planets, "Moon", "Jupiter", 12.0):
            supports.append("Jupiter with the Moon — steadying (Gaja-Kesari-like)")

    me_lon = _lon(planets, "Mercury")
    mercury_afflictors: list[str] = []
    if me_lon is not None:
        mercury_afflictors = [a for a in _afflictors_of(planets, "Mercury")
                              if a in ("Rahu", "Ketu", "Saturn", "Mars")]
        for a in mercury_afflictors:
            concerns.append(f"Mercury conjunct {a}")
        if _dignity("Mercury", me_lon) == "debilitated":
            concerns.append("Mercury debilitated in Pisces")

    # Jupiter's own condition — the steadying significator
    j_lon = _lon(planets, "Jupiter")
    if j_lon is not None:
        if _dignity("Jupiter", j_lon) in ("own", "exalted"):
            supports.append(f"Jupiter {_dignity('Jupiter', j_lon)} — good counsel/steadiness")
        elif _dignity("Jupiter", j_lon) == "debilitated":
            concerns.append("Jupiter debilitated in Capricorn")

    if len(concerns) >= 3:
        level = "Multiple classical afflictions"
    elif len(concerns) == 2:
        level = "Some affliction"
    elif len(concerns) == 1:
        level = "Mild affliction"
    else:
        level = "No classical affliction flagged"

    return {
        "level": level,
        "moon_dignity": moon_dignity,
        "moon_afflictors": moon_afflictors,
        "mercury_afflictors": mercury_afflictors,
        "concerns": concerns,
        "supports": supports,
        "disclaimer": (
            "Classical affliction patterns only. This is NOT a clinical or "
            "psychological assessment and must never be presented as one."
        ),
        "note": f"{level}" + (f" — {'; '.join(concerns)}" if concerns else ""),
    }


# ── 3. Progeny capacity ───────────────────────────────────────────────

def assess_progeny(planets: dict, lagna_lon: float) -> dict:
    """
    5th house / 5th lord / Jupiter — the classical progeny trio.

    Putra dosha is classically flagged when the 5th lord falls in 6, 8 or
    12. Malefics tenanting the 5th and an afflicted Jupiter compound it.

    Families ask about children constantly in matchmaking, so this belongs
    in the individual screen — but it is a TENDENCY, never a statement
    that someone cannot have children.
    """
    fifth_sign = SIGNS[(_sign_index(lagna_lon) + 4) % 12]
    fifth_lord = SIGN_LORDS.get(fifth_sign, "")
    concerns: list[str] = []
    supports: list[str] = []

    fl_lon = _lon(planets, fifth_lord)
    fifth_lord_house = None
    putra_dosha = False
    if fl_lon is not None:
        fifth_lord_house = _house_from(fl_lon, lagna_lon)
        if fifth_lord_house in (6, 8, 12):
            putra_dosha = True
            concerns.append(f"5th lord {fifth_lord} in H{fifth_lord_house} — classical putra dosha")
        if _dignity(fifth_lord, fl_lon) == "debilitated":
            concerns.append(f"5th lord {fifth_lord} debilitated")
        elif _dignity(fifth_lord, fl_lon) in ("own", "exalted"):
            supports.append(f"5th lord {fifth_lord} {_dignity(fifth_lord, fl_lon)}")

    malefics_in_5 = [
        m for m in NATURAL_MALEFICS
        if _lon(planets, m) is not None and _house_from(_lon(planets, m), lagna_lon) == 5
    ]
    if malefics_in_5:
        concerns.append(f"Malefic(s) in the 5th: {', '.join(sorted(malefics_in_5))}")

    j_lon = _lon(planets, "Jupiter")
    jupiter_house = None
    if j_lon is not None:
        jupiter_house = _house_from(j_lon, lagna_lon)
        j_dig = _dignity("Jupiter", j_lon)
        if j_dig == "debilitated":
            concerns.append("Jupiter (progeny karaka) debilitated")
        elif j_dig in ("own", "exalted"):
            supports.append(f"Jupiter {j_dig} — progeny karaka strong")
        if jupiter_house == 5:
            supports.append("Jupiter in the 5th — classical blessing for progeny")
        j_afflict = _afflictors_of(planets, "Jupiter")
        if j_afflict:
            concerns.append(f"Jupiter conjunct {', '.join(j_afflict)}")

    if len(concerns) >= 3:
        level = "Multiple concerns"
    elif len(concerns) == 2:
        level = "Some concern"
    elif len(concerns) == 1:
        level = "Mild concern"
    else:
        level = "No classical concern flagged"

    return {
        "level": level,
        "fifth_sign": fifth_sign,
        "fifth_lord": fifth_lord,
        "fifth_lord_house": fifth_lord_house,
        "putra_dosha": putra_dosha,
        "malefics_in_fifth": sorted(malefics_in_5),
        "jupiter_house": jupiter_house,
        "concerns": concerns,
        "supports": supports,
        "disclaimer": (
            "Structural tendency only — never a statement that a person "
            "cannot have children. Medical questions belong with doctors."
        ),
        "note": f"{level}" + (f" — {'; '.join(concerns)}" if concerns else ""),
    }


# ── 4. Longevity indicators (NOT a full Ayurdaya) ─────────────────────

def assess_longevity_indicators(planets: dict, lagna_lon: float) -> dict:
    """
    Longevity-relevant indicators for the cross-chart balance question
    ("is there a premature-widowhood imbalance between these charts?").

    DELIBERATELY NOT AYURDAYA. Classical Pindayu/Amsayu/Nisargayu are
    intricate and disputed between authorities; publishing a wrong lifespan
    number inside a marriage consultation would be actively harmful. We
    surface the indicators the tradition weighs and leave the judgement
    with the astrologer.
    """
    factors: list[str] = []
    supports: list[str] = []

    lagna_sign = _sign_of(lagna_lon)
    lagna_lord = SIGN_LORDS.get(lagna_sign, "")

    ll_lon = _lon(planets, lagna_lord)
    if ll_lon is not None:
        h = _house_from(ll_lon, lagna_lon)
        if h in (6, 8, 12):
            factors.append(f"Lagna lord {lagna_lord} in H{h} (dusthana)")
        if _dignity(lagna_lord, ll_lon) in ("own", "exalted"):
            supports.append(f"Lagna lord {lagna_lord} strong ({_dignity(lagna_lord, ll_lon)})")

    # 8th house — the ayush bhava
    eighth_sign = SIGNS[(_sign_index(lagna_lon) + 7) % 12]
    eighth_lord = SIGN_LORDS.get(eighth_sign, "")
    malefics_in_8 = [
        m for m in NATURAL_MALEFICS
        if _lon(planets, m) is not None and _house_from(_lon(planets, m), lagna_lon) == 8
    ]
    if malefics_in_8:
        factors.append(f"Malefic(s) in the 8th: {', '.join(sorted(malefics_in_8))}")

    # Saturn — the ayus karaka
    sat_lon = _lon(planets, "Saturn")
    saturn_house = None
    if sat_lon is not None:
        saturn_house = _house_from(sat_lon, lagna_lon)
        if _dignity("Saturn", sat_lon) in ("own", "exalted"):
            supports.append("Saturn (ayus karaka) strong")
        elif _dignity("Saturn", sat_lon) == "debilitated":
            factors.append("Saturn (ayus karaka) debilitated")

    # Malefics on the lagna
    malefics_in_1 = [
        m for m in NATURAL_MALEFICS
        if _lon(planets, m) is not None and _house_from(_lon(planets, m), lagna_lon) == 1
    ]
    if malefics_in_1:
        factors.append(f"Malefic(s) on the lagna: {', '.join(sorted(malefics_in_1))}")

    score = len(factors)
    band = "Few indicators" if score <= 1 else "Some indicators" if score == 2 else "Several indicators"

    return {
        "band": band,
        "indicator_count": score,
        "lagna_lord": lagna_lord,
        "eighth_lord": eighth_lord,
        "malefics_in_eighth": sorted(malefics_in_8),
        "saturn_house": saturn_house,
        "concerns": factors,
        "supports": supports,
        "is_full_ayurdaya": False,
        "disclaimer": (
            "Indicators only — this is NOT a classical Ayurdaya (Pindayu / "
            "Amsayu / Nisargayu) computation and yields no lifespan figure."
        ),
        "note": f"{band} ({score})",
    }


def compare_longevity_indicators(a: dict, b: dict) -> dict:
    """Cross-chart balance — the 'no premature widowhood' classical check."""
    ca = a.get("indicator_count", 0)
    cb = b.get("indicator_count", 0)
    diff = abs(ca - cb)
    balanced = diff <= 1
    return {
        "chart1_count": ca, "chart2_count": cb, "difference": diff,
        "balanced": balanced,
        "note": (
            f"Longevity indicators are broadly balanced ({ca} vs {cb})."
            if balanced else
            f"Longevity indicators are uneven ({ca} vs {cb}) — the classical "
            "concern is a marked imbalance between the two charts."
        ),
        "disclaimer": "Indicator balance only; not an Ayurdaya comparison.",
    }


def build_individual_screen(planets: dict, lagna_lon: float) -> dict:
    """Run all four per-chart screens and return them together."""
    return {
        "chart_strength": assess_chart_strength(planets, lagna_lon),
        "mental_stability": assess_mental_stability(planets, lagna_lon),
        "progeny": assess_progeny(planets, lagna_lon),
        "longevity_indicators": assess_longevity_indicators(planets, lagna_lon),
        "methodology_note": (
            "Traditional (Parashari) layer using whole-sign houses — shown "
            "beside, never blended into, the KP verdict."
        ),
    }
