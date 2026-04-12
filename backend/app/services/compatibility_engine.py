"""
KP Marriage Compatibility Engine.
Computes KP-based compatibility + full 8-kuta Ashtakoota + Kuja/Manglik dosha.
"""
import swisseph as swe
from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign,
    get_planet_positions, date_time_to_julian
)

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

VASYA_MAP = {
    "Leo": ["Aries"], "Cancer": ["Scorpio","Sagittarius"],
    "Aquarius": ["Aries"], "Virgo": ["Pisces","Gemini"],
    "Scorpio": ["Cancer"], "Capricorn": ["Aries"], "Pisces": ["Capricorn"],
}

MARRIAGE_DENIAL_HOUSES = {1, 6, 10}
MARRIAGE_PROMISE_HOUSES = {2, 7, 11}
KUJA_HOUSES = {1, 2, 4, 7, 8, 12}


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


def _planet_significations(planet_name: str, planets: dict, cusp_lons: list) -> set:
    if planet_name not in planets:
        return set()
    plon = planets[planet_name]["longitude"]
    occupied = _get_planet_house(plon, cusp_lons)
    ruled = {i + 1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name}
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    sl_house = _get_planet_house(planets[star_lord]["longitude"], cusp_lons) if star_lord in planets else 0
    result = {occupied} | ruled
    if sl_house:
        result.add(sl_house)
    return result


def _h7_sublord_promise(chart: dict) -> dict:
    """Check if H7 sub-lord promises marriage."""
    h7_sl = chart["h7_sub_lord"]
    sigs = _planet_significations(h7_sl, chart["planets"], chart["cusp_lons"])
    has_promise = bool(sigs & MARRIAGE_PROMISE_HOUSES)
    has_denial = bool(sigs & MARRIAGE_DENIAL_HOUSES)
    return {
        "sub_lord": h7_sl,
        "signified_houses": sorted(sigs),
        "has_promise": has_promise,
        "has_denial": has_denial,
        "verdict": "Promised" if has_promise and not has_denial else ("Denied" if has_denial else "Conditional"),
    }


def _marriage_significators(chart: dict) -> set:
    """All planets that signify houses 2, 7, or 11."""
    result = set()
    for p in chart["planets"]:
        sigs = _planet_significations(p, chart["planets"], chart["cusp_lons"])
        if sigs & MARRIAGE_PROMISE_HOUSES:
            result.add(p)
    return result


def _ruling_planets(chart: dict) -> set:
    moon_info = get_nakshatra_and_starlord(chart["moon_lon"])
    lagna_info = get_nakshatra_and_starlord(chart["lagna_lon"])
    rps = {
        SIGN_LORDS.get(chart["moon_sign"], ""),
        moon_info.get("star_lord", ""),
        SIGN_LORDS.get(chart["lagna_sign"], ""),
        lagna_info.get("star_lord", ""),
    }
    rps.discard("")
    return rps


# ── KP Compatibility ──────────────────────────────────────────

def _kp_compatibility(chart1: dict, chart2: dict) -> dict:
    promise1 = _h7_sublord_promise(chart1)
    promise2 = _h7_sublord_promise(chart2)

    sigs1 = _marriage_significators(chart1)
    sigs2 = _marriage_significators(chart2)
    rp1 = _ruling_planets(chart1)
    rp2 = _ruling_planets(chart2)

    resonance_1to2 = sorted(sigs1 & rp2)
    resonance_2to1 = sorted(sigs2 & rp1)
    total_resonance = len(set(resonance_1to2) | set(resonance_2to1))

    if promise1["has_promise"] and promise2["has_promise"] and total_resonance >= 3:
        verdict = "Strong Match"
    elif promise1["has_promise"] and promise2["has_promise"] and total_resonance >= 1:
        verdict = "Good Match"
    elif (promise1["has_promise"] or promise2["has_promise"]) and total_resonance >= 1:
        verdict = "Fair Match"
    elif promise1["has_denial"] or promise2["has_denial"]:
        verdict = "Caution"
    else:
        verdict = "Conditional"

    return {
        "chart1_promise": promise1,
        "chart2_promise": promise2,
        "significators_chart1": sorted(sigs1),
        "significators_chart2": sorted(sigs2),
        "ruling_planets_chart1": sorted(rp1),
        "ruling_planets_chart2": sorted(rp2),
        "resonance_1_to_2": resonance_1to2,
        "resonance_2_to_1": resonance_2to1,
        "total_resonance_count": total_resonance,
        "kp_verdict": verdict,
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
    naks = NAKSHATRA_ORDER
    girl_nak = chart_girl["moon_nakshatra"]
    boy_nak = chart_boy["moon_nakshatra"]
    if girl_nak in naks and boy_nak in naks:
        g_idx = naks.index(girl_nak)
        b_idx = naks.index(boy_nak)
        count_gb = ((b_idx - g_idx) % 27) + 1
        count_bg = ((g_idx - b_idx) % 27) + 1
        r_gb = count_gb % 9 or 9
        r_bg = count_bg % 9 or 9
        auspicious_gb = r_gb in {1, 3, 5, 7}
        auspicious_bg = r_bg in {1, 3, 5, 7}
        if auspicious_gb and auspicious_bg:
            score = 3
        elif auspicious_gb or auspicious_bg:
            score = 1.5
        else:
            score = 0
    else:
        score = 0
        auspicious_gb = auspicious_bg = False
    return {"kuta": "Tara", "max": 3, "score": score,
            "girl_nakshatra": girl_nak, "boy_nakshatra": boy_nak,
            "auspicious_girl_to_boy": auspicious_gb, "auspicious_boy_to_girl": auspicious_bg}


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

def compute_compatibility(person1: dict, person2: dict) -> dict:
    """
    Main function: compute full KP + Ashtakoota + Dosha compatibility.
    person1/person2 must have: name, date, time, latitude, longitude, timezone_offset, gender
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    chart1 = _build_chart(person1)
    chart2 = _build_chart(person2)

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
    ashtakoota = _ashtakoota(chart_boy, chart_girl)
    dosha_p1 = _check_kuja_dosha(chart1)
    dosha_p2 = _check_kuja_dosha(chart2)

    # Kuja dosha mutual cancellation
    kuja_both = dosha_p1["has_dosha_raw"] and dosha_p2["has_dosha_raw"]
    if kuja_both:
        dosha_p1["has_dosha"] = False
        dosha_p1["cancellations"].append("Both partners have Kuja dosha — cancelled")
        dosha_p2["has_dosha"] = False
        dosha_p2["cancellations"].append("Both partners have Kuja dosha — cancelled")

    # Overall verdict
    kp_score = {"Strong Match": 3, "Good Match": 2, "Fair Match": 1, "Conditional": 1, "Caution": 0}.get(kp["kp_verdict"], 1)
    ast_score = 2 if ashtakoota["total_score"] >= 25 else 1 if ashtakoota["total_score"] >= 18 else 0
    dosha_penalty = sum([
        1 if dosha_p1["has_dosha"] else 0,
        1 if dosha_p2["has_dosha"] else 0,
        1 if "Nadi" in ashtakoota["critical_doshas"] else 0,
    ])
    combined = kp_score + ast_score - dosha_penalty

    if combined >= 4:
        overall = "Highly Compatible"
    elif combined >= 2:
        overall = "Compatible"
    elif combined >= 1:
        overall = "Conditionally Compatible"
    else:
        overall = "Needs Careful Consideration"

    return {
        "person1": {"name": person1["name"], "gender": gender1,
                    "moon_sign": chart1["moon_sign"], "moon_nakshatra": chart1["moon_nakshatra"], "lagna": chart1["lagna_sign"]},
        "person2": {"name": person2["name"], "gender": gender2,
                    "moon_sign": chart2["moon_sign"], "moon_nakshatra": chart2["moon_nakshatra"], "lagna": chart2["lagna_sign"]},
        "boy_girl": {"boy": name_boy, "girl": name_girl},
        "kp_analysis": kp,
        "ashtakoota": ashtakoota,
        "kuja_dosha": {
            "person1": {"name": person1["name"], **dosha_p1},
            "person2": {"name": person2["name"], **dosha_p2},
            "mutual_cancellation": kuja_both,
        },
        "overall_verdict": overall,
        "summary": {
            "kp_verdict": kp["kp_verdict"],
            "ashtakoota_score": f"{ashtakoota['total_score']}/{ashtakoota['max_score']}",
            "ashtakoota_verdict": ashtakoota["verdict"],
            "critical_doshas": ashtakoota["critical_doshas"],
            "kuja_concern": dosha_p1["has_dosha"] or dosha_p2["has_dosha"],
        },
    }
