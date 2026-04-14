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
"""
import swisseph as swe
from datetime import datetime, timedelta
from typing import Optional, Tuple

from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign, get_planet_positions,
    date_time_to_julian
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
    if any(w in text for w in ["marriage", "wedding", "vivah", "పెళ్ళి", "వివాహ", "kalyanam"]):
        return "marriage"
    if any(w in text for w in ["vehicle", "car", "bike", "auto", "scooter", "vahana",
                                "delivery", "వాహన", "కార్", "బైక్"]):
        return "vehicle"
    if any(w in text for w in ["business", "shop", "office", "opening", "start", "launch",
                                "వ్యాపార", "దుకాణం"]):
        return "business"
    if any(w in text for w in ["house", "home", "graha", "griha", "warming", "flat",
                                "apartment", "గృహ", "ఇల్లు", "నివాసం"]):
        return "house_warming"
    if any(w in text for w in ["travel", "journey", "trip", "tour", "flight", "train",
                                "prayanam", "ప్రయాణ"]):
        return "travel"
    if any(w in text for w in ["education", "school", "college", "exam", "study", "course",
                                "admission", "విద్య", "పరీక్ష"]):
        return "education"
    if any(w in text for w in ["medical", "surgery", "operation", "hospital", "treatment",
                                "doctor", "వైద్య", "ఆపరేషన్"]):
        return "medical"
    if any(w in text for w in ["legal", "court", "case", "lawsuit", "vyajyam", "వ్యాజ్య",
                                "కోర్టు"]):
        return "legal"
    if any(w in text for w in ["invest", "stock", "fund", "property buy", "land", "gold",
                                "పెట్టుబడి"]):
        return "investment"
    return "general"


# ── Planet / sign constants ──────────────────────────────────────

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

# Hora lords cycle: Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars
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
        geopos_dummy = (0.0, 0.0, 0.0)   # placeholder; hora lord index doesn't depend on geopos
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
    if score >= 80:
        return "Excellent"
    if score >= 55:
        return "Good"
    if score >= 30:
        return "Fair"
    return "Avoid"


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

        tithi_num = int(((moon_lon - sun_lon) % 360) / 12) + 1
        if tithi_num in AUSPICIOUS_TITHIS:
            base_score += 20
        elif tithi_num in INAUSPICIOUS_TITHIS:
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

        # ── Tara Bala (primary participant) ───────────────────────
        tara_num, tara_name, tara_good = 0, "", True
        chandrabala_good = True
        if participant_natal_moon:
            # Use first/primary participant
            _, natal_data = participant_natal_moon[0]
            tara_num, tara_name, tara_good = _compute_tara_bala(
                natal_data["moon_nakshatra_idx"], moon_lon
            )
            _, chandrabala_good = _compute_chandrabala(
                natal_data["moon_sign_idx"], moon_lon
            )
            if tara_good:
                base_score += 25
            else:
                base_score -= 20
            if chandrabala_good:
                base_score += 15
            else:
                base_score -= 15

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

        effective_score = base_score + participant_bonus
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
            })

        current += timedelta(minutes=4)

    return raw_windows


def _merge_windows(raw: list) -> list:
    """Merge consecutive 4-min windows sharing the same sub-lord."""
    if not raw:
        return []
    merged = []
    cur = dict(raw[0])
    cur["_last_dt"] = cur["start_dt"]
    cur["end_time"] = (cur["start_dt"] + timedelta(minutes=20)).strftime("%H:%M")

    for w in raw[1:]:
        same_day = w["date"] == cur["date"]
        same_sl  = w["lagna_sublord"] == cur["lagna_sublord"]
        adjacent = (w["start_dt"] - cur["_last_dt"]) <= timedelta(minutes=8)

        if same_day and same_sl and adjacent:
            cur["end_time"] = w["end_time"]
            cur["_last_dt"] = w["start_dt"]
            cur["score"]    = max(cur["score"], w["score"])
            cur["base_score"] = max(cur["base_score"], w["base_score"])
            cur["participant_resonance"] = max(cur["participant_resonance"], w["participant_resonance"])
            # Inherit new fields from highest-score slice
            if w["score"] > cur["score"]:
                for f in ("in_abhijit", "tara_bala", "tara_bala_name", "tara_bala_good",
                          "chandrabala_good", "hora_lord", "hora_auspicious", "lagna_lord_retrograde"):
                    cur[f] = w[f]
            cur["quality"] = _quality(cur["score"])
        else:
            merged.append(cur)
            cur = dict(w)
            cur["_last_dt"] = cur["start_dt"]
            cur["end_time"] = (cur["start_dt"] + timedelta(minutes=20)).strftime("%H:%M")

    merged.append(cur)
    for w in merged:
        w.pop("start_dt", None)
        w.pop("_last_dt", None)
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
    Find muhurtha windows in [date_start, date_end], plus ±nearby_days.
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
    selected_windows = _merge_windows(selected_raw)
    selected_windows.sort(key=lambda w: w["score"], reverse=True)

    # Tag event location used
    for w in selected_windows:
        w["event_location_used"] = event_location_different

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

        nearby_only = [w for w in nearby_merged if outside_range(w)]
        if nearby_only and nearby_only[0]["score"] > best_selected_score + 20:
            nearby_better = nearby_only[0]
            nearby_better["event_location_used"] = event_location_different

    return {
        "windows":              selected_windows[:15],
        "date_windows":         date_windows,
        "best_window":          selected_windows[0] if selected_windows else None,
        "nearby_better":        nearby_better,
        "event_type":           classified_event,
        "event_label":          event_type,
        "searched_range":       {"start": date_start, "end": date_end},
        "participants_loaded":  [name for name, _ in participant_rps],
        "event_location_different": event_location_different,
    }
