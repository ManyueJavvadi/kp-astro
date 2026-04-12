import swisseph as swe
from datetime import datetime
import math

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

    # Build sub-division sequence starting from nakshatra lord
    lords_order = ["Ketu", "Venus", "Sun", "Moon", "Mars",
                   "Rahu", "Jupiter", "Saturn", "Mercury"]
    start_index = lords_order.index(nakshatra_lord)
    sequence = lords_order[start_index:] + lords_order[:start_index]

    # Calculate sub spans proportional to dasha years
    current_position = 0.0
    for lord in sequence:
        span = (DASHA_YEARS[lord] / TOTAL_YEARS) * NAKSHATRA_SPAN
        if current_position + span >= position_in_nakshatra:
            return lord
        current_position += span

    return sequence[-1]  # fallback


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

# Dasha sequence and years
DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]

DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}

TOTAL_DASHA_YEARS = 120


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
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

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
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

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


def get_ruling_planets(timezone_offset: float = 5.5) -> dict:
    """
    Calculate ruling planets at the current moment of query.
    These are used in KP to filter and confirm predictions.
    """
    import swisseph as swe
    from datetime import datetime

    now = datetime.utcnow()

    # Julian day for current moment — swe.julday expects UT (UTC)
    # Do NOT add timezone_offset here — utcnow() is already UTC
    jd_now = swe.julday(
        now.year, now.month, now.day,
        now.hour + now.minute / 60
    )

    # Set KP New ayanamsa
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # 1. Day lord
    weekday = datetime.now().weekday()
    day_lord = DAY_LORDS[weekday]

    # 2. Current lagna (ascendant at this moment)
    # Use a neutral location for lagna calculation
    # In practice this should use the query location
    cusps, ascmc = swe.houses_ex(jd_now, 0.0, 0.0, b'P', swe.FLG_SIDEREAL)
    lagna_longitude = ascmc[0]
    lagna_sign_lord = get_sign_lord(lagna_longitude)
    lagna_star_lord = get_nakshatra_and_starlord(lagna_longitude)["star_lord"]

    # 3. Current Moon
    moon_result, _ = swe.calc_ut(jd_now, swe.MOON, swe.FLG_SIDEREAL)
    moon_longitude = moon_result[0]
    moon_sign_lord = get_sign_lord(moon_longitude)
    moon_star_lord = get_nakshatra_and_starlord(moon_longitude)["star_lord"]

    # Collect unique ruling planets
    ruling_planets = list(dict.fromkeys([
        day_lord,
        lagna_sign_lord,
        lagna_star_lord,
        moon_sign_lord,
        moon_star_lord
    ]))

    return {
        "query_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "day_lord": day_lord,
        "lagna_sign_lord": lagna_sign_lord,
        "lagna_star_lord": lagna_star_lord,
        "moon_sign_lord": moon_sign_lord,
        "moon_star_lord": moon_star_lord,
        "ruling_planets": ruling_planets
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

# House topics for KP — which houses govern which life areas
# IMPORTANT: First house in each list is the PRIMARY CUSP checked in check_promise()
# Primary cusp = the most direct KP gate for that topic
HOUSE_TOPICS = {
    "marriage":         [7, 2, 11],      # H7 = spouse house (primary gate)
    "divorce":          [6, 10, 12],
    "job":              [10, 2, 6, 11],  # H10 = profession house (primary gate)
    "business":         [7, 2, 10, 11],  # H7 = partners/public (primary gate)
    "foreign_travel":   [9, 3, 12],      # H9 = long journeys (primary gate)
    "foreign_settle":   [12, 3, 9],      # H12 = foreign land (primary gate)
    "education":        [9, 4, 11],      # H9 = higher learning (primary gate)
    "health":           [6, 1, 8, 12],   # H6 = disease house (primary gate)
    "children":         [5, 2, 11],      # H5 = children (primary gate)
    "property":         [4, 11, 12],     # H4 = immovable property (primary gate)
    "father":           [9, 10],
    "mother":           [4, 10],
    "litigation":       [6, 8, 12],      # H6 = disputes (primary gate)
    "spirituality":     [9, 8, 12],
    "wealth":           [2, 6, 10, 11]   # H2 = accumulated wealth (primary gate)
}


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
    must be a significator of the relevant houses.
    """
    if topic not in HOUSE_TOPICS:
        return {"error": f"Unknown topic: {topic}"}

    relevant_houses = HOUSE_TOPICS[topic]
    primary_house = relevant_houses[0]

    # Get sub lord of primary cusp
    primary_cusp_sublord = cusps[f"House_{primary_house}"]["sub_lord"]

    # Get all significators for relevant houses
    planet_positions = get_planet_house_positions(planets, cusps)
    all_significators = []

    for house_num in relevant_houses:
        sigs = get_significators(house_num, planets, cusps, planet_positions)
        all_significators.extend(sigs["all_significators"])

    all_significators = list(set(all_significators))

    # Is the sub lord a significator of relevant houses?
    is_promised = primary_cusp_sublord in all_significators

    return {
        "topic": topic,
        "relevant_houses": relevant_houses,
        "primary_cusp": primary_house,
        "primary_cusp_sublord": primary_cusp_sublord,
        "relevant_significators": all_significators,
        "is_promised": is_promised,
        "promise_strength": "Strong" if is_promised else "Weak or Denied"
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
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    for pad in pratyantardashas:
        if pad["start"] <= today <= pad["end"]:
            return pad

    return pratyantardashas[-1]


def get_upcoming_pratyantardashas(pratyantardashas: list, limit: int = 9) -> list:
    """Return current + upcoming PADs (not past ones)."""
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
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