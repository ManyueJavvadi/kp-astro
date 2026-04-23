"""
KP Muhurtha Engine v2 — finds auspicious time windows for events.
Scans every 4 minutes, scores each Lagna sub-lord against event house requirements.

New in v2:
- Event location (event_lat/lon/tz) distinct from birth location for Lagna computation
- Tara Bala (most critical KP factor): natal vs current Moon nakshatra
- Chandrabala: current Moon position relative to natal Moon sign
- Abhijit Muhurtha detection and bonus (not valid on Wednesday)
- Hora lord scoring (Jupiter/Venus/Mercury = +, Sun/Saturn/Mars = -)
- Retrograde lagna lord penalty
- Correct sunrise-based inauspicious periods (no BIT_DISC_CENTER)
- 15-muhurta Durmuhurtha calculation (weekday-specific slots)
- Updated scoring weights and quality thresholds

PR A2.2b additions (engine scoring fixes from real-world audit):
- HARD REJECTS (move window to soft_flagged tier, not top results):
    * Lagna CSL signifies any event denial house (§1, §2)
    * Lagna CSL does NOT signify event primary house (§2)
    * Time outside event practical hours (vehicle 1AM, etc.)
    * Badhaka/Maraka hit (upgraded from soft penalty)
- NEW SOFT PENALTIES (scoring only):
    * Event CSL signifies denial houses (-25)
    * H11 CSL signifies denial houses (-20)
    * Rikta-Nanda tithi 4/9/14 (-15, esp. Krishna Navami)
    * Moon nakshatra class mismatch for event (-15)
    * Ugra/Tikshna nakshatra for non-surgery events (-10)
    * Per-event weekday violations (-15)
    * Lagna type not event-preferred (-10)
- NEW SOFT BONUSES:
    * Nakshatra class matches event preferred (+12)
    * Lagna type event-preferred (+10)
    * Per-event weekday approved (+10, replacing global GOOD_VARA)
- Return structure split into `windows` (passed) + `soft_flagged_windows`
  so the astrologer sees clean top-N and can still review rejects
"""
import swisseph as swe
from datetime import datetime, timedelta
from typing import Optional, Tuple

from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign, get_planet_positions,
    date_time_to_julian
)

# PR A2.2b — consume the findings-module lookup tables (per-event KB rules)
from app.services.muhurtha_findings import (
    NAKSHATRA_CLASS,
    EVENT_PREFERRED_NAK_CLASSES,
    EVENT_AVOID_NAK_CLASSES,
    EVENT_PREFERRED_VARAS,
    EVENT_AVOID_VARAS,
    EVENT_PREFERRED_LAGNA_TYPE,
    EVENT_PRACTICAL_HOURS,
    RIKTA_NANDA_AVOID_TITHIS,
)

# ── Event house requirements (research-validated) ──────────────

EVENT_HOUSE_GROUPS = {
    "marriage":      {"primary": 7,  "supporting": [2, 11, 5],  "denial": [1, 6, 10]},
    "business":      {"primary": 10, "supporting": [2, 6, 11],  "denial": [5, 12]},
    "house_warming": {"primary": 4,  "supporting": [11, 2],     "denial": [3, 10, 8]},
    "travel":        {"primary": 9,  "supporting": [3, 12],     "denial": [2, 8]},
    "education":     {"primary": 4,  "supporting": [9, 11],     "denial": [3, 12]},
    "vehicle":       {"primary": 4,  "supporting": [3, 11],     "denial": [8, 12]},
    "medical":       {"primary": 1,  "supporting": [5, 11],     "denial": [6, 8, 12]},
    "legal":         {"primary": 6,  "supporting": [11, 3],     "denial": [5, 12]},
    "investment":    {"primary": 2,  "supporting": [5, 11],     "denial": [8, 12]},
    "general":       {"primary": 1,  "supporting": [2, 11],     "denial": [6, 8, 12]},
}


def classify_event(event_text: str) -> str:
    """Map free-form event description to a known event key."""
    text = event_text.lower()
    if any(w in text for w in ["marriage", "wedding", "vivah", "\u0c2a\u0c46\u0c33\u0c4d\u0c33\u0c3f", "\u0c35\u0c3f\u0c35\u0c3e\u0c39", "kalyanam"]):
        return "marriage"
    if any(w in text for w in ["vehicle", "car", "bike", "auto", "scooter", "vahana",
                                "delivery", "\u0c35\u0c3e\u0c39\u0c28", "\u0c15\u0c3e\u0c30\u0c4d", "\u0c2c\u0c48\u0c15\u0c4d"]):
        return "vehicle"
    if any(w in text for w in ["business", "shop", "office", "opening", "start", "launch",
                                "\u0c35\u0c4d\u0c2f\u0c3e\u0c2a\u0c3e\u0c30", "\u0c26\u0c41\u0c15\u0c3e\u0c23\u0c02"]):
        return "business"
    if any(w in text for w in ["house", "home", "graha", "griha", "warming", "flat",
                                "apartment", "\u0c17\u0c43\u0c39", "\u0c07\u0c32\u0c4d\u0c32\u0c41", "\u0c28\u0c3f\u0c35\u0c3e\u0c38\u0c02"]):
        return "house_warming"
    if any(w in text for w in ["travel", "journey", "trip", "tour", "flight", "train",
                                "prayanam", "\u0c2a\u0c4d\u0c30\u0c2f\u0c3e\u0c23"]):
        return "travel"
    if any(w in text for w in ["education", "school", "college", "exam", "study", "course",
                                "admission", "\u0c35\u0c3f\u0c26\u0c4d\u0c2f", "\u0c2a\u0c30\u0c40\u0c15\u0c4d\u0c37"]):
        return "education"
    if any(w in text for w in ["medical", "surgery", "operation", "hospital", "treatment",
                                "doctor", "\u0c35\u0c48\u0c26\u0c4d\u0c2f", "\u0c06\u0c2a\u0c30\u0c47\u0c37\u0c28\u0c4d"]):
        return "medical"
    if any(w in text for w in ["legal", "court", "case", "lawsuit", "vyajyam", "\u0c35\u0c4d\u0c2f\u0c3e\u0c1c\u0c4d\u0c2f",
                                "\u0c15\u0c4b\u0c30\u0c4d\u0c1f\u0c41"]):
        return "legal"
    if any(w in text for w in ["invest", "stock", "fund", "property buy", "land", "gold",
                                "\u0c2a\u0c46\u0c1f\u0c4d\u0c1f\u0c41\u0c2c\u0c21\u0c3f"]):
        return "investment"
    return "general"


