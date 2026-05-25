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


def _clamp_houses(houses: list[int]) -> list[int]:
    """
    PR A1.1e Bug-3 guard: all significations must be in [1, 12]. Silently
    drop any value outside that range — should never happen after upstream
    fixes, but this prevents a bad house number from reaching the UI and
    rendering as 'H13'. Deduplicates and sorts.
    """
    return sorted({h for h in houses if isinstance(h, int) and 1 <= h <= 12})


def _planet_significations_by_level(planet_name: str, planet_lons: dict, cusp_lons: list) -> dict[int, list[int]]:
    """
    KP 4-level hierarchy, returned as a map level -> houses (strongest first).
        Level 1 — star lord's occupied house
        Level 2 — own occupied house
        Level 3 — star lord's owned houses
        Level 4 — own owned houses

    PR A1.1e Bug-2: for Rahu/Ketu, KP canonical rule says nodes INHERIT
    the significations of:
      (a) any other planet occupying the SAME nakshatra as the node
          (i.e., conjoining in the node's own nakshatra), AND
      (b) the sign lord of the sign the node occupies.
    This inheritance folds into the same 4-level map proportionally:
      - Conjoining planet's Level 1/2 significations contribute at the
        same levels to the node's map.
      - Sign-lord's Level 1/2/3/4 significations contribute as Level 3/4
        inheritance for the node (nodes don't have true ownership of
        a sign; their sign-lord inheritance is weaker than their own
        placement, which is already captured by Levels 1/2).

    Returns {1: [...], 2: [...], 3: [...], 4: [...]}, every value in [1,12].
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

    result: dict[int, list[int]] = {
        1: [sl_occupied] if sl_occupied else [],
        2: [own_occupied] if own_occupied else [],
        3: list(sl_owned),
        4: list(own_owned),
    }

    # Node inheritance (Rahu / Ketu) — canonical KP rule per KSK Reader I.
    if planet_name in ("Rahu", "Ketu"):
        # (a) Conjoining planet in the node's own nakshatra.
        # Find any other planet sharing the node's nakshatra index.
        node_nak_idx = get_nakshatra_and_starlord(plon).get("nakshatra_index", -1)
        for other, other_lon in planet_lons.items():
            if other in (planet_name, "Rahu", "Ketu"):
                continue
            other_nak_idx = get_nakshatra_and_starlord(other_lon).get("nakshatra_index", -1)
            if other_nak_idx == node_nak_idx:
                # Fold the other planet's Level 1/2 into the node at the same
                # level — this is a direct inheritance of "the planet the
                # node is sitting on top of".
                other_map = _planet_significations_by_level(other, planet_lons, cusp_lons)
                result[1].extend(other_map[1])
                result[2].extend(other_map[2])

        # (b) Sign lord of the node's sign.
        node_sign_lord = SIGN_LORDS.get(get_sign(plon % 360), "")
        if node_sign_lord and node_sign_lord != planet_name and node_sign_lord in planet_lons:
            # Sign-lord inheritance is weaker than direct placement — treat
            # it as Level 3 (moderate). This matches classical KP ordering
            # where "signified via sign lord" is not as strong as own
            # occupation or own star lord.
            sl_occ = _get_planet_house(planet_lons[node_sign_lord], cusp_lons)
            if sl_occ:
                result[3].append(sl_occ)
            result[3].extend(_houses_ruled_by(node_sign_lord, cusp_lons))

    # Normalize every level: in-range, unique, sorted.
    return {lvl: _clamp_houses(houses) for lvl, houses in result.items()}


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

    # === H1 — Lagna degree validity (KSK Reader I — 5°-25° rule) ===
    # Per KSK doctrine: a Prashna Lagna degree < 5° = "query not ripened,
    # too early to look into"; > 25° = "too late to look into". The verdict
    # cascade still runs but a yellow flag is added so the astrologer
    # explicitly weighs the structural caveat before delivering the verdict.
    # Source: kpastrology.com horary rules + theastrologyonline.com KP horary
    # method + KSK Reader I chapter on Prashna validity.
    lagna_deg_in_sign = cusp_lons[0] % 30
    if lagna_deg_in_sign < 5.0:
        flags.append({
            "tone": "yellow",
            "code": "lagna_premature",
            "label": f"Lagna at {lagna_deg_in_sign:.2f}° — query may be premature",
            "label_te": f"లగ్నం {lagna_deg_in_sign:.2f}° — ప్రశ్న ముందుగా అడిగినట్లు",
            "detail": (
                f"Prashna Lagna sits at {lagna_deg_in_sign:.2f}° in its sign — "
                f"below the canonical 5° threshold. Per KSK Reader I doctrine on "
                f"Prashna validity, lagna degrees under 5° indicate the matter "
                f"has not yet ripened — the querent may be asking before the "
                f"event-window has actually formed. Verdict below remains "
                f"structurally accurate, but treat the timing with extra caution: "
                f"re-querying after 2-3 weeks (when the situation matures) often "
                f"produces a cleaner Prashna."
            ),
            "detail_te": (
                f"ప్రశ్న లగ్నం దాని రాశిలో {lagna_deg_in_sign:.2f}° వద్ద ఉంది — KSK "
                f"పఠనశాస్త్రం ప్రకారం 5° కంటే తక్కువ ఉంటే ప్రశ్న పూర్తిగా "
                f"పరిపక్వం కాలేదు. క్రింది ఫలితం నిర్మాణాత్మకంగా సరైనదే, కానీ "
                f"2-3 వారాల తర్వాత మళ్లీ ప్రశ్నించడం స్పష్టమైన ఫలితం ఇస్తుంది."
            ),
        })
    elif lagna_deg_in_sign > 25.0:
        flags.append({
            "tone": "yellow",
            "code": "lagna_expired",
            "label": f"Lagna at {lagna_deg_in_sign:.2f}° — query may be too late",
            "label_te": f"లగ్నం {lagna_deg_in_sign:.2f}° — ప్రశ్నకు సమయం దాటిపోయింది",
            "detail": (
                f"Prashna Lagna sits at {lagna_deg_in_sign:.2f}° in its sign — "
                f"above the canonical 25° threshold. Per KSK Reader I doctrine, "
                f"lagna degrees over 25° indicate the matter has already passed "
                f"its decision window — the event may have crystallized (positively "
                f"or negatively) before the question was asked. Verdict below "
                f"reflects current chart structure; consider whether a related "
                f"event has already occurred that the querent may have missed."
            ),
            "detail_te": (
                f"ప్రశ్న లగ్నం దాని రాశిలో {lagna_deg_in_sign:.2f}° వద్ద ఉంది — "
                f"KSK ప్రకారం 25° దాటితే ప్రశ్నకు సమయం దాటిపోయిందని అర్థం. "
                f"సంఘటన ఇప్పటికే జరిగి ఉండవచ్చు — ఫలితాన్ని ఆ దృష్టితో చూడండి."
            ),
        })
    else:
        flags.append({
            "tone": "green",
            "code": "lagna_ripened",
            "label": f"Lagna at {lagna_deg_in_sign:.2f}° — query is ripe (5°–25° window)",
            "label_te": f"లగ్నం {lagna_deg_in_sign:.2f}° — ప్రశ్న పరిపక్వం (5°–25°)",
            "detail": (
                f"Prashna Lagna sits at {lagna_deg_in_sign:.2f}° in its sign — "
                f"well within the canonical 5°–25° KSK decision window. The "
                f"question is structurally ripe for a clean horary verdict."
            ),
            "detail_te": (
                f"ప్రశ్న లగ్నం {lagna_deg_in_sign:.2f}° వద్ద — KSK 5°–25° "
                f"నిర్ణయ విండోలో ఉంది. ప్రశ్న స్పష్టమైన హోరారీ ఫలితం కోసం "
                f"నిర్మాణాత్మకంగా సిద్ధంగా ఉంది."
            ),
        })

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

    # === Layer 1 yellow: Lagna CSL self-obstruction (topic-specific) ===
    # PR A1.1e Bug-1: classic 6/8/12 is a *generic* dustana; for a specific
    # topic the actual obstruction houses are the TOPIC's no_houses. For
    # career, H5/H8/H12; for marriage, H1/H6/H10; etc. We flag only when
    # the Lagna CSL's significations overlap the topic-specific denial set.
    lagna_denial = sorted(lagna_sigs & no_houses)
    if lagna_denial:
        flags.append({
            "tone": "yellow",
            "code": "lagna_csl_self_obstruction",
            "label": f"Lagna CSL also signifies denial house{'s' if len(lagna_denial) > 1 else ''} H{', H'.join(str(h) for h in lagna_denial)}",
            "detail": (
                f"{lagna_sub} (Lagna CSL) signifies the topic's denial house"
                f"{'s' if len(lagna_denial) > 1 else ''} "
                f"{lagna_denial}. Classical KP treats this as a subtle "
                f"obstruction — the querent's own mindset or context pulls "
                f"against the matter even when other factors align. Denial "
                f"houses for this topic: H{', H'.join(str(h) for h in sorted(no_houses))}."
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
            "label_te": f"{query_csl} (H{primary_house} CSL) వక్రంలో",
            "detail": (
                f"A retrograde primary-house CSL in KP indicates delays, revisits, "
                f"or an outcome that comes through a second attempt / re-negotiation "
                f"rather than a direct path."
            ),
            "detail_te": (
                f"ప్రాథమిక CSL వక్ర గ్రహం — KP ప్రకారం ఆలస్యం, తిరిగి సందర్శన, "
                f"లేదా రెండవ ప్రయత్నం / తిరిగి చర్చల ద్వారా ఫలితం వస్తుంది."
            ),
        })

    # === H2 — Primary CSL in star of retrograde planet ===
    # KSK Reader I rule 4 (verbatim spirit): "The most important house cusp
    # sub lord should not itself be retrograde at the time of judgment.
    # This sub lord should not occupy a star whose lord is retrograde at
    # the time of judgment."
    # The first condition (csl_retrograde) is covered above. This flag
    # catches the SECOND condition: CSL is direct, but its STAR LORD is
    # retrograde — per KSK, "the event materialises only after the
    # retrograde planet turns direct, with obstacles and delay."
    # Source: astrojasa.blogspot.com KP horary rules + KSK Reader I.
    if query_csl in planet_lons:
        csl_lon = planet_lons[query_csl]
        csl_star_lord = get_nakshatra_and_starlord(csl_lon).get("star_lord", "")
        if (
            csl_star_lord
            and csl_star_lord in planets_raw
            and planets_raw[csl_star_lord].get("retrograde")
        ):
            flags.append({
                "tone": "yellow",
                "code": "csl_in_retrograde_star",
                "label": f"{query_csl} (H{primary_house} CSL) sits in star of retrograde {csl_star_lord}",
                "label_te": f"{query_csl} (H{primary_house} CSL) వక్ర {csl_star_lord} నక్షత్రంలో",
                "detail": (
                    f"Primary-house CSL {query_csl} is in nakshatra ruled by "
                    f"{csl_star_lord}, which is currently retrograde. Per KSK "
                    f"Reader I rule 4: when the CSL's star lord is retrograde, "
                    f"the event materialises only AFTER the retrograde planet "
                    f"turns direct — typically with obstacles, re-attempts, or "
                    f"delay. This is structurally different from CSL-retrograde "
                    f"(which delays directly): here the COLOURING star is in "
                    f"reversal, so the matter holds its breath until "
                    f"{csl_star_lord} resumes direct motion."
                ),
                "detail_te": (
                    f"ప్రాథమిక CSL {query_csl} {csl_star_lord} నక్షత్రంలో — "
                    f"{csl_star_lord} ప్రస్తుతం వక్రంలో. KSK ప్రకారం: CSL యొక్క "
                    f"నక్షత్ర అధిపతి వక్రంగా ఉన్నప్పుడు, ఆ గ్రహం ఋజువు అయిన "
                    f"తర్వాతనే సంఘటన పూర్తి అవుతుంది — అడ్డంకులు, తిరిగి ప్రయత్నాలు, "
                    f"లేదా ఆలస్యంతో."
                ),
            })

    # Also check Lagna CSL's star lord for additional context on querent state
    if lagna_sub in planet_lons and lagna_sub != query_csl:
        lagna_csl_lon = planet_lons[lagna_sub]
        lagna_star_lord = get_nakshatra_and_starlord(lagna_csl_lon).get("star_lord", "")
        if (
            lagna_star_lord
            and lagna_star_lord in planets_raw
            and planets_raw[lagna_star_lord].get("retrograde")
        ):
            flags.append({
                "tone": "yellow",
                "code": "lagna_csl_in_retrograde_star",
                "label": f"Lagna CSL {lagna_sub} in star of retrograde {lagna_star_lord}",
                "label_te": f"లగ్న CSL {lagna_sub} వక్ర {lagna_star_lord} నక్షత్రంలో",
                "detail": (
                    f"Lagna CSL {lagna_sub}'s star lord {lagna_star_lord} is "
                    f"retrograde at the query moment. Per KSK doctrine, the "
                    f"querent's framing of the question itself carries "
                    f"reconsideration energy — they may revise the question, "
                    f"add conditions, or be of two minds about the outcome they "
                    f"want. Not a denial signal, just a flavour of the moment."
                ),
                "detail_te": (
                    f"లగ్న CSL {lagna_sub} నక్షత్ర అధిపతి {lagna_star_lord} "
                    f"వక్రంలో — ప్రశ్నికుడు ప్రశ్నను తిరిగి ఆలోచించే శక్తి, "
                    f"షరతులు జోడించడం లేదా రెండు మనసులతో ఉండడం."
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


def _detect_patterns(
    *,
    topic: str,
    query_csl: str,
    lagna_csl: str,
    planet_lons: dict,
    cusp_lons: list,
    ruling_planets: list[str],
    rp_context: dict,
    yes_houses: set[int],
    no_houses: set[int],
    layer2_significations: list[int],
) -> list[dict]:
    """
    PR H4 — Detect named KP patterns from pattern_library.md and surface
    them on the verdict card. Pattern naming is what distinguishes a
    deep KSK reading from a generic significator scan (RULE 19).

    Patterns implemented (canonical from pattern_library.md):
      T1 — Joint Period Principle (multiple period layers signify)
      T2 — RP Amplifier (significator that is also a Ruling Planet)
      T3 — Self-significator concentration (planet in own star)
      T4 — Sookshma day-precision (deferred — requires native dasha context;
           added later when H9 timing window lands)
      M5 — AD-lord = supporting-cusp-sub-lord (deferred — same reason)
      D2 — Step 4 partial denier (offer-then-withdrawn)

    Returns list of {id, name, evidence, tone} where tone is "gold" for
    positive patterns and "amber" for friction patterns like D2.
    """
    patterns: list[dict] = []
    rp_set = set(ruling_planets)

    # ── T2 — RP Amplifier ─────────────────────────────────────────
    # When a significator of the topic is ALSO currently a Ruling Planet.
    # KSK: such a planet carries 2-3× the timing weight of a non-RP
    # significator. The strongest variant fires when the primary CSL
    # itself is in RPs.
    if query_csl in rp_set:
        freq = len(rp_context.get("planet_slots", {}).get(query_csl, []))
        slots = rp_context.get("planet_slots", {}).get(query_csl, [])
        patterns.append({
            "id": "T2",
            "name": "RP Amplifier — Primary CSL is Ruling Planet",
            "name_te": "RP వర్ధకం — ప్రాథమిక CSL నియమ గ్రహం",
            "evidence": (
                f"{query_csl} is both the primary-house CSL AND a Ruling Planet "
                f"({freq}/7 slots: {', '.join(slots)}). Per KSK, this is the "
                f"strongest timing confirmation KP offers — the moment is ripe."
            ),
            "evidence_te": (
                f"{query_csl} ప్రాథమిక CSL మరియు నియమ గ్రహం "
                f"({freq}/7 స్థానాలు). KSK ప్రకారం, ఇది బలమైన సమయ నిర్ధారణ."
            ),
            "tone": "gold",
        })
    # T2 also fires when ANY topic significator is among the strongest RPs (>=2 slots)
    else:
        strongest = rp_context.get("strongest", [])
        for sp in strongest:
            sigs = set(_planet_significations(sp, planet_lons, cusp_lons))
            if sigs & yes_houses:
                hit_houses = sorted(sigs & yes_houses)
                patterns.append({
                    "id": "T2",
                    "name": f"RP Amplifier — Strongest RP {sp} signifies topic",
                    "name_te": f"RP వర్ధకం — బలమైన RP {sp} టాపిక్‌ను సూచిస్తుంది",
                    "evidence": (
                        f"{sp} fills 2+ RP slots AND signifies relevant houses "
                        f"{hit_houses} for {topic}. Its dasha/bhukti carries "
                        f"strongest timing weight per KSK."
                    ),
                    "evidence_te": (
                        f"{sp} 2+ RP స్థానాల్లో + {topic}కు {hit_houses} సూచిస్తుంది. "
                        f"దీని దశ/భుక్తి బలమైన సమయం."
                    ),
                    "tone": "gold",
                })
                break  # only flag the strongest once

    # ── T3 — Self-significator concentration ──────────────────────
    # When the primary CSL is placed in its own nakshatra, it directly
    # signifies its own houses without expressing through a star lord.
    # KSK: such a planet's results arrive concentrated and pure.
    if query_csl in planet_lons:
        csl_lon = planet_lons[query_csl]
        csl_star_lord = get_nakshatra_and_starlord(csl_lon).get("star_lord", "")
        if csl_star_lord == query_csl:
            patterns.append({
                "id": "T3",
                "name": f"Self-significator — {query_csl} in own star",
                "name_te": f"స్వీయ-సూచకం — {query_csl} సొంత నక్షత్రంలో",
                "evidence": (
                    f"{query_csl} sits in its own nakshatra — its results arrive "
                    f"directly without colouring through a star lord. KSK: pure, "
                    f"concentrated effects; the planet's themes manifest cleanly "
                    f"in its dasha/bhukti."
                ),
                "evidence_te": (
                    f"{query_csl} సొంత నక్షత్రంలో — ఫలితాలు నేరుగా, స్వచ్ఛంగా, "
                    f"దాని దశ/భుక్తిలో శుద్ధంగా వ్యక్తమవుతాయి."
                ),
                "tone": "gold",
            })

    # ── T1 — Joint Period (within horary moment) ──────────────────
    # In horary, the equivalent of joint period is: Lagna CSL + Primary
    # CSL + at least one RP ALL signify the relevant house group.
    # When all three align in horary, the matter is structurally fired
    # at this moment — strongest YES signal horary can produce.
    lagna_sigs = set(_planet_significations(lagna_csl, planet_lons, cusp_lons))
    csl_sigs = set(layer2_significations)
    lagna_hits = bool(lagna_sigs & yes_houses)
    csl_hits = bool(csl_sigs & yes_houses)
    rp_topic_hit = any(
        set(_planet_significations(rp, planet_lons, cusp_lons)) & yes_houses
        for rp in ruling_planets
    )
    if lagna_hits and csl_hits and rp_topic_hit:
        patterns.append({
            "id": "T1",
            "name": "Joint Period — all 3 horary layers signify",
            "name_te": "ఉమ్మడి కాలం — మూడు హోరారీ స్థాయిలు సూచిస్తాయి",
            "evidence": (
                f"Lagna CSL ({lagna_csl}) signifies topic ✓ | Primary CSL "
                f"({query_csl}) signifies topic ✓ | At least one RP signifies "
                f"topic ✓ — all three horary layers converge. KSK Reader V: "
                f"events fire only at joint periods. Strongest YES horary signal."
            ),
            "evidence_te": (
                f"లగ్న CSL ({lagna_csl}), ప్రాథమిక CSL ({query_csl}), "
                f"నియమ గ్రహాలు — మూడూ టాపిక్‌ను సూచిస్తాయి. బలమైన YES సంకేతం."
            ),
            "tone": "gold",
        })

    # ── D2 — Step 4 partial denier (offer-then-withdrawn) ─────────
    # When primary CSL signifies relevant houses (promise present) BUT
    # the deepest chain layer (star lord of CSL's sub lord) signifies
    # ONLY denial houses, the event is offered then withdrawn / cancelled
    # at the last moment.
    if query_csl in planet_lons:
        csl_lon = planet_lons[query_csl]
        csl_sub = get_sub_lord(csl_lon)
        if csl_sub in planet_lons:
            csl_sub_lon = planet_lons[csl_sub]
            step4_lord = get_nakshatra_and_starlord(csl_sub_lon).get("star_lord", "")
            if step4_lord and step4_lord in planet_lons:
                step4_houses = set(_planet_significations(step4_lord, planet_lons, cusp_lons))
                step4_in_yes = step4_houses & yes_houses
                step4_in_no = step4_houses & no_houses
                # Fires only when (a) Steps 1-2 show promise (CSL hits yes)
                # AND (b) Step 4 hits ONLY denial houses (not mixed).
                if csl_hits and step4_in_no and not step4_in_yes:
                    patterns.append({
                        "id": "D2",
                        "name": f"Step 4 Partial Denier — {step4_lord} (offer-then-withdrawn risk)",
                        "name_te": f"4వ స్థాయి నిరాకరణ — {step4_lord} (ఆఫర్-తర్వాత-తొలగింపు)",
                        "evidence": (
                            f"Primary CSL {query_csl} promises (signifies topic houses "
                            f"{sorted(csl_sigs & yes_houses)}) but Step 4 of the chain "
                            f"({step4_lord} — star lord of CSL's sub lord) signifies "
                            f"ONLY denial houses {sorted(step4_in_no)}. Per pattern "
                            f"library D2: the matter may be offered then withdrawn at "
                            f"the last stage (interview cleared but offer rescinded, "
                            f"engagement broken before marriage, contract issued but "
                            f"cancelled). Distinct from outright denial — the promise "
                            f"is real, the last-mile fails."
                        ),
                        "evidence_te": (
                            f"ప్రాథమిక CSL {query_csl} వాగ్దానం ఇస్తుంది, కానీ చైన్ "
                            f"4వ స్థాయి ({step4_lord}) కేవలం నిరాకరణ భావాలను సూచిస్తుంది. "
                            f"ఆఫర్ వస్తుంది కానీ చివరి దశలో తొలగించబడవచ్చు."
                        ),
                        "tone": "amber",
                    })

    return patterns


def _compute_numeric_confidence(
    *,
    layer1_pass: bool,
    layer2_clean_yes: bool,
    layer2_mixed: bool,
    layer2_clean_no: bool,
    layer2_neutral: bool,
    rp_strength: int,
    h2_supports: bool,
    h11_supports: bool,
    csl_retrograde: bool,
    csl_star_retrograde: bool,
    lagna_in_window: bool,
) -> tuple[int, list[dict]]:
    """
    PR H3 — Compute a numeric 0–100 confidence score for the horary verdict.

    Brings horary into parity with the Analysis tab's engine_confidence
    (also 0–100). Score is built from explicit, auditable contributions
    so the astrologer can see exactly what produced the number.

    Weighting (max 100):
      Layer 1  — Lagna CSL fruitful                       0 / +20
      Layer 2  — Primary CSL clean YES (++)               +30
                 — Primary CSL mixed yes/no (CONDITIONAL) +15
                 — Primary CSL neutral (no touch)         +0
                 — Primary CSL clean NO (denial)          -10
      Layer 3  — RP overlap (per significator hit)        +10 each (cap +30)
      Multi-cusp — H2 supports                            +5
                 — H11 supports                           +5

      Penalties (subtract):
      CSL retrograde                                       -5
      CSL star lord retrograde                             -5
      Lagna outside 5°–25° window                          -10

    Returns (score in [0, 100], contributions list for audit trail).
    Contributions list entries: {label, delta, note}.
    """
    contributions: list[dict] = []
    score = 0

    # Layer 1
    if layer1_pass:
        score += 20
        contributions.append({"label": "Layer 1 — Lagna CSL fruitful", "delta": +20,
                              "note": "Question itself carries promise (KSK Reader)"})
    else:
        contributions.append({"label": "Layer 1 — Lagna CSL barren", "delta": 0,
                              "note": "Question may not carry inherent promise"})

    # Layer 2
    if layer2_clean_yes:
        score += 30
        contributions.append({"label": "Layer 2 — Primary CSL clean YES", "delta": +30,
                              "note": "CSL signifies only relevant houses"})
    elif layer2_mixed:
        score += 15
        contributions.append({"label": "Layer 2 — Primary CSL mixed", "delta": +15,
                              "note": "CSL touches both relevant + denial — CONDITIONAL"})
    elif layer2_clean_no:
        score -= 10
        contributions.append({"label": "Layer 2 — Primary CSL denial", "delta": -10,
                              "note": "CSL signifies only denial houses"})
    elif layer2_neutral:
        contributions.append({"label": "Layer 2 — Primary CSL neutral", "delta": 0,
                              "note": "CSL signifies houses outside the topic set"})

    # Layer 3 — RP overlap
    rp_delta = min(rp_strength * 10, 30)
    if rp_delta > 0:
        score += rp_delta
        contributions.append({"label": f"Layer 3 — {rp_strength} RP{'s' if rp_strength != 1 else ''} signify topic",
                              "delta": +rp_delta,
                              "note": f"Capped at +30 ({rp_strength}×10)"})
    else:
        contributions.append({"label": "Layer 3 — No RP signifies topic", "delta": 0,
                              "note": "Timing thread not currently active"})

    # Multi-cusp supporting
    if h2_supports:
        score += 5
        contributions.append({"label": "Multi-cusp — H2 (family/wealth) supports", "delta": +5, "note": ""})
    if h11_supports:
        score += 5
        contributions.append({"label": "Multi-cusp — H11 (fulfilment) supports", "delta": +5, "note": ""})

    # Penalties
    if csl_retrograde:
        score -= 5
        contributions.append({"label": "Penalty — Primary CSL retrograde", "delta": -5,
                              "note": "KSK: retro CSL delays results"})
    if csl_star_retrograde:
        score -= 5
        contributions.append({"label": "Penalty — Primary CSL in star of retrograde", "delta": -5,
                              "note": "KSK Reader I rule 4: results delayed until star lord direct"})
    if not lagna_in_window:
        score -= 10
        contributions.append({"label": "Penalty — Lagna outside 5°–25° window", "delta": -10,
                              "note": "KSK: query premature or expired"})

    # Clamp to [0, 100]
    score = max(0, min(100, score))
    return score, contributions


def _kp_verdict(
    lagna_sub: str, topic: str, planet_lons: dict, cusp_lons: list,
    ruling_planets: list, moon_analysis: dict,
    planets_raw: dict | None = None,
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

    # PR H3 — Numeric confidence 0–100 with audit trail.
    # Brings horary into parity with Analysis tab's engine_confidence.
    csl_retro = bool(planets_raw and query_csl in planets_raw
                     and planets_raw[query_csl].get("retrograde"))
    csl_star_retro = False
    if query_csl in planet_lons and planets_raw:
        _csl_star = get_nakshatra_and_starlord(planet_lons[query_csl]).get("star_lord", "")
        if _csl_star and _csl_star in planets_raw and planets_raw[_csl_star].get("retrograde"):
            csl_star_retro = True
    _lagna_dis = cusp_lons[0] % 30
    lagna_in_window = 5.0 <= _lagna_dis <= 25.0

    confidence_score, confidence_breakdown = _compute_numeric_confidence(
        layer1_pass=lagna_fruitful,
        layer2_clean_yes=(query_verdict == "YES"),
        layer2_mixed=(query_verdict == "MIXED"),
        layer2_clean_no=(query_verdict == "NO"),
        layer2_neutral=(query_verdict == "NEUTRAL"),
        rp_strength=rp_strength,
        h2_supports=h2_supports,
        h11_supports=h11_supports,
        csl_retrograde=csl_retro,
        csl_star_retrograde=csl_star_retro,
        lagna_in_window=lagna_in_window,
    )

    return {
        "verdict": overall,
        "overall_verdict": overall,
        "confidence": confidence,
        # PR H3 — numeric confidence + auditable breakdown
        "confidence_score": confidence_score,
        "confidence_breakdown": confidence_breakdown,
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

    verdict = _kp_verdict(
        lagna_sub, topic, planet_lons, cusp_lons, ruling_planets, moon_analysis,
        planets_raw=planets_raw,  # H3 — for retrograde penalty computation
    )

    t_houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])

    # PR H4 — Pattern detection. Names canonical KP patterns from
    # pattern_library.md (T1/T2/T3/D2). Pattern naming distinguishes
    # a deep KSK reading from a generic significator scan (RULE 19).
    patterns_fired = _detect_patterns(
        topic=topic,
        query_csl=verdict.get("query_csl", ""),
        lagna_csl=lagna_sub,
        planet_lons=planet_lons,
        cusp_lons=cusp_lons,
        ruling_planets=ruling_planets,
        rp_context=rp_context,
        yes_houses=set(t_houses["yes"]),
        no_houses=set(t_houses["no"]),
        layer2_significations=verdict.get("query_csl_significations", []),
    )

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

    # H1 — Structured lagna validity for the frontend "Query Validity" card.
    # Mirrors the clinical-flag classification but as a single field the UI
    # can render prominently (vs scanning the flags array).
    _ldis = lagna_lon % 30
    if _ldis < 5.0:
        _lagna_state = "premature"
    elif _ldis > 25.0:
        _lagna_state = "expired"
    else:
        _lagna_state = "ripened"
    lagna_validity = {
        "state": _lagna_state,
        "degree_in_sign": round(_ldis, 4),
        "window_start": 5.0,
        "window_end": 25.0,
        "in_window": 5.0 <= _ldis <= 25.0,
        "doctrine": (
            "KSK Reader I (Prashna validity): lagna degree < 5° = "
            "premature; 5°–25° = ripened decision window; > 25° = expired."
        ),
    }

    return {
        "prashna_number": number,
        "question": question,
        "topic": topic,
        "chart_time": utc_dt.strftime("%Y-%m-%d %H:%M UTC"),
        "lagna": {
            "longitude": round(lagna_lon % 360, 4),
            "sign": get_sign(lagna_lon % 360),
            "degree_in_sign": round(_ldis, 4),
            "nakshatra": lagna_nak_info.get("nakshatra", ""),
            "star_lord": lagna_nak_info.get("star_lord", ""),
            "sub_lord": lagna_sub,
            "sub_entry": sub_entry,
        },
        "lagna_validity": lagna_validity,  # H1
        "ruling_planets": ruling_planets,
        "rp_context": rp_context,
        "moon_analysis": moon_analysis,
        "verdict": verdict,
        "topic_houses": t_houses,
        "primary_house": primary_house,
        "primary_house_significators": primary_house_significators,
        "clinical_flags": clinical_flags,  # NEW PR A1.1d
        "patterns_fired": patterns_fired,   # PR H4 — canonical KP patterns
        "planets": planet_details,
        "cusps": cusp_details,
        "house_themes": HOUSE_THEMES,
    }
