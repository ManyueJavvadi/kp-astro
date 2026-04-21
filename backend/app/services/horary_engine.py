"""
KP Horary (Prashna) Engine — rewritten in PR A1.1 for accuracy.

Canonical KP Horary methodology — research and citations live in
.claude/research/horary-audit.md. Changes from the PR A1.0 legacy engine:

Bug fixes
---------
1. 249 canonical table (was 243 — now sourced from backend/app/services/kp_249_table.py)
2. Placidus cusps at the astrologer's lat/lon (was equal-house from Lagna)
3. Ruling Planets now use the ACTUAL ascendant at lat/lon + local-time
   weekday (was using the prashna-derived Lagna and UTC weekday)
4. 4-level significator hierarchy: Level 1, 2, 3, 4 (was 1, 2, 4)
5. TOPIC_HOUSES expanded to canonical KP sets (e.g. career now includes 6)
6. query_time accepted separately (was "noon local" if date given)
7. rp_context surfaced for display ("Computed for: Toronto, 2026-04-20 15:03:27 EDT")
8. No silent fallback — latitude/longitude/timezone_offset are REQUIRED
   (the router enforces this by making them non-optional)

Layer cascade preserved (per classical KP):
    Layer 1 — Lagna CSL fruitfulness
    Layer 2 — Primary-topic-house CSL verdict
    Layer 3 — Ruling Planets confirmation
"""
import swisseph as swe
from datetime import datetime, timedelta, timezone as dt_tz

from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    get_planet_positions,
)
from app.services.kp_249_table import number_to_lagna_longitude


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}
LORD_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars",
                 "Rahu", "Jupiter", "Saturn", "Mercury"]
NAKSHATRA_LORDS = [LORD_SEQUENCE[i % 9] for i in range(27)]
NAKSHATRA_SPAN = 360.0 / 27
TOTAL_DASHA = 120

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# Python datetime.weekday() → KP day lord (Monday = 0)
WEEKDAY_LORDS = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"]

HOUSE_THEMES = {
    1: "Self, health, longevity, personality",
    2: "Wealth, family, speech, accumulated assets",
    3: "Siblings, short journeys, communication, courage",
    4: "Property, mother, vehicles, home, education",
    5: "Children, romance, speculation, education, past merit",
    6: "Enemies, debts, litigation, service, health challenges",
    7: "Marriage, partnerships, contracts, open enemies",
    8: "Longevity, occult, sudden events, inheritance",
    9: "Luck, father, religion, long journeys, higher learning",
    10: "Career, status, authority, father, government",
    11: "Gains, income, friends, elder siblings, fulfilment of desire",
    12: "Expenses, losses, foreign travel, spiritual liberation, bed pleasures",
}

# PR A1.1 — expanded canonical KP topic houses.
# "yes" = houses whose signification by the CSL confirms the matter.
# "no"  = houses whose signification denies the matter (12th-from + obstruction houses).
TOPIC_HOUSES = {
    # Marriage: 2 (family expansion), 7 (partnership), 11 (fulfilment); optional 5 (romance).
    "marriage":  {"yes": [2, 5, 7, 11], "no": [1, 6, 10]},
    # Career/job: 2 (income), 6 (service), 10 (status), 11 (gain). Denials: 5, 8, 12.
    "career":    {"yes": [2, 6, 10, 11], "no": [5, 8, 12]},
    # Health improvement: 1 (body), 5 (recovery), 11 (relief). Denials: 6, 8, 12.
    "health":    {"yes": [1, 5, 11], "no": [6, 8, 12]},
    # Property: 4 (home), 11 (fulfilment); 2 supports for purchase finance. Denials: 3, 8, 12.
    "property":  {"yes": [2, 4, 11], "no": [3, 8, 12]},
    # Finance/gain: 2, 6, 10, 11.  Speculation/debt denials: 5, 8, 12.
    "finance":   {"yes": [2, 6, 10, 11], "no": [5, 8, 12]},
    # Children: 2 (family), 5 (progeny), 11 (fulfilment). Denials: 1, 4, 10.
    "children":  {"yes": [2, 5, 11], "no": [1, 4, 10]},
    # Travel: 3 (short), 9 (long), 12 (foreign). Denial: 4 (rooted at home).
    "travel":    {"yes": [3, 9, 12], "no": [4]},
    # Education: 4 (primary), 9 (higher), 11 (completion). Denials: 5, 8, 12.
    "education": {"yes": [4, 9, 11], "no": [5, 8, 12]},
    # Legal: 6 (win litigation), 11 (favourable outcome); 3 is courage. Denials: 1, 5, 12.
    "legal":     {"yes": [3, 6, 11], "no": [1, 5, 12]},
    # General — catch-all: positive growth vs loss.
    "general":   {"yes": [1, 2, 3, 6, 10, 11], "no": [5, 8, 12]},
}

# Primary house to examine CSL for each topic (Layer 2 verdict)
TOPIC_PRIMARY_HOUSE = {
    "marriage": 7, "career": 10, "health": 1, "property": 4,
    "finance": 2, "children": 5, "travel": 9, "education": 9,
    "legal": 6, "general": 1,
}


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

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


def _houses_ruled_by(planet_name: str, cusp_lons: list) -> list[int]:
    """Houses whose cusp sign is ruled by this planet."""
    return [i + 1 for i in range(12)
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name]


def _planet_significations_by_level(planet_name: str, planet_lons: dict, cusp_lons: list) -> dict[int, list[int]]:
    """
    KP 4-level hierarchy, returned as a map level -> houses (strongest first).
        Level 1 — star lord's occupied house
        Level 2 — own occupied house
        Level 3 — star lord's owned houses
        Level 4 — own owned houses
    Empty lists when a level contributes nothing. Houses within each
    level are sorted ascending; levels themselves are kept in the
    strength order 1->4.
    """
    if planet_name not in planet_lons:
        return {1: [], 2: [], 3: [], 4: []}
    plon = planet_lons[planet_name]
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    own_occupied = _get_planet_house(plon, cusp_lons)
    sl_occupied = (_get_planet_house(planet_lons[star_lord], cusp_lons)
                   if star_lord in planet_lons else 0)
    sl_owned = _houses_ruled_by(star_lord, cusp_lons) if star_lord else []
    own_owned = _houses_ruled_by(planet_name, cusp_lons)
    return {
        1: [sl_occupied] if sl_occupied else [],
        2: [own_occupied] if own_occupied else [],
        3: sorted(sl_owned),
        4: sorted(own_owned),
    }


def _planet_significations(planet_name: str, planet_lons: dict, cusp_lons: list) -> list[int]:
    """
    Flat, unique, sorted union of all 4 levels. Used by the verdict cascade
    where we only care "does this planet signify house H, at all?".
    """
    by_level = _planet_significations_by_level(planet_name, planet_lons, cusp_lons)
    flat = set()
    for houses in by_level.values():
        flat.update(houses)
    return sorted(flat)


def _compute_ruling_planets(
    jd_utc: float,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    planet_lons: dict,
) -> tuple[list[str], dict]:
    """
    Compute the 7-slot Ruling Planets set at the query moment + location.

    PR A1.1c — expanded from 5 slots to 7 to match mainstream KP apps
    (e.g. ksrinivas.com KP Astrology). The 7 canonical slots are:
      1. Day Lord         — weekday planet in LOCAL time
      2. Asc Sign Lord    — of the real ascendant now
      3. Asc Star Lord    — nakshatra lord of the real ascendant
      4. Asc Sub Lord     — KP sub lord of the real ascendant
      5. Moon Sign Lord   — of Moon's sidereal sign
      6. Moon Star Lord   — nakshatra lord of Moon
      7. Moon Sub Lord    — KP sub lord of Moon

    Returns (rp_list, rp_context_dict) where:
      - rp_list is the unique-planet list ordered by frequency (planets
        hitting multiple slots bubble to the top), ties broken by
        traditional slot order. This matches how ksrinivas.com ranks
        "strongest ruling planets".
      - rp_context_dict now includes:
          slot_assignments: ordered list of {slot, planet} for all 7
          planet_slots:     map of planet -> list of slot names
          strongest:        planets appearing >=2 times (KSK's rule:
                            more slot-appearances => more weight)
    """
    # Actual ascendant at the astrologer's lat/lon — Placidus, sidereal.
    _, ascmc = swe.houses_ex(jd_utc, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    actual_lagna_lon = ascmc[0] % 360

    # Local weekday. Build local datetime from JD.
    utc_dt = datetime(2000, 1, 1, 12, 0, 0, tzinfo=dt_tz.utc) + \
             timedelta(days=(jd_utc - 2451545.0))
    local_dt = utc_dt + timedelta(hours=timezone_offset)
    day_lord = WEEKDAY_LORDS[local_dt.weekday()]

    # Slot derivations
    asc_sign_lord = SIGN_LORDS.get(get_sign(actual_lagna_lon), "")
    asc_star_lord = get_nakshatra_and_starlord(actual_lagna_lon).get("star_lord", "")
    asc_sub_lord  = get_sub_lord(actual_lagna_lon)

    moon_lon = planet_lons.get("Moon", 0) % 360
    moon_sign_lord = SIGN_LORDS.get(get_sign(moon_lon), "")
    moon_star_lord = get_nakshatra_and_starlord(moon_lon).get("star_lord", "")
    moon_sub_lord  = get_sub_lord(moon_lon)

    # Seven slots in canonical order.
    slot_assignments = [
        {"slot": "Day Lord",       "planet": day_lord},
        {"slot": "Asc Sign Lord",  "planet": asc_sign_lord},
        {"slot": "Asc Star Lord",  "planet": asc_star_lord},
        {"slot": "Asc Sub Lord",   "planet": asc_sub_lord},
        {"slot": "Moon Sign Lord", "planet": moon_sign_lord},
        {"slot": "Moon Star Lord", "planet": moon_star_lord},
        {"slot": "Moon Sub Lord",  "planet": moon_sub_lord},
    ]

    # planet -> list of slots it occupies (preserves slot order).
    planet_slots: dict[str, list[str]] = {}
    for a in slot_assignments:
        if not a["planet"]:
            continue
        planet_slots.setdefault(a["planet"], []).append(a["slot"])

    # Rank planets by: (frequency desc, earliest slot index asc, name asc).
    # Earliest-slot tiebreak preserves KSK's priority Day > Asc > Moon.
    def _rank_key(p: str) -> tuple:
        slots = planet_slots[p]
        first_slot_idx = min(
            i for i, a in enumerate(slot_assignments) if a["planet"] == p
        )
        return (-len(slots), first_slot_idx, p)
    rps: list[str] = sorted(planet_slots.keys(), key=_rank_key)

    # Strongest significators — planets with >=2 slot occurrences.
    # KSK: "a planet which is a significator of the same matter AND
    # also appears among the RPs more than once is the most reliable".
    strongest = [p for p in rps if len(planet_slots[p]) >= 2]

    rp_context = {
        "latitude": round(latitude, 4),
        "longitude": round(longitude, 4),
        "timezone_offset": timezone_offset,
        "local_datetime": local_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "utc_datetime": utc_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "weekday": local_dt.strftime("%A"),
        "day_lord": day_lord,

        # Actual ascendant (the independent jury)
        "actual_lagna_longitude": round(actual_lagna_lon, 4),
        "actual_lagna_sign": get_sign(actual_lagna_lon),
        "lagna_sign_lord": asc_sign_lord,
        "lagna_star_lord": asc_star_lord,
        "lagna_sub_lord":  asc_sub_lord,

        # Moon
        "moon_longitude": round(moon_lon, 4),
        "moon_sign_lord": moon_sign_lord,
        "moon_star_lord": moon_star_lord,
        "moon_sub_lord":  moon_sub_lord,

        # NEW — PR A1.1c
        "slot_assignments":     slot_assignments,   # [{slot, planet}, ...]
        "planet_slots":         planet_slots,       # { planet: [slot, ...] }
        "strongest":            strongest,          # planets occurring >=2 times
        "rp_system":            "7-slot (KSK extended)",
    }
    return rps, rp_context


def _moon_analysis(planet_lons: dict, cusp_lons: list) -> dict:
    moon_lon = planet_lons.get("Moon", 0)
    moon_house = _get_planet_house(moon_lon, cusp_lons)
    moon_sign = get_sign(moon_lon % 360)
    nak_info = get_nakshatra_and_starlord(moon_lon)
    star_lord = nak_info.get("star_lord", "")
    sub_lord = get_sub_lord(moon_lon)
    star_lord_sigs = _planet_significations(star_lord, planet_lons, cusp_lons)
    sub_lord_sigs = _planet_significations(sub_lord, planet_lons, cusp_lons)
    return {
        "moon_house": moon_house,
        "moon_sign": moon_sign,
        "moon_nakshatra": nak_info.get("nakshatra", ""),
        "star_lord": star_lord,
        "star_lord_significations": star_lord_sigs,
        "sub_lord": sub_lord,
        "sub_lord_significations": sub_lord_sigs,
    }


def _csl_layer_analysis(csl: str, house_num: int, yes_houses: set, no_houses: set,
                        planet_lons: dict, cusp_lons: list) -> dict:
    sigs = set(_planet_significations(csl, planet_lons, cusp_lons))
    yes_match = sigs & yes_houses
    no_match = sigs & no_houses
    if yes_match and not no_match:
        layer_verdict = "YES"
    elif no_match and not yes_match:
        layer_verdict = "NO"
    elif yes_match and no_match:
        layer_verdict = "MIXED"
    else:
        layer_verdict = "NEUTRAL"
    return {
        "house": house_num,
        "csl": csl,
        "significations": sorted(sigs),
        "yes_activated": sorted(yes_match),
        "no_activated": sorted(no_match),
        "layer_verdict": layer_verdict,
    }


def _compute_clinical_flags(
    topic: str,
    lagna_sub: str,
    primary_house: int,
    query_csl: str,
    yes_houses: set[int],
    no_houses: set[int],
    planet_lons: dict,
    cusp_lons: list,
    ruling_planets: list[str],
    rp_context: dict,
    planets_raw: dict,
    primary_house_significators: list[dict],
) -> list[dict]:
    """
    PR A1.1d — compute curated clinical indicators the astrologer scans in 5 seconds.

    This function DOES NOT mutate the verdict. It only surfaces facts an
    experienced KP astrologer would notice at a glance but our Layer 1/2/3
    cascade doesn't explicitly call out. Each flag has:
      tone: "green" | "yellow" | "red"  (UI color hint)
      code: stable machine identifier
      label: short one-line text for the astrologer
      detail: longer explanation for tooltip / expandable view

    Every rule here comes from `.claude/research/horary-audit.md` and
    `backend/app/kp_knowledge/horary.md`. Dad will sign off on each
    individually; if a rule turns out wrong we just tweak or delete
    this function — verdict is untouched.
    """
    flags: list[dict] = []

    # === Layer 1 green: Lagna CSL fruitful ===
    lagna_sigs = set(_planet_significations(lagna_sub, planet_lons, cusp_lons))
    lagna_yes_hits = sorted(lagna_sigs & yes_houses)
    if lagna_yes_hits:
        flags.append({
            "tone": "green",
            "code": "lagna_csl_fruitful",
            "label": f"Lagna CSL {lagna_sub} is fruitful",
            "detail": (
                f"The Lagna sub-lord {lagna_sub} signifies favorable houses "
                f"{lagna_yes_hits} — the question itself carries real potential. "
                f"A barren Lagna CSL would have stopped the analysis at Layer 1."
            ),
        })

    # === Layer 1 yellow: Lagna CSL self-obstruction (signifies 6/8/12 of its own) ===
    # KP practitioners weigh 6/8/12 significations of the Lagna CSL as a
    # "barrier" flavor — the person's own mindset/karma pulls against the matter.
    lagna_malefic_own = sorted(lagna_sigs & {6, 8, 12})
    if lagna_malefic_own:
        flags.append({
            "tone": "yellow",
            "code": "lagna_csl_self_obstruction",
            "label": f"Lagna CSL also signifies H{', H'.join(str(h) for h in lagna_malefic_own)}",
            "detail": (
                f"{lagna_sub} (Lagna CSL) signifies the dustana house"
                f"{'s' if len(lagna_malefic_own) > 1 else ''} "
                f"{lagna_malefic_own}. Classical KP treats this as a subtle "
                f"obstruction — the querent's own context (debts, obstacles, loss) "
                f"may work against the matter even when other factors align."
            ),
        })

    # === Primary topic house empty? ===
    # Count planets occupying the primary house.
    primary_occupants = [
        p for p in planet_lons.keys()
        if _get_planet_house(planet_lons[p], cusp_lons) == primary_house
    ]
    if not primary_occupants:
        flags.append({
            "tone": "yellow",
            "code": "primary_house_empty",
            "label": f"H{primary_house} is empty — weak direct promise",
            "detail": (
                f"No planet occupies H{primary_house} (the topic's primary house). "
                f"Classical KP: an empty primary house means the matter has to "
                f"manifest through indirect significators (L3/L4) rather than direct "
                f"occupancy — typically slower, less certain, and more conditional."
            ),
        })
    else:
        flags.append({
            "tone": "green",
            "code": "primary_house_occupied",
            "label": f"H{primary_house} occupied by {', '.join(primary_occupants)}",
            "detail": (
                f"Direct occupancy of the primary house is the strongest form of "
                f"significator placement in KP (Level 2). "
                f"{', '.join(primary_occupants)} occup{'ies' if len(primary_occupants) == 1 else 'y'} H{primary_house} — "
                f"a solid foundation for manifestation."
            ),
        })

    # === Significator-without-RP-support check ===
    # Among planets carrying the primary house, how many are Ruling Planets?
    rp_set = set(ruling_planets)
    sigs_with_rp = [s for s in primary_house_significators if s["planet"] in rp_set]
    sigs_without_rp = [s for s in primary_house_significators if s["planet"] not in rp_set]
    if primary_house_significators and not sigs_with_rp:
        names = ", ".join(s["planet"] for s in primary_house_significators)
        flags.append({
            "tone": "yellow",
            "code": "sigs_lack_rp_support",
            "label": f"H{primary_house} significators carry no RP support",
            "detail": (
                f"H{primary_house} is signified by {names}, but NONE of them appear in "
                f"the current Ruling Planets. KSK: a significator that isn't also a "
                f"Ruling Planet at the query moment tends to produce weak or "
                f"delayed results — the timing window hasn't arrived yet."
            ),
        })
    elif sigs_with_rp:
        rp_names = ", ".join(s["planet"] for s in sigs_with_rp)
        flags.append({
            "tone": "green",
            "code": "sigs_with_rp_support",
            "label": f"H{primary_house} has RP-backed significators: {rp_names}",
            "detail": (
                f"{rp_names} both signify H{primary_house} AND appear in the "
                f"current Ruling Planets — the strongest possible timing signal. "
                f"Expect results during the dasha/bhukti of these planets."
            ),
        })

    # === Primary-CSL ∈ RPs? ===
    if query_csl in rp_set:
        freq = len(rp_context.get("planet_slots", {}).get(query_csl, []))
        flags.append({
            "tone": "green",
            "code": "csl_is_rp",
            "label": f"Primary-house CSL {query_csl} is an RP ({freq}/7 slots)",
            "detail": (
                f"The Layer-2 gate ({query_csl}, CSL of H{primary_house}) is "
                f"simultaneously a Ruling Planet filling {freq} of 7 slots. This is "
                f"the canonical confirmation signal — KP's highest-confidence "
                f"\"yes the moment is ripe\" indicator."
            ),
        })

    # === Primary-CSL signifies ANY topic house? ===
    csl_sigs = set(_planet_significations(query_csl, planet_lons, cusp_lons))
    csl_yes = sorted(csl_sigs & yes_houses)
    csl_no  = sorted(csl_sigs & no_houses)
    if csl_yes and not csl_no:
        flags.append({
            "tone": "green",
            "code": "csl_clean_positive",
            "label": f"H{primary_house} CSL signifies only favorable houses {csl_yes}",
            "detail": (
                f"{query_csl}'s significations overlap ONLY the yes-set — no "
                f"contamination from denial houses. Classical KP clean YES signal."
            ),
        })
    elif csl_yes and csl_no:
        flags.append({
            "tone": "yellow",
            "code": "csl_mixed",
            "label": f"H{primary_house} CSL signifies yes {csl_yes} AND no {csl_no}",
            "detail": (
                f"{query_csl} signifies both sides of the topic. The yes-houses "
                f"provide potential; the no-houses provide conditions/obstacles. "
                f"Exactly the CONDITIONAL verdict pattern."
            ),
        })
    elif csl_no and not csl_yes:
        flags.append({
            "tone": "red",
            "code": "csl_clean_negative",
            "label": f"H{primary_house} CSL signifies only denial houses {csl_no}",
            "detail": (
                f"{query_csl} touches only the no-set — classical NO signal, "
                f"independent of the Lagna or RP support."
            ),
        })

    # === Retrograde primary-house CSL? ===
    # Retrograde significators in KP indicate delays or "revisiting" energy.
    if query_csl in planets_raw and planets_raw[query_csl].get("retrograde"):
        flags.append({
            "tone": "yellow",
            "code": "csl_retrograde",
            "label": f"{query_csl} (H{primary_house} CSL) is retrograde",
            "detail": (
                f"A retrograde primary-house CSL in KP indicates delays, revisits, "
                f"or an outcome that comes through a second attempt / re-negotiation "
                f"rather than a direct path."
            ),
        })

    # === Strongest RP also signifies the topic? ===
    strongest = rp_context.get("strongest", [])
    strong_topic_support = [
        p for p in strongest
        if set(_planet_significations(p, planet_lons, cusp_lons)) & yes_houses
    ]
    if strong_topic_support:
        names = ", ".join(strong_topic_support)
        flags.append({
            "tone": "green",
            "code": "strongest_rp_supports_topic",
            "label": f"Strongest RP{'s' if len(strong_topic_support) > 1 else ''} {names} signify the topic",
            "detail": (
                f"{names} fill 2+ slots of the current RP set AND signify favorable "
                f"houses. KSK's timing priority: dasha/bhukti of these planets "
                f"deliver results with the highest probability."
            ),
        })

    return flags


def _kp_verdict(
    lagna_sub: str, topic: str, planet_lons: dict, cusp_lons: list,
    ruling_planets: list, moon_analysis: dict,
) -> dict:
    houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])
    yes_houses = set(houses["yes"])
    no_houses = set(houses["no"])

    layer1 = _csl_layer_analysis(lagna_sub, 1, yes_houses, no_houses, planet_lons, cusp_lons)
    lagna_fruitful = layer1["layer_verdict"] in ("YES", "MIXED")

    primary_house = TOPIC_PRIMARY_HOUSE.get(topic.lower(), 1)
    if primary_house == 1:
        layer2 = layer1
        query_csl = lagna_sub
    else:
        query_cusp_lon = cusp_lons[primary_house - 1] % 360
        query_csl = get_sub_lord(query_cusp_lon)
        layer2 = _csl_layer_analysis(query_csl, primary_house, yes_houses, no_houses, planet_lons, cusp_lons)

    # Supporting gates
    h2_csl = get_sub_lord(cusp_lons[1] % 360)
    h11_csl = get_sub_lord(cusp_lons[10] % 360)
    h2_sigs = set(_planet_significations(h2_csl, planet_lons, cusp_lons))
    h11_sigs = set(_planet_significations(h11_csl, planet_lons, cusp_lons))
    h2_supports = bool(h2_sigs & yes_houses)
    h11_supports = bool(h11_sigs & yes_houses)

    # RP confirmation
    rp_set = set(ruling_planets)
    rp_confirm_csl = query_csl in rp_set
    rp_signifying_yes = [rp for rp in ruling_planets
                         if set(_planet_significations(rp, planet_lons, cusp_lons)) & yes_houses]
    rp_strength = len(rp_signifying_yes)

    moon_star_sigs = set(moon_analysis.get("star_lord_significations", []))
    moon_supports = bool(moon_star_sigs & yes_houses)

    query_verdict = layer2["layer_verdict"]
    if query_verdict == "YES":
        if lagna_fruitful and rp_confirm_csl:
            overall, confidence = "YES", "HIGH"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"Lagna CSL {lagna_sub} fruitful ✓ | {query_csl} is a Ruling Planet ✓")
        elif lagna_fruitful or rp_strength >= 2:
            overall, confidence = "YES", "MEDIUM"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"{'Lagna fruitful ✓' if lagna_fruitful else ''} "
                      f"{'| ' + str(rp_strength) + ' RPs confirm ✓' if rp_strength >= 2 else ''}")
        else:
            overall, confidence = "YES", "LOW"
            reason = f"H{primary_house} CSL {query_csl} signifies yes-houses, but Lagna CSL and RPs provide weak support."
    elif query_verdict == "NO":
        overall = "NO"
        confidence = "HIGH" if not lagna_fruitful else "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies denial houses {sorted(layer2['no_activated'])}. "
                  f"{'Lagna also unfavorable.' if not lagna_fruitful else 'Lagna shows some promise but primary gate denies.'}")
    elif query_verdict == "MIXED":
        overall, confidence = "CONDITIONAL", "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies both yes {sorted(layer2['yes_activated'])} "
                  f"and no {sorted(layer2['no_activated'])} houses. "
                  f"{'H2+H11 support.' if h2_supports and h11_supports else 'Monitor H2/H11 CSLs for fulfillment timing.'}")
    else:
        # PR A1.1c — "RP signifies topic → PARTIAL" rule.
        # When the primary-house CSL has no direct connection to topic
        # houses (would be UNCLEAR), but one or more Ruling Planets DO
        # signify those houses, classical KP treats this as a delayed /
        # partial YES — the moment carries promise even though the
        # primary gate is weak. We upgrade UNCLEAR -> PARTIAL to give
        # the astrologer that nuance.
        if rp_strength >= 1:
            overall = "PARTIAL"
            confidence = "MEDIUM" if rp_strength >= 2 else "LOW"
            rp_names = ", ".join(rp_signifying_yes)
            reason = (f"H{primary_house} CSL {query_csl} does not signify topic houses, "
                      f"but {rp_strength} Ruling Planet{'s' if rp_strength != 1 else ''} "
                      f"({rp_names}) signify them. Classical KP: the moment carries the "
                      f"promise even though the primary gate is weak. "
                      f"Expect a delayed or indirect outcome — watch dasha/bhukti of {rp_names} "
                      f"for timing.")
        else:
            overall, confidence = "UNCLEAR", "LOW"
            reason = (f"H{primary_house} CSL {query_csl} signifies H{sorted(layer2['significations'])} "
                      f"— no direct connection to topic houses and no Ruling Planet supports them either. "
                      f"Query may be premature or question unclear.")

    return {
        "verdict": overall,
        "overall_verdict": overall,
        "confidence": confidence,
        "explanation": reason,
        "verdict_reason": reason,
        "lagna_csl": lagna_sub,
        "lagna_csl_significations": layer1["significations"],
        "lagna_fruitful": lagna_fruitful,
        "lagna_layer": layer1,
        "query_house": primary_house,
        "query_csl": query_csl,
        "query_csl_significations": layer2["significations"],
        "query_layer": layer2,
        "h2_csl": h2_csl,
        "h2_supports": h2_supports,
        "h11_csl": h11_csl,
        "h11_supports": h11_supports,
        "ruling_planets": ruling_planets,
        "rp_confirms_csl": rp_confirm_csl,
        "rp_signifying_yes": rp_signifying_yes,
        "rp_strength": rp_strength,
        "moon_supports": moon_supports,
        "yes_houses": sorted(yes_houses),
        "no_houses": sorted(no_houses),
        # backward compat keys
        "sub_lord_significations": layer1["significations"],
        "yes_houses_activated": layer2["yes_activated"],
        "no_houses_activated": layer2["no_activated"],
    }


# ─────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────

def analyze_horary(
    number: int,
    question: str,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    topic: str = "general",
    query_date: str | None = None,
    query_time: str | None = None,
) -> dict:
    """
    KP Horary analysis.

    PR A1.1 API changes:
      * latitude, longitude, timezone_offset are REQUIRED (no Hyderabad
        fallback). The router enforces this upstream.
      * query_time accepted alongside query_date for minute-precise timing.
      * If neither query_date nor query_time is given, server's UTC now
        is used (the canonical KP moment = the moment the astrologer
        receives the question).
    """
    if not 1 <= number <= 249:
        raise ValueError("Prashna number must be between 1 and 249")

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # Determine the query moment. Server time is authoritative for "now".
    if query_date:
        time_str = query_time or "12:00"
        local_naive = datetime.strptime(f"{query_date} {time_str}", "%Y-%m-%d %H:%M")
        utc_dt = local_naive - timedelta(hours=timezone_offset)
        utc_dt = utc_dt.replace(tzinfo=dt_tz.utc)
    else:
        utc_dt = datetime.now(dt_tz.utc)

    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600,
    )

    # Prashna Lagna from canonical 249 table
    lagna_lon, sub_entry = number_to_lagna_longitude(number)

    # Planets now
    planets_raw = get_planet_positions(jd)
    planet_lons = {p: d["longitude"] for p, d in planets_raw.items()}

    # Cusps via Placidus at astrologer's lat/lon — but with the PRASHNA
    # Lagna as H1. Canonical KP: the Prashna Lagna replaces the natural
    # ascendant; houses 2-12 are computed by Placidus-walking from the
    # Prashna Lagna using the astrologer's lat/lon for proportional spans.
    # Swiss Ephemeris doesn't expose this directly, so we compute Placidus
    # cusps at lat/lon and then OFFSET all cusps so that cusp[0] = Prashna
    # Lagna, preserving the relative proportional spans that depend on
    # the astrologer's latitude.
    _, ascmc_at_loc = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    cusps_at_loc, _ = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    actual_lagna = ascmc_at_loc[0] % 360
    # Rotate each cusp so cusps[0] aligns with Prashna Lagna while keeping
    # the Placidus proportional spans from the astrologer's latitude.
    offset = (lagna_lon - actual_lagna) % 360
    cusp_lons = [(cusps_at_loc[i] + offset) % 360 for i in range(12)]
    # Guarantee H1 is exactly Prashna Lagna (avoid float drift).
    cusp_lons[0] = lagna_lon % 360

    # Lagna sub-lord (from the Prashna Lagna)
    lagna_sub = get_sub_lord(lagna_lon)
    lagna_nak_info = get_nakshatra_and_starlord(lagna_lon)

    # Ruling Planets — independent of Prashna Lagna, using ACTUAL Lagna
    ruling_planets, rp_context = _compute_ruling_planets(
        jd, latitude, longitude, timezone_offset, planet_lons,
    )
    moon_analysis = _moon_analysis(planet_lons, cusp_lons)

    # Planet details with 4-level significations.
    # PR A1.1b: also surface `significations_by_level` so the astrologer
    # UI can display the 4-level KP hierarchy without recomputing.
    planet_details = []
    for p_name, p_lon in planet_lons.items():
        nak_info = get_nakshatra_and_starlord(p_lon)
        by_level = _planet_significations_by_level(p_name, planet_lons, cusp_lons)
        planet_details.append({
            "planet": p_name,
            "longitude": round(p_lon % 360, 4),
            "sign": get_sign(p_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": get_sub_lord(p_lon),
            "house": _get_planet_house(p_lon, cusp_lons),
            "retrograde": planets_raw[p_name].get("retrograde", False),
            "significations": sorted({h for houses in by_level.values() for h in houses}),
            "significations_by_level": {str(k): v for k, v in by_level.items()},
            "is_ruling_planet": p_name in ruling_planets,
        })

    # PR A1.1b: for the primary topic house, build a ranked significator
    # list — every planet that signifies the house, with its strongest
    # level. The frontend uses this for the "Significator hierarchy" card.
    primary_house = TOPIC_PRIMARY_HOUSE.get(topic.lower(), 1)
    primary_house_significators: list[dict] = []
    for p_name in planet_lons.keys():
        by_level = _planet_significations_by_level(p_name, planet_lons, cusp_lons)
        strongest_level = None
        for lvl in (1, 2, 3, 4):
            if primary_house in by_level.get(lvl, []):
                strongest_level = lvl
                break
        if strongest_level is not None:
            primary_house_significators.append({
                "planet": p_name,
                "strongest_level": strongest_level,
                "levels_hit": [lvl for lvl in (1, 2, 3, 4)
                               if primary_house in by_level.get(lvl, [])],
                "is_ruling_planet": p_name in ruling_planets,
            })
    # Sort strongest first; among equal levels, RP planets bubble up.
    primary_house_significators.sort(
        key=lambda x: (x["strongest_level"], 0 if x["is_ruling_planet"] else 1, x["planet"])
    )

    # Cusp details
    cusp_details = []
    for i, c_lon in enumerate(cusp_lons):
        nak_info = get_nakshatra_and_starlord(c_lon)
        c_sub = get_sub_lord(c_lon)
        cusp_details.append({
            "house": i + 1,
            "longitude": round(c_lon % 360, 4),
            "sign": get_sign(c_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": c_sub,
            "sub_lord_significations": _planet_significations(c_sub, planet_lons, cusp_lons),
        })

    verdict = _kp_verdict(lagna_sub, topic, planet_lons, cusp_lons, ruling_planets, moon_analysis)

    t_houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])

    # PR A1.1d — clinical-indicator set; purely presentational, does NOT
    # modify verdict. Engine stays as a truth-reporter; clinical judgement
    # is a separate decision-support layer alongside it.
    clinical_flags = _compute_clinical_flags(
        topic=topic,
        lagna_sub=lagna_sub,
        primary_house=primary_house,
        query_csl=verdict.get("query_csl", ""),
        yes_houses=set(t_houses["yes"]),
        no_houses=set(t_houses["no"]),
        planet_lons=planet_lons,
        cusp_lons=cusp_lons,
        ruling_planets=ruling_planets,
        rp_context=rp_context,
        planets_raw=planets_raw,
        primary_house_significators=primary_house_significators,
    )

    return {
        "prashna_number": number,
        "question": question,
        "topic": topic,
        "chart_time": utc_dt.strftime("%Y-%m-%d %H:%M UTC"),
        "lagna": {
            "longitude": round(lagna_lon % 360, 4),
            "sign": get_sign(lagna_lon % 360),
            "nakshatra": lagna_nak_info.get("nakshatra", ""),
            "star_lord": lagna_nak_info.get("star_lord", ""),
            "sub_lord": lagna_sub,
            "sub_entry": sub_entry,
        },
        "ruling_planets": ruling_planets,
        "rp_context": rp_context,
        "moon_analysis": moon_analysis,
        "verdict": verdict,
        "topic_houses": t_houses,
        "primary_house": primary_house,
        "primary_house_significators": primary_house_significators,
        "clinical_flags": clinical_flags,  # NEW PR A1.1d
        "planets": planet_details,
        "cusps": cusp_details,
        "house_themes": HOUSE_THEMES,
    }
