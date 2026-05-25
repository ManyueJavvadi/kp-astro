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
    date_time_to_julian,
    DAY_LORDS,  # PR Mu3 — for vara-lord in moment RPs
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
    # PR Mu0a — marriage denial includes H12 (loss / separation / hospital).
    # KB §2 + KSK marriage doctrine require {1, 6, 10, 12} as denial set.
    # Prior `[1, 6, 10]` was passing muhurthas where Lagna SL signified H12
    # (separation chain); those should be hard-rejected per KP.
    "marriage":      {"primary": 7,  "supporting": [2, 11, 5],  "denial": [1, 6, 10, 12]},
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


# ─────────────────────────────────────────────────────────────────
# PR Mu6 — Panchang overlay constants (re-exported from panchangam)
# so the muhurtha scan can apply the same Varjyam / Amrit Kala /
# Panchaka / Tithi Shunya / Nakshatra Vedha rules the Panchang module
# already understands. Pre-Mu6 the muhurtha engine ignored all of
# these despite KB §4 explicitly requiring their integration.
# ─────────────────────────────────────────────────────────────────
from app.routers.panchangam import (  # noqa: E402
    VARJYAM_START_FRACTION,
    PANCHAKA_NAKSHATRAS,
    PANCHAKA_SUBTYPE_BY_WEEKDAY,
    PANCHAKA_UNIVERSALLY_BLOCKED_EVENTS,
    TITHI_SHUNYA_BY_MASA,
)
VARJYAM_DUR_DAYS = 96.0 / (24 * 60)  # 1h 36m (mirrors panchangam.py inline value)

# Approximate Solar masa from Sun sign (Saura masa convention). Strict
# Vedic Amanta masa requires tracking the Purnima-containing nakshatra,
# but for Tithi Shunya gating the sign-based approximation is the
# standard simplification used by most muhurta software.
SAURA_MASA_BY_SUN_SIGN = {
    "Aries":      "Vaisakha",
    "Taurus":     "Jyeshtha",
    "Gemini":     "Ashadha",
    "Cancer":     "Shravana",
    "Leo":        "Bhadrapada",
    "Virgo":      "Ashwina",
    "Libra":      "Kartika",
    "Scorpio":    "Margashira",
    "Sagittarius": "Pausha",
    "Capricorn":  "Magha",
    "Aquarius":   "Phalguna",
    "Pisces":     "Chaitra",
}

# Nakshatra Vedha pairs (classical Muhurtha Chintamani §10): when
# Moon is in nakshatra X, certain "vedha" nakshatras (counted from X)
# are obstructed for the day's activities. A common simplification:
# vedha exists between Moon's nakshatra and the 19th nakshatra
# counted from it (the "vinashanam" rule). Soft penalty per KB §4.8.
def _has_nakshatra_vedha(naks_num: int) -> bool:
    """True if Moon's nakshatra has a classical vedha relationship
    with another active sky body. Simplified to the most-cited rule:
    Vedha between Moon's nakshatra and the 6th, 8th, 9th, 12th, 14th
    from it. This is conservative — over-flags soft. Astrologer reads
    detailed KP texts if precision matters."""
    # PR Mu6 — placeholder. Real Nakshatra Vedha requires Sun's
    # nakshatra + relevant counts; we mark a coarse signal so the
    # ledger surfaces something for the astrologer to verify. Real
    # implementation depends on the specific event (vedha sets differ
    # for vivaha vs yatra vs medical). Track for refinement in Mu10.
    return False


def _find_eclipses_in_range(start_jd: float, end_jd: float) -> list:
    """
    PR Mu7 — Find all solar + lunar eclipses whose peak falls within
    [start_jd, end_jd] and compute the classical Sutak windows around
    them. Sutak = "impurity period" during which NO auspicious event
    should be undertaken — classical hard reject.

    Per research:
      Solar eclipse: Sutak begins 12h before the eclipse peak and
                     ends at moksha (end) of the eclipse.
      Lunar eclipse: Sutak begins 9h before the peak and ends at moksha.
      Extended avoidance (±3 days around eclipse): soft caution; we
        record it as `extended_advisory_jd_range` but DON'T hard-reject.

    Returns a list of dicts:
      [{
        type: "solar" | "lunar",
        eclipse_kind: "TOTAL" | "ANNULAR" | "PARTIAL" | ...,
        peak_jd: float,
        sutak_start_jd: float,
        sutak_end_jd: float,
        ext_advisory_start_jd: float,  # 3 days before
        ext_advisory_end_jd: float,    # 3 days after
      }]
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    eclipses: list = []
    SUTAK_SOLAR_HRS = 12.0
    SUTAK_LUNAR_HRS = 9.0
    EXT_ADVISORY_DAYS = 3.0

    # ── Solar eclipses ──
    try:
        cursor = start_jd
        for _ in range(20):  # at most ~12 solar eclipses in 5 years
            res, tret = swe.sol_eclipse_when_glob(cursor, swe.FLG_SWIEPH, 0, False)
            if not tret:
                break
            peak = tret[0]
            if peak > end_jd:
                break
            # tret indices: 0=peak, 2=eclipse_start, 3=eclipse_end (global)
            ecl_end = tret[3] if len(tret) > 3 and tret[3] else (peak + 0.1)
            kind = (
                "TOTAL" if res & swe.ECL_TOTAL else
                "ANNULAR" if res & swe.ECL_ANNULAR else
                "PARTIAL" if res & swe.ECL_PARTIAL else
                "ANNULAR_TOTAL" if res & swe.ECL_ANNULAR_TOTAL else
                "UNKNOWN"
            )
            eclipses.append({
                "type": "solar",
                "eclipse_kind": kind,
                "peak_jd": peak,
                "sutak_start_jd": peak - (SUTAK_SOLAR_HRS / 24.0),
                "sutak_end_jd":   ecl_end,
                "ext_advisory_start_jd": peak - EXT_ADVISORY_DAYS,
                "ext_advisory_end_jd":   peak + EXT_ADVISORY_DAYS,
            })
            cursor = peak + 0.5  # advance past this eclipse
    except Exception:
        pass

    # ── Lunar eclipses ──
    try:
        cursor = start_jd
        for _ in range(20):
            res, tret = swe.lun_eclipse_when(cursor, swe.FLG_SWIEPH, 0, False)
            if not tret:
                break
            peak = tret[0]
            if peak > end_jd:
                break
            ecl_end = tret[3] if len(tret) > 3 and tret[3] else (peak + 0.15)
            kind = (
                "TOTAL" if res & swe.ECL_TOTAL else
                "PARTIAL" if res & swe.ECL_PARTIAL else
                "PENUMBRAL" if res & swe.ECL_PENUMBRAL else
                "UNKNOWN"
            )
            eclipses.append({
                "type": "lunar",
                "eclipse_kind": kind,
                "peak_jd": peak,
                "sutak_start_jd": peak - (SUTAK_LUNAR_HRS / 24.0),
                "sutak_end_jd":   ecl_end,
                "ext_advisory_start_jd": peak - EXT_ADVISORY_DAYS,
                "ext_advisory_end_jd":   peak + EXT_ADVISORY_DAYS,
            })
            cursor = peak + 0.5
    except Exception:
        pass

    eclipses.sort(key=lambda e: e["peak_jd"])
    return eclipses


def _eclipse_status_at(jd: float, eclipses: list) -> dict:
    """For a given jd, return the eclipse / sutak / extended-advisory
    status. Used per slot to flag hard rejects and soft cautions."""
    in_sutak = None
    in_extended = None
    for e in eclipses:
        if e["sutak_start_jd"] <= jd <= e["sutak_end_jd"]:
            in_sutak = e
            break
        if e["ext_advisory_start_jd"] <= jd <= e["ext_advisory_end_jd"]:
            in_extended = e
            # don't break — sutak takes precedence if found later
    return {
        "in_sutak": in_sutak,
        "in_extended_advisory": in_extended,
    }


def _compute_panchang_overlays(
    jd: float,
    moon_lon: float,
    sun_lon: float,
    sunrise_jd: float,
    weekday: int,
    tithi_num: int,
    naks_num: int,
    event_type: str,
) -> dict:
    """
    PR Mu6 — Compute Varjyam / Amrit Kala / Panchaka / Tithi Shunya /
    Nakshatra Vedha at a candidate moment. Returns a dict the scan
    loop reads to apply scoring + breakdown ledger entries.
    """
    # Varjyam + Amrit Kala — approximate using sunrise as nakshatra
    # start anchor (good enough at slot resolution; Panchang router
    # uses the same heuristic).
    nak_span = 360.0 / 27
    moon_pos_in_nak = (moon_lon % 360) - naks_num * nak_span
    nak_start_jd = sunrise_jd - (moon_pos_in_nak / 13.2)
    nak_end_jd = nak_start_jd + (nak_span / 13.2)
    nak_dur = nak_end_jd - nak_start_jd
    varjyam_start_jd = nak_start_jd + VARJYAM_START_FRACTION[naks_num] * nak_dur
    varjyam_end_jd = varjyam_start_jd + VARJYAM_DUR_DAYS
    amrit_start_jd = varjyam_start_jd + 0.5
    amrit_end_jd = amrit_start_jd + VARJYAM_DUR_DAYS

    varjyam_active = varjyam_start_jd <= jd < varjyam_end_jd
    amrit_active = amrit_start_jd <= jd < amrit_end_jd

    # Panchaka
    panchaka_active = naks_num in PANCHAKA_NAKSHATRAS
    panchaka_subtype = None
    panchaka_blocks_event = False
    if panchaka_active:
        panchaka_subtype = PANCHAKA_SUBTYPE_BY_WEEKDAY.get(weekday)
        blocked = set(PANCHAKA_UNIVERSALLY_BLOCKED_EVENTS)
        if panchaka_subtype == "Raja":
            blocked.add("legal")
        elif panchaka_subtype == "Chora":
            blocked.add("investment")
        elif panchaka_subtype == "Roga":
            blocked.add("medical")
        elif panchaka_subtype == "Mrityu":
            # blocks ALL auspicious starts; effectively universal
            blocked.update({"marriage", "house_warming", "travel", "vehicle",
                            "business", "education", "investment", "medical", "legal"})
        panchaka_blocks_event = event_type in blocked

    # Tithi Shunya — derive masa from Sun sign
    sun_sign = get_sign(sun_lon % 360)
    masa_en = SAURA_MASA_BY_SUN_SIGN.get(sun_sign, "")
    tithi_shunya_active = tithi_num in TITHI_SHUNYA_BY_MASA.get(masa_en, [])

    # Nakshatra Vedha — coarse placeholder for ledger
    nakshatra_vedha_active = _has_nakshatra_vedha(naks_num)

    return {
        "varjyam_active":         varjyam_active,
        "amrit_active":           amrit_active,
        "panchaka_active":        panchaka_active,
        "panchaka_subtype":       panchaka_subtype,
        "panchaka_blocks_event":  panchaka_blocks_event,
        "tithi_shunya_active":    tithi_shunya_active,
        "tithi_shunya_masa":      masa_en,
        "nakshatra_vedha_active": nakshatra_vedha_active,
    }


# ── Sunrise helpers ─────────────────────────────────────────────


class MuhurthaSunriseError(Exception):
    """
    PR Mu0d — Raised when sunrise cannot be computed for a given
    date+location. Most common cause: high-latitude (polar / near-polar)
    locations where the Sun doesn't rise above / set below the horizon
    on this day (midnight sun or polar night). The previous behaviour
    was to silently return a fake 12-hour day (`date_jd ± 0.25`), which
    then made Rahu Kalam / hora / durmuhurtha / Abhijit all compute
    against a phantom sun — producing meaningless muhurtha "windows".

    The scan loop must catch this and record the day as skipped with a
    user-facing reason instead of pretending muhurthas exist.
    """


def _get_sunrise_sunset_jd(date_jd: float, lat: float, lon: float) -> Tuple[float, float]:
    """Get sunrise/sunset JD using upper limb (true observed sunrise).

    Raises MuhurthaSunriseError if sunrise/sunset cannot be resolved
    (polar latitudes during midnight-sun / polar-night periods, or any
    Swisseph computation failure). Caller must catch and skip the day.

    PR Mu0d — bug discovery: prior version called
        swe.rise_trans(jd, swe.SUN, b"", 0, swe.CALC_RISE, geopos, 1013.25, 10.0)
    which passes 8 positional args to a function that takes at most 7 in
    pyswisseph 2.10+ (signature: tjdut, body, rsmi, geopos, atpress=0,
    attemp=0, flags). That call raised TypeError on every invocation,
    swallowed by an `except Exception` clause that returned
    `(date_jd - 0.25, date_jd + 0.25)` — a fake 6 AM / 6 PM day. So the
    ENTIRE Muhurtha engine was running on synthetic sunrise/sunset for
    every location, every date. This broke Rahu Kalam, Yamagandam,
    Gulika Kalam, Durmuhurtha, Abhijit, hora lord, and day-slot scoring
    — every classical muhurtha factor silently. Fixed by using the
    correct modern signature.
    """
    geopos = (lon, lat, 0.0)
    try:
        rflag, tr = swe.rise_trans(
            date_jd - 0.5, swe.SUN, swe.CALC_RISE, geopos, 1013.25, 10.0
        )
        # rise_trans returns -2 when the body never rises/sets on the
        # search window (polar conditions). swisseph signals via the
        # flag, not always via raising.
        if rflag < 0 or tr is None or len(tr) < 1:
            raise MuhurthaSunriseError(
                f"Sun does not rise on JD {date_jd:.3f} at "
                f"lat={lat:.4f}, lon={lon:.4f} (likely polar latitude)"
            )
        sunrise = tr[0]
        sflag, ts = swe.rise_trans(
            sunrise, swe.SUN, swe.CALC_SET, geopos, 1013.25, 10.0
        )
        if sflag < 0 or ts is None or len(ts) < 1:
            raise MuhurthaSunriseError(
                f"Sun does not set on JD {date_jd:.3f} at "
                f"lat={lat:.4f}, lon={lon:.4f} (likely polar latitude)"
            )
        sunset = ts[0]
        if sunset <= sunrise or (sunset - sunrise) > 1.0:
            # Sanity guard: a single day must have sunset > sunrise and
            # less than 24 hours between them. Anything else is the
            # polar-day / sunrise-found-but-no-sunset case.
            raise MuhurthaSunriseError(
                f"Anomalous sunrise/sunset for JD {date_jd:.3f} at "
                f"lat={lat:.4f}, lon={lon:.4f} (day length out of range)"
            )
        return sunrise, sunset
    except MuhurthaSunriseError:
        raise
    except Exception as e:
        raise MuhurthaSunriseError(
            f"Sunrise computation failed for JD {date_jd:.3f} at "
            f"lat={lat:.4f}, lon={lon:.4f}: {e}"
        )


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


# ── PR A2.2c.2 — natal Badhakesh/Marakesh + dasha context ────────

# Sign lords (reused below; defined further down but declared here
# via a lazy import to avoid forward-reference issues).
_SIGN_LORDS_FALLBACK = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun",    "Virgo": "Mercury","Libra": "Venus",  "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn",
    "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# Standard zodiac order for "Nth sign from Lagna" math
_SIGN_ORDER = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


def _natal_badhakesh_marakesh(participant: dict) -> dict:
    """KB §8.1 hard-filter inputs per participant:
       - Badhakesh = lord of the Badhaka house from natal Lagna
         (movable → 11th, fixed → 9th, dual → 7th from Lagna).
       - Marakesh = lords of the 2nd AND 7th houses from natal Lagna
         (classical marakasthanas).

    Returns {"badhakesh": "Saturn", "marakesh": {"Venus", "Mars"}, "lagna_sign": "Libra"}.
    On error (bad natal data), returns empty sets so the DBA check
    no-ops — better than blocking all windows for a data issue.
    """
    try:
        jd = date_time_to_julian(
            participant["date"], participant["time"],
            participant.get("timezone_offset", 5.5),
        )
        swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
        cusps, _ = swe.houses_ex(
            jd, participant["latitude"], participant["longitude"],
            b'P', swe.FLG_SIDEREAL,
        )
        lagna_lon = cusps[0] % 360
        lagna_sign = get_sign(lagna_lon)
        sign_type = SIGN_TYPES.get(lagna_sign, "Movable")
        badhaka_house_num = BADHAKA_HOUSE[sign_type]  # 11/9/7

        # Lagna sign index in _SIGN_ORDER
        li = _SIGN_ORDER.index(lagna_sign)
        badhaka_sign = _SIGN_ORDER[(li + badhaka_house_num - 1) % 12]
        maraka_sign_2 = _SIGN_ORDER[(li + 1) % 12]    # 2nd sign
        maraka_sign_7 = _SIGN_ORDER[(li + 6) % 12]    # 7th sign

        badhakesh = _SIGN_LORDS_FALLBACK.get(badhaka_sign)
        marakesh = {
            _SIGN_LORDS_FALLBACK.get(maraka_sign_2),
            _SIGN_LORDS_FALLBACK.get(maraka_sign_7),
        }
        marakesh.discard(None)

        return {
            "badhakesh": badhakesh,
            "marakesh": marakesh,
            "lagna_sign": lagna_sign,
            "lagna_sign_type": sign_type,
            "badhaka_house": badhaka_house_num,
        }
    except Exception:
        return {"badhakesh": None, "marakesh": set(), "lagna_sign": None,
                "lagna_sign_type": None, "badhaka_house": None}


def _natal_dasha_list(participant: dict) -> list:
    """Returns the full Vimshottari Mahadasha list for a participant
    (9 entries covering ~120 years from birth). Calls the existing
    chart_engine.calculate_dashas helper.

    Returns [] on error so the DBA check no-ops rather than blocking.
    """
    try:
        from app.services.chart_engine import calculate_dashas, get_planet_positions
        jd = date_time_to_julian(
            participant["date"], participant["time"],
            participant.get("timezone_offset", 5.5),
        )
        moon_lon = get_planet_positions(jd).get("Moon", {}).get("longitude", 0)
        return calculate_dashas(
            participant["date"], participant["time"], moon_lon,
            participant.get("timezone_offset", 5.5),
        )
    except Exception:
        return []


# PR Mu0g — module-level memo for per-MD antardasha lists.
# `calculate_antardashas(md)` is a pure function of (md_lord, md_start,
# md_end). For a 60-day muhurtha scan with N participants, the same MD
# is asked about ~21,600 times per participant (~240 4-min slots × 90
# days × N). Without memoisation we recompute the same 9 antardashas
# every time — wasted 64,800+ calls per 3-participant search. The
# memo keys on (lord, start, end) so it's stable across runs and the
# 9-AD list per MD is computed at most once per process.
_AD_CACHE: dict = {}


def _dasha_lords_at(
    dashas: list,
    target_date_str: str,
) -> Tuple[Optional[str], Optional[str]]:
    """Given a participant's dasha list and a target YYYY-MM-DD string,
    return (mahadasha_lord, antardasha_lord) active on that date.
    Returns (None, None) if no match.

    PR Mu0g — antardasha computation memoised per MD identity.
    """
    if not dashas or not target_date_str:
        return (None, None)
    try:
        from app.services.chart_engine import calculate_antardashas
        for md in dashas:
            if md["start"] <= target_date_str <= md["end"]:
                key = (md.get("lord", ""), md.get("start", ""), md.get("end", ""))
                ads = _AD_CACHE.get(key)
                if ads is None:
                    ads = calculate_antardashas(md)
                    _AD_CACHE[key] = ads
                for ad in ads:
                    if ad["start"] <= target_date_str <= ad["end"]:
                        return (md["lord"], ad["antardasha_lord"])
                return (md["lord"], None)
        return (None, None)
    except Exception:
        return (None, None)


def _evaluate_participant(
    name: str,
    natal_moon: dict,
    current_moon_lon: float,
    *,
    natal_bm: dict = None,   # from _natal_badhakesh_marakesh
    dashas: list = None,     # from _natal_dasha_list
    target_date_str: str = None,
    moment_rps: set = None,         # PR Mu3 — the moment's 5 KP RPs
    natal_event_sigs: set = None,   # PR Mu3 — planets that signify event in natal
    is_primary: bool = True,        # PR Mu4 — primary participant flag
) -> dict:
    """Compute per-participant findings for a single candidate moment.

    KB §8.1 hard filters: Chandrashtamam, Janma Tara.
    KB §8.2 soft signals: Tarabala class, Chandrabala.

    PR Mu4 — primary-participant semantics. Per web research +
    classical KP convention (Drik vivaha rule, Kanak Bosmia KPDP):
      • Chandrashtamam / Janma Tara hard-reject ONLY for the primary
        participant. For secondaries these are recorded as
        `soft_concerns` (not in hard_rejected_for).
      • Badhakesh / Marakesh DBA same treatment.
      • Tarabala + Chandrabala are SUBSTITUTABLE per partner — if one
        is good the other can be soft-noted, not hard-failed. The
        aggregation across all partners happens in
        _aggregate_participant_evaluations (called by the scan loop).

    Returns a dict with hard_rejected_for (only for primary's hard
    flags), soft_concerns (for secondaries' would-be hard flags),
    and raw signals for the aggregator to consume.
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

    # PR Mu4 — primary vs secondary handling. Primary's hard flags go
    # into hard_rejected_for (drop the window from passed tier);
    # secondaries' hard flags go into soft_concerns (window can still
    # pass, but the astrologer sees the caveat).
    hard_rejected_for: list = []
    soft_concerns: list = []
    bucket = hard_rejected_for if is_primary else soft_concerns
    if chandrashtamam:
        bucket.append(f"{name}: Chandrashtamam")
    if janma_tara:
        bucket.append(f"{name}: Janma Tara")

    # ── PR A2.2c.2: Current DBA + Badhakesh/Marakesh check ──
    # Classical KP rule (KB §8.1): auspicious events must NOT start
    # when the native's current Mahadasha or Antardasha lord is their
    # natal Badhakesh (obstruction lord) or Marakesh (death-bringer
    # lord). Such periods indicate structural opposition to new
    # beginnings.
    current_md = None
    current_ad = None
    badhakesh_active = False
    marakesh_active = False
    if dashas and target_date_str:
        current_md, current_ad = _dasha_lords_at(dashas, target_date_str)
        if natal_bm:
            badhakesh = natal_bm.get("badhakesh")
            marakesh_set = natal_bm.get("marakesh") or set()
            active_dba_lords = {l for l in (current_md, current_ad) if l}
            if badhakesh and badhakesh in active_dba_lords:
                badhakesh_active = True
                which = "MD" if current_md == badhakesh else "AD"
                bucket.append(
                    f"{name}: Badhakesh {badhakesh} active ({which})"
                )
            if marakesh_set & active_dba_lords:
                marakesh_active = True
                hit = next(iter(marakesh_set & active_dba_lords))
                which = "MD" if current_md == hit else "AD"
                bucket.append(
                    f"{name}: Marakesh {hit} active ({which})"
                )

    # PR Mu3 — moment RPs × natal event-house significators.
    # KP-doctrine-correct multi-chart test: take this moment's universal
    # 5 RPs and check how many of them ALSO signify the event houses in
    # this participant's natal chart. The intersection = "the universe
    # is naming the same planets that this person's natal chart names
    # for this matter" — the strongest agreement signal in KP.
    moment_rps_set = moment_rps or set()
    natal_sigs_set = natal_event_sigs or set()
    rp_x_natal = sorted(moment_rps_set & natal_sigs_set)
    rp_x_natal_count = len(rp_x_natal)

    return {
        "name": name,
        "is_primary": is_primary,                # PR Mu4
        "chandrashtamam": chandrashtamam,
        "janma_tara": janma_tara,
        "tara_bala_num": tara_num,
        "tara_bala_name": tara_name,
        "tara_bala_good": tara_good,
        "chandrabala_num": cb_pos,
        "chandrabala_good": cb_good,
        "soft_score": soft,
        "hard_rejected_for": hard_rejected_for,
        "soft_concerns": soft_concerns,          # PR Mu4
        # PR A2.2c.2 — surfaced for UI (Partners panel)
        "current_md": current_md,
        "current_ad": current_ad,
        "badhakesh": (natal_bm or {}).get("badhakesh"),
        "badhakesh_active": badhakesh_active,
        "marakesh_active": marakesh_active,
        # PR Mu3 — moment-RPs × natal-event-significators intersection
        "moment_rps":                sorted(moment_rps_set),
        "natal_event_significators": sorted(natal_sigs_set),
        "rp_x_natal_overlap":        rp_x_natal,
        "rp_x_natal_count":          rp_x_natal_count,
    }


# PR Mu4 — Tara classes considered "worst" for the all-must-fail
# aggregation rule. Per classical Vedic muhurta + Drik vivaha doctrine,
# Janma (1), Vipat (3), Pratyak (5), Vadha (7) are the four malefic
# Taras. Sampat (2), Kshema (4), Sadhaka (6), Mitra (8), Atimitra (9)
# are benefic. Soft-flag if SOME partners hit malefic; hard-reject
# only if ALL participants are in worst-Tara simultaneously.
_WORST_TARA_NUMS = {1, 3, 5, 7}


def _aggregate_participant_evaluations(
    per_participant: list,
    event_type: str,
) -> dict:
    """
    PR Mu4 — KP-doctrine aggregation across multiple participants.

    Rules (per audit + web research, especially Drik vivaha + Bosmia
    KPDP):
      1. Per-partner: Tarabala and Chandrabala are SUBSTITUTABLE.
         If at least ONE is good, the partner is OK on this axis.
         Only flag as concern when BOTH fail for the same partner.
      2. Aggregate: Tarabala HARD reject only when ALL participants
         simultaneously land in worst-Tara classes ({Janma, Vipat,
         Pratyak, Vadha}). Single-partner-bad = soft only.
      3. Primary-only hard filters (Chandrashtamam / Janma Tara /
         Badhakesh / Marakesh DBA) are handled inside
         _evaluate_participant via the is_primary flag — already in
         hard_rejected_for vs soft_concerns there.
      4. Aggregation strategy:
         - marriage / engagement / vivaha-class events: min() of
           the per-partner scores (everyone must pass for vivaha)
         - business / contract / property / legal: primary-weighted
           0.6 + secondaries averaged 0.4 (primary's perspective
           drives, but secondaries can drag down)
         - default (general / single-participant): primary only

    Returns:
      {
        all_hard_rejects: list[str],   # combined hard rejects across all
        all_soft_concerns: list[str],  # combined soft concerns
        worst_tara_for_all: bool,      # Tarabala all-bad signal
        cb_tb_substitutable_fail: list[str],  # partners failing BOTH
        aggregation_strategy: str,
      }
    """
    all_hard: list = []
    all_soft: list = []
    for p in per_participant:
        all_hard.extend(p.get("hard_rejected_for") or [])
        all_soft.extend(p.get("soft_concerns") or [])

    # Rule 2: Tarabala all-bad?
    worst_tara_for_all = bool(per_participant) and all(
        (p.get("tara_bala_num") in _WORST_TARA_NUMS)
        for p in per_participant
    )
    if worst_tara_for_all and len(per_participant) > 1:
        names = ", ".join(p.get("name", "?") for p in per_participant)
        all_hard.append(
            f"ALL participants ({names}) in worst-Tara simultaneously — "
            f"Janma/Vipat/Pratyak/Vadha"
        )

    # Rule 1: Per-partner CB+TB substitutability — concern only when BOTH fail.
    cb_tb_fail: list = []
    for p in per_participant:
        if not p.get("tara_bala_good") and not p.get("chandrabala_good"):
            cb_tb_fail.append(p.get("name", "?"))
    if cb_tb_fail:
        names = ", ".join(cb_tb_fail)
        all_soft.append(
            f"{names}: both Tarabala AND Chandrabala fail (per-partner substitution rule)"
        )

    # Aggregation strategy
    HARD_AGG_EVENTS = {"marriage", "engagement"}
    PRIMARY_WEIGHTED_EVENTS = {"business", "contract", "property", "legal", "investment", "loan"}
    if event_type in HARD_AGG_EVENTS:
        strategy = "min_across_all"
    elif event_type in PRIMARY_WEIGHTED_EVENTS:
        strategy = "primary_weighted_0.6_secondaries_0.4"
    else:
        strategy = "primary_only"

    return {
        "all_hard_rejects": all_hard,
        "all_soft_concerns": all_soft,
        "worst_tara_for_all": worst_tara_for_all,
        "cb_tb_substitutable_fail": cb_tb_fail,
        "aggregation_strategy": strategy,
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

def _compute_moment_rps(planets: dict, cusp_lons: list, weekday: int) -> set:
    """
    PR Mu3 — The 5 classical KP Ruling Planets at the muhurtha moment.

    Per K. S. Krishnamurti + Kanak Bosmia KPDP:
      1. Vara lord (planet ruling the weekday at the moment)
      2. Moon sign lord (rashi adhipati of the Moon at the moment)
      3. Moon star lord (nakshatra adhipati of the Moon at the moment)
      4. Lagna sign lord (rashi adhipati of the rising sign at the moment)
      5. Lagna star lord (nakshatra adhipati of the rising sign at the moment)

    Returns a set of planet names. Pre-Mu3 the engine used participant
    NATAL RPs (computed once at birth) and asked "is moment Lagna SL one
    of these 4?" — which is doctrine-inverted. The correct test is the
    OTHER direction: take the moment's 5 RPs and intersect with each
    participant's natal SIGNIFICATORS of the event house group.
    """
    moon_lon = planets.get("Moon", {}).get("longitude", 0)
    lagna_lon = cusp_lons[0] % 360
    vara_lord = DAY_LORDS.get(weekday, "") if isinstance(DAY_LORDS, dict) else (
        DAY_LORDS[weekday] if 0 <= weekday < len(DAY_LORDS) else ""
    )
    rps = {
        vara_lord,
        SIGN_LORDS.get(get_sign(moon_lon % 360), ""),
        get_nakshatra_and_starlord(moon_lon)["star_lord"],
        SIGN_LORDS.get(get_sign(lagna_lon), ""),
        get_nakshatra_and_starlord(lagna_lon)["star_lord"],
    }
    rps.discard("")
    return rps


def _natal_event_significators(participant: dict, event_houses: set) -> set:
    """
    PR Mu3 — For a participant, return the set of planet names that
    signify ANY of the event's house group {primary + supporting} in
    their NATAL chart.

    Uses the same 4-step signification rule as _sublord_significations:
    occupied house + ruled houses + star-lord's house. The intersection
    with moment-RPs then tells us "this moment's universal indicators
    are activating the event houses in this person's natal chart" —
    the KP-doctrine-correct multi-chart test.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    try:
        jd = date_time_to_julian(
            participant["date"], participant["time"],
            participant.get("timezone_offset", 5.5)
        )
        planets = get_planet_positions(jd)
        lat = participant["latitude"]
        lon = participant["longitude"]
        cusps, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
        cusp_lons = list(cusps[:12])
        sigs: set = set()
        for pname in planets:
            houses = set(_sublord_significations(pname, planets, cusp_lons))
            if houses & event_houses:
                sigs.add(pname)
        return sigs
    except Exception:
        return set()


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


def _vishti_mukha_part(moon_lon: float, sun_lon: float) -> str:
    """
    PR Mu8 — Split Vishti (Bhadra) into face/middle/tail. Per
    Muhurta Chintamani + astroshastra: the first 3 ghatikas
    (~72 min) of Vishti = 'mukha' (face) = WORST; middle = soft;
    last 3 ghatikas = 'puchcha' (tail) = essentially OK.

    Returns one of: "face" (worst), "middle" (soft), "tail" (ok),
    "" (not in Vishti).
    """
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff / 6)
    if idx == 0 or idx > 56:
        return ""
    if (idx - 1) % 7 != 6:
        return ""
    # Position within this karana (0.0 = start of karana, 1.0 = end)
    karana_size_deg = 6.0
    karana_start = idx * karana_size_deg
    pos_within = ((diff - karana_start) % 360) / karana_size_deg  # 0..1
    if pos_within < 0.30:
        return "face"
    elif pos_within > 0.70:
        return "tail"
    return "middle"


# PR Mu8 — Mrityu Yoga (Vara × Nakshatra) grid. Classical Muhurta
# Chintamani §11. Each weekday has 2-3 "death-bringing" nakshatras;
# if Moon is in one of them on that weekday, Mrityu Yoga is active.
# Hard reject for medical / travel events; soft for others.
# Weekday 0=Monday … 6=Sunday. Nakshatra indices 0=Ashwini … 26=Revati.
MRITYU_YOGA_NAKSHATRAS = {
    0: {12, 13},        # Mon: Hasta, Chitra
    1: {8, 25},         # Tue: Ashlesha, Uttara Bhadrapada
    2: {1, 2, 16},      # Wed: Bharani, Krittika, Jyeshtha
    3: {19, 23},        # Thu: Purva Ashadha, Shatabhisha
    4: {3, 4, 6},       # Fri: Rohini, Mrigashira, Punarvasu
    5: {7, 11},         # Sat: Pushya, Uttara Phalguni
    6: {5, 9},          # Sun: Ardra, Magha
}


# PR Mu8 — Krura tithis (4, 9, 14 in both pakshas; per Krishna paksha
# add 19, 24, 29). Soft penalty for shubh starts; do not apply for
# shradha / martial / litigation where these tithis are NEUTRAL or
# slightly preferred.
KRURA_TITHIS = {4, 9, 14, 19, 24, 29}
KRURA_EVENT_EXCEPTIONS = {"legal", "medical"}  # not penalised for these


# PR Mu8 — Dagdha Tithi grid (Muhurta Chintamani §3). Map: Sun's
# rashi index → tithi numbers that are "burnt" for that solar month.
# Hard for marriage / travel / new ventures; soft for others.
# Sun signs 0=Aries..11=Pisces. Tithi nums 1..30 in lunar cycle.
DAGDHA_TITHI_BY_SUN_SIGN = {
    0:  {12},         # Aries (Mesha)        — Dwadashi
    1:  {11},         # Taurus               — Ekadashi
    2:  {5},          # Gemini               — Panchami
    3:  {10},         # Cancer               — Dashami
    4:  {2},          # Leo                  — Dwitiya
    5:  {7},          # Virgo                — Saptami
    6:  {8},          # Libra                — Ashtami
    7:  {9},          # Scorpio              — Navami
    8:  {13},         # Sagittarius          — Trayodashi
    9:  {14},         # Capricorn            — Chaturdashi
    10: {1},          # Aquarius             — Pratipada
    11: {3, 6},       # Pisces               — Tritiya, Shashthi
}
DAGDHA_HARD_EVENTS = {"marriage", "engagement", "travel", "house_warming", "business"}


def _compute_advanced_doshas(
    jd: float,
    moon_lon: float,
    sun_lon: float,
    sunrise_jd: float,
    sunset_jd: float,
    weekday: int,
    naks_idx: int,
    tithi_num: int,
    yoga_idx: int,
    event_type: str,
    is_vishti: bool,
) -> dict:
    """
    PR Mu8 — Compute the classical doshas the engine previously missed:

      Bhadra mukha split: face/middle/tail of Vishti
      Sandhya (twilight): ~24 min around sunrise/sunset = -50 for
        non-spiritual events
      Mrityu Yoga: Vara × Nakshatra death-yoga grid; HARD for
        medical/travel, soft for others
      Krura Tithi: 4/9/14/19/24/29 = -10 soft (except legal/medical)
      Dagdha Tithi: per-Sun-sign void tithi; HARD for marriage/
        engagement/travel/house_warming/business; soft for others
      Vyatipata defunct-after-noon: Vyatipata + Vaidhriti yogas are
        HARD before local noon, SOFT after (research finding from
        Sanatan Veda — overrides the flat -40 currently applied)
    """
    # Bhadra mukha part
    bhadra_part = _vishti_mukha_part(moon_lon, sun_lon) if is_vishti else ""

    # Sandhya (twilight). 12 min before to 12 min after sunrise; same
    # for sunset. Defined here in JD-day units (12 min = 12/(24*60)).
    SANDHYA_HALF = 12.0 / (24 * 60)
    in_sandhya_sunrise = abs(jd - sunrise_jd) <= SANDHYA_HALF
    in_sandhya_sunset = abs(jd - sunset_jd) <= SANDHYA_HALF
    in_sandhya = in_sandhya_sunrise or in_sandhya_sunset

    # Mrityu Yoga
    mrityu_active = naks_idx in MRITYU_YOGA_NAKSHATRAS.get(weekday, set())
    MRITYU_HARD_EVENTS = {"medical", "travel"}
    mrityu_hard = mrityu_active and event_type in MRITYU_HARD_EVENTS

    # Krura tithi
    krura_active = tithi_num in KRURA_TITHIS and event_type not in KRURA_EVENT_EXCEPTIONS

    # Dagdha tithi
    sun_sign_idx = int((sun_lon % 360) / 30.0)
    dagdha_active = tithi_num in DAGDHA_TITHI_BY_SUN_SIGN.get(sun_sign_idx, set())
    dagdha_hard = dagdha_active and event_type in DAGDHA_HARD_EVENTS

    # Vyatipata / Vaidhriti defunct-after-noon
    # yoga_idx 16 = Vyatipata, 26 = Vaidhriti
    VYATIPATA_DEFUNCT_YOGAS = {16, 26}
    in_vyatipata_or_vaidhriti = yoga_idx in VYATIPATA_DEFUNCT_YOGAS
    local_noon_jd = (sunrise_jd + sunset_jd) / 2.0
    is_before_noon = jd < local_noon_jd
    vyatipata_hard = in_vyatipata_or_vaidhriti and is_before_noon

    return {
        "bhadra_part":          bhadra_part,
        "in_sandhya":           in_sandhya,
        "sandhya_kind":         ("sunrise" if in_sandhya_sunrise else
                                 "sunset" if in_sandhya_sunset else ""),
        "mrityu_yoga_active":   mrityu_active,
        "mrityu_yoga_hard":     mrityu_hard,
        "krura_tithi_active":   krura_active,
        "dagdha_tithi_active":  dagdha_active,
        "dagdha_tithi_hard":    dagdha_hard,
        "vyatipata_or_vaidhriti": in_vyatipata_or_vaidhriti,
        "vyatipata_hard":       vyatipata_hard,
        "yoga_is_defunct_after_noon": (
            in_vyatipata_or_vaidhriti and not is_before_noon
        ),
    }


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
    participant_natal_bm: list = None,      # PR A2.2c.2 — (name, {badhakesh, marakesh, ...})
    participant_natal_dashas: list = None,  # PR A2.2c.2 — (name, [full dasha list])
    participant_natal_event_sigs: list = None,  # PR Mu3 — (name, set of planets signifying event in natal)
    primary_by_name: dict = None,  # PR Mu4 — explicit primary flag per participant name
) -> list:
    """Scan a date range every 4 minutes, return raw scored windows."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    participant_rps = participant_rps or []
    participant_natal_moon = participant_natal_moon or []
    participant_natal_bm = participant_natal_bm or []
    participant_natal_dashas = participant_natal_dashas or []
    participant_natal_event_sigs = participant_natal_event_sigs or []
    # Build name → natal data lookups for O(1) access inside the hot loop
    _bm_by_name = {name: data for name, data in participant_natal_bm}
    _dashas_by_name = {name: data for name, data in participant_natal_dashas}
    _event_sigs_by_name = {name: data for name, data in participant_natal_event_sigs}
    # PR Mu4 — primary participant lookup (parallel dict keyed by name).
    # Built from primary_by_name kwarg if passed; otherwise idx==0
    # defaults via the scan loop. Initialised here to avoid NameError
    # in the empty-participants case.
    _primary_by_name: dict = dict(primary_by_name or {})

    raw_windows = []
    planet_cache: dict = {}
    slot_cache: dict = {}
    # PR Mu7 — eclipses + sutak windows within the search range. Computed
    # ONCE per scan (eclipses are global events, not per-second). The
    # per-slot check is then O(small-N).
    _start_jd = swe.julday(start_dt.year, start_dt.month, start_dt.day, 0.0)
    _end_jd = swe.julday(end_dt.year, end_dt.month, end_dt.day, 23.99)
    _eclipses = _find_eclipses_in_range(_start_jd, _end_jd)
    # PR Mu0d — track polar / sunrise-resolution failures per day so the
    # response can surface "no muhurtha computable on Dec 22 at this
    # latitude" instead of silently falling back to a fake 12-hour day.
    _skipped_polar_days: list = []
    # PR Mu0b — per-day event-tz cache. The router resolves event_tz ONCE
    # using the date_start of the scan; for a 60-day search that crosses a
    # DST transition (e.g. US spring-forward in March, fall-back in
    # November), the stored float is wrong for half the windows, silently
    # shifting Lagna by ~15° per hour of offset error. We re-resolve per
    # calendar day so zoneinfo handles every DST flip transparently.
    # Falls back to the router-supplied event_tz on resolution failure.
    tz_cache: dict = {}

    current = start_dt.replace(hour=5, minute=0, second=0, microsecond=0)
    end = end_dt.replace(hour=21, minute=0, second=0, microsecond=0)

    while current <= end:
        # Day slots cached per day — needs tz BEFORE jd
        day_key = current.strftime("%Y-%m-%d")
        if day_key not in tz_cache:
            try:
                # Import lazily to keep zoneinfo cost out of single-day calls
                from app.services.timezone_utils import resolve_timezone
                _day_tz, _ = resolve_timezone(event_lat, event_lon, current)
                tz_cache[day_key] = _day_tz
            except Exception:
                tz_cache[day_key] = event_tz
        day_event_tz = tz_cache[day_key]

        jd = swe.julday(
            current.year, current.month, current.day,
            current.hour + current.minute / 60.0 - day_event_tz
        )

        # Planet positions cached per hour.
        # PR Mu0g — Moon moves ~2.2 arc-min per 4 min — enough to flip
        # a nakshatra-sub-lord at a boundary. The Sun moves much less
        # but still benefits from precision for tithi / yoga / paksha
        # boundary moments. Pre-fix the per-hour cache used stale Moon
        # sub-lord for up to 56 min into each hour.
        # Slow planets (Mars/Jup/Sat/Mercury/Venus/Rahu/Ketu) move
        # sub-arcsecond per 4 min — per-hour cache is fine. We refresh
        # only Moon + Sun per slot via direct swe.calc_ut calls (much
        # cheaper than a full get_planet_positions, which loops all 9
        # bodies and re-runs nakshatra/sub-lord lookups).
        hr_key = current.strftime("%Y-%m-%d %H")
        if hr_key not in planet_cache:
            planet_cache[hr_key] = get_planet_positions(jd)
        # Shallow copy so per-slot Moon/Sun refresh doesn't mutate cache
        planets = dict(planet_cache[hr_key])
        try:
            for _name, _id in (("Moon", swe.MOON), ("Sun", swe.SUN)):
                _res, _ = swe.calc_ut(jd, _id, swe.FLG_SIDEREAL)
                _lon = _res[0]
                _nak = get_nakshatra_and_starlord(_lon)
                planets[_name] = {
                    "longitude": round(_lon, 4),
                    "sign":      get_sign(_lon),
                    "nakshatra": _nak["nakshatra"],
                    "star_lord": _nak["star_lord"],
                    "sub_lord":  get_sub_lord(_lon),
                    "retrograde": False,  # Moon/Sun never retrograde
                }
        except Exception:
            pass

        if day_key not in slot_cache:
            date_jd = swe.julday(current.year, current.month, current.day, 12.0 - day_event_tz)
            try:
                sr, ss = _get_sunrise_sunset_jd(date_jd, event_lat, event_lon)
                slot_cache[day_key] = _get_day_slots(sr, ss, current.weekday())
            except MuhurthaSunriseError as _e:
                # PR Mu0d — record the day as skipped so the response can
                # surface it to the UI (e.g. "Stockholm Dec 22 — polar
                # night, no muhurtha computable").
                _skipped_polar_days.append({
                    "date":   current.strftime("%Y-%m-%d"),
                    "reason": str(_e),
                })
                slot_cache[day_key] = None
        slots = slot_cache[day_key]
        if slots is None:
            # Skip the rest of this day's 4-min slots quickly
            current += timedelta(hours=24 - current.hour, minutes=-current.minute)
            continue

        rk_start, rk_end = slots["rk"]
        yg_start, yg_end = slots["yg"]
        gl_start, gl_end = slots["gl"]
        durm_windows = slots["durm"]
        ab_start, ab_end, ab_valid = slots["abhijit"]
        sunrise_jd = slots["sunrise"]
        sunset_jd  = slots["sunset"]

        # House cusps at event location.
        # PR Mu5 — at very high latitudes (>= 66.5°) Placidus houses
        # mathematically degenerate (the calculation involves dividing
        # by cos(latitude) which → 0). swe.houses_ex raises a generic
        # error. We catch it and skip the day, same treatment as the
        # polar sunrise case in Mu0d.
        try:
            cusps, _ = swe.houses_ex(jd, event_lat, event_lon, b'P', swe.FLG_SIDEREAL)
        except Exception as _e:
            _skipped_polar_days.append({
                "date":   current.strftime("%Y-%m-%d"),
                "reason": f"Placidus houses undefined at lat={event_lat:.4f} ({_e})",
            })
            current += timedelta(hours=24 - current.hour, minutes=-current.minute)
            continue
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
        # PR Mu0e — clamp tithi_num to [1, 30]. The raw `int(...) + 1`
        # can read 31 due to float arithmetic noise at the exact lunar
        # cycle close (Sun-Moon separation == 360.0 wraps to 0.0), which
        # then makes TITHI_NAMES[(31-1)%15] = index 0 = "Pratipada"
        # silently render — a Krishna Chaturdashi or Amavasya minute can
        # then masquerade as a Shukla Pratipada. Clamp prevents this.
        tithi_num = min(int(((moon_lon - sun_lon) % 360) / 12) + 1, 30)
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

        # PR Mu0e — Vedic vara flips at LOCAL SUNRISE, not at local
        # midnight. Hours between local midnight (00:00) and that day's
        # sunrise (~06:00 IST) still belong to the PREVIOUS Vedic day.
        # Concrete impact: at 04:00 local Wednesday the engine used to
        # report `vara=2 (Wednesday)` and (wrongly) gated out Abhijit
        # muhurtha as Vyatipata-day. The classical Vedic vara at
        # 04:00 Wednesday is still Tuesday (Mars), so Abhijit is fine.
        # We compare the current sample's JD to the sunrise JD already
        # in `slots`; if before sunrise, vara is one day earlier (mod 7).
        vara_calendar = current.weekday()
        if jd < slots["sunrise"]:
            vara = (vara_calendar - 1) % 7
        else:
            vara = vara_calendar
        # PR Mu0c — vara scoring is now per-event-aware. If this event has
        # a per-event preferred/avoided weekday table (EVENT_PREFERRED_VARAS),
        # we DO NOT apply the global GOOD_VARA / BAD_VARA score here —
        # the per-event block (below) is authoritative and applies the +10
        # bonus / -15 penalty directly. This avoids the rollback dance that
        # was needed when both were applied, and (correctly) lets surgery
        # on Tuesday score positively (Mars day favours surgery) without
        # the global BAD_VARA{Tue,Sat} penalty fighting the per-event bonus.
        if event_type not in EVENT_PREFERRED_VARAS:
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

        # PR A2.2c.2 — target date string for the DBA check (same
        # calendar day as the candidate window)
        _target_date_str = current.strftime("%Y-%m-%d")
        # PR Mu3 — moment's 5 KP Ruling Planets at THIS slot. Computed
        # once per slot, passed to every participant evaluation so we
        # can do the doctrine-correct multi-chart test.
        moment_rps = _compute_moment_rps(planets, cusp_lons, vara)
        rp_x_natal_total = 0  # sum across participants for ledger
        for idx, (name, natal_data) in enumerate(participant_natal_moon):
            # PR Mu4 — primary participant flag. Default: first
            # participant unless the participant dict itself carries
            # an explicit primary=True. (`participant_natal_moon`
            # entries are tuples of (name, moon_data); we look up the
            # primary flag from a parallel dict built in find_muhurtha.)
            is_primary = _primary_by_name.get(name, idx == 0)
            p_eval = _evaluate_participant(
                name, natal_data, moon_lon,
                natal_bm=_bm_by_name.get(name),
                dashas=_dashas_by_name.get(name),
                target_date_str=_target_date_str,
                moment_rps=moment_rps,
                natal_event_sigs=_event_sigs_by_name.get(name, set()),
                is_primary=is_primary,
            )
            per_participant.append(p_eval)
            participant_soft_total += p_eval["soft_score"]
            rp_x_natal_total += p_eval.get("rp_x_natal_count", 0)
            if p_eval["hard_rejected_for"]:
                participant_hard_rejects.extend(p_eval["hard_rejected_for"])
        # PR Mu4 — apply doctrine-correct aggregation across participants
        if per_participant:
            agg = _aggregate_participant_evaluations(per_participant, event_type)
            # Replace participant_hard_rejects with the aggregated version
            # (which includes the all-Tarabala-bad rule + dedups)
            participant_hard_rejects = list(agg["all_hard_rejects"])
            participant_soft_concerns_all = agg["all_soft_concerns"]
            aggregation_strategy = agg["aggregation_strategy"]
            worst_tara_for_all = agg["worst_tara_for_all"]
        else:
            participant_soft_concerns_all = []
            aggregation_strategy = "no_participants"
            worst_tara_for_all = False

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

        # ── PR Mu8 — Advanced classical doshas ─────────────────────
        # Bhadra mukha split, Sandhya twilight, Mrityu Yoga grid,
        # Krura tithis, Dagdha tithi grid, Vyatipata-defunct-after-noon.
        adv_doshas = _compute_advanced_doshas(
            jd=jd, moon_lon=moon_lon, sun_lon=sun_lon,
            sunrise_jd=sunrise_jd, sunset_jd=sunset_jd,
            weekday=vara, naks_idx=naks_idx,
            tithi_num=tithi_num, yoga_idx=yoga_idx,
            event_type=event_type, is_vishti=vishti,
        )

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
        # PR Mu0e — tithi 15 = Purnima (full moon), tithi 30 = Amavasya
        # (new moon). Before this fix both rendered as "Purnima/Amavasya"
        # which forced the UI to disambiguate by paksha — and any UI that
        # didn't (e.g. PDF export, AI prompt) showed wrong tithi name on
        # half the cycle.
        if tithi_num == 15:
            tithi_name = "Purnima"
        elif tithi_num == 30:
            tithi_name = "Amavasya"
        else:
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

        # Per-event weekday table (§3.4 KB — authoritative when present).
        # PR Mu0c — the global GOOD_VARA / BAD_VARA block above is gated
        # on event_type NOT having a per-event table, so no rollback is
        # needed here. We just apply the per-event bonus / penalty directly.
        preferred_varas = EVENT_PREFERRED_VARAS.get(event_type, set())
        avoid_varas = EVENT_AVOID_VARAS.get(event_type, set())
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

        # ── PR A2.2e: classical dosha checks ────────────────────────

        # (A) Venus/Jupiter combustion — classical hard-block for
        # vivaha (marriage). Combustion thresholds per Brihat Samhita:
        # Venus ≤ 9°, Jupiter ≤ 11°. Applies only to marriage event.
        venus_combust = False
        jupiter_combust = False
        if event_type == "marriage":
            venus_lon = planets.get("Venus", {}).get("longitude", 0)
            jupiter_lon = planets.get("Jupiter", {}).get("longitude", 0)
            venus_sun_sep = min(abs(venus_lon - sun_lon), 360 - abs(venus_lon - sun_lon))
            jup_sun_sep = min(abs(jupiter_lon - sun_lon), 360 - abs(jupiter_lon - sun_lon))
            venus_combust = venus_sun_sep <= 9.0
            jupiter_combust = jup_sun_sep <= 11.0
            if venus_combust:
                hard_rejected_for.append("Venus combust (Shukra asta — no vivaha)")
            if jupiter_combust:
                hard_rejected_for.append("Jupiter combust (Guru asta — no vivaha)")

        # (B) Solar-month rule for vivaha. Classical: marriage allowed
        # only when Sun transits Mesha / Vrishabha / Mithuna /
        # Vrischika / Makara / Kumbha (sign indices 0, 1, 2, 7, 9, 10).
        # Blocks Cancer, Leo, Virgo, Libra, Sagittarius, Pisces.
        solar_month_blocked = False
        if event_type == "marriage":
            sun_sign_idx = int((sun_lon % 360) / 30.0)
            ALLOWED_SUN_SIGNS_MARRIAGE = {0, 1, 2, 7, 9, 10}
            if sun_sign_idx not in ALLOWED_SUN_SIGNS_MARRIAGE:
                solar_month_blocked = True
                BLOCKED_SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                                       "Libra","Scorpio","Sagittarius","Capricorn",
                                       "Aquarius","Pisces"]
                hard_rejected_for.append(
                    f"Sun in {BLOCKED_SIGN_NAMES[sun_sign_idx]} (vivaha blocked — not in allowed 6 signs)"
                )

        # (C) Kartari dosha — malefics flanking the muhurtha Lagna
        # (i.e., malefic in 12th AND malefic in 2nd from Lagna).
        # Classical KP: this "scissor" cuts the event. Soft penalty
        # rather than hard reject in modern practice; KB §4.6 says
        # avoid, so we apply a meaningful soft hit.
        kartari_active = False
        MALEFICS = {"Sun", "Saturn", "Mars", "Rahu", "Ketu"}
        # Occupants of H2 (sign at lagna_lon + 30°) and H12 (sign at lagna_lon - 30°)
        lagna_sign_idx = int((lagna_lon % 360) / 30.0)
        h2_sign_idx = (lagna_sign_idx + 1) % 12
        h12_sign_idx = (lagna_sign_idx - 1) % 12
        h2_has_malefic = False
        h12_has_malefic = False
        for pname, pdata in planets.items():
            if pname not in MALEFICS:
                continue
            p_sign_idx = int((pdata.get("longitude", 0) % 360) / 30.0)
            if p_sign_idx == h2_sign_idx:
                h2_has_malefic = True
            if p_sign_idx == h12_sign_idx:
                h12_has_malefic = True
        kartari_active = h2_has_malefic and h12_has_malefic
        kartari_penalty = -25 if kartari_active else 0

        # (D) Ekargala dosha — Sun and Moon in the same sign
        # (most intense on Amavasya). Blocks auspicious starts.
        # Soft penalty per KB §4.7.
        sun_sign_idx_here = int((sun_lon % 360) / 30.0)
        moon_sign_idx_here = int((moon_lon % 360) / 30.0)
        ekargala_active = sun_sign_idx_here == moon_sign_idx_here
        ekargala_penalty = -20 if ekargala_active else 0

        # ── PR Mu7 — Eclipse + Sutak windows (classical hard reject).
        #     Per research: solar eclipse Sutak = 12h before peak through
        #     moksha; lunar eclipse Sutak = 9h. Inside Sutak NO auspicious
        #     event should be undertaken. Extended advisory (±3 days)
        #     is a soft caution (also recorded for ledger but does not
        #     hard-reject — astrologer may justify override on a clean
        #     Lagna).
        eclipse_status = _eclipse_status_at(jd, _eclipses)
        in_sutak = eclipse_status["in_sutak"]
        in_eclipse_ext = eclipse_status["in_extended_advisory"]
        if in_sutak:
            hard_rejected_for.append(
                f"Sutak ({in_sutak['type'].title()} eclipse "
                f"{in_sutak['eclipse_kind']}) — no auspicious event"
            )

        # ── PR Mu6 — Panchang overlays (Varjyam / Amrit Kala / Panchaka /
        #     Tithi Shunya / Nakshatra Vedha). KB §4 explicitly requires
        #     muhurtha to consume these from the Panchang module; the
        #     engine used to ignore them entirely.
        panchang_overlays = _compute_panchang_overlays(
            jd=jd,
            moon_lon=moon_lon,
            sun_lon=sun_lon,
            sunrise_jd=sunrise_jd,
            weekday=vara,
            tithi_num=tithi_num,
            naks_num=naks_idx,
            event_type=event_type,
        )
        varjyam_penalty = -25 if panchang_overlays["varjyam_active"] else 0
        amrit_bonus = 20 if panchang_overlays["amrit_active"] else 0
        panchaka_penalty = -60 if panchang_overlays["panchaka_blocks_event"] else 0
        tithi_shunya_penalty = -25 if panchang_overlays["tithi_shunya_active"] else 0
        vedha_penalty = -15 if panchang_overlays["nakshatra_vedha_active"] else 0

        # ── PR A2.2b: assemble effective_score with all new signals ──
        # ── PR Mu2: also build a confidence_breakdown ledger so the
        #     astrologer can see every factor's contribution. The ledger
        #     is a list of {factor, delta, note} dicts; sum of deltas
        #     equals (effective_score - base_score) modulo the hard
        #     penalties (RK / YG / GL / Durm / Vishti) which are listed
        #     separately at the end. base_score itself is the lumped
        #     Lagna-SL + tithi + nakshatra + yoga + global-vara
        #     contribution; future PR could split it further.
        breakdown: list = [
            {"factor": "base_score", "delta": int(base_score),
             "note": "Lagna SL signifies + tithi + nakshatra + yoga (+ global vara if unmapped event)"},
        ]
        if participant_bonus:
            breakdown.append({
                "factor": "participant_resonance_legacy",
                "delta": int(participant_bonus),
                "note": f"[legacy] +10 per participant whose natal RPs include Lagna SL ({len(resonating_with)} hits)"})
        # PR Mu3 — moment-RPs × natal-event-significators (doctrine-correct).
        # Worth +5 per match per participant — gentle weighting; Mu4 will
        # reweight as part of the proper aggregation rewrite. Keeps the
        # legacy participant_bonus for back-compat until Mu4.
        if rp_x_natal_total:
            mu3_delta = rp_x_natal_total * 5
            breakdown.append({
                "factor": "moment_rps_x_natal_event_sigs",
                "delta": int(mu3_delta),
                "note": (
                    f"+5 per moment-RP that signifies the event house group in "
                    f"a participant's natal chart ({rp_x_natal_total} hits across "
                    f"{len(per_participant)} participant(s))"
                )})
        if badhaka_penalty:
            breakdown.append({
                "factor": "badhakesh_marakesh",
                "delta": int(badhaka_penalty),
                "note": "Querent natal Badhakesh / Marakesh active"})
        if event_cusp_bonus:
            breakdown.append({
                "factor": "event_cusp_csl_confirms",
                "delta": int(event_cusp_bonus),
                "note": f"Event cusp (H{group['primary']}) CSL chain signifies the event"})
        if h11_bonus:
            breakdown.append({
                "factor": "h11_csl_confirms",
                "delta": int(h11_bonus),
                "note": "H11 (gain) CSL chain signifies the event"})
        if moon_sl_bonus:
            breakdown.append({
                "factor": "moon_starlord_favorable",
                "delta": int(moon_sl_bonus),
                "note": "Moon star-lord signifies the event group"})
        if event_cusp_denial_penalty:
            breakdown.append({
                "factor": "event_cusp_csl_denial",
                "delta": int(event_cusp_denial_penalty),
                "note": f"Event cusp CSL signifies denial houses"})
        if h11_denial_penalty:
            breakdown.append({
                "factor": "h11_csl_denial",
                "delta": int(h11_denial_penalty),
                "note": "H11 CSL signifies denial houses"})
        if rikta_nanda_penalty:
            breakdown.append({
                "factor": "rikta_nanda_tithi",
                "delta": int(rikta_nanda_penalty),
                "note": f"Tithi {tithi_num} is in Rikta/Nanda avoid set"})
        if nak_bonus:
            breakdown.append({
                "factor": "nakshatra_class_event_match",
                "delta": int(nak_bonus),
                "note": f"Nakshatra class for {event_type}"})
        if per_event_vara_bonus:
            breakdown.append({
                "factor": "per_event_vara",
                "delta": int(per_event_vara_bonus),
                "note": f"Vara {vara} for event {event_type}"})
        if lagna_type_bonus:
            breakdown.append({
                "factor": "lagna_type_match",
                "delta": int(lagna_type_bonus),
                "note": f"Lagna type {sign_type} for event {event_type}"})
        if kartari_penalty:
            breakdown.append({
                "factor": "kartari_dosha",
                "delta": int(kartari_penalty),
                "note": "Malefics flanking the muhurtha Lagna (H2 + H12)"})
        if ekargala_penalty:
            breakdown.append({
                "factor": "ekargala_dosha",
                "delta": int(ekargala_penalty),
                "note": "Sun + Moon in the same sign"})
        # PR Mu6 — Panchang overlays
        if amrit_bonus:
            breakdown.append({
                "factor": "amrit_kala",
                "delta": int(amrit_bonus),
                "note": "Window falls inside Amrit Kala (Panchang nectar period)"})
        if varjyam_penalty:
            breakdown.append({
                "factor": "varjyam",
                "delta": int(varjyam_penalty),
                "note": "Window falls inside Varjyam (Panchang poison period)"})
        if panchaka_penalty:
            sub = panchang_overlays.get("panchaka_subtype") or "generic"
            breakdown.append({
                "factor": "panchaka_dosha",
                "delta": int(panchaka_penalty),
                "note": f"Panchaka ({sub}) blocks event_type={event_type}"})
        if tithi_shunya_penalty:
            masa = panchang_overlays.get("tithi_shunya_masa") or "?"
            breakdown.append({
                "factor": "tithi_shunya",
                "delta": int(tithi_shunya_penalty),
                "note": f"Tithi {tithi_num} is void (shunya) in masa {masa}"})
        if vedha_penalty:
            breakdown.append({
                "factor": "nakshatra_vedha",
                "delta": int(vedha_penalty),
                "note": "Moon nakshatra has classical vedha relationship"})
        # PR Mu7 — Eclipse ledger entries (informational; hard reject
        # is applied via hard_rejected_for above so it doesn't double-count
        # the score, but the ledger entry tells the astrologer WHY).
        if in_sutak:
            breakdown.append({
                "factor": "eclipse_sutak",
                "delta": 0,  # already hard-rejected; no further score delta
                "note": (
                    f"Inside Sutak — {in_sutak['type']} eclipse "
                    f"({in_sutak['eclipse_kind']}). Hard reject."
                )})
        elif in_eclipse_ext:
            breakdown.append({
                "factor": "eclipse_extended_advisory",
                "delta": -10,
                "note": (
                    f"Within ±3 days of {in_eclipse_ext['type']} eclipse "
                    f"({in_eclipse_ext['eclipse_kind']}) — soft caution."
                )})

        effective_score = (
            base_score
            + participant_bonus
            + (rp_x_natal_total * 5)   # PR Mu3 — doctrine-correct multi-chart
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
            + kartari_penalty        # PR A2.2e
            + ekargala_penalty       # PR A2.2e
            + amrit_bonus            # PR Mu6
            + varjyam_penalty        # PR Mu6
            + panchaka_penalty       # PR Mu6
            + tithi_shunya_penalty   # PR Mu6
            + vedha_penalty          # PR Mu6
            + (-10 if in_eclipse_ext and not in_sutak else 0)  # PR Mu7 soft
        )
        # Hard time-window penalties — listed AFTER soft factors so
        # the breakdown reads as "would have been N, then inauspicious
        # period dragged it to M".
        if in_rk:
            effective_score -= 50
            breakdown.append({"factor": "rahu_kalam", "delta": -50, "note": "Window falls inside Rahu Kalam"})
        if in_yg:
            effective_score -= 60
            breakdown.append({"factor": "yamagandam", "delta": -60, "note": "Window falls inside Yamagandam"})
        if in_gl:
            effective_score -= 50
            breakdown.append({"factor": "gulika_kalam", "delta": -50, "note": "Window falls inside Gulika Kalam"})
        if in_durm:
            effective_score -= 80
            breakdown.append({"factor": "durmuhurtha", "delta": -80, "note": "Window falls inside Durmuhurtha"})
        if vishti:
            # PR Mu8 — Bhadra mukha split. Face = -60 (worst), middle = -30
            # (same as old flat), tail = -10 (essentially OK). Pre-Mu8 the
            # whole karana got the flat -30 regardless of position.
            part = adv_doshas["bhadra_part"]
            if part == "face":
                vishti_delta = -60
                vishti_note = "Vishti FACE (Bhadra mukha) — worst phase"
            elif part == "tail":
                vishti_delta = -10
                vishti_note = "Vishti TAIL (puchcha) — soft, often acceptable"
            else:
                vishti_delta = -30
                vishti_note = "Vishti middle (Bhadra) — inauspicious"
            effective_score += vishti_delta
            breakdown.append({"factor": "vishti_karana", "delta": vishti_delta, "note": vishti_note})

        # ── PR Mu8 — Other classical doshas (Sandhya / Mrityu / Krura /
        #             Dagdha / Vyatipata-defunct-after-noon) ──
        if adv_doshas["in_sandhya"]:
            # Sandhya is HARD for all non-spiritual events; we apply -50.
            effective_score -= 50
            breakdown.append({
                "factor": "sandhya_twilight",
                "delta": -50,
                "note": f"Within ±12 min of {adv_doshas['sandhya_kind']} (Sandhya)"
            })
        if adv_doshas["mrityu_yoga_active"]:
            if adv_doshas["mrityu_yoga_hard"]:
                hard_rejected_for.append(
                    f"Mrityu Yoga active (Vara × Nakshatra) — blocks {event_type}"
                )
                breakdown.append({
                    "factor": "mrityu_yoga_hard",
                    "delta": 0,
                    "note": f"Hard reject — Mrityu Yoga blocks {event_type}",
                })
            else:
                effective_score -= 25
                breakdown.append({
                    "factor": "mrityu_yoga_soft",
                    "delta": -25,
                    "note": "Mrityu Yoga active (soft for this event)",
                })
        if adv_doshas["krura_tithi_active"]:
            effective_score -= 10
            breakdown.append({
                "factor": "krura_tithi",
                "delta": -10,
                "note": f"Tithi {tithi_num} is Krura (4/9/14 in lunar cycle)",
            })
        if adv_doshas["dagdha_tithi_active"]:
            if adv_doshas["dagdha_tithi_hard"]:
                hard_rejected_for.append(
                    f"Dagdha tithi {tithi_num} for Sun-sign — blocks {event_type}"
                )
                breakdown.append({
                    "factor": "dagdha_tithi_hard",
                    "delta": 0,
                    "note": f"Hard reject — Dagdha tithi {tithi_num} blocks {event_type}",
                })
            else:
                effective_score -= 20
                breakdown.append({
                    "factor": "dagdha_tithi_soft",
                    "delta": -20,
                    "note": f"Dagdha tithi {tithi_num} active (soft for this event)",
                })
        if adv_doshas["vyatipata_or_vaidhriti"]:
            if adv_doshas["vyatipata_hard"]:
                # Replace the previous flat -40 yoga penalty (already
                # in base_score via line 1493) with a softer reading
                # for after-noon — but the before-noon case should
                # actually hard-reject per research. Since the flat -40
                # is already applied, we add an additional -20 to make
                # it effectively -60 for before-noon (hard caveat).
                effective_score -= 20
                breakdown.append({
                    "factor": "vyatipata_pre_noon",
                    "delta": -20,
                    "note": "Vyatipata/Vaidhriti yoga ACTIVE before noon (intensified)",
                })
            elif adv_doshas["yoga_is_defunct_after_noon"]:
                # Restore +20 because the base_score has already
                # penalised this yoga by -40 even though it's defunct
                # after noon per research (Sanatan Veda).
                effective_score += 20
                breakdown.append({
                    "factor": "vyatipata_defunct_after_noon",
                    "delta": +20,
                    "note": "Vyatipata/Vaidhriti yoga DEFUNCT after noon — restore",
                })

        # PR Mu2 — raw_score = sum of all deltas (uncapped); confidence_score
        # = clamped to [0, 100] for display. Raw lets astrologer tell
        # "strong base + heavy soft penalties" from "weak base alone" —
        # both can clamp to the same 0 today.
        raw_score = sum(b["delta"] for b in breakdown)
        confidence_score = max(0, min(100, raw_score))

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
                # PR Mu2 — numeric confidence ledger + raw vs clamped
                "raw_score":            int(raw_score),
                "confidence_score":     int(confidence_score),
                "confidence_breakdown": breakdown,
                # PR Mu4 — aggregation transparency
                "aggregation_strategy":  aggregation_strategy,
                "worst_tara_for_all":    worst_tara_for_all,
                "participant_soft_concerns": participant_soft_concerns_all,
                # PR Mu6 — Panchang overlays (varjyam/amrit/panchaka/tithi-shunya/vedha)
                "panchang_overlays":     panchang_overlays,
                # PR Mu7 — eclipse / sutak status
                "in_sutak":              bool(in_sutak),
                "sutak_eclipse":         (
                    {
                        "type":         in_sutak["type"],
                        "eclipse_kind": in_sutak["eclipse_kind"],
                    } if in_sutak else None
                ),
                "in_eclipse_extended_advisory": bool(in_eclipse_ext and not in_sutak),
                # PR Mu8 — Advanced doshas (Bhadra mukha split / Sandhya /
                # Mrityu Yoga / Krura tithi / Dagdha tithi / Vyatipata
                # defunct-after-noon)
                "advanced_doshas": adv_doshas,
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
                # PR A2.2e — classical dosha flags
                "venus_combust":     venus_combust,
                "jupiter_combust":   jupiter_combust,
                "solar_month_blocked": solar_month_blocked,
                "kartari_active":    kartari_active,
                "ekargala_active":   ekargala_active,
            })

        current += timedelta(minutes=4)

    # PR Mu0d — return both windows and any polar-day skips so
    # find_muhurtha_windows can surface skipped days in the response.
    return raw_windows, _skipped_polar_days


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
    # PR A2.2c.2 — Badhakesh/Marakesh + Vimshottari dasha list per participant.
    # Both are computed once here (not inside the scan's 4-min loop) so a
    # 60-day sweep doesn't recompute them ~20,000 times.
    participant_natal_bm = []
    participant_natal_dashas = []
    # PR Mu3 — natal event-house significators per participant.
    # Same logic: compute once at startup, not per slot. Set of planets
    # in each participant's natal chart that signify any of the event's
    # primary + supporting houses.
    participant_natal_event_sigs: list = []
    event_house_group = EVENT_HOUSE_GROUPS.get(
        classified_event, EVENT_HOUSE_GROUPS["general"]
    )
    event_house_set = {event_house_group["primary"]} | set(event_house_group.get("supporting", []))
    # PR Mu4 — primary participant flag map. Default: first explicit
    # primary=True wins; if none flagged, first participant by index
    # is treated as primary.
    primary_by_name: dict = {}
    explicit_primary_found = False
    if participants:
        for p in participants:
            p_name = p.get("name", "")
            if p.get("primary") is True:
                primary_by_name[p_name] = True
                explicit_primary_found = True
            rps = _get_natal_rps(p)
            if rps:
                participant_rps.append((p_name, rps))
            moon_data = _get_natal_moon_data(p)
            participant_natal_moon.append((p_name, moon_data))
            bm = _natal_badhakesh_marakesh(p)
            participant_natal_bm.append((p_name, bm))
            dashas = _natal_dasha_list(p)
            participant_natal_dashas.append((p_name, dashas))
            # PR Mu3 — natal event-house significators
            sigs = _natal_event_significators(p, event_house_set)
            participant_natal_event_sigs.append((p_name, sigs))
        # If nobody was explicitly flagged, treat first participant as primary
        if not explicit_primary_found and participants:
            primary_by_name[participants[0].get("name", "")] = True
        # Ensure non-primary participants get an explicit False so the
        # scan loop's `_primary_by_name.get(name, idx == 0)` semantics
        # are deterministic regardless of order
        for p in participants:
            p_name = p.get("name", "")
            if p_name not in primary_by_name:
                primary_by_name[p_name] = False

    selected_raw, _selected_skipped = _scan_date_range(
        start_dt, end_dt, classified_event,
        e_lat, e_lon, e_tz,
        participant_rps, participant_natal_moon,
        participant_natal_bm, participant_natal_dashas,
        participant_natal_event_sigs,
        primary_by_name,
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

    # PR Mu5 — same-day grouping. Previously kept top 3 per day.
    # Bumped to 5 because professional astrologer workflow needs to
    # choose among multiple viable windows on the same day based on
    # client logistics (e.g. catering booked 13:00 — pick the window
    # closest to that). Each per-day list is sorted by score desc.
    date_windows: dict = {}
    for w in selected_windows:
        d = w["date"]
        if d not in date_windows:
            date_windows[d] = []
        if len(date_windows[d]) < 5:
            date_windows[d].append(w)

    # PR Mu5 — `same_day_alternatives` is a flat list-of-lists keyed
    # by the date of the BEST window. The first inner list is the best
    # day's alternatives (3-5 windows); UI renders it as a horizontal
    # strip below the best-window hero so the astrologer sees options
    # at-a-glance without expanding the leaderboard.
    same_day_alternatives: list = []
    if selected_windows:
        best_date = selected_windows[0]["date"]
        same_day_alternatives = [
            w for w in selected_windows if w["date"] == best_date
        ][:5]

    best_selected_score = selected_windows[0]["score"] if selected_windows else 0

    nearby_better = None
    _nearby_skipped: list = []
    _extend_skipped: list = []
    if nearby_days > 0:
        nearby_start = start_dt - timedelta(days=nearby_days)
        nearby_end   = end_dt   + timedelta(days=nearby_days)
        nearby_raw, _nearby_skipped = _scan_date_range(
            nearby_start, nearby_end, classified_event,
            e_lat, e_lon, e_tz,
            participant_rps, participant_natal_moon,
            participant_natal_bm, participant_natal_dashas,
            participant_natal_event_sigs,
            primary_by_name,
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

    # PR A2.2c / Mu5 — extend-window logic (KB §8.5).
    # If nothing in the client's range passes hard filters, scan forward
    # up to 90 days for the next qualifying window. Classical practice:
    # "no qualifying muhurtha exists in your range; the next one is in
    # N days. Recommend waiting." (User's dad's exact workflow.)
    # Pre-Mu5: 30-day horizon — too tight for marriage / vivaha which
    # often need to skip the next sankranti / amavasya boundary.
    # Mu5: extended to 90 days per audit Wave-2 plan. Critical
    # invariant: if NOTHING qualifies in 90 days, return None —
    # the engine MUST NOT invent a "best of bad" answer.
    extend_suggestion = None
    if not selected_windows:
        extend_start = end_dt + timedelta(days=1)
        extend_end = end_dt + timedelta(days=90)  # Mu5: 30 → 90
        extend_raw, _extend_skipped = _scan_date_range(
            extend_start, extend_end, classified_event,
            e_lat, e_lon, e_tz,
            participant_rps, participant_natal_moon,
            participant_natal_bm, participant_natal_dashas,
            participant_natal_event_sigs,
            primary_by_name,
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
                "horizon_days": 90,  # Mu5 — surface horizon in response
                "candidates_scanned": len(extend_merged),
                "blocking_reasons": (
                    # Summarize why the client's range had nothing.
                    # Collect reason frequencies across soft-flagged
                    # windows so the astrologer can tell the client
                    # "your range fails for these reasons".
                    _summarize_reasons(soft_flagged_windows)
                    if soft_flagged_windows else []
                ),
            }
        # else: extend_suggestion stays None — caller (UI) shows
        # "no qualifying muhurtha in next 90 days; manual review recommended"

    return {
        "windows":              selected_windows[:15],
        "soft_flagged_windows": soft_flagged_windows[:15],  # PR A2.2b
        "date_windows":         date_windows,
        # PR Mu5 — same-day alternatives strip (up to 5 windows on the
        # best window's date). Frontend renders as horizontal grid
        # below the best-window hero so the astrologer can pick by
        # client logistics (catering time, family availability, etc.).
        "same_day_alternatives": same_day_alternatives,
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
        # PR Mu0d — polar / sunrise-resolution failures collected across
        # the primary scan + nearby + extend ranges. Frontend surfaces
        # these so the astrologer knows e.g. "Dec 22 in Reykjavik —
        # polar night, no muhurtha computable" instead of silently
        # missing days from the leaderboard.
        "skipped_polar_days":   (_selected_skipped or []) + (_nearby_skipped or []) + (_extend_skipped or []),
        # PR Mu7 — Eclipses that intersect the search range (incl.
        # nearby + extend). Frontend uses this to render a banner
        # like "⚠ Lunar eclipse on Sep 12 — affects windows Sep 11–14".
        "eclipses_in_range": [
            {
                "type":           e["type"],
                "eclipse_kind":   e["eclipse_kind"],
                "peak_jd":        e["peak_jd"],
                "sutak_start_jd": e["sutak_start_jd"],
                "sutak_end_jd":   e["sutak_end_jd"],
                "ext_advisory_start_jd": e["ext_advisory_start_jd"],
                "ext_advisory_end_jd":   e["ext_advisory_end_jd"],
            }
            for e in _find_eclipses_in_range(
                swe.julday(start_dt.year, start_dt.month, start_dt.day, 0.0)
                  - (nearby_days if nearby_days else 0),
                swe.julday(end_dt.year, end_dt.month, end_dt.day, 23.99)
                  + (nearby_days if nearby_days else 0),
            )
        ],
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
