"""
KP Muhurtha Engine — finds auspicious time windows for events.
Scans every 4 minutes, scores each Lagna sub-lord against event house requirements.
Supports multi-person muhurtha: adds natal RP resonance bonus per participant.
"""
import swisseph as swe
from datetime import datetime, timedelta

from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign, get_planet_positions,
    date_time_to_julian
)

# ── Event house requirements ──────────────────────────────────

EVENT_HOUSE_GROUPS = {
    "marriage":      {"primary": 7,  "supporting": [2, 11],    "denial": [1, 6, 10, 12]},
    "business":      {"primary": 10, "supporting": [2, 6, 11], "denial": [1, 5, 9, 12]},
    "house_warming": {"primary": 4,  "supporting": [11, 12],   "denial": [3, 10]},
    "travel":        {"primary": 9,  "supporting": [3, 12],    "denial": [2, 8, 11]},
    "education":     {"primary": 4,  "supporting": [9, 11],    "denial": [3, 12]},
    # Extended event types
    "vehicle":       {"primary": 4,  "supporting": [11],       "denial": [3, 8, 12]},
    "medical":       {"primary": 1,  "supporting": [5, 11],    "denial": [6, 8, 12]},
    "legal":         {"primary": 6,  "supporting": [11],       "denial": [5, 8, 12]},
    "investment":    {"primary": 2,  "supporting": [5, 11],    "denial": [8, 12]},
    "general":       {"primary": 1,  "supporting": [2, 11],    "denial": [6, 8, 12]},
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

# ── Sign lords ────────────────────────────────────────────────

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
}

# Rahu Kalam slot index (0-based) per weekday (0=Mon, 6=Sun)
RAHU_KALAM_SLOTS = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}

# Yamagandam slot index per weekday
YAMAGANDAM_SLOTS = {0: 4, 1: 3, 2: 2, 3: 1, 4: 0, 5: 6, 6: 5}

# Gulika Kalam slot index per weekday
GULIKA_SLOTS = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0}

# Auspicious Tithi numbers (1-based, 30 = Amavasya)
AUSPICIOUS_TITHIS = {2, 3, 5, 7, 10, 11, 13}
INAUSPICIOUS_TITHIS = {4, 6, 8, 12, 14, 15, 30}

# Auspicious Nakshatras for muhurtha (by index 0-26)
# Ashwini(0), Mrigashira(4), Punarvasu(6), Pushya(7), Hasta(12),
# Chitra(13), Swati(14), Jyeshtha(17), Shravana(21), Dhanishtha(22), Shatabhisha(23)
AUSPICIOUS_NAKSHATRA_IDX = {0, 4, 6, 7, 12, 13, 14, 17, 21, 22, 23}

# Inauspicious Yoga indices (0-based): Vishkambha(0), Ganda(9), Vyaghata(12),
# Vajra(14), Vyatipata(16), Parigha(18), Vaidhriti(26)
INAUSPICIOUS_YOGA_IDX = {0, 9, 12, 14, 16, 18, 26}

# Good weekdays for muhurtha (0=Mon, 6=Sun)
GOOD_VARA = {0, 2, 3, 4}   # Mon, Wed, Thu, Fri
BAD_VARA  = {1, 5}          # Tue, Sat


# ── Helpers ───────────────────────────────────────────────────

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


def _get_day_slots(jd_noon: float, lat: float, lon: float, weekday: int) -> dict:
    """Compute sunrise/sunset and return all inauspicious time windows for a day."""
    geopos = (lon, lat, 0.0)
    try:
        _, tr = swe.rise_trans(jd_noon - 0.5, swe.SUN, b"", 0,
                               swe.CALC_RISE | swe.BIT_DISC_CENTER, geopos, 1013.25, 10.0)
        sunrise = tr[1]
        _, ts = swe.rise_trans(sunrise, swe.SUN, b"", 0,
                               swe.CALC_SET | swe.BIT_DISC_CENTER, geopos, 1013.25, 10.0)
        sunset = ts[1]
    except Exception:
        sunrise = jd_noon - 0.25
        sunset = jd_noon + 0.25

    slot_dur = (sunset - sunrise) / 8.0

    rk_slot = RAHU_KALAM_SLOTS[weekday]
    rk_start = sunrise + rk_slot * slot_dur
    rk_end   = rk_start + slot_dur

    yg_slot  = YAMAGANDAM_SLOTS[weekday]
    yg_start = sunrise + yg_slot * slot_dur
    yg_end   = yg_start + slot_dur

    gl_slot  = GULIKA_SLOTS[weekday]
    gl_start = sunrise + gl_slot * slot_dur
    gl_end   = gl_start + slot_dur

    # Durmuhurtha: ~48 min windows at 10:24-11:12 and 15:00-15:48 local
    # Approximate as offsets from sunrise (sun typically rises between 5:30-7:30)
    # Better: compute as fixed clock hours. Sunrise_jd → local HH
    # We'll use the JD to approximate: sunrise + 4h/24 ≈ 10:30 window
    # Use absolute JD offset from midnight:
    durm1_start = jd_noon - 1.0/24 * 1.55  # ~10:24 local = approx
    durm1_end   = durm1_start + 48.0 / 1440.0
    durm2_start = jd_noon + 3.0 / 24.0     # ~15:00 local = noon + 3h
    durm2_end   = durm2_start + 48.0 / 1440.0

    return {
        "rk":   (rk_start, rk_end),
        "yg":   (yg_start, yg_end),
        "gl":   (gl_start, gl_end),
        "dur1": (durm1_start, durm1_end),
        "dur2": (durm2_start, durm2_end),
    }