# ── Planet / sign constants ──────────────────────────────────────

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

SIGN_TYPES = {
    "Aries": "Movable", "Taurus": "Fixed", "Gemini": "Dual",
    "Cancer": "Movable", "Leo": "Fixed", "Virgo": "Dual",
    "Libra": "Movable", "Scorpio": "Fixed", "Sagittarius": "Dual",
    "Capricorn": "Movable", "Aquarius": "Fixed", "Pisces": "Dual"
}
BADHAKA_HOUSE = {"Movable": 11, "Fixed": 9, "Dual": 7}
MARAKA_HOUSES = {2, 7}

TITHI_NAMES = [
    "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi",
    "Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi",
    "Trayodashi","Chaturdashi","Purnima/Amavasya"
]
YOGA_NAMES = [
    "Vishkambha","Preeti","Ayushman","Saubhagya","Shobhana","Atiganda",
    "Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva",
    "Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan",
    "Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla",
    "Brahma","Indra","Vaidhriti"
]

# Hora lords cycle: Sun->Venus->Mercury->Moon->Saturn->Jupiter->Mars
HORA_LORDS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]

# Starting hora lord index per weekday (0=Mon, 6=Sun)
DAY_HORA_START = {0: 3, 1: 6, 2: 2, 3: 5, 4: 1, 5: 4, 6: 0}

# Auspicious hora lords for muhurtha
AUSPICIOUS_HORA = {"Jupiter", "Venus", "Mercury"}
INAUSPICIOUS_HORA = {"Sun", "Saturn", "Mars"}

# Rahu Kalam slot index (0-based, 8-slot day) per weekday (0=Mon)
RAHU_KALAM_SLOTS = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}

# Yamagandam slot index per weekday
YAMAGANDAM_SLOTS = {0: 4, 1: 3, 2: 2, 3: 1, 4: 0, 5: 6, 6: 5}

# Gulika Kalam slot index per weekday
GULIKA_SLOTS = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0}

# Durmuhurtha: 15-muhurta day — slot indices per weekday (0-indexed)
DURMUHURTHA_SLOTS = {
    0: [6, 12],   # Monday
    1: [4, 12],   # Tuesday
    2: [5, 12],   # Wednesday (Abhijit slot 7 is excluded for Durm)
    3: [5, 12],   # Thursday
    4: [2, 12],   # Friday
    5: [7, 8],    # Saturday
    6: [2, 6],    # Sunday
}

# Tara names (1-9)
TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Atimitra"]
GOOD_TARAS = {2, 4, 6, 8, 9}   # Sampat, Kshema, Sadhana, Mitra, Atimitra

# Auspicious Tithi numbers (1-based, 30 = Amavasya)
AUSPICIOUS_TITHIS = {2, 3, 5, 7, 10, 11, 13}
INAUSPICIOUS_TITHIS = {4, 6, 8, 12, 14, 15, 30}

# Auspicious Nakshatras for muhurtha (by index 0-26)
AUSPICIOUS_NAKSHATRA_IDX = {0, 4, 6, 7, 12, 13, 14, 17, 21, 22, 23}

# Inauspicious Yoga indices (0-based): Vishkambha, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti
INAUSPICIOUS_YOGA_IDX = {0, 9, 12, 14, 16, 18, 26}

# Good weekdays for muhurtha
GOOD_VARA = {0, 2, 3, 4}   # Mon, Wed, Thu, Fri
BAD_VARA  = {1, 5}          # Tue, Sat


# ── Sunrise helpers ─────────────────────────────────────────────

def _get_sunrise_sunset_jd(date_jd: float, lat: float, lon: float) -> Tuple[float, float]:
    """Get sunrise/sunset JD using upper limb (true observed sunrise)."""
    geopos = (lon, lat, 0.0)
    try:
        _, tr = swe.rise_trans(date_jd - 0.5, swe.SUN, b"", 0,
                               swe.CALC_RISE, geopos, 1013.25, 10.0)
        sunrise = tr[1]
        _, ts = swe.rise_trans(sunrise, swe.SUN, b"", 0,
                               swe.CALC_SET, geopos, 1013.25, 10.0)
        sunset = ts[1]
        return sunrise, sunset
    except Exception:
        return date_jd - 0.25, date_jd + 0.25


# ── Tara Bala & Chandrabala ─────────────────────────────────────

def _compute_tara_bala(birth_nakshatra_idx: int, current_moon_lon: float) -> Tuple[int, str, bool]:
    """
    Returns (tara_num 1-9, tara_name, is_good).
    birth_nakshatra_idx: 0-26 (native's birth nakshatra index)
    current_moon_lon: current sidereal Moon longitude (0-360)
    """
    current_nak = int((current_moon_lon % 360) / (360.0 / 27))
    tara_count = ((current_nak - birth_nakshatra_idx) % 27) + 1   # 1-27
    tara_num = ((tara_count - 1) % 9) + 1                          # 1-9
    return tara_num, TARA_NAMES[tara_num - 1], (tara_num in GOOD_TARAS)


def _compute_chandrabala(birth_moon_sign_idx: int, current_moon_lon: float) -> Tuple[int, bool]:
    """
    Returns (position 1-12, is_good).
    birth_moon_sign_idx: 0-11 (native's natal Moon sign, 0=Aries)
    current_moon_lon: current sidereal Moon longitude (0-360)
    """
    current_sign = int((current_moon_lon % 360) / 30.0)  # 0-11
    position = ((current_sign - birth_moon_sign_idx) % 12) + 1   # 1-12
    good_positions = {2, 3, 6, 7, 10, 11}
    return position, (position in good_positions)


# PR A2.2c — per-participant evaluation ──────────────────────────

def _is_chandrashtamam(birth_moon_sign_idx: int, current_moon_lon: float) -> bool:
    """True when the current Moon is in the 8th rashi from the native's
    natal Moon — classical "chandrashtamam" hard filter (KB §8.1).
    """
    current_sign = int((current_moon_lon % 360) / 30.0)  # 0-11
    # 8th from natal: (natal + 7) % 12 (0-indexed)
    return current_sign == (birth_moon_sign_idx + 7) % 12


