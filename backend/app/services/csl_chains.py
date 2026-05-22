"""
KP Cuspal Sub-Lord (CSL) Chain Pre-computation.

In KP astrology, the sub-lord of each house cusp is the DECIDING FACTOR
for that house's matters. This module pre-computes the full signification
chain for every house's CSL so Claude can interpret instead of computing.

PR A1.12 (May 2026): added Step 4 (star lord of CSL's sub lord) per
Gondhalekar Four-Step Theory + RULE 20 system prompt. Previously the
engine stopped at Step 3 (CSL's sub lord) while the prompt asked the AI
to reason about Step 4 = "FINAL DECIDER" for offer-then-withdrawn
detection (Pattern D2). The mismatch caused silent gaps in CSL reasoning.

Canonical 4-step (Gondhalekar / KSK Reader V):
  Step 1: CSL planet itself — house occupied + houses ruled
  Step 2: CSL's STAR LORD — house occupied + houses ruled
  Step 3: CSL's SUB LORD — house occupied + houses ruled
  Step 4: STAR LORD of CSL's SUB LORD — house occupied + houses ruled
          (the "final decider" — when Steps 1-3 promise but Step 4 only
           signifies denial houses, the event is offered then withdrawn)

UNION of Steps 1-4 → final CSL signification set.
"""

from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    SIGN_LORDS as _SIGN_LORDS_LIST,
    # PR A2.0a — single source of truth for topic-house mappings
    TOPIC_HOUSE_MAP_CANONICAL,
    resolve_topic_alias,
)

# PR A1.3-fix-24 — derive the dict-shaped SIGN_LORDS from chart_engine's
# canonical list, so editing one place stays in sync. Was previously a
# duplicate hardcoded dict here — silent divergence risk.
_SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
SIGN_LORDS = {name: _SIGN_LORDS_LIST[i] for i, name in enumerate(_SIGN_NAMES)}

HOUSE_NAMES = {
    1: "Self/Health/Lagna", 2: "Wealth/Family/Speech", 3: "Siblings/Courage/Short journeys",
    4: "Home/Mother/Property/Vehicles", 5: "Children/Romance/Education/Speculation",
    6: "Enemies/Debts/Service/Disease", 7: "Marriage/Partnerships/Contracts",
    8: "Longevity/Occult/Sudden events/Inheritance", 9: "Luck/Father/Long journeys/Religion",
    10: "Career/Status/Authority", 11: "Gains/Income/Desires fulfilled/Friends",
    12: "Losses/Expenses/Foreign/Liberation",
}


def _get_planet_house(planet_lon: float, cusp_lons: list) -> int:
    """Find which house a planet occupies given the 12 cusp longitudes."""
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
    """Return list of house numbers whose sign lord is planet_name."""
    ruled = []
    for i, lon in enumerate(cusp_lons):
        sign = get_sign(lon % 360)
        if SIGN_LORDS.get(sign) == planet_name:
            ruled.append(i + 1)
    return ruled


def _planet_lon_map(planets_list: list) -> dict:
    """Convert workspace planets array to {planet_en: longitude} dict."""
    return {p["planet_en"]: p["longitude"] for p in planets_list if "planet_en" in p}


def compute_csl_chains(cusps: list, planets: list) -> dict:
    """
    For every house cusp, compute the full CSL signification chain.

    Args:
        cusps: workspace cusps list [{house_num, cusp_longitude, sub_lord_en, star_lord_en, ...}]
        planets: workspace planets list [{planet_en, longitude, ...}]

    Returns:
        dict keyed by house number (1-12), each value has:
            csl: str — name of the Cuspal Sub-Lord
            csl_house: int — house the CSL occupies
            csl_rules: list[int] — houses CSL rules as sign lord
            csl_star_lord: str — CSL's own star lord
            csl_star_lord_house: int — house CSL's star lord occupies
            csl_star_lord_rules: list[int] — houses CSL's star lord rules
            csl_sub_lord: str — CSL's own sub-lord (Step 3 — one level deeper)
            csl_sub_lord_house: int — house CSL's sub-lord occupies
            csl_sub_lord_star_lord: str — Step 4: star lord of CSL's sub-lord (FINAL DECIDER)
            csl_sub_lord_star_lord_house: int — house Step-4 planet occupies
            csl_sub_lord_star_lord_rules: list[int] — houses Step-4 planet rules
            step4_signifies_denial_only: bool — True if Step 4 only signifies denial houses
                                                (set later by topic-specific Pattern D2 check)
            all_significations: list[int] — union of all 4 steps
            chain_text: str — human-readable chain description for LLM
    """
    cusp_sorted = sorted(cusps, key=lambda c: c.get("house_num", 0))
    cusp_lons = [c["cusp_longitude"] for c in cusp_sorted]
    planet_lons = _planet_lon_map(planets)

    result = {}
    for cusp in cusp_sorted:
        h = cusp["house_num"]
        csl_name = cusp.get("sub_lord_en", "")
        if not csl_name or csl_name not in planet_lons:
            # PR A1.3-fix-24 — fill defensive defaults for ALL keys so
            # downstream consumers can read csl_chains[h]["csl_house"] etc.
            # without KeyError (today only chain_text is read, but defending
            # against future usage).
            result[h] = {
                "csl": csl_name,
                "csl_house": 0,
                "csl_rules": [],
                "csl_nakshatra": "",
                "csl_star_lord": "",
                "csl_star_lord_house": 0,
                "csl_star_lord_rules": [],
                "csl_sub_lord": "",
                "csl_sub_lord_house": 0,
                "csl_sub_lord_rules": [],
                "csl_sub_lord_star_lord": "",
                "csl_sub_lord_star_lord_house": 0,
                "csl_sub_lord_star_lord_rules": [],
                "all_significations": [],
                "chain_text": f"H{h}: CSL {csl_name} not found in planets",
            }
            continue

        csl_lon = planet_lons[csl_name]
        csl_house = _get_planet_house(csl_lon, cusp_lons)
        csl_rules = _houses_ruled_by(csl_name, cusp_lons)
        csl_nak_info = get_nakshatra_and_starlord(csl_lon)
        csl_star_lord = csl_nak_info.get("star_lord", "")
        csl_nakshatra = csl_nak_info.get("nakshatra", "")

        csl_star_lord_house = 0
        csl_star_lord_rules = []
        if csl_star_lord and csl_star_lord in planet_lons:
            csl_star_lord_house = _get_planet_house(planet_lons[csl_star_lord], cusp_lons)
            csl_star_lord_rules = _houses_ruled_by(csl_star_lord, cusp_lons)

        # Step 3: CSL's own sub-lord
        csl_sub_lord = get_sub_lord(csl_lon)
        csl_sub_lord_house = 0
        csl_sub_lord_rules = []
        if csl_sub_lord and csl_sub_lord in planet_lons and csl_sub_lord != csl_name:
            csl_sub_lord_house = _get_planet_house(planet_lons[csl_sub_lord], cusp_lons)
            csl_sub_lord_rules = _houses_ruled_by(csl_sub_lord, cusp_lons)

        # Step 4 (PR A1.12 — was missing previously): star lord of CSL's sub lord.
        # Per Gondhalekar Four-Step Theory + system prompt RULE 20, this is the
        # "FINAL DECIDER" — when Steps 1-3 promise but Step 4 only signifies
        # denial houses, the event is offered then withdrawn (Pattern D2).
        csl_sub_lord_star_lord = ""
        csl_sub_lord_star_lord_house = 0
        csl_sub_lord_star_lord_rules = []
        if csl_sub_lord and csl_sub_lord in planet_lons:
            sub_lord_lon = planet_lons[csl_sub_lord]
            sub_nak_info = get_nakshatra_and_starlord(sub_lord_lon)
            csl_sub_lord_star_lord = sub_nak_info.get("star_lord", "")
            if csl_sub_lord_star_lord and csl_sub_lord_star_lord in planet_lons:
                csl_sub_lord_star_lord_house = _get_planet_house(
                    planet_lons[csl_sub_lord_star_lord], cusp_lons
                )
                csl_sub_lord_star_lord_rules = _houses_ruled_by(
                    csl_sub_lord_star_lord, cusp_lons
                )

        # Union of all 4 steps' significations
        all_signifs = sorted(set(
            [csl_house] + csl_rules +
            ([csl_star_lord_house] if csl_star_lord_house else []) + csl_star_lord_rules +
            ([csl_sub_lord_house] if csl_sub_lord_house else []) + csl_sub_lord_rules +
            ([csl_sub_lord_star_lord_house] if csl_sub_lord_star_lord_house else []) +
            csl_sub_lord_star_lord_rules
        ))

        # Build human-readable chain text for LLM
        lines = [
            f"H{h} ({HOUSE_NAMES.get(h, '')}) — CSL = {csl_name}",
            f"  {csl_name} occupies → H{csl_house}",
        ]
        if csl_rules:
            lines.append(f"  {csl_name} rules (sign lord of) → H{', H'.join(map(str, csl_rules))}")
        else:
            lines.append(f"  {csl_name} rules → no house in this chart")
        lines.append(f"  {csl_name} nakshatra = {csl_nakshatra}, star lord = {csl_star_lord}")
        if csl_star_lord_house:
            lines.append(f"  {csl_star_lord} (star lord) occupies → H{csl_star_lord_house}")
        if csl_star_lord_rules:
            lines.append(f"  {csl_star_lord} rules → H{', H'.join(map(str, csl_star_lord_rules))}")
        lines.append(f"  Step 3 — {csl_name}'s sub-lord = {csl_sub_lord}")
        if csl_sub_lord_house:
            lines.append(f"    {csl_sub_lord} (sub-lord) occupies → H{csl_sub_lord_house}")
        if csl_sub_lord_rules:
            lines.append(f"    {csl_sub_lord} rules → H{', H'.join(map(str, csl_sub_lord_rules))}")
        lines.append(f"  Step 4 — {csl_sub_lord}'s star lord = {csl_sub_lord_star_lord} (FINAL DECIDER)")
        if csl_sub_lord_star_lord_house:
            lines.append(f"    {csl_sub_lord_star_lord} (Step-4) occupies → H{csl_sub_lord_star_lord_house}")
        if csl_sub_lord_star_lord_rules:
            lines.append(f"    {csl_sub_lord_star_lord} rules → H{', H'.join(map(str, csl_sub_lord_star_lord_rules))}")
        lines.append(f"  ★ FINAL H{h} CSL SIGNIFICATIONS (4-step union): {all_signifs}")

        result[h] = {
            "csl": csl_name,
            "csl_house": csl_house,
            "csl_rules": csl_rules,
            "csl_nakshatra": csl_nakshatra,
            "csl_star_lord": csl_star_lord,
            "csl_star_lord_house": csl_star_lord_house,
            "csl_star_lord_rules": csl_star_lord_rules,
            "csl_sub_lord": csl_sub_lord,
            "csl_sub_lord_house": csl_sub_lord_house,
            "csl_sub_lord_rules": csl_sub_lord_rules,
            "csl_sub_lord_star_lord": csl_sub_lord_star_lord,
            "csl_sub_lord_star_lord_house": csl_sub_lord_star_lord_house,
            "csl_sub_lord_star_lord_rules": csl_sub_lord_star_lord_rules,
            "all_significations": all_signifs,
            "chain_text": "\n".join(lines),
        }

    return result


def format_csl_chains_for_llm(csl_chains: dict) -> str:
    """Format the CSL chain data as a concise text block for Claude."""
    if not csl_chains:
        return ""
    lines = ["CSL (CUSPAL SUB-LORD) CHAIN ANALYSIS — pre-computed, use these facts directly:"]
    for h in range(1, 13):
        if h in csl_chains:
            lines.append(csl_chains[h]["chain_text"])
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────
# PR A1.17 — Pattern D2 (offer-then-withdrawn) detector
#
# Per pattern_library.md Pattern D2: when CSL Steps 1-3 promise (signify
# relevant houses for the topic) but Step 4 (star lord of CSL's sub lord)
# signifies ONLY denial houses, the event fires then withdraws at the
# last moment. Classic "interview cleared but offer rescinded" or
# "engagement broken before marriage" pattern.
#
# Now that A1.12 computes Step 4, we can detect this exactly per topic.
# ──────────────────────────────────────────────────────────────────────

# Topic-to-houses mapping — PR A2.0a: now DERIVED from the canonical map in
# chart_engine.py (TOPIC_HOUSE_MAP_CANONICAL). Previously this dict was a
# separate literal that disagreed with chart_engine.HOUSE_TOPICS on 13 of 15
# topics (see .claude/research/pre-pr-findings-2026-05-22.md).
#
# TOPIC_HOUSE_MAP retains the same shape it had pre-refactor (relevant + denial
# + primary_cusp) so the rest of this module's Pattern D2 detector code keeps
# working unchanged.
TOPIC_HOUSE_MAP = {
    topic: {
        "relevant":     set(data["relevant"]),
        "denial":       set(data["denial"]),
        "primary_cusp": data["primary_cusp"],
    }
    for topic, data in TOPIC_HOUSE_MAP_CANONICAL.items()
}


def detect_pattern_d2(csl_chains: dict, topic: str) -> dict | None:
    """
    Detect Pattern D2 (offer-then-withdrawn) for a given topic.

    Returns a dict with detection details if Pattern D2 risk is present,
    or None if no risk. Used by Analysis prompt to add structural warning
    ("be prepared for last-minute withdrawal in this topic area").

    Detection logic:
      1. Look up the topic's primary cusp + relevant + denial house sets.
      2. Get the CSL chain for that primary cusp.
      3. Check whether Steps 1-3 (CSL + star lord + sub lord) collectively
         signify any relevant house = "promise present"
      4. Check whether Step 4 (star lord of sub lord) signifies ONLY
         denial houses (no relevant overlap) = "final decider blocks"
      5. If both → Pattern D2 fires. Otherwise None.
    """
    # PR A2.0a — resolve alias first so e.g. "career" → "job", "foreign" → "foreign_travel"
    canonical_topic = resolve_topic_alias(topic)
    topic_info = TOPIC_HOUSE_MAP.get(canonical_topic)
    if not topic_info:
        return None

    primary_cusp = topic_info["primary_cusp"]
    relevant = topic_info["relevant"]
    denial = topic_info["denial"]

    chain = csl_chains.get(primary_cusp)
    if not chain:
        return None

    # Steps 1-3 union (CSL self + star lord + sub lord)
    steps_1_to_3 = set()
    if chain.get("csl_house"):
        steps_1_to_3.add(chain["csl_house"])
    steps_1_to_3.update(chain.get("csl_rules", []))
    if chain.get("csl_star_lord_house"):
        steps_1_to_3.add(chain["csl_star_lord_house"])
    steps_1_to_3.update(chain.get("csl_star_lord_rules", []))
    if chain.get("csl_sub_lord_house"):
        steps_1_to_3.add(chain["csl_sub_lord_house"])
    steps_1_to_3.update(chain.get("csl_sub_lord_rules", []))

    # Step 4 alone
    step_4 = set()
    if chain.get("csl_sub_lord_star_lord_house"):
        step_4.add(chain["csl_sub_lord_star_lord_house"])
    step_4.update(chain.get("csl_sub_lord_star_lord_rules", []))

    # Pattern D2 conditions
    promise_in_123 = bool(steps_1_to_3 & relevant)
    step4_denial_only = bool(step_4) and step_4.issubset(denial)
    step4_no_relevant = not bool(step_4 & relevant)

    if promise_in_123 and step4_denial_only and step4_no_relevant:
        return {
            "topic": topic,
            "primary_cusp": primary_cusp,
            "csl": chain.get("csl"),
            "step4_planet": chain.get("csl_sub_lord_star_lord"),
            "steps_1_3_relevant_hit": sorted(steps_1_to_3 & relevant),
            "step4_denial_hit": sorted(step_4 & denial),
            "warning": (
                f"Pattern D2 (offer-then-withdrawn) detected for {topic}: "
                f"H{primary_cusp} CSL chain promises (Steps 1-3 hit relevant houses "
                f"{sorted(steps_1_to_3 & relevant)}) but Step 4 ({chain.get('csl_sub_lord_star_lord')}) "
                f"signifies ONLY denial houses {sorted(step_4 & denial)} with no relevant overlap. "
                f"Events in this area may fire then withdraw at the final stage. "
                f"In real life: interviews clear but offers rescind, engagements break, "
                f"contracts issue then cancel. STRUCTURAL — not the native's fault."
            ),
        }

    # Softer version: Step 4 has SOME denial but also has at least one relevant.
    # Not Pattern D2 (offer holds) but worth flagging as "friction at final stage"
    step4_has_denial = bool(step_4 & denial)
    if promise_in_123 and step4_has_denial and (step_4 & relevant):
        return {
            "topic": topic,
            "primary_cusp": primary_cusp,
            "csl": chain.get("csl"),
            "step4_planet": chain.get("csl_sub_lord_star_lord"),
            "steps_1_3_relevant_hit": sorted(steps_1_to_3 & relevant),
            "step4_mixed": {
                "relevant": sorted(step_4 & relevant),
                "denial": sorted(step_4 & denial),
            },
            "warning": (
                f"Pattern D2-LITE for {topic}: H{primary_cusp} CSL Step 4 ({chain.get('csl_sub_lord_star_lord')}) "
                f"signifies mixed houses — relevant {sorted(step_4 & relevant)} + "
                f"denial {sorted(step_4 & denial)}. Events fire but with friction at the "
                f"final stage (delayed sign-offs, conditional offers, near-misses before final close)."
            ),
        }

    return None


def format_pattern_d2_for_llm(d2_detection: dict | None) -> str:
    """Format a Pattern D2 detection result for the LLM prompt. Empty string if no risk."""
    if not d2_detection:
        return ""
    return f"\n⚠ PATTERN D2 STRUCTURAL WARNING (engine-detected):\n{d2_detection['warning']}\n"


# ──────────────────────────────────────────────────────────────────────
# PR A1.18 — Joint Period signification union helper
#
# Per Pattern T1 (Joint Period Principle) in pattern_library.md, events
# fire ONLY at joint periods where MD + AD + PAD + Sookshma lords ALL
# signify the relevant houses for the topic. The AI was previously
# computing this union manually during readings, which is mechanical
# and error-prone. This helper does it once and surfaces the result.
# ──────────────────────────────────────────────────────────────────────

def compute_joint_period_significations(
    csl_chains: dict,
    md_lord: str,
    ad_lord: str,
    pad_lord: str,
    sookshma_lord: str | None = None,
) -> dict:
    """
    For each layer in the joint period stack, return the union of houses
    that lord signifies based on its CSL appearances across all 12 cusps.

    Returns:
        {
            "md_signifies": [list of house numbers],
            "ad_signifies": [list],
            "pad_signifies": [list],
            "sookshma_signifies": [list] | None,
            "all_layers_overlap": [houses ALL layers signify together — strongest firing zone],
            "any_layer_overlap": [houses ANY layer signifies — broad period theme],
        }

    "all_layers_overlap" is the strongest possible firing zone — when MD,
    AD, PAD (and Sookshma) lords ALL signify the same house simultaneously
    that house is structurally activated for the joint period.
    """
    def _planet_sigs(planet_name: str) -> set:
        """Find all houses where this planet appears in CSL chains."""
        sigs = set()
        for h, chain in csl_chains.items():
            # Planet's own house and ownership across cusps
            if chain.get("csl") == planet_name:
                if chain.get("csl_house"):
                    sigs.add(chain["csl_house"])
                sigs.update(chain.get("csl_rules", []))
            if chain.get("csl_star_lord") == planet_name:
                if chain.get("csl_star_lord_house"):
                    sigs.add(chain["csl_star_lord_house"])
                sigs.update(chain.get("csl_star_lord_rules", []))
            if chain.get("csl_sub_lord") == planet_name:
                if chain.get("csl_sub_lord_house"):
                    sigs.add(chain["csl_sub_lord_house"])
                sigs.update(chain.get("csl_sub_lord_rules", []))
            if chain.get("csl_sub_lord_star_lord") == planet_name:
                if chain.get("csl_sub_lord_star_lord_house"):
                    sigs.add(chain["csl_sub_lord_star_lord_house"])
                sigs.update(chain.get("csl_sub_lord_star_lord_rules", []))
        return sigs

    md_sigs = _planet_sigs(md_lord) if md_lord else set()
    ad_sigs = _planet_sigs(ad_lord) if ad_lord else set()
    pad_sigs = _planet_sigs(pad_lord) if pad_lord else set()
    sk_sigs = _planet_sigs(sookshma_lord) if sookshma_lord else None

    all_layers = md_sigs & ad_sigs & pad_sigs
    if sk_sigs is not None:
        all_layers = all_layers & sk_sigs

    any_layer = md_sigs | ad_sigs | pad_sigs
    if sk_sigs is not None:
        any_layer = any_layer | sk_sigs

    return {
        "md_lord": md_lord,
        "ad_lord": ad_lord,
        "pad_lord": pad_lord,
        "sookshma_lord": sookshma_lord,
        "md_signifies": sorted(md_sigs),
        "ad_signifies": sorted(ad_sigs),
        "pad_signifies": sorted(pad_sigs),
        "sookshma_signifies": sorted(sk_sigs) if sk_sigs is not None else None,
        "all_layers_overlap": sorted(all_layers),
        "any_layer_overlap": sorted(any_layer),
    }


def format_joint_period_for_llm(jp: dict) -> str:
    """Format joint period signification analysis for the LLM prompt."""
    if not jp:
        return ""
    lines = [
        "JOINT PERIOD SIGNIFICATION ANALYSIS (Pattern T1) — pre-computed:",
        f"  MD {jp['md_lord']} signifies houses: {jp['md_signifies']}",
        f"  AD {jp['ad_lord']} signifies houses: {jp['ad_signifies']}",
        f"  PAD {jp['pad_lord']} signifies houses: {jp['pad_signifies']}",
    ]
    if jp.get("sookshma_lord"):
        lines.append(f"  Sookshma {jp['sookshma_lord']} signifies houses: {jp['sookshma_signifies']}")
    lines.append(f"  ★ ALL LAYERS OVERLAP (strongest firing zone): {jp['all_layers_overlap']}")
    lines.append(f"  ANY LAYER OVERLAP (broad period theme): {jp['any_layer_overlap']}")
    return "\n".join(lines)
