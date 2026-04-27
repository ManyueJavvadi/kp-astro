"""
PR A1.3c — Advanced KP compute layer.

Surfaces structured fields the LLM needs for KSK-grade analysis:

- A/B/C/D significator labels per house (per KSK Reader V hierarchy)
- Fruitful significators (significator ∩ Ruling Planets — strongest timing trigger)
- Self-strength flag per planet (in own star = pure result)
- Cusp sign type (movable/fixed/dual + fruitful/barren — for KSK overlay rules)
- Star-Sub Harmony score per CSL (the core KSK insight — see RULE 16 in system prompt)
- RP overlap count per upcoming Antardasha lord (timing ripeness)
- Per-topic confidence score 0-100 (synthesised from the above signals)

Pure Python; depends only on chart_engine helpers.
"""

from typing import Dict, List, Optional

from app.services.chart_engine import (
    get_sign_lord_for_house,
    get_houses_owned_by_planet,
    get_rahu_ketu_significations,
    HOUSE_TOPICS,
)


# ── Sign categorisation ──────────────────────────────────────────────

MOVABLE_SIGNS = {"Aries", "Cancer", "Libra", "Capricorn"}
FIXED_SIGNS   = {"Taurus", "Leo", "Scorpio", "Aquarius"}
DUAL_SIGNS    = {"Gemini", "Virgo", "Sagittarius", "Pisces"}

# Per KSK strict children rule — see other_topics.txt children section.
FRUITFUL_SIGNS = {"Cancer", "Scorpio", "Pisces"}
BARREN_SIGNS   = {"Aries", "Gemini", "Leo", "Virgo", "Capricorn"}
SEMI_FRUITFUL  = {"Taurus", "Libra"}
# Sagittarius / Aquarius treated as neutral.


# ── Topic denial houses (for harmony scoring) ────────────────────────
# These match the system prompt's RULE 5 denial sets — when the
# system prompt and this dict disagree, fix BOTH at the same time.

TOPIC_DENIAL: Dict[str, List[int]] = {
    # PR A1.3-fix-2 (C3): each set is now grounded in either explicit KSK
    # rule or strict 12th-from-relevant logic; matches RULE 5 + KB.
    "marriage":       [1, 6, 10, 12],   # KSK Reader Rule 2 verbatim
    "divorce":        [2, 7, 11],       # = marriage relevant (reconciliation = denial of divorce)
    "job":            [1, 5, 9, 12],    # 12th-from [2,6,10,11] (KSK Simple Rules)
    "career":         [1, 5, 9, 12],    # alias of job
    "profession":     [1, 5, 9, 12],    # alias of job
    "business":       [1, 6, 9],        # 12th-from [7,2,10,11] — H7 primary not H6 (FIX from job copy)
    "foreign_travel": [2, 8, 11],       # 12th-from [3,9,12]
    "foreign_settle": [2, 8, 11],       # same as travel; H12 primary
    "education":      [3, 8, 10],       # KSK rule (other_topics.txt:28 + RULE 5) — was [3,5,8,12]
    "children":       [1, 4, 10],       # KSK rule (other_topics.txt) — H4=12th from H5
    "property":       [3],              # KSK: only H3 explicit (12th from H4); H10 secondary
    "litigation":     [7, 12],          # RULE 5: opponent wins via H7/H12 — was [5,7,12]
    "wealth":         [1, 8, 12],       # 12th-from H2 + debt + loss
    # Health: HOUSE_TOPICS health = [6,8,12] (disease houses = relevant for
    # "do I have/will I have disease"). TOPIC_DENIAL = wellness houses
    # [1,5,11] (denial-of-disease = healthy). No overlap with relevant.
    "health":         [1, 5, 11],
}


# ── A / B / C / D significator hierarchy (KSK Reader V) ──────────────

def get_significators_by_level(
    house_num: int,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[str, List[str]]:
    """
    Return KSK Reader V hierarchy for a single house:
        A = planets in star of OCCUPANT(s)            (~100% strength)
        B = OCCUPANTS of the house                    (~75%)
        C = planets in star of OWNER (sign lord)      (~50%)
        D = OWNER (sign lord) of the cusp             (~25%)

    Note: a planet can appear in multiple levels (e.g., an occupant whose
    star lord is also the sign lord). We deduplicate per-level only.
    """
    occupants: List[str] = [p for p, h in planet_positions.items() if h == house_num]
    sign_lord: Optional[str] = get_sign_lord_for_house(house_num, cusps) if cusps else None

    A: List[str] = []
    B: List[str] = list(dict.fromkeys(occupants))
    C: List[str] = []
    D: List[str] = [sign_lord] if sign_lord else []

    for pname, pdata in planets.items():
        sl = pdata.get("star_lord")
        if sl in occupants and pname not in A:
            A.append(pname)
        if sign_lord and sl == sign_lord and pname not in C:
            C.append(pname)

    return {"A": A, "B": B, "C": C, "D": D}


def get_significators_by_level_for_topic(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[int, Dict[str, List[str]]]:
    """For each relevant house of the topic, return its A/B/C/D split."""
    if topic not in HOUSE_TOPICS:
        return {}
    out: Dict[int, Dict[str, List[str]]] = {}
    for h in HOUSE_TOPICS[topic]:
        out[h] = get_significators_by_level(h, planets, cusps, planet_positions)
    return out


# ── Fruitful significators (significator ∩ RP) ──────────────────────

def get_fruitful_significators(
    significators: List[str],
    ruling_planets_list: List[dict],
) -> List[str]:
    """
    Intersection of given significators with the current Ruling Planets.
    Per KSK timing rule: the strongest fructification trigger is when a
    house significator is ALSO ruling at the query moment.
    """
    if not ruling_planets_list:
        return []
    rp_planets = {rp.get("planet") for rp in ruling_planets_list if rp.get("planet")}
    return [s for s in significators if s in rp_planets]


# ── Self-strength (in own star) ─────────────────────────────────────

def is_self_strength(planet_name: str, planets: dict) -> bool:
    """
    True iff the planet is sitting in its OWN nakshatra (star_lord == planet
    itself). KSK calls this a "self-significator" — the planet's results
    arrive directly without colouring through another star lord.
    """
    pdata = planets.get(planet_name) or {}
    return pdata.get("star_lord") == planet_name


def self_strength_map(planets: dict) -> Dict[str, bool]:
    """Per-planet self-strength flags."""
    return {p: is_self_strength(p, planets) for p in planets.keys()}


# ── Cusp sign type ──────────────────────────────────────────────────

def get_cusp_sign_type(cusp_data: dict) -> Dict[str, str]:
    """
    Categorise a cusp's sign on two independent axes:
      movability:  movable | fixed | dual
      fruitfulness: fruitful | barren | semi | neutral
    Used as KSK overlay rules (e.g., barren H5 = restricted childbirth).
    """
    sign = cusp_data.get("sign", "") if cusp_data else ""
    movability = (
        "movable" if sign in MOVABLE_SIGNS else
        "fixed"   if sign in FIXED_SIGNS   else
        "dual"    if sign in DUAL_SIGNS    else "unknown"
    )
    fruitfulness = (
        "fruitful" if sign in FRUITFUL_SIGNS else
        "barren"   if sign in BARREN_SIGNS   else
        "semi"     if sign in SEMI_FRUITFUL  else "neutral"
    )
    return {"sign": sign, "movability": movability, "fruitfulness": fruitfulness}


def all_cusp_sign_types(cusps: dict) -> Dict[int, Dict[str, str]]:
    """Map house number -> sign-type info for all 12 cusps."""
    out: Dict[int, Dict[str, str]] = {}
    for i in range(1, 13):
        cd = cusps.get(f"House_{i}", {})
        out[i] = get_cusp_sign_type(cd)
    return out


# ── Star–Sub Harmony (the BIG KSK insight) ──────────────────────────

def compute_star_sub_harmony(
    csl_planet: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
    relevant_houses: List[int],
    denial_houses: List[int],
) -> Dict[str, object]:
    """
    Split the houses signified by a CSL into THREE layers:

    SELF LAYER (the planet itself — what it embodies):
        houses occupied + owned by the CSL planet itself
    STAR LAYER (the "what" — nature of matter, KSK colouring):
        houses occupied + owned by CSL's STAR LORD
    SUB LAYER (the "whether" — KSK deciding gate):
        houses occupied + owned by CSL's SUB LORD

    PR A1.3-fix-2 (C2): when CSL is Rahu or Ketu, apply the proxy rule —
    nodes have no sign rulership, so we add their conjunction-proxy
    significations into the SELF layer (delegated to chart_engine's
    get_rahu_ketu_significations which handles conjunction + sign-lord
    chains).

    Then score harmony from STAR + SUB leans (SELF is reported but does
    not drive the verdict — the sub is still the deciding gate per KSK):
        HARMONY  — both layers lean to RELEVANT houses
        ALIGNED  — sub leans relevant, star is mixed/neutral
        MIXED    — both layers ambiguous
        TENSION  — star relevant but sub denial (block dominates)
        CONTRA   — star denial but sub relevant (fires with friction)
        DENIED   — both layers lean to denial
    """
    if csl_planet not in planets:
        return {
            "csl_planet": csl_planet, "star_lord": None, "sub_lord": None,
            "self_houses": [], "star_houses": [], "sub_houses": [],
            "self_relevant": [], "self_denial": [],
            "star_relevant": [], "star_denial": [],
            "sub_relevant": [], "sub_denial": [],
            "harmony": "UNKNOWN",
        }

    p = planets[csl_planet]
    star_lord = p.get("star_lord")
    sub_lord  = p.get("sub_lord")

    # SELF layer — CSL's own occupation + ownership
    self_houses: set = set()
    if csl_planet in planet_positions:
        self_houses.add(planet_positions[csl_planet])
    if cusps:
        self_houses.update(get_houses_owned_by_planet(csl_planet, cusps))

    # PR A1.3-fix-2 (C2): Rahu/Ketu proxy. Nodes have no sign rulership,
    # so without the proxy their SELF layer is just their occupation house
    # — drastically under-counts. Delegate to chart_engine's helper which
    # walks conjunction + star-lord chains correctly.
    if csl_planet in ("Rahu", "Ketu"):
        try:
            rk = get_rahu_ketu_significations(csl_planet, planets, cusps, planet_positions)
            for h in rk.get("all_signified_houses", []) or []:
                if isinstance(h, int) and 1 <= h <= 12:
                    self_houses.add(h)
        except Exception:
            pass  # never fail compute on RK proxy — fall back to occupation only

    # STAR layer — star lord's occupation + ownership
    star_houses: set = set()
    if star_lord and star_lord in planet_positions:
        star_houses.add(planet_positions[star_lord])
    if star_lord and cusps:
        star_houses.update(get_houses_owned_by_planet(star_lord, cusps))

    # SUB layer — sub lord's occupation + ownership
    sub_houses: set = set()
    if sub_lord and sub_lord in planet_positions:
        sub_houses.add(planet_positions[sub_lord])
    if sub_lord and cusps:
        sub_houses.update(get_houses_owned_by_planet(sub_lord, cusps))

    rel_set = set(relevant_houses or [])
    den_set = set(denial_houses or [])

    self_rel = sorted(self_houses & rel_set)
    self_den = sorted(self_houses & den_set)
    star_rel = sorted(star_houses & rel_set)
    star_den = sorted(star_houses & den_set)
    sub_rel  = sorted(sub_houses  & rel_set)
    sub_den  = sorted(sub_houses  & den_set)

    def _lean(rel: List[int], den: List[int]) -> str:
        if len(rel) > len(den): return "rel"
        if len(den) > len(rel): return "den"
        return "neutral"

    s_lean = _lean(star_rel, star_den)
    b_lean = _lean(sub_rel, sub_den)

    if   s_lean == "rel"     and b_lean == "rel":     harmony = "HARMONY"
    elif b_lean == "rel"     and s_lean != "den":     harmony = "ALIGNED"
    elif s_lean == "rel"     and b_lean == "den":     harmony = "TENSION"
    elif s_lean == "den"     and b_lean == "rel":     harmony = "CONTRA"
    elif s_lean == "den"     and b_lean == "den":     harmony = "DENIED"
    else:                                              harmony = "MIXED"

    return {
        "csl_planet": csl_planet,
        "star_lord": star_lord,
        "sub_lord":  sub_lord,
        "self_houses":   sorted(self_houses),
        "self_relevant": self_rel,
        "self_denial":   self_den,
        "star_houses": sorted(star_houses),
        "sub_houses":  sorted(sub_houses),
        "star_relevant": star_rel,
        "star_denial":   star_den,
        "sub_relevant":  sub_rel,
        "sub_denial":    sub_den,
        "harmony": harmony,
    }


def harmony_for_topic_primary_cusp(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Optional[Dict[str, object]]:
    """Compute Star-Sub Harmony for the topic's PRIMARY cusp's sub lord."""
    if topic not in HOUSE_TOPICS or not cusps:
        return None
    primary_house = HOUSE_TOPICS[topic][0]
    csl = cusps.get(f"House_{primary_house}", {}).get("sub_lord")
    if not csl:
        return None
    relevant = HOUSE_TOPICS[topic]
    denial   = TOPIC_DENIAL.get(topic, [])
    result = compute_star_sub_harmony(
        csl, planets, cusps, planet_positions, relevant, denial,
    )
    result["topic"] = topic
    result["primary_cusp"] = primary_house
    return result


# ── RP overlap per Antardasha lord ──────────────────────────────────

def compute_rp_overlap(planet: str, ruling_planets_list: List[dict]) -> int:
    """How many RP slots a planet occupies (0..N). Higher = riper timing."""
    if not ruling_planets_list or not planet:
        return 0
    return sum(1 for rp in ruling_planets_list if rp.get("planet") == planet)


def rp_overlap_for_antardashas(
    antardashas: List[dict],
    ruling_planets_list: List[dict],
) -> List[Dict[str, object]]:
    """For each upcoming AD, return its lord + RP slot count + the slots."""
    out: List[Dict[str, object]] = []
    rp_by_planet: Dict[str, List[str]] = {}
    for rp in (ruling_planets_list or []):
        rp_by_planet.setdefault(rp.get("planet", ""), []).append(rp.get("slot", ""))
    for ad in antardashas or []:
        lord = ad.get("antardasha_lord")
        slots = rp_by_planet.get(lord, [])
        out.append({
            "antardasha_lord": lord,
            "start": ad.get("start"),
            "end":   ad.get("end"),
            "rp_overlap": len(slots),
            "rp_slots":  slots,
        })
    return out


# ── Per-topic confidence score 0–100 ────────────────────────────────

def compute_topic_confidence(
    promise_verdict: Optional[str],
    harmony: Optional[str],
    fruitful_count: int,
    rp_overlap_md: int,
    rp_overlap_ad: int,
    csl_self_strength: bool = False,
) -> int:
    """
    Weighted heuristic that synthesises the major signals into a single
    0–100 score. Calibration is INTENTIONALLY conservative — we'd rather
    say 65% and be right than say 92% and be wrong.

    Components (after PR A1.3-fix-4):
      Promise verdict tier         0–40
      Star-Sub harmony             0–25
      Fruitful significator count  0–15  (5 per fruitful, capped 15)
      MD lord RP overlap           0–10  (5 per slot, capped 10)
      AD lord RP overlap           0–10  (5 per slot, capped 10)
      CSL self-significator bonus  +5    (KSK pure-result concentration)

    Total can exceed 100 when CSL is self-significator; clamped at 100.
    """
    score = 0

    promise_map = {
        "STRONGLY PROMISED": 40,
        "PROMISED":          30,
        "CONDITIONAL":       20,
        "WEAKLY PROMISED":   10,
        "DENIED":             5,
    }
    pkey = (promise_verdict or "").strip().upper()
    score += promise_map.get(pkey, 15)

    harmony_map = {
        "HARMONY": 25, "ALIGNED": 18, "MIXED": 10,
        "TENSION":  6, "CONTRA":   6, "DENIED": 0, "UNKNOWN": 8,
    }
    score += harmony_map.get((harmony or "").upper(), 10)

    score += min(15, max(0, fruitful_count) * 5)
    score += min(10, max(0, rp_overlap_md) * 5)
    score += min(10, max(0, rp_overlap_ad) * 5)

    # PR A1.3-fix-4 (N1): KSK self-significator concentration — when the
    # primary CSL is in its own nakshatra, results arrive directly without
    # colouring through another star lord. Bonus +5.
    if csl_self_strength:
        score += 5

    return max(0, min(100, score))


# ── Top-level orchestrator ──────────────────────────────────────────

def compute_advanced_for_topic(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
    ruling_planets_list: List[dict],
    current_md_lord: Optional[str],
    current_ad_lord: Optional[str],
    upcoming_antardashas: List[dict],
    promise_verdict: Optional[str] = None,
) -> Dict[str, object]:
    """
    Single entry point that bundles all the A1.3c compute for a topic.
    Returns a dict ready to be merged into chart_data and emitted to
    the LLM via format_chart_for_llm.
    """
    # Significators by level for the topic's relevant houses
    sig_levels = get_significators_by_level_for_topic(
        topic, planets, cusps, planet_positions,
    )

    # Star-Sub harmony of the primary cusp
    harmony = harmony_for_topic_primary_cusp(
        topic, planets, cusps, planet_positions,
    )

    # Fruitful significators across all relevant houses
    relevant_houses = HOUSE_TOPICS.get(topic, [])
    flat_sigs: List[str] = []
    for h in relevant_houses:
        for level in ("A", "B", "C", "D"):
            for p in sig_levels.get(h, {}).get(level, []):
                if p and p not in flat_sigs:
                    flat_sigs.append(p)
    fruitful = get_fruitful_significators(flat_sigs, ruling_planets_list)

    # RP overlap on MD + AD + each upcoming AD
    md_overlap = compute_rp_overlap(current_md_lord, ruling_planets_list) if current_md_lord else 0
    ad_overlap = compute_rp_overlap(current_ad_lord, ruling_planets_list) if current_ad_lord else 0
    upcoming_overlap = rp_overlap_for_antardashas(upcoming_antardashas, ruling_planets_list)

    # Sign-type for the primary cusp (KSK overlay — esp. children/marriage)
    primary_house = relevant_houses[0] if relevant_houses else 0
    primary_cusp_data = cusps.get(f"House_{primary_house}", {}) if primary_house else {}
    primary_cusp_sign = get_cusp_sign_type(primary_cusp_data)

    # Self-strength flags for the planets that matter most for this topic
    self_strength = {p: is_self_strength(p, planets) for p in flat_sigs}

    # PR A1.3-fix-4 (N1): is the primary CSL itself a self-significator?
    csl_planet = (harmony or {}).get("csl_planet") if harmony else None
    csl_self = is_self_strength(csl_planet, planets) if csl_planet else False

    # Overall confidence
    confidence = compute_topic_confidence(
        promise_verdict=promise_verdict,
        harmony=(harmony or {}).get("harmony") if harmony else None,
        fruitful_count=len(fruitful),
        rp_overlap_md=md_overlap,
        rp_overlap_ad=ad_overlap,
        csl_self_strength=csl_self,
    )

    return {
        "topic": topic,
        "relevant_houses": relevant_houses,
        "denial_houses":   TOPIC_DENIAL.get(topic, []),
        "significators_by_level": sig_levels,
        "fruitful_significators": fruitful,
        "self_strength":         self_strength,
        "primary_cusp_sign_type": primary_cusp_sign,
        "star_sub_harmony":      harmony,
        "rp_overlap": {
            "md":  {"lord": current_md_lord, "slots": md_overlap},
            "ad":  {"lord": current_ad_lord, "slots": ad_overlap},
            "upcoming_antardashas": upcoming_overlap,
        },
        "confidence_score": confidence,
    }
