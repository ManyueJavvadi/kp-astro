import swisseph as swe
from datetime import datetime
import math

# PR A1.3-fix-24 — single source of truth for "today" (IST midnight rollover).
# See app/services/today.py for the rationale. Without this import, dasha-period
# detection was 5.5 hours stale per day on UTC servers vs the answer cache.
from app.services.today import today_ist_str

# KP New Ayanamsa - confirmed with father
swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

# Planets we calculate - standard KP set
PLANETS = {
    "Sun":     swe.SUN,
    "Moon":    swe.MOON,
    "Mars":    swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus":   swe.VENUS,
    "Saturn":  swe.SATURN,
    "Rahu":    swe.MEAN_NODE,   # KP uses Mean Node for Rahu
}

# 27 Nakshatras with their lords
NAKSHATRAS = [
    ("Ashwini", "Ketu"), ("Bharani", "Venus"), ("Krittika", "Sun"),
    ("Rohini", "Moon"), ("Mrigashira", "Mars"), ("Ardra", "Rahu"),
    ("Punarvasu", "Jupiter"), ("Pushya", "Saturn"), ("Ashlesha", "Mercury"),
    ("Magha", "Ketu"), ("Purva Phalguni", "Venus"), ("Uttara Phalguni", "Sun"),
    ("Hasta", "Moon"), ("Chitra", "Mars"), ("Swati", "Rahu"),
    ("Vishakha", "Jupiter"), ("Anuradha", "Saturn"), ("Jyeshtha", "Mercury"),
    ("Mula", "Ketu"), ("Purva Ashadha", "Venus"), ("Uttara Ashadha", "Sun"),
    ("Shravana", "Moon"), ("Dhanishta", "Mars"), ("Shatabhisha", "Rahu"),
    ("Purva Bhadrapada", "Jupiter"), ("Uttara Bhadrapada", "Saturn"),
    ("Revati", "Mercury")
]

# Vimshottari dasha years - basis for 249 sub-lord divisions
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}

# Total dasha years
TOTAL_YEARS = sum(DASHA_YEARS.values())  # 120

# PR A1.3-fix-24 — DASHA_SEQUENCE was previously defined at line 187 (and
# DASHA_YEARS was duplicated at line 192). Hoisted to the canonical block
# here, duplicates removed below. `lords_order` at L71 also collapsed to
# use DASHA_SEQUENCE. Same byte-identical values; fix is dedup only.
DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]

# Backwards-compatible alias for the old name. Some external code may still
# reference TOTAL_DASHA_YEARS. Both point at the same 120-year cycle.
TOTAL_DASHA_YEARS = TOTAL_YEARS

# Each nakshatra span in degrees
NAKSHATRA_SPAN = 360 / 27  # 13.333...


def get_nakshatra_and_starlord(longitude: float) -> dict:
    """Given a longitude in degrees, return nakshatra and star lord."""
    index = int(longitude / NAKSHATRA_SPAN)
    nakshatra_name, star_lord = NAKSHATRAS[index % 27]
    return {
        "nakshatra": nakshatra_name,
        "star_lord": star_lord,
        "nakshatra_index": index % 27
    }


def get_sub_lord(longitude: float) -> str:
    """
    Calculate KP sub lord for a given longitude.
    Based on 249 sub-divisions derived from Vimshottari dasha proportions.
    """
    # Position within the nakshatra (0 to NAKSHATRA_SPAN)
    nakshatra_index = int(longitude / NAKSHATRA_SPAN)
    position_in_nakshatra = longitude - (nakshatra_index * NAKSHATRA_SPAN)

    # Determine starting lord of this nakshatra
    nakshatra_lord = NAKSHATRAS[nakshatra_index % 27][1]

    # PR A1.3-fix-24 — uses canonical DASHA_SEQUENCE (hoisted to top of file).
    # Was a duplicate hardcoded list here.
    start_index = DASHA_SEQUENCE.index(nakshatra_lord)
    sequence = DASHA_SEQUENCE[start_index:] + DASHA_SEQUENCE[:start_index]

    # Calculate sub spans proportional to dasha years
    current_position = 0.0
    for lord in sequence:
        span = (DASHA_YEARS[lord] / TOTAL_YEARS) * NAKSHATRA_SPAN
        if current_position + span >= position_in_nakshatra:
            return lord
        current_position += span

    return sequence[-1]  # fallback


# PR A1.3-fix-26 Part E — nakshatra/sub boundary proximity detection.
# When a cusp's longitude is within a small threshold of a sub-lord
# boundary, even a 4-minute birth-time error could flip the CSL from
# one planet to another, which can flip the entire verdict. RULE 37
# requires the LLM to acknowledge this when borderline. We expose the
# distance + boundary flag here so the engine output can include it.
def sub_boundary_distance(longitude: float) -> dict:
    """Return distance (degrees) to the NEAREST sub-lord boundary at this
    longitude, plus the planets on each side.

    A "sub boundary" is the longitude where the sub lord changes from
    one planet to another within the same nakshatra (or across nakshatras).
    Returns:
        {
          "current_sub_lord": str,
          "next_sub_lord": str,    # the sub lord just past the boundary ahead
          "prev_sub_lord": str,    # the sub lord just before the boundary behind
          "deg_to_next_boundary": float,   # always >= 0
          "deg_to_prev_boundary": float,   # always >= 0
          "deg_to_nearest_boundary": float,  # min of next/prev
        }
    """
    # Normalize longitude to [0, 360)
    longitude = longitude % 360
    nakshatra_index = int(longitude / NAKSHATRA_SPAN)
    position_in_nakshatra = longitude - (nakshatra_index * NAKSHATRA_SPAN)
    nakshatra_lord = NAKSHATRAS[nakshatra_index % 27][1]
    start_index = DASHA_SEQUENCE.index(nakshatra_lord)
    sequence = DASHA_SEQUENCE[start_index:] + DASHA_SEQUENCE[:start_index]

    # Walk the sub spans within this nakshatra to find current sub + bounds
    current_position = 0.0
    for i, lord in enumerate(sequence):
        span = (DASHA_YEARS[lord] / TOTAL_YEARS) * NAKSHATRA_SPAN
        sub_start = current_position
        sub_end = current_position + span
        if sub_end >= position_in_nakshatra:
            # We're inside this sub. Compute distances + neighbours.
            deg_to_next = sub_end - position_in_nakshatra
            deg_to_prev = position_in_nakshatra - sub_start
            # Determine prev_sub_lord (sub before this one)
            if i == 0:
                # First sub of this nakshatra — prev sub is last sub of
                # previous nakshatra. Build the previous nakshatra sequence
                # quickly to identify it.
                prev_nak_lord = NAKSHATRAS[(nakshatra_index - 1) % 27][1]
                prev_start = DASHA_SEQUENCE.index(prev_nak_lord)
                prev_seq = DASHA_SEQUENCE[prev_start:] + DASHA_SEQUENCE[:prev_start]
                prev_sub_lord = prev_seq[-1]
            else:
                prev_sub_lord = sequence[i - 1]
            # Next sub lord
            if i + 1 < len(sequence):
                next_sub_lord = sequence[i + 1]
            else:
                # Last sub of this nakshatra — next sub is first sub of next nakshatra
                next_nak_lord = NAKSHATRAS[(nakshatra_index + 1) % 27][1]
                next_sub_lord = next_nak_lord  # first sub of any nakshatra is its own lord
            return {
                "current_sub_lord": lord,
                "next_sub_lord": next_sub_lord,
                "prev_sub_lord": prev_sub_lord,
                "deg_to_next_boundary": round(deg_to_next, 4),
                "deg_to_prev_boundary": round(deg_to_prev, 4),
                "deg_to_nearest_boundary": round(min(deg_to_next, deg_to_prev), 4),
            }
        current_position += span
    # Fallback (shouldn't reach here in normal flow)
    return {
        "current_sub_lord": sequence[-1],
        "next_sub_lord": sequence[-1],
        "prev_sub_lord": sequence[-1],
        "deg_to_next_boundary": 0.0,
        "deg_to_prev_boundary": 0.0,
        "deg_to_nearest_boundary": 0.0,
    }


def is_borderline_csl(longitude: float, threshold_deg: float = 0.3) -> bool:
    """True if this longitude is within `threshold_deg` of a sub-lord
    boundary — i.e., a small birth-time error could flip the sub lord.

    KP sensitivity: 0.3 degrees ≈ 1.2 minutes of clock time at the
    average ascendant rate (~15 deg per hour). For a typical user-supplied
    birth time rounded to the nearest minute, longitudes within 0.3°
    of a boundary are at-risk. RULE 37 requires the LLM to acknowledge
    this caveat when this flag fires.
    """
    info = sub_boundary_distance(longitude)
    return info["deg_to_nearest_boundary"] <= threshold_deg


def date_time_to_julian(date: str, time: str, timezone_offset: float = 5.5) -> float:
    """Convert date and time to Julian Day (UTC)."""
    # Always set ayanamsa explicitly — never rely on module-level setting
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    utc_hour = dt.hour + dt.minute / 60 - timezone_offset
    jd = swe.julday(dt.year, dt.month, dt.day, utc_hour)
    return jd


def get_planet_positions(jd: float) -> dict:
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    positions = {}
    # rest of function unchanged
    """Calculate all planet positions with nakshatra, star lord, sub lord."""

    for planet_name, planet_id in PLANETS.items():
        result, _ = swe.calc_ut(jd, planet_id, swe.FLG_SIDEREAL)
        longitude = result[0]

        # Ketu is always 180 degrees from Rahu
        if planet_name == "Rahu":
            ketu_longitude = (longitude + 180) % 360
            nakshatra_info = get_nakshatra_and_starlord(ketu_longitude)
            positions["Ketu"] = {
                "longitude": round(ketu_longitude, 4),
                "sign": get_sign(ketu_longitude),
                "nakshatra": nakshatra_info["nakshatra"],
                "star_lord": nakshatra_info["star_lord"],
                "sub_lord": get_sub_lord(ketu_longitude)
            }

        nakshatra_info = get_nakshatra_and_starlord(longitude)
        positions[planet_name] = {
            "longitude": round(longitude, 4),
            "sign": get_sign(longitude),
            "nakshatra": nakshatra_info["nakshatra"],
            "star_lord": nakshatra_info["star_lord"],
            "sub_lord": get_sub_lord(longitude)
        }

    return positions


