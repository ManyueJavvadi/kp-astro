"""
KP Marriage Compatibility Engine.

PR A1.4 (Phase 19 — 2026-05-15) — Track A.1 deep accuracy rebuild.
Audit doc: .claude/research/match-audit.md
Goal: bring this engine to "20-year KP astrologer second-opinion" depth.

Material changes vs the pre-A1.4 version:

  1. Tara kuta inversion fixed   (was {1,3,5,7} auspicious; now {2,4,6,8,0})
  2. MARRIAGE_DENIAL_HOUSES adds 12 (separation/loss)
  3. H7 CSL promise is now TIERED (full / partial / weak / none)
     via the KSK strict-AND rule on {2,7,11}
  4. KP UNION method (step 4) — _planet_significations now also gathers
     the sub-lord's house occupation, not just the star lord's
  5. 7-slot Ruling Planets at NATAL time (Day Lord, Asc Sub Lord, Moon
     Sub Lord added — KSK's "Moon sub lord decides yes/no" rule)
  6. Canonical cross-chart match (kpastrologylearning.com Rule 5):
     each chart's H2/H7/H11 CSL must signify {2,7,11} AND the other
     chart's 7-slot RPs must also signify {2,7,11}
  7. Venus override REMOVED (KSK strict: Venus is context, not override)
  8. 5-signal love-vs-arranged classification (marriage.txt Section 12)
  9. Saturn 3rd/7th/10th aspect to H7 — counted in separation risk
 10. Manglik mutual cancellation SOFTENED (reduces severity, not zero)
 11. _dasha_overlap_check renamed/rewritten as _marriage_window_overlap
     — actual time-window scan of next 60 months
 12. Overall verdict combiner reweighted: capped by individual promise,
     separation_risk + D9 H7 feed in
"""
import swisseph as swe
from datetime import datetime as _dt
from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign,
    get_planet_positions, date_time_to_julian,
    generate_chart,
    get_sign_lord,
    calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    calculate_pratyantardashas, get_current_pratyantardasha,
    DAY_LORDS,
)
from app.services.chart_formatter import format_chart_for_frontend

# ── Planet sign lordships ─────────────────────────────────────

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

SIGNS_ORDER = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]

NAKSHATRA_ORDER = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
    "Purva Bhadrapada","Uttara Bhadrapada","Revati",
]

# ── Ashtakoota lookup tables ──────────────────────────────────

NAKSHATRA_GANA = {
    "Ashwini": "Deva", "Mrigashira": "Deva", "Punarvasu": "Deva",
    "Pushya": "Deva", "Hasta": "Deva", "Swati": "Deva",
    "Anuradha": "Deva", "Shravana": "Deva", "Revati": "Deva",
    "Bharani": "Manushya", "Rohini": "Manushya", "Ardra": "Manushya",
    "Purva Phalguni": "Manushya", "Uttara Phalguni": "Manushya",
    "Purva Ashadha": "Manushya", "Uttara Ashadha": "Manushya",
    "Shatabhisha": "Manushya", "Purva Bhadrapada": "Manushya",
    "Krittika": "Rakshasa", "Ashlesha": "Rakshasa", "Magha": "Rakshasa",
    "Chitra": "Rakshasa", "Vishakha": "Rakshasa", "Jyeshtha": "Rakshasa",
    "Mula": "Rakshasa", "Dhanishtha": "Rakshasa", "Uttara Bhadrapada": "Rakshasa",
}

NAKSHATRA_NADI = {
    "Ashwini": "Aadi", "Ardra": "Aadi", "Punarvasu": "Aadi",
    "Uttara Phalguni": "Aadi", "Hasta": "Aadi", "Jyeshtha": "Aadi",
    "Mula": "Aadi", "Shatabhisha": "Aadi", "Purva Bhadrapada": "Aadi",
    "Bharani": "Madhya", "Mrigashira": "Madhya", "Pushya": "Madhya",
    "Purva Phalguni": "Madhya", "Chitra": "Madhya", "Anuradha": "Madhya",
    "Purva Ashadha": "Madhya", "Dhanishtha": "Madhya", "Uttara Bhadrapada": "Madhya",
    "Krittika": "Antya", "Rohini": "Antya", "Ashlesha": "Antya",
    "Magha": "Antya", "Swati": "Antya", "Vishakha": "Antya",
    "Uttara Ashadha": "Antya", "Shravana": "Antya", "Revati": "Antya",
}

# Yoni: (animal, sex)
NAKSHATRA_YONI = {
    "Ashwini": ("Horse", "M"), "Shatabhisha": ("Horse", "F"),
    "Bharani": ("Elephant", "M"), "Revati": ("Elephant", "F"),
    "Pushya": ("Goat", "M"), "Krittika": ("Goat", "F"),
    "Rohini": ("Serpent", "M"), "Mrigashira": ("Serpent", "F"),
    "Moola": ("Dog", "M"), "Ardra": ("Dog", "F"),
    "Mula": ("Dog", "M"),  # alias
    "Punarvasu": ("Cat", "M"), "Ashlesha": ("Cat", "F"),
    "Magha": ("Rat", "M"), "Purva Phalguni": ("Rat", "F"),
    "Uttara Phalguni": ("Cow", "M"), "Uttara Bhadrapada": ("Cow", "F"),
    "Hasta": ("Buffalo", "M"), "Swati": ("Buffalo", "F"),
    "Vishakha": ("Tiger", "M"), "Chitra": ("Tiger", "F"),
    "Jyeshtha": ("Deer", "M"), "Anuradha": ("Deer", "F"),
    "Purva Ashadha": ("Monkey", "M"), "Shravana": ("Monkey", "F"),
    "Uttara Ashadha": ("Mongoose", "N"), "Dhanishtha": ("Lion", "M"),
    "Purva Bhadrapada": ("Lion", "F"),
}

YONI_ENEMIES = {
    frozenset(["Horse", "Buffalo"]),
    frozenset(["Elephant", "Lion"]),
    frozenset(["Goat", "Monkey"]),
    frozenset(["Serpent", "Mongoose"]),
    frozenset(["Dog", "Deer"]),
    frozenset(["Cat", "Rat"]),
    frozenset(["Cow", "Tiger"]),
}

SIGN_VARNA = {
    "Cancer": "Brahmin", "Scorpio": "Brahmin", "Pisces": "Brahmin",
    "Aries": "Kshatriya", "Leo": "Kshatriya", "Sagittarius": "Kshatriya",
    "Taurus": "Vaishya", "Virgo": "Vaishya", "Capricorn": "Vaishya",
    "Gemini": "Shudra", "Libra": "Shudra", "Aquarius": "Shudra",
}
VARNA_RANK = {"Brahmin": 4, "Kshatriya": 3, "Vaishya": 2, "Shudra": 1}

PLANET_FRIENDS = {
    "Sun":     {"friends": {"Moon","Mars","Jupiter"}, "neutral": {"Mercury"}, "enemies": {"Venus","Saturn","Rahu","Ketu"}},
    "Moon":    {"friends": {"Sun","Mercury"}, "neutral": {"Mars","Jupiter","Venus","Saturn"}, "enemies": {"Rahu","Ketu"}},
    "Mars":    {"friends": {"Sun","Moon","Jupiter"}, "neutral": {"Venus","Saturn","Ketu"}, "enemies": {"Mercury","Rahu"}},
    "Mercury": {"friends": {"Sun","Venus"}, "neutral": {"Mars","Jupiter","Saturn","Rahu"}, "enemies": {"Moon","Ketu"}},
    "Jupiter": {"friends": {"Sun","Moon","Mars"}, "neutral": {"Saturn"}, "enemies": {"Mercury","Venus","Rahu","Ketu"}},
    "Venus":   {"friends": {"Mercury","Saturn"}, "neutral": {"Mars","Jupiter"}, "enemies": {"Sun","Moon","Rahu","Ketu"}},
    "Saturn":  {"friends": {"Mercury","Venus"}, "neutral": {"Jupiter"}, "enemies": {"Sun","Moon","Mars","Rahu","Ketu"}},
}

# PR A1.5 — completed Vasya map. Pre-A1.5 only had 7 of 12 signs which
# meant Aries/Taurus/Gemini/Libra/Sagittarius silently scored 0. Per
# classical Vasya rules (controller → controlled signs):
VASYA_MAP = {
    "Aries":       ["Leo", "Scorpio"],
    "Taurus":      ["Cancer", "Libra"],
    "Gemini":      ["Virgo"],
    "Cancer":      ["Scorpio", "Sagittarius"],
    "Leo":         ["Aries"],
    "Virgo":       ["Pisces", "Gemini"],
    "Libra":       ["Capricorn", "Virgo"],
    "Scorpio":     ["Cancer"],
    "Sagittarius": ["Pisces"],
    "Capricorn":   ["Aries"],
    "Aquarius":    ["Aries"],
    "Pisces":      ["Capricorn"],
}

# PR A1.5 — Rajju Koota body-region map (South Indian Dashakoota).
# Same region = 0 (severe longevity concern); different region = 5
# (good bond strength). Sources: astrojyoti.com, panchangbodh.com,
# salagram.net synastry — unanimous.
RAJJU_MAP = {
    # Paada (foot) — bottom region
    "Mula": "Paada", "Moola": "Paada", "Revati": "Paada",
    "Mrigashira": "Paada", "Chitra": "Paada", "Dhanishtha": "Paada",
    # Kati (waist)
    "Ashwini": "Kati", "Ashlesha": "Kati", "Magha": "Kati",
    "Jyeshtha": "Kati", "Shatabhisha": "Kati",
    # Naabhi (navel)
    "Bharani": "Naabhi", "Pushya": "Naabhi", "Purva Phalguni": "Naabhi",
    "Anuradha": "Naabhi", "Purva Ashadha": "Naabhi", "Purva Bhadrapada": "Naabhi",
    # Kantha (throat)
    "Krittika": "Kantha", "Punarvasu": "Kantha", "Uttara Phalguni": "Kantha",
    "Vishakha": "Kantha", "Uttara Ashadha": "Kantha", "Uttara Bhadrapada": "Kantha",
    # Shiro (head) — top region
    "Rohini": "Shiro", "Ardra": "Shiro", "Hasta": "Shiro",
    "Swati": "Shiro", "Shravana": "Shiro",
}

# PR A1.5 — Mahendra Koota: bride's nakshatra at one of these positions
# from groom's = auspicious (good progeny + happiness).
MAHENDRA_AUSPICIOUS_OFFSETS = {4, 7, 10, 13, 16, 19, 22, 25}

# PR A1.4 — KSK Reader IV strict reading + marriage.txt:12.
# H12 = isolation / separation / foreign separation / loss. Earlier
# constant omitted H12 which let charts with H7 CSL signifying H12
# never trigger has_denial — separation-prone charts read "Compatible".
MARRIAGE_DENIAL_HOUSES = {1, 6, 10, 12}
MARRIAGE_PROMISE_HOUSES = {2, 7, 11}
KUJA_HOUSES = {1, 2, 4, 7, 8, 12}

# PR A1.4 — Tiered promise.
# KSK strict rule (kpastrologylearning.com Rule 1 + marriage.txt:24):
# "The sub lord of the 7th cusp signifies 2 AND 7 AND 11"   → FULL promise
# Two of three                                              → PARTIAL
# One of three                                              → WEAK
# None of three (or only denial houses)                     → NONE
PROMISE_FULL    = "Full"
PROMISE_PARTIAL = "Partial"
PROMISE_WEAK    = "Weak"
PROMISE_NONE    = "None"

# H7 sub-lord interpretations for marriage type / spouse nature
H7_SUBLORD_TRAITS = {
    "Sun": {
        "marriage_type": "Formal, dignified marriage — often arranged",
        "spouse_nature": "Authoritative, proud, warm-hearted",
        "age_gap": "Small age gap, spouse may be older",
        "caution": "Ego clashes possible; spouse needs respect"
    },
    "Moon": {
        "marriage_type": "Emotionally driven marriage",
        "spouse_nature": "Emotional, caring, changeable moods",
        "age_gap": "Similar age",
        "caution": "Emotional dependency; mood swings"
    },
    "Mars": {
        "marriage_type": "Quick or impulsive marriage, sometimes love",
        "spouse_nature": "Energetic, assertive, passionate",
        "age_gap": "Spouse may be younger",
        "caution": "Quarrels, arguments — anger management needed"
    },
    "Mercury": {
        "marriage_type": "Intellectual match, may involve multiple relationships",
        "spouse_nature": "Witty, communicative, youthful",
        "age_gap": "Similar or younger spouse",
        "caution": "Commitment issues; dual-mindedness possible"
    },
    "Jupiter": {
        "marriage_type": "Traditional, auspicious marriage",
        "spouse_nature": "Wise, learned, generous, philosophical",
        "age_gap": "Spouse often older or mature",
        "caution": "Over-idealism; may be too orthodox"
    },
    "Venus": {
        "marriage_type": "Love marriage or very pleasant arranged marriage",
        "spouse_nature": "Beautiful, artistic, luxury-loving, charming",
        "age_gap": "Similar or younger spouse",
        "caution": "Indulgence; excessive pleasure-seeking"
    },
    "Saturn": {
        "marriage_type": "Delayed marriage; serious, mature relationship",
        "spouse_nature": "Serious, responsible, hardworking, reserved",
        "age_gap": "Large age gap (5+ years), spouse often significantly older",
        "caution": "Dissatisfaction, coldness, heavy responsibilities"
    },
    "Rahu": {
        "marriage_type": "Unconventional, inter-caste, inter-religion, or foreign spouse",
        "spouse_nature": "Ambitious, worldly, unconventional",
        "age_gap": "Varies widely",
        "caution": "Karmic delays, sudden circumstances, non-traditional setup"
    },
    "Ketu": {
        "marriage_type": "Karmic or spiritual marriage; may be detached",
        "spouse_nature": "Spiritual, introverted, detached from material life",
        "age_gap": "Varies",
        "caution": "Separation tendency; emotional detachment"
    },
}


# ── D9 Navamsa ───────────────────────────────────────────────

# Element-based navamsa starting signs
# Fire (Aries/Leo/Sag) → starts from Aries (0)
# Earth (Taurus/Virgo/Cap) → starts from Capricorn (9)
# Air (Gemini/Libra/Aquarius) → starts from Libra (6)
# Water (Cancer/Scorpio/Pisces) → starts from Cancer (3)
_NAVAMSA_START = {
    0: 0, 4: 0, 8: 0,    # Fire
    1: 9, 5: 9, 9: 9,    # Earth
    2: 6, 6: 6, 10: 6,   # Air
    3: 3, 7: 3, 11: 3,   # Water
}


def _d9_sign(longitude: float) -> str:
    """Compute D9 (Navamsa) sign for a given sidereal longitude."""
    sign_idx = int((longitude % 360) / 30)
    pos_in_sign = (longitude % 360) % 30
    navamsa_div = int(pos_in_sign / (30 / 9))  # 0-8 within sign
    if navamsa_div > 8:
        navamsa_div = 8
    start = _NAVAMSA_START[sign_idx]
    d9_idx = (start + navamsa_div) % 12
    return SIGNS_ORDER[d9_idx]


def _compute_d9(chart: dict) -> dict:
    """
    Compute D9 Navamsa data for key marriage planets.
    Returns D9 signs for Venus, Moon, Jupiter, Mars, 7th lord, and Lagna.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]

    # D9 lagna from ascendant
    d9_lagna = _d9_sign(chart["lagna_lon"])

    # D9 for key planets
    result = {"d9_lagna_sign": d9_lagna}

    for p_name in ("Venus", "Moon", "Jupiter", "Mars", "Sun", "Saturn", "Mercury", "Rahu", "Ketu"):
        if p_name in planets:
            result[f"{p_name.lower()}_d9_sign"] = _d9_sign(planets[p_name]["longitude"])

    # D9 7th lord: lord of the sign on 7th cusp, then compute that planet's D9
    h7_lon = cusp_lons[6] % 360
    h7_sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    result["d9_7th_lord"] = h7_sign_lord
    if h7_sign_lord in planets:
        result["d9_7th_lord_sign"] = _d9_sign(planets[h7_sign_lord]["longitude"])

    # D9 7th house sign (sign opposite D9 lagna)
    d9_lagna_idx = SIGNS_ORDER.index(d9_lagna)
    result["d9_7th_sign"] = SIGNS_ORDER[(d9_lagna_idx + 6) % 12]

    return result


# ── Chart builder ─────────────────────────────────────────────

def _build_chart(person: dict) -> dict:
    """Build full chart data for a person."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    jd = date_time_to_julian(
        person["date"], person["time"],
        person.get("timezone_offset", 5.5)
    )
    lat = person["latitude"]
    lon = person["longitude"]
    planets = get_planet_positions(jd)
    cusps, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    cusp_lons = list(cusps[:12])

    moon_lon = planets.get("Moon", {}).get("longitude", 0)
    lagna_lon = cusp_lons[0] % 360

    moon_nakshatra_info = get_nakshatra_and_starlord(moon_lon)
    lagna_nakshatra_info = get_nakshatra_and_starlord(lagna_lon)

    moon_sign = get_sign(moon_lon % 360)
    lagna_sign = get_sign(lagna_lon)

    h7_sl = get_sub_lord(cusp_lons[6] % 360)

    # PR A1.4 — Day Lord of birth (for 7-slot natal RP).
    # Parse the input date "YYYY-MM-DD" and compute its weekday in LOCAL
    # time. The DAY_LORDS dict in chart_engine maps Python weekday()
    # (0=Mon..6=Sun) → planet.
    try:
        from app.services.chart_engine import get_vedic_day_lord
        day_lord = get_vedic_day_lord(
            jd,
            person["latitude"],
            person["longitude"],
            person.get("timezone_offset", 5.5),
        )
    except Exception:
        day_lord = ""

    return {
        "jd": jd,
        "planets": planets,
        "cusp_lons": cusp_lons,
        "moon_lon": moon_lon,
        "lagna_lon": lagna_lon,
        "moon_nakshatra": moon_nakshatra_info.get("nakshatra", ""),
        "moon_star_lord": moon_nakshatra_info.get("star_lord", ""),
        "lagna_nakshatra": lagna_nakshatra_info.get("nakshatra", ""),
        "moon_sign": moon_sign,
        "lagna_sign": lagna_sign,
        "h7_sub_lord": h7_sl,
        "day_lord": day_lord,
    }


# ── House signification ───────────────────────────────────────

def _get_planet_house(planet_lon: float, cusp_lons: list) -> int:
    for i in range(12):
        cs = cusp_lons[i] % 360
        ce = cusp_lons[(i + 1) % 12] % 360
        pl = planet_lon % 360
        if ce > cs:
            if cs <= pl < ce:
                return i + 1
        else:
            if pl >= cs or pl < ce:
                return i + 1
    return 1


def _planet_significations_tiered(planet_name: str, planets: dict, cusp_lons: list) -> dict:
    """
    PR A1.7 — KSK Reader V A/B/C/D significator strength tiering.

    The Analysis tab system prompt RULE 5 reads:
      A (~100%) = Planets in STAR of OCCUPANT of the house — STRONGEST
      B (~75%)  = OCCUPANTS of the house themselves
      C (~50%)  = Planets in STAR of OWNER (sign lord) of the house
      D (~25%)  = OWNER of the house cusp itself — WEAKEST main level

    Returns a dict mapping house number → strongest level present.
    Used by the new tiered _h7_sublord_promise (5-tier verdict scale).

    The pre-A1.7 _planet_significations returns flat sets — necessary
    for backwards compatibility but insufficient for nuanced verdict.
    """
    if planet_name not in planets:
        return {}

    plon = planets[planet_name]["longitude"]
    pl_star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    pl_house = _get_planet_house(plon, cusp_lons)

    # For each house h ∈ 1..12, determine the strongest level at which
    # `planet_name` signifies it.
    result: dict[int, str] = {}

    for h in range(1, 13):
        # A-level: planet_name is in star of an OCCUPANT of house h
        # i.e., there's some planet X occupying house h, and
        # planet_name's star lord is X.
        occupants_of_h = [
            p for p in planets
            if _get_planet_house(planets[p]["longitude"], cusp_lons) == h
        ]
        if pl_star_lord and pl_star_lord in occupants_of_h:
            result[h] = "A"
            continue

        # B-level: planet_name is itself an occupant of house h
        if pl_house == h:
            result[h] = "B"
            continue

        # C-level: planet_name is in star of OWNER of house h
        owner_of_h = SIGN_LORDS.get(get_sign(cusp_lons[h - 1] % 360), "")
        if pl_star_lord and pl_star_lord == owner_of_h:
            result[h] = "C"
            continue

        # D-level: planet_name is the OWNER of house h
        if owner_of_h == planet_name:
            result[h] = "D"
            continue
        # Otherwise: no signification of house h.

    return result


def _planet_significations(planet_name: str, planets: dict, cusp_lons: list) -> set:
    """
    KP UNION-method canonical Gondhalekar 4-step significator collection.

    PR M1.1 (May 2026) — Extended to TRUE canonical 4-step per Gondhalekar
    Four-Step Theory + RULE 20 in system prompt. Same fix class as A1.12
    on csl_chains.py for the Analysis tab.

    Pre-M1.1 the function was labeled "4-step" but actually computed only
    3 layers:
      - Step 1+2: planet's own occupation + ownership (correct)
      - Step 3: star lord's occupation ONLY (missing ownership)
      - Step 4: was actually canonical Step 3 (sub lord) — the REAL
                canonical Step 4 (star lord of sub lord, the FINAL DECIDER
                used for Pattern D2 detection) was never computed.

    Canonical 4-step (per KSK Reader I + Gondhalekar):
      Step 1: Planet itself — occupation + ownership
      Step 2: Star Lord of planet — occupation + ownership
      Step 3: Sub Lord of planet — occupation + ownership
      Step 4: Star Lord of Sub Lord — occupation + ownership
              (FINAL DECIDER — Pattern D2 offer-then-withdrawn detector)

    UNION of Steps 1-4 = complete signification set.

    Impact for Match: every H7 CSL chain reading was at ~75% canonical
    depth, and Pattern D2 (engagement breaks before marriage / wedding
    cancelled at last minute) was structurally invisible. This fix
    restores full depth.
    """
    if planet_name not in planets:
        return set()
    plon = planets[planet_name]["longitude"]

    # Step 1: planet's own occupation + ownership
    occupied = _get_planet_house(plon, cusp_lons)
    ruled = {i + 1 for i in range(12)
             if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name}
    result: set = {occupied} | ruled

    # Step 2: STAR LORD's occupation + ownership (PR M1.1 — ownership added)
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    if star_lord and star_lord in planets:
        result.add(_get_planet_house(planets[star_lord]["longitude"], cusp_lons))
        for i in range(12):
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == star_lord:
                result.add(i + 1)

    # Step 3: SUB LORD's occupation + ownership
    sub_lord = get_sub_lord(plon)
    if sub_lord and sub_lord in planets:
        result.add(_get_planet_house(planets[sub_lord]["longitude"], cusp_lons))
        for i in range(12):
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == sub_lord:
                result.add(i + 1)

    # Step 4 (PR M1.1 — NEW): STAR LORD of SUB LORD — the FINAL DECIDER
    # When Steps 1-3 promise but Step 4 only signifies denial houses,
    # the event is offered then withdrawn at the last moment (Pattern D2).
    # For marriage this manifests as engagement-then-cancelled, wedding
    # date fixed then broken, etc. Without Step 4 the engine cannot
    # detect this pattern.
    if sub_lord and sub_lord in planets:
        sub_lord_lon = planets[sub_lord]["longitude"]
        sub_lord_star_lord = get_nakshatra_and_starlord(sub_lord_lon).get("star_lord", "")
        if sub_lord_star_lord and sub_lord_star_lord in planets:
            result.add(_get_planet_house(planets[sub_lord_star_lord]["longitude"], cusp_lons))
            for i in range(12):
                if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == sub_lord_star_lord:
                    result.add(i + 1)

    # Drop the placeholder 0 (means "house unknown") if it crept in
    result.discard(0)
    return result


def _planet_significations_with_step4(planet_name: str, planets: dict, cusp_lons: list) -> dict:
    """
    PR M1.2 — Same as _planet_significations but returns step-by-step
    breakdown so Pattern D2 detector can analyze Step 4 separately from
    Steps 1-3.

    Returns:
        {
          "steps_1_3": set — union of Steps 1, 2, 3
          "step_4":    set — Step 4 alone (star lord of sub lord)
          "step_4_planet": str — name of the Step 4 planet
          "all":       set — full union
        }
    """
    out = {
        "steps_1_3": set(),
        "step_4": set(),
        "step_4_planet": "",
        "all": set(),
    }
    if planet_name not in planets:
        return out
    plon = planets[planet_name]["longitude"]

    # Steps 1+2: planet + its star lord (both occupation + ownership)
    s_1_3: set = {_get_planet_house(plon, cusp_lons)}
    for i in range(12):
        if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name:
            s_1_3.add(i + 1)
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    if star_lord and star_lord in planets:
        s_1_3.add(_get_planet_house(planets[star_lord]["longitude"], cusp_lons))
        for i in range(12):
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == star_lord:
                s_1_3.add(i + 1)
    sub_lord = get_sub_lord(plon)
    if sub_lord and sub_lord in planets:
        s_1_3.add(_get_planet_house(planets[sub_lord]["longitude"], cusp_lons))
        for i in range(12):
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == sub_lord:
                s_1_3.add(i + 1)
    s_1_3.discard(0)

    # Step 4: star lord of sub lord
    step_4: set = set()
    step_4_planet = ""
    if sub_lord and sub_lord in planets:
        sub_lord_lon = planets[sub_lord]["longitude"]
        step_4_planet = get_nakshatra_and_starlord(sub_lord_lon).get("star_lord", "")
        if step_4_planet and step_4_planet in planets:
            step_4.add(_get_planet_house(planets[step_4_planet]["longitude"], cusp_lons))
            for i in range(12):
                if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == step_4_planet:
                    step_4.add(i + 1)
    step_4.discard(0)

    out["steps_1_3"] = s_1_3
    out["step_4"] = step_4
    out["step_4_planet"] = step_4_planet
    out["all"] = s_1_3 | step_4
    return out


def _get_cusp_sub_lord_sigs(house_num: int, chart: dict) -> tuple[str, set]:
    """Get the CSL and its significations for a given house number."""
    cusp_lon = chart["cusp_lons"][house_num - 1] % 360
    csl = get_sub_lord(cusp_lon)
    sigs = _planet_significations(csl, chart["planets"], chart["cusp_lons"])
    return csl, sigs


def _h7_sublord_promise(chart: dict) -> dict:
    """
    Check H7 sub-lord promise — TIERED in PR A1.4.

    KSK strict reading (kpastrologylearning.com Rule 1, marriage.txt:24):
       Promise = H7 CSL signifies 2 AND 7 AND 11 (intersection has 3 elements)
       Partial = intersection has 2 elements
       Weak    = intersection has 1 element
       None    = intersection is empty (or only denial houses)

    Pre-A1.4 had `has_promise = bool(sigs & {2,7,11})` — fired on any
    one match. Combined with 4-step significator collection, virtually
    every chart hit `has_promise=True`, which propagated to the
    cross-chart compatibility logic and produced default-Compatible
    verdicts.
    """
    h7_sl = chart["h7_sub_lord"]
    sigs = _planet_significations(h7_sl, chart["planets"], chart["cusp_lons"])
    promise_intersection = sigs & MARRIAGE_PROMISE_HOUSES
    denial_intersection  = sigs & MARRIAGE_DENIAL_HOUSES

    promise_count = len(promise_intersection)
    if promise_count == 3:
        promise_tier = PROMISE_FULL
    elif promise_count == 2:
        promise_tier = PROMISE_PARTIAL
    elif promise_count == 1:
        promise_tier = PROMISE_WEAK
    else:
        promise_tier = PROMISE_NONE

    # PR A1.7 — A/B/C/D significator strength on the marriage houses.
    # Per Analysis-tab RULE 5: "one A-level outweighs three D-levels".
    # This gives the AI + frontend the same depth as Analysis tab.
    tiered = _planet_significations_tiered(h7_sl, chart["planets"], chart["cusp_lons"])
    h7_csl_levels_on_marriage: dict[int, str] = {
        h: tiered[h] for h in promise_intersection if h in tiered
    }
    h7_csl_levels_on_denial: dict[int, str] = {
        h: tiered[h] for h in denial_intersection if h in tiered
    }
    # Strongest level reached on marriage triplet
    LEVEL_RANK = {"A": 4, "B": 3, "C": 2, "D": 1}
    strongest_marriage_level = ""
    if h7_csl_levels_on_marriage:
        strongest_marriage_level = max(
            h7_csl_levels_on_marriage.values(),
            key=lambda L: LEVEL_RANK.get(L, 0),
        )
    strongest_denial_level = ""
    if h7_csl_levels_on_denial:
        strongest_denial_level = max(
            h7_csl_levels_on_denial.values(),
            key=lambda L: LEVEL_RANK.get(L, 0),
        )

    # 5-tier verdict (matches Analysis RULE 5):
    #   STRONGLY PROMISED — A/B level marriage hit + denial ≤ D level (or absent)
    #   PROMISED         — A/B level marriage hit, but denial also A/B
    #                      OR ≥ 2 marriage houses at any level
    #   CONDITIONAL      — Marriage + denial both substantial (bhukti precision)
    #   WEAKLY PROMISED  — Only C/D level marriage hit, denial may be stronger
    #   DENIED           — No marriage signification at any level
    if not promise_intersection:
        five_tier = "DENIED"
    elif strongest_marriage_level in ("A", "B") and (
        not strongest_denial_level or strongest_denial_level == "D"
    ):
        five_tier = "STRONGLY PROMISED"
    elif strongest_marriage_level in ("A", "B") and strongest_denial_level in ("A", "B"):
        five_tier = "CONDITIONAL"
    elif strongest_marriage_level in ("A", "B"):
        five_tier = "PROMISED"
    elif len(promise_intersection) >= 2:
        five_tier = "PROMISED"
    elif strongest_marriage_level in ("C", "D") and strongest_denial_level in ("A", "B"):
        five_tier = "CONDITIONAL"
    else:
        five_tier = "WEAKLY PROMISED"

    has_promise = promise_tier == PROMISE_FULL
    has_denial  = bool(denial_intersection)

    # PR A1.4 — verdict logic respects both tier AND denial.
    # FULL promise with any denial → "Promised with caution" (partial)
    # PARTIAL or WEAK with denial   → "Denied" (denial wins)
    # PARTIAL with no denial        → "Conditional"
    # WEAK with no denial           → "Conditional - weak"
    # PR A1.6 — softened verdict labels.
    # Previous wording ("Denied") was too harsh for PARTIAL+denial cases —
    # the chart still promises marriage in 2 of 3 houses, just with friction.
    # Real KP reading: "marriage happens but with caveats, requires favorable
    # timing." Only true Denied = NONE tier + only denial houses signified.
    #
    # IMPORTANT: this is the NATAL STRUCTURAL verdict (lifetime promise).
    # It is NOT time-aware. Current-period activation is computed separately
    # via dasha + RP analysis.
    if promise_tier == PROMISE_FULL and not has_denial:
        verdict = "Promised"
    elif promise_tier == PROMISE_FULL and has_denial:
        verdict = "Promised with caveats"
    elif promise_tier == PROMISE_PARTIAL and not has_denial:
        verdict = "Conditional"
    elif promise_tier == PROMISE_PARTIAL and has_denial:
        verdict = "Conditional — caveats"   # was "Denied" — softened
    elif promise_tier == PROMISE_WEAK and not has_denial:
        verdict = "Conditional — weak"
    elif promise_tier == PROMISE_WEAK and has_denial:
        verdict = "Conditional — weak + caveats"   # was "Denied" — softened
    elif has_denial:
        verdict = "Denied (structural)"
    else:
        verdict = "Inconclusive"

    # H7 CSL in retrograde star — KP delay/denial signal (Phase 18 rule).
    # Per kp_csl_theory.txt §247: "If the CSL is in a retrograde star,
    # the event fructifies only at the end of the retro period or not at all."
    h7_csl_in_retro_star = False
    if h7_sl and h7_sl in chart["planets"]:
        sl_pos = chart["planets"][h7_sl]
        sl_star_lord = get_nakshatra_and_starlord(sl_pos["longitude"]).get("star_lord", "")
        if sl_star_lord and sl_star_lord in chart["planets"]:
            h7_csl_in_retro_star = bool(chart["planets"][sl_star_lord].get("retrograde", False))

    # H7 sign lord (not sub-lord) — additional indicator
    h7_lon = chart["cusp_lons"][6] % 360
    h7_sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    h7_lord_sigs = _planet_significations(h7_sign_lord, chart["planets"], chart["cusp_lons"])
    h7_lord_supports = bool(h7_lord_sigs & MARRIAGE_PROMISE_HOUSES)
    h7_lord_house = (_get_planet_house(chart["planets"][h7_sign_lord]["longitude"], chart["cusp_lons"])
                     if h7_sign_lord in chart["planets"] else 0)

    # H7 sub-lord traits (marriage type, spouse nature, caution)
    traits = H7_SUBLORD_TRAITS.get(h7_sl, {})

    # Marriage style snapshot (NOT the authoritative type classification —
    # that uses _five_signal_classification below). This is a one-liner for
    # display only.
    sigs_set = set(sigs)
    if h7_sl in ("Rahu", "Ketu"):
        marriage_type = "Unconventional/Karmic"
    elif 5 in sigs_set and 7 in sigs_set and 11 in sigs_set:
        marriage_type = "Love-and-legal (5+7+11)"
    elif 12 in sigs_set and 7 in sigs_set and 11 in sigs_set:
        marriage_type = "Secret/Private (12+7+11)"
    elif promise_tier == PROMISE_FULL:
        marriage_type = "Traditional/Arranged (2+7+11)"
    elif 5 in sigs_set:
        marriage_type = "Love component present"
    else:
        marriage_type = "Not determined"

    return {
        "sub_lord": h7_sl,
        "signified_houses": sorted(sigs),
        "promise_houses_hit": sorted(promise_intersection),
        "denial_houses_hit": sorted(denial_intersection),
        "promise_tier": promise_tier,
        "has_promise": has_promise,        # back-compat — only True for FULL
        "has_denial": has_denial,
        "verdict": verdict,
        # PR A1.7 — KSK Reader V A/B/C/D significator strength + 5-tier verdict
        "five_tier_verdict": five_tier,
        "strongest_marriage_level": strongest_marriage_level,
        "strongest_denial_level": strongest_denial_level,
        "marriage_house_levels": {f"H{h}": L for h, L in h7_csl_levels_on_marriage.items()},
        "denial_house_levels":   {f"H{h}": L for h, L in h7_csl_levels_on_denial.items()},
        "csl_in_retrograde_star": h7_csl_in_retro_star,
        "h7_sign_lord": h7_sign_lord,
        "h7_sign_lord_house": h7_lord_house,
        "h7_lord_supports": h7_lord_supports,
        "marriage_type": marriage_type,
        "spouse_nature": traits.get("spouse_nature", ""),
        "age_gap": traits.get("age_gap", ""),
        "marriage_style": traits.get("marriage_type", ""),
        "caution": traits.get("caution", ""),
    }


def _marriage_significators(chart: dict) -> set:
    """All planets that signify houses 2, 7, or 11."""
    result = set()
    for p in chart["planets"]:
        sigs = _planet_significations(p, chart["planets"], chart["cusp_lons"])
        if sigs & MARRIAGE_PROMISE_HOUSES:
            result.add(p)
    return result


def _marriage_significators_detailed(chart: dict) -> dict:
    """
    4-level KP significator hierarchy for marriage houses (2, 7, 11).
    Level 1: Occupants of H2/H7/H11
    Level 2: Lords (sign lords) of H2/H7/H11
    Level 3: Planets in the star of occupants of H2/H7/H11
    Level 4: Planets in the star of lords of H2/H7/H11
    Plus: 'fruitful' = those also in Ruling Planets.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    target_houses = {2, 7, 11}

    # Level 1: Occupants of H2/H7/H11
    occupants = []
    for p in planets:
        h = _get_planet_house(planets[p]["longitude"], cusp_lons)
        if h in target_houses:
            occupants.append(p)

    # Level 2: Lords of H2/H7/H11 cusps
    lords = []
    for h in target_houses:
        sign = get_sign(cusp_lons[h - 1] % 360)
        lord = SIGN_LORDS.get(sign, "")
        if lord and lord not in lords:
            lords.append(lord)

    # Level 3: Planets in the star of occupants
    star_of_occupants = []
    for p in planets:
        sl = get_nakshatra_and_starlord(planets[p]["longitude"]).get("star_lord", "")
        if sl in occupants and p not in star_of_occupants:
            star_of_occupants.append(p)

    # Level 4: Planets in the star of lords
    star_of_lords = []
    for p in planets:
        sl = get_nakshatra_and_starlord(planets[p]["longitude"]).get("star_lord", "")
        if sl in lords and p not in star_of_lords:
            star_of_lords.append(p)

    # Fruitful: significators that are also Ruling Planets
    rp = _ruling_planets(chart)
    all_sigs = set(occupants) | set(lords) | set(star_of_occupants) | set(star_of_lords)
    fruitful = sorted(all_sigs & rp)

    return {
        "planets": sorted(all_sigs),
        "by_level": {
            "occupants_2_7_11": occupants,
            "lords_2_7_11": lords,
            "star_of_occupants": star_of_occupants,
            "star_of_lords": star_of_lords,
        },
        "fruitful": fruitful,
    }


def _current_dba(person: dict, chart: dict) -> dict:
    """
    Get current Mahadasha-Antardasha-Pratyantardasha for a person.
    Also checks if MD/AD lords signify marriage houses (2, 7, 11).
    """
    try:
        moon_lon = chart["moon_lon"]
        dashas = calculate_dashas(person["date"], person["time"], moon_lon, person.get("timezone_offset", 5.5))
        md = get_current_dasha(dashas)
        ads = calculate_antardashas(md)
        ad = get_current_antardasha(ads)
        pads = calculate_pratyantardashas(ad)
        pad = get_current_pratyantardasha(pads)

        # Check if MD/AD lords signify marriage houses
        md_sigs = _planet_significations(md["lord"], chart["planets"], chart["cusp_lons"])
        ad_sigs = _planet_significations(ad["antardasha_lord"], chart["planets"], chart["cusp_lons"])

        md_favorable = bool(md_sigs & MARRIAGE_PROMISE_HOUSES)
        ad_favorable = bool(ad_sigs & MARRIAGE_PROMISE_HOUSES)

        return {
            "md_lord": md["lord"],
            "md_end": md["end"],
            "ad_lord": ad["antardasha_lord"],
            "ad_end": ad["end"],
            "pad_lord": pad["pratyantardasha_lord"],
            "pad_end": pad["end"],
            "md_signifies": sorted(md_sigs),
            "ad_signifies": sorted(ad_sigs),
            "md_favorable": md_favorable,
            "ad_favorable": ad_favorable,
            "favorable": md_favorable and ad_favorable,
        }
    except Exception:
        return {
            "md_lord": "Unknown", "md_end": "",
            "ad_lord": "Unknown", "ad_end": "",
            "pad_lord": "Unknown", "pad_end": "",
            "md_signifies": [], "ad_signifies": [],
            "md_favorable": False, "ad_favorable": False,
            "favorable": False,
        }


def _h5_sublord_analysis(chart: dict) -> dict:
    """
    5th CSL analysis — love/romance quality.
    5+8+12 without 2/7/11 = heartbreak formula.
    """
    csl, sigs = _get_cusp_sub_lord_sigs(5, chart)
    has_5_8_12 = {5, 8, 12}.issubset(sigs)
    has_love = bool(sigs & {5, 7, 11})
    has_promise_houses = bool(sigs & {2, 7, 11})
    heartbreak = has_5_8_12 and not has_promise_houses

    return {
        "sub_lord": csl,
        "signified_houses": sorted(sigs),
        "love_indicated": has_love,
        "heartbreak_5_8_12": heartbreak,
        "note": (
            "Love affair may end badly (5-8-12 without 2/7/11)" if heartbreak
            else "Love and romance indicated" if has_love
            else "Romance not strongly indicated"
        ),
    }


def _separation_risk(chart: dict) -> dict:
    """
    Divorce/separation risk — PR A1.4 expanded.

    Additions vs pre-A1.4:
      - Saturn 3rd/7th/10th VEDIC ASPECT to H7 (delay/coldness signal,
        not just Saturn IN H7)
      - Rahu / Ketu on H1-H7 axis flag
      - H7 CSL in retrograde star flag
      - Mars 4th/7th/8th aspect to H7 (Mars's special aspects)
    """
    h7_promise = _h7_sublord_promise(chart)
    sigs = set(h7_promise["signified_houses"])
    cusp_lons = chart["cusp_lons"]
    planets = chart["planets"]
    risk_factors = []

    if 6 in sigs:
        risk_factors.append("H7 CSL signifies H6 (disputes/separation)")
    if 12 in sigs:
        risk_factors.append("H7 CSL signifies H12 (loss/separation)")
    if 8 in sigs:
        risk_factors.append("H7 CSL signifies H8 (obstacles/transformation)")
    if h7_promise.get("csl_in_retrograde_star"):
        risk_factors.append("H7 CSL is in retrograde star (delay / non-fructification)")

    # Mars — occupation in H7/H8 + special Vedic aspects to H7
    # Mars special aspects: 4th, 7th, 8th from itself
    if "Mars" in planets:
        mars_house = _get_planet_house(planets["Mars"]["longitude"], cusp_lons)
        if mars_house in (7, 8):
            risk_factors.append(f"Mars in H{mars_house} (aggression in partnership)")
        # Special aspect to H7
        if mars_house in (4, 12, 1):  # Mars from 4→7, 12→7 (8th asp), 1→7 (7th asp)
            risk_factors.append(f"Mars in H{mars_house} casts special aspect to H7 (conflict signal)")

    # Saturn — occupation in H7 + special Vedic aspects to H7
    # Saturn special aspects: 3rd, 7th, 10th from itself
    if "Saturn" in planets:
        sat_house = _get_planet_house(planets["Saturn"]["longitude"], cusp_lons)
        if sat_house == 7:
            risk_factors.append("Saturn in H7 (delays/coldness in marriage)")
        # Saturn 3rd aspect: from H5 → H7
        # Saturn 7th aspect: from H1 → H7 (Saturn in H1)
        # Saturn 10th aspect: from H10 → H7
        if sat_house == 5:
            risk_factors.append("Saturn in H5 casts 3rd-aspect to H7 (long delay/maturity demand)")
        elif sat_house == 1:
            risk_factors.append("Saturn in H1 casts 7th-aspect to H7 (delay + serious tone)")
        elif sat_house == 10:
            risk_factors.append("Saturn in H10 casts 10th-aspect to H7 (career-marriage tension)")

    # Rahu / Ketu on H1-H7 axis
    for shadow in ("Rahu", "Ketu"):
        if shadow in planets:
            h = _get_planet_house(planets[shadow]["longitude"], cusp_lons)
            if h in (1, 7):
                risk_factors.append(f"{shadow} on H1-H7 axis at H{h} (unconventional/karmic delay)")

    if len(risk_factors) >= 4:
        risk_level = "High"
    elif len(risk_factors) >= 2:
        risk_level = "Moderate"
    elif risk_factors:
        risk_level = "Low"
    else:
        risk_level = "Minimal"

    return {
        "risk_level": risk_level,
        "factors": risk_factors,
    }


def _ruling_planets(chart: dict) -> set:
    """
    7-slot natal Ruling Planets — PR A1.4.

    Pre-A1.4: 4-slot RP (Moon sign lord, Moon star lord, Lagna sign lord,
    Lagna star lord). This omitted the Day Lord, Ascendant Sub Lord, and
    most critically the MOON SUB LORD — which per KSK's writings
    (ajmerastro.com / KP Reader I) "frequently decides yes/no when other
    ruling planets are split."

    PR A1.4 returns the canonical KP 7-slot natal RP set. We use natal
    birth time (not query time) because compatibility analysis evaluates
    the chart's *promise*, not a horary moment. For Match-mode query-time
    RPs we'd use chart_engine.get_ruling_planets() instead.

    For richer downstream consumers, _ruling_planets_full() (below) gives
    the slot assignments + strongest list.
    """
    return set(_ruling_planets_full(chart)["ruling_planets"])


def _ruling_planets_full(chart: dict) -> dict:
    """7-slot natal RP with slot assignments + strongest list."""
    # 1. Day Lord — weekday of birth, in local time at birth place.
    #    The chart was built with the user's timezone_offset already, so
    #    we can read the local-time weekday by parsing the input date.
    #    chart["jd"] is the UT julian day; convert to local time.
    day_lord = chart.get("day_lord", "")  # populated in _build_chart

    moon_lon = chart["moon_lon"]
    lagna_lon = chart["lagna_lon"]
    moon_info = get_nakshatra_and_starlord(moon_lon)
    lagna_info = get_nakshatra_and_starlord(lagna_lon)

    slot_assignments = [
        {"slot": "Day Lord",       "planet": day_lord},
        {"slot": "Asc Sign Lord",  "planet": SIGN_LORDS.get(chart["lagna_sign"], "")},
        {"slot": "Asc Star Lord",  "planet": lagna_info.get("star_lord", "")},
        {"slot": "Asc Sub Lord",   "planet": get_sub_lord(lagna_lon)},
        {"slot": "Moon Sign Lord", "planet": SIGN_LORDS.get(chart["moon_sign"], "")},
        {"slot": "Moon Star Lord", "planet": moon_info.get("star_lord", "")},
        {"slot": "Moon Sub Lord",  "planet": get_sub_lord(moon_lon)},
    ]
    planet_slots: dict[str, list[str]] = {}
    for a in slot_assignments:
        p = a["planet"]
        if not p:
            continue
        planet_slots.setdefault(p, []).append(a["slot"])

    # Rank: planets in more slots float to top; ties → earliest slot
    def _rank(p):
        first_idx = min(i for i, a in enumerate(slot_assignments) if a["planet"] == p)
        return (-len(planet_slots[p]), first_idx, p)

    ranked = sorted(planet_slots.keys(), key=_rank)
    strongest = [p for p in ranked if len(planet_slots[p]) >= 2]

    return {
        "ruling_planets": ranked,
        "slot_assignments": slot_assignments,
        "planet_slots": planet_slots,
        "strongest": strongest,
    }


# ── Extended KP Marriage Analysis ────────────────────────────

def _venus_analysis(chart: dict) -> dict:
    """
    Analyze Venus as the primary marriage karaka (significator).
    Strong Venus = enhanced marriage promise. Weak Venus = caution.
    """
    if "Venus" not in chart["planets"]:
        return {"status": "Not found", "enhances_promise": False}

    venus_lon = chart["planets"]["Venus"]["longitude"]
    venus_house = _get_planet_house(venus_lon, chart["cusp_lons"])
    venus_sign = get_sign(venus_lon % 360)
    venus_sigs = _planet_significations("Venus", chart["planets"], chart["cusp_lons"])

    # Venus in H6, H8, H12 is afflicted (denial/loss houses)
    afflicted = venus_house in {6, 8, 12}

    # Venus signifying H7 = direct marriage indicator
    signifies_h7 = 7 in venus_sigs
    signifies_h11 = 11 in venus_sigs
    signifies_h2 = 2 in venus_sigs

    # Venus in Ruling Planets check (sign lord of Moon or Lagna)
    moon_sign_lord = SIGN_LORDS.get(chart["moon_sign"], "")
    lagna_sign_lord = SIGN_LORDS.get(chart["lagna_sign"], "")
    is_rp = "Venus" in {moon_sign_lord, lagna_sign_lord,
                        get_nakshatra_and_starlord(chart["moon_lon"]).get("star_lord", ""),
                        get_nakshatra_and_starlord(chart["lagna_lon"]).get("star_lord", "")}

    # Strength assessment
    if not afflicted and (signifies_h7 or signifies_h2 or signifies_h11) and is_rp:
        strength = "Strong"
        enhances = True
    elif not afflicted and (signifies_h7 or signifies_h11):
        strength = "Good"
        enhances = True
    elif afflicted:
        strength = "Afflicted"
        enhances = False
    else:
        strength = "Moderate"
        enhances = bool(venus_sigs & MARRIAGE_PROMISE_HOUSES)

    return {
        "house": venus_house,
        "sign": venus_sign,
        "significations": sorted(venus_sigs),
        "signifies_h7": signifies_h7,
        "is_ruling_planet": is_rp,
        "afflicted": afflicted,
        "strength": strength,
        "enhances_promise": enhances,
    }


def _five_signal_classification(chart: dict) -> dict:
    """
    Five-signal love-vs-arranged classification — PR A1.4.

    Source: marriage.txt Section 12 (canonical KP framework). Externally
    confirmed by redastrologer.com, astrogle.com on 2026-05-15.

    The five signals (in order):
      Signal 1: H5 presence in H7 CSL chain (love-tendency indicator)
      Signal 2: 5L placement quality (THE CRITICAL OVERRIDE — H6/8/12
                negates love path even if Signal 1 is positive)
      Signal 3: H4 + H9 in H7 CSL chain (parental-mediation indicator)
      Signal 4: Moon house position (family-driven indicator)
      Signal 5: 5L-7L relationship (the binder — same planet, conjunction,
                parivartana, mutual aspect)

    Verdict categories: Pure Love / Pure Arranged / Love-cum-Arranged /
    Love-affair-then-Arranged / Family-Mediated-with-Native-Acceptance.
    """
    h7_csl = chart["h7_sub_lord"]
    cusp_lons = chart["cusp_lons"]
    planets = chart["planets"]

    # H7 CSL chain houses (using UNION method via _planet_significations)
    h7_chain_houses = _planet_significations(h7_csl, planets, cusp_lons)

    # Signal 1: H5 in H7 chain?
    s1_h5_in_chain = 5 in h7_chain_houses

    # Signal 2 (PR A1.8 CORRECTED — was a real bug):
    #
    # Canonical KP rule per redastrologer.com + kpastrologylearning.com +
    # KP Reader IV (5th cusp sub-lord chapter):
    #   "If the 5CSL signifies {5,8,12} WITHOUT connecting to {2,7,11},
    #    the relationship is destined to remain a hidden affair that
    #    ends in heartbreak.
    #    HOWEVER, if the 5CSL connects to houses 7 and 11, even a hidden
    #    affair could potentially materialize into marriage."
    #
    # Pre-A1.8 BUG: we checked 5L (sign lord of 5th cusp) PLACEMENT
    # instead of 5CSL (5th cusp sub lord) CHAIN signification — and made
    # the override ABSOLUTE instead of CONDITIONAL. This produced false
    # "family-mediated arranged" classifications for charts that genuinely
    # show love marriage with obstacles (e.g., partner from different
    # caste, family resistance that eventually softens).
    #
    # The CORRECT logic checks:
    #   5CSL CHAIN signification via _planet_significations (UNION method)
    #   - {2,7,11} present AND {5,8,12} absent  →  clean love-to-marriage
    #   - {5,8,12} present AND {2,7,11} absent  →  love fails to culminate
    #   - BOTH present                          →  love marriage with
    #                                              obstacles (caste,
    #                                              secrecy, family objection)
    #                                              — can STILL materialize
    #   - 6 alone (no 7/11)                     →  separation/breakup
    h5_lon = cusp_lons[4] % 360
    h5_csl = get_sub_lord(h5_lon)
    h5_csl_chain = (_planet_significations(h5_csl, planets, cusp_lons)
                    if h5_csl else set())
    s2_chain_has_5812    = bool(h5_csl_chain & {5, 8, 12})
    s2_chain_has_marriage = bool(h5_csl_chain & {2, 7, 11})
    s2_chain_has_6_alone = (6 in h5_csl_chain) and not s2_chain_has_marriage
    # Auxiliary: 5L planet placement — kept as CONTEXT, not as override
    fifth_lord = SIGN_LORDS.get(get_sign(h5_lon), "")
    fifth_lord_house = (_get_planet_house(planets[fifth_lord]["longitude"], cusp_lons)
                        if fifth_lord in planets else 0)
    # Final s2 verdicts (CONDITIONAL — not absolute):
    s2_love_path_negated = (s2_chain_has_5812 and not s2_chain_has_marriage) or s2_chain_has_6_alone
    s2_love_path_strong  = s2_chain_has_marriage and not s2_chain_has_5812
    s2_love_with_obstacles = s2_chain_has_5812 and s2_chain_has_marriage

    # Signal 3: H4 + H9 in H7 chain?
    s3_h4_in_chain = 4 in h7_chain_houses
    s3_h9_in_chain = 9 in h7_chain_houses
    # H4 sub lord and H9 sub lord signifying H7 — extra parental check
    h4_csl, h4_sigs = _get_cusp_sub_lord_sigs(4, chart)
    h9_csl, h9_sigs = _get_cusp_sub_lord_sigs(9, chart)
    s3_mother_active = 7 in h4_sigs
    s3_father_active = 7 in h9_sigs
    s3_strong_arranged = s3_h4_in_chain and s3_h9_in_chain
    s3_one_parent     = s3_h4_in_chain ^ s3_h9_in_chain

    # Signal 4: Moon house position (PR A1.6 expanded — H6 wasn't mapped)
    moon_house = _get_planet_house(chart["moon_lon"], cusp_lons)
    if moon_house in {2, 4}:
        s4_moon_mode = "family-driven"
    elif moon_house in {7, 11}:
        s4_moon_mode = "joint-decision"
    elif moon_house in {5, 9}:
        s4_moon_mode = "romance+dharma"
    elif moon_house in {8, 12}:
        s4_moon_mode = "hidden/secretive"
    elif moon_house in {1, 10}:
        s4_moon_mode = "self/career-driven"
    elif moon_house == 6:
        s4_moon_mode = "workplace/service-driven"
    elif moon_house == 3:
        s4_moon_mode = "neighbourhood/sibling-mediated"
    else:
        s4_moon_mode = "neutral"

    # Signal 5: 5L-7L relationship
    seventh_lord = SIGN_LORDS.get(get_sign(cusp_lons[6] % 360), "")
    if fifth_lord and seventh_lord:
        if fifth_lord == seventh_lord:
            s5_relation = "5L = 7L (same planet)"
            s5_strength = "strong"
        else:
            # conjunction within 8°?
            if (fifth_lord in planets and seventh_lord in planets):
                lon5 = planets[fifth_lord]["longitude"] % 360
                lon7 = planets[seventh_lord]["longitude"] % 360
                sep = abs((lon5 - lon7 + 180) % 360 - 180)
                if sep <= 8:
                    s5_relation = f"5L-7L conjunct ({round(sep,1)}°)"
                    s5_strength = "strong"
                else:
                    # parivartana check
                    fifth_house_sign = get_sign(planets[fifth_lord]["longitude"] % 360)
                    seventh_house_sign = get_sign(planets[seventh_lord]["longitude"] % 360)
                    if (SIGN_LORDS.get(fifth_house_sign) == seventh_lord
                        and SIGN_LORDS.get(seventh_house_sign) == fifth_lord):
                        s5_relation = "5L-7L parivartana (exchange)"
                        s5_strength = "mild"
                    else:
                        s5_relation = "5L-7L unconnected"
                        s5_strength = "none"
            else:
                s5_relation = "5L or 7L missing"
                s5_strength = "none"
    else:
        s5_relation = "lords missing"
        s5_strength = "none"

    # PR A1.8 — Rahu/Ketu in H7 CSL chain → unconventional/inter-caste signal.
    # Per multiple KP sources (astroindia.com, redastrologer.com): Rahu in chain
    # (especially H3 or H7 axis) indicates inter-caste, foreign, or
    # different-background partner; native often finds partner through own
    # social/communication channels rather than family arrangement.
    rahu_ketu_in_chain = False
    if h7_csl in ("Rahu", "Ketu"):
        rahu_ketu_in_chain = True
    else:
        # Check if Rahu/Ketu's house is in the chain (i.e., chain hits
        # the Rahu/Ketu occupied house)
        for shadow in ("Rahu", "Ketu"):
            if shadow in planets:
                h = _get_planet_house(planets[shadow]["longitude"], cusp_lons)
                if h in h7_chain_houses:
                    rahu_ketu_in_chain = True
                    break

    # PR A1.11 — Decision tree refined for canonical-KP fidelity.
    #
    # Pre-A1.11 the framework required BOTH S1 (H5 in H7 CSL chain) AND
    # S2 (5CSL clean) for any "love" classification. That was stricter
    # than canonical KP, which states:
    #   "If the 5th cuspal sub lord signifies houses 7 and 11,
    #    materialization of love affair into marriage is definite."
    # (redastrologer.com, kpastrologylearning.com, KP Reader IV — 5CSL
    #  signal alone is sufficient for love marriage).
    #
    # PR A1.11 adds explicit S2-driven branches: when S2_love_path_strong
    # is True, the chart has the canonical KP love signal even without
    # H5 in the H7 CSL chain. We classify accordingly.
    #
    # We also gate arranged branches on NOT s2_love_path_strong — we
    # cannot classify as arranged when the 5CSL is shouting love.

    # ─── BRANCH GROUP A: Strong S1 (H5 in H7 CSL chain) ────────────
    if s1_h5_in_chain and s2_love_with_obstacles:
        category = "Love Marriage with Obstacles"
        reasoning = (
            f"H5 appears in H7 CSL chain (Signal 1: love-tendency exists). "
            f"5CSL chain hits BOTH {{5,8,12}} (secrecy/scandal/loss) AND "
            f"{{2,7,11}} (marriage anchor). Per canonical KP: love-affair "
            f"faces obstacles (different caste/community, family resistance, "
            f"or hidden phase) BUT can still culminate in marriage because "
            f"the 5CSL chain has the marriage anchor."
            + (f" Rahu/Ketu in H7 chain reinforces unconventional/inter-caste partner." if rahu_ketu_in_chain else "")
        )
    elif s2_love_path_negated and s1_h5_in_chain:
        category = "Love-affair-then-Arranged"
        reasoning = (
            f"H5 appears in H7 CSL chain (Signal 1: love-tendency exists) "
            f"BUT 5CSL chain hits {{5,8,12}} WITHOUT {{2,7,11}} anchor "
            f"(Signal 2: love path closed per canonical KP rule). "
            f"Family arrangement takes over."
        )
    elif s1_h5_in_chain and s2_love_path_strong and s5_strength == "strong":
        category = "Pure Love Marriage"
        reasoning = (
            f"H5 in H7 CSL chain (Signal 1) + 5CSL chain hits {{2,7,11}} "
            f"without 5-8-12 affliction (Signal 2 strong) + {s5_relation} "
            f"(Signal 5)."
        )
    elif s1_h5_in_chain and s2_love_path_strong and s3_one_parent:
        category = "Love-cum-Arranged"
        reasoning = (
            f"Love tendency present (H5 in chain, 5CSL chain well-anchored "
            f"to {{2,7,11}}) AND one-parent network involved "
            f"(H{4 if s3_h4_in_chain else 9} in chain)."
        )
    # ─── BRANCH GROUP B: PR A1.11 — S2-driven love (canonical KP) ──
    # The canonical KP rule "5CSL signifies 7+11 → love marriage materializes"
    # fires even WITHOUT H5 in H7 CSL chain. These branches catch the case
    # where the love signal flows through 5CSL alone — often manifests as
    # "introduction-via-friends-then-romance-then-marriage" or
    # "career-network meeting that turns into love."
    elif s2_love_path_strong and s5_strength == "strong" and not s1_h5_in_chain:
        category = "Pure Love Marriage (5CSL-driven)"
        reasoning = (
            f"5CSL chain hits {{2,7,11}} cleanly without 5-8-12 affliction "
            f"(canonical KP love-marriage signal) + strong 5L-7L connection "
            f"({s5_relation}). H5 is not in H7 CSL chain — the love-tendency "
            f"manifests through the 5CSL gate directly rather than through "
            f"the H7 CSL chain. Often: meets partner through career, friend "
            f"network, or H11/H3 social circle rather than pure romantic pursuit."
        )
    elif s2_love_path_strong and (s3_h4_in_chain or s3_h9_in_chain) and not s1_h5_in_chain:
        category = "Love-cum-Arranged (5CSL-driven)"
        reasoning = (
            f"5CSL chain hits {{2,7,11}} cleanly (canonical KP love signal) + "
            f"H{4 if s3_h4_in_chain else 9} in H7 CSL chain (one-parent "
            f"network active). H5 is not in H7 CSL chain, so the love-tendency "
            f"is not direct H5-romance but rather a love-flavored marriage "
            f"that enters through family/peer introduction. Typical pattern: "
            f"introduced by friends/family, mutual liking develops, family "
            f"blesses the match. Both partners chose each other AND family "
            f"is involved positively."
        )
    elif s2_love_path_strong and not s1_h5_in_chain:
        category = "Love-natured Marriage (5CSL-driven)"
        reasoning = (
            f"5CSL chain hits {{2,7,11}} cleanly (canonical KP love signal) "
            f"but neither H5 in chain (S1) nor strong 5L-7L (S5) nor parental "
            f"mediation (S3) are firing. The love-flavor exists structurally "
            f"but the path is unclear — could be late romance, work-place "
            f"connection, or self-initiated match without formal arrangement."
        )
    elif s2_love_with_obstacles and not s1_h5_in_chain:
        category = "Love-flavored Marriage with Friction"
        reasoning = (
            f"5CSL chain has BOTH the marriage anchor {{2,7,11}} AND the "
            f"contamination {{5,8,12}} — love signal present but structurally "
            f"obstructed. H5 not in H7 CSL chain, so this is not primary "
            f"H5-romance. The marriage likely flows through complications "
            f"(distance, caste/community, hidden phase, secret introduction) "
            f"and may need family negotiation to materialize."
        )
    # ─── BRANCH GROUP C: PR A1.11 — Arranged branches.
    # All arranged classifications now require NOT s2_love_path_strong.
    # If 5CSL is shouting love (canonical KP signal), we cannot classify
    # as arranged regardless of what other signals say.
    elif s3_strong_arranged and not s1_h5_in_chain and not s2_love_path_strong:
        category = "Pure Arranged Marriage"
        reasoning = (
            "Both H4 and H9 in H7 CSL chain (Signal 3 strong arranged) + "
            "no H5 in chain (Signal 1 absent) + 5CSL not signaling clean "
            "love path."
        )
    elif s3_strong_arranged and s2_love_path_negated:
        category = "Pure Arranged Marriage"
        reasoning = (
            "Parental mediation strong (H4+H9 in chain) + 5CSL chain hits "
            "{{5,8,12}} without {{2,7,11}} anchor — love path closed; "
            "family arrangement is the structural path."
        )
    elif (s3_h4_in_chain or s3_h9_in_chain) and not s1_h5_in_chain and not s2_love_path_strong:
        category = "Family-Mediated with Native Acceptance"
        reasoning = (
            "Parental network present (H{} in chain), love-tendency signals "
            "absent (H5 not in chain, 5CSL not clean-anchored to {{2,7,11}}) "
            "— family arranges and native approves.".format(4 if s3_h4_in_chain else 9)
        )
    elif s4_moon_mode == "family-driven" and not s1_h5_in_chain and not s2_love_path_strong:
        category = "Family-Mediated (Moon-driven)"
        reasoning = (
            f"Moon in H{moon_house} indicates family-driven marriage decision "
            f"(Signal 4 strong). Neither H5 in H7 CSL chain nor 5CSL clean "
            f"love-signal firing. Family arranges; native approves."
        )
    elif not s1_h5_in_chain and not s3_h4_in_chain and not s3_h9_in_chain:
        category = "Inconclusive — needs context"
        reasoning = (
            "No strong signals from H5, H4, or H9 in H7 CSL chain. "
            f"Moon in H{moon_house} ({s4_moon_mode}) is the only weak hint. "
            f"5L={fifth_lord} in H{fifth_lord_house}. "
            f"Pattern is ambiguous — consult astrologer for finer reading."
        )
    else:
        category = "Mixed signals — Love-cum-Arranged most likely"
        reasoning = (
            f"H5 in chain: {s1_h5_in_chain} | 5L in H{fifth_lord_house} | "
            f"Parental: H4={s3_h4_in_chain}, H9={s3_h9_in_chain} | "
            f"Moon: {s4_moon_mode} | 5L-7L: {s5_relation}"
        )

    return {
        "category": category,
        "reasoning": reasoning,
        "signal_1_h5_in_chain": s1_h5_in_chain,
        # PR A1.8 — Signal 2 reports the canonical 5CSL CHAIN data, not 5L placement.
        # Old 5L placement fields retained as context.
        "signal_2_fifth_csl": h5_csl,
        "signal_2_h5_csl_chain_houses": sorted(h5_csl_chain),
        "signal_2_chain_has_5_8_12": s2_chain_has_5812,
        "signal_2_chain_has_marriage_anchor": s2_chain_has_marriage,
        "signal_2_love_with_obstacles": s2_love_with_obstacles,
        "signal_2_fifth_lord_house": fifth_lord_house,    # context only
        "signal_2_fifth_lord": fifth_lord,                 # context only
        "signal_2_love_path_negated": s2_love_path_negated,
        "signal_2_love_path_strong": s2_love_path_strong,
        "signal_3_h4_in_chain": s3_h4_in_chain,
        "signal_3_h9_in_chain": s3_h9_in_chain,
        "signal_3_mother_active": s3_mother_active,
        "signal_3_father_active": s3_father_active,
        "signal_4_moon_house": moon_house,
        "signal_4_moon_mode": s4_moon_mode,
        "signal_5_relation": s5_relation,
        "signal_5_strength": s5_strength,
        "seventh_lord": seventh_lord,
        # PR A1.8 — Rahu/Ketu unconventional-partner signal
        "rahu_ketu_in_h7_chain": rahu_ketu_in_chain,
    }


def _supporting_cusps(chart: dict) -> dict:
    """
    Analyze H2 and H11 CSLs as supporting marriage gates.
    H2 CSL signifying H7/H11 → arrangements completed.
    H11 CSL signifying H7/H2 → fulfillment/fruit of marriage.
    """
    h2_csl, h2_sigs = _get_cusp_sub_lord_sigs(2, chart)
    h11_csl, h11_sigs = _get_cusp_sub_lord_sigs(11, chart)

    h2_supports = bool(h2_sigs & {7, 11})
    h11_supports = bool(h11_sigs & {2, 7})

    return {
        "h2_csl": h2_csl,
        "h2_sigs": sorted(h2_sigs),
        "h2_supports": h2_supports,
        "h11_csl": h11_csl,
        "h11_sigs": sorted(h11_sigs),
        "h11_supports": h11_supports,
        "both_support": h2_supports and h11_supports,
    }


def _detect_marriage_patterns(chart: dict, person_dict: dict | None = None) -> list[dict]:
    """
    PR M3 — Detect canonical KP marriage patterns from pattern_library.md
    per partner. Pattern naming is what distinguishes a deep KSK reading
    from a generic significator scan (RULE 19).

    Patterns detected (per partner):
      M1 — Venus + Jupiter joint period trigger (classical marriage karaka activation)
      M2 — Saturn delay-not-denial (Saturn IS a marriage significator)
      M3 — H7 in fixed sign + strong fruitful CSL (stable single marriage signal)
      M5 — AD-lord = supporting-cusp-sub-lord (KSK PRIMARY timing trigger)

    Cross-couple patterns are handled separately by _detect_couple_patterns().

    Each pattern: {id, name, name_te, evidence, evidence_te, tone}
    tone = "gold" for positive timing/structural patterns, "amber" for friction.
    """
    patterns: list[dict] = []
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    h7_csl = _get_cusp_sub_lord_sigs(7, chart)[0]
    h7_csl_sigs = _planet_significations(h7_csl, planets, cusp_lons)
    ruling_planets = chart.get("ruling_planets", set())
    if not ruling_planets:
        ruling_planets = _ruling_planets(chart)

    # ── M1 — Venus + Jupiter classical marriage trigger ──────────
    # Fires when EITHER Venus or Jupiter is a significator of {2,7,11}
    # AND is in the current RP set (the moment is alive).
    for karaka in ("Venus", "Jupiter"):
        karaka_sigs = _planet_significations(karaka, planets, cusp_lons)
        if karaka_sigs & {2, 7, 11} and karaka in ruling_planets:
            houses_hit = sorted(karaka_sigs & {2, 7, 11})
            patterns.append({
                "id": "M1",
                "name": f"Marriage Karaka Trigger — {karaka} active",
                "name_te": f"వివాహ కారక సక్రియం — {karaka}",
                "evidence": (
                    f"{karaka} (classical marriage karaka) signifies H{houses_hit} "
                    f"AND is currently in the Ruling Planet set. Per KSK Reader: "
                    f"when the karaka is both significator AND ruling, its dasha/"
                    f"bhukti is the prime marriage-firing window."
                ),
                "evidence_te": (
                    f"{karaka} (వివాహ కారక) H{houses_hit} సూచిస్తుంది + ప్రస్తుత "
                    f"నియమ గ్రహాలలో — KSK: కారక యొక్క దశ/భుక్తి బలమైన వివాహ సమయం."
                ),
                "tone": "gold",
            })
            break  # only fire one M1 per chart (don't double-count if both karakas qualify)

    # ── M2 — Saturn delay-not-denial ─────────────────────────────
    # When Saturn IS a significator of {2,7,11}, the classical "Saturn delays
    # marriage" turns into "Saturn delivers marriage in its own time" (KSK).
    saturn_sigs = _planet_significations("Saturn", planets, cusp_lons)
    if saturn_sigs & {2, 7, 11}:
        houses_hit = sorted(saturn_sigs & {2, 7, 11})
        patterns.append({
            "id": "M2",
            "name": "Saturn Delay-not-Denial",
            "name_te": "శని ఆలస్యం — తిరస్కరణ కాదు",
            "evidence": (
                f"Saturn signifies H{houses_hit} for marriage. Per KSK Reader: "
                f"when Saturn is a marriage significator (not just transiting "
                f"malefic), it DELAYS but DELIVERS — Saturn's dasha/bhukti is "
                f"a real marriage window, just later than karaka-AD expectations."
            ),
            "evidence_te": (
                f"శని H{houses_hit} సూచిస్తుంది — KSK: శని వివాహాన్ని ఆలస్యం "
                f"చేస్తుంది కానీ తిరస్కరించదు. శని దశ నిజమైన వివాహ సమయం."
            ),
            "tone": "gold",
        })

    # ── M3 — H7 in fixed sign + strong fruitful CSL (stable single marriage) ──
    # Per pattern_library.md M3: H7 in Fixed sign (Taurus/Leo/Scorpio/Aquarius)
    # combined with H7 CSL signifying {2,7,11} = stable single marriage.
    # H7 in Mutable (Gemini/Virgo/Sag/Pisces) is the multi-marriage signal (M5 below).
    h7_lon = cusp_lons[6] % 360
    h7_sign = get_sign(h7_lon)
    FIXED = {"Taurus", "Leo", "Scorpio", "Aquarius"}
    if h7_sign in FIXED and h7_csl_sigs & {2, 7, 11}:
        patterns.append({
            "id": "M3",
            "name": f"H7 in Fixed Sign ({h7_sign}) + fruitful CSL — stable single marriage",
            "name_te": f"H7 స్థిర రాశి ({h7_sign}) + ఫలప్రద CSL — స్థిర ఏకవివాహ సంకేతం",
            "evidence": (
                f"H7 cusp is in {h7_sign} (Fixed sign) + H7 CSL {h7_csl} "
                f"signifies H{sorted(h7_csl_sigs & {2,7,11})}. Per KP doctrine, "
                f"fixed-sign H7 with fruitful CSL indicates ONE stable marriage "
                f"that endures (as distinct from dual-sign H7 = multi-marriage signal)."
            ),
            "evidence_te": (
                f"H7 {h7_sign} (స్థిర) + H7 CSL {h7_csl} అనుకూలం — "
                f"KP: ఒక స్థిర వివాహం దీర్ఘకాలికం."
            ),
            "tone": "gold",
        })

    # ── M5 — AD-lord = supporting-cusp-sub-lord (KSK PRIMARY timing trigger) ──
    # KSK Reader marriage chapter: marriage fructifies in the joint period of
    # significators of 2, 7, 11. When the AD lord IS the sub-lord of one of
    # these cusps AND its chain signifies the other two, that AD is the
    # primary trigger window — even if not Venus/Jupiter karaka AD.
    # Avoids the Parashari karaka-bias of "wait for Venus AD".
    if person_dict:
        try:
            from app.services.chart_engine import (
                calculate_dashas, get_current_dasha,
                calculate_antardashas, get_current_antardasha,
            )
            jd = chart.get("jd")
            moon_lon = chart["planets"]["Moon"]["longitude"]
            tz_off = person_dict.get("timezone_offset", 5.5)
            dashas = calculate_dashas(person_dict["date"], person_dict["time"], moon_lon, tz_off)
            current_md = get_current_dasha(dashas)
            antardashas = calculate_antardashas(current_md)
            # Get sub-lords of H2, H7, H11
            h2_csl_planet = _get_cusp_sub_lord_sigs(2, chart)[0]
            h7_csl_planet = _get_cusp_sub_lord_sigs(7, chart)[0]
            h11_csl_planet = _get_cusp_sub_lord_sigs(11, chart)[0]
            supporting_csl_planets = {h2_csl_planet, h7_csl_planet, h11_csl_planet}
            # Find upcoming AD where AD lord = one of the supporting CSL planets
            # AND that AD lord's chain signifies the OTHER two relevant cusps
            for ad in antardashas:
                ad_lord = ad.get("antardasha_lord")
                if ad_lord in supporting_csl_planets:
                    ad_sigs = _planet_significations(ad_lord, planets, cusp_lons)
                    # Does AD lord's chain signify at least 2 of {2,7,11}?
                    relevant_hits = ad_sigs & {2, 7, 11}
                    if len(relevant_hits) >= 2:
                        patterns.append({
                            "id": "M5",
                            "name": f"KSK Primary Timing — {ad_lord} AD is H{h2_csl_planet == ad_lord and 2 or (h7_csl_planet == ad_lord and 7 or 11)} CSL + signifies {{{','.join(str(h) for h in sorted(relevant_hits))}}}",
                            "name_te": f"KSK ప్రాథమిక సమయం — {ad_lord} AD",
                            "evidence": (
                                f"Upcoming AD lord {ad_lord} ({ad.get('start')} → "
                                f"{ad.get('end')}) IS the sub-lord of a marriage-"
                                f"relevant cusp AND its chain signifies H{sorted(relevant_hits)}. "
                                f"Per KSK Reader marriage chapter, this is the PRIMARY "
                                f"marriage-trigger AD — even if not Venus/Jupiter karaka. "
                                f"Avoids Parashari karaka-bias."
                            ),
                            "evidence_te": (
                                f"రాబోయే AD అధిపతి {ad_lord} వివాహ-సంబంధ భావ సబ్ లార్డ్ "
                                f"+ గొలుసు H{sorted(relevant_hits)} సూచిస్తుంది — KSK "
                                f"ప్రాథమిక వివాహ ట్రిగ్గర్ AD."
                            ),
                            "tone": "gold",
                        })
                        break  # only flag the EARLIEST upcoming KSK-primary AD
        except Exception:
            pass  # don't break engine if dasha compute fails

    return patterns


def _detect_couple_patterns(
    chart1: dict, chart2: dict, kp: dict,
    dba1: dict | None = None, dba2: dict | None = None,
) -> list[dict]:
    """
    PR M3 — Cross-couple patterns (apply to both charts simultaneously).

    Patterns:
      T1 — Joint Period (per-couple): MD+AD lords of BOTH partners
           signify marriage houses {2,7,11} simultaneously. Strongest
           couple-wide YES signal.
      T2 — RP Amplifier (cross-chart): canonical cross-match active per KSK
           Reader IV — partner's RPs signify marriage houses in your chart.
    """
    patterns: list[dict] = []

    # T1 — Joint Period (couple-wide)
    # Use the pre-computed DBA significations (more reliable than
    # re-computing). dba already has md_signifies / ad_signifies.
    if dba1 and dba2:
        p1_md_hits = set(dba1.get("md_signifies", [])) & {2, 7, 11}
        p2_md_hits = set(dba2.get("md_signifies", [])) & {2, 7, 11}
        p1_ad_hits = set(dba1.get("ad_signifies", [])) & {2, 7, 11}
        p2_ad_hits = set(dba2.get("ad_signifies", [])) & {2, 7, 11}
        both_md_align = bool(p1_md_hits and p2_md_hits)
        both_ad_align = bool(p1_ad_hits and p2_ad_hits)
        if both_md_align and both_ad_align:
            patterns.append({
                "id": "T1",
                "name": "Joint Period — both partners' MD+AD signify marriage houses",
                "name_te": "ఉమ్మడి కాలం — ఇద్దరి MD+AD వివాహ భావాలను సూచిస్తాయి",
                "evidence": (
                    f"Person 1 MD {dba1.get('md_lord')}+AD {dba1.get('ad_lord')} "
                    f"signify H{sorted(p1_md_hits | p1_ad_hits)} | "
                    f"Person 2 MD {dba2.get('md_lord')}+AD {dba2.get('ad_lord')} "
                    f"signify H{sorted(p2_md_hits | p2_ad_hits)}. "
                    f"Per KSK Reader V: events fire only at joint periods. Both "
                    f"partners' current dashas aligning on marriage houses is the "
                    f"strongest couple-wide YES signal."
                ),
                "evidence_te": (
                    f"P1 MD+AD ({dba1.get('md_lord')}+{dba1.get('ad_lord')}), "
                    f"P2 MD+AD ({dba2.get('md_lord')}+{dba2.get('ad_lord')}) "
                    f"ఇద్దరూ వివాహ భావాలను సూచిస్తాయి — బలమైన YES."
                ),
                "tone": "gold",
            })
        elif both_md_align:
            patterns.append({
                "id": "T1",
                "name": "Joint Period (partial) — both partners' MD signifies marriage houses",
                "name_te": "ఉమ్మడి కాలం (పాక్షికం) — ఇద్దరి MD వివాహ భావాలను సూచిస్తాయి",
                "evidence": (
                    f"Both MDs align on marriage houses (P1 {dba1.get('md_lord')}, "
                    f"P2 {dba2.get('md_lord')}) but AD layer not yet converged. "
                    f"Couple is in the right MD-era; waiting for the right AD pair."
                ),
                "evidence_te": (
                    f"ఇద్దరి MD వివాహ-అనుకూలం (P1 {dba1.get('md_lord')}, "
                    f"P2 {dba2.get('md_lord')}); సరైన AD జంట కోసం వేచి ఉండండి."
                ),
                "tone": "gold",
            })

    # T2 — RP Amplifier (per canonical cross-match)
    ccm = kp.get("canonical_cross_match", {})
    if ccm.get("a_side_canonical_match") or ccm.get("b_side_canonical_match"):
        patterns.append({
            "id": "T2",
            "name": "RP Amplifier — canonical cross-match active",
            "name_te": "RP వర్ధకం — క్యానానికల్ క్రాస్-మ్యాచ్",
            "evidence": (
                "Each partner's H7/H2/H11 CSLs signify {2,7,11} AND partner's "
                "Ruling Planets also signify {2,7,11} in the other's chart. Per KSK "
                "Reader: RP-confirmed significators carry 2-3× timing weight."
            ),
            "evidence_te": (
                "ప్రతి భాగస్వామి H7/H2/H11 CSL {2,7,11} సూచిస్తుంది + భాగస్వామి "
                "RPs ఇతరి చార్ట్‌లో {2,7,11} సూచిస్తాయి — KSK బలమైన సమయ సంకేతం."
            ),
            "tone": "gold",
        })

    return patterns


def _compute_multi_cusp_tier(chart: dict) -> dict:
    """
    PR M2 — Multi-cusp confirmation TIER 0/1/2/3/-1 per partner.

    Per knowledge/kp_multi_cusp_confirmation.md — KSK gives PROMISE/DENIAL
    via the PRIMARY cusp's sub lord alone. But a 20-year astrologer ALWAYS
    cross-checks: when supporting cusps' sub lords ALSO signify the same
    house group, confidence multiplies.

    For marriage: primary H7 + supporting H2 + H11. Tier ladder:

      TIER 3 — Primary CSL + BOTH supporting CSLs signify {2,7,11} →
               STRONGLY PROMISED, near-certain in right dasha (80-95%)
      TIER 2 — Primary CSL + ONE supporting CSL agrees → STRONGLY
               PROMISED (65-80%)
      TIER 1 — Primary CSL alone signifies → KSK MINIMUM PROMISE (50-65%)
      TIER 0 — Primary signifies, supporting cusps DENY → CONDITIONAL
               with friction (35-50%); apply RULE 11 bhukti precision
      TIER -1 — Primary CSL doesn't signify, supporting do → effects of
                supporting houses without primary fruition (<35%)

    Brings Match into parity with Analysis tab's TIER labeling (RULE 34).

    Returns:
      {
        "tier": -1 | 0 | 1 | 2 | 3,
        "label": str,
        "h7_signifies": bool,
        "h2_supports": bool,
        "h11_supports": bool,
        "supporting_count": int,
        "note": str (one-line astrologer-facing explanation),
        "confidence_band": str (e.g., "80-95%")
      }
    """
    # H7 (primary) — does it signify any of {2,7,11}?
    h7_csl, h7_sigs = _get_cusp_sub_lord_sigs(7, chart)
    h7_signifies = bool(h7_sigs & {2, 7, 11})

    # Supporting cusps
    sup = _supporting_cusps(chart)
    h2_supports = sup["h2_supports"]
    h11_supports = sup["h11_supports"]
    supporting_count = int(h2_supports) + int(h11_supports)

    # Tier classification
    if h7_signifies and supporting_count == 2:
        tier, label, band = 3, "TIER 3 — STRONGLY PROMISED", "80-95%"
        note = (
            f"H7 CSL {h7_csl}, H2 CSL {sup['h2_csl']}, and H11 CSL "
            f"{sup['h11_csl']} all signify the marriage house group "
            f"{{2,7,11}}. All three cusps agree — near-certain in right dasha."
        )
    elif h7_signifies and supporting_count == 1:
        agreeing = "H2 CSL " + sup["h2_csl"] if h2_supports else "H11 CSL " + sup["h11_csl"]
        tier, label, band = 2, "TIER 2 — STRONGLY PROMISED", "65-80%"
        note = (
            f"H7 CSL {h7_csl} + {agreeing} both signify {{2,7,11}}. "
            f"Double confirmation; only one supporting cusp not echoing."
        )
    elif h7_signifies and supporting_count == 0:
        tier, label, band = 1, "TIER 1 — KSK MINIMUM PROMISE", "50-65%"
        note = (
            f"H7 CSL {h7_csl} signifies {{2,7,11}} (KSK minimum gate). "
            f"H2 CSL {sup['h2_csl']} and H11 CSL {sup['h11_csl']} don't "
            f"echo — promise present, no extra confirmation."
        )
    elif h7_signifies and supporting_count == 2 and False:
        # placeholder unreachable
        tier, label, band = 0, "TIER 0", "35-50%"
        note = "(unreachable)"
    elif not h7_signifies and supporting_count >= 1:
        tier, label, band = -1, "TIER -1 — Effects of supporting houses only", "<35%"
        note = (
            f"H7 CSL {h7_csl} doesn't signify the marriage gate, but "
            f"{'H2' if h2_supports else ''}{' + ' if h2_supports and h11_supports else ''}"
            f"{'H11' if h11_supports else ''} support is present — "
            f"effects of supporting houses (family/gain) may manifest "
            f"WITHOUT conventional marriage fruition."
        )
    elif not h7_signifies and supporting_count == 0:
        # Both primary fail and supporting fail — rare; could still be
        # CONDITIONAL if there's denial overlap, but call it TIER 0.
        tier, label, band = 0, "TIER 0 — CONDITIONAL with friction", "35-50%"
        note = (
            f"H7 CSL {h7_csl} doesn't signify {{2,7,11}} cleanly and "
            f"supporting cusps don't compensate. Apply KSK strict bhukti "
            f"rule (RULE 11) — event fires only in bhuktis of relevant-"
            f"house significators."
        )
    else:
        # h7_signifies but supporting are MIXED (one supports, but ALSO denial)
        # The current _supporting_cusps doesn't expose denial; reserved for future.
        tier, label, band = 0, "TIER 0 — CONDITIONAL with friction", "35-50%"
        note = (
            f"H7 CSL {h7_csl} signifies {{2,7,11}} but supporting cusps "
            f"show mixed/denial signals. Apply KSK strict bhukti rule."
        )

    return {
        "tier": tier,
        "label": label,
        "h7_csl": h7_csl,
        "h7_signifies": h7_signifies,
        "h2_csl": sup["h2_csl"],
        "h2_supports": h2_supports,
        "h11_csl": sup["h11_csl"],
        "h11_supports": h11_supports,
        "supporting_count": supporting_count,
        "note": note,
        "confidence_band": band,
    }


def _dasha_overlap_check(chart1_data: dict, chart2_data: dict, chart1: dict, chart2: dict) -> dict:
    """
    Check if both persons' current dasha periods are favorable for marriage.
    Returns info on whether their active periods align for marriage timing.
    Note: chart1_data is the raw person dict, chart is the computed chart dict.
    """
    try:
        # We look at what's in workspace data (current dasha if available)
        # Since we only have natal data here, we compute a simple check:
        # Are the current dasha lords (if knowable) favorable?
        # Proxy: do the Ruling Planets of each chart share common significators?
        rp1 = _ruling_planets(chart1)
        rp2 = _ruling_planets(chart2)

        sigs1 = _marriage_significators(chart1)
        sigs2 = _marriage_significators(chart2)

        # Cross-resonance: how many shared significators appear in both RP sets?
        shared_sigs = sigs1 & sigs2
        common_rp = rp1 & rp2

        # Planets that are significators in both charts AND in both ruling planets
        strong_timing = shared_sigs & common_rp

        if strong_timing:
            timing_verdict = "Aligned"
            timing_note = f"Planets {sorted(strong_timing)} are marriage significators in BOTH charts AND Ruling Planets of both — strong timing alignment."
        elif shared_sigs:
            timing_verdict = "Partial"
            timing_note = f"Shared significators {sorted(shared_sigs)} exist but not confirmed by both RPs."
        elif common_rp:
            timing_verdict = "Partial"
            timing_note = f"Both charts share RPs {sorted(common_rp)} — timing may align but significators differ."
        else:
            timing_verdict = "Misaligned"
            timing_note = "No common significators or Ruling Planets — timing may not align currently."

        return {
            "timing_verdict": timing_verdict,
            "timing_note": timing_note,
            "shared_significators": sorted(shared_sigs),
            "common_ruling_planets": sorted(common_rp),
            "strong_timing_planets": sorted(strong_timing),
        }
    except Exception:
        return {"timing_verdict": "Unknown", "timing_note": "Could not compute timing alignment."}


# ── KP Compatibility ──────────────────────────────────────────

def _canonical_cross_match(chart_a: dict, chart_b: dict) -> dict:
    """
    Canonical KP two-chart matching rule — PR A1.4.

    Source: kpastrologylearning.com Rule 5 (KSK Reader IV):
    "Both persons' 7th cusp sub lords AND the other's ruling planets
    should signify 2, 7, and 11 for harmonious union."

    Concretely, for chart A:
      Q1: Does A's H7 CSL signify {2, 7, 11}?  (own promise)
      Q2: Do B's 7-slot RPs signify {2, 7, 11} in A's chart?
          (i.e. do those B-RP planets, when read as significators
           IN A's chart, hit A's marriage houses?)

    And the mirror for chart B (Q3, Q4).

    The "Both will marry" rule (per the same source): "If at least 2
    ruling planets match with 2 out of 3 sub lords of {2,7,11} cusps
    and Vimsottari dasas are favorable for both" → marriage promised.

    Pre-A1.4: a generic intersection of "A's marriage significators ∩
    B's 4-slot RPs" was used — that is too loose (5-8 sigs × 4 RPs ≈
    always ≥ 3 hits regardless of actual compatibility).
    """
    target_houses = MARRIAGE_PROMISE_HOUSES

    # Q1 — A's H7/H2/H11 CSLs
    a_csls = []
    for h in (2, 7, 11):
        csl, sigs = _get_cusp_sub_lord_sigs(h, chart_a)
        a_csls.append({"cusp": h, "csl": csl, "sigs": sorted(sigs),
                       "signifies_target": bool(sigs & target_houses)})
    a_own_promise = sum(1 for c in a_csls if c["signifies_target"])

    # Q2 — does each B-RP, READ IN A's chart, signify A's marriage houses?
    b_rps = _ruling_planets_full(chart_b)["ruling_planets"]
    b_rp_in_a_marriage = []
    for rp in b_rps:
        if rp in chart_a["planets"]:
            sigs_in_a = _planet_significations(rp, chart_a["planets"], chart_a["cusp_lons"])
            if sigs_in_a & target_houses:
                b_rp_in_a_marriage.append({"planet": rp, "sigs": sorted(sigs_in_a & target_houses)})

    # Mirror: Q3, Q4 — B side
    b_csls = []
    for h in (2, 7, 11):
        csl, sigs = _get_cusp_sub_lord_sigs(h, chart_b)
        b_csls.append({"cusp": h, "csl": csl, "sigs": sorted(sigs),
                       "signifies_target": bool(sigs & target_houses)})
    b_own_promise = sum(1 for c in b_csls if c["signifies_target"])

    a_rps = _ruling_planets_full(chart_a)["ruling_planets"]
    a_rp_in_b_marriage = []
    for rp in a_rps:
        if rp in chart_b["planets"]:
            sigs_in_b = _planet_significations(rp, chart_b["planets"], chart_b["cusp_lons"])
            if sigs_in_b & target_houses:
                a_rp_in_b_marriage.append({"planet": rp, "sigs": sorted(sigs_in_b & target_houses)})

    # Canonical match strength — each side requires:
    #   own H7 CSL signifies {2,7,11} (at least 1 of 3 marriage cusps) AND
    #   partner's RPs hit own marriage houses (≥ 2 such RPs)
    a_side_ok = (a_own_promise >= 1) and (len(b_rp_in_a_marriage) >= 2)
    b_side_ok = (b_own_promise >= 1) and (len(a_rp_in_b_marriage) >= 2)

    # Strict canonical: both sides OK (Rule 5 full form)
    both_sides_ok = a_side_ok and b_side_ok
    # Looser asymmetric: one side fully OK
    one_side_ok = a_side_ok or b_side_ok

    return {
        "a_csl_h2_7_11": a_csls,
        "b_csl_h2_7_11": b_csls,
        "a_own_promise_count": a_own_promise,
        "b_own_promise_count": b_own_promise,
        "b_rps_signifying_a_marriage": b_rp_in_a_marriage,
        "a_rps_signifying_b_marriage": a_rp_in_b_marriage,
        "a_side_canonical_match": a_side_ok,
        "b_side_canonical_match": b_side_ok,
        "both_sides_canonical_match": both_sides_ok,
        "one_side_canonical_match": one_side_ok,
    }


def _kp_compatibility(chart1: dict, chart2: dict) -> dict:
    """
    KP two-chart compatibility verdict — PR A1.4 strict rebuild.

    Key changes vs pre-A1.4:
      - Promise tiered Full/Partial/Weak/None — strict {2 AND 7 AND 11}
      - VENUS OVERRIDE REMOVED (KSK explicit: Venus is context, not override)
      - Canonical 4-way cross-match (kpastrologylearning.com Rule 5)
      - Verdict capped by individual promise tier on BOTH sides
      - Loose resonance metric demoted to supplementary info
    """
    promise1 = _h7_sublord_promise(chart1)
    promise2 = _h7_sublord_promise(chart2)

    # Venus karaka analysis — kept for QUALITY notes, NOT for verdict override.
    venus1 = _venus_analysis(chart1)
    venus2 = _venus_analysis(chart2)

    # Supporting cusps (H2 CSL, H11 CSL) for both charts
    support1 = _supporting_cusps(chart1)
    support2 = _supporting_cusps(chart2)

    # Canonical KSK Reader IV / kpastrologylearning Rule 5 cross-check.
    canonical = _canonical_cross_match(chart1, chart2)

    # 5-signal type classification per chart
    type1 = _five_signal_classification(chart1)
    type2 = _five_signal_classification(chart2)

    # Significators + RP info (kept for AI worksheet context, NOT for verdict)
    sigs1 = _marriage_significators(chart1)
    sigs2 = _marriage_significators(chart2)
    rp1_full = _ruling_planets_full(chart1)
    rp2_full = _ruling_planets_full(chart2)
    rp1 = set(rp1_full["ruling_planets"])
    rp2 = set(rp2_full["ruling_planets"])

    # Resonance kept for context but NO LONGER drives verdict.
    resonance_1to2 = sorted(sigs1 & rp2)
    resonance_2to1 = sorted(sigs2 & rp1)
    total_resonance = len(set(resonance_1to2) | set(resonance_2to1))

    # Supporting cusp score (H2 + H11 for both charts)
    support_score = sum([
        1 if support1["h2_supports"] else 0,
        1 if support1["h11_supports"] else 0,
        1 if support2["h2_supports"] else 0,
        1 if support2["h11_supports"] else 0,
    ])

    # ── KP Verdict — strict-rule cascade (PR A1.4) ────────────────
    # Tier 1: both Full promise + both supporting cusps + canonical both-sides
    # Tier 2: both Full promise + canonical at least one side
    # Tier 3: both Partial-or-Full + canonical at least one side
    # Tier 4: at least one Full promise + some supporting evidence
    # Tier 5: at least one Partial + some supporting evidence
    # Tier 6: any denial + no countervailing → Caution
    # Tier 7: else → Inconclusive
    p1_tier = promise1["promise_tier"]
    p2_tier = promise2["promise_tier"]
    p1_denial = promise1["has_denial"]
    p2_denial = promise2["has_denial"]
    p1_full = p1_tier == PROMISE_FULL and not p1_denial
    p2_full = p2_tier == PROMISE_FULL and not p2_denial
    p1_partial_or_better = p1_tier in (PROMISE_FULL, PROMISE_PARTIAL) and not p1_denial
    p2_partial_or_better = p2_tier in (PROMISE_FULL, PROMISE_PARTIAL) and not p2_denial

    if p1_full and p2_full and canonical["both_sides_canonical_match"] and support_score >= 3:
        verdict = "Strong Match"
        verdict_reasoning = "Both charts FULL promise + canonical cross-match both sides + strong H2/H11 support."
    elif p1_full and p2_full and canonical["one_side_canonical_match"]:
        verdict = "Good Match"
        verdict_reasoning = "Both charts FULL promise + canonical cross-match at least one side."
    elif p1_partial_or_better and p2_partial_or_better and canonical["both_sides_canonical_match"]:
        verdict = "Good Match"
        verdict_reasoning = "Both charts ≥ Partial promise + canonical cross-match both sides."
    elif p1_partial_or_better and p2_partial_or_better and canonical["one_side_canonical_match"]:
        verdict = "Conditional"
        verdict_reasoning = "Both charts ≥ Partial promise + canonical cross-match one side only."
    elif (p1_partial_or_better or p2_partial_or_better) and canonical["one_side_canonical_match"]:
        verdict = "Conditional - weak"
        verdict_reasoning = "Only one chart promises, only one side canonical match. Marriage possible but unbalanced."
    elif p1_denial or p2_denial:
        verdict = "Caution"
        # PR A1.6 — softer, more astrologer-friendly wording
        which = ("both charts" if (p1_denial and p2_denial)
                 else ("Person 1's chart" if p1_denial else "Person 2's chart"))
        verdict_reasoning = (
            f"H7 CSL in {which} hits one or more denial houses (1/6/10/12) "
            f"alongside only partial or weak promise on {{2,7,11}}. "
            f"Marriage is structurally CONDITIONAL — it can happen, but only "
            f"in a favorable dasha period where the Ruling Planets activate "
            f"the marriage chain. Without that timing trigger, the chart "
            f"tilts toward delay or unsatisfying outcome. Cross-check with "
            f"the Timing tab for upcoming favorable windows."
        )
    else:
        verdict = "Inconclusive"
        verdict_reasoning = (
            "Neither chart shows clean H7 CSL promise on {2,7,11} AND the "
            "canonical cross-match is weak. The chart signals are mixed — "
            "an astrologer should examine the H7 CSL chain personally and "
            "look at upcoming AD periods that might activate hidden links."
        )

    # Augment promise with the cross-resonance fact (NOT to flip verdict —
    # only to enrich the LLM worksheet).
    h7_lord_both = (promise1.get("h7_lord_supports", False)
                    and promise2.get("h7_lord_supports", False))

    return {
        "chart1_promise": promise1,
        "chart2_promise": promise2,
        "venus_chart1": venus1,
        "venus_chart2": venus2,
        "supporting_cusps_chart1": support1,
        "supporting_cusps_chart2": support2,
        "type_classification_chart1": type1,
        "type_classification_chart2": type2,
        "canonical_cross_match": canonical,
        "significators_chart1": sorted(sigs1),
        "significators_chart2": sorted(sigs2),
        "ruling_planets_chart1": sorted(rp1),
        "ruling_planets_chart2": sorted(rp2),
        "rp_slots_chart1": rp1_full["slot_assignments"],
        "rp_slots_chart2": rp2_full["slot_assignments"],
        "rp_strongest_chart1": rp1_full["strongest"],
        "rp_strongest_chart2": rp2_full["strongest"],
        "resonance_1_to_2": resonance_1to2,
        "resonance_2_to_1": resonance_2to1,
        "total_resonance_count": total_resonance,
        "h7_lord_both_support": h7_lord_both,
        "support_score": support_score,
        "kp_verdict": verdict,
        "kp_verdict_reasoning": verdict_reasoning,
    }


# ── Ashtakoota calculations ───────────────────────────────────

def _calc_varna(chart_boy: dict, chart_girl: dict) -> dict:
    boy_varna = SIGN_VARNA.get(chart_boy["moon_sign"], "Shudra")
    girl_varna = SIGN_VARNA.get(chart_girl["moon_sign"], "Shudra")
    score = 1 if VARNA_RANK.get(boy_varna, 1) >= VARNA_RANK.get(girl_varna, 1) else 0
    return {"kuta": "Varna", "max": 1, "score": score, "boy": boy_varna, "girl": girl_varna,
            "note": "Boy's varna must be equal or higher than girl's"}


def _calc_vasya(chart_boy: dict, chart_girl: dict) -> dict:
    bs = chart_boy["moon_sign"]
    gs = chart_girl["moon_sign"]
    boy_controls_girl = gs in VASYA_MAP.get(bs, [])
    girl_controls_boy = bs in VASYA_MAP.get(gs, [])
    if boy_controls_girl and girl_controls_boy:
        score = 2
        note = "Mutual vasya — excellent"
    elif boy_controls_girl or girl_controls_boy:
        score = 1
        note = "One-way vasya — good"
    else:
        score = 0
        note = "No vasya relationship"
    return {"kuta": "Vasya", "max": 2, "score": score, "boy_sign": bs, "girl_sign": gs, "note": note}


def _calc_tara(chart_boy: dict, chart_girl: dict) -> dict:
    """
    Tara Kuta — PR A1.4 SMOKING-GUN FIX.

    The pre-A1.4 code had the auspicious set INVERTED:
       auspicious = {1, 3, 5, 7}   (wrong — these are the worst three!)

    Per Brihat Parashara + Tara ladder (externally confirmed against
    AstroSight, FutureScope Astrology, Astroyogi, Vedik Astrologer,
    AstrologyFutureEye, AstrologerPanditJi — unanimous):

      Remainder  Tara name        Nature
      1          Janma            conditionally auspicious (half credit)
      2          Sampat           AUSPICIOUS (Wealth)
      3          Vipat            INAUSPICIOUS (Danger)
      4          Kshema           AUSPICIOUS (Prosperity)
      5          Pratyari         INAUSPICIOUS (Obstacle)
      6          Sadhaka          AUSPICIOUS (Achievement)
      7          Vadha            INAUSPICIOUS (Slaughter)
      8          Mitra            AUSPICIOUS (Friend)
      0 (=9)     Ati Mitra        AUSPICIOUS (Great Friend)

    Auspicious set: {2, 4, 6, 8, 0}.
    Inauspicious set: {3, 5, 7}.
    Janma (1) is borderline — we give half credit (0.75 of full direction).

    This single fix moves many "Compatible" → "Conditionally Compatible".
    """
    naks = NAKSHATRA_ORDER
    girl_nak = chart_girl["moon_nakshatra"]
    boy_nak = chart_boy["moon_nakshatra"]
    if girl_nak not in naks or boy_nak not in naks:
        return {"kuta": "Tara", "max": 3, "score": 0,
                "girl_nakshatra": girl_nak, "boy_nakshatra": boy_nak,
                "tara_girl_to_boy": "?", "tara_boy_to_girl": "?",
                "note": "Nakshatra lookup failed"}

    TARA_NAMES = {
        1: "Janma", 2: "Sampat", 3: "Vipat", 4: "Kshema", 5: "Pratyari",
        6: "Sadhaka", 7: "Vadha", 8: "Mitra", 0: "Ati Mitra",
    }
    AUSPICIOUS_TARAS = {2, 4, 6, 8, 0}        # full credit
    HALF_CREDIT_TARAS = {1}                    # Janma — borderline
    INAUSPICIOUS_TARAS = {3, 5, 7}             # Vipat, Pratyari, Vadha

    g_idx = naks.index(girl_nak)
    b_idx = naks.index(boy_nak)
    # KP convention: count is inclusive of both endpoints.
    count_gb = ((b_idx - g_idx) % 27) + 1     # from girl's janma to boy's
    count_bg = ((g_idx - b_idx) % 27) + 1     # from boy's janma to girl's
    r_gb = count_gb % 9
    r_bg = count_bg % 9

    def _direction_credit(r):
        if r in AUSPICIOUS_TARAS:
            return 1.5                          # full half of 3 points
        if r in HALF_CREDIT_TARAS:
            return 0.75                         # Janma half
        return 0.0                              # 3 / 5 / 7

    score = _direction_credit(r_gb) + _direction_credit(r_bg)
    note_parts = [
        f"Girl→Boy: {TARA_NAMES.get(r_gb, '?')} ({r_gb})",
        f"Boy→Girl: {TARA_NAMES.get(r_bg, '?')} ({r_bg})",
    ]
    return {
        "kuta": "Tara", "max": 3, "score": round(score, 2),
        "girl_nakshatra": girl_nak, "boy_nakshatra": boy_nak,
        "tara_girl_to_boy": TARA_NAMES.get(r_gb, "?"),
        "tara_boy_to_girl": TARA_NAMES.get(r_bg, "?"),
        "remainder_gb": r_gb, "remainder_bg": r_bg,
        "has_dosha": (r_gb in INAUSPICIOUS_TARAS) or (r_bg in INAUSPICIOUS_TARAS),
        "note": " | ".join(note_parts),
    }


def _calc_yoni(chart_boy: dict, chart_girl: dict) -> dict:
    boy_nak = chart_boy["moon_nakshatra"]
    girl_nak = chart_girl["moon_nakshatra"]
    boy_yoni = NAKSHATRA_YONI.get(boy_nak, ("Unknown", "M"))
    girl_yoni = NAKSHATRA_YONI.get(girl_nak, ("Unknown", "F"))
    ba, bs_ = boy_yoni
    ga, gs_ = girl_yoni

    if ba == ga:
        score = 4 if (bs_ != gs_) else 3
        note = "Same yoni — excellent" if bs_ != gs_ else "Same yoni, same sex — good"
    elif frozenset([ba, ga]) in YONI_ENEMIES:
        score = 0
        note = f"Enemy yoni ({ba} vs {ga}) — incompatible"
    elif ba == "Mongoose" or ga == "Mongoose":
        score = 2
        note = "Mongoose yoni — neutral"
    else:
        score = 2
        note = "Compatible yoni"
    return {"kuta": "Yoni", "max": 4, "score": score,
            "boy_yoni": ba, "girl_yoni": ga, "note": note}


def _calc_graha_maitri(chart_boy: dict, chart_girl: dict) -> dict:
    bl = SIGN_LORDS.get(chart_boy["moon_sign"], "Mercury")
    gl = SIGN_LORDS.get(chart_girl["moon_sign"], "Mercury")
    if bl == gl:
        score = 5
        note = "Same sign lord — perfect mental harmony"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("friends", set()) and gl in PLANET_FRIENDS.get(bl, {}).get("friends", set()):
        score = 5
        note = "Mutual friends — excellent"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("friends", set()) or gl in PLANET_FRIENDS.get(bl, {}).get("friends", set()):
        score = 4
        note = "One-way friendship — good"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("neutral", set()) and gl in PLANET_FRIENDS.get(bl, {}).get("neutral", set()):
        score = 3
        note = "Both neutral — average"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("neutral", set()) or gl in PLANET_FRIENDS.get(bl, {}).get("neutral", set()):
        score = 1
        note = "One friendly, one enemy — below average"
    else:
        score = 0
        note = "Mutual enemies — poor mental compatibility"
    return {"kuta": "Graha Maitri", "max": 5, "score": score,
            "boy_lord": bl, "girl_lord": gl, "note": note}


def _calc_gana(chart_boy: dict, chart_girl: dict) -> dict:
    bg = NAKSHATRA_GANA.get(chart_boy["moon_nakshatra"], "Manushya")
    gg = NAKSHATRA_GANA.get(chart_girl["moon_nakshatra"], "Manushya")
    if bg == gg:
        score = 6
        note = f"Same gana ({bg}) — perfect"
    elif (bg == "Deva" and gg == "Manushya") or (bg == "Manushya" and gg == "Deva"):
        score = 5
        note = "Deva-Manushya — compatible"
    elif (bg == "Deva" and gg == "Rakshasa") or (bg == "Rakshasa" and gg == "Deva"):
        score = 1
        note = "Gana dosha — Deva-Rakshasa mismatch"
    else:
        score = 0
        note = "Gana dosha — Manushya-Rakshasa incompatible"
    return {"kuta": "Gana", "max": 6, "score": score,
            "boy_gana": bg, "girl_gana": gg, "note": note,
            "has_dosha": score <= 1}


def _calc_bhakoota(chart_boy: dict, chart_girl: dict) -> dict:
    bs = chart_boy["moon_sign"]
    gs = chart_girl["moon_sign"]
    signs = SIGNS_ORDER
    if bs in signs and gs in signs:
        b_idx = signs.index(bs)
        g_idx = signs.index(gs)
        count_bg = ((b_idx - g_idx) % 12) + 1
        count_gb = ((g_idx - b_idx) % 12) + 1
        dosha_pairs = [{2, 12}, {6, 8}, {5, 9}]
        rel = frozenset([count_bg, count_gb])
        has_dosha = any(rel == pair for pair in dosha_pairs)
        if has_dosha:
            score = 0
            if rel == frozenset([6, 8]) or {6, 8} == rel:
                note = "Shadashtak (6-8) dosha — very serious"
            elif rel == frozenset([2, 12]):
                note = "2-12 dosha — financial and separation concerns"
            else:
                note = "5-9 dosha — child-related concerns"
        else:
            score = 7
            note = f"No Bhakoota dosha — {count_bg}-{count_gb} relationship"
    else:
        score = 7
        has_dosha = False
        note = "Could not calculate"
    return {"kuta": "Bhakoota", "max": 7, "score": score,
            "boy_sign": bs, "girl_sign": gs, "has_dosha": has_dosha, "note": note}


def _calc_nadi(chart_boy: dict, chart_girl: dict) -> dict:
    bn = NAKSHATRA_NADI.get(chart_boy["moon_nakshatra"], "")
    gn = NAKSHATRA_NADI.get(chart_girl["moon_nakshatra"], "")
    if not bn or not gn:
        score = 8
        has_dosha = False
        note = "Could not calculate"
    elif bn == gn:
        score = 0
        has_dosha = True
        note = f"Nadi dosha — both {bn} nadi. Serious health/progeny concern."
    else:
        score = 8
        has_dosha = False
        note = f"{bn} + {gn} nadi — excellent compatibility"
    return {"kuta": "Nadi", "max": 8, "score": score,
            "boy_nadi": bn, "girl_nadi": gn, "has_dosha": has_dosha, "note": note}


def _marriage_quality_outlook(chart: dict) -> dict:
    """
    PR A1.6 — "If marriage happens, will it last and be happy?"

    Per astrosanhita.com + KSK Reader IV Chapter on Marital Bliss:
      - 2nd from H7 (= H8) governs sustenance/longevity of marriage
      - 7th lord placement: in {6,8,12} = distance/separation, in
        {1,2,7,11} = stable
      - Saturn/Mars/Rahu/Ketu severely afflicting H7 = friction
      - D9 H7 sign and 7th lord D9 placement cross-check
      - Venus dignity (we have via _venus_analysis) = quality of intimacy

    Returns a structured "outlook" dict the AI + frontend can render.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]

    # H8 = 2nd from H7 — sustenance of marriage
    h8_csl = get_sub_lord(cusp_lons[7] % 360)
    h8_sigs = _planet_significations(h8_csl, planets, cusp_lons)
    h8_supports = bool(h8_sigs & {2, 7, 11})   # H8 chain hitting marriage triplet = good
    h8_corrupts = bool(h8_sigs & {6, 12})       # H8 chain hitting separation = bad
    h8_occupants = [p for p in planets
                    if _get_planet_house(planets[p]["longitude"], cusp_lons) == 8]
    h8_has_malefic = any(p in ("Saturn", "Mars", "Rahu", "Ketu") for p in h8_occupants)

    # 7th lord placement
    h7_lon = cusp_lons[6] % 360
    h7_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    h7_lord_house = 0
    h7_lord_in_dussthana = False
    h7_lord_in_kendra_trine = False
    if h7_lord and h7_lord in planets:
        h7_lord_house = _get_planet_house(planets[h7_lord]["longitude"], cusp_lons)
        h7_lord_in_dussthana = h7_lord_house in {6, 8, 12}
        h7_lord_in_kendra_trine = h7_lord_house in {1, 4, 5, 7, 9, 10}

    # Malefic affliction to H7 — occupants + 7th aspect
    h7_occupants = [p for p in planets
                    if _get_planet_house(planets[p]["longitude"], cusp_lons) == 7]
    h7_malefic_occupants = [p for p in h7_occupants
                            if p in ("Saturn", "Mars", "Rahu", "Ketu")]
    h7_benefic_occupants = [p for p in h7_occupants
                            if p in ("Jupiter", "Venus", "Mercury", "Moon")]

    # Score (0-10 scale) — positive factors + negative factors
    score = 5  # neutral baseline
    pluses = []
    minuses = []
    if h8_supports:
        score += 1
        pluses.append(f"H8 CSL {h8_csl} signifies marriage houses — supports longevity")
    if h7_lord_in_kendra_trine:
        score += 1.5
        pluses.append(f"7th lord {h7_lord} in H{h7_lord_house} (kendra/trine) — stable partnership")
    if h7_benefic_occupants and not h7_malefic_occupants:
        score += 1.5
        pluses.append(f"H7 occupied by benefic {', '.join(h7_benefic_occupants)} — harmony")

    if h8_corrupts:
        score -= 1.5
        minuses.append(f"H8 CSL {h8_csl} signifies H6/H12 — separation prone")
    if h8_has_malefic:
        score -= 1
        minuses.append(f"Malefic in H8 ({', '.join([p for p in h8_occupants if p in ('Saturn','Mars','Rahu','Ketu')])}) — sustenance friction")
    if h7_lord_in_dussthana:
        score -= 2
        minuses.append(f"7th lord {h7_lord} in H{h7_lord_house} (dusthana) — distance/separation risk")
    if h7_malefic_occupants:
        score -= 1.5
        minuses.append(f"Malefic{'s' if len(h7_malefic_occupants)>1 else ''} {', '.join(h7_malefic_occupants)} in H7 — friction/quarrels")

    score = max(0, min(10, score))
    if score >= 8:
        outlook = "Excellent — long, harmonious bond"
    elif score >= 6:
        outlook = "Good — steady marriage with normal challenges"
    elif score >= 4:
        outlook = "Mixed — workable with effort, watch friction points"
    elif score >= 2:
        outlook = "Concerning — significant friction or distance likely"
    else:
        outlook = "Severe — sustained happiness at risk"

    return {
        "score": round(score, 1),
        "outlook": outlook,
        "h8_csl": h8_csl,
        "h8_signified_houses": sorted(h8_sigs),
        "h8_supports": h8_supports,
        "h7_lord": h7_lord,
        "h7_lord_house": h7_lord_house,
        "h7_lord_in_dussthana": h7_lord_in_dussthana,
        "h7_malefic_occupants": h7_malefic_occupants,
        "h7_benefic_occupants": h7_benefic_occupants,
        "positives": pluses,
        "negatives": minuses,
    }


def _children_prospects(chart: dict) -> dict:
    """
    PR A1.6 — Children prospects from H5 chain.

    For an astrologer to give an opinion on kids prospects:
      - H5 CSL signifying {2, 5, 11} → kids promised
      - H5 CSL signifying {1, 4, 10} → kids delayed/denied
      - 5th lord placement, Jupiter strength
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    h5_csl = get_sub_lord(cusp_lons[4] % 360)
    h5_sigs = _planet_significations(h5_csl, planets, cusp_lons)
    promise = h5_sigs & {2, 5, 11}
    denial  = h5_sigs & {1, 4, 10, 6, 12}

    fifth_lord = SIGN_LORDS.get(get_sign(cusp_lons[4] % 360), "")
    fifth_lord_house = (_get_planet_house(planets[fifth_lord]["longitude"], cusp_lons)
                        if fifth_lord in planets else 0)
    fifth_lord_strong = fifth_lord_house in {1, 4, 5, 7, 9, 10, 11}

    # Jupiter (karaka of children) house + strength
    jupiter_house = 0
    jupiter_in_dussthana = False
    if "Jupiter" in planets:
        jupiter_house = _get_planet_house(planets["Jupiter"]["longitude"], cusp_lons)
        jupiter_in_dussthana = jupiter_house in {6, 8, 12}

    if len(promise) >= 2 and not denial:
        verdict = "Promised"
    elif len(promise) >= 1 and not jupiter_in_dussthana:
        verdict = "Likely"
    elif denial and not promise:
        verdict = "Difficult / delayed"
    elif jupiter_in_dussthana and not promise:
        verdict = "Difficult — Jupiter afflicted"
    else:
        verdict = "Conditional"

    return {
        "h5_csl": h5_csl,
        "h5_signified_houses": sorted(h5_sigs),
        "promise_hits": sorted(promise),
        "denial_hits": sorted(denial),
        "fifth_lord": fifth_lord,
        "fifth_lord_house": fifth_lord_house,
        "fifth_lord_strong": fifth_lord_strong,
        "jupiter_house": jupiter_house,
        "jupiter_in_dussthana": jupiter_in_dussthana,
        "verdict": verdict,
    }


def _children_match(chart1: dict, chart2: dict, mahendra_score: int) -> dict:
    """
    PR A1.6 — Cross-chart children prospects.
    Both H5 CSLs need to agree; Mahendra Koota strengthens; Jupiter
    karaka must be sane in both.
    """
    c1 = _children_prospects(chart1)
    c2 = _children_prospects(chart2)
    PRO = {"Promised", "Likely"}
    if c1["verdict"] in PRO and c2["verdict"] in PRO and mahendra_score >= 2:
        joint = "Strong — kids well-promised in both charts"
    elif c1["verdict"] in PRO and c2["verdict"] in PRO:
        joint = "Good — both charts support, Mahendra weak"
    elif (c1["verdict"] in PRO) ^ (c2["verdict"] in PRO):
        joint = "Mixed — only one chart promises, other is conditional"
    elif "Difficult" in c1["verdict"] or "Difficult" in c2["verdict"]:
        joint = "Concerning — at least one chart shows obstacles"
    else:
        joint = "Conditional — Jupiter dasha or remedy support advised"
    return {
        "chart1": c1,
        "chart2": c2,
        "joint_verdict": joint,
    }


def _in_laws_concerns(chart: dict, label: str) -> dict:
    """
    PR A1.6 — In-laws / parental health concerns.

    Real-but-marginal classical rule: severe malefic affliction to H4
    (mother) or H9 (father) of either chart can signal stress to parents
    in the post-marriage years. NOT a "marriage causes death" rule —
    that's folk overstatement. Flag only when affliction stacks:
      - Saturn/Mars/Rahu/Ketu IN H4 or H9
      - AND H4 / H9 CSL signifying {6, 8, 12}
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    concerns = []

    for parent_label, house in (("Mother (H4)", 4), ("Father (H9)", 9)):
        # Affliction by malefic occupation
        occupants = [p for p in planets
                     if _get_planet_house(planets[p]["longitude"], cusp_lons) == house]
        malefic_in = [p for p in occupants if p in ("Saturn", "Mars", "Rahu", "Ketu")]
        # CSL signifying obstacle houses
        csl = get_sub_lord(cusp_lons[house - 1] % 360)
        csl_sigs = _planet_significations(csl, planets, cusp_lons)
        csl_bad  = bool(csl_sigs & {6, 8, 12})
        if malefic_in and csl_bad:
            concerns.append(
                f"{label}'s {parent_label} cusp: malefic ({', '.join(malefic_in)}) in house + "
                f"CSL {csl} signifies {sorted(csl_sigs & {6,8,12})} — stress signal"
            )

    return {
        "concerns": concerns,
        "flagged": len(concerns) > 0,
    }


def _upcoming_marriage_windows(person: dict, chart: dict, months_ahead: int = 60) -> dict:
    """
    PR A1.6 — Scan the next `months_ahead` months of AD/PAD ladder and
    flag periods where the AD lord signifies {2, 7, 11}.

    Returns: list of {start, end, ad_lord, pad_lord, signified, score}
    sorted by score descending.
    """
    try:
        moon_lon = chart["moon_lon"]
        dashas = calculate_dashas(person["date"], person["time"], moon_lon,
                                  person.get("timezone_offset", 5.5))
        windows: list[dict] = []
        cutoff = _dt.now()
        horizon = cutoff.replace(year=cutoff.year + (months_ahead // 12))

        # Iterate ADs across the next few MDs that fall within horizon
        for md in dashas:
            md_start = _dt.strptime(md["start"][:10], "%Y-%m-%d") if "start" in md else None
            md_end   = _dt.strptime(md["end"][:10],   "%Y-%m-%d") if "end" in md else None
            if md_end is None or md_end < cutoff:
                continue
            if md_start and md_start > horizon:
                break
            ads = calculate_antardashas(md)
            for ad in ads:
                ad_start = _dt.strptime(ad["start"][:10], "%Y-%m-%d") if "start" in ad else None
                ad_end   = _dt.strptime(ad["end"][:10],   "%Y-%m-%d") if "end" in ad else None
                if ad_end is None or ad_end < cutoff:
                    continue
                if ad_start and ad_start > horizon:
                    break
                ad_lord = ad.get("antardasha_lord", "")
                if not ad_lord:
                    continue
                ad_sigs = _planet_significations(ad_lord, chart["planets"], chart["cusp_lons"])
                hits = ad_sigs & {2, 7, 11}
                neg_hits = ad_sigs & {6, 8, 12}
                score = len(hits) - 0.5 * len(neg_hits)
                if score <= 0:
                    continue
                windows.append({
                    "start":     ad.get("start", "")[:10],
                    "end":       ad.get("end", "")[:10],
                    "md_lord":   md.get("lord", ""),
                    "ad_lord":   ad_lord,
                    "signified": sorted(ad_sigs),
                    "promise_hits": sorted(hits),
                    "denial_hits": sorted(neg_hits),
                    "score": round(score, 1),
                })
        # Sort by score desc, then by start date asc
        windows.sort(key=lambda w: (-w["score"], w["start"]))
        return {
            "windows": windows[:8],   # top 8 windows
            "total_found": len(windows),
            "horizon_months": months_ahead,
        }
    except Exception as e:
        return {"windows": [], "total_found": 0, "error": str(e)}


def _shared_marriage_windows(person1: dict, person2: dict,
                             chart1: dict, chart2: dict,
                             months_ahead: int = 60) -> dict:
    """
    PR A1.6 — Find calendar months where BOTH partners have a favorable
    AD active. The intersection windows are the strongest wedding dates.
    """
    w1 = _upcoming_marriage_windows(person1, chart1, months_ahead)
    w2 = _upcoming_marriage_windows(person2, chart2, months_ahead)

    def _to_dt(s):
        try: return _dt.strptime(s[:10], "%Y-%m-%d")
        except: return None

    overlaps = []
    for a in w1["windows"]:
        as_ = _to_dt(a["start"]); ae = _to_dt(a["end"])
        if not as_ or not ae: continue
        for b in w2["windows"]:
            bs = _to_dt(b["start"]); be = _to_dt(b["end"])
            if not bs or not be: continue
            # Overlap interval
            ov_s = max(as_, bs)
            ov_e = min(ae, be)
            if ov_s >= ov_e:
                continue
            duration_days = (ov_e - ov_s).days
            if duration_days < 7:    # ignore micro-overlaps
                continue
            overlaps.append({
                "start": ov_s.strftime("%Y-%m-%d"),
                "end":   ov_e.strftime("%Y-%m-%d"),
                "duration_days": duration_days,
                "person1_ad": a["ad_lord"],
                "person2_ad": b["ad_lord"],
                "person1_score": a["score"],
                "person2_score": b["score"],
                "combined_score": round(a["score"] + b["score"], 1),
            })
    overlaps.sort(key=lambda o: (-o["combined_score"], o["start"]))
    return {
        "person1_windows": w1["windows"],
        "person2_windows": w2["windows"],
        "overlap_windows": overlaps[:6],
        "horizon_months": months_ahead,
    }


def _calc_mahendra(chart_boy: dict, chart_girl: dict) -> dict:
    """
    Mahendra Koota — South Indian Dashakoota.
    Auspicious if bride's nakshatra is at {4,7,10,13,16,19,22,25} from
    groom's nakshatra (1-indexed, inclusive of both endpoints).
    Score: 2 if auspicious, else 0.
    """
    naks = NAKSHATRA_ORDER
    boy_nak = chart_boy["moon_nakshatra"]
    girl_nak = chart_girl["moon_nakshatra"]
    if boy_nak not in naks or girl_nak not in naks:
        return {"kuta": "Mahendra", "max": 2, "score": 0,
                "boy_nakshatra": boy_nak, "girl_nakshatra": girl_nak,
                "offset": None, "note": "Nakshatra lookup failed"}
    b_idx = naks.index(boy_nak)
    g_idx = naks.index(girl_nak)
    offset = ((g_idx - b_idx) % 27) + 1
    auspicious = offset in MAHENDRA_AUSPICIOUS_OFFSETS
    return {
        "kuta": "Mahendra", "max": 2,
        "score": 2 if auspicious else 0,
        "boy_nakshatra": boy_nak, "girl_nakshatra": girl_nak,
        "offset": offset,
        "auspicious": auspicious,
        "note": (f"Girl is {offset}th from Boy — auspicious for progeny/happiness"
                 if auspicious else
                 f"Girl is {offset}th from Boy — not in {{4,7,10,13,16,19,22,25}}"),
    }


def _calc_stree_deergha(chart_boy: dict, chart_girl: dict) -> dict:
    """
    Stree Deergha Koota — South Indian Dashakoota.
    Counting forward from girl's nakshatra, if boy's nakshatra is more
    than 13 positions away → auspicious (wife's longevity + prosperity).
    Score: 2 if > 13, else 0.
    """
    naks = NAKSHATRA_ORDER
    boy_nak = chart_boy["moon_nakshatra"]
    girl_nak = chart_girl["moon_nakshatra"]
    if boy_nak not in naks or girl_nak not in naks:
        return {"kuta": "Stree Deergha", "max": 2, "score": 0,
                "boy_nakshatra": boy_nak, "girl_nakshatra": girl_nak,
                "offset": None, "note": "Nakshatra lookup failed"}
    b_idx = naks.index(boy_nak)
    g_idx = naks.index(girl_nak)
    offset = ((b_idx - g_idx) % 27) + 1   # count from girl to boy inclusive
    auspicious = offset > 13
    return {
        "kuta": "Stree Deergha", "max": 2,
        "score": 2 if auspicious else 0,
        "boy_nakshatra": boy_nak, "girl_nakshatra": girl_nak,
        "offset": offset,
        "auspicious": auspicious,
        "note": (f"Boy is {offset}th from Girl (>13) — wife's longevity + prosperity blessed"
                 if auspicious else
                 f"Boy is only {offset}th from Girl (≤13) — Stree Deergha not formed"),
    }


def _calc_rajju(chart_boy: dict, chart_girl: dict) -> dict:
    """
    Rajju Koota — South Indian Dashakoota.
    Same body-region group = 0 (severe longevity concern); different = 5.
    Five groups: Paada/Kati/Naabhi/Kantha/Shiro.
    """
    boy_nak = chart_boy["moon_nakshatra"]
    girl_nak = chart_girl["moon_nakshatra"]
    boy_rajju  = RAJJU_MAP.get(boy_nak, "")
    girl_rajju = RAJJU_MAP.get(girl_nak, "")
    if not boy_rajju or not girl_rajju:
        return {"kuta": "Rajju", "max": 5, "score": 5,
                "boy_rajju": boy_rajju, "girl_rajju": girl_rajju,
                "has_dosha": False, "note": "Rajju lookup failed — assumed neutral"}
    same_region = boy_rajju == girl_rajju
    return {
        "kuta": "Rajju", "max": 5,
        "score": 0 if same_region else 5,
        "boy_rajju": boy_rajju, "girl_rajju": girl_rajju,
        "has_dosha": same_region,
        "note": (f"Both in {boy_rajju} Rajju — same body region = longevity concern"
                 if same_region else
                 f"{boy_rajju} & {girl_rajju} — different regions, good bond strength"),
    }


def _extended_koots(chart_boy: dict, chart_girl: dict) -> dict:
    """
    PR A1.5 — South Indian Dashakoota extensions.
    Returns the 3 additional koots that real KP/Telugu/Tamil practitioners
    glance at beyond the 8 Ashtakoota: Mahendra, Stree Deergha, Rajju.
    """
    mahendra = _calc_mahendra(chart_boy, chart_girl)
    stree    = _calc_stree_deergha(chart_boy, chart_girl)
    rajju    = _calc_rajju(chart_boy, chart_girl)
    koots = [mahendra, stree, rajju]
    total = sum(k["score"] for k in koots)
    max_total = sum(k["max"] for k in koots)
    has_dosha = any(k.get("has_dosha") for k in koots)
    return {
        "koots": koots,
        "mahendra": mahendra,
        "stree_deergha": stree,
        "rajju": rajju,
        "total_score": total,
        "max_score": max_total,
        "has_rajju_dosha": rajju.get("has_dosha", False),
        "verdict": (
            "Excellent (longevity blessed)" if total >= 8
            else "Good"                       if total >= 6
            else "Average"                    if total >= 4
            else "Concerning (longevity warning)"
        ),
    }


def _vargottama_check(chart: dict) -> dict:
    """
    PR A1.5 — Vargottama flag for marriage karakas.

    A planet is Vargottama if it occupies the SAME SIGN in both the
    Rasi (D1) and Navamsa (D9). Per vedicknowledge.in + vaya.so:
      - Vargottama Venus → loving, harmonious, devoted-spouse marriage
      - Vargottama 7th Lord → marriage partner exactly as natally indicated
      - Both → highest-quality marriage promise

    Pre-A1.5 computed D9 signs but didn't flag Vargottama. This is
    high-value low-cost.
    """
    planets = chart["planets"]
    if "Venus" not in planets:
        return {"venus_vargottama": False, "seventh_lord_vargottama": False}

    venus_lon = planets["Venus"]["longitude"]
    venus_d1_sign = get_sign(venus_lon % 360)
    venus_d9_sign = _d9_sign(venus_lon)
    venus_varg = (venus_d1_sign == venus_d9_sign)

    h7_lon = chart["cusp_lons"][6] % 360
    h7_sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    seventh_varg = False
    seventh_d1 = ""
    seventh_d9 = ""
    if h7_sign_lord and h7_sign_lord in planets:
        seventh_lon = planets[h7_sign_lord]["longitude"]
        seventh_d1 = get_sign(seventh_lon % 360)
        seventh_d9 = _d9_sign(seventh_lon)
        seventh_varg = (seventh_d1 == seventh_d9)

    return {
        "venus_vargottama": venus_varg,
        "venus_d1_sign": venus_d1_sign,
        "venus_d9_sign": venus_d9_sign,
        "seventh_lord": h7_sign_lord,
        "seventh_lord_vargottama": seventh_varg,
        "seventh_lord_d1_sign": seventh_d1,
        "seventh_lord_d9_sign": seventh_d9,
        "both_vargottama": venus_varg and seventh_varg,
        "note": (
            "Both Venus AND 7th Lord Vargottama — highest-quality marriage signal" if venus_varg and seventh_varg
            else "Venus Vargottama — loving, devoted-spouse marriage signal"        if venus_varg
            else "7th Lord Vargottama — marriage partner exactly as natally indicated" if seventh_varg
            else "No Vargottama on marriage karakas"
        ),
    }


def _no_desire_for_marriage(chart: dict) -> dict:
    """
    PR A1.5 — KP "Daridra-style" no-desire-for-marriage check.

    Per kpastrology.astrosage.com / KP Reader IV:
      - Ketu and Venus both signifying houses in {1, 4, 6, 10, 12}
        → native may lack desire for marriage
      - Venus and Saturn combined (conjunction within 12° OR mutual aspect)
        → ascetic tendency, marriage indifference

    These are CAUTIONARY flags, not denials. They explain WHY a chart
    with weak H7 CSL may not even pursue marriage.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    indifference_set = {1, 4, 6, 10, 12}

    ketu_venus_indifferent = False
    if "Ketu" in planets and "Venus" in planets:
        ketu_sigs  = _planet_significations("Ketu", planets, cusp_lons)
        venus_sigs = _planet_significations("Venus", planets, cusp_lons)
        if (ketu_sigs & indifference_set) and (venus_sigs & indifference_set):
            ketu_venus_indifferent = True

    venus_saturn_combined = False
    if "Venus" in planets and "Saturn" in planets:
        v_lon = planets["Venus"]["longitude"] % 360
        s_lon = planets["Saturn"]["longitude"] % 360
        sep = abs((v_lon - s_lon + 180) % 360 - 180)
        if sep <= 12:
            venus_saturn_combined = True

    flagged = ketu_venus_indifferent or venus_saturn_combined
    notes = []
    if ketu_venus_indifferent:
        notes.append("Ketu + Venus jointly signify {1,4,6,10,12} — ascetic / indifference signal")
    if venus_saturn_combined:
        notes.append("Venus & Saturn within 12° — marriage indifference tendency")

    return {
        "flagged": flagged,
        "ketu_venus_indifferent": ketu_venus_indifferent,
        "venus_saturn_combined": venus_saturn_combined,
        "notes": notes,
    }


def _ashtakoota(chart_boy: dict, chart_girl: dict) -> dict:
    kutas = [
        _calc_varna(chart_boy, chart_girl),
        _calc_vasya(chart_boy, chart_girl),
        _calc_tara(chart_boy, chart_girl),
        _calc_yoni(chart_boy, chart_girl),
        _calc_graha_maitri(chart_boy, chart_girl),
        _calc_gana(chart_boy, chart_girl),
        _calc_bhakoota(chart_boy, chart_girl),
        _calc_nadi(chart_boy, chart_girl),
    ]
    total = sum(k["score"] for k in kutas)
    max_total = sum(k["max"] for k in kutas)
    percentage = round(total / max_total * 100, 1)

    if total >= 28:
        verdict = "Excellent"
    elif total >= 21:
        verdict = "Good"
    elif total >= 18:
        verdict = "Average"
    else:
        verdict = "Below Average"

    critical_doshas = [k for k in kutas if k.get("has_dosha")]

    return {
        "kutas": kutas,
        "total_score": total,
        "max_score": max_total,
        "percentage": percentage,
        "verdict": verdict,
        "critical_doshas": [k["kuta"] for k in critical_doshas],
    }


# ──────────────────────────────────────────────────────────────
# PR M1.2 — Pattern D2 (engagement-broken / wedding-cancelled) detector
# ──────────────────────────────────────────────────────────────

def _pattern_d2_for_h7(chart: dict) -> dict | None:
    """
    Detect Pattern D2 (offer-then-withdrawn / engagement-broken /
    wedding-cancelled-at-last-minute) for the H7 marriage gate.

    Per pattern_library.md Pattern D2 + kp_csl_theory.txt: when CSL chain
    Steps 1-3 PROMISE (signify {2,7,11}) but Step 4 (star lord of CSL's
    sub lord — the FINAL DECIDER) signifies ONLY denial houses ({1,6,10,12}),
    the matter fires then withdraws at the final stage.

    In match context this manifests as:
      - Engagement fixed → broken before wedding
      - Wedding date set → cancelled at last moment
      - Offer made → reneged
      - Multiple near-misses before a closing match

    Returns warning dict if pattern firing, None otherwise.

    Requires M1.1 (canonical Step 4 in _planet_significations) to work.
    """
    h7_sl = chart.get("h7_sub_lord", "")
    if not h7_sl:
        return None
    chain = _planet_significations_with_step4(h7_sl, chart["planets"], chart["cusp_lons"])
    relevant = MARRIAGE_PROMISE_HOUSES
    denial = MARRIAGE_DENIAL_HOUSES

    steps_1_3 = chain["steps_1_3"]
    step_4 = chain["step_4"]
    step_4_planet = chain["step_4_planet"]

    promise_in_123 = bool(steps_1_3 & relevant)
    step4_denial_only = bool(step_4) and step_4.issubset(denial)
    step4_no_relevant = not bool(step_4 & relevant)

    if promise_in_123 and step4_denial_only and step4_no_relevant:
        return {
            "severity": "STRONG",
            "h7_csl": h7_sl,
            "step_4_planet": step_4_planet,
            "steps_1_3_relevant_hit": sorted(steps_1_3 & relevant),
            "step_4_denial_hit": sorted(step_4 & denial),
            "warning": (
                f"Pattern D2 STRONG: H7 CSL chain (Steps 1-3 via {h7_sl}) "
                f"promises marriage via houses {sorted(steps_1_3 & relevant)}, "
                f"BUT Step 4 ({step_4_planet}) signifies ONLY denial houses "
                f"{sorted(step_4 & denial)} with no relevant overlap. "
                f"This is the canonical engagement-broken / wedding-cancelled-"
                f"at-last-stage signature. Real-life: multiple near-misses "
                f"before a closing match; for THIS specific partner, "
                f"finalisation is structurally at risk even if everything looks "
                f"good through engagement stage."
            ),
        }

    # Softer variant — Step 4 has both relevant + denial
    step4_has_denial = bool(step_4 & denial)
    step4_has_relevant = bool(step_4 & relevant)
    if promise_in_123 and step4_has_denial and step4_has_relevant:
        return {
            "severity": "LITE",
            "h7_csl": h7_sl,
            "step_4_planet": step_4_planet,
            "steps_1_3_relevant_hit": sorted(steps_1_3 & relevant),
            "step_4_relevant_hit": sorted(step_4 & relevant),
            "step_4_denial_hit": sorted(step_4 & denial),
            "warning": (
                f"Pattern D2-LITE: H7 CSL chain promises ({h7_sl} → houses "
                f"{sorted(steps_1_3 & relevant)}), Step 4 ({step_4_planet}) is "
                f"mixed — relevant {sorted(step_4 & relevant)} + denial "
                f"{sorted(step_4 & denial)}. Marriage fires but with friction "
                f"at the final stage (delayed sign-off, conditional terms, "
                f"near-misses before final close)."
            ),
        }

    return None


# ──────────────────────────────────────────────────────────────
# PR M1.3 — Ascendant + H7 CSL friendship between two charts
# ──────────────────────────────────────────────────────────────

def _planet_friendship(planet_a: str, planet_b: str) -> str:
    """
    Return naisargika (natural) friendship status between two planets:
      "friend" / "neutral" / "enemy" / "same" / "unknown"
    Uses PLANET_FRIENDS table. Bidirectional resolution (if A says B is
    friend AND B says A is friend → friend; if disagreement → neutral).
    """
    if not planet_a or not planet_b:
        return "unknown"
    if planet_a == planet_b:
        return "same"
    a_view = PLANET_FRIENDS.get(planet_a, {})
    b_view = PLANET_FRIENDS.get(planet_b, {})
    a_says_b = ("friend" if planet_b in a_view.get("friends", set())
                else "enemy" if planet_b in a_view.get("enemies", set())
                else "neutral" if planet_b in a_view.get("neutral", set())
                else "unknown")
    b_says_a = ("friend" if planet_a in b_view.get("friends", set())
                else "enemy" if planet_a in b_view.get("enemies", set())
                else "neutral" if planet_a in b_view.get("neutral", set())
                else "unknown")
    # Resolve: both friend → friend; both enemy → enemy; both neutral → neutral
    # Mixed: take softer of the two
    if a_says_b == b_says_a:
        return a_says_b
    if "enemy" in (a_says_b, b_says_a) and "friend" in (a_says_b, b_says_a):
        return "neutral"  # mixed
    if "enemy" in (a_says_b, b_says_a):
        return "enemy"  # neutral + enemy = enemy
    if "friend" in (a_says_b, b_says_a):
        return "friend"  # neutral + friend = friend
    return "neutral"


def _sublord_friendship_match(chart1: dict, chart2: dict) -> dict:
    """
    PR M1.3 — Canonical KP Reader IV rule (astrocamp.com source):
    "Ascendant Sub Lords in the charts of the Boy and the Girl should be
    natural friends or equal and should not be enemies."
    Same rule applies to 7th Cusp Sub Lords.

    Returns dict with verdicts on both Asc-SL and H7-SL friendship.
    """
    asc_sl_1 = get_sub_lord(chart1["cusp_lons"][0] % 360) if chart1.get("cusp_lons") else ""
    asc_sl_2 = get_sub_lord(chart2["cusp_lons"][0] % 360) if chart2.get("cusp_lons") else ""
    h7_sl_1 = chart1.get("h7_sub_lord", "")
    h7_sl_2 = chart2.get("h7_sub_lord", "")

    asc_friendship = _planet_friendship(asc_sl_1, asc_sl_2)
    h7_friendship = _planet_friendship(h7_sl_1, h7_sl_2)

    # Verdict: enemy is RED, friend/same is GREEN, neutral is YELLOW
    asc_verdict = ("GREEN" if asc_friendship in ("friend", "same")
                   else "RED" if asc_friendship == "enemy"
                   else "YELLOW")
    h7_verdict = ("GREEN" if h7_friendship in ("friend", "same")
                  else "RED" if h7_friendship == "enemy"
                  else "YELLOW")

    # Overall
    if "RED" in (asc_verdict, h7_verdict):
        overall = "RED"
        note = (
            f"Sub-Lord friction: "
            + ("Ascendant SLs are enemies. " if asc_verdict == "RED" else "")
            + ("H7 SLs are enemies. " if h7_verdict == "RED" else "")
            + "Per KSK Reader IV, this indicates structural friction in the "
              "partnership — daily-life compatibility requires conscious work."
        )
    elif asc_verdict == "GREEN" and h7_verdict == "GREEN":
        overall = "GREEN"
        note = (
            "Sub-Lord harmony: both Ascendant and H7 Sub-Lords are natural "
            "friends or equal. KSK Reader IV considers this a foundational "
            "compatibility signal."
        )
    else:
        overall = "YELLOW"
        note = (
            "Sub-Lord neutrality: no enemy relation, but not friends either. "
            "Workable compatibility; depends on conscious effort."
        )

    return {
        "asc_sl_chart1": asc_sl_1,
        "asc_sl_chart2": asc_sl_2,
        "h7_sl_chart1": h7_sl_1,
        "h7_sl_chart2": h7_sl_2,
        "asc_friendship": asc_friendship,
        "h7_friendship": h7_friendship,
        "asc_verdict": asc_verdict,
        "h7_verdict": h7_verdict,
        "overall": overall,
        "note": note,
    }


# ──────────────────────────────────────────────────────────────
# PR M1.4 — Stricter KSK Reader IV cross-rule
# (Sign/Star/Sub lord of one's H7 = RPs of the other at birth)
# ──────────────────────────────────────────────────────────────

def _ksk_stricter_cross_match(chart_a: dict, chart_b: dict) -> dict:
    """
    PR M1.4 — KSK Reader IV stricter cross-rule per astrocamp.com source:
    "7th Cusp Sign, Star and Sub Lord of Boy should be the Ruling Planets
    of the Girl at the time of birth, and similarly the 7th Cusp Sign,
    Star and Sub Lord of the Girl should be the Ruling Planets of the
    Boy at the time of his birth."

    This is STRICTER than our existing _canonical_cross_match (which only
    checks if RPs SIGNIFY marriage houses). The Reader IV version checks
    whether the LITERAL planet identities of one's 7th cusp Sign/Star/Sub
    appear in the other's birth RPs — a much rarer + higher-signal match.

    When it fires it's "structurally exceptional couple" — soulmate-tier
    by canonical KP standards.
    """
    def _h7_triple(chart):
        cusp_lons = chart["cusp_lons"]
        h7_lon = cusp_lons[6] % 360
        sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
        star_lord = get_nakshatra_and_starlord(h7_lon).get("star_lord", "")
        sub_lord = get_sub_lord(h7_lon)
        return (sign_lord, star_lord, sub_lord)

    a_triple = _h7_triple(chart_a)
    b_triple = _h7_triple(chart_b)

    rp_a = set(_ruling_planets_full(chart_a)["ruling_planets"])
    rp_b = set(_ruling_planets_full(chart_b)["ruling_planets"])

    # A's 7th cusp triple → B's birth RPs?
    a_in_b = [p for p in a_triple if p and p in rp_b]
    b_in_a = [p for p in b_triple if p and p in rp_a]

    a_hits = len(set(a_in_b))
    b_hits = len(set(b_in_a))

    # 3 of 3 on either side = exceptional; 2 of 3 = strong; ≤1 = ordinary
    def _verdict(hits):
        if hits == 3: return "EXCEPTIONAL"
        if hits == 2: return "STRONG"
        if hits == 1: return "ORDINARY"
        return "NONE"

    a_verdict = _verdict(a_hits)
    b_verdict = _verdict(b_hits)

    if a_verdict == "EXCEPTIONAL" or b_verdict == "EXCEPTIONAL":
        overall = "EXCEPTIONAL"
    elif a_verdict == "STRONG" and b_verdict == "STRONG":
        overall = "STRONG"
    elif "STRONG" in (a_verdict, b_verdict):
        overall = "MODERATE"
    elif a_verdict == "ORDINARY" and b_verdict == "ORDINARY":
        overall = "WEAK"
    else:
        overall = "VERY WEAK"

    return {
        "a_h7_triple": list(a_triple),
        "b_h7_triple": list(b_triple),
        "a_triple_in_b_rps": a_in_b,
        "b_triple_in_a_rps": b_in_a,
        "a_hits_of_3": a_hits,
        "b_hits_of_3": b_hits,
        "a_verdict": a_verdict,
        "b_verdict": b_verdict,
        "overall": overall,
        "note": (
            f"KSK Reader IV stricter cross-rule: A's H7 triple {list(a_triple)} "
            f"appears in B's RPs {a_in_b} ({a_hits}/3 = {a_verdict}); "
            f"B's H7 triple {list(b_triple)} appears in A's RPs {b_in_a} "
            f"({b_hits}/3 = {b_verdict}). Overall: {overall}."
        ),
    }


# ──────────────────────────────────────────────────────────────
# PR M1.5 — Spouse longevity gate (H2 = 8th-from-H7 = spouse maraka)
# ──────────────────────────────────────────────────────────────

def _spouse_longevity_gate(chart: dict) -> dict:
    """
    PR M1.5 — Per canonical KP Bhavat Bhavam:
      Native's H2 = 8th from H7 = spouse's H8 = spouse's longevity/maraka.

    Checks the H2 CSL chain for affliction signals affecting spouse's
    structural longevity. Ethical framing: NEVER predicts death (per
    RULE 15); instead flags "spouse needs proactive health awareness."

    Returns concern level and structural reading.
    """
    h2_lon = chart["cusp_lons"][1] % 360
    h2_csl = get_sub_lord(h2_lon)
    h2_sigs = _planet_significations(h2_csl, chart["planets"], chart["cusp_lons"]) if h2_csl else set()
    # In spouse-frame: native's H6 = spouse's H12, native's H8 = spouse's H2,
    # native's H12 = spouse's H6. So H2 CSL hitting native's H6/H8/H12
    # translates to spouse's H12/H2/H6 — disease/loss/wealth-drain houses
    # in spouse frame.
    afflictive_in_spouse_frame = {6, 8, 12}
    hits = h2_sigs & afflictive_in_spouse_frame
    # Severity heuristic
    if len(hits) >= 2:
        concern = "ELEVATED"
        ethical_note = (
            "Per KSK Bhavat Bhavam: native's H2 CSL chain hits multiple "
            "spouse-frame affliction houses. Structural signal that spouse's "
            "long-term health WARRANTS attention — recommend periodic medical "
            "check-ups + healthy lifestyle for partner. NOT a death prediction; "
            "it is a 'be conscious of partner's wellbeing' signal."
        )
    elif len(hits) == 1:
        concern = "MILD"
        ethical_note = (
            "H2 CSL chain touches one spouse-frame affliction house. Mild "
            "structural awareness signal — partner's wellbeing is normally "
            "supported but worth occasional conscious attention."
        )
    else:
        concern = "MINIMAL"
        ethical_note = (
            "No significant spouse-longevity concern signals. H2 CSL chain "
            "is structurally supportive for partner's wellbeing."
        )

    return {
        "h2_csl": h2_csl,
        "h2_sigs": sorted(h2_sigs),
        "spouse_frame_hits": sorted(hits),
        "concern_level": concern,
        "ethical_note": ethical_note,
    }


# ──────────────────────────────────────────────────────────────
# PR M1.6 — Dasha Sandhi + Sama Dasha warnings
# ──────────────────────────────────────────────────────────────

def _dasha_sandhi_and_sama_check(person1: dict, person2: dict, chart1: dict, chart2: dict) -> dict:
    """
    PR M1.6 — Canonical Vedic + KP cross-school timing warnings:

    Dasha Sandhi (MD transition): when BOTH partners' Mahadasha changes
      within ~12 months of each other, the period carries dual-upheaval
      energy. Per source (astrosight.ai): "Fixing a marriage date in
      such a way that there is a Dasha change within a year of marriage
      is not recommended."

    Sama Dasha (same MD lord running simultaneously): per same source,
      "Sama Dasha [parallel Dashas] is not advisable."

    Both checks use current MD of each person to flag structural timing
    risks for couples considering marriage NOW.
    """
    try:
        from datetime import datetime as _dt
        d1 = _current_dba(person1, chart1)
        d2 = _current_dba(person2, chart2)
        md1_lord = d1.get("md_lord", "")
        md2_lord = d2.get("md_lord", "")
        md1_end_str = d1.get("md_end", "")
        md2_end_str = d2.get("md_end", "")

        sama_dasha = (md1_lord == md2_lord) and md1_lord and md1_lord != "Unknown"
        dasha_sandhi_overlap = False
        sandhi_window_days = None
        if md1_end_str and md2_end_str:
            try:
                md1_end = _dt.strptime(md1_end_str[:10], "%Y-%m-%d")
                md2_end = _dt.strptime(md2_end_str[:10], "%Y-%m-%d")
                diff_days = abs((md1_end - md2_end).days)
                sandhi_window_days = diff_days
                # within 365 days = sandhi overlap warning
                if diff_days <= 365:
                    dasha_sandhi_overlap = True
            except Exception:
                pass

        warnings = []
        if sama_dasha:
            warnings.append(
                f"Sama Dasha: BOTH partners running {md1_lord} MD simultaneously. "
                "Per canonical doctrine, this creates parallel-life-phase friction. "
                "Not a denial — adds 'be aware' layer."
            )
        if dasha_sandhi_overlap:
            warnings.append(
                f"Dasha Sandhi overlap: partners' Mahadasha transitions are within "
                f"{sandhi_window_days} days of each other. Per doctrine, marrying "
                f"in such a window adds dual-upheaval energy. If marriage timing "
                f"is flexible, prefer scheduling at least 12 months away from "
                f"either partner's MD transition."
            )

        return {
            "md_lord_chart1": md1_lord,
            "md_lord_chart2": md2_lord,
            "md_end_chart1": md1_end_str,
            "md_end_chart2": md2_end_str,
            "sama_dasha": sama_dasha,
            "dasha_sandhi_within_year": dasha_sandhi_overlap,
            "sandhi_diff_days": sandhi_window_days,
            "warnings": warnings,
        }
    except Exception as e:
        return {"warnings": [], "error": str(e)}


# ──────────────────────────────────────────────────────────────
# PR M1.7 — Ascendant sign element compatibility
# ──────────────────────────────────────────────────────────────

ELEMENT_OF_SIGN = {
    "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
    "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
    "Gemini": "air", "Libra": "air", "Aquarius": "air",
    "Cancer": "water", "Scorpio": "water", "Pisces": "water",
}

# Per canonical KP cross-rule (astrocamp.com): "Fire-Fire, Water-Water,
# Fire-Air, Water-Earth, Air-Water" are compatible pairings.
COMPATIBLE_ELEMENT_PAIRS = {
    frozenset(["fire", "fire"]),
    frozenset(["water", "water"]),
    frozenset(["earth", "earth"]),
    frozenset(["air", "air"]),
    frozenset(["fire", "air"]),
    frozenset(["water", "earth"]),
}


def _ascendant_element_compatibility(chart1: dict, chart2: dict) -> dict:
    """
    PR M1.7 — Ascendant sign element compatibility check.
    """
    sign1 = chart1.get("lagna_sign", "")
    sign2 = chart2.get("lagna_sign", "")
    elem1 = ELEMENT_OF_SIGN.get(sign1, "")
    elem2 = ELEMENT_OF_SIGN.get(sign2, "")
    pair = frozenset([elem1, elem2]) if (elem1 and elem2) else frozenset()
    compatible = pair in COMPATIBLE_ELEMENT_PAIRS if pair else False

    if not pair:
        verdict = "UNKNOWN"
        note = "Could not determine elemental pairing (missing lagna data)."
    elif compatible:
        verdict = "COMPATIBLE"
        note = (
            f"Element pair {elem1}-{elem2} is one of the canonically compatible "
            f"Asc combinations. Foundational temperament alignment present."
        )
    else:
        verdict = "FRICTION"
        note = (
            f"Element pair {elem1}-{elem2} is not on the canonical compatible "
            f"list. Daily-life temperament differences likely; manageable with "
            f"awareness."
        )

    return {
        "chart1_lagna_sign": sign1,
        "chart1_element": elem1,
        "chart2_lagna_sign": sign2,
        "chart2_element": elem2,
        "verdict": verdict,
        "note": note,
    }


# ── Kuja Dosha ────────────────────────────────────────────────

def _check_kuja_dosha(chart: dict) -> dict:
    if "Mars" not in chart["planets"]:
        return {"has_dosha": False, "mars_house": None, "note": "Mars not found"}

    mars_lon = chart["planets"]["Mars"]["longitude"]
    mars_house = _get_planet_house(mars_lon, chart["cusp_lons"])
    has_dosha = mars_house in KUJA_HOUSES

    # Check cancellations
    mars_sign = get_sign(mars_lon % 360)
    cancellations = []
    if mars_sign in ("Aries", "Scorpio"):
        cancellations.append("Mars in own sign")
    if mars_sign == "Capricorn":
        cancellations.append("Mars exalted")
    if mars_sign in ("Aquarius", "Cancer"):
        cancellations.append("Mars in friendly sign — reduced dosha")

    # Jupiter aspect
    if "Jupiter" in chart["planets"]:
        jup_house = _get_planet_house(chart["planets"]["Jupiter"]["longitude"], chart["cusp_lons"])
        if jup_house == mars_house or abs(jup_house - mars_house) in (3, 6, 9):
            cancellations.append("Jupiter influences Mars — reduced dosha")

    severity = "Severe" if mars_house in {7, 8} else "Moderate" if mars_house in {1, 12} else "Mild"
    is_cancelled = len(cancellations) > 0

    return {
        "has_dosha": has_dosha and not is_cancelled,
        "has_dosha_raw": has_dosha,
        "mars_house": mars_house,
        "mars_sign": mars_sign,
        "severity": severity if has_dosha else None,
        "cancellations": cancellations,
        "note": (f"Mars in H{mars_house} — Kuja dosha" + (f" (cancelled: {', '.join(cancellations)})" if cancellations else "")) if has_dosha else f"No Kuja dosha (Mars in H{mars_house})",
    }


# ── Public API ────────────────────────────────────────────────

def _compute_couple_confidence(
    *,
    p1_promise_tier: str,
    p2_promise_tier: str,
    p1_denial: bool,
    p2_denial: bool,
    overlap_window_count: int,
    ashtakoota_score: int,
    ashtakoota_max: int,
    pattern_d2_fire: bool,
    rajju_dosha: bool,
    sep_risk_high_either: bool,
    sublord_friendship_red: bool,
    ksk_stricter_exceptional: bool,
) -> tuple[int, list[dict]]:
    """
    PR M1 — Numeric couple confidence 0-100 with audit trail.

    Brings Match into parity with Horary (PR H3) + Analysis tab
    (RULE 18 engine_confidence). Same shape: 0-100 score + a list of
    {label, delta, note} contributions the astrologer can audit.

    Weighting (max 100):

      Per-partner promise:
        Full      +30 each (max +60 if both)
        Strong    +20 each
        Conditional +10 each
        None       0
      Denial flag on either partner with non-Full promise: −5 each

      Joint dasha overlap:
        ≥1 overlap window in next 60mo: +10
        ≥3 overlap windows:             +15 (cap)

      Ashtakoota:
        ≥27/36: +10
        18-26:  +5
        ≤14:    0

      KSK Reader IV exceptional cross-match (PR M1.4): +5

      Penalties:
        Pattern D2 fire on either side: −10
        Rajju dosha (longevity):        −15
        Sep-risk High on either:        −10
        Sublord friendship RED (enemy): −5

    Clamped to [0, 100].

    Returns (score, contributions) where contributions is a list of
    {label, delta, note} for the audit trail (matches Horary H3 shape).
    """
    contributions: list[dict] = []
    score = 0

    # Promise tier per partner — uses the actual PROMISE_* constants
    # defined in this module (Full/Partial/Weak/None).
    tier_pts = {PROMISE_FULL: 30, PROMISE_PARTIAL: 20, PROMISE_WEAK: 10, PROMISE_NONE: 0}
    for label_idx, tier in enumerate((p1_promise_tier, p2_promise_tier), start=1):
        pts = tier_pts.get(tier, 0)
        score += pts
        contributions.append({
            "label": f"Person {label_idx} promise tier: {tier}",
            "delta": pts,
            "note": "Per partner H7 CSL promise (KSK Reader)" if pts > 0 else "No promise → no contribution",
        })

    # Denial penalty (only when promise is not Full)
    for label_idx, (denial, tier) in enumerate([(p1_denial, p1_promise_tier), (p2_denial, p2_promise_tier)], start=1):
        if denial and tier != PROMISE_FULL:
            score -= 5
            contributions.append({
                "label": f"Person {label_idx} denial-houses-hit (non-Full promise)",
                "delta": -5,
                "note": "H7 CSL touches denial set {1,6,10,12} per KSK",
            })

    # Joint dasha overlap
    if overlap_window_count >= 3:
        score += 15
        contributions.append({"label": f"Joint dasha overlap (≥3 windows in 60mo)",
                              "delta": 15, "note": "Multiple shared favorable windows ahead"})
    elif overlap_window_count >= 1:
        score += 10
        contributions.append({"label": f"Joint dasha overlap ({overlap_window_count} window)",
                              "delta": 10, "note": "Shared favorable window within 60mo"})
    else:
        contributions.append({"label": "Joint dasha overlap (none in 60mo)",
                              "delta": 0, "note": "Marriage timing may stretch beyond horizon"})

    # Ashtakoota
    if ashtakoota_score >= 27:
        score += 10
        contributions.append({"label": f"Ashtakoota {ashtakoota_score}/{ashtakoota_max} (≥27)",
                              "delta": 10, "note": "Strong traditional gun-milan"})
    elif ashtakoota_score >= 18:
        score += 5
        contributions.append({"label": f"Ashtakoota {ashtakoota_score}/{ashtakoota_max}",
                              "delta": 5, "note": "Moderate traditional gun-milan"})
    else:
        contributions.append({"label": f"Ashtakoota {ashtakoota_score}/{ashtakoota_max} (≤14)",
                              "delta": 0, "note": "Low gun-milan — KP-strict still primary"})

    # KSK Reader IV exceptional cross-match
    if ksk_stricter_exceptional:
        score += 5
        contributions.append({"label": "KSK Reader IV exceptional cross-match",
                              "delta": 5, "note": "Rare high-signal H7 triple ↔ partner RPs"})

    # Penalties
    if pattern_d2_fire:
        score -= 10
        contributions.append({"label": "Pattern D2 fire (engagement-broken / wedding-cancelled risk)",
                              "delta": -10, "note": "Step 4 partial denier on either partner's H7 chain"})
    if rajju_dosha:
        score -= 15
        contributions.append({"label": "Rajju dosha (longevity concern)",
                              "delta": -15, "note": "Same body-region rajju in extended Dashakoota"})
    if sep_risk_high_either:
        score -= 10
        contributions.append({"label": "High separation risk on either side",
                              "delta": -10, "note": "Per _separation_risk computation"})
    if sublord_friendship_red:
        score -= 5
        contributions.append({"label": "Asc + H7 sublord friendship RED (enemy)",
                              "delta": -5, "note": "PR M1.3 structural-friction signal"})

    # Clamp
    score = max(0, min(100, score))
    return score, contributions


def compute_compatibility(person1: dict, person2: dict) -> dict:
    """
    Main function: compute full KP + Ashtakoota + Dosha compatibility.
    person1/person2 must have: name, date, time, latitude, longitude, timezone_offset, gender
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # PR A1.12 — Override caller-supplied timezone_offset with the
    # birth-date-correct value resolved from each person's lat/lon.
    # See timezone_utils.resolve_birth_offset docstring for why the
    # frontend's number cannot be trusted.
    from app.services.timezone_utils import resolve_birth_offset
    for _person in (person1, person2):
        _resolved, _ = resolve_birth_offset(
            _person["latitude"], _person["longitude"],
            _person["date"], _person["time"],
            fallback_offset=_person.get("timezone_offset", 5.5),
        )
        _person["timezone_offset"] = _resolved

    chart1 = _build_chart(person1)
    chart2 = _build_chart(person2)

    # Generate full charts for frontend kundali rendering
    full_chart1 = generate_chart(
        person1["date"], person1["time"],
        person1["latitude"], person1["longitude"],
        person1.get("timezone_offset", 5.5),
    )
    full_chart2 = generate_chart(
        person2["date"], person2["time"],
        person2["latitude"], person2["longitude"],
        person2.get("timezone_offset", 5.5),
    )
    chart1_frontend = format_chart_for_frontend(full_chart1)
    chart2_frontend = format_chart_for_frontend(full_chart2)

    # Determine boy/girl for gender-sensitive doshas
    gender1 = person1.get("gender", "")
    gender2 = person2.get("gender", "")

    if gender1 == "male" and gender2 == "female":
        chart_boy, chart_girl = chart1, chart2
        name_boy, name_girl = person1["name"], person2["name"]
    elif gender1 == "female" and gender2 == "male":
        chart_boy, chart_girl = chart2, chart1
        name_boy, name_girl = person2["name"], person1["name"]
    else:
        # Fallback: treat person1 as boy, person2 as girl
        chart_boy, chart_girl = chart1, chart2
        name_boy, name_girl = person1["name"], person2["name"]

    kp = _kp_compatibility(chart1, chart2)
    timing = _dasha_overlap_check(person1, person2, chart1, chart2)
    ashtakoota = _ashtakoota(chart_boy, chart_girl)
    dosha_p1 = _check_kuja_dosha(chart1)
    dosha_p2 = _check_kuja_dosha(chart2)

    # PR A1.5 — South Indian Dashakoota extensions + Vargottama + no-desire
    extended_koots = _extended_koots(chart_boy, chart_girl)
    vargottama_p1 = _vargottama_check(chart1)
    vargottama_p2 = _vargottama_check(chart2)
    no_desire_p1 = _no_desire_for_marriage(chart1)
    no_desire_p2 = _no_desire_for_marriage(chart2)

    # PR A1.6 — Will-it-last, Children prospects, In-laws concerns,
    # and Upcoming marriage-favorable windows (next 60 months).
    quality_p1 = _marriage_quality_outlook(chart1)
    quality_p2 = _marriage_quality_outlook(chart2)
    mahendra_score = extended_koots.get("mahendra", {}).get("score", 0)
    children_match = _children_match(chart1, chart2, mahendra_score)
    inlaws_p1 = _in_laws_concerns(chart1, person1["name"])
    inlaws_p2 = _in_laws_concerns(chart2, person2["name"])
    upcoming_windows = _shared_marriage_windows(person1, person2, chart1, chart2,
                                                months_ahead=60)

    # New: D9 Navamsa for both charts
    d9_chart1 = _compute_d9(chart1)
    d9_chart2 = _compute_d9(chart2)

    # New: Detailed significator hierarchy (4-level)
    sigs_detailed1 = _marriage_significators_detailed(chart1)
    sigs_detailed2 = _marriage_significators_detailed(chart2)

    # New: Current DBA for each person
    dba_chart1 = _current_dba(person1, chart1)
    dba_chart2 = _current_dba(person2, chart2)

    # New: 5th CSL analysis (love/romance)
    h5_chart1 = _h5_sublord_analysis(chart1)
    h5_chart2 = _h5_sublord_analysis(chart2)

    # New: Separation/divorce risk
    sep_risk1 = _separation_risk(chart1)
    sep_risk2 = _separation_risk(chart2)

    # PR M1.2 — Pattern D2 (engagement-broken / wedding-cancelled) detection
    # on EACH partner's H7 CSL chain. Requires M1.1 (canonical Step 4) to fire.
    pattern_d2_p1 = _pattern_d2_for_h7(chart1)
    pattern_d2_p2 = _pattern_d2_for_h7(chart2)

    # PR M1.3 — Ascendant + H7 Sub-Lord friendship between two charts
    sublord_friendship = _sublord_friendship_match(chart1, chart2)

    # PR M1.4 — KSK Reader IV stricter cross-rule (H7 triple in other's RPs)
    ksk_stricter = _ksk_stricter_cross_match(chart1, chart2)

    # PR M1.5 — Spouse longevity gate (Bhavat Bhavam — H2 = 8th-from-H7)
    spouse_longevity_p1 = _spouse_longevity_gate(chart1)
    spouse_longevity_p2 = _spouse_longevity_gate(chart2)

    # PR M1.6 — Dasha Sandhi + Sama Dasha warnings (couple timing)
    dasha_sandhi = _dasha_sandhi_and_sama_check(person1, person2, chart1, chart2)

    # PR M1.7 — Ascendant sign element compatibility
    asc_element = _ascendant_element_compatibility(chart1, chart2)

    # PR M2 — Multi-cusp confirmation TIER 0/1/2/3/-1 per partner.
    # Brings Match into parity with Analysis tab's TIER labeling
    # (per kp_multi_cusp_confirmation.md + RULE 34).
    multi_cusp_tier_p1 = _compute_multi_cusp_tier(chart1)
    multi_cusp_tier_p2 = _compute_multi_cusp_tier(chart2)

    # PR M3 — Pattern detection per partner (M1/M2/M3/M5) + cross-couple
    # (T1/T2). Pattern naming is what distinguishes a deep KSK reading
    # from a generic significator scan (RULE 19).
    patterns_p1 = _detect_marriage_patterns(chart1, person_dict=person1)
    patterns_p2 = _detect_marriage_patterns(chart2, person_dict=person2)
    patterns_couple = _detect_couple_patterns(
        chart1, chart2, kp, dba1=dba_chart1, dba2=dba_chart2,
    )

    # Kuja dosha mutual cancellation — PR A1.4 SOFTENED.
    # Pre-A1.4: zeroed both doshas entirely. Per AstroSight + Nidhi Trivedi,
    # canonical behavior is "energies balance, severity reduced" — not
    # full nullification. We now keep `has_dosha = True` for both but
    # downgrade severity by one tier and record the cancellation note.
    kuja_both = dosha_p1["has_dosha_raw"] and dosha_p2["has_dosha_raw"]
    if kuja_both:
        # Severity downgrade: Severe → Moderate → Mild → None
        for d in (dosha_p1, dosha_p2):
            if d.get("severity") == "Severe":
                d["severity"] = "Moderate"
            elif d.get("severity") == "Moderate":
                d["severity"] = "Mild"
            # has_dosha stays True — energies balance, they don't disappear
            d["cancellations"].append(
                "Both partners Manglik — severity reduced (not nullified)"
            )

    # ── Overall verdict — PR A1.4 strict combiner ────────────────────
    # The pre-A1.4 combiner gave kp_score=1 to Conditional + ast_score=1
    # for any Ashtakoota ≥ 18 → "Compatible" was the default state.
    #
    # PR A1.4 rules:
    #   1. KP verdict is PRIMARY — it sets the ceiling
    #   2. Ashtakoota is SECONDARY — can confirm but not override
    #   3. Separation risk + D9 H7 contradiction can downgrade
    #   4. If EITHER chart's H7 CSL has denial AND promise not Full,
    #      cap the verdict at "Conditionally Compatible" regardless
    #      of Ashtakoota
    #   5. If EITHER chart's promise_tier is None, cap at
    #      "Needs Careful Consideration"
    kp_verdict = kp["kp_verdict"]

    # KP-anchored base
    kp_base = {
        "Strong Match":       "Highly Compatible",
        "Good Match":         "Compatible",
        "Conditional":        "Conditionally Compatible",
        "Conditional - weak": "Conditionally Compatible",
        "Caution":            "Needs Careful Consideration",
        "Inconclusive":       "Needs Careful Consideration",
    }.get(kp_verdict, "Conditionally Compatible")

    # Order for comparison (low → high)
    VERDICT_RANK = {
        "Needs Careful Consideration": 0,
        "Conditionally Compatible":    1,
        "Compatible":                  2,
        "Highly Compatible":           3,
    }

    overall = kp_base

    # Promise-tier cap — strict rule
    p1_tier = kp["chart1_promise"]["promise_tier"]
    p2_tier = kp["chart2_promise"]["promise_tier"]
    p1_denial = kp["chart1_promise"]["has_denial"]
    p2_denial = kp["chart2_promise"]["has_denial"]

    if PROMISE_NONE in (p1_tier, p2_tier):
        overall = "Needs Careful Consideration"
    elif (p1_denial and p1_tier != PROMISE_FULL) or (p2_denial and p2_tier != PROMISE_FULL):
        # Denial + non-full promise on either side → cap at Conditional
        if VERDICT_RANK[overall] > VERDICT_RANK["Conditionally Compatible"]:
            overall = "Conditionally Compatible"

    # Separation-risk downgrade
    sr1_level = sep_risk1["risk_level"]
    sr2_level = sep_risk2["risk_level"]
    if "High" in (sr1_level, sr2_level):
        # High separation risk on either side downgrades one tier
        if VERDICT_RANK[overall] > 0:
            overall_rank = max(0, VERDICT_RANK[overall] - 1)
            overall = next(k for k, v in VERDICT_RANK.items() if v == overall_rank)
    elif sr1_level == "Moderate" and sr2_level == "Moderate":
        # Moderate on BOTH sides downgrades one tier
        if VERDICT_RANK[overall] > 0:
            overall_rank = max(0, VERDICT_RANK[overall] - 1)
            overall = next(k for k, v in VERDICT_RANK.items() if v == overall_rank)

    # Ashtakoota confirm/contradict — secondary only.
    # If KP says Compatible+ but Ashtakoota ≤ 14 (very low) and critical
    # doshas present, downgrade one tier.
    if (VERDICT_RANK[overall] >= VERDICT_RANK["Compatible"]
            and ashtakoota["total_score"] <= 14
            and len(ashtakoota.get("critical_doshas", [])) >= 2):
        overall_rank = max(0, VERDICT_RANK[overall] - 1)
        overall = next(k for k, v in VERDICT_RANK.items() if v == overall_rank)

    # PR A1.5 — Rajju dosha (same body region) is a serious longevity
    # concern. If present, downgrade one tier and never allow "Highly
    # Compatible" verdict.
    if extended_koots.get("has_rajju_dosha"):
        if VERDICT_RANK[overall] >= VERDICT_RANK["Compatible"]:
            overall_rank = max(0, VERDICT_RANK[overall] - 1)
            overall = next(k for k, v in VERDICT_RANK.items() if v == overall_rank)
        # Never let Highly Compatible stand with Rajju dosha
        if overall == "Highly Compatible":
            overall = "Compatible"

    # PR A1.5 — No-desire flag on EITHER chart adds a soft caution layer.
    # If BOTH charts have no-desire flag, cap at Conditionally Compatible.
    if no_desire_p1.get("flagged") and no_desire_p2.get("flagged"):
        if VERDICT_RANK[overall] > VERDICT_RANK["Conditionally Compatible"]:
            overall = "Conditionally Compatible"

    # PR M1.2 — Pattern D2 STRONG on EITHER chart caps verdict at
    # Conditionally Compatible (engagement-broken / wedding-cancelled risk
    # is structural; pretending it's "Compatible" without flagging would
    # be misleading the user).
    if ((pattern_d2_p1 and pattern_d2_p1.get("severity") == "STRONG")
            or (pattern_d2_p2 and pattern_d2_p2.get("severity") == "STRONG")):
        if VERDICT_RANK[overall] > VERDICT_RANK["Conditionally Compatible"]:
            overall = "Conditionally Compatible"

    # PR M1.3 — Asc + H7 SubLord BOTH RED (enemy) on the friendship check
    # is a structural friction signal — downgrade one tier if currently
    # above Conditionally Compatible.
    if sublord_friendship.get("overall") == "RED":
        if VERDICT_RANK[overall] > VERDICT_RANK["Conditionally Compatible"]:
            overall_rank = max(0, VERDICT_RANK[overall] - 1)
            overall = next(k for k, v in VERDICT_RANK.items() if v == overall_rank)

    # PR M1.4 — KSK Reader IV EXCEPTIONAL cross-match is so rare and
    # high-signal that it can UPGRADE within the same broad tier.
    # We don't let it jump verdict tiers (KP strict mode keeps caps),
    # but we flag it for the AI to cite as "exceptional structural fit."
    # No verdict change — just informational.

    # If KP says Conditional but Ashtakoota and canonical strongly support,
    # we do NOT upgrade — KP-strict mode means KP verdict is authoritative.

    # PR M1 — Numeric couple confidence 0-100 with audit trail.
    # Computed AFTER all engine values are available so all signals can
    # contribute. Brings Match into parity with Horary (H3) + Analysis
    # tab (RULE 18 engine_confidence).
    couple_confidence_score, couple_confidence_breakdown = _compute_couple_confidence(
        p1_promise_tier=p1_tier,
        p2_promise_tier=p2_tier,
        p1_denial=p1_denial,
        p2_denial=p2_denial,
        overlap_window_count=len(upcoming_windows.get("overlap_windows", []) or []),
        ashtakoota_score=ashtakoota["total_score"],
        ashtakoota_max=ashtakoota["max_score"],
        pattern_d2_fire=bool(
            (pattern_d2_p1 and pattern_d2_p1.get("severity") == "STRONG")
            or (pattern_d2_p2 and pattern_d2_p2.get("severity") == "STRONG")
        ),
        rajju_dosha=bool(extended_koots.get("has_rajju_dosha")),
        sep_risk_high_either=("High" in (sr1_level, sr2_level)),
        sublord_friendship_red=(sublord_friendship.get("overall") == "RED"),
        ksk_stricter_exceptional=bool(ksk_stricter.get("exceptional_cross_match")),
    )

    # Nadi dosha — only flag as serious-concern if also same nakshatra.
    # (Cancellation exception per classical rules — see audit §C6.)
    nadi_serious = ("Nadi" in ashtakoota.get("critical_doshas", []))
    if nadi_serious:
        # Same nakshatra cancellation
        if chart1["moon_nakshatra"] == chart2["moon_nakshatra"]:
            # Same nakshatra: keep dosha but flag the cancellation note
            ashtakoota["nadi_cancellation_note"] = (
                "Same nakshatra ({}) — classical exception applies; "
                "severity reduced.".format(chart1["moon_nakshatra"])
            )
        # Same rashi different nakshatra cancellation
        elif chart1["moon_sign"] == chart2["moon_sign"]:
            ashtakoota["nadi_cancellation_note"] = (
                "Same Moon sign ({}) different nakshatras — classical "
                "exception applies; severity reduced.".format(chart1["moon_sign"])
            )

    return {
        "person1": {"name": person1["name"], "gender": gender1,
                    "moon_sign": chart1["moon_sign"], "moon_nakshatra": chart1["moon_nakshatra"], "lagna": chart1["lagna_sign"]},
        "person2": {"name": person2["name"], "gender": gender2,
                    "moon_sign": chart2["moon_sign"], "moon_nakshatra": chart2["moon_nakshatra"], "lagna": chart2["lagna_sign"]},
        "boy_girl": {"boy": name_boy, "girl": name_girl},
        "kp_analysis": kp,
        "timing_analysis": timing,
        "ashtakoota": ashtakoota,
        "kuja_dosha": {
            "person1": {"name": person1["name"], **dosha_p1},
            "person2": {"name": person2["name"], **dosha_p2},
            "mutual_cancellation": kuja_both,
        },
        # PR A1.5 — Dashakoota extensions + Vargottama + no-desire flags
        "extended_koots": extended_koots,
        "vargottama_chart1": vargottama_p1,
        "vargottama_chart2": vargottama_p2,
        "no_desire_chart1": no_desire_p1,
        "no_desire_chart2": no_desire_p2,
        # PR A1.6 — Outcome quality + Upcoming windows
        "quality_outlook_chart1": quality_p1,
        "quality_outlook_chart2": quality_p2,
        "children_match": children_match,
        "in_laws_chart1": inlaws_p1,
        "in_laws_chart2": inlaws_p2,
        "upcoming_windows": upcoming_windows,
        # D9
        "d9_chart1": d9_chart1,
        "d9_chart2": d9_chart2,
        "significators_detailed_chart1": sigs_detailed1,
        "significators_detailed_chart2": sigs_detailed2,
        "dba_chart1": dba_chart1,
        "dba_chart2": dba_chart2,
        "h5_analysis_chart1": h5_chart1,
        "h5_analysis_chart2": h5_chart2,
        "separation_risk_chart1": sep_risk1,
        "separation_risk_chart2": sep_risk2,
        # PR M1.2 — Pattern D2 (engagement-broken / wedding-cancelled) detection
        "pattern_d2_chart1": pattern_d2_p1,
        "pattern_d2_chart2": pattern_d2_p2,
        # PR M1.3 — Asc + H7 Sub-Lord friendship check
        "sublord_friendship_match": sublord_friendship,
        # PR M1.4 — KSK Reader IV stricter cross-rule (H7 triple ↔ partner's RPs)
        "ksk_stricter_cross_match": ksk_stricter,
        # PR M1.5 — Spouse longevity gate via Bhavat Bhavam (H2 = spouse maraka)
        "spouse_longevity_chart1": spouse_longevity_p1,
        "spouse_longevity_chart2": spouse_longevity_p2,
        # PR M1.6 — Dasha Sandhi + Sama Dasha timing warnings
        "dasha_sandhi_check": dasha_sandhi,
        # PR M1.7 — Ascendant sign element compatibility
        "ascendant_element_compatibility": asc_element,
        "chart1_data": chart1_frontend,
        "chart2_data": chart2_frontend,
        "overall_verdict": overall,
        # PR M1 — numeric couple confidence 0-100 + audit trail
        "couple_confidence_score": couple_confidence_score,
        "couple_confidence_breakdown": couple_confidence_breakdown,
        # PR M2 — multi-cusp TIER 0/1/2/3/-1 per partner
        "multi_cusp_tier_chart1": multi_cusp_tier_p1,
        "multi_cusp_tier_chart2": multi_cusp_tier_p2,
        # PR M3 — Pattern detection per partner + cross-couple
        "patterns_chart1": patterns_p1,
        "patterns_chart2": patterns_p2,
        "patterns_couple": patterns_couple,
        "summary": {
            "kp_verdict": kp["kp_verdict"],
            "ashtakoota_score": f"{ashtakoota['total_score']}/{ashtakoota['max_score']}",
            "ashtakoota_verdict": ashtakoota["verdict"],
            "critical_doshas": ashtakoota["critical_doshas"],
            "kuja_concern": dosha_p1["has_dosha"] or dosha_p2["has_dosha"],
        },
    }