# Keep backward-compatible alias
def _get_rahu_kalam_jd(jd_noon: float, lat: float, lon: float, weekday: int) -> tuple:
    slots = _get_day_slots(jd_noon, lat, lon, weekday)
    return slots["rk"]


def _is_vishti(moon_lon: float, sun_lon: float) -> bool:
    """True if current karana is Vishti (Bhadra) — inauspicious."""
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff / 6)
    if idx == 0 or idx > 56:
        return False
    return (idx - 1) % 7 == 6


def _score(signified: list, event_type: str) -> int:
    """Score 0-75 based on house relevance for event."""
    group = EVENT_HOUSE_GROUPS.get(event_type, EVENT_HOUSE_GROUPS["marriage"])
    score = 0
    if group["primary"] in signified:
        score += 40
    for h in group["supporting"]:
        if h in signified:
            score += 15
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


# ── Multi-chart participant RP calculation ────────────────────

def _get_natal_rps(participant: dict) -> set:
    """
    Get natal Ruling Planets for a participant.
    Returns set of planet names: {lagna_sign_lord, lagna_star_lord, moon_sign_lord, moon_star_lord}
    """
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


# ── Core scan function ────────────────────────────────────────

def _scan_date_range(
    start_dt: datetime, end_dt: datetime,
    event_type: str, lat: float, lon: float, tz_offset: float,
    participant_rps: list = None   # list of (name, set_of_rp_planets)
) -> list:
    """Scan a date range every 4 minutes, return raw scored windows."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    participant_rps = participant_rps or []

    raw_windows = []
    planet_cache: dict = {}
    slot_cache: dict = {}   # replaces rahu_cache — stores all inauspicious windows

    current = start_dt.replace(hour=5, minute=0, second=0, microsecond=0)
    end = end_dt.replace(hour=21, minute=0, second=0, microsecond=0)

    while current <= end:
        jd = swe.julday(
            current.year, current.month, current.day,
            current.hour + current.minute / 60.0 - tz_offset
        )

        # Planet positions cached per hour
        hr_key = current.strftime("%Y-%m-%d %H")
        if hr_key not in planet_cache:
            planet_cache[hr_key] = get_planet_positions(jd)
        planets = planet_cache[hr_key]

        # Inauspicious time slots cached per day
        day_key = current.strftime("%Y-%m-%d")
        if day_key not in slot_cache:
            jd_noon = swe.julday(current.year, current.month, current.day, 12.0 - tz_offset)
            slot_cache[day_key] = _get_day_slots(jd_noon, lat, lon, current.weekday())
        slots = slot_cache[day_key]
        rk_start, rk_end = slots["rk"]
        yg_start, yg_end = slots["yg"]
        gl_start, gl_end = slots["gl"]
        d1_start, d1_end = slots["dur1"]
        d2_start, d2_end = slots["dur2"]

        # House cusps
        cusps, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
        cusp_lons = list(cusps[:12])
        lagna_lon = cusp_lons[0] % 360

        lagna_sl = get_sub_lord(lagna_lon)
        lagna_star = get_nakshatra_and_starlord(lagna_lon)["star_lord"]
        signified = _sublord_significations(lagna_sl, planets, cusp_lons)

        base_score = _score(signified, event_type)

        # ── Traditional panchang factors ──────────────────────────
        moon_lon = planets.get("Moon", {}).get("longitude", 0)
        sun_lon  = planets.get("Sun",  {}).get("longitude", 0)

        # Tithi
        tithi_num = int(((moon_lon - sun_lon) % 360) / 12) + 1
        if tithi_num in AUSPICIOUS_TITHIS:
            base_score += 20
        elif tithi_num in INAUSPICIOUS_TITHIS:
            base_score -= 30

        # Moon Nakshatra
        naks_idx = int((moon_lon % 360) / (360 / 27))
        if naks_idx in AUSPICIOUS_NAKSHATRA_IDX:
            base_score += 15

        # Yoga
        yoga_idx = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27
        if yoga_idx in INAUSPICIOUS_YOGA_IDX:
            base_score -= 40

        # Weekday (Vara)
        vara = current.weekday()
        if vara in GOOD_VARA:
            base_score += 10
        elif vara in BAD_VARA:
            base_score -= 15

        # ── Multi-chart participant resonance bonus ────────────────
        resonating_with = [name for name, rps in participant_rps if lagna_sl in rps]
        participant_bonus = len(resonating_with) * 10

        # ── Inauspicious time penalties ───────────────────────────
        in_rk    = rk_start <= jd <= rk_end
        in_yg    = yg_start <= jd <= yg_end
        in_gl    = gl_start <= jd <= gl_end
        in_durm  = (d1_start <= jd <= d1_end) or (d2_start <= jd <= d2_end)
        vishti   = _is_vishti(moon_lon, sun_lon)

        effective_score = base_score + participant_bonus
        if in_rk:   effective_score -= 50
        if in_yg:   effective_score -= 60
        if in_gl:   effective_score -= 50
        if in_durm: effective_score -= 80
        if vishti:  effective_score -= 30

        if base_score >= 40:
            raw_windows.append({
                "date": current.strftime("%Y-%m-%d"),
                "date_display": current.strftime("%b %d, %Y (%A)"),
                "start_dt": current,
                "start_time": current.strftime("%H:%M"),
                "end_time": (current + timedelta(minutes=4)).strftime("%H:%M"),
                "lagna": get_sign(lagna_lon),
                "lagna_sublord": lagna_sl,
                "lagna_star_lord": lagna_star,
                "signified_houses": sorted(signified),
                "base_score": base_score,
                "tithi_num": tithi_num,
                "participant_resonance": len(resonating_with),
                "resonating_with": resonating_with,
                "score": max(0, effective_score),
                "in_rahu_kalam": in_rk,
                "in_yamagandam": in_yg,
                "in_gulika": in_gl,
                "in_durmuhurtha": in_durm,
                "is_vishti": vishti,
                "quality": _quality(max(0, effective_score)),
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
        same_sl = w["lagna_sublord"] == cur["lagna_sublord"]
        adjacent = (w["start_dt"] - cur["_last_dt"]) <= timedelta(minutes=8)

        if same_day and same_sl and adjacent:
            cur["end_time"] = w["end_time"]
            cur["_last_dt"] = w["start_dt"]
            cur["score"] = max(cur["score"], w["score"])
            cur["base_score"] = max(cur["base_score"], w["base_score"])
            cur["participant_resonance"] = max(cur["participant_resonance"], w["participant_resonance"])
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


# ── Public API ────────────────────────────────────────────────

def find_muhurtha_windows(
    date_start: str,
    date_end: str,
    event_type: str,
    lat: float,
    lon: float,
    tz_offset: float,
    nearby_days: int = 3,
    participants: list = None,
) -> dict:
    """
    Find muhurtha windows in [date_start, date_end], plus ±nearby_days.
    event_type can be a free-form string — it is classified automatically.
    Returns {windows, date_windows, nearby_better, best_window, participant_rps_used}.
    """
    # Classify free-form event description into a known event key
    classified_event = classify_event(event_type)

    start_dt = datetime.strptime(date_start, "%Y-%m-%d")
    end_dt = datetime.strptime(date_end, "%Y-%m-%d")

    if (end_dt - start_dt).days > 60:
        end_dt = start_dt + timedelta(days=60)

    # Pre-compute natal RPs for each participant
    participant_rps = []
    if participants:
        for p in participants:
            rps = _get_natal_rps(p)
            if rps:
                participant_rps.append((p.get("name", ""), rps))

    selected_raw = _scan_date_range(start_dt, end_dt, classified_event, lat, lon, tz_offset, participant_rps)
    selected_windows = _merge_windows(selected_raw)
    selected_windows.sort(key=lambda w: w["score"], reverse=True)

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
        nearby_end = end_dt + timedelta(days=nearby_days)
        nearby_raw = _scan_date_range(nearby_start, nearby_end, classified_event, lat, lon, tz_offset, participant_rps)
        nearby_merged = _merge_windows(nearby_raw)
        nearby_merged.sort(key=lambda w: w["score"], reverse=True)

        def outside_range(w):
            d = datetime.strptime(w["date"], "%Y-%m-%d")
            return d < start_dt or d > end_dt

        nearby_only = [w for w in nearby_merged if outside_range(w)]
        if nearby_only and nearby_only[0]["score"] > best_selected_score + 20:
            nearby_better = nearby_only[0]

    return {
        "windows": selected_windows[:15],
        "date_windows": date_windows,
        "best_window": selected_windows[0] if selected_windows else None,
        "nearby_better": nearby_better,
        "event_type": classified_event,
        "event_label": event_type,
        "searched_range": {"start": date_start, "end": date_end},
        "participants_loaded": [name for name, _ in participant_rps],
    }