def get_house_cusps(jd: float, latitude: float, longitude: float) -> dict:
    """
    Calculate 12 house cusps using Placidus system with KP New ayanamsa.
    Handles intercepted signs correctly.
    """
    # 'P' = Placidus house system
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    cusps, ascmc = swe.houses_ex(
    
        jd, latitude, longitude, b'P', swe.FLG_SIDEREAL
    )

    house_cusps = {}
    for i in range(1, 13):
        cusp_longitude = cusps[i-1]
        nakshatra_info = get_nakshatra_and_starlord(cusp_longitude)
        house_cusps[f"House_{i}"] = {
            "cusp_longitude": round(cusp_longitude, 4),
            "sign": get_sign(cusp_longitude),
            "nakshatra": nakshatra_info["nakshatra"],
            "star_lord": nakshatra_info["star_lord"],
            "sub_lord": get_sub_lord(cusp_longitude)
        }

    return house_cusps


def get_sign(longitude: float) -> str:
    """Return zodiac sign for a given longitude."""
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    return signs[int((longitude % 360) / 30)]


def generate_chart(date: str, time: str, latitude: float,
                   longitude: float, timezone_offset: float = 5.5) -> dict:
    """Main function - generates complete KP chart."""
    jd = date_time_to_julian(date, time, timezone_offset)
    planets = get_planet_positions(jd)
    cusps = get_house_cusps(jd, latitude, longitude)

    return {
        "julian_day": jd,
        "ayanamsa": "KP New (VP291)",
        "house_system": "Placidus",
        "planets": planets,
        "cusps": cusps
    }

# ============================================================
# VIMSHOTTARI DASHA CALCULATION
# ============================================================

# PR A1.3-fix-24 — DASHA_SEQUENCE / DASHA_YEARS / TOTAL_DASHA_YEARS now
# hoisted to the canonical block at top of file. Duplicate definitions
# removed here. Functions below use the same names — Python module-level
# binding makes them visible regardless of definition order at call time.


def get_dasha_balance(moon_longitude: float) -> dict:
    """
    Calculate the balance of dasha remaining at birth
    based on Moon's position in its nakshatra.
    """
    nakshatra_index = int(moon_longitude / NAKSHATRA_SPAN)
    nakshatra_lord = NAKSHATRAS[nakshatra_index % 27][1]

    # How far Moon has traversed in current nakshatra (0 to 1)
    position_in_nakshatra = moon_longitude - (nakshatra_index * NAKSHATRA_SPAN)
    fraction_traversed = position_in_nakshatra / NAKSHATRA_SPAN
    fraction_remaining = 1.0 - fraction_traversed

    # Balance of current dasha in years
    balance_years = DASHA_YEARS[nakshatra_lord] * fraction_remaining

    return {
        "first_dasha_lord": nakshatra_lord,
        "balance_years": round(balance_years, 4)
    }


def calculate_dashas(birth_date: str, birth_time: str,
                     moon_longitude: float, timezone_offset: float = 5.5) -> list:
    """
    Calculate all Mahadasha periods from birth.
    Returns list of dashas with start and end dates.
    """
    from datetime import datetime, timedelta

    # Parse birth datetime
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")

    # Get balance of first dasha
    balance = get_dasha_balance(moon_longitude)
    first_lord = balance["first_dasha_lord"]
    balance_years = balance["balance_years"]

    # Find starting index in dasha sequence
    start_index = DASHA_SEQUENCE.index(first_lord)

    dashas = []
    current_date = dt

    # First dasha — only the balance remaining
    balance_days = balance_years * 365.25
    end_date = current_date + timedelta(days=balance_days)

    dashas.append({
        "lord": first_lord,
        "years": round(balance_years, 2),
        "start": current_date.strftime("%Y-%m-%d"),
        "end": end_date.strftime("%Y-%m-%d"),
        "is_balance": True
    })

    current_date = end_date

    # Remaining dashas in sequence
    for i in range(1, 9):
        lord = DASHA_SEQUENCE[(start_index + i) % 9]
        years = DASHA_YEARS[lord]
        days = years * 365.25
        end_date = current_date + timedelta(days=days)

        dashas.append({
            "lord": lord,
            "years": years,
            "start": current_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
            "is_balance": False
        })

        current_date = end_date

    return dashas


def get_current_dasha(dashas: list) -> dict:
    """
    Find which Mahadasha is currently running.
    """
    # PR A1.3-fix-24 — IST not server-local (see app/services/today.py)
    today = today_ist_str()

    for dasha in dashas:
        if dasha["start"] <= today <= dasha["end"]:
            return dasha

    return dashas[-1]


def calculate_antardashas(mahadasha: dict) -> list:
    """
    Calculate all Antardasha (sub-periods) within a Mahadasha.
    """
    from datetime import datetime, timedelta

    md_lord = mahadasha["lord"]
    md_start = datetime.strptime(mahadasha["start"], "%Y-%m-%d")
    md_end = datetime.strptime(mahadasha["end"], "%Y-%m-%d")
    md_total_days = (md_end - md_start).days

    # Antardasha sequence starts from mahadasha lord
    start_index = DASHA_SEQUENCE.index(md_lord)

    antardashas = []
    current_date = md_start

    for i in range(9):
        ad_lord = DASHA_SEQUENCE[(start_index + i) % 9]

        # Proportion of antardasha within mahadasha
        proportion = DASHA_YEARS[ad_lord] / TOTAL_DASHA_YEARS
        ad_days = md_total_days * proportion
        end_date = current_date + timedelta(days=ad_days)

        antardashas.append({
            "mahadasha_lord": md_lord,
            "antardasha_lord": ad_lord,
            "start": current_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        })

        current_date = end_date

    return antardashas


def get_current_antardasha(antardashas: list) -> dict:
    """Find currently running antardasha."""
    # PR A1.3-fix-24 — IST not server-local (see app/services/today.py)
    today = today_ist_str()

    for ad in antardashas:
        if ad["start"] <= today <= ad["end"]:
            return ad

    return antardashas[-1]


# ============================================================
# RULING PLANETS
# ============================================================

DAY_LORDS = {
    0: "Moon",    # Monday
    1: "Mars",    # Tuesday
    2: "Mercury", # Wednesday
    3: "Jupiter", # Thursday
    4: "Venus",   # Friday
    5: "Saturn",  # Saturday
    6: "Sun"      # Sunday
}


def get_vedic_day_lord(jd: float, latitude: float, longitude: float, timezone_offset: float) -> str:
    """
    Calculate the correct Vedic day lord for a given Julian Day, latitude,
    longitude, and timezone offset.
    A Vedic day begins at local sunrise at the given coordinates, not at midnight.
    """
    import swisseph as swe
    from datetime import datetime, timedelta, timezone as dt_tz
    
    # 1. Convert Julian Day (UT) to local datetime
    unix_seconds = (jd - 2440588.5) * 86400
    dt_utc = datetime(1970, 1, 1, tzinfo=dt_tz.utc) + timedelta(seconds=unix_seconds)
    local_now = dt_utc + timedelta(hours=timezone_offset)
    
    # 2. Compute sunrise of the local civil date
    try:
        from astral import LocationInfo
        from astral.sun import sun as astral_sun
        loc = LocationInfo(latitude=latitude, longitude=longitude)
        s = astral_sun(loc.observer, date=local_now.date())
        sr = s["sunrise"]
        sr_utc = sr.astimezone(dt_tz.utc).replace(tzinfo=None)
        sr_h = sr_utc.hour + sr_utc.minute / 60.0 + sr_utc.second / 3600.0
        sunrise_jd = swe.julday(sr_utc.year, sr_utc.month, sr_utc.day, sr_h)
    except Exception:
        # Fallback to swisseph rise_trans
        local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        utc_midnight = local_midnight - timedelta(hours=timezone_offset)
        jd_midnight = swe.julday(
            utc_midnight.year, utc_midnight.month, utc_midnight.day,
            utc_midnight.hour + utc_midnight.minute / 60.0 + utc_midnight.second / 3600.0
        )
        geopos = (longitude, latitude, 0.0)
        try:
            _, tret = swe.rise_trans(jd_midnight, swe.SUN, b"", 0, 1, geopos, 1013.25, 10.0)
            sunrise_jd = tret[0]
        except Exception:
            # Absolute fallback: 6:00 AM local time
            sr_utc = utc_midnight + timedelta(hours=6.0)
            sunrise_jd = swe.julday(sr_utc.year, sr_utc.month, sr_utc.day, sr_utc.hour + sr_utc.minute / 60.0)

    # 3. If local time of query is strictly before sunrise, day lord is previous civil day
    if jd < sunrise_jd:
        vedic_dt = local_now - timedelta(days=1)
    else:
        vedic_dt = local_now

    return DAY_LORDS[vedic_dt.weekday()]