def _is_janma_tara(birth_nakshatra_idx: int, current_moon_lon: float) -> bool:
    """True when the current Moon is in the native's own janma nakshatra
    (Tara = 1 in the 9-cycle). Classical hard filter (KB §8.1).
    """
    current_nak = int((current_moon_lon % 360) / (360.0 / 27))
    return current_nak == birth_nakshatra_idx


def _evaluate_participant(
    name: str,
    natal_moon: dict,
    current_moon_lon: float,
) -> dict:
    """Compute per-participant findings for a single candidate moment.

    KB §8.1 hard filters: Chandrashtamam, Janma Tara.
    KB §8.2 soft signals: Tarabala class, Chandrabala.

    Returns a dict the scan loop aggregates into the window's
    per_participant list and hard_rejected_for list.
    """
    birth_nak_idx = natal_moon.get("moon_nakshatra_idx", 0)
    birth_sign_idx = natal_moon.get("moon_sign_idx", 0)

    chandrashtamam = _is_chandrashtamam(birth_sign_idx, current_moon_lon)
    janma_tara = _is_janma_tara(birth_nak_idx, current_moon_lon)
    tara_num, tara_name, tara_good = _compute_tara_bala(birth_nak_idx, current_moon_lon)
    cb_pos, cb_good = _compute_chandrabala(birth_sign_idx, current_moon_lon)

    # Soft score contribution (KB §8.2 weights, modest per-participant)
    soft = 0
    if tara_good:
        soft += 12
    else:
        soft -= 8
    if cb_good:
        soft += 6
    else:
        soft -= 6

    hard_rejected_for = []
    if chandrashtamam:
        hard_rejected_for.append(f"{name}: Chandrashtamam")
    if janma_tara:
        hard_rejected_for.append(f"{name}: Janma Tara")

    return {
        "name": name,
        "chandrashtamam": chandrashtamam,
        "janma_tara": janma_tara,
        "tara_bala_num": tara_num,
        "tara_bala_name": tara_name,
        "tara_bala_good": tara_good,
        "chandrabala_num": cb_pos,
        "chandrabala_good": cb_good,
        "soft_score": soft,
        "hard_rejected_for": hard_rejected_for,
    }


def _get_natal_moon_data(participant: dict) -> dict:
    """Get natal Moon nakshatra index (0-26) and sign index (0-11) from participant."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    try:
        jd = date_time_to_julian(
            participant["date"], participant["time"],
            participant.get("timezone_offset", 5.5)
        )
        moon_lon = get_planet_positions(jd).get("Moon", {}).get("longitude", 0)
        return {
            "moon_nakshatra_idx": int((moon_lon % 360) / (360.0 / 27)),
            "moon_sign_idx":      int((moon_lon % 360) / 30.0),
        }
    except Exception:
        return {"moon_nakshatra_idx": 0, "moon_sign_idx": 0}


# ── Hora lord at a given JD ─────────────────────────────────────

def _get_hora_lord(jd: float, sunrise_jd: float, sunset_jd: float, weekday: int) -> str:
    """Return hora lord for a given JD using proportional day/night horas."""
    try:
        # Get next sunrise for night hora lengths
        day_dur   = (sunset_jd - sunrise_jd) / 12.0
        # approximate next sunrise as sunset + same day duration (good enough for hora lord index)
        approx_next_sr = sunset_jd + (sunset_jd - sunrise_jd)
        night_dur = (approx_next_sr - sunset_jd) / 12.0

        start_idx = DAY_HORA_START[weekday]

        if sunrise_jd <= jd < sunset_jd:
            # Day hora
            elapsed = jd - sunrise_jd
            hora_num = min(int(elapsed / day_dur), 11)
        else:
            # Night hora
            night_start = sunset_jd if jd >= sunset_jd else sunset_jd - (approx_next_sr - sunrise_jd)
            elapsed = jd - night_start
            hora_num = 12 + min(int(elapsed / night_dur), 11)

        return HORA_LORDS[(start_idx + hora_num) % 7]
    except Exception:
        return "Sun"


# ── Natal RPs ────────────────────────────────────────────────────

def _get_natal_rps(participant: dict) -> set:
    """Get natal Ruling Planets for a participant."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    try:
        jd = date_time_to_julian(
            participant["date"], participant["time"], participant.get("timezone_offset", 5.5)
        )
        planets = get_planet_positions(jd)
        lat = participant["latitude"]
        lon = participant["longitude"]
        cusps, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)

        lagna_lon = cusps[0] % 360
        moon_lon = planets.get("Moon", {}).get("longitude", 0)

        rps = {
            SIGN_LORDS.get(get_sign(lagna_lon), ""),
            get_nakshatra_and_starlord(lagna_lon)["star_lord"],
            SIGN_LORDS.get(get_sign(moon_lon % 360), ""),
            get_nakshatra_and_starlord(moon_lon)["star_lord"],
        }
        rps.discard("")
        return rps
    except Exception:
        return set()


# ── House helpers ────────────────────────────────────────────────

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


def _sublord_significations(sublord: str, planets: dict, cusp_lons: list) -> list:
    """Houses signified by a planet: occupied house + ruled houses + star lord's house."""
    if sublord not in planets:
        return []
    sl_lon = planets[sublord]["longitude"]
    occupied = _get_planet_house(sl_lon, cusp_lons)
    ruled = [i + 1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == sublord]
    star_lord = get_nakshatra_and_starlord(sl_lon)["star_lord"]
    sl_house = _get_planet_house(planets[star_lord]["longitude"], cusp_lons) if star_lord in planets else 0
    return list(set([occupied] + ruled + ([sl_house] if sl_house else [])))


# ── Day slots (inauspicious periods) ────────────────────────────

def _get_day_slots(sunrise_jd: float, sunset_jd: float, weekday: int) -> dict:
    """Compute all inauspicious time windows for a day from sunrise/sunset."""
    slot_dur = (sunset_jd - sunrise_jd) / 8.0
    muhurta_dur = (sunset_jd - sunrise_jd) / 15.0

    rk_slot = RAHU_KALAM_SLOTS[weekday]
    rk_start = sunrise_jd + rk_slot * slot_dur
    rk_end   = rk_start + slot_dur

    yg_slot  = YAMAGANDAM_SLOTS[weekday]
    yg_start = sunrise_jd + yg_slot * slot_dur
    yg_end   = yg_start + slot_dur

    gl_slot  = GULIKA_SLOTS[weekday]
    gl_start = sunrise_jd + gl_slot * slot_dur
    gl_end   = gl_start + slot_dur

    # Durmuhurtha: two weekday-specific 15-muhurta slots
    durm_slots = DURMUHURTHA_SLOTS[weekday]
    durm_windows = [
        (sunrise_jd + s * muhurta_dur, sunrise_jd + (s + 1) * muhurta_dur)
        for s in durm_slots
    ]

    # Abhijit Muhurtha: 8th of 15 muhurtas (0-indexed = slot 7), not valid on Wednesday
    abhijit_start = sunrise_jd + 7 * muhurta_dur
    abhijit_end   = abhijit_start + muhurta_dur
    abhijit_valid = (weekday != 2)

    return {
        "rk":      (rk_start, rk_end),
        "yg":      (yg_start, yg_end),
        "gl":      (gl_start, gl_end),
        "durm":    durm_windows,
        "abhijit": (abhijit_start, abhijit_end, abhijit_valid),
        "sunrise": sunrise_jd,
        "sunset":  sunset_jd,
    }


def _is_vishti(moon_lon: float, sun_lon: float) -> bool:
    """True if current karana is Vishti (Bhadra)."""
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff / 6)
    if idx == 0 or idx > 56:
        return False
    return (idx - 1) % 7 == 6


# ── Scoring ──────────────────────────────────────────────────────

def _score_significations(signified: list, event_type: str) -> int:
    """Score from Lagna CSL house significations."""
    group = EVENT_HOUSE_GROUPS.get(event_type, EVENT_HOUSE_GROUPS["general"])
    score = 0
    if group["primary"] in signified:
        score += 40
    supporting_hits = sum(1 for h in group["supporting"] if h in signified)
    score += min(supporting_hits, 2) * 15   # max 2 supporting houses count
    if not any(h in signified for h in group["denial"]):
        score += 20
    return score


def _quality(score: int) -> str:
    if score >= 95:
        return "Excellent"
    if score >= 65:
        return "Good"
    if score >= 35:
        return "Fair"
    return "Weak"


# ── Core scan function ────────────────────────────────────────────

def _scan_date_range(
    start_dt: datetime, end_dt: datetime,
    event_type: str,
    # Event location (for Lagna calculation)
    event_lat: float, event_lon: float, event_tz: float,
    participant_rps: list = None,           # list of (name, set_of_rp_planets)
    participant_natal_moon: list = None,    # list of (name, {moon_nakshatra_idx, moon_sign_idx})
) -> list:
    """Scan a date range every 4 minutes, return raw scored windows."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    participant_rps = participant_rps or []
    participant_natal_moon = participant_natal_moon or []

    raw_windows = []
    planet_cache: dict = {}
    slot_cache: dict = {}

    current = start_dt.replace(hour=5, minute=0, second=0, microsecond=0)
    end = end_dt.replace(hour=21, minute=0, second=0, microsecond=0)

    while current <= end:
        jd = swe.julday(
            current.year, current.month, current.day,
            current.hour + current.minute / 60.0 - event_tz
        )

        # Planet positions cached per hour
        hr_key = current.strftime("%Y-%m-%d %H")
        if hr_key not in planet_cache:
            planet_cache[hr_key] = get_planet_positions(jd)
        planets = planet_cache[hr_key]

        # Day slots cached per day
        day_key = current.strftime("%Y-%m-%d")
        if day_key not in slot_cache:
            date_jd = swe.julday(current.year, current.month, current.day, 12.0 - event_tz)
            sr, ss = _get_sunrise_sunset_jd(date_jd, event_lat, event_lon)
            slot_cache[day_key] = _get_day_slots(sr, ss, current.weekday())
        slots = slot_cache[day_key]

        rk_start, rk_end = slots["rk"]
        yg_start, yg_end = slots["yg"]
        gl_start, gl_end = slots["gl"]
        durm_windows = slots["durm"]
        ab_start, ab_end, ab_valid = slots["abhijit"]
        sunrise_jd = slots["sunrise"]
        sunset_jd  = slots["sunset"]

        # House cusps at event location
        cusps, _ = swe.houses_ex(jd, event_lat, event_lon, b'P', swe.FLG_SIDEREAL)
        cusp_lons = list(cusps[:12])
        lagna_lon = cusp_lons[0] % 360

        lagna_sl   = get_sub_lord(lagna_lon)
        lagna_star = get_nakshatra_and_starlord(lagna_lon)["star_lord"]
        signified  = _sublord_significations(lagna_sl, planets, cusp_lons)

        base_score = _score_significations(signified, event_type)

        # ── Traditional panchang factors ──────────────────────────
        moon_lon = planets.get("Moon", {}).get("longitude", 0)
        sun_lon  = planets.get("Sun",  {}).get("longitude", 0)

        # PR A2.2c.1 — AUSPICIOUS_TITHIS + INAUSPICIOUS_TITHIS are
        # defined in terms of the 1-15 paksha-agnostic cycle position
        # (tithi 6 = Shashthi, same classical meaning in both Shukla
        # AND Krishna paksha). Previous code checked the raw 1-30
        # tithi_num, which meant Krishna tithis (16-30) never matched
        # these sets — a window on Krishna Shashthi (tithi_num=21) got
        # neither bonus nor penalty despite §3.1 classifying it as
        # inauspicious. Fix: check cycle position explicitly, plus
        # keep the 15/30 (Purnima/Amavasya) special-case.
        tithi_num = int(((moon_lon - sun_lon) % 360) / 12) + 1
        tithi_cycle_pos = ((tithi_num - 1) % 15) + 1
        if tithi_cycle_pos in AUSPICIOUS_TITHIS:
            base_score += 20
        elif tithi_cycle_pos in INAUSPICIOUS_TITHIS or tithi_num in {15, 30}:
            base_score -= 30

        naks_idx = int((moon_lon % 360) / (360.0 / 27))
        if naks_idx in AUSPICIOUS_NAKSHATRA_IDX:
            base_score += 15

        yoga_idx = int(((sun_lon + moon_lon) % 360) / (360.0 / 27)) % 27
        if yoga_idx in INAUSPICIOUS_YOGA_IDX:
            base_score -= 40

        vara = current.weekday()
        if vara in GOOD_VARA:
            base_score += 10
        elif vara in BAD_VARA:
            base_score -= 15

        # ── PR A2.2c — per-participant evaluation ─────────────────
        # For each participant (not just primary), compute classical
        # §8.1 hard filters + §8.2 soft signals. A window is
        # hard-rejected if ANY participant has Chandrashtamam OR
        # Janma Tara active. Soft score sums across participants
        # (average-preserving but scales with participant count).
        per_participant = []
        participant_hard_rejects = []
        participant_soft_total = 0
        # Legacy single-participant fields kept for UI back-compat
        tara_num, tara_name, tara_good = 0, "", True
        chandrabala_good = True

        for name, natal_data in participant_natal_moon:
            p_eval = _evaluate_participant(name, natal_data, moon_lon)
            per_participant.append(p_eval)
            participant_soft_total += p_eval["soft_score"]
            if p_eval["hard_rejected_for"]:
                participant_hard_rejects.extend(p_eval["hard_rejected_for"])

        # Primary-participant legacy fields (first in list; UI chips)
        if per_participant:
            p0 = per_participant[0]
            tara_num, tara_name, tara_good = (
                p0["tara_bala_num"], p0["tara_bala_name"], p0["tara_bala_good"]
            )
            chandrabala_good = p0["chandrabala_good"]

        # Apply per-participant soft total to base_score
        base_score += participant_soft_total

        # ── Hora lord scoring ──────────────────────────────────────
        hora_lord = _get_hora_lord(jd, sunrise_jd, sunset_jd, vara)
        hora_auspicious = hora_lord in AUSPICIOUS_HORA
        if hora_auspicious:
            base_score += 10
        elif hora_lord in INAUSPICIOUS_HORA:
            base_score -= 10

        # ── Retrograde lagna lord ──────────────────────────────────
        lagna_sign = get_sign(lagna_lon)
        lagna_lord = SIGN_LORDS.get(lagna_sign, "")
        lagna_lord_retro = False
        if lagna_lord and lagna_lord in planets:
            lagna_lord_retro = planets[lagna_lord].get("retrograde", False)
            if lagna_lord_retro:
                base_score -= 15

        # ── Multi-chart participant RP resonance ───────────────────
        resonating_with = [name for name, rps in participant_rps if lagna_sl in rps]
        participant_bonus = len(resonating_with) * 10

        # ── Abhijit Muhurtha ───────────────────────────────────────
        in_abhijit = ab_valid and ab_start <= jd <= ab_end
        if in_abhijit:
            base_score += 30

        # ── Inauspicious time penalties ────────────────────────────
        in_rk   = rk_start <= jd <= rk_end
        in_yg   = yg_start <= jd <= yg_end
        in_gl   = gl_start <= jd <= gl_end
        in_durm = any(d_s <= jd <= d_e for d_s, d_e in durm_windows)
        vishti  = _is_vishti(moon_lon, sun_lon)

        # ── Moon details ──
        moon_nk = get_nakshatra_and_starlord(moon_lon)
        moon_sign = get_sign(moon_lon)
        moon_nakshatra = moon_nk["nakshatra"]
        moon_star_lord = moon_nk["star_lord"]
        moon_sub_lord = get_sub_lord(moon_lon)

        # ── Lagna sign type & Badhaka/Maraka check ──
        sign_type = SIGN_TYPES.get(lagna_sign, "Movable")
        badhaka_house = BADHAKA_HOUSE[sign_type]
        badhaka_hit = badhaka_house in signified
        maraka_hit = bool(MARAKA_HOUSES & set(signified))

        # ── Event cusp CSL check ──
        group = EVENT_HOUSE_GROUPS.get(event_type, EVENT_HOUSE_GROUPS["marriage"])
        primary_cusp_idx = group["primary"] - 1  # 0-indexed
        event_cusp_lon = cusp_lons[primary_cusp_idx] % 360
        event_cusp_csl = get_sub_lord(event_cusp_lon)
        event_cusp_houses = _sublord_significations(event_cusp_csl, planets, cusp_lons)
        favorable_set = set([group["primary"]] + group["supporting"])
        event_cusp_confirms = bool(favorable_set & set(event_cusp_houses))

        # ── H11 CSL check ──
        h11_lon = cusp_lons[10] % 360  # 11th cusp, 0-indexed
        h11_csl = get_sub_lord(h11_lon)
        h11_houses = _sublord_significations(h11_csl, planets, cusp_lons)
        h11_confirms = bool(favorable_set & set(h11_houses))

        # ── Moon Star Lord favorable ──
        moon_sl_houses = _sublord_significations(moon_star_lord, planets, cusp_lons)
        moon_sl_favorable = bool(favorable_set & set(moon_sl_houses))

        # ── Panchang ──
        tithi_name = TITHI_NAMES[(tithi_num - 1) % 15]
        paksha = "Shukla" if tithi_num <= 15 else "Krishna"
        yoga_name = YOGA_NAMES[yoga_idx % 27]

        # ── Additional scoring ──
        event_cusp_bonus = 15 if event_cusp_confirms else 0
        h11_bonus = 10 if h11_confirms else 0
        moon_sl_bonus = 10 if moon_sl_favorable else 0

        # ── PR A2.2b: HARD-REJECT CHECKS ────────────────────────────
        # A window is hard-rejected if any classical KP rule is
        # structurally violated. Rejected windows still go into the
        # output (under `soft_flagged_windows`) so the astrologer can
        # review, but they do NOT rank in the top results leaderboard.
        hard_rejected_for = []

        # (1) Lagna CSL must signify the event's primary house (§2 KB).
        #     No primary = not an event-muhurtha by definition.
        event_primary_h = group["primary"]
        if event_primary_h not in signified:
            hard_rejected_for.append(
                f"Lagna CSL missing primary H{event_primary_h}"
            )

        # (2) Lagna CSL must NOT signify any event denial house (§1 KB).
        lagna_denial_hit = [h for h in group["denial"] if h in signified]
        if lagna_denial_hit:
            hard_rejected_for.append(
                f"Lagna CSL hits denial {lagna_denial_hit}"
            )

        # (3) Time-of-day practicality filter (KB §9.x event playbooks).
        prac_start, prac_end = EVENT_PRACTICAL_HOURS.get(
            event_type, (0, 24)
        )
        hh = current.hour
        within_practical = prac_start <= hh < prac_end
        if not within_practical:
            hard_rejected_for.append(
                f"Outside practical hours ({prac_start:02d}:00-{prac_end:02d}:00)"
            )

        # (4) Badhaka/Maraka upgraded from soft penalty to hard reject
        #     (§8.1 KB — these are participant-level hard filters).
        if badhaka_hit or maraka_hit:
            which = []
            if badhaka_hit:
                which.append("Badhaka")
            if maraka_hit:
                which.append("Maraka")
            hard_rejected_for.append(f"{'/'.join(which)} hit")
            # Keep the legacy -25 as a soft penalty on top so even
            # among soft-flagged windows, B/M hits rank lower.
            badhaka_penalty = -25
        else:
            badhaka_penalty = 0

        # (5) PR A2.2c — per-participant hard filters (§8.1).
        #     Chandrashtamam or Janma Tara on ANY participant → reject.
        if participant_hard_rejects:
            hard_rejected_for.extend(participant_hard_rejects)

        # ── PR A2.2b: NEW SOFT SCORING PENALTIES / BONUSES ─────────

        # Event CSL denial hit (asymmetric scoring, §1 Rule 3)
        event_cusp_denial_hit = [h for h in group["denial"] if h in event_cusp_houses]
        event_cusp_denial_penalty = -25 if event_cusp_denial_hit else 0

        # H11 CSL denial hit (§1 Rule 4)
        h11_denial_hit = [h for h in group["denial"] if h in h11_houses]
        h11_denial_penalty = -20 if h11_denial_hit else 0

        # Rikta-Nanda tithi (4/9/14 — esp. bad in Krishna paksha, §3.1 KB)
        tithi_within_cycle = ((tithi_num - 1) % 15) + 1
        rikta_nanda_penalty = 0
        if tithi_within_cycle in RIKTA_NANDA_AVOID_TITHIS:
            rikta_nanda_penalty = -15
            # Krishna paksha Navami (day 24 in 1..30) is doubly weak
            if tithi_num == 24:
                rikta_nanda_penalty = -20

        # Moon nakshatra class fit for event (§3.2 Muhurtha Chintamani
        # 10-class taxonomy crossed with §9.x per-event preference)
        nak_class = NAKSHATRA_CLASS.get(naks_idx)
        nak_bonus = 0
        preferred_nak_classes = EVENT_PREFERRED_NAK_CLASSES.get(event_type, [])
        avoid_nak_classes = EVENT_AVOID_NAK_CLASSES.get(event_type, [])
        if nak_class:
            if nak_class in preferred_nak_classes:
                nak_bonus = 12
            elif nak_class in avoid_nak_classes:
                nak_bonus = -15

        # Per-event weekday table (§3.4 KB — replaces global GOOD_VARA)
        preferred_varas = EVENT_PREFERRED_VARAS.get(event_type, set())
        avoid_varas = EVENT_AVOID_VARAS.get(event_type, set())
        # Rollback the global vara score applied earlier (lines above
        # added +10 for GOOD_VARA / -15 for BAD_VARA — undo that here
        # and re-apply per-event score instead).
        if vara in GOOD_VARA:
            base_score -= 10
        elif vara in BAD_VARA:
            base_score += 15
        per_event_vara_bonus = 0
        if vara in preferred_varas:
            per_event_vara_bonus = 10
        elif vara in avoid_varas:
            per_event_vara_bonus = -15

        # Lagna type (Movable/Fixed/Dual, §5.1 KB)
        lagna_type_bonus = 0
        preferred_lagna_types = EVENT_PREFERRED_LAGNA_TYPE.get(event_type, [])
        if sign_type in preferred_lagna_types:
            lagna_type_bonus = 10
        elif preferred_lagna_types:  # strict mismatch only when a preference exists
            lagna_type_bonus = -5

        # ── PR A2.2b: assemble effective_score with all new signals ──
        effective_score = (
            base_score
            + participant_bonus
            + badhaka_penalty
            + event_cusp_bonus
            + h11_bonus
            + moon_sl_bonus
            + event_cusp_denial_penalty
            + h11_denial_penalty
            + rikta_nanda_penalty
            + nak_bonus
            + per_event_vara_bonus
            + lagna_type_bonus
        )
        if in_rk:   effective_score -= 50
        if in_yg:   effective_score -= 60
        if in_gl:   effective_score -= 50
        if in_durm: effective_score -= 80
        if vishti:  effective_score -= 30

        if base_score >= 40:
            raw_windows.append({
                "date":              current.strftime("%Y-%m-%d"),
                "date_display":      current.strftime("%b %d, %Y (%A)"),
                "start_dt":          current,
                "start_time":        current.strftime("%H:%M"),
                "end_time":          (current + timedelta(minutes=4)).strftime("%H:%M"),
                "lagna":             get_sign(lagna_lon),
                "lagna_sublord":     lagna_sl,
                "lagna_star_lord":   lagna_star,
                "signified_houses":  sorted(signified),
                "base_score":        base_score,
                "tithi_num":         tithi_num,
                "participant_resonance": len(resonating_with),
                "resonating_with":   resonating_with,
                "score":             max(0, effective_score),
                "in_rahu_kalam":     in_rk,
                "in_yamagandam":     in_yg,
                "in_gulika":         in_gl,
                "in_durmuhurtha":    in_durm,
                "is_vishti":         vishti,
                "in_abhijit":        in_abhijit,
                "tara_bala":         tara_num,
                "tara_bala_name":    tara_name,
                "tara_bala_good":    tara_good,
                "chandrabala_good":  chandrabala_good,
                "hora_lord":         hora_lord,
                "hora_auspicious":   hora_auspicious,
                "lagna_lord_retrograde": lagna_lord_retro,
                "quality":           _quality(max(0, effective_score)),
                # New KP fields
                "moon_sign":         moon_sign,
                "moon_nakshatra":    moon_nakshatra,
                "moon_star_lord":    moon_star_lord,
                "moon_sub_lord":     moon_sub_lord,
                "lagna_sign_type":   sign_type,
                "badhaka_check": {
                    "passed": not (badhaka_hit or maraka_hit),
                    "badhaka_house": badhaka_house,
                    "sign_type": sign_type,
                    "badhaka_hit": badhaka_hit,
                    "maraka_hit": maraka_hit,
                },
                "event_cusp_csl":    event_cusp_csl,
                "event_cusp_houses": sorted(event_cusp_houses),
                "event_cusp_confirms": event_cusp_confirms,
                "h11_csl":           h11_csl,
                "h11_houses":        sorted(h11_houses),
                "h11_confirms":      h11_confirms,
                "moon_sl_favorable": moon_sl_favorable,
                "panchang": {
                    "tithi": tithi_name,
                    "tithi_num": tithi_num,
                    "paksha": paksha,
                    "nakshatra": moon_nakshatra,
                    "yoga": yoga_name,
                    "vara": current.strftime("%A"),
                },
                # PR A2.2b — structural flags + per-event scoring signals
                "hard_rejected_for": hard_rejected_for,
                "within_practical_hours": within_practical,
                "lagna_denial_hit":  lagna_denial_hit,
                "event_cusp_denial_hit": event_cusp_denial_hit,
                "h11_denial_hit":    h11_denial_hit,
                "nakshatra_class":   nak_class,
                "nakshatra_event_match": nak_class in preferred_nak_classes if nak_class else False,
                "vara_event_approved": vara in preferred_varas,
                "vara_event_avoided":  vara in avoid_varas,
                "lagna_type_event_preferred": sign_type in preferred_lagna_types,
                # PR A2.2c — per-participant evaluation (KB §8.1, §8.2)
                "per_participant":   per_participant,
                "participant_soft_total": participant_soft_total,
            })

        current += timedelta(minutes=4)

    return raw_windows


def _merge_windows(raw: list) -> list:
    """Merge consecutive 4-min windows sharing the same sub-lord.

    PR A2.2b — enforces a minimum 20-min window duration. Previously
    a bug in the merge step was overwriting end_time with the last
    slot's end (slot_start + 4 min), yielding 12-min windows from 3
    merged 4-min slices. Fix: end_time is always max(last_slot_end,
    first_slot_start + 20 min). Astrologers never see 12-min windows
    as top recommendations.
    """
    if not raw:
        return []
    merged = []
    cur = dict(raw[0])
    cur["_last_dt"] = cur["start_dt"]
    cur["_first_dt"] = cur["start_dt"]
    cur["end_time"] = (cur["start_dt"] + timedelta(minutes=20)).strftime("%H:%M")

    def _floor_end_time(w, last_dt, first_dt):
        """Return end_time as HH:MM, floored at first_dt + 20 min."""
        candidate = last_dt + timedelta(minutes=4)  # last 4-min slot's true end
        floor = first_dt + timedelta(minutes=20)
        return (candidate if candidate >= floor else floor).strftime("%H:%M")

    for w in raw[1:]:
        same_day = w["date"] == cur["date"]
        same_sl  = w["lagna_sublord"] == cur["lagna_sublord"]
        adjacent = (w["start_dt"] - cur["_last_dt"]) <= timedelta(minutes=8)

        if same_day and same_sl and adjacent:
            cur["_last_dt"] = w["start_dt"]
            cur["end_time"] = _floor_end_time(w, cur["_last_dt"], cur["_first_dt"])
            cur["score"]    = max(cur["score"], w["score"])
            cur["base_score"] = max(cur["base_score"], w["base_score"])
            cur["participant_resonance"] = max(cur["participant_resonance"], w["participant_resonance"])
            # PR A2.2b — a merged window is hard-rejected only if ALL
            # constituent 4-min slots are hard-rejected for the SAME
            # reason. Union rejection reasons so the astrologer sees
            # everything that flagged this window.
            cur_hr = cur.get("hard_rejected_for") or []
            w_hr = w.get("hard_rejected_for") or []
            # A window is hard_rejected if both adjacent slots had at
            # least one rejection (keeps best-slice logic consistent).
            if cur_hr and w_hr:
                cur["hard_rejected_for"] = sorted(set(cur_hr) | set(w_hr))
            elif not cur_hr and not w_hr:
                cur["hard_rejected_for"] = []
            else:
                # Mixed — keep the rejections from the rejected slot,
                # marked as "partial" so UI can distinguish.
                cur["hard_rejected_for"] = sorted(set(cur_hr) | set(w_hr))
            # Inherit new fields from highest-score slice
            if w["score"] > cur["score"]:
                for f in ("in_abhijit", "tara_bala", "tara_bala_name", "tara_bala_good",
                          "chandrabala_good", "hora_lord", "hora_auspicious", "lagna_lord_retrograde",
                          # PR A2.2c — per-participant snapshot belongs to the strongest slice
                          "per_participant", "participant_soft_total"):
                    if f in w:
                        cur[f] = w[f]
            cur["quality"] = _quality(cur["score"])
        else:
            merged.append(cur)
            cur = dict(w)
            cur["_last_dt"] = cur["start_dt"]
            cur["_first_dt"] = cur["start_dt"]
            cur["end_time"] = (cur["start_dt"] + timedelta(minutes=20)).strftime("%H:%M")

    merged.append(cur)
    for w in merged:
        w.pop("start_dt", None)
        w.pop("_last_dt", None)
        w.pop("_first_dt", None)
    return merged


# ── Public API ────────────────────────────────────────────────────

def find_muhurtha_windows(
    date_start: str,
    date_end: str,
    event_type: str,
    lat: float,
    lon: float,
    tz_offset: float,
    nearby_days: int = 3,
    participants: list = None,
    # NEW: event location (where the event happens)
    event_lat: Optional[float] = None,
    event_lon: Optional[float] = None,
    event_tz: Optional[float] = None,
) -> dict:
    """
    Find muhurtha windows in [date_start, date_end], plus +/-nearby_days.
    event_type can be a free-form string — it is classified automatically.

    event_lat/lon/tz: location where the event will happen.
    If not provided, uses birth location (lat/lon/tz_offset).
    """
    # Resolve event location (default to birth location)
    e_lat = event_lat if event_lat is not None else lat
    e_lon = event_lon if event_lon is not None else lon
    e_tz  = event_tz  if event_tz  is not None else tz_offset
    event_location_different = (event_lat is not None and
                                 (abs(event_lat - lat) > 0.01 or abs(event_lon - lon) > 0.01))

    classified_event = classify_event(event_type)

    start_dt = datetime.strptime(date_start, "%Y-%m-%d")
    end_dt   = datetime.strptime(date_end,   "%Y-%m-%d")

    if (end_dt - start_dt).days > 60:
        end_dt = start_dt + timedelta(days=60)

    # Pre-compute natal data for each participant
    participant_rps = []
    participant_natal_moon = []
    if participants:
        for p in participants:
            rps = _get_natal_rps(p)
            if rps:
                participant_rps.append((p.get("name", ""), rps))
            moon_data = _get_natal_moon_data(p)
            participant_natal_moon.append((p.get("name", ""), moon_data))

    selected_raw = _scan_date_range(
        start_dt, end_dt, classified_event,
        e_lat, e_lon, e_tz,
        participant_rps, participant_natal_moon
    )
    all_merged = _merge_windows(selected_raw)
    all_merged.sort(key=lambda w: w["score"], reverse=True)

    # Tag event location used on every window (passed + soft-flagged)
    for w in all_merged:
        w["event_location_used"] = event_location_different

    # PR A2.2b — three-tier result model.
    # Passed tier: no hard-reject flags → shown in the main leaderboard.
    # Soft-flagged tier: at least one hard-reject flag → returned under
    #   `soft_flagged_windows` so the astrologer can review but these
    #   do NOT rank in the top results. Dad's workflow: glance at soft
    #   pile to confirm nothing usable was hidden, then proceed with
    #   the passed tier.
    # PR A2.2c.1 — additionally require effective_score >= 30 for the
    # passed tier. The raw-window filter of base_score >= 40 doesn't
    # prevent a window from entering the leaderboard with effective
    # score 0 once all soft penalties apply (Event CSL denial, H11
    # denial, Rikta-Nanda tithi, nakshatra class mismatch, etc.).
    # A "passed" score-0 window is misleading — it passed structural
    # filters but is effectively Weak. Drop these into soft_flagged
    # with an explicit reason.
    PASSED_SCORE_FLOOR = 30
    selected_windows = []
    soft_flagged_windows = []
    for w in all_merged:
        if w.get("hard_rejected_for"):
            soft_flagged_windows.append(w)
        elif w.get("score", 0) < PASSED_SCORE_FLOOR:
            # Tag the reason so the UI / AI can explain the drop
            w["hard_rejected_for"] = ["Weak score after soft penalties"]
            soft_flagged_windows.append(w)
        else:
            selected_windows.append(w)

    date_windows: dict = {}
    for w in selected_windows:
        d = w["date"]
        if d not in date_windows:
            date_windows[d] = []
        if len(date_windows[d]) < 3:
            date_windows[d].append(w)

    best_selected_score = selected_windows[0]["score"] if selected_windows else 0

    nearby_better = None
    if nearby_days > 0:
        nearby_start = start_dt - timedelta(days=nearby_days)
        nearby_end   = end_dt   + timedelta(days=nearby_days)
        nearby_raw = _scan_date_range(
            nearby_start, nearby_end, classified_event,
            e_lat, e_lon, e_tz,
            participant_rps, participant_natal_moon
        )
        nearby_merged = _merge_windows(nearby_raw)
        nearby_merged.sort(key=lambda w: w["score"], reverse=True)

        def outside_range(w):
            d = datetime.strptime(w["date"], "%Y-%m-%d")
            return d < start_dt or d > end_dt

        # PR A2.2b.1 — nearby_better must also filter out hard-rejected
        # windows (outside practical hours, Lagna CSL denial hit, etc.).
        # Without this, the engine can claim "better window nearby" for
        # e.g. a 19:44 vehicle purchase — soft-flagged for being past
        # the 19:00 practical-hours cutoff, yet surfaced as a top
        # recommendation. Bug surfaced in real-world test 2026-04-23.
        nearby_only = [
            w for w in nearby_merged
            if outside_range(w) and not w.get("hard_rejected_for")
        ]
        if nearby_only and nearby_only[0]["score"] > best_selected_score + 20:
            nearby_better = nearby_only[0]
            nearby_better["event_location_used"] = event_location_different

    # PR A2.2c — extend-window logic (KB §8.5).
    # If nothing in the client's range passes hard filters, scan forward
    # up to 30 days for the next qualifying window. Classical practice:
    # "no qualifying muhurtha exists in your range; the next one is in
    # N days. Recommend waiting." (User's dad's exact workflow.)
    extend_suggestion = None
    if not selected_windows:
        extend_start = end_dt + timedelta(days=1)
        extend_end = end_dt + timedelta(days=30)
        extend_raw = _scan_date_range(
            extend_start, extend_end, classified_event,
            e_lat, e_lon, e_tz,
            participant_rps, participant_natal_moon,
        )
        extend_merged = _merge_windows(extend_raw)
        extend_passed = [w for w in extend_merged if not w.get("hard_rejected_for")]
        extend_passed.sort(key=lambda w: w["score"], reverse=True)
        if extend_passed:
            first = extend_passed[0]
            first_date = datetime.strptime(first["date"], "%Y-%m-%d")
            first["event_location_used"] = event_location_different
            extend_suggestion = {
                "window": first,
                "days_from_range_end": (first_date - end_dt).days,
                "blocking_reasons": (
                    # Summarize why the client's range had nothing.
                    # Collect reason frequencies across soft-flagged
                    # windows so the astrologer can tell the client
                    # "your range fails for these reasons".
                    _summarize_reasons(soft_flagged_windows)
                    if soft_flagged_windows else []
                ),
            }

    return {
        "windows":              selected_windows[:15],
        "soft_flagged_windows": soft_flagged_windows[:15],  # PR A2.2b
        "date_windows":         date_windows,
        "best_window":          selected_windows[0] if selected_windows else None,
        "nearby_better":        nearby_better,
        "extend_suggestion":    extend_suggestion,          # PR A2.2c
        "event_type":           classified_event,
        "event_label":          event_type,
        "searched_range":       {"start": date_start, "end": date_end},
        "participants_loaded":  [name for name, _ in participant_rps],
        "event_location_different": event_location_different,
        # PR A2.2b — surface counts so frontend banners can say
        # "3 top windows, 12 below threshold (astrologer review)".
        "passed_count":         len(selected_windows),
        "soft_flagged_count":   len(soft_flagged_windows),
    }


def _summarize_reasons(soft_flagged: list) -> list:
    """PR A2.2c — aggregate rejection reasons across soft-flagged
    windows so the extend-suggestion banner can say WHY the client's
    range had nothing (e.g., "All windows outside practical hours" or
    "Chandrashtamam blocks participant X from Apr 25 - May 2").

    Returns a list of {"reason": str, "count": int} sorted by count
    descending, top 5.
    """
    counter: dict = {}
    for w in soft_flagged:
        for r in w.get("hard_rejected_for", []):
            counter[r] = counter.get(r, 0) + 1
    out = [{"reason": r, "count": c} for r, c in counter.items()]
    out.sort(key=lambda x: x["count"], reverse=True)
    return out[:5]