def get_ruling_planets(
    latitude: float,
    longitude: float,
    timezone_offset: float,
) -> dict:
    """
    PR A1.1f — unified 7-slot KP Ruling Planets system.

    Previously this function returned 5 RPs (Day + Lagna Sign/Star +
    Moon Sign/Star). Horary was upgraded to 7 slots in A1.1c and matched
    ksrinivas.com's mainstream methodology. But the natal workspace
    (Analysis / Chart / Prediction) kept calling this 5-slot version,
    creating an inconsistency where the same chart had different RPs
    depending on which tab surfaced them.

    A1.1f: this function now returns the 7 canonical slots (adds Lagna
    Sub Lord and Moon Sub Lord) AND the full rp_context block
    (slot_assignments / planet_slots / strongest / rp_system) that
    Horary's engine produces. Back-compat keys (ruling_planets list,
    day_lord, *_sign_lord, *_star_lord, query_time) are retained.

    The 7 slots:
      1. Day Lord        — weekday in LOCAL time
      2. Asc Sign Lord   — sign lord of the actual ascendant now
      3. Asc Star Lord   — nakshatra lord of the actual ascendant
      4. Asc Sub Lord    — KP sub lord of the actual ascendant
      5. Moon Sign Lord  — sign lord of Moon's sidereal sign
      6. Moon Star Lord  — nakshatra lord of Moon
      7. Moon Sub Lord   — KP sub lord of Moon

    Ranking: planets filling more slots bubble to the top (ties broken
    by earliest slot index, then name). Strongest = planets in 2+ slots.
    """
    import swisseph as swe
    from datetime import datetime, timedelta, timezone as dt_tz

    utc_now = datetime.now(dt_tz.utc)
    local_now = utc_now + timedelta(hours=timezone_offset)

    jd_now = swe.julday(
        utc_now.year, utc_now.month, utc_now.day,
        utc_now.hour + utc_now.minute / 60 + utc_now.second / 3600,
    )

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # 1. Day lord — Vedic location-aware sunrise check
    day_lord = get_vedic_day_lord(jd_now, latitude, longitude, timezone_offset)

    # 2-4. Actual ascendant at astrologer's lat/lon — Placidus, sidereal
    _, ascmc = swe.houses_ex(jd_now, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    lagna_longitude = ascmc[0]
    lagna_sign_lord = get_sign_lord(lagna_longitude)
    lagna_star_lord = get_nakshatra_and_starlord(lagna_longitude)["star_lord"]
    lagna_sub_lord  = get_sub_lord(lagna_longitude)

    # 5-7. Current Moon
    moon_result, _ = swe.calc_ut(jd_now, swe.MOON, swe.FLG_SIDEREAL)
    moon_longitude = moon_result[0]
    moon_sign_lord = get_sign_lord(moon_longitude)
    moon_star_lord = get_nakshatra_and_starlord(moon_longitude)["star_lord"]
    moon_sub_lord  = get_sub_lord(moon_longitude)

    # 7-slot canonical ordering — same as horary_engine's order.
    slot_assignments = [
        {"slot": "Day Lord",       "planet": day_lord},
        {"slot": "Asc Sign Lord",  "planet": lagna_sign_lord},
        {"slot": "Asc Star Lord",  "planet": lagna_star_lord},
        {"slot": "Asc Sub Lord",   "planet": lagna_sub_lord},
        {"slot": "Moon Sign Lord", "planet": moon_sign_lord},
        {"slot": "Moon Star Lord", "planet": moon_star_lord},
        {"slot": "Moon Sub Lord",  "planet": moon_sub_lord},
    ]
    planet_slots: dict[str, list[str]] = {}
    for a in slot_assignments:
        if not a["planet"]:
            continue
        planet_slots.setdefault(a["planet"], []).append(a["slot"])

    def _rank_key(p: str) -> tuple:
        slots = planet_slots[p]
        first_slot_idx = min(
            i for i, a in enumerate(slot_assignments) if a["planet"] == p
        )
        return (-len(slots), first_slot_idx, p)

    ruling_planets = sorted(planet_slots.keys(), key=_rank_key)
    strongest = [p for p in ruling_planets if len(planet_slots[p]) >= 2]

    return {
        # Back-compat keys retained — zero callers need to change.
        "query_time": local_now.strftime("%Y-%m-%d %H:%M"),
        "day_lord": day_lord,
        "lagna_sign_lord": lagna_sign_lord,
        "lagna_star_lord": lagna_star_lord,
        "moon_sign_lord": moon_sign_lord,
        "moon_star_lord": moon_star_lord,
        "ruling_planets": ruling_planets,

        # Unified rp_context — same shape as horary_engine emits.
        "rp_context": {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "timezone_offset": timezone_offset,
            "local_datetime": local_now.strftime("%Y-%m-%d %H:%M:%S"),
            "utc_datetime": utc_now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "weekday": local_now.strftime("%A"),
            "day_lord": day_lord,
            "actual_lagna_longitude": round(lagna_longitude, 4),
            "actual_lagna_sign": get_sign(lagna_longitude),
            "lagna_sign_lord": lagna_sign_lord,
            "lagna_star_lord": lagna_star_lord,
            "lagna_sub_lord":  lagna_sub_lord,
            "moon_longitude": round(moon_longitude, 4),
            "moon_sign_lord": moon_sign_lord,
            "moon_star_lord": moon_star_lord,
            "moon_sub_lord":  moon_sub_lord,
            "slot_assignments":     slot_assignments,
            "planet_slots":         planet_slots,
            "strongest":            strongest,
            "rp_system":            "7-slot (KSK extended)",
        },
    }


def get_sign_lord(longitude: float) -> str:
    """Return the lord of the sign for a given longitude."""
    sign_lords = [
        "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
        "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
    ]
    sign_index = int(longitude / 30)
    return sign_lords[sign_index]

# ============================================================
# SIGNIFICATOR CALCULATION
# ============================================================

# Which sign each planet rules
SIGN_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

# ════════════════════════════════════════════════════════════════════
# TOPIC-TO-HOUSE MAPPING — CANONICAL SOURCE OF TRUTH (PR A2.0a)
# ════════════════════════════════════════════════════════════════════
#
# Previously the codebase had THREE conflicting topic-to-house dicts:
#   1. chart_engine.HOUSE_TOPICS (relevant houses, first = primary cusp)
#   2. csl_chains.TOPIC_HOUSE_MAP (relevant + denial + primary_cusp)
#   3. kp_advanced_compute.TOPIC_DENIAL (denial-only list)
# They disagreed on 13 of 15 topics — health was OPPOSITE framing, litigation
# had the LOSS set marked as "relevant", business had two different primary
# cusps, etc. (see .claude/research/pre-pr-findings-2026-05-22.md).
#
# PR A2.0a makes TOPIC_HOUSE_MAP_CANONICAL below the SINGLE source of truth.
# HOUSE_TOPICS (legacy shape used by check_promise + kp_advanced_compute) is
# now DERIVED from this canonical map. csl_chains.TOPIC_HOUSE_MAP and
# kp_advanced_compute.TOPIC_DENIAL also derive from this map.
#
# Editing rules:
#   - Add new topics HERE only, in TOPIC_HOUSE_MAP_CANONICAL.
#   - Document the framing ("what question does this answer?") explicitly.
#   - For relevant/denial sets cite the KP source (KSK Reader / KP Astrology
#     Learning page / etc.) in the inline comment.
#   - For topic name variants (career/job/profession), add to TOPIC_ALIASES
#     instead of duplicating the data.

TOPIC_HOUSE_MAP_CANONICAL: dict = {

    # ── MARRIAGE FAMILY ─────────────────────────────────────────────
    "marriage": {
        "relevant": {2, 7, 11}, "denial": {1, 6, 10, 12}, "primary_cusp": 7,
        "framing": "Will marriage happen / be promised?",
        # KSK Reader I-II §marriage — H7 spouse gate, H2 family, H11 desire fulfilled
    },
    "divorce": {
        "relevant": {6, 10, 12}, "denial": {2, 7, 11}, "primary_cusp": 6,
        "framing": "Will marriage END (separation / divorce)?",
        # divorce.txt + KSK doctrine — H6 dispute, H10 formal end (public), H12 physical separation
        # Denial = marriage relevant set (reconciliation = denial of divorce)
    },

    # ── CAREER / WORK ───────────────────────────────────────────────
    "job": {
        "relevant": {2, 6, 10, 11}, "denial": {1, 5, 9, 12}, "primary_cusp": 10,
        "framing": "Will job/service-employment fire / be promoted?",
        # KSK Simple Rules — H10 primary (career gate), denial = 12th-from-each
    },
    "business": {
        "relevant": {2, 7, 10, 11}, "denial": {1, 6, 9, 12}, "primary_cusp": 10,
        "framing": "Will business venture succeed?",
        # KSK doctrine: H10 is the profession gate; H7 is partnerships/public dealings
        # CHANGED from legacy chart_engine primary=7 (which conflated business with marriage gate)
        # KP Astrology Learning H10: "If H10 sub lord signifies 7 → profession is business"
    },

    # ── WEALTH / MONEY ──────────────────────────────────────────────
    "wealth": {
        "relevant": {2, 6, 11}, "denial": {1, 8, 12}, "primary_cusp": 2,
        "framing": "Will wealth accumulate?",
        # KSK STRICT — wealth is 2/6/11 (NOT 2/6/10/11)
        # CHANGED from legacy chart_engine which incorrectly included H10
        # H10 is for PROFESSION (career), NOT for wealth ACCUMULATION (per other_topics.txt §4)
        # Denial = 12th-from-H2 (loss of wealth) + H8 (debt) + H12 (loss/expenditure)
    },
    "money_recovery": {
        "relevant": {2, 6, 11}, "denial": {1, 5, 8, 12}, "primary_cusp": 6,
        "framing": "Will I recover lent money / partner fraud / theft?",
        # NEW canonical topic (PR A2.0b).
        # KP Astrology Learning H6 page (verbatim):
        #   "Retrieving Trapped Money: 6th cusp's sub lord to signify 2, 6, and 11,
        #    excluding Saturn → entangled money returned"
        #   "Monetary Receipts: H6 sub lord signifies 2, 6, 11 → desired monetary receipts foreseen"
        #   "Saturn connected to H6 sub lord → money recovery difficulty"
        # H6 = primary recovery mechanism (legal channel, dispute resolution)
        # H2 = the money/asset owed; H11 = realised gain (money actually arrives)
        # Denial: H1 (12th-from-H2 = loss), H5 (12th-from-H6 = no-recovery channel),
        #   H8 (obstacle/sudden loss), H12 (total loss/foreign-hidden)
        # Saturn-on-H6-CSL is a planetary modifier, not a house modifier — flagged in prompt
        # Applies to: lent money recovery, partner-cheating recovery, theft funds,
        #   refunds owed, EMI defaults to you, alimony, debt collection
    },

    # ── EDUCATION ───────────────────────────────────────────────────
    "education": {
        "relevant": {4, 9, 11}, "denial": {3, 8, 10, 12}, "primary_cusp": 4,
        "framing": "Will basic/school-level education complete?",
        # KSK Reader — H4 primary for schooling, H9 for higher learning, H11 fulfillment
        # CHANGED from legacy chart_engine primary=9 (that's the higher-learning framing)
        # Denial: H3 (break in study), H8 (interruption), H10 (status without education), H12 (interruption)
    },
    "education_higher": {
        "relevant": {4, 9, 11}, "denial": {3, 8, 10, 12}, "primary_cusp": 9,
        "framing": "Will higher education (college/research/PhD) complete?",
        # KSK Reader — H9 primary for research/doctorate
    },

    # ── HEALTH ──────────────────────────────────────────────────────
    "health": {
        "relevant": {1, 5, 11}, "denial": {6, 8, 12}, "primary_cusp": 1,
        "framing": "Will I be healthy / recover from illness?",
        # WELLNESS framing — H1 self/vitality, H5 = 12th-from-6 (no-disease/recovery),
        # H11 fulfillment of health desire
        # CHANGED from legacy chart_engine which had DISEASE framing relevant={6,8,12}
        # For "will disease come?" framing, see "disease_risk" topic below.
    },
    "disease_risk": {
        "relevant": {6, 8, 12}, "denial": {1, 5, 11}, "primary_cusp": 6,
        "framing": "Will disease come / hospitalization risk?",
        # The OLD legacy chart_engine HEALTH framing — preserved here under correct name
        # so questions like "am I going to fall ill?" still get the right house set.
    },
    "longevity": {
        "relevant": {1, 5, 9, 10}, "denial": {2, 7, 12}, "primary_cusp": 1,
        "framing": "Longevity assessment (own / spouse / parent / child) — TIER 3 ABSOLUTE",
        # NEW PR B2.0a — Per KSK doctrine + Divine Creation India "How to Judge
        # Longevity - KP":
        #   - H1 sub lord signifies H1/H5/H9/H10 -> Poornyash (long life 66+)
        #   - H1 sub lord signifies H12 -> Alpayash (short life ≤33)
        #   - H1 sub lord signifies H6/H8/H12 with Maraka/Badhaka involvement
        #     -> very short / accidental
        # Maraka houses (death-inflicting): H12 (12th from H1), H7 (12th from H8),
        #   H2 (12th from H3) — denial set
        # Badhaka by sign type — applied per chart
        # RULE 15 ABSOLUTE: never predict death dates. This topic gates Tier 3
        # protective framing in sensitivity_tiers.md.
    },
    "suicide_risk": {
        "relevant": {6, 8, 12}, "denial": {1, 5, 9, 11}, "primary_cusp": 8,
        "framing": "Suicide ideation / self-harm risk — TIER 3 ABSOLUTE (crisis)",
        # NEW PR B2.0a — Per Vedic + KP doctrine:
        #   - H8 sub lord in star of planet connecting to Maraka/Badhaka/H8/Mars
        #     = structural risk indicator
        #   - Moon-Saturn-Mars affliction + H12 = mental burden + escape behavior
        # ABSOLUTE: never predict suicide dates. Always recommend crisis
        # resources (988 in US, iCall in India). Framing per mental_health.md §3.
        # This is the highest-sensitivity topic in the entire system.
    },
    "addiction": {
        "relevant": {6, 8, 12}, "denial": {1, 5, 9, 11}, "primary_cusp": 12,
        "framing": "Substance addiction / dependency — TIER 2-3",
        # NEW PR B2.0a — Per KP + Vedic doctrine:
        #   - Rahu primary (anxiety/escape), Mars secondary (impulse), Saturn
        #     tertiary (chronic dependency)
        #   - H12 (escape) + H6 (health damage) + H2 (mouth/throat consumption)
        #   - Jupiter strong = recovery potential antidote
    },
    "child_illness": {
        "relevant": {2, 5, 11}, "denial": {1, 4, 7, 10}, "primary_cusp": 5,
        "framing": "Child's illness via parent's chart (Bhavat Bhavam) — TIER 3 ABSOLUTE",
        # NEW PR B2.0a — Reading child's health via parent's chart:
        #   - Child's H1 = native's H5 (child's body)
        #   - Child's H6 = native's H10 (child's disease — 6th from 5th)
        #   - Child's H8 = native's H12 (child's longevity stress)
        # Apply RULE 13 Bhavat Bhavam + confidence floor ~70%.
        # CRITICAL: recommend child's own birth data for 95%+ precision.
        # The relevant/denial set here is for the "child PROMISE + flourishing"
        # framing; for "child's DISEASE coming" use child_disease (separate
        # topic if added later).
    },
    "congenital_conditions": {
        "relevant": {5, 8, 12}, "denial": {1, 4, 9, 11}, "primary_cusp": 5,
        "framing": "Congenital / genetic condition diagnosis — TIER 3 ABSOLUTE",
        # NEW PR B2.0a — Congenital conditions via H5 + H8 + H12 affliction in
        # mother's chart (typically), with malefic involvement (Mars/Saturn/Rahu/Ketu).
        # Read via parent's chart with Bhavat Bhavam. Highly sensitive — applies
        # maximum Tier 3 framing.
    },
    "pregnancy_complications": {
        "relevant": {5, 11}, "denial": {1, 4, 8, 12}, "primary_cusp": 5,
        "framing": "Pregnancy complications / miscarriage risk — TIER 2-3",
        # NEW PR B2.0a — Per KP doctrine:
        #   - H5 sub lord + Jupiter affliction + Mars/Saturn conjunction on H5
        #     = miscarriage risk
        #   - H8 affliction = C-section / high-risk pregnancy / delivery delay
        #   - Multiple miscarriages: H5 lord severely afflicted in D1 + D9
    },
    "mental_health": {
        "relevant": {1, 4, 5, 9}, "denial": {6, 8, 12}, "primary_cusp": 1,
        "framing": "Mental health / emotional wellbeing — TIER 2 default / TIER 3 escalators",
        # NEW PR B2.0a — Per KP doctrine:
        #   - H1 (self), H4 (inner peace), H5 (joy/creativity), H9 (dharma) = wellness
        #   - H6 (disease), H8 (transformation/trauma), H12 (hidden burden) = denial
        # Moon condition critical: afflicted Moon + Saturn/Rahu = depression/anxiety
        # Mercury affliction = OCD/communication
        # Tier 3 escalators: suicide, kill myself, end it, no reason to live
    },

    # ── CHILDREN / FERTILITY ────────────────────────────────────────
    "children": {
        "relevant": {2, 5, 11}, "denial": {1, 4, 7, 10}, "primary_cusp": 5,
        "framing": "Will children come / fertility?",
        # KSK Reader — H5 children, H2 family birth, H11 fulfillment of desire
        # Denial = 12th-from-each + H7 (legacy TOPIC_DENIAL was missing H7)
    },

    # ── PROPERTY / VEHICLE ──────────────────────────────────────────
    "property": {
        "relevant": {4, 11, 12}, "denial": {3, 5, 6, 8}, "primary_cusp": 4,
        "framing": "Will property acquisition happen?",
        # KSK — H4 primary (immovable), H11 gain, H12 investment outflow
        # Denial = 12th-from-each (H3 from H4, H6 from H11, etc.)
        # CHANGED from legacy TOPIC_DENIAL=[3] which was too narrow
    },

    # ── FOREIGN ─────────────────────────────────────────────────────
    "foreign_travel": {
        "relevant": {3, 9, 12}, "denial": {2, 4, 11}, "primary_cusp": 9,
        "framing": "Will I travel abroad (short journey)?",
        # H9 primary for long journeys (KSK)
    },
    "foreign_settle": {
        "relevant": {3, 9, 12}, "denial": {2, 4, 11}, "primary_cusp": 12,
        "framing": "Will I settle abroad (long-term)?",
        # H12 primary for foreign land settlement (KSK)
    },

    # ── LITIGATION ──────────────────────────────────────────────────
    "litigation": {
        "relevant": {6, 11}, "denial": {7, 8, 12}, "primary_cusp": 6,
        "framing": "Will I WIN the court case?",
        # WIN framing (KP Astrology Learning H6): H6 dispute, H11 victory
        # Denial: H7 (opponent prevails), H8 (obstacle/stress), H12 (loss)
        # CHANGED from legacy chart_engine which had LOSS framing relevant={6,8,12}
    },
    "litigation_loss": {
        "relevant": {7, 8, 12}, "denial": {6, 11}, "primary_cusp": 7,
        "framing": "Will I LOSE the court case (opponent prevails)?",
        # Reverse framing — useful for "what's my risk of losing" questions
    },

    # ── RELATIVES (Bhavat Bhavam via primary cusp) ───────────────────
    "father": {
        "relevant": {9, 10}, "denial": {3, 4}, "primary_cusp": 9,
        "framing": "Father's matters (status, health, support)",
        # H9 = father (KP), H10 = father's status
        # Denial: H3 = 8th-from-8 + minor stressor, H4 = 8th-from-9 (father's longevity stress)
        # NEW in canonical map — was only in legacy chart_engine
    },
    "mother": {
        "relevant": {4, 10}, "denial": {3, 9}, "primary_cusp": 4,
        "framing": "Mother's matters (status, health, support)",
        # H4 = mother (KP), H10 = 7th-from-4 (mother's partner / father, contextual)
        # Denial: H3 = 12th-from-4, H9 = 6th-from-4 (mother's stress / illness)
        # NEW in canonical map
    },
    "siblings": {
        "relevant": {3, 11}, "denial": {9, 12}, "primary_cusp": 3,
        "framing": "Siblings' matters / sibling relationships",
        # H3 primary (KP)
        # NEW in canonical map
    },

    # ── SPIRITUALITY / PERSONALITY ──────────────────────────────────
    "spirituality": {
        "relevant": {9, 8, 12}, "denial": {2, 3, 11}, "primary_cusp": 9,
        "framing": "Spiritual progress / dharma / moksha",
        # H9 dharma, H8 occult, H12 moksha
        # Denial: material-attachment houses (H2 wealth, H3 ego/effort, H11 worldly desire)
    },
    "personality": {
        "relevant": {1, 5, 9}, "denial": {6, 8, 12}, "primary_cusp": 1,
        "framing": "Self / personality / character",
        # H1 self primary, H5 intellect/creativity, H9 dharma
    },

    # ── BATCH 3 (PR B3.0a — relationships beyond immediate marriage) ──
    "second_marriage": {
        "relevant": {2, 9, 11}, "denial": {6, 8, 12}, "primary_cusp": 2,
        "framing": "Second marriage / remarriage / after divorce or widowhood",
        # NEW PR B3.0a — Per K.S. Krishnamurti doctrine:
        #   "Second marriage is seen from H2 (= 8th from H7 = after first
        #    marriage ends) plus H9 (= 3rd from H7 = next partnership)
        #    plus H11 (= fulfillment of new bond)"
        # Per Prof. Krishnamurti: "if H7 sub-lord is Mercury or in dual sign
        # or deposited in star of planet in dual sign, more than one marriage."
        # Widowhood-remarriage: H8 affliction (loss of first spouse) + H9
        # favorable (next partnership) + H11 (desire fulfilled) + Jupiter favorable
    },
    "spouse_character": {
        "relevant": {7, 2, 11}, "denial": {1, 6, 10, 12}, "primary_cusp": 7,
        "framing": "What kind of spouse / partner profile",
        # NEW PR B3.0a — Same houses as marriage (H7 primary) but framing
        # is about PARTNER CHARACTER not marriage timing. Partner-profile
        # engine helper (compute_partner_profile in kp_advanced_compute.py)
        # populates the data; this topic routes the question correctly.
    },
    "in_laws": {
        "relevant": {2, 7, 11}, "denial": {1, 6, 10, 12}, "primary_cusp": 7,
        "framing": "Relationships with spouse's family (in-laws)",
        # NEW PR B3.0a — Read via H7 (spouse) Bhavat Bhavam:
        #   In-laws (spouse's parents) = H10 (= 4th from H7) and H4 (= 10th from H7)
        #   Mother-in-law = H10 (4th from spouse H7)
        #   Father-in-law = H4 (10th from spouse H7 = 9th of spouse)
        #   In-law family dynamics = H7 + H4 + H10 + H11 (family gain)
    },
    "siblings_relationship": {
        "relevant": {3, 11}, "denial": {9, 12}, "primary_cusp": 3,
        "framing": "Sibling relationships (rivalry, support, contact)",
        # NEW PR B3.0a — H3 primary for siblings (KP); H11 for friendship
        # bond with siblings. Distinct from siblings (general topic) which
        # is for any sibling-related question.
    },
    "parents_relationship": {
        "relevant": {4, 9, 11}, "denial": {3, 8, 12}, "primary_cusp": 4,
        "framing": "Relationships with parents (mother + father + support)",
        # NEW PR B3.0a — H4 (mother + emotional security) + H9 (father +
        # dharma) + H11 (family fulfillment). Distinct from
        # parent_longevity which routes to longevity.md.
    },
    "adoption": {
        "relevant": {2, 5, 9, 11}, "denial": {1, 4, 7, 10}, "primary_cusp": 5,
        "framing": "Adopting a child / blended family child relationships",
        # NEW PR B3.0a — H5 (child / adopted child = same H5) + H9 (legal
        # paperwork + dharmic act) + H11 (family fulfillment) + H2 (family
        # expansion). Per KSK doctrine: H5 sub lord signifying H4+H8+H12
        # connected to Jupiter/Saturn/Mercury/Mars/Moon = "denied biological
        # children will adopt" — adoption fulfills the H5 promise.
    },
    "blended_family": {
        "relevant": {2, 5, 11}, "denial": {6, 7, 12}, "primary_cusp": 5,
        "framing": "Step-children / blended-family dynamics",
        # NEW PR B3.0a — Modern context. Same H5 cluster (children) but
        # H7 weak (previous-marriage residue) + H11 (new-family bond) +
        # H2 (combined family wealth/structure).
    },

    # ── BATCH 4 (PR B4.0a — Property / Foreign / Vehicle / Pilgrimage / Visa) ──
    "visa": {
        "relevant": {3, 9, 11, 12}, "denial": {2, 4, 7}, "primary_cusp": 12,
        "framing": "Visa application / approval / type / appeal",
        # NEW PR B4.0a — Per KP doctrine on foreign:
        #   H12 = foreign land + paperwork to enter
        #   H9 = long journey + dharmic move
        #   H11 = fulfillment of desire (visa approved)
        #   H3 = short journey + courage to apply
        # Denial: H2 stay-at-home wealth pulls, H4 home pull, H7 partner blocks
        # Different visa types may emphasize different houses (work=H10+H12,
        # student=H4/H9+H12, business=H7+H12, PR=H12+H4 for new home, etc.)
    },
    "pilgrimage": {
        "relevant": {9, 12, 5}, "denial": {2, 7, 11}, "primary_cusp": 9,
        "framing": "Religious/spiritual journey, Char Dham, Hajj, Vatican, sacred sites",
        # NEW PR B4.0a — Per KP doctrine:
        #   H9 = dharma + religious journey + father's blessing
        #   H12 = foreign-to-home setting + spiritual liberation
        #   H5 = devotion + heart-based engagement + bhakti
        # Denial: H2 family-tie pulls, H7 partner not-supportive, H11
        #   worldly-desire competing
        # Specifically for pilgrimage (not general spirituality which uses
        # different H9/H8/H12 framing in spirituality canonical)
    },

    # ── BATCH 5 (PR B5.0a — Spiritual / Occult / Fame / Politics / Sports /
    #   Missing person / Decision support) ──
    "occult": {
        "relevant": {8, 12, 9}, "denial": {1, 5, 11}, "primary_cusp": 8,
        "framing": "Occult / black magic / drishti / spiritual attack / protection",
        # NEW PR B5.0a — Per KP doctrine:
        #   H8 = hidden / occult / sudden transformation / mysteries
        #   H12 = hidden enemies / curses / negative energies / isolation
        #   H9 = guru / spiritual protection / dharma (positive side)
        # Denial: H1 (self-protection), H5 (devotional immunity),
        #   H11 (community support against negativity)
        # Tier 2-3 because culturally-sensitive; never confirm "yes you
        # are cursed" — frame as structural caution + recommend
        # both spiritual + psychological evaluation
    },
    "fame": {
        "relevant": {10, 11, 1, 5}, "denial": {6, 8, 12}, "primary_cusp": 10,
        "framing": "Public recognition / celebrity / influence / status",
        # NEW PR B5.0a — Per KP doctrine:
        #   H10 = profession / public status / authority
        #   H11 = mass-following / large audience / community
        #   H1 = self-projection / personality
        #   H5 = entertainment / creative platform
        # Sun + Jupiter karakas. Note: "fame" was previously a topic alias
        # routing to general.txt — now elevated to canonical with proper
        # houses.
    },
    "politics": {
        "relevant": {10, 11, 7}, "denial": {6, 8, 12}, "primary_cusp": 10,
        "framing": "Politics / election / public office / activism",
        # NEW PR B5.0a — Per KP doctrine:
        #   H10 = authority + public status
        #   H11 = public/mass support + electoral win = fulfillment
        #   H7 = the public + opponents
        # Denial: H6 (defeat), H8 (sudden setback), H12 (loss to opponent)
        # Sun (king-karaka) + Jupiter (political wisdom) + Mars (campaign-
        # energy) all relevant
    },
    "sports": {
        "relevant": {5, 6, 11}, "denial": {8, 12}, "primary_cusp": 5,
        "framing": "Sports / athletic competition / game result",
        # NEW PR B5.0a — Per KP doctrine:
        #   H5 = sports (entertainment / play / speculation)
        #   H6 = competition (overcoming opponents)
        #   H11 = winning (gain from competition)
        # Mars (energy/aggression) + Sun (championship/victory) +
        # Mercury (skill/strategy) karakas. Different sports
        # emphasize different planets (cricket = Mercury+Mars; chess =
        # Mercury alone; combat = Mars; athletics = Mars+Sun).
    },
    "missing_person": {
        "relevant": {3, 9, 12}, "denial": {1, 4, 11}, "primary_cusp": 12,
        "framing": "Missing person / lost object / Prashna (horary)",
        # NEW PR B5.0a — KP Prashna doctrine for missing items/people:
        #   H12 = hidden / lost / out-of-reach
        #   H3 = short-journey-away (within neighborhood)
        #   H9 = long-journey-away (far / abroad)
        # Denial = found: H1 (self-found / returns home), H4 (returns
        # to home setting), H11 (recovery/fulfillment of finding)
        # The Prashna chart is cast at the moment of the question; this
        # framework reads native's chart for ongoing missing-context.
    },
    "decision": {
        "relevant": {1, 5, 9, 10, 11}, "denial": {6, 8, 12}, "primary_cusp": 1,
        "framing": "Decision support — 'should I do X' / choosing between options",
        # NEW PR B5.0a — Per RULE 29 (decision support framework):
        #   H1 = self / agency
        #   H5 + H9 = intellect + dharma (wisdom of decision)
        #   H10 + H11 = career/gain implication of decision
        # Denial: H6/H8/H12 = obstacles to clear decision
        # This is a META-topic: actual decision content uses the
        # underlying topic (career/marriage/business/etc.) PLUS this
        # decision-support overlay.
    },
}

# Topic name aliases — resolve to canonical topic name in TOPIC_HOUSE_MAP_CANONICAL
TOPIC_ALIASES: dict = {
    # ── Career cluster ──
    "career":           "job",
    "profession":       "job",
    "service":          "job",
    "employment":       "job",
    "job_employment":   "job",
    "layoff":           "job",            # PR A2.0b — fired/let-go scenarios
    "retirement":       "job",            # PR A2.0b
    "resignation":      "job",            # PR A2.0b

    # ── Business cluster ──
    "career_business":  "business",
    "startup":          "business",
    "venture":          "business",
    "self_employment":  "business",
    "partnership":      "business",       # PR A2.0b — partnership setup

    # ── Wealth cluster ──
    "finance":          "wealth",
    "money":            "wealth",
    "loan":             "wealth",         # PR A2.0b — taking/giving loan, H6+H2+H11
    "debt":             "wealth",         # PR A2.0b
    "emi":              "wealth",         # PR A2.0b
    "salary":           "wealth",         # PR A2.0b — salary growth context
    "salary_growth":    "wealth",         # PR A2.0b
    "income":           "wealth",         # PR A2.0b
    "investment":       "wealth",         # PR A2.0b
    "bankruptcy":       "wealth",         # PR A2.0b

    # ── Money recovery cluster (PR A2.0b — NEW canonical money_recovery) ──
    "theft":            "money_recovery", # NEW — recovery of stolen funds
    "refund":           "money_recovery", # NEW — money owed to be returned
    "lent_money":       "money_recovery", # NEW — money you lent
    "partner_cheated":  "money_recovery", # NEW — business partner fraud recovery
    "fraud":            "money_recovery", # NEW — fraud recovery
    "embezzlement":     "money_recovery", # NEW

    # ── Marriage cluster ──
    "spouse":           "marriage",
    "second_marriage":  "marriage",       # PR A2.0b — H7+H9+H11 nuance still applies

    # ── Children cluster ──
    "fertility":        "children",

    # ── Relatives ──
    "parents":          "father",          # rough default; specific Q routes to father/mother
    "in_laws":          "marriage",        # PR A2.0b — spouse resolves to marriage; use direct
    "in_laws_health":   "marriage",        # PR A2.0b — uses Bhavat Bhavam from H7 (spouse house)
    "sibling_rivalry":  "siblings",        # PR A2.0b
    "brother":          "siblings",
    "sister":           "siblings",

    # ── Foreign cluster ──
    "foreign":          "foreign_travel",   # default foreign → travel
    "immigration":      "foreign_settle",
    "settlement":       "foreign_settle",
    "abroad":           "foreign_travel",   # PR A2.0b

    # ── Litigation cluster ──
    "court_case":       "litigation",
    "lawsuit":          "litigation",
    "appeal":           "litigation",
    "civil_case":       "litigation",       # PR A2.0b
    "criminal_case":    "litigation",       # PR A2.0b — caveat: high sensitivity
    "land_dispute":     "litigation",       # PR A2.0b

    # ── Health cluster ──
    "recovery":         "health",           # PR A2.0b — recovering from illness
    "hospitalization":  "disease_risk",     # PR A2.0b — being hospitalized = disease question
    "surgery":          "disease_risk",     # PR A2.0b
    "accident_risk":    "disease_risk",     # PR A2.0b
    "icu":              "disease_risk",     # PR B2.0a — ICU = critical disease
    "critical_care":    "disease_risk",     # PR B2.0a
    "discharge":        "recovery",         # PR B2.0a — discharge = recovery question

    # ── Longevity + Tier 3 cluster (PR B2.0a) ──
    "death_timing":     "longevity",        # any "when will X die" → longevity (NEVER predict dates)
    "spouse_longevity": "longevity",
    "parent_longevity": "longevity",
    "father_longevity": "longevity",
    "mother_longevity": "longevity",
    "child_longevity":  "longevity",        # via Bhavat Bhavam from H5
    "will_i_live":      "longevity",
    "how_long":         "longevity",
    "outlive":          "longevity",

    # ── Mental health cluster (PR B2.0a) ──
    "depression":       "mental_health",
    "anxiety":          "mental_health",
    "bipolar":          "mental_health",
    "schizophrenia":    "mental_health",
    "ocd":              "mental_health",
    "ptsd":             "mental_health",
    "panic":            "mental_health",
    "suicide":          "suicide_risk",      # CRITICAL — distinct topic
    "self_harm":        "suicide_risk",
    "kill_myself":      "suicide_risk",

    # ── Child illness / congenital (PR B2.0a) ──
    "child_disease":    "child_illness",
    "child_surgery":    "child_illness",
    "newborn_health":   "child_illness",
    "infant_illness":   "child_illness",
    "birth_defect":     "congenital_conditions",
    "genetic_disorder": "congenital_conditions",
    "down_syndrome":    "congenital_conditions",
    "autism":           "congenital_conditions",
    "heart_defect":     "congenital_conditions",

    # ── Pregnancy cluster (PR B2.0a) ──
    "miscarriage":      "pregnancy_complications",
    "abortion":         "pregnancy_complications",
    "c_section":        "pregnancy_complications",
    "high_risk_pregnancy": "pregnancy_complications",
    "delivery":         "pregnancy_complications",

    # ── BATCH 3 aliases (PR B3.0a — relationships) ──
    "remarriage":              "second_marriage",
    "third_marriage":          "second_marriage",
    "widowhood_remarriage":    "second_marriage",
    "after_divorce":           "second_marriage",
    "spouse_profile":          "spouse_character",
    "partner_character":       "spouse_character",
    "what_kind_of_spouse":     "spouse_character",
    "future_spouse":           "spouse_character",
    "mother_in_law":           "in_laws",
    "father_in_law":           "in_laws",
    "sister_in_law":           "in_laws",
    "brother_in_law":          "in_laws",
    "sas_bahu":                "in_laws",       # Indian cultural context
    "sibling_rivalry":         "siblings_relationship",
    "brother_relationship":    "siblings_relationship",
    "sister_relationship":     "siblings_relationship",
    "parent_relationship":     "parents_relationship",
    "mother_relationship":     "parents_relationship",
    "father_relationship":     "parents_relationship",
    "estranged_parent":        "parents_relationship",
    "adopting":                "adoption",
    "adopt_child":             "adoption",
    "step_children":           "blended_family",
    "step_parent":             "blended_family",
    "step_family":             "blended_family",

    # ── BATCH 4 aliases (PR B4.0a — property/foreign/vehicle/pilgrimage/visa) ──
    # Visa cluster
    "visa_application":       "visa",
    "visa_approval":          "visa",
    "visa_rejection":         "visa",
    "visa_appeal":            "visa",
    "work_visa":              "visa",
    "h1b":                    "visa",        # USA work visa
    "student_visa":           "visa",
    "f1_visa":                "visa",        # USA student visa
    "tourist_visa":           "visa",
    "business_visa":          "visa",
    "pr_visa":                "foreign_settle",  # PR = permanent residency
    "green_card":             "foreign_settle",  # USA permanent residency
    "citizenship":            "foreign_settle",
    "passport":               "visa",

    # Pilgrimage cluster
    "religious_journey":      "pilgrimage",
    "spiritual_journey":      "pilgrimage",
    "char_dham":              "pilgrimage",   # 4-pilgrimage Hindu circuit
    "amarnath":               "pilgrimage",
    "vaishno_devi":           "pilgrimage",
    "tirupati":               "pilgrimage",
    "sabarimala":             "pilgrimage",
    "hajj":                   "pilgrimage",   # Muslim pilgrimage
    "umrah":                  "pilgrimage",
    "vatican":                "pilgrimage",   # Catholic pilgrimage
    "kailash":                "pilgrimage",
    "tirth_yatra":            "pilgrimage",

    # Property cluster (refined)
    "buying_property":        "property",
    "selling_property":       "property",
    "property_dispute":       "land_dispute", # → litigation.txt
    "real_estate":            "property",
    "home_loan":              "property",
    "mortgage":               "property",
    "construction":           "property",
    "house_construction":     "property",
    "land_purchase":          "property",
    "flat_purchase":          "property",
    "apartment":              "property",
    "rental":                 "property",
    "tenant":                 "property",
    "landlord":               "property",
    "property_inheritance":   "property",
    "ancestral_property":     "property",

    # Vehicle cluster (refined)
    "car_purchase":           "vehicle",
    "bike_purchase":          "vehicle",
    "scooter":                "vehicle",
    "motorbike":              "vehicle",
    "two_wheeler":            "vehicle",
    "four_wheeler":           "vehicle",
    "commercial_vehicle":     "vehicle",
    "vehicle_loan":           "vehicle",
    "vehicle_insurance":      "vehicle",
    "used_car":               "vehicle",
    "new_car":                "vehicle",

    # Foreign cluster (refined)
    "foreign_job":            "foreign_travel",   # ambiguous — short or long
    "foreign_education":      "education_higher",  # routes to education
    "foreign_business":       "business",          # routes to business
    "foreign_property":       "property",          # routes to property
    "return_from_abroad":     "foreign_travel",
    "deportation":            "foreign_travel",
    "expat":                  "foreign_settle",

    # ── BATCH 5 aliases (PR B5.0a) ──
    # Occult cluster
    "black_magic":            "occult",
    "drishti":                "occult",
    "evil_eye":               "occult",
    "nazar":                  "occult",
    "curse":                  "occult",
    "spell":                  "occult",
    "tantric":                "occult",
    "exorcism":               "occult",
    "spirits":                "occult",
    "ghost":                  "occult",
    "negative_energy":        "occult",
    "protection_mantra":      "occult",

    # Fame cluster
    "celebrity":              "fame",
    "famous":                 "fame",
    "public_recognition":     "fame",
    "social_media_fame":      "fame",
    "influencer":             "fame",
    "actor":                  "fame",
    "youtuber":               "fame",
    "creative_career":        "fame",
    "performer":              "fame",

    # Politics cluster
    "election":               "politics",
    "election_result":        "politics",
    "election_win":           "politics",
    "elections":              "politics",
    "public_office":          "politics",
    "minister":               "politics",
    "mayor":                  "politics",
    "mla":                    "politics",
    "mp":                     "politics",
    "activism":               "politics",
    "political_career":       "politics",

    # Sports cluster
    "sport":                  "sports",
    "athletics":              "sports",
    "cricket":                "sports",
    "football":               "sports",
    "tennis":                 "sports",
    "chess":                  "sports",
    "olympics":               "sports",
    "boxing":                 "sports",
    "martial_arts":           "sports",
    "race":                   "sports",
    "tournament":             "sports",
    "match_result":           "sports",
    "athlete":                "sports",

    # Missing person + lost objects (Prashna)
    "lost_object":            "missing_person",
    "lost_item":              "missing_person",
    "lost_wallet":            "missing_person",
    "lost_phone":             "missing_person",
    "lost_jewelry":           "missing_person",
    "missing":                "missing_person",
    "kidnapping":             "missing_person",   # extreme variant
    "runaway":                "missing_person",
    "where_is":               "missing_person",
    "prashna":                "missing_person",   # KP Prashna horary
    "horary_lost":            "missing_person",

    # Decision support
    "should_i":               "decision",
    "good_idea":              "decision",
    "right_choice":           "decision",
    "choose_between":         "decision",
    "decision_help":          "decision",
    "what_to_do":             "decision",

    # ── Addiction cluster (PR B2.0a) ──
    "alcohol":          "addiction",
    "alcoholism":       "addiction",
    "drugs":            "addiction",
    "substance":        "addiction",
    "smoking":          "addiction",
    "gambling_addiction": "addiction",

    # ── Property / vehicle ──
    "vehicle":          "property",         # PR A2.0b — H4 + Venus
    "vehicle_purchase": "property",         # PR A2.0b

    # ── Education ──
    "study_abroad":     "education_higher", # PR A2.0b
    "phd":              "education_higher", # PR A2.0b
    "exam":             "education",        # PR A2.0b
}


def resolve_topic_alias(topic: str) -> str:
    """Resolve a topic name alias to its canonical name in TOPIC_HOUSE_MAP_CANONICAL.

    Returns the topic unchanged if it's already canonical, or if not in either
    the alias map or canonical map (caller deals with unknown topics).
    """
    t = (topic or "").lower().strip()
    if t in TOPIC_HOUSE_MAP_CANONICAL:
        return t
    return TOPIC_ALIASES.get(t, t)


def get_topic_data(topic: str) -> dict | None:
    """Get the full {relevant, denial, primary_cusp, framing} dict for a topic.

    Returns None if topic is unknown.
    """
    canonical = resolve_topic_alias(topic)
    return TOPIC_HOUSE_MAP_CANONICAL.get(canonical)


def get_relevant_houses(topic: str) -> set:
    """Return relevant houses set for any topic (canonical or alias). Empty if unknown."""
    data = get_topic_data(topic)
    return set(data["relevant"]) if data else set()


def get_denial_houses(topic: str) -> set:
    """Return denial houses set for any topic (canonical or alias). Empty if unknown."""
    data = get_topic_data(topic)
    return set(data["denial"]) if data else set()


def get_primary_cusp(topic: str) -> int | None:
    """Return primary cusp house (1-12) for any topic. None if unknown."""
    data = get_topic_data(topic)
    return data["primary_cusp"] if data else None


def _build_legacy_house_topics() -> dict:
    """Build the legacy HOUSE_TOPICS dict (list shape with primary cusp first).

    Derived from TOPIC_HOUSE_MAP_CANONICAL. Includes all canonical topics +
    every alias pointing to its canonical entry. Maintains backwards compat
    for callers that still use HOUSE_TOPICS[topic] as a list.

    PR pre-test-cleanup — uses fixed-point iteration to handle multi-hop
    alias chains (e.g., car_purchase -> vehicle -> property). Without this,
    aliases inserted in TOPIC_ALIASES BEFORE their target alias were
    silently dropped, producing empty HOUSE_TOPICS lookups -> 25/100
    engine confidence (the same regression class as PR A2.7).
    """
    result: dict = {}
    for topic, data in TOPIC_HOUSE_MAP_CANONICAL.items():
        primary = data["primary_cusp"]
        rest = sorted(data["relevant"] - {primary})
        result[topic] = [primary] + rest
    # Fixed-point iteration — resolve all alias chains (handles up to N-hop)
    changed = True
    max_iterations = 10  # safety cap; real chains are 1-2 hops
    iteration = 0
    while changed and iteration < max_iterations:
        changed = False
        iteration += 1
        for alias, canonical in TOPIC_ALIASES.items():
            if alias in result:
                continue  # already resolved
            if canonical in result:
                result[alias] = result[canonical]
                changed = True
    return result


# Legacy HOUSE_TOPICS — DERIVED from TOPIC_HOUSE_MAP_CANONICAL above.
# Do NOT edit this dict directly; edit TOPIC_HOUSE_MAP_CANONICAL.
HOUSE_TOPICS = _build_legacy_house_topics()


def get_house_number(cusp_longitude: float, cusps: dict) -> int:
    """
    Given a planet longitude, find which house it occupies.
    """
    cusp_degrees = []
    for i in range(1, 13):
        cusp_degrees.append(cusps[f"House_{i}"]["cusp_longitude"])

    for i in range(12):
        start = cusp_degrees[i]
        end = cusp_degrees[(i + 1) % 12]

        if start < end:
            if start <= cusp_longitude < end:
                return i + 1
        else:
            # Wraps around 0/360
            if cusp_longitude >= start or cusp_longitude < end:
                return i + 1

    return 1


def get_planet_house_positions(planets: dict, cusps: dict) -> dict:
    """
    Find which house each planet occupies.
    """
    positions = {}
    for planet_name, planet_data in planets.items():
        house_num = get_house_number(planet_data["longitude"], cusps)
        positions[planet_name] = house_num
    return positions


def get_sign_lord_for_house(house_num: int, cusps: dict) -> str:
    """
    Return the lord of the sign on a house cusp.
    """
    cusp_longitude = cusps[f"House_{house_num}"]["cusp_longitude"]
    sign_index = int(cusp_longitude / 30)
    return SIGN_LORDS[sign_index]


def get_houses_owned_by_planet(planet_name: str, cusps: dict) -> list:
    """Return list of house numbers where this planet is the sign lord (owns the cusp)."""
    owned = []
    for i in range(1, 13):
        if get_sign_lord_for_house(i, cusps) == planet_name:
            owned.append(i)
    return owned


def get_nakshatra_occupants(nakshatra_name: str, planets: dict, exclude_planet: str = "") -> list:
    """Return list of planets occupying a given nakshatra (excluding the planet itself)."""
    occupants = []
    for planet_name, planet_data in planets.items():
        if planet_name != exclude_planet and planet_data.get("nakshatra") == nakshatra_name:
            occupants.append(planet_name)
    return occupants


def get_rahu_ketu_significations(planet_name: str, planets: dict, cusps: dict,
                                  planet_positions: dict) -> dict:
    """
    KP Rule: Rahu/Ketu have no sign ownership. They act as agents/proxies.
    
    Priority order for Rahu/Ketu significations:
    1. Planets conjunct with Rahu/Ketu (within 3.33°) — strongest proxy
    2. Star lord of Rahu/Ketu (nakshatra lord)
    3. Sign lord (dispositor) of Rahu/Ketu
    
    UNOCCUPIED NAKSHATRA RULE:
    If no other planet occupies Rahu/Ketu's nakshatra, Rahu/Ketu are "untenanted"
    and act as STRONG, unobstructed proxies — adopting full significations of
    their star lord (and conjunct planets if any).
    If other planets occupy their nakshatra, Rahu/Ketu are weaker proxies.
    """
    planet_data = planets[planet_name]
    planet_lon = planet_data["longitude"]
    star_lord = planet_data["star_lord"]
    sign_lord = get_sign_lord(planet_lon)

    # Check if nakshatra is unoccupied (strong proxy condition)
    nakshatra_occupants = get_nakshatra_occupants(
        planet_data["nakshatra"], planets, exclude_planet=planet_name
    )
    is_unoccupied = len(nakshatra_occupants) == 0

    # Find conjunct planets within 3.33 degrees
    conjunct_planets = []
    for other_name, other_data in planets.items():
        if other_name == planet_name:
            continue
        diff = abs(planet_lon - other_data["longitude"])
        if diff > 180:
            diff = 360 - diff
        if diff <= 3.3333:
            conjunct_planets.append(other_name)

    # Build significations from proxy chain
    primary_houses = []    # Houses from conjunct planets (strongest)
    secondary_houses = []  # Houses from star lord
    tertiary_houses = []   # Houses from sign lord

    # 1. Own house position (Rahu/Ketu always signify the house they occupy)
    own_house = planet_positions.get(planet_name)
    if own_house:
        secondary_houses.append(own_house)

    # 2. Conjunct planets significations (priority 1 proxy)
    for conj_planet in conjunct_planets:
        conj_house = planet_positions.get(conj_planet)
        if conj_house:
            primary_houses.append(conj_house)
        conj_owned = get_houses_owned_by_planet(conj_planet, cusps)
        primary_houses.extend(conj_owned)

    # 3. Star lord significations (priority 2 proxy)
    sl_house = planet_positions.get(star_lord)
    if sl_house:
        secondary_houses.append(sl_house)
    sl_owned = get_houses_owned_by_planet(star_lord, cusps)
    secondary_houses.extend(sl_owned)

    # 4. Sign lord significations (priority 3 proxy) — only when unoccupied
    if is_unoccupied and sign_lord != star_lord:
        signl_house = planet_positions.get(sign_lord)
        if signl_house:
            tertiary_houses.append(signl_house)
        signl_owned = get_houses_owned_by_planet(sign_lord, cusps)
        tertiary_houses.extend(signl_owned)

    all_houses = list(dict.fromkeys(
        primary_houses + secondary_houses + tertiary_houses
    ))

    return {
        "is_unoccupied": is_unoccupied,
        "conjunct_planets": conjunct_planets,
        "star_lord": star_lord,
        "sign_lord": sign_lord,
        "primary_houses": list(dict.fromkeys(primary_houses)),
        "secondary_houses": list(dict.fromkeys(secondary_houses)),
        "all_signified_houses": all_houses
    }


def get_significators(house_num: int, planets: dict,
                      cusps: dict, planet_positions: dict) -> dict:
    """
    KP Significator calculation for a given house.

    KP 4-level priority (strongest to weakest):
    Level 1: Planets in the star of house OCCUPANTS (primary significators)
    Level 2: Planets occupying the house itself
    Level 3: Planets in the star of house LORD
    Level 4: Lord of the house (sign lord of cusp)

    Special: Rahu/Ketu apply proxy/agent rule — their nakshatra occupancy
    and star lord chain determines their true signification strength.
    """
    occupants = []
    planets_in_star_of_occupants = []
    house_lord = get_sign_lord_for_house(house_num, cusps)
    planets_in_star_of_lord = []
    rahu_ketu_info = {}

    # Find occupants of this house
    for planet_name, house in planet_positions.items():
        if house == house_num:
            occupants.append(planet_name)

    # For each planet, check whose star it is in
    for planet_name, planet_data in planets.items():
        star_lord = planet_data["star_lord"]

        # Is this planet in the star of an occupant?
        if star_lord in occupants:
            if planet_name not in planets_in_star_of_occupants:
                planets_in_star_of_occupants.append(planet_name)

        # Is this planet in the star of the house lord?
        if star_lord == house_lord:
            if planet_name not in planets_in_star_of_lord:
                planets_in_star_of_lord.append(planet_name)

    # Rahu/Ketu proxy check — if Rahu or Ketu are occupants or house lord's star,
    # extend via proxy rule to include their full agent significations
    for node in ["Rahu", "Ketu"]:
        if node in occupants or node in planets_in_star_of_occupants or node in planets_in_star_of_lord:
            rk_sig = get_rahu_ketu_significations(node, planets, cusps, planet_positions)
            rahu_ketu_info[node] = rk_sig

    # All significators combined (with priority order)
    all_significators = list(dict.fromkeys(
        planets_in_star_of_occupants +
        occupants +
        planets_in_star_of_lord +
        [house_lord]
    ))

    return {
        "house": house_num,
        "occupants": occupants,
        "house_lord": house_lord,
        "planets_in_star_of_occupants": planets_in_star_of_occupants,
        "planets_in_star_of_lord": planets_in_star_of_lord,
        "all_significators": all_significators,
        "rahu_ketu_info": rahu_ketu_info  # extended proxy info for Rahu/Ketu
    }


def get_all_house_significators(planets: dict, cusps: dict) -> dict:
    """
    Calculate significators for all 12 houses.
    """
    planet_positions = get_planet_house_positions(planets, cusps)
    all_significators = {}

    for house_num in range(1, 13):
        all_significators[f"House_{house_num}"] = get_significators(
            house_num, planets, cusps, planet_positions
        )

    return all_significators


# ============================================================
# PROMISE ANALYSIS
# ============================================================

def check_promise(topic: str, cusps: dict, planets: dict) -> dict:
    """
    Check if a matter is promised in the chart.

    KP Rule: The sub lord of the primary cusp for the topic
    must be a significator of the relevant houses AND must
    NOT predominantly signify the denial houses (12th-from
    each relevant house in canonical KSK).

    PR A1.13 — Returns a 3-tier verdict {Promised / Conditional /
    Denied / Inconclusive}, derived from BOTH the relevant and the
    denial significator sets. Pre-fix this was a flat membership
    check that ignored denial houses entirely, so any cusp sublord
    that touched a single relevant house — even if it ALSO heavily
    signified the denial houses — was returned as "Strong Promise".
    That created a direct visual contradiction between the
    dashboard badge (e.g. "Strong" career promise) and the AI's
    deeper read (e.g. "Denied" / "Conditional with last-mile
    friction"). The 3-tier verdict mirrors compute_advanced's
    promise classification so the dashboard and the Analysis tab
    no longer disagree.

    Backward-compat fields (`is_promised`, `promise_strength`)
    are preserved so any caller reading the legacy shape keeps
    working — `is_promised` is now True for Promised AND
    Conditional (the matter IS promised; "conditional" just means
    with caveats). `promise_strength` maps to "Strong" /
    "Conditional" / "Weak or Denied" so existing UI strings remain
    valid.
    """
    if topic not in HOUSE_TOPICS:
        return {"error": f"Unknown topic: {topic}"}

    relevant_houses = HOUSE_TOPICS[topic]
    primary_house = relevant_houses[0]

    # Lazy import — kp_advanced_compute imports chart_engine, so a top-level
    # `from kp_advanced_compute import TOPIC_DENIAL` would loop. Inside the
    # function the import is resolved after both modules have finished loading.
    try:
        from app.services.kp_advanced_compute import TOPIC_DENIAL
        denial_houses = list(TOPIC_DENIAL.get(topic, []))
    except Exception:
        denial_houses = []

    # Get sub lord of primary cusp
    primary_cusp_sublord = cusps[f"House_{primary_house}"]["sub_lord"]

    # Compute the two significator pools (relevant + denial) using the same
    # 4-level (L1-L4) significator engine that powers compute_advanced.
    planet_positions = get_planet_house_positions(planets, cusps)

    relevant_sigs: set = set()
    for h in relevant_houses:
        sigs = get_significators(h, planets, cusps, planet_positions)
        relevant_sigs.update(sigs["all_significators"])

    denial_sigs: set = set()
    for h in denial_houses:
        sigs = get_significators(h, planets, cusps, planet_positions)
        denial_sigs.update(sigs["all_significators"])

    csl_in_relevant = primary_cusp_sublord in relevant_sigs
    csl_in_denial   = primary_cusp_sublord in denial_sigs

    # 3-tier verdict per KSK strict CSL doctrine
    if csl_in_relevant and not csl_in_denial:
        verdict = "Promised"
        strength = "Strong"
        is_promised = True
    elif csl_in_relevant and csl_in_denial:
        # Sublord touches BOTH — promise present but with structural friction.
        # This is the case the production AI catches as "offer comes but with
        # conditions / last-mile delay" (Pattern D2-adjacent).
        verdict = "Conditional"
        strength = "Conditional"
        is_promised = True   # promise IS present; conditions accompany it
    elif not csl_in_relevant and csl_in_denial:
        verdict = "Denied"
        strength = "Weak or Denied"
        is_promised = False
    else:
        verdict = "Inconclusive"
        strength = "Weak or Denied"
        is_promised = False

    return {
        "topic": topic,
        "relevant_houses": relevant_houses,
        "denial_houses": denial_houses,
        "primary_cusp": primary_house,
        "primary_cusp_sublord": primary_cusp_sublord,
        "relevant_significators": sorted(relevant_sigs),
        "denial_significators": sorted(denial_sigs),
        "csl_in_relevant": csl_in_relevant,
        "csl_in_denial":   csl_in_denial,
        # PR A1.13 — new field; preferred over is_promised/promise_strength for
        # new UI work. Frontend can render a 3-state badge.
        "verdict": verdict,
        # Backward-compat (do not remove — UI badges and existing callers read these)
        "is_promised": is_promised,
        "promise_strength": strength,
    }


# ============================================================
# DASHA SIGNIFICATOR MATCHING — TIMING CONFIRMATION
# ============================================================

def check_dasha_relevance(topic: str, current_mahadasha: dict,
                           current_antardasha: dict, planets: dict,
                           cusps: dict) -> dict:
    """
    Check if current dasha/antardasha lords are significators
    of the relevant houses for the topic.

    KP Rule: Event happens when dasha lord AND antardasha lord
    are both significators of the relevant houses.
    """
    if topic not in HOUSE_TOPICS:
        return {"error": f"Unknown topic: {topic}"}

    relevant_houses = HOUSE_TOPICS[topic]
    planet_positions = get_planet_house_positions(planets, cusps)

    all_significators = []
    for house_num in relevant_houses:
        sigs = get_significators(house_num, planets, cusps, planet_positions)
        all_significators.extend(sigs["all_significators"])
    all_significators = list(set(all_significators))

    md_lord = current_mahadasha["lord"]
    ad_lord = current_antardasha["antardasha_lord"]

    md_relevant = md_lord in all_significators
    ad_relevant = ad_lord in all_significators

    return {
        "topic": topic,
        "relevant_houses": relevant_houses,
        "relevant_significators": all_significators,
        "mahadasha_lord": md_lord,
        "mahadasha_relevant": md_relevant,
        "antardasha_lord": ad_lord,
        "antardasha_relevant": ad_relevant,
        "timing_favorable": md_relevant and ad_relevant,
        "timing_assessment": (
            "Both dasha and antardasha lords signify relevant houses — timing is active"
            if md_relevant and ad_relevant
            else "Dasha lords do not strongly signify relevant houses — timing not confirmed"
        )
    }

    # ============================================================
# PAD DASHAS (SUB-SUB-PERIODS) CALCULATION
# ============================================================

def calculate_pratyantardashas(antardasha: dict) -> list:
    """
    Calculate all Pratyantardasha (PAD / sub-sub-periods) within an Antardasha.
    
    PAD duration = AD total duration × (PAD lord years / 120)
    Sequence starts from the AD lord itself.
    """
    from datetime import datetime, timedelta

    ad_lord = antardasha["antardasha_lord"]
    ad_start = datetime.strptime(antardasha["start"], "%Y-%m-%d")
    ad_end = datetime.strptime(antardasha["end"], "%Y-%m-%d")
    ad_total_days = (ad_end - ad_start).days

    # PAD sequence starts from the AD lord
    start_index = DASHA_SEQUENCE.index(ad_lord)

    pratyantardashas = []
    current_date = ad_start

    for i in range(9):
        pad_lord = DASHA_SEQUENCE[(start_index + i) % 9]
        proportion = DASHA_YEARS[pad_lord] / TOTAL_DASHA_YEARS
        pad_days = ad_total_days * proportion
        end_date = current_date + timedelta(days=pad_days)

        pratyantardashas.append({
            "mahadasha_lord": antardasha["mahadasha_lord"],
            "antardasha_lord": ad_lord,
            "pratyantardasha_lord": pad_lord,
            "start": current_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
        })

        current_date = end_date

    return pratyantardashas


def get_current_pratyantardasha(pratyantardashas: list) -> dict:
    """Find currently running Pratyantardasha."""
    # PR A1.3-fix-24 — IST not server-local (see app/services/today.py)
    today = today_ist_str()

    for pad in pratyantardashas:
        if pad["start"] <= today <= pad["end"]:
            return pad

    return pratyantardashas[-1]


# ============================================================
# PR A1.3c-extras — SOOKSHMA DASHA (4th-level / sub-PAD)
# Day-precision windows. Used by Analysis tab to pinpoint the
# specific weeks within a PAD where an event is most likely to fire.
# ============================================================

def calculate_sookshma_dashas(pratyantardasha: dict) -> list:
    """
    Calculate the 9 Sookshma Dashas (sub-PAD / 4th-level periods)
    within a single Pratyantardasha.

    Sookshma duration = PAD total duration × (sookshma_lord_years / 120)
    Sequence starts from the PAD lord itself (same recursive Vimshottari rule
    used for AD inside MD and PAD inside AD).

    Typical scale: a 30-day PAD has Sookshmas of 2-5 days each.
    """
    from datetime import datetime, timedelta

    pad_lord = pratyantardasha["pratyantardasha_lord"]
    pad_start = datetime.strptime(pratyantardasha["start"], "%Y-%m-%d")
    pad_end = datetime.strptime(pratyantardasha["end"], "%Y-%m-%d")
    pad_total_days = (pad_end - pad_start).days

    start_index = DASHA_SEQUENCE.index(pad_lord)

    sookshmas = []
    current_date = pad_start

    for i in range(9):
        sookshma_lord = DASHA_SEQUENCE[(start_index + i) % 9]
        proportion = DASHA_YEARS[sookshma_lord] / TOTAL_DASHA_YEARS
        sookshma_days = pad_total_days * proportion
        end_date = current_date + timedelta(days=sookshma_days)

        sookshmas.append({
            "mahadasha_lord":      pratyantardasha.get("mahadasha_lord"),
            "antardasha_lord":     pratyantardasha.get("antardasha_lord"),
            "pratyantardasha_lord": pad_lord,
            "sookshma_lord":       sookshma_lord,
            "start": current_date.strftime("%Y-%m-%d"),
            "end":   end_date.strftime("%Y-%m-%d"),
        })

        current_date = end_date

    return sookshmas


def get_current_sookshma(sookshmas: list) -> dict:
    """Find currently running Sookshma (sub-PAD) period."""
    # PR A1.3-fix-24 — IST not server-local (see app/services/today.py)
    today = today_ist_str()

    for sd in sookshmas:
        if sd["start"] <= today <= sd["end"]:
            return sd

    return sookshmas[-1] if sookshmas else {}


def get_upcoming_pratyantardashas(pratyantardashas: list, limit: int = 9) -> list:
    """Return current + upcoming PADs (not past ones)."""
    # PR A1.3-fix-24 — IST not server-local (see app/services/today.py)
    today = today_ist_str()
    result = []
    found_current = False
    for pad in pratyantardashas:
        if pad["end"] >= today:
            result.append(pad)
            if not found_current:
                found_current = True
        if len(result) >= limit:
            break
    return result