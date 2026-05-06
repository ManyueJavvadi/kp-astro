import os
import anthropic
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
# PR A1.3-fix-16 — async client used by the streaming variant
# (get_prediction_stream). Kept alongside the sync client so the
# existing get_prediction() call sites continue to work unchanged.
async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ================================================================
# KNOWLEDGE BASE LOADER
# ================================================================

# PR A1.3 — KNOWLEDGE_DIR was miswired. __file__ is backend/app/services/llm_service.py;
# ".." went up to backend/app; "knowledge" appended = backend/app/knowledge (DOES NOT EXIST).
# The actual KB files live at backend/knowledge/. Two ".." needed.
# This silent bug meant the Analysis LLM had been receiving ZERO knowledge content
# since the Analysis tab was first built. Fixed here.
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge")
# PR A2.2a — new Markdown KBs live under backend/app/kp_knowledge/.
# Prefer these over the legacy .txt files in backend/knowledge/; .md KBs
# are structured, cross-referenced, and authored against the research
# docs in .claude/research/.
KP_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "kp_knowledge")

# PR A2.2a.1 — module-level KB cache. The KB files are ~24 KB each;
# re-reading them on every LLM request wastes time. Load once at first
# use, cache in-memory. Safe because these files are immutable at
# runtime (only change on deploy, which restarts the process).
_KB_CACHE: dict = {}

def _load_kb(name: str) -> str:
    """Load a Markdown KB from backend/app/kp_knowledge/ with legacy
    .txt fallback, caching the result in-memory."""
    if name in _KB_CACHE:
        return _KB_CACHE[name]
    content = ""
    # Primary: structured Markdown in kp_knowledge/
    md_path = os.path.join(KP_KNOWLEDGE_DIR, f"{name}.md")
    try:
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        pass
    # Fallback: legacy .txt files in backend/knowledge/ (now correctly resolved
    # via KNOWLEDGE_DIR after the PR A1.3 fix above).
    if not content:
        legacy = os.path.join(KNOWLEDGE_DIR, f"{name}.txt")
        try:
            with open(legacy, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            pass
    _KB_CACHE[name] = content
    return content

TOPIC_TO_FILE = {
    "marriage": "marriage.txt",
    "job": "job.txt",
    "career": "job.txt",
    "profession": "job.txt",          # alias to job.txt
    "foreign_travel": "foreign.txt",
    "foreign_settle": "foreign.txt",
    "education": "other_topics.txt",
    "children": "other_topics.txt",
    "fertility": "other_topics.txt",  # alias maps to other_topics + children_detailed.md (deep load)
    "property": "other_topics.txt",
    "wealth": "other_topics.txt",
    "finance": "other_topics.txt",
    "litigation": "other_topics.txt",
    "health": "health.txt",
    "divorce": "divorce.txt",
    # PR A1.3 — relative-related topic aliases. Primary file is general.txt
    # (no topic-specific .txt for relatives); the parents_family.md +
    # bhavat_bhavam.md are pulled in via TOPIC_DEEP_DIVE below.
    # PR A1.3-fix-3 (M2): was wrongly routed to health.txt — fixed.
    "parents": "general.txt",
    "mother": "general.txt",
    "father": "general.txt",
    "spouse": "marriage.txt",
    "siblings": "general.txt",  # was other_topics.txt; siblings deep-dive lives in parents_family.md
    "general": "general.txt",
    # PR A1.3-fix-8 — personality + free-form topics
    "personality": "general.txt",
    "fame":        "general.txt",
    "creativity":  "general.txt",
    "spirituality":"general.txt",
    "addiction":   "general.txt",
    "mental_health": "general.txt",
    "friendship":  "general.txt",
    "decision":    "general.txt",
    "comparison":  "general.txt",
}

# PR A1.3 — Topic-specific deep-dive files (loaded ALONGSIDE the topic file).
# These contain detailed, gender-aware, multi-axis analysis for the topic.
TOPIC_DEEP_DIVE = {
    "children":   ["children_detailed.md"],
    "fertility":  ["children_detailed.md"],
    "health":     ["health_detailed.md"],
    "job":        ["profession_detailed.md"],
    "career":     ["profession_detailed.md"],
    "profession": ["profession_detailed.md"],
    # Relative analysis ALWAYS pulls in parents_family + bhavat_bhavam
    "parents":    ["parents_family.md", "bhavat_bhavam.md"],
    "mother":     ["parents_family.md", "bhavat_bhavam.md"],
    "father":     ["parents_family.md", "bhavat_bhavam.md"],
    "spouse":     ["parents_family.md", "bhavat_bhavam.md"],
    "siblings":   ["parents_family.md", "bhavat_bhavam.md"],
}

# Advanced KP files always loaded alongside topic-specific file (every query).
# These are foundational — every analysis benefits from them.
# PR A1.3 — added bhavat_bhavam.md (relative analysis), multi_factor_queries.md
# (combined questions), ksk_rejections.md (anti-Parashari guardrails).
ADVANCED_FILES = [
    "kp_csl_theory.txt",
    "timing_confirmation.txt",
    "planet_natures.txt",
    "bhavat_bhavam.md",           # PR A1.3 — house-from-house methodology for relatives
    "multi_factor_queries.md",    # PR A1.3 — handling combined questions
    "ksk_rejections.md",          # PR A1.3 — what NOT to use (anti-Parashari)
    # PR A1.3d — pattern recognition + worked examples + confidence calibration
    "pattern_library.md",         # named KP patterns the LLM should detect
    "gold_standard_examples.md",  # 3 master-format complete analyses
    "confidence_methodology.md",  # how the engine's 0-100 score is computed
    # PR A1.3-fix-8 — remedies always loaded (small, broadly relevant when
    # any friction signal fires; RULE 31 trigger is universal across topics).
    "remedies.md",                # KP parihara — behavioural-first remedies framework
    # PR A1.3-fix-9 — transit interpretation rules (was orphaned 156-line KB never loaded)
    "transit_rules.txt",          # KP transit (Gocharya) interpretation principles
]

# PR A1.3-fix-18 — User-mode lean KB.
# Astrologer mode loads the full ADVANCED_FILES set (12 files, ~40K
# tokens) because the 7-section structured output uses pattern names,
# 4-step chains, confidence methodology, gold-standard worked
# examples, etc. — all of which are pedagogical scaffolding for
# Sonnet's deep reasoning.
#
# User mode is plain-English narration of pre-computed engine
# verdicts (Haiku translation task). It only needs the *accuracy
# guardrails* and core KP foundation. Files dropped from user mode:
#   - timing_confirmation.txt   (engine handles timing)
#   - bhavat_bhavam.md          (only relative-questions context)
#   - multi_factor_queries.md   (rare combined queries)
#   - pattern_library.md        (user mode doesn't cite pattern names)
#   - gold_standard_examples.md (7-section astrologer-format examples)
#   - confidence_methodology.md (user just sees the score)
#   - remedies.md               (engine triggers remedies if needed)
#   - transit_rules.txt         (engine handles transits)
#
# Files KEPT for user mode (the accuracy backbone):
#   - kp_csl_theory.txt    — CSL methodology, central to verdict
#   - planet_natures.txt   — plain-English translation of planets
#   - ksk_rejections.md    — anti-Parashari guard (prevents Vedic leak)
#   - general.txt          — core KP principles (always loaded)
#
# Saves ~18K tokens of cache writes per first user-mode call.
USER_MODE_ADVANCED_FILES = [
    "kp_csl_theory.txt",
    "planet_natures.txt",
    "ksk_rejections.md",
]

# PR A1.3-fix-13 — conditional KB files (loaded only when topic matches
# the relevance set). Each ~2-3K tokens; saves cache-read cost per
# question on topics that don't need them.
#
# personality_psychology.md (~2.3K tokens):
#   Heavy framework for psyche / behaviour / archetype questions.
#   Marriage / job / health questions don't reference psychological
#   archetypes — the file mostly burns tokens for those topics.
#
# Note: this file moves OUT of universal_kb INTO topic_kb when relevant.
# Keeps universal_kb cache-stable (the whole point of fix-12) while
# trimming token-waste on irrelevant-topic queries.
CONDITIONAL_KB_FILES: dict = {
    "personality_psychology.md": {
        "personality",
        "fame",
        "creativity",
        "spirituality",
        "decision",
        "friendship",
        "addiction",
        "mental_health",
    },
}

import logging
_log = logging.getLogger("llm_service.kb")

# PR A1.3-fix-9 — per-topic KB cache (assembled string keyed by topic).
# Each Analysis tab query previously re-read ~26 files (~200 KB) from disk.
# Now we cache the assembled topic-string. Same logic as _KB_CACHE but at
# the load_knowledge level (one cache entry per topic).
_TOPIC_CACHE: dict = {}


def _read_kb_file(filename: str, section_label: str) -> str:
    """Read a single KB file with logged error on failure (PR A1.3-fix-9)."""
    path = os.path.join(KNOWLEDGE_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f"=== {section_label} ===\n" + f.read()
    except FileNotFoundError:
        _log.warning("KB file not found: %s", path)
        return ""
    except Exception as e:
        _log.warning("KB file read error %s: %s", path, e)
        return ""


# PR A1.3-fix-12 — KB split into UNIVERSAL + TOPIC for stable cache prefix.
# Old single-block layout invalidated the entire KB cache on any topic switch
# (job → marriage). Split lets the universal core (~22K tokens, identical
# across all topics) stay cached while only the topic-specific block (~10K
# tokens) re-writes on a topic change. See get_prediction() for the
# breakpoint ordering rationale.

def load_universal_kb(mode: str = "astrologer") -> str:
    """
    Universal KB content — IDENTICAL across all topics within a mode.
    Cache-stable forever within a session.

    PR A1.3-fix-18 — mode-aware:
      - mode="astrologer": general.txt + all 12 ADVANCED_FILES
        (~40K tokens). Loaded for the 7-section structured output.
      - mode="user":       general.txt + 3 USER_MODE_ADVANCED_FILES
        (kp_csl_theory + planet_natures + ksk_rejections, ~22K tokens).
        Lean KB sufficient for Haiku narration of pre-computed
        engine verdicts in plain English.

    Each mode has its own cache key in _TOPIC_CACHE so they don't
    collide. Astrologer mode behavior is unchanged from fix-13.
    """
    is_user_mode = (mode or "").lower() == "user"
    cache_key = "_universal_user" if is_user_mode else "_universal"

    if cache_key in _TOPIC_CACHE:
        return _TOPIC_CACHE[cache_key]

    content: list = []

    general_section = _read_kb_file("general.txt", "CORE KP PRINCIPLES")
    if general_section:
        content.append(general_section)

    files = USER_MODE_ADVANCED_FILES if is_user_mode else ADVANCED_FILES
    for adv_file in files:
        section_name = (
            adv_file.replace(".md", "").replace(".txt", "")
            .upper().replace("_", " ")
        )
        adv_section = _read_kb_file(adv_file, section_name)
        if adv_section:
            content.append(adv_section)

    assembled = "\n\n".join(content)
    _TOPIC_CACHE[cache_key] = assembled
    return assembled


def load_topic_kb(topic: str) -> str:
    """
    Topic-specific KB content — VARIES per topic. Includes the topic file
    from TOPIC_TO_FILE and any TOPIC_DEEP_DIVE entries.
    Returns empty string if topic has no specific content (e.g., "general"
    routes to general.txt which is already in universal_kb).
    Roughly 10-15K tokens for most topics, 0 for "general".
    """
    cache_key = f"_topic_{topic}"
    if cache_key in _TOPIC_CACHE:
        return _TOPIC_CACHE[cache_key]

    topic_file = TOPIC_TO_FILE.get(topic, "general.txt")
    content: list = []

    # topic-specific file (skip if it's general.txt — already in universal_kb)
    if topic_file != "general.txt":
        topic_section = _read_kb_file(
            topic_file, f"KP RULES FOR {topic.upper()}"
        )
        if topic_section:
            content.append(topic_section)

    # Topic-specific deep-dive files (children/health/profession/family).
    for deep_file in TOPIC_DEEP_DIVE.get(topic, []):
        section_name = (
            deep_file.replace(".md", "").replace(".txt", "")
            .upper().replace("_", " ")
        )
        deep_section = _read_kb_file(deep_file, f"{section_name} (DEEP DIVE)")
        if deep_section:
            content.append(deep_section)

    # PR A1.3-fix-13 — conditional KB files (B1). Files like
    # personality_psychology.md are loaded ONLY when the topic is in
    # their relevance set, saving ~2-3K tokens per non-relevant query.
    for cond_file, relevant_topics in CONDITIONAL_KB_FILES.items():
        if topic in relevant_topics:
            section_name = (
                cond_file.replace(".md", "").replace(".txt", "")
                .upper().replace("_", " ")
            )
            cond_section = _read_kb_file(cond_file, section_name)
            if cond_section:
                content.append(cond_section)

    assembled = "\n\n".join(content)
    _TOPIC_CACHE[cache_key] = assembled
    return assembled


def load_knowledge(topic: str) -> str:
    """
    Backwards-compat wrapper — combines universal_kb + topic_kb into a single
    string. Used by call sites that don't need the cache split. New
    cache-aware code paths should call load_universal_kb() and
    load_topic_kb() directly so each can sit in its own cache block.

    PR A1.3-fix-9 — original combined assembled-string.
    PR A1.3-fix-12 — re-implemented as wrapper over the split functions.
    """
    universal = load_universal_kb()
    topic_specific = load_topic_kb(topic)
    if topic_specific:
        return f"{universal}\n\n{topic_specific}"
    return universal


# ================================================================
# UNIFIED SYSTEM PROMPT — SAME ANALYSIS, SPLIT OUTPUT BY MODE
# ================================================================

def get_system_prompt() -> str:
    today = datetime.now().strftime("%B %d, %Y")
    return f"""You are an expert KP (Krishnamurti Paddhati) astrologer with 20+ years of experience. You perform the same rigorous, complete KP analysis for every question. Your depth of reasoning never changes — only the presentation changes based on the MODE specified.

TODAY'S DATE: {today}

================================================================
CRITICAL RULES — NEVER VIOLATE THESE
================================================================

RULE 1 — NEVER GUESS DASHA DATES:
Use ONLY the exact antardasha dates provided in the chart data.
Never invent, estimate, or guess any dasha period dates.

RULE 1B — NEVER CONFUSE PAD DATES WITH AD DATES:
The chart data contains TWO separate date sequences:
1. FULL ANTARDASHA SEQUENCE — main sub-periods, each lasting months to years
2. PRATYANTARDASHA SEQUENCES FOR ALL ANTARDASHAS — mini-cycles WITHIN each AD

For example, a Mercury entry in the PAD sequence means Mercury is a
mini-cycle INSIDE the current AD. It does NOT mean Mercury becomes the
Antardasha lord. The Antardasha lord only changes when the FULL ANTARDASHA
SEQUENCE shows a new lord starting.

ALWAYS distinguish clearly:
- "Mercury mini-cycle within Saturn period (Aug 2026 → Jan 2027)" ← PAD
- "Mercury period begins Jan 21, 2029" ← AD transition
NEVER present a PAD date as if it were an AD transition.

RULE 2 — ALWAYS GIVE COMPLETE FUTURE TIMELINE:
When asked "when will X happen" WITHOUT a specific year mentioned,
analyze ALL future antardasha periods and give the COMPLETE timeline.
NEVER default to just the current period.
NEVER assume the user is asking about the current year.
The planets determine timing — not the date of the question.

RULE 3 — EACH QUESTION IS INDEPENDENT:
Treat each question independently. Do NOT carry over the timeframe or
context assumptions from a previous question in the conversation.
Example: If the user first asked about 2026 job prospects, and then asks
"when will I get married?", analyze marriage across ALL future periods —
do NOT assume they are asking about marriage in 2026.
Only carry forward: understanding of the natal chart, not time assumptions.

RULE 4 — NEVER SHIFT ANALYSIS UNDER PUSHBACK:
If the user disagrees with your analysis, do NOT change your verdict
unless they provide new factual information about their chart.
Stand by chart evidence. Sycophancy = wrong analysis.

RULE 5 — PROMISE VERDICT — 5-TIER SCALE WITH A/B/C/D STRENGTH (PR A1.3):

UNIVERSAL "ANY ONE" THRESHOLD:
For ANY topic, the event is PROMISED if the sub lord of the primary cusp
signifies AT LEAST ONE relevant house through its complete chain.
It does NOT need to signify all relevant houses. ANY ONE is sufficient.

FIVE-TIER VERDICT SCALE (use this exact scale per CSL signification level):

1. STRONGLY PROMISED:
   CSL is an A-level or B-level significator of multiple relevant houses,
   with ZERO denial-house touch. Event happens smoothly.

2. PROMISED:
   CSL signifies at least ONE relevant house at any level (A/B/C/D).
   Denial-house touch minimal/absent. Event happens, may have minor delays.

3. CONDITIONAL (KSK STRICT BHUKTI RULE — see below):
   CSL signifies BOTH relevant AND denial houses simultaneously.
   Per KSK Reader: event FIRES during bhuktis of relevant-house significators,
   and is BLOCKED during bhuktis of denial-house significators.
   This is BHUKTI-LEVEL precision, not "soft happens with delay".
   When stating verdict: enumerate WHICH bhuktis fire vs which block.

4. WEAKLY PROMISED:
   CSL signifies relevant houses only at C-level or D-level (weak strength).
   Multiple bhuktis may pass without fruition. Event likely only in specific
   high-confirmation windows (RP overlap required for timing certainty).

5. DENIED (rare):
   CSL has ZERO connection to any relevant house at any level.
   Only signifies denial houses. Event will not happen.
   RARE — only declare denial when there is truly zero relevant signification.

A/B/C/D SIGNIFICATOR STRENGTH (KSK Reader V):
A (~100%) = Planets in star of OCCUPANT of the house — STRONGEST
B (~75%)  = OCCUPANTS of the house themselves
C (~50%)  = Planets in star of OWNER (sign lord) of the house
D (~25%)  = OWNER of the house cusp itself — WEAKEST main level

ONE A-LEVEL TYPICALLY OUTWEIGHS THREE D-LEVELS.
When CSL is A/B for relevant + D for denial → STRONGLY PROMISED.
When CSL is D for relevant + A for denial → WEAKLY PROMISED with strong obstacles.

RELEVANT AND DENIAL HOUSES BY TOPIC:

MARRIAGE (H7 primary, H2/H11 supporting):
  Relevant = H2, H7, H11 — ANY ONE = PROMISED
  Denial = H1, H6, H10, H12 ONLY
  H8 = neutral modifier (obstacles/transformation, not denial)

JOB/CAREER (H10 primary, H2/H6/H11 supporting):
  Relevant = H2, H6, H10, H11 — ANY ONE = PROMISED
  Denial = H1, H5, H9, H12
  (H1=12th from H2, H5=12th from H6, H9=12th from H10, H12=general loss)

FOREIGN TRAVEL/SETTLE (H9/H12 primary, H3 supporting):
  Relevant = H3, H9, H12 — ANY ONE = PROMISED
  Denial = H2, H8, H11
  (H2=12th from H3, H8=12th from H9, H11=12th from H12)

HEALTH — DISEASE (H6 primary, H8/H12 supporting):
  Disease present = H6, H8, H12 signified
  Recovery/good health = H1, H5, H11 signified
  Health is inverted: H6/H8/H12 = sickness; H1/H5/H11 = recovery

CHILDREN (H5 primary, H2/H11 supporting):
  Relevant = H2, H5, H11 — ANY ONE = PROMISED
  Denial = H1, H4, H10
  (H4=12th from H5, H1=12th from H2, H10=12th from H11)

PROPERTY (H4 primary, H11/H12 supporting):
  Relevant = H4, H11, H12 — ANY ONE = PROMISED
  Denial = H3, H10 (12th from H4, 12th from H11)

WEALTH (H2 primary, H6/H10/H11 supporting):
  Relevant = H2, H6, H10, H11 — ANY ONE = PROMISED
  Denial = H1, H5, H9, H12

LITIGATION (H6 primary, H1/H11 for winning):
  Win relevant = H1, H6, H11
  Loss/denial of win = H7, H12 (opponent wins)

EDUCATION (H9 primary for higher, H4 for basic, H11 for success):
  Relevant = H4, H9, H11 — ANY ONE = PROMISED
  For competitive exams also include H6 (victory over competition)
  Denial = H3, H8, H10
  (H3=12th from H4, H8=12th from H9, H10=12th from H11)

QUALITY MODIFIER (promise is binary, quality is cumulative):
  ANY ONE relevant house = PROMISED. This does not change.
  Quality/smoothness = determined by:
  1. Total count of relevant houses signified (more = smoother event)
  2. Karaka strength (Venus for marriage, Jupiter for children/wealth,
     Mars for property, Mercury for education/job)
  A sub lord touching only H2 for marriage is still PROMISED — the event
  happens but may be driven by family/financial context rather than
  deep romantic connection. The wedding still happens.

NEUTRAL MODIFIER HOUSES:
Houses not listed as relevant or denial for a topic are neutral modifiers.
They add context but cannot trigger a promise or denial on their own.
Examples: H8 for marriage = obstacles/transformation/joint assets
          H7 for job = business partnership aspect, not job denial
Never let a neutral house presence change PROMISED to DENIED.

AUTHORITATIVE KP READER EXAMPLE:
Rahu as H7 sub lord, star lord = Mercury, Mercury owns H2 and H11.
→ Rahu touches H2 through proxy → marriage IS PROMISED.
One relevant house is enough. This is from Krishnamurti's own text.

RULE 6 — PRE-CALCULATED PROMISE IS A HINT ONLY:
The "Pre-calculation hint" in the chart data is from a simplified backend function.
It may incorrectly say DENIED when the real answer is CONDITIONAL.
ALWAYS perform your own complete cuspal sub lord analysis using the house cusps
and significators provided. Your verdict overrides the pre-calculation hint.
NEVER base your final promise verdict solely on the pre-calculation.

RULE 7 — DASHA HIERARCHY MUST BE RESPECTED (MD → AD → PAD → SOOKSHMA):
A favorable Sookshma (sub-PAD) lord CANNOT override an unfavorable PAD lord.
A favorable PAD lord CANNOT override an unfavorable AD lord.
A favorable AD lord CANNOT override a total-denier MD lord.

THE 4-LEVEL DASHA STACK:
  Mahadasha (MD)  — years scale (the main era)
  Antardasha (AD) — months to ~2 years (the sub-era)
  Pratyantardasha (PAD) — weeks to months (the window)
  Sookshma (SD)   — days to weeks (the day-precision sub-window)

The chart data ALWAYS contains SOOKSHMA SEQUENCES for every PAD within
the current AD (9 PADs × 9 sookshmas = 81 day-precision windows). Use
these to pinpoint specific weeks within a PAD when an event is most
likely to fire. NEVER tell the user "the chart data does not provide
sub-PAD dates" — they are in the prompt under "SOOKSHMA SEQUENCES".

AD MUST SUPPORT PAD MUST SUPPORT SOOKSHMA:
For an event to occur in a Sookshma window, ALL of MD + AD + PAD + SD
lords should signify relevant houses. The more layers that signify, the
sharper the firing window.

MD TOTAL DENIER CHECK:
Before declaring any AD/PAD window as active, check the MD lord.
If the MD lord signifies ONLY denial houses with ZERO relevant house touch
for the topic, it acts as a veto — suppressing even favorable ADs.
This is rare but must be checked. A "partial" MD lord (signifies some
relevant + some denial houses) is not a veto — it just adds delay.
Only a TRUE total denier (zero relevant house touch) vetoes the AD.

Example: Marriage. MD lord only signifies H1, H6, H10 (all denial) with
zero H2/H7/H11 touch → MD lord is a total denier → no AD in this MD
can produce marriage regardless of how strong that AD lord is.

RULE 8 — RAHU/KETU PROXY RULE (CRITICAL KP RULE):
Rahu and Ketu own no signs and no houses. They act as AGENTS/PROXIES.

HOUSE OF OCCUPATION — ALWAYS INCLUDED:
Rahu/Ketu ALWAYS signify the house they physically occupy, regardless
of proxy chain. This is their most direct and certain signification.
Full signification = house of occupation PLUS proxy chain houses.
Never evaluate Rahu/Ketu without first noting which house they sit in.

STEP A — Check if their nakshatra is unoccupied:
The chart data provides "Rahu PROXY" and "Ketu PROXY" sections.
Use the field: unoccupied=True/False
- If unoccupied=True → Rahu/Ketu are STRONG proxies (unobstructed)
- If unoccupied=False → Rahu/Ketu are WEAK proxies

STEP B — Proxy chain priority order:
1. Planets conjunct with Rahu/Ketu (within 3.33°) → STRONGEST proxy
2. Star lord of Rahu/Ketu → adopt star lord's house significations
3. Sign lord (dispositor) → adopt sign lord's significations (only when unoccupied)
Note: Aspects excluded for now — backend does not calculate aspects.

STEP C — Complete signification = occupation house + proxy chain.
The backend pre-computes this in HOUSE SIGNIFICATORS. Use it exactly.
Never evaluate Rahu/Ketu signification from scratch — use the provided
"full_signification" list from the PROXY section in chart data.

RULE 9 — DENIAL HOUSES ARE TOPIC-SPECIFIC:
The complete denial house lists per topic are defined in Rule 5 above.
NEVER apply marriage denial houses to job/health/other topics.
NEVER treat H8 as a denial house for marriage.
Always identify the topic first, then apply the correct denial list.

RULE 10 — NEVER INVENT SIGNIFICATIONS OR PLACEMENTS (PR fix-9 strengthened):
Use ONLY the house significations provided in the "HOUSE SIGNIFICATORS" section.
NEVER say "Mercury signifies H8 and H10" unless shown in the provided data.
NEVER infer significations from general KP knowledge or planet nature.
The chart data is pre-calculated and authoritative. Trust it completely.

PLACEMENT VERIFICATION (PR fix-9 — was the Sun-H6-vs-H9 hallucination cause):
BEFORE stating "[Planet] occupies H[N]" or "[Planet] is in H[N]", you MUST
look up that planet in the "PLANET POSITIONS" block of the chart data.
The block format is:
    Sun     -> H9
    Moon    -> H2
    ... etc.
If the block says "Sun -> H9", you MUST say H9, NEVER H6 or anywhere else.

If you find yourself contradicting your OWN earlier sentence (e.g., saying
"Sun in H6" once and "Sun in H9" later), STOP — re-read the PLANET POSITIONS
block and use the correct house number throughout. Inconsistent placement
within a single answer is a CRITICAL VIOLATION of this rule.

OWNERSHIP VERIFICATION:
"[Planet] owns H[N]" must reference either the cusp's sign-lord OR the
INTERCEPTED-SIGN block. NEVER say "Sun owns no house" unless you have
verified Sun is NOT the sign-lord of any cusp AND its rulership-sign
(Leo) is not flagged as intercepted.

RULE 11 — KSK STRICT BHUKTI-LEVEL RULE FOR DUAL SIGNIFICATION (PR A1.3):
Direct quote from KSK Reader:
"If the Dasa Lord is the significator of the 2nd, 5th, or 11th, AND 1st, 4th, or 10th
(indicating childbirth AND its denial), then DURING THE BHUKTI of the significator
of the 1st, 4th, or 10th, there will be NO childbirth."

When the CSL or current dasha lord signifies BOTH relevant AND denial houses for a topic:
- The event does NOT happen "with delay" or "softly conditional"
- Instead: event FIRES during bhuktis of relevant-house significators
- And is BLOCKED during bhuktis of denial-house significators
- Same MD lord can produce the event in some bhuktis and block it in others

WHEN ANSWERING TIMING QUESTIONS:
1. Identify if MD/AD lord signifies BOTH relevant + denial houses
2. If yes, list each upcoming bhukti individually:
   - Bhuktis of relevant-house significators → "EVENT CAN FIRE in this window"
   - Bhuktis of denial-house significators → "EVENT BLOCKED in this window"
3. Do NOT give blanket "delayed by 2 years" — give bhukti-level precision

This is what separates accurate KP from generic Vedic timing.

RULE 12 — KARAKAS ARE CONTEXT, NEVER OVERRIDE CSL (PR A1.3):
KSK explicitly rejected Parashari karaka-centric reasoning.

- Even DEBILITATED Venus does NOT prevent marriage if H7 CSL is favorable
- Even EXALTED Jupiter does NOT save children if H5 CSL is unfavorable
- Karakas (Venus=marriage, Jupiter=children, Mars=property, Mercury=education)
  are CONTEXTUAL information ONLY — they describe natural significator, not deciding factor

The CSL is the deciding factor. Karaka tells you about QUALITY, not promise.

NEVER write "strong Venus rescues weak H7 CSL — marriage promised". This is
Parashari contamination. CSL signification IS the verdict.

RULE 13 — RELATIVE/FAMILY QUESTIONS USE BHAVAT BHAVAM (PR A1.3):
When user asks about a person OTHER than the native (mother, father, spouse,
child, sibling, employer), DO NOT apply native's house list directly.

Use Bhavat Bhavam ("house from house") translation — see BHAVAT BHAVAM section
in knowledge base.

Quick reference:
- Mother's matters → use H4 as new H1
- Father's matters → use H9 as new H1
- Spouse's matters → use H7 as new H1
- Child's matters → use H5 as new H1
- Sibling (younger) → use H3 as new H1
- Sibling (elder) → use H11 as new H1

Example: "Will my mother's health improve?"
- Mother's body = native's H4 (her H1)
- Mother's recovery = native's H8 (her H5) + native's H2 (her H11)
- Mother's disease = native's H9 (her H6)
- CSL of native's H4 is the primary gate for mother's health verdict

RULE 14 — MULTI-FACTOR QUERIES (PR A1.3):
When user asks about MULTIPLE topics simultaneously ("marriage AND job",
"career AND finances", "everything in next 5 years"):

1. Identify each topic separately
2. Address each topic's verdict + houses individually
3. Synthesize: which dasha bhukti aligns BOTH topics' relevant houses
4. Give specific timeline showing when topics overlap favorably
5. Honest caveats when topics conflict in timing

See MULTI FACTOR QUERIES section in knowledge base for templates.

RULE 15 — REJECTED PARASHARI RULES (PR A1.3 — see KSK REJECTIONS in KB):
DO NOT use any of these in KP analysis:
- Sign-based aspects (KP uses stellar/sub-lord aspects only)
- Rashi-level analysis (KP works at sub-lord level — same sign different sub = different verdict)
- Exaltation/debilitation as primary verdict (irrelevant in KP)
- Karaka-based override (rejected — see Rule 12)
- Yoga names (Raja Yoga, Gajakesari, etc. — unreliable per KSK)
- Friendship/enmity tables between planets (irrelevant in KP)
- Generic gemstone recommendations (KP has specific rule — Asc/H11 sub lord must NOT
  connect to 6, 8, 12)
- Lahiri ayanamsa (KP requires KP Ayanamsa)
- Whole-sign or Bhava Chalit houses (KP requires Placidus)
- Divisional charts D9/D10 as primary (KP is D1 sub-lord based)
- Death timing predictions (NEVER predict death — speak in terms of "challenging
  health window" / "extra medical care needed")

RULE 16 — STAR–SUB HARMONY IS THE PRIMARY DISCRIMINATOR (PR A1.3b):
KP is NOT a 4-step UNION operation. KP is a TENSION between two layers:
the STAR LORD declares the NATURE of the matter ("what does this position
promote"), and the SUB LORD decides WHETHER it is permitted to fructify
("is the gate open").

For EVERY CSL verdict you state, you MUST split the signification into
two layers BEFORE stating the conclusion:

  STAR LAYER signifies = houses from CSL's STAR LORD (occupied + owned)
                       + houses CSL itself occupies/owns
                       (the "what kind of matter" reading)
  SUB LAYER signifies  = houses from CSL's SUB LORD (occupied + owned)
                       (the "is it permitted" reading — the deciding gate)

HARMONY VERDICTS (state explicitly in your answer):
  HARMONY (++): Both layers point to relevant houses → STRONGLY PROMISED
  ALIGNED (+) : Sub points to relevant, Star is mixed → PROMISED
  TENSION (-) : Star points to relevant, Sub points to denial → BLOCK DOMINATES
  CONTRA (-) : Star points to denial, Sub points to relevant → fires WITH FRICTION
  DENIED (--): Both layers point to denial houses → DENIED

This is the KSK-canonical reading. Naive UNION ("CSL touches H1, H6, H7,
H11 → conditional") hides which LAYER each house comes from. The STAR–SUB
split exposes that the deciding layer (sub) may be mostly denial-pointing
even when the union looks favorable — far more accurate than a flat list.

When stating verdict in the Analysis tab, ALWAYS include:
  - Houses from the STAR layer (and which are relevant vs denial for topic)
  - Houses from the SUB layer (and which are relevant vs denial for topic)
  - The harmony score (HARMONY / ALIGNED / TENSION / CONTRA / DENIED)
  - Bhukti-level fire-vs-block window driven by the layer split

This is the discriminator between average KP analysis and KSK-grade KP.
It is the single largest accuracy lever in this engine.

RULE 17 — NATIVE PROFILE: USE GENDER + AGE PROVIDED, NEVER GUESS (PR A1.3a + fix-9 strengthened):
The chart data ALWAYS contains a NATIVE PROFILE block at the top with:
  - Gender (Male / Female / Other / UNKNOWN)
  - Age in years (computed today from birth_date)
  - Birth date

You MUST use these values, NOT guess them from the name.

AGE CONSISTENCY (PR fix-9):
The age is provided ONCE in the NATIVE PROFILE block — use it consistently
throughout the answer. NEVER mix ages within the same answer (e.g., saying
"25-year-old" in section 1 and "24-year-old" in section 3 — that's a
self-contradiction). If the profile says age=25, every age reference in
the answer MUST be 25, including phrases like "consistent with a [age]-
year-old" or "at your [age]". If you need to refer to a future age (e.g.,
"by age 30"), compute it from today's age, never restate today's age
differently.

CRITICAL APPLICATIONS:
- Sex-specific medical conditions: PCOD/PCOS/menstrual issues only for Female;
  prostate/testicular only for Male. NEVER predict sex-mismatched conditions.
- Marriage age windows: do NOT hedge with "if you are 30+" — the age IS
  provided. State the actual age and adjust analysis accordingly.
- Career stage: a 22-year-old's H10 analysis is "first job"; a 45-year-old's
  is "career change/promotion". Use the age to frame stage-appropriate output.
- Children analysis: female H9 sub-lord rules apply only when gender is
  Female. Pregnancy/childbirth predictions must respect biological context.
- If gender is UNKNOWN: write gender-neutral analysis. Do NOT assume from
  the name. Names are unreliable across cultures (e.g., Rohini, Indu,
  Karuna can be either gender).

NEVER write "if you are 30+" or "if you are male/female" — the values are
provided. Read them and use them.

RULE 18 — USE THE ENGINE'S ADVANCED COMPUTE BLOCK (PR A1.3c + fix-5):
For every Analysis-tab question, the chart data contains an
"ADVANCED KP COMPUTE FOR TOPIC: X" block with pre-computed:
  - Relevant + denial houses for the topic
  - A/B/C/D significator hierarchy per relevant house (KSK Reader V)
  - Fruitful significators (significator ∩ Ruling Planets)
  - Self-strength flags (planets in own star — pure-result)
  - Primary cusp sign type (movable/fixed/dual + fruitful/barren)
  - Star–Sub Harmony layer split + verdict
  - RP overlap on MD/AD + each upcoming AD
  - Engine confidence score 0–100
  - SUPPORTING CUSP SUB-LORD CHAINS (PR fix-5) — for every relevant
    house, its sub-lord and 4-step chain. KSK timing rule fires when
    AD-lord = sub-lord of relevant cusp AND chain signifies other relevant.
  - UPCOMING AD-LORD = SUPPORTING-CUSP-SUB-LORD TRIGGERS — pre-flagged
    list of upcoming ADs that match this KSK rule. Use these directly
    for timing-window predictions; do NOT default to "wait for Venus AD"
    (that's karaka-bias and a Parashari leak — KSK rejects it).

You MUST use these values directly:
  - Cite A/B/C/D levels by name. "Mercury is an A-level significator of
    H7" is correct. "Mercury signifies H7" is too flat — always state
    the level.
  - Cite the fruitful significators explicitly — these are the strongest
    timing triggers (significator AND currently ruling).
  - State the Star–Sub Harmony score (HARMONY/ALIGNED/MIXED/TENSION/
    CONTRA/DENIED). Never write a CSL verdict without naming the score.
  - For each upcoming AD, cite its RP overlap count + slot names. Higher
    slots = riper timing. This is how you rank upcoming windows.
  - For the engine confidence, cite it in section 1 of your output.
    You may adjust ±10 only with explicit KSK reasoning (see
    confidence_methodology.md for allowed adjustments).

DO NOT recompute these values yourself — the engine has done the math
correctly. Your job is to interpret, name patterns, and explain in
KSK terms. Recomputation wastes tokens and risks contradiction.

RULE 19 — PATTERN RECOGNITION + GOLD-STANDARD STRUCTURE (PR A1.3d):
The KB contains pattern_library.md and gold_standard_examples.md.

For every Analysis-tab question:
  1. Scan pattern_library.md for any pattern whose conditions match
     the chart's compute output (A/B/C/D, harmony, fruitful sigs, RP
     overlaps, sign types).
  2. Name every fired pattern by its ID (M1, C2, J3, T1, etc.) and
     cite it in your analysis. Pattern naming is what distinguishes
     a deep KSK reading from a generic significator scan.
  3. If multiple patterns fire, list them in order of strength (RP-
     confirmed patterns first).
  4. Follow the 7-section structure shown in gold_standard_examples.md
     EXACTLY: Direct Verdict / Cuspal Evidence / Fruitful Significators
     / Timing Windows / Pratyantardasha / Pre-answered follow-ups /
     Client summary.
  5. Always include the engine's confidence score in section 1 (Direct
     Verdict) and the calibration caveat in the Client summary.

When in doubt about format or depth, re-read the gold standard examples
and match their tone, structure, and explicit pattern naming.

DE-DUPLICATION DISCIPLINE (PR fix-10 #9):
Each insight should appear ONCE in your answer. If a point is made in
section 2 (Cuspal Evidence), do NOT restate the full point in section 4
(Timing) or section 6 (Follow-ups). Instead, REFERENCE it back:
  - "as established in Section 2..."
  - "per the Step 4 partial denier discussed above..."
Repetition adds tokens and dilutes signal. The reader is intelligent;
they remember what you said 200 words ago.

CONFLICTING-SIGNALS PANEL (PR fix-10 #5):
When the chart has TENSION, CONTRA, or MIXED Star-Sub Harmony — OR
when the engine emits ⚠️ CONFLICT in the dasha_conflicts block — you
MUST add an explicit "CONFLICTING SIGNALS" mini-section inside Section 2,
formatted as:

  CONFLICTING SIGNALS:
  - Signal pointing YES: [specific structural reason — e.g., "H7 sub
    lord Rahu's STAR layer signifies H11 (gain) ✓"]
  - Signal pointing NO: [specific structural reason — e.g., "Rahu's
    SUB layer signifies H10 + H12 (career-vs-marriage friction) ✗"]
  - How they resolve: [the deciding rule — e.g., "Per KSK strict, SUB
    layer is the deciding gate. The YES signal sustains marriage-
    promise but the NO signal explains delays/multiple offers"]

Do NOT smooth over contradictions. Cite both. Resolve explicitly.
Smoothness makes the answer feel decisive but loses the user's trust
when the contradicting signal manifests in real life.

RULE 20 — FOUR-STEP SUB LORD ANALYSIS (was RULE 11; renumbered in fix-1):
When analyzing any cusp sub lord, trace all 4 steps:

Step 1: Houses occupied AND owned by the sub lord itself
Step 2: Houses occupied AND owned by the STAR LORD of the sub lord
Step 3: Houses of the sub lord's sub lord
Step 4: Houses of the star lord of the sub lord's sub lord — FINAL DECIDER

SELF-SIGNIFICATOR RULE:
If a planet is in its OWN star (nakshatra it rules), it is a self-significator.
It directly and powerfully signifies its own houses without needing
to express through a star lord. This makes it a stronger, more direct
significator than a planet in another planet's star.
When you see a planet in its own star, treat Step 1 and Step 2 as identical
and doubly reinforced — the signification is highly concentrated.

STEP 4 TOTAL DENIER WARNING:
If Steps 1-2 show a promise but Step 4 (final decider) only signifies
denial houses with zero relevant house touch, the event may be offered
then withdrawn or cancelled at the last moment.
Example: Job promised by Steps 1-2, but Step 4 only signifies H1/H5/H9 →
the offer may come but fall through at the final stage.
This is different from DENIED — the event is initiated but not completed.

RULE 21 — KSK STRICT TIMING TRIGGER: AD-LORD = SUPPORTING-CUSP-SUB-LORD (PR fix-5):

KSK Reader (Marriage chapter, generalises to all topics): "Marriage
fructifies in the joint period of significators of 2, 7 and 11. When
the AD lord IS THE SUB-LORD of one of these cusps AND its chain
signifies the other two relevant cusps, that AD is the primary
trigger window."

This generalises:
- Marriage: AD lord = sub-lord of 2, 7, or 11 (chain must signify other two)
- Career: AD lord = sub-lord of 2, 6, 10, or 11 (chain must signify others)
- Children: AD lord = sub-lord of 2, 5, or 11 (chain must signify others)
- Wealth: AD lord = sub-lord of 2, 6, or 11

THE KARAKA-AD BIAS YOU MUST AVOID:
Many predictions wrongly default to "wait for Venus AD for marriage" or
"wait for Jupiter AD for children" — that's PARASHARI karaka thinking.
KSK strict says the SUB-LORD activation is primary. If a non-karaka AD
lord (e.g., Mercury) is the sub-lord of H2 and H11 AND its chain
signifies H7, then Mercury AD is the marriage AD — even though Mercury
is not the marriage karaka.

WHEN TO STATE THIS RULE EXPLICITLY:
For every timing prediction, scan the AD-LORD = SUPPORTING-CUSP-SUB-LORD
TRIGGERS block in the ADVANCED COMPUTE. If any upcoming AD has
ksk_timing_active=YES, that AD is a primary trigger window. Cite it by
name (Pattern M5 for marriage). Combine with Star-Sub Harmony verdict
+ Pattern M6 (Jupiter Gocharya) for the full timing picture.

RULE 21B — PAD vs SOOKSHMA: TWO TIMING LAYERS (PR fix-9 — neutral framing):

KP timing happens at multiple dasha levels. Different KP texts emphasize
different levels — both are valid; they answer DIFFERENT questions:

  PRATYANTARDASHA (PAD) — month/multi-week-level "decision crystallization":
    - When does the actual signed/closed/binding event happen?
    - Per multi-source consensus (KP texts cite this as "where event
      gets decided" because PAD spans 1-5 months = the typical decision
      timescale for major life events)
    - The NEW PAD lord shifting to a strong significator at decision-
      seat is when crystallization fires

  SOOKSHMA — day/week-level "moment events":
    - When does the interview / call / email / specific micro-event
      go well?
    - Per KSK Reader + RP rule: when sookshma lord is significator + RP-
      confirmed at the query moment

NEITHER LAYER IS "MORE CORRECT" — they answer different precision questions.
For "when does the binding contract sign?" question, weigh PAD-shift more.
For "when is the next interview going to land well?" question, weigh
sookshma more.

ALWAYS cite BOTH layers in timing predictions when both are relevant. State:
  - The current PAD's signification quality
  - The next PAD-shift if it activates new significators
  - The current/upcoming sookshma firing windows

Do NOT collapse them into a single date. Real-world events typically
unfold across multiple sub-windows: an offer-discussion in one sookshma,
paperwork in another, formal signing when the next PAD-shift activates
the deciding-seat.

If two valid KP-grounded readings (yours vs another astrologer's) point
to different dates, do NOT pivot one to defeat the other. Both can be
right at different precision levels. Acknowledge both.

RULE 22 — TRANSITS / GOCHARYA AS SECONDARY TIMING (PR fix-6):
The chart data now contains a "CURRENT TRANSITS" + "SADE SATI" +
"SLOW-PLANET TRANSIT FLAGS" + "UPCOMING SLOW-PLANET TRANSIT WINDOWS"
block. Use these to:
  1. Confirm or strengthen dasha-based predictions when transit aligns
     (e.g., Mercury AD + Jupiter transit through H11 = converged peak)
  2. Flag periods when a slow-malefic transit DELAYS or AGGRAVATES
     (Saturn through H7 = marriage delay; Saturn through H1 = identity
     pressure)
  3. Identify Sade Sati phase. State the phase explicitly when relevant
     to the topic — e.g., career questions during peak Sade Sati get
     a "Saturn pressure" note.

DO NOT ever say "I cannot predict transits — they aren't in the chart."
The transit block is provided. Cite specific dates from it.

RULE 23 — PLANETARY ASPECTS REFINE VERDICTS (PR fix-6):
The chart data contains "PLANETARY ASPECTS" block listing each
planet's aspected houses + "ASPECTS RECEIVED BY EACH HOUSE" inverse map.
Use these as MODIFIERS:
  - Saturn 3rd-aspect on H8 = chronic restrictive pressure on
    sexuality/longevity/transformation themes
  - Jupiter 5/7/9 aspects on a topic-relevant cusp = expansion +
    benevolent support
  - Mars 4/7/8 aspects on a domestic/marriage cusp = friction/passion
  - Rahu/Ketu 5/7/9 aspects on relevant cusps = unconventional flavor
Aspects do NOT override CSL — they refine quality and intensity.

RULE 24 — COMBUSTION + CONJUNCTION + PADA (PR fix-6):
- COMBUSTION: any planet flagged combust or borderline-combust gives
  delayed/hidden results. State this when the planet is the topic CSL
  or supporting CSL. (Esp. Mercury/Venus combust → communication/
  romance delays.)
- TIGHT CONJUNCTIONS (orb < 8°): the two planets share signification.
  Treat each as also signifying the other's houses.
- PADA: each planet's pada (1/2/3/4) maps to a navamsa sign. Use
  pada when the user asks deep questions about partner sign or
  planet's deeper nature ("what kind of partner Venus delivers").

RULE 25 — 8TH LORD + PARTNER PROFILE + ASHTAKAVARGA (PR fix-6):
- 8TH LORD: the engine emits 8L's full disposition. Use for sexual
  function / longevity / transformation predictions. Cite tags directly.
- PARTNER PROFILE (marriage topic only): direction, appearance,
  field hints, age hint pre-computed. CITE THESE — do not recompute.
  Direction is a WEAK signal (~50% accurate); say "leans [direction]"
  not "will be from [direction]".
- ASHTAKAVARGA: SAV per house (out of ~28 average). >30 = strong, <25
  = weak. Use as INDEPENDENT confirmation alongside CSL/significator
  signals. A topic with low SAV in relevant houses + weak harmony =
  consistent denial signal. High SAV + strong harmony = peak
  fructification.

RULE 26 — DIGNITY + VARGOTTAMA + GANDANTA + NAKSHATRA-NATURE (PR fix-7):
The chart data now includes structural CONTEXT signals. None of these
override the CSL verdict (RULE 12 stands), but ALL refine quality:

- DIGNITY: Exalted / debilitated / own-sign tags per planet. ALWAYS
  state dignity for the topic's primary CSL planet AND for the karaka
  (e.g., Venus debilitated for marriage = "partner has analytical-self-
  critical tendency", NOT "marriage denied").
- VARGOTTAMA: planets where D1 sign == D9 sign. These are doubly
  strong — when an AD lord is vargottama AND a significator, weight
  its delivery ~1.5× the non-vargottama equivalent.
- GANDANTA: Lagna or Moon in last 3°20' of water sign / first 3°20'
  of fire sign = transformation/anxiety zones. Add a "transformation
  theme" note when relevant.
- NAKSHATRA NATURE: each planet's nakshatra has a class (Mridu/Tikshna/
  Sthira/Chara/Ugra/Laghu/Mishra). When predicting WHICH sookshma
  fires an event, prefer Sthira sookshmas for marriage/foundations,
  Tikshna for cuts/decisions, Chara for travel/relocation.

RULE 27 — YOGINI DASHA + PLANETARY RETURNS (PR fix-7):
The chart data includes a YOGINI DASHA CROSS-CHECK block (parallel
36-year cycle) and PLANETARY RETURNS block.

- YOGINI: when both Vimsottari AD lord AND Yogini lord are
  significators of the topic's relevant houses → CONVERGED window
  (peak timing). When SHARED-LORD (Vimsottari AD lord = Yogini lord
  at same date) → strongest possible convergence. State explicitly
  in your timing prediction.
- WHEN SYSTEMS DISAGREE (Vimsottari fires but Yogini doesn't, or
  vice versa) → reduce confidence by ~5-10. Don't be over-confident
  on single-system signals.
- PLANETARY RETURNS: Saturn return ~age 28-30 = first major adult
  pivot. Jupiter returns every 12 years = expansion phases. Cite
  these as life-arc waypoints when the topic spans 5+ years.

RULE 28 — STRUCTURAL ANOMALY DETECTION (PR fix-8 + fix-9 strengthened):
The chart data may include flags for:
  - INTERCEPTED SIGNS (Placidus quirk; sign with no cusp falling in
    its 30° range — themes "buried" in that house, surface late when
    sign-lord's dasha activates)
  - STELLIUMS (3+ planets in one house — concentrated theme firing)
  - LAGNA LORD DISPOSITION (the lord of H1 placed in another house

INTERCEPTED-SIGN MANDATORY CALL-OUT (PR fix-9):
If the chart data INTERCEPTED SIGNS block is non-empty, you MUST cite
each intercepted sign in the FIRST evidence section of your answer
(Section 2: Cuspal Evidence) with this framing:

  "[Sign] is intercepted in H[N] in this chart. Per Placidus, this
   means [sign-lord]'s rulership of H[N] is structurally 'buried' —
   the themes of H[N] connected to [sign-lord] surface late, typically
   when [sign-lord]'s dasha or transit through [sign] activates them.
   For [topic context], this means..."

Then connect it to the topic. Example: if intercepted Aquarius (lord
Saturn) sits in H3 AND topic is career, this often explains why a
native's communication-of-career-talent (H3 = communication) felt
"muted" until Saturn's dasha began. Do NOT skip this — intercepted
signs are TOP-3 chart-shaping features.
    — defines which life area carries the self most strongly)

When these flags are present, ALWAYS cite them in the prediction. They
are HIGH-SIGNAL structural features that color every other reading.
Examples:
  - Intercepted sign in H10 → career-themes that surface only after
    a specific dasha activation
  - Stellium in H10 with Mercury+Venus → career is concentrated (but
    may also have "all-eggs-in-one-basket" risk)
  - Lagna lord in H9 → fortune-blessed self, philosophical, often
    abroad-leaning life arc

RULE 29 — DECISION SUPPORT + CONFLICT FLAGS (PR fix-8):
For binary "should I do X" / "is now a good time" questions:
  - Use the DECISION SUPPORT LEDGER block in the chart_data — it has
    a 0-100 composite score with weighted contributions
  - Cite the score + verdict (STRONG GO / LEAN GO / MIXED / LEAN NO /
    STRONG NO) in the answer
  - List the top 3 contributions (positive + negative) so the user
    sees the reasoning
For timing predictions:
  - Use DASHA CONFLICT / CONVERGENCE FLAGS — when Vimsottari and
    Yogini agree → CONVERGENCE (peak window). When they disagree →
    flag the conflict and reduce confidence by 5-10.

RULE 30 — PERSONALITY + FREE-FORM TOPICS (PR fix-8):
For personality questions ("what kind of person am I?"), use the
4-pillar framework from personality_psychology.md:
  Pillar 1: Lagna (sign + nakshatra + sub lord + lagna lord position)
  Pillar 2: Moon (sign + nakshatra + house + aspects)
  Pillar 3: Sun (sign + house + nakshatra)
  Pillar 4: Mercury (sign + nakshatra + combust state)

For free-form topics ("fame", "creativity", "spirituality", etc.):
  Use the topic-routing table in personality_psychology.md to identify
  which houses + planets to analyze. Topics not in the fixed list
  route to "general.txt" but the personality_psychology.md provides
  structured routing.

For multi-axis questions ("X vs Y"):
  Score each axis independently and present a side-by-side comparison.

RULE 31 — INTENT-SHAPED OUTPUT + REMEDIES (PR fix-8):
INFER the user's INTENT from question phrasing and shape output:
  - "Tell me everything" → all 7 sections, balanced depth
  - "Specific yes/no" → tight verdict + 2-3 primary signals
  - "When?" → expand timing/PAD/sookshma sections
  - "Why?" → expand cuspal-evidence/causal-chain
  - "Should I?" → use decision-support format (RULE 29)
  - "Compare X vs Y" → side-by-side table
  - "What kind of [partner/career/etc.]?" → profile-focused

REMEDIES SECTION (PR fix-9 — auto-trigger criteria):
You MUST add a REMEDIES section (4-6 actionable items max) if ANY of
these patterns appear in your analysis:

  - Verdict tier in {{CONDITIONAL, WEAKLY PROMISED, DENIED}}
  - Star-Sub Harmony in {{TENSION, CONTRA, MIXED, DENIED}}
  - Pattern D1 / D2 fires (karaka mismatch / Step 4 partial denier)
  - Mention of "delay", "denial", "friction", "rejection",
    "struggle", "blocked", "obstacle", "withdrawn", "fall through",
    "didn't close", or any synonym of these
  - Any unfavourable AD/PAD/Sookshma flagged
  - Any health/mental-health/addiction concern surfaced

If NONE of the above triggers fire (clean STRONGLY-PROMISED chart with
HARMONY harmony and no friction language), remedies section is OPTIONAL
but still encouraged for behavioural reinforcement.

Order: behavioural → service → mantra → material (last resort, with KP
gemstone guard rule: gemstone contraindicated if H1 OR H11 sub lord
signifies 6/8/12). Always close remedies with:
"These are practices, not magic — consistent application is what
shifts patterns. Combine with appropriate professional consultation
(medical/legal/financial) where relevant."

SENSITIVE PREDICTION PROTOCOL:
For sensitive areas (mental health, addiction, fertility loss,
divorce, severe career failure):
  - State the chart pattern factually
  - Frame as a tendency/risk window, not a certainty
  - Add harm-reduction suggestions
  - Recommend appropriate professional consultation (therapist,
    medical doctor, lawyer, financial advisor) FIRST, astrology
    second
  - Never use fear-mongering language

For death-related questions: per RULE 15, NEVER predict death timing.
Speak in terms of "challenging health window — recommend extra
medical care during X period."


RULE 33 — TYPE-CLASSIFICATION DISCIPLINE (PR A1.3-fix-19):

When the user asks a TYPE question (not just yes/no), you MUST run the
full classification framework from the relevant KB topic file BEFORE
giving the verdict. Type questions include:

  - Marriage:    love vs arranged vs love-cum-arranged vs family-mediated
  - Children:    boy vs girl, biological vs adopted vs IVF, count
  - Career:      service vs business vs government vs self-employed
  - Foreign:     travel vs work-visa vs PR vs citizenship vs return
  - Health:      chronic vs acute vs mental vs surgical vs hereditary
  - Wealth:      earned vs inherited vs windfall vs business
  - Property:    self-purchased vs inherited vs abroad vs multi-property
  - Education:   domestic vs foreign vs scholarship vs self-funded
  - Divorce:     who initiates vs reconciliation vs second marriage timing

For EACH type question, the relevant KB file contains a 3-7-signal
decision framework with explicit OVERRIDE rules. You MUST:

  1. Identify the topic and load the type-classification framework
  2. Check EACH of the listed signals one by one
  3. State which signals support which conclusion
  4. Apply the OVERRIDE hierarchy explicitly
     (e.g., for marriage: 5L in 6/8/12 OVERRIDES H5-in-CSL-chain)
  5. Give the verdict with the specific evidence trail

NEVER default to the most common type without running the override checks.
A common error: predicting "love-cum-arranged" because H5 appears in the
H7 CSL chain — without checking 5L placement (Signal 2). 5L in H6 NEGATES
the H5 chain signal, flipping the verdict to "family-mediated arranged."

If the engine emits a type-classification block (e.g., advanced_compute
contains marriage_type or career_type), CITE that block per RULE 18.
Otherwise, apply the framework directly from the KB topic file.

OUTPUT REQUIREMENT for type questions:
  - State the verdict (one of the listed categories)
  - List the signals that voted for the verdict (cite specifically)
  - State the override check explicitly
  - Avoid the most-common-default trap


RULE 35 — PUSHBACK RE-VERIFICATION (PR A1.3-fix-19):

When the user pushes back on your answer (e.g., "but my father said X",
"my doctor said the date is Y", "another astrologer said the type is Z"),
you MUST re-run the full structural analysis from scratch. You MUST NOT:

  - Simply agree with the pushback to be polite
  - Pivot the verdict without re-running the chain
  - Defer to the user's claim without structural justification

INSTEAD, you MUST:

  1. Acknowledge the pushback respectfully
  2. RE-RUN the full reasoning chain (relevant houses, CSL, 4-step chain,
     significators, RPs, dasha, applicable type-classification framework)
  3. State which signals support the pushback claim AND which signals
     support your original verdict
  4. If the re-run reveals you missed a signal in your first pass:
     state explicitly which signal was missed, why your first pass got
     it wrong, and what the correct verdict is now
  5. If after re-running, your verdict has NOT changed, defend it with
     the specific signal evidence (politely but firmly):
     "Re-checking: Signal X says A, Signal Y says B. The chart still
     reads as [verdict]. The other source may be using a different
     framework, OR may be referencing a signal that the chart structure
     does not support."
  6. If the re-run reveals genuine ambiguity (signals truly split),
     acknowledge openly: "The chart signals are mixed on this question.
     Both interpretations have structural support."

CRITICAL: KP integrity (RULE 4) requires NEVER pivoting under social
pressure without structural justification. Caving in to pushback to be
polite is a violation of KP integrity. Better to respectfully maintain
the structural verdict than flip it without reason.

If the user becomes frustrated: acknowledge the frustration. Restate
that KP gives STRUCTURAL PROBABILITY, not deterministic certainty.
Never make up false certainty to comfort.


================================================================
KP ANALYSIS PROCESS — FOLLOW FOR EVERY QUESTION
================================================================

STEP 1 — IDENTIFY TOPIC AND RELEVANT HOUSES
Identify topic. Get relevant houses and denial houses from RULE 5.

STEP 2 — CUSPAL SUB LORD ANALYSIS (Promise Gate)
- Get sub lord of primary cusp from HOUSE CUSPS section
- If sub lord is Rahu/Ketu: note their occupation house first, then apply
  RULE 8 proxy chain. Use the provided "full_signification" list directly.
- Apply RULE 20: trace all 4 steps. Note self-significator status.
- List ALL houses sub lord signifies through complete chain
- Apply RULE 5 "ANY ONE" test:
  Does the list contain ANY relevant house? → PROMISED
  Relevant + denial houses present? → CONDITIONAL
  Zero relevant houses, only denial? → DENIED (rare)
- Check Step 4 for total denier warning (offered then withdrawn risk)
- Check supporting cusps H2 and H11 for fulfillment confirmation
- State final verdict with the exact house(s) that triggered it

STEP 3 — SIGNIFICATORS
Collect all 4 levels of significators for relevant houses.
Cross-reference with provided Ruling Planets.
Identify fruitful significators (in both lists).

STEP 4 — CURRENT DASHA ANALYSIS
Does current MD lord signify relevant houses? (Yes/No/Partial)
Does current AD lord signify relevant houses? (Yes/No/Partial)
Both Yes = event possible NOW. Only MD = need better AD.

STEP 5 — SCAN ALL UPCOMING ANTARDASHA PERIODS
For EVERY upcoming AD lord, apply the FULL 4-step Rule 20 chain:
Step 1: Houses AD lord occupies + owns
Step 2: Houses AD lord's STAR LORD occupies + owns
Step 3: Houses AD lord's SUB LORD occupies + owns
Step 4: Houses of star lord of AD lord's sub lord
ONLY after completing all 4 steps, rate the AD as STRONG/MODERATE/WEAK.
NEVER rate an AD based on Steps 1-2 alone.

CRITICAL: Many planets appear weak at Steps 1-2 but connect to relevant
houses at Steps 3-4 through their sub lord chain. Stopping at Steps 1-2
means you are ignoring available chart data — this is a Rule 10 violation.
For EVERY AD lord, explicitly state Step 3 and Step 4 houses before
assigning your rating. Never silently skip Steps 3-4.

STEP 5B — PRATYANTARDASHA ANALYSIS (within current AD)
Use the exact PAD dates provided in "PRATYANTARDASHA SEQUENCE" section.
For each PAD lord, apply the FULL 4-step Rule 20 chain:
Step 1: Houses PAD lord occupies + owns
Step 2: Houses PAD lord's STAR LORD occupies + owns
Step 3: Houses PAD lord's SUB LORD occupies + owns
Step 4: Houses of star lord of PAD lord's sub lord
ONLY after completing all 4 steps, assess if PAD touches relevant houses.
NEVER rate a PAD based on Steps 1-2 alone.
When multiple PADs look favorable, prioritize the one whose lord
appears in current Ruling Planets — that is the most likely trigger.
NEVER guess PAD dates — use only the exact dates provided.
PAD that is BOTH a relevant significator (via full 4-step chain)
AND in Ruling Planets = most precise timing window.

STEP 6 — IDENTIFY ALL TIMING WINDOWS
PRIMARY: Strongest AD (best house signification + RP overlap)
SECONDARY: Next best AD
TERTIARY: Specific PAD within a favorable AD (use exact PAD dates provided)

CRITICAL NOTE ON CONSISTENCY: The PRIMARY/SECONDARY/TERTIARY ranking can legitimately
differ between sessions because today's Ruling Planets change daily. When an AD lord
IS in today's RP, it gets elevated in ranking. Always state which RP-overlap elevated
a window, so the client understands the ranking is calibrated to today's date.
Add a single line: "Note: Window rankings reflect today's Ruling Planets and may
shift slightly on other days." Only add this line in Section 4.

H6 SPECIAL RULE FOR SERVICE/CONTRACT ROLES:
H6 is the house of SERVICE — not merely competition. When a dasha/PAD lord signifies H6:
- It means service/employment/contract work is ACTIVE in that period
- For consultancy, contractor, or service-based job roles: H6 + H2 activation
  means the engagement/contract IS happening (not just "competition is running")
- H10 + H11 confirmation = offer letter receipt / formal appointment / first payment
- NEVER describe H6 activation alone as "practice" or "not meaningful"
- Correct framing: "H6 active = service engagement live; H10/H11 = formal confirmation follows"

STEP 7 — RULING PLANETS CONFIRMATION
Cross-check timing windows against Ruling Planets.
RP overlap = confirmed timing window.

STEP 8 — FINAL VERDICT
State: promise verdict + primary window + secondary window + unfavorable periods

================================================================
OUTPUT FORMAT — BASED ON MODE IN THE MESSAGE
================================================================

IF MODE = USER:
Write as a wise, trusted friend who happens to know astrology deeply — not as a consultant delivering a report.

NEVER use these technical terms (use plain English alternatives instead):
- sub lord, cusp, significator, antardasha, mahadasha, dasha, nakshatra, star lord,
  cuspal, bhava, PAD, pratyantardasha, sub-sub period, antara, lord, dispositor,
  karaka, conjunct, aspecting, Vimshottari, Placidus, ayanamsa, ephemeris, native
- Rahu → "shadow planet" or "north node"
- Ketu → "shadow planet" or "south node"
- retrograde → "going backwards" or "in reverse motion"
- INSTEAD use: "planetary period", "key planet", "timing window", "cycle", "mini-cycle",
  "ruling influences", "the stars point to", "the pattern in your chart"

TONE — FOLLOW THESE EXACTLY:
- Lead with the DIRECT ANSWER in the first sentence — not background, not methodology
- Be honest about difficult or delayed timing — do not soften to the point of vagueness
- When timing is far off: acknowledge the wait kindly, then say what the current cycle IS good for
- End with ONE actionable or grounding insight — something the person can actually use
- NEVER use: "Great question", "I hope this helps", "As an AI", "Please note",
  "It is worth mentioning", "It's important to understand", "I must point out"
- NEVER repeat the same idea in different words
- NEVER be vague to avoid giving a clear answer — the chart is precise, match that precision

ANSWER LENGTH — BE INTELLIGENT:
- Simple yes/no timing question → 2-3 paragraphs max
- "When will X happen?" → Cover ALL relevant future periods, concisely
- Complex multi-part question → Full answer as needed, no padding
- If it can be short, be short. If it needs to be long, be long. Never cut off mid-thought.

USER MODE COMPLETENESS CHECK (verify before ending):
- Did I answer the question directly in the first paragraph?
- Did I cover ALL relevant future periods, not just the current one?
- Is there exactly one grounding or actionable insight at the end?
- Are there zero banned technical terms in my response?

IF MODE = ASTROLOGER:
Answer intelligently — not mechanically. Structure your answer based on what the question needs, not a fixed template.

Use this adaptive 7-section format:

## [TOPIC] ANALYSIS — [Name]
**{today}** | Houses: [Relevant houses for this topic]

### 1. DIRECT VERDICT
One clear sentence: PROMISED / CONDITIONAL / DENIED — and the single strongest reason why.
Do not repeat the full analysis here — just the conclusion and its primary driver.

### 2. CUSPAL EVIDENCE
How you arrived at the verdict — show your reasoning chain:
- H[primary cusp] Sub Lord: [Planet] → Star Lord: [Planet]
  - Sub Lord signifies: [Houses] (Step 1 + 2 of 4-step chain)
  - Sub Lord's Sub Lord: [Planet] signifies [Houses] (Step 3)
  - Star Lord of Sub Lord's Sub Lord: [Planet] signifies [Houses] (Step 4 — FINAL DECIDER)
  - → Combined touch: [Relevant houses from full chain] → Verdict: PROMISED/CONDITIONAL/DENIED
- Supporting cusps (H2, H11 etc.): brief verdict per cusp
State exactly which step in the 4-step chain triggered the verdict.

### 3. FRUITFUL SIGNIFICATORS
Planets that signify relevant houses AND appear in today's Ruling Planets.
These are the timing planets. List them with the houses they connect.
Non-fruitful significators: list briefly.

### 4. TIMING WINDOWS
Scan ALL upcoming AD lords. For each, apply the full 4-step Rule 20 chain before rating.
Show in a table — include every upcoming AD, not just favorable ones:

| AD Lord | Period | Houses Signified (4-step) | Touches Topic? | Quality |
|---------|--------|--------------------------|----------------|---------|

After the table:
- **PRIMARY WINDOW:** [Best AD — exact dates — reason]
- **SECONDARY WINDOW:** [Next best — dates]
- **UNFAVORABLE:** [ADs to avoid — one-line reason each]

### 5. PRATYANTARDASHA (include only if adds value)
Within the PRIMARY AD, list PAD lords that signify relevant houses via full 4-step chain.
Use exact PAD dates from chart data. Mark any PAD lord that also appears in Ruling Planets — that is the most precise trigger window.
Skip this section entirely if the primary AD is far in the future or PAD analysis doesn't narrow the timing meaningfully.

### 6. PRE-ANSWERED FOLLOW-UPS
Think: what will the astrologer's next question be after reading this? Answer 2-3 of them proactively.
Examples for marriage: "Is Venus strong as karaka?", "What if the client pushes back on the timing?", "Does the 2nd cusp support?"
Examples for job: "Is Saturn supporting the 10th cusp?", "Is the current MD favorable overall?", "Any denial risk?"
Make these feel natural — a senior astrologer anticipating the next step, not a checklist.

### 7. CLIENT SUMMARY
3 sentences the astrologer can speak directly to the client. Plain English. Zero technical terms.
Should be honest, specific, and usable as-is.

---

INTELLIGENT OMISSION RULES — READ THESE CAREFULLY:
- If the promise verdict is DENIED: skip sections 4 and 5 (timing is irrelevant). Instead, briefly explain what would need to change for the event to become possible.
- If the question is specifically about timing (and promise is already established): compress section 2 to 2-3 lines referencing the prior analysis, and expand sections 4 and 5.
- If this is a follow-up question in a conversation: do NOT re-explain what was already covered in a prior answer. Reference it briefly ("As established, H7 sub lord Venus promises marriage") and move forward.
- Section 5 is optional — include it only when PAD analysis meaningfully narrows the timing window.
- Never produce a section that repeats information already given in a previous section.
- Complete every section you start — never cut off mid-table or mid-sentence.
"""


# ================================================================
# TOPIC DETECTION
# ================================================================

def detect_topic(question: str) -> str:
    # PR A1.3-fix-10 (#7) — list expanded to match TOPIC_TO_FILE.
    # Was 11 topics, now 20 — covers personality / fame / creativity /
    # spirituality / addiction / mental_health / friendship / decision /
    # comparison + relative aliases.
    prompt = f"""Identify the PRIMARY life topic in this question. Reply with ONLY the topic name.

Question: "{question}"

Choose exactly ONE from this list:
marriage / divorce / spouse / job / foreign_travel / foreign_settle /
education / health / children / fertility / property / wealth /
litigation / personality / fame / creativity / spirituality /
addiction / mental_health / friendship / decision / comparison /
parents / mother / father / siblings / general

Rules:
- "buy a house" or "buy property" or "buy flat" = property
- "move abroad" or "settle in another country" or "immigrate" or "PR visa" = foreign_settle
- "visit abroad" or "travel overseas" or "go to another country" = foreign_travel
- "get married" or "when marriage" = marriage
- "divorce" or "separation" or "breakup" or "marital discord" or "split" = divorce
- "what is my partner like" or "spouse details" or "who will i marry" = spouse
- "job" or "career" or "work" or "promotion" = job
- "sick" or "health" or "disease" or "illness" = health
- "child" or "baby" or "pregnant" or "trying to conceive" = children
- "ivf" or "fertility" or "trouble conceiving" = fertility
- "study" or "education" or "degree" or "exam" = education
- "money" or "wealth" or "savings" or "investment" = wealth
- "court" or "case" or "lawsuit" = litigation
- "who am i" or "my personality" or "what kind of person" = personality
- "famous" or "recognition" or "public figure" = fame
- "creative" or "artistic" or "talent" = creativity
- "spiritual" or "meditation" or "moksha" or "dharma" = spirituality
- "addiction" or "habit" or "drinking" or "smoking" = addiction
- "depression" or "anxiety" or "mental" = mental_health
- "friend" or "social circle" or "network" = friendship
- "should i" or "decision" or "good idea" = decision
- "x vs y" or "compare" or "or" (between two options) = comparison
- "father" = father
- "mother" = mother
- "brother" or "sister" or "sibling" = siblings
- "parent" or "parents" = parents
- (anything not matching above) = general

Reply with ONLY the single topic word."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        detected = message.content[0].text.strip().lower().split()[0]
        # PR A1.3-fix-10 (#7) — synced with TOPIC_TO_FILE (full set).
        valid = list(TOPIC_TO_FILE.keys())
        return detected if detected in valid else _keyword_fallback(question)
    except:
        return _keyword_fallback(question)


def _keyword_fallback(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ["marr", "wife", "husband", "wedding", "spouse", "bride", "groom"]):
        return "marriage"
    if any(w in q for w in ["divorc", "separat", "breakup", "break up", "marital discord", "split"]):
        return "divorce"
    if any(w in q for w in ["health", "sick", "ill", "disease", "hospital", "medicine"]):
        return "health"
    if any(w in q for w in ["house", "property", "land", "flat", "apartment", "real estate"]):
        return "property"
    if any(w in q for w in ["settle", "immigrat", "permanent resident", "pr visa"]):
        return "foreign_settle"
    if any(w in q for w in ["travel", "abroad", "foreign", "visa", "overseas", "immigrat", "another country"]):
        return "foreign_travel"
    if any(w in q for w in ["child", "baby", "pregnant", "son", "daughter"]):
        return "children"
    if any(w in q for w in ["stud", "educat", "degree", "university", "college", "exam"]):
        return "education"
    if any(w in q for w in ["money", "wealth", "rich", "savings", "invest", "financ"]):
        return "wealth"
    if any(w in q for w in ["court", "case", "lawsuit", "legal", "litigat"]):
        return "litigation"
    return "job"


# ================================================================
# MAIN PREDICTION FUNCTION
# ================================================================

def get_prediction(chart_data: dict, question: str, history: list = [], mode: str = "user", topic: str = None) -> str:
    # PR A1.3-fix-1 (C1): if the caller already knows the topic (frontend topic
    # picker), skip the Haiku detection round-trip. Saves ~5-10s latency per
    # query and prevents topic drift between the loaded KB and the
    # pre-computed advanced_compute block.
    if topic and topic in TOPIC_TO_FILE:
        detected_topic = topic
    elif chart_data.get("advanced_compute", {}).get("topic"):
        detected_topic = chart_data["advanced_compute"]["topic"]
    else:
        detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic

    # PR A1.3-fix-12 — KB split into universal + topic for stable cache prefix.
    # PR A1.3-fix-18 — universal_kb now mode-aware: user mode gets the
    # 4-file lean KB (~22K tokens), astrologer gets full 12-file kit (~40K).
    universal_kb = load_universal_kb(mode=mode)
    topic_kb = load_topic_kb(detected_topic)
    # PR A1.3-fix-16 — mode-aware chart_summary trim for user mode.
    chart_summary = format_chart_for_llm(chart_data, mode=mode)

    # Build conversation history — pass answers only, strip time-specific question context
    # This prevents temporal anchoring from leaking between questions
    messages = []
    # PR A1.3-fix-10 (#11) — session memory anchor: if there are prior
    # messages, prepend a single context-reminder line so the LLM
    # remembers WHO this is across long convos, even past the
    # 4-history window. ~50 tokens, anchors continuity.
    if history:
        gender = (chart_data.get("gender") or "").strip()
        age = chart_data.get("age_years")
        md = (chart_data.get("current_dasha") or {}).get("mahadasha", {}).get("lord")
        ad = (chart_data.get("current_dasha") or {}).get("antardasha", {}).get("antardasha_lord")
        anchor = (
            f"[NATIVE CONTEXT REMINDER — same throughout this session: "
            f"{chart_data.get('name', 'Native')}, age {age}, "
            f"{gender or 'gender-unknown'}, "
            f"running {md} MD → {ad} AD. Active topic now: {detected_topic}.]"
        )
        messages.append({"role": "user", "content": anchor})
        messages.append({"role": "assistant", "content": "Acknowledged."})
    for prev in history[-4:]:
        # Pass previous question stripped of year/time references to prevent leakage
        clean_question = prev.get("question", "")
        messages.append({"role": "user", "content": clean_question})
        messages.append({"role": "assistant", "content": prev.get("answer", "")})

    # PR A1.3-fix-12 — cache breakpoint REORDERING for cross-topic cache hits.
    #
    # Why the previous fix-9 layout failed (dashboard showed 2.4% cache read
    # ratio + 0.82× write amortization): KB and chart_summary blocks were
    # placed inside the LATEST user message, AFTER the conversation history.
    # Anthropic's prompt cache is prefix-based — a cache hit requires the
    # request prefix UP TO the cache_control marker to match a previously-
    # cached prefix. Conversation history grows by 2 messages per turn,
    # which invalidated the prefix every turn. The KB and chart cache
    # writes were paid for but never amortized (writes = 0.82× reads,
    # exactly what the dashboard showed).
    #
    # New layout: stable blocks live in the SYSTEM message (which sits
    # BEFORE all conversation history). Within the system array, blocks
    # are ordered MOST-STABLE → MOST-VARIABLE so the prefix stays valid
    # for as many follow-up questions as possible:
    #
    #   1. system_prompt (~13K)  — only date varies daily
    #   2. chart_summary (~30K)  — stable per chart, all session
    #   3. universal_kb (~22K)   — IDENTICAL across all topics (the key
    #                              cross-topic-cache win — Q1 job and Q2
    #                              marriage hit the same universal cache)
    #   4. topic_kb (~10K)       — varies per topic (only this block re-
    #                              writes on a topic switch)
    #
    # Conversation history goes in messages[] AFTER all four cache
    # breakpoints, so its turn-by-turn growth no longer invalidates them.
    #
    # Cache TTL strategy (PR A1.3-fix-13 — extended cache TTL):
    #   1h on: system_prompt, chart_summary, universal_kb
    #          (these never change within a session; 1h amortizes the
    #          write penalty across long astrologer consultations and
    #          across the natural 5-30 minute gaps between client
    #          questions).
    #   5m on: topic_kb
    #          (varies per topic; topic switches happen mid-session, so
    #          5m's smaller write penalty is the right trade).
    #
    # Cost math for 1h vs 5m on a stable block:
    #   - 1h cache write: 2.0× input price (vs 1.25× for 5m)
    #   - 1h cache read:  0.1× (same as 5m)
    #   - Break-even: any 2nd use within an hour. Astrologer sessions
    #     reliably exceed this — typical session is 5-15 questions over
    #     20-45 min on the same chart.
    #
    # Beta header `extended-cache-ttl-2025-04-11` is required for the
    # `ttl: "1h"` field.
    #
    # Expected impact:
    #   - Follow-up same-topic: ~67% cost reduction (4/4 blocks hit)
    #   - Follow-up cross-topic: ~50-65% cost reduction (3/4 blocks hit)
    #   - First call of session: ~equal to today (cache writes paid)
    #   - 5-30min gaps between questions: no cache-rewrite tax (was a
    #     hidden hot loss with 5m TTL — user pauses to think → cache
    #     expires → next question pays write again)
    #   - Quality: zero impact (semantically identical request to LLM)

    system_blocks = [
        {
            "type": "text",
            "text": get_system_prompt(),
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        },
        {
            "type": "text",
            "text": f"---\n\nCHART DATA:\n{chart_summary}",
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        },
        {
            "type": "text",
            "text": f"---\n\nKP UNIVERSAL KNOWLEDGE BASE:\n{universal_kb}",
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        },
    ]
    if topic_kb:
        # Only emit a 4th block when the topic has specific content. For
        # "general" topic, topic_kb is empty and we skip — keeps the
        # cache prefix shorter and avoids a no-op breakpoint.
        # 5m TTL because topic switches mid-session — smaller write penalty
        # is the right trade vs the chance of a topic-revisit within 1h.
        system_blocks.append(
            {
                "type": "text",
                "text": (
                    f"---\n\nKP TOPIC-SPECIFIC KNOWLEDGE "
                    f"({detected_topic.upper()}):\n{topic_kb}"
                ),
                "cache_control": {"type": "ephemeral"},
            }
        )

    user_blocks = [
        {
            "type": "text",
            "text": f"""MODE: {mode.upper()}
CURRENT QUESTION: {question}

IMPORTANT: Answer THIS question independently. Do not assume any timeframe from previous questions.
Perform complete KP analysis. Format output for {mode.upper()} mode as instructed in the system prompt.""",
        },
    ]
    messages.append({"role": "user", "content": user_blocks})

    max_tokens = 16000 if mode == "astrologer" else 4000

    # PR A1.3-fix-13 — beta header required for `ttl: "1h"` on ephemeral
    # cache blocks. Without it, the API rejects the ttl field.
    #
    # PR A1.3-fix-17 — model selection by mode:
    #   - astrologer mode → Sonnet 4.6 (7-section structured output with
    #     dense KP shorthand needs Sonnet's reasoning depth)
    #   - user mode       → Haiku 4.5 (plain-English narration of
    #     pre-computed engine output is a translation task; Haiku is
    #     ~3× cheaper across input/output/cache and 2-3× faster)
    #
    # Accuracy preservation: structural verdicts come from the engine
    # compute (advanced_compute, decision_support, etc) which is
    # deterministic. The LLM is presentation layer for user mode. Risk
    # of model swap: slightly less polished prose. Mitigation: A/B
    # verification before this rolls to production.
    model_id = "claude-haiku-4-5" if mode == "user" else "claude-sonnet-4-6"

    message = client.messages.create(
        model=model_id,
        max_tokens=max_tokens,
        temperature=0,
        system=system_blocks,
        messages=messages,
        extra_headers={"anthropic-beta": "extended-cache-ttl-2025-04-11"},
    )

    return message.content[0].text


# ================================================================
# STREAMING VARIANT (PR A1.3-fix-16)
# ================================================================
# Async generator that yields LLM text chunks as they arrive. Used by
# the SSE endpoints (`/prediction/ask-stream`, `/astrologer/analyze-stream`)
# for premium UX (TTFT 60-120s → 1-2s).
#
# Behavior:
#   - Same compute pipeline as get_prediction (chart_data is already
#     built by the caller; this function only handles the LLM call).
#   - Phase 2 cache check: if same chart + topic + mode + question
#     (today, normalized) is in the 24h cache, yield cached text in
#     ~80-char chunks for visual continuity, skip LLM entirely.
#   - Cache miss: stream from Anthropic, accumulate full answer, write
#     to cache after stream completes.
#   - Topic detection short-circuits same as get_prediction (caller
#     can pass topic explicitly to skip Haiku call).
#   - Mode-aware chart_summary trim (Phase 1) — user mode gets the
#     stripped chart_summary that drops sookshmas_upcoming_ads and
#     caps current-AD sookshmas to top-3 ranked.

async def get_prediction_stream(
    chart_data: dict,
    question: str,
    history: list = [],
    mode: str = "user",
    topic: str = None,
    cache_key_input: dict | None = None,
):
    """
    Async generator yielding text chunks of the LLM response.

    Args:
        chart_data: full chart_data dict from chart_pipeline.
        question: user's question.
        history: prior [{question, answer}] pairs (most-recent-last).
        mode: "user" or "astrologer".
        topic: pre-detected topic to skip the Haiku call.
        cache_key_input: dict with keys {birth_date, birth_time,
            latitude, longitude, gender, topic, mode, question} used to
            build the per-chart cache key. If None, caching is skipped.

    Yields:
        str chunks of the answer text.
    """
    from app.services import answer_cache

    # Topic resolution (mirrors get_prediction)
    if topic and topic in TOPIC_TO_FILE:
        detected_topic = topic
    elif chart_data.get("advanced_compute", {}).get("topic"):
        detected_topic = chart_data["advanced_compute"]["topic"]
    else:
        detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic

    # ─── Cache check (Phase 2) ───────────────────────────────────────
    cache_key: str | None = None
    if cache_key_input:
        cache_key = answer_cache.make_key(
            birth_date=cache_key_input.get("birth_date", ""),
            birth_time=cache_key_input.get("birth_time", ""),
            latitude=cache_key_input.get("latitude", 0.0),
            longitude=cache_key_input.get("longitude", 0.0),
            # PR A1.3-fix-17 — pass timezone_offset to prevent TZ-collision
            # bug (same birth_time + lat/lon but different TZ = different
            # chart, was producing same cache key).
            timezone_offset=cache_key_input.get("timezone_offset", 5.5),
            gender=cache_key_input.get("gender", ""),
            topic=detected_topic,
            mode=mode,
            question=question,
        )
        cached = answer_cache.get(cache_key)
        if cached:
            cached_answer, _meta = cached
            # Yield cached text in ~80-char chunks for visual continuity
            # (frontend's typewriter effect renders the same regardless
            # of source; user can't tell cache vs fresh).
            CHUNK = 80
            for i in range(0, len(cached_answer), CHUNK):
                yield cached_answer[i:i + CHUNK]
            return

    # ─── KB + chart prep ─────────────────────────────────────────────
    # PR A1.3-fix-18 — mode-aware universal KB (user mode = 4-file lean kit).
    universal_kb = load_universal_kb(mode=mode)
    topic_kb = load_topic_kb(detected_topic)
    chart_summary = format_chart_for_llm(chart_data, mode=mode)

    # Conversation history
    messages = []
    if history:
        gender = (chart_data.get("gender") or "").strip()
        age = chart_data.get("age_years")
        md = (chart_data.get("current_dasha") or {}).get("mahadasha", {}).get("lord")
        ad = (chart_data.get("current_dasha") or {}).get("antardasha", {}).get("antardasha_lord")
        anchor = (
            f"[NATIVE CONTEXT REMINDER — same throughout this session: "
            f"{chart_data.get('name', 'Native')}, age {age}, "
            f"{gender or 'gender-unknown'}, "
            f"running {md} MD → {ad} AD. Active topic now: {detected_topic}.]"
        )
        messages.append({"role": "user", "content": anchor})
        messages.append({"role": "assistant", "content": "Acknowledged."})
    for prev in history[-4:]:
        clean_question = prev.get("question", "") if isinstance(prev, dict) else getattr(prev, "question", "")
        clean_answer = prev.get("answer", "") if isinstance(prev, dict) else getattr(prev, "answer", "")
        messages.append({"role": "user", "content": clean_question})
        messages.append({"role": "assistant", "content": clean_answer})

    # System cache blocks (same structure as get_prediction)
    system_blocks = [
        {"type": "text", "text": get_system_prompt(),
         "cache_control": {"type": "ephemeral", "ttl": "1h"}},
        {"type": "text", "text": f"---\n\nCHART DATA:\n{chart_summary}",
         "cache_control": {"type": "ephemeral", "ttl": "1h"}},
        {"type": "text", "text": f"---\n\nKP UNIVERSAL KNOWLEDGE BASE:\n{universal_kb}",
         "cache_control": {"type": "ephemeral", "ttl": "1h"}},
    ]
    if topic_kb:
        system_blocks.append({
            "type": "text",
            "text": (
                f"---\n\nKP TOPIC-SPECIFIC KNOWLEDGE "
                f"({detected_topic.upper()}):\n{topic_kb}"
            ),
            "cache_control": {"type": "ephemeral"},
        })

    user_blocks = [{
        "type": "text",
        "text": f"""MODE: {mode.upper()}
CURRENT QUESTION: {question}

IMPORTANT: Answer THIS question independently. Do not assume any timeframe from previous questions.
Perform complete KP analysis. Format output for {mode.upper()} mode as instructed in the system prompt.""",
    }]
    messages.append({"role": "user", "content": user_blocks})

    max_tokens = 16000 if mode == "astrologer" else 4000

    # ─── Stream from Anthropic ───────────────────────────────────────
    # PR A1.3-fix-17 — Haiku for user mode, Sonnet for astrologer mode.
    # See get_prediction() above for full rationale.
    model_id = "claude-haiku-4-5" if mode == "user" else "claude-sonnet-4-6"

    accumulated: list[str] = []
    async with async_client.messages.stream(
        model=model_id,
        max_tokens=max_tokens,
        temperature=0,
        system=system_blocks,
        messages=messages,
        extra_headers={"anthropic-beta": "extended-cache-ttl-2025-04-11"},
    ) as stream:
        async for text in stream.text_stream:
            accumulated.append(text)
            yield text

    # ─── Write to cache after stream completes ───────────────────────
    if cache_key:
        full_answer = "".join(accumulated)
        if full_answer.strip():
            answer_cache.put(cache_key, full_answer, meta={"mode": mode, "topic": detected_topic})


# ================================================================
# CHART FORMATTER — Structured KP Worksheet for LLM
# ================================================================

def format_chart_for_llm(chart_data: dict, mode: str = "astrologer") -> str:
    """
    Build the chart_summary string emitted to the LLM.

    PR A1.3-fix-16 — mode-aware trimming for user mode:
        Astrologer mode keeps the full output (current behavior, unchanged):
            - Full 9-AD sequence
            - all_ad_pratyantardashas: every AD's 9 PADs (~81 entries)
            - sookshmas_current_ad: every PAD's 9 sookshmas (~81 entries)
            - sookshmas_upcoming_ads: next 2 ADs (~162 entries)

        User mode trims the heavy day-precision blocks the plain-English
        narrative doesn't actually use:
            - all_ad_pratyantardashas: ONLY current AD + next 2 ADs
              (not all 9 ADs)
            - sookshmas_current_ad: only the TOP 3 ranked sookshmas per
              PAD (not all 9), and only PADs within the current AD
            - sookshmas_upcoming_ads: DROPPED entirely (user mode doesn't
              predict day-precision events 3+ years out)

        Estimated savings for user mode: 30-70K tokens of input, which
        translates to ~$0.20-0.40 saved per first-call cache write.
        Quality preserved — accuracy-critical compute (advanced_compute,
        decision_support, transits, current dasha) all still emit fully.
    """
    is_user_mode = (mode or "").lower() == "user"
    lines = []

    if "name" in chart_data:
        lines.append(f"Native: {chart_data['name']}")
    if "detected_topic" in chart_data:
        lines.append(f"Topic: {chart_data['detected_topic'].upper()}")

    # PR A1.3a — NATIVE PROFILE block so the LLM never guesses gender from
    # the name (which caused "PCOD" predictions for males) and never hedges
    # with "if you are 30+" when the age is sitting right here.
    gender_raw = (chart_data.get("gender") or "").strip().lower()
    age_years = chart_data.get("age_years")
    birth_date = chart_data.get("birth_date") or ""
    if gender_raw or age_years or birth_date:
        gender_label = {"m": "Male", "male": "Male",
                        "f": "Female", "female": "Female",
                        "o": "Other", "other": "Other"}.get(gender_raw, "")
        lines.append("\nNATIVE PROFILE (use these — do NOT guess from the name):")
        lines.append(f"Gender: {gender_label or 'UNKNOWN — do NOT assume from name; ask the user'}")
        if age_years:
            lines.append(f"Age (computed today): {age_years} years")
        if birth_date:
            lines.append(f"Birth date: {birth_date}")
        lines.append(
            "RULE: Apply only sex-appropriate medical conditions and "
            "age-appropriate timing windows. If gender is UNKNOWN, write "
            "gender-neutral analysis instead of assuming."
        )

    # Promise analysis — RAW SIGNALS ONLY
    # PR A1.3-fix-3 (M4): the previous "Pre-calculation hint: STRONGLY PROMISED"
    # line was anchoring the LLM to the simplified verdict before it did its
    # own A/B/C/D + Star-Sub Harmony reading. We now emit the raw signals
    # (relevant houses, primary CSL, significator list) only, and let RULE 18
    # (use ADVANCED COMPUTE block) drive the verdict via the layer split.
    if "promise_analysis" in chart_data:
        p = chart_data["promise_analysis"]
        lines.append(f"\nPROMISE ANALYSIS (raw inputs — NOT a verdict):")
        lines.append(f"Relevant Houses: {p.get('relevant_houses', [])}")
        lines.append(f"Primary Cusp Sub Lord: {p.get('primary_cusp_sublord', '')}")
        lines.append(f"All Significators for Relevant Houses: {p.get('relevant_significators', [])}")
        lines.append(
            "NOTE: Above are SIGNALS, not a verdict. Derive your verdict from "
            "the ADVANCED KP COMPUTE block (Star-Sub Harmony layer split + "
            "A/B/C/D significator strengths) per RULE 18, not from a simplified hint."
        )

    # Current dasha — MD + AD + PAD + Sookshma (PR A1.3c-extras)
    if "current_dasha" in chart_data:
        d = chart_data["current_dasha"]
        md = d.get("mahadasha", {})
        ad = d.get("antardasha", {})
        pad = d.get("pratyantardasha", {})
        sd = d.get("sookshma", {}) or {}
        lines.append(f"\nCURRENT DASHA:")
        lines.append(f"Mahadasha: {md.get('lord')} ({md.get('start')} → {md.get('end')})")
        lines.append(f"Antardasha: {ad.get('antardasha_lord')} ({ad.get('start')} → {ad.get('end')})")
        if pad:
            lines.append(f"Pratyantardasha (PAD): {pad.get('pratyantardasha_lord')} ({pad.get('start')} → {pad.get('end')})")
        if sd and sd.get("sookshma_lord"):
            lines.append(
                f"Sookshma (sub-PAD): {sd.get('sookshma_lord')} "
                f"({sd.get('start')} → {sd.get('end')}) — day-precision window"
            )

    # CRITICAL — full antardasha sequence
    if "upcoming_antardashas" in chart_data:
        lines.append(f"\nFULL ANTARDASHA SEQUENCE (use ONLY these exact dates — never guess):")
        for ad in chart_data["upcoming_antardashas"]:
            lines.append(
                f"  {ad.get('antardasha_lord')}: "
                f"{ad.get('start')} → {ad.get('end')}"
            )

    # PAD sequence within current AD
    # PR A1.3-fix-16 — user mode trims to current + next 2 ADs only
    # (instead of all 9 ADs). Plain-English answers rarely cite PAD
    # detail >3 years out, and dropping 6 ADs × 9 PADs = 54 lines saves
    # ~5-10K tokens per query.
    if "all_ad_pratyantardashas" in chart_data:
        lines.append(f"\nPRATYANTARDASHA SEQUENCES FOR ALL ANTARDASHAS:")
        ads_to_emit = chart_data["all_ad_pratyantardashas"].items()
        if is_user_mode:
            # Find current AD lord; emit only current + next 2
            current_ad_lord = (
                (chart_data.get("current_dasha", {}) or {})
                .get("antardasha", {})
                .get("antardasha_lord")
            )
            ad_list = list(chart_data["all_ad_pratyantardashas"].items())
            cur_idx = next(
                (i for i, (lord, _) in enumerate(ad_list) if lord == current_ad_lord),
                0,
            )
            ads_to_emit = ad_list[cur_idx:cur_idx + 3]
        for ad_lord, pads in ads_to_emit:
            lines.append(f"  [{ad_lord} AD]:")
            for pad in pads:
                lines.append(
                    f"    {pad.get('pratyantardasha_lord')}: "
                    f"{pad.get('start')} → {pad.get('end')}"
                )

    # PR A1.3c-extras — Sookshma (sub-PAD / 4th level) for each PAD of the
    # current AD. This is the day-precision layer the LLM uses to identify
    # specific weeks within a PAD when an event is most likely to fire.
    #
    # PR A1.3-fix-16 — user mode emits only TOP 3 fire-ranked sookshmas
    # per PAD instead of all 9. Saves ~10-15K tokens (54 fewer entries).
    # Astrologer mode unchanged (gets all 9 sookshmas per PAD).
    if chart_data.get("sookshmas_current_ad"):
        lines.append(
            f"\nSOOKSHMA SEQUENCES (sub-PAD / 4th level — day-precision) "
            f"FOR EACH PAD WITHIN CURRENT ANTARDASHA:"
        )
        for pad_lord, sookshmas in chart_data["sookshmas_current_ad"].items():
            if not sookshmas:
                continue
            pad_start = sookshmas[0].get("start") if sookshmas else ""
            pad_end   = sookshmas[-1].get("end") if sookshmas else ""
            lines.append(f"  [{pad_lord} PAD] {pad_start} → {pad_end}:")
            # User mode: emit only top 3 by fire_score (already ranked
            # by rank_sookshmas_by_fire_score from fix-10). Astrologer
            # mode: emit all 9.
            sookshmas_to_emit = sookshmas
            if is_user_mode:
                # Sort by fire_score desc (None scored as 0), take top 3
                sookshmas_to_emit = sorted(
                    sookshmas,
                    key=lambda s: (s.get("fire_score") or 0),
                    reverse=True,
                )[:3]
            for sd in sookshmas_to_emit:
                # PR A1.3-fix-10 #12: emit fire_score + verdict + notes when ranking is present
                fs = sd.get("fire_score")
                fv = sd.get("fire_verdict", "")
                fn = sd.get("fire_notes", "")
                if fs is not None:
                    lines.append(
                        f"    Sookshma {sd.get('sookshma_lord')}: "
                        f"{sd.get('start')} → {sd.get('end')}  "
                        f"[fire={fs}/10 {fv}: {fn}]"
                    )
                else:
                    lines.append(
                        f"    Sookshma {sd.get('sookshma_lord')}: "
                        f"{sd.get('start')} → {sd.get('end')}"
                    )

    # PR A1.3-fix-4 (N2) — forward sookshmas for the next 2 ADs so the LLM
    # has day-precision data for "when in 2028" type questions where the
    # relevant AD is ahead of the current one.
    #
    # PR A1.3-fix-16 — DROPPED for user mode entirely. The plain-English
    # narrative does not predict specific days/weeks 3+ years out. Saves
    # ~20-50K tokens (the heaviest single block in chart_summary).
    if chart_data.get("sookshmas_upcoming_ads") and not is_user_mode:
        lines.append(
            f"\nSOOKSHMA SEQUENCES — UPCOMING ANTARDASHAS (forward day-precision):"
        )
        for ad_label, pads_dict in chart_data["sookshmas_upcoming_ads"].items():
            lines.append(f"\n  ===== {ad_label} =====")
            for pad_lord, sookshmas in pads_dict.items():
                if not sookshmas:
                    continue
                pad_start = sookshmas[0].get("start")
                pad_end   = sookshmas[-1].get("end")
                lines.append(f"  [{pad_lord} PAD] {pad_start} → {pad_end}:")
                for sd in sookshmas:
                    lines.append(
                        f"    Sookshma {sd.get('sookshma_lord')}: "
                        f"{sd.get('start')} → {sd.get('end')}"
                    )

    # Timing analysis
    if "timing_analysis" in chart_data:
        t = chart_data["timing_analysis"]
        lines.append(f"\nTIMING ANALYSIS:")
        lines.append(f"MD lord {t.get('mahadasha_lord')} relevant: {t.get('mahadasha_relevant')}")
        lines.append(f"AD lord {t.get('antardasha_lord')} relevant: {t.get('antardasha_relevant')}")
        lines.append(f"Assessment: {t.get('timing_assessment')}")

    # Ruling planets
    if "ruling_planets" in chart_data:
        rp = chart_data["ruling_planets"]
        lines.append(f"\nRULING PLANETS (at time of query):")
        lines.append(f"Day Lord: {rp.get('day_lord')}")
        lines.append(f"Lagna Sign Lord: {rp.get('lagna_sign_lord')}")
        lines.append(f"Lagna Star Lord: {rp.get('lagna_star_lord')}")
        lines.append(f"Moon Sign Lord: {rp.get('moon_sign_lord')}")
        lines.append(f"Moon Star Lord: {rp.get('moon_star_lord')}")
        lines.append(f"All RPs: {rp.get('ruling_planets')}")

    # PR A1.3c — Advanced compute block (A/B/C/D, harmony, fruitful, RP overlap, confidence)
    if chart_data.get("advanced_compute"):
        adv = chart_data["advanced_compute"]
        topic_label = (adv.get("topic") or "").upper()
        lines.append(f"\nADVANCED KP COMPUTE FOR TOPIC: {topic_label}")
        lines.append(f"Relevant houses: {adv.get('relevant_houses', [])}")
        lines.append(f"Denial houses (KSK strict): {adv.get('denial_houses', [])}")

        # A/B/C/D significator levels per relevant house
        sig_levels = adv.get("significators_by_level") or {}
        if sig_levels:
            lines.append("\nA/B/C/D SIGNIFICATOR HIERARCHY (KSK Reader V — A strongest):")
            for house, levels in sig_levels.items():
                a = levels.get("A") or []
                b = levels.get("B") or []
                c = levels.get("C") or []
                d = levels.get("D") or []
                lines.append(
                    f"  H{house}:  A={a or '—'}  B={b or '—'}  C={c or '—'}  D={d or '—'}"
                )

        # Fruitful significators (significator ∩ Ruling Planets)
        fruitful = adv.get("fruitful_significators") or []
        lines.append(
            f"\nFRUITFUL SIGNIFICATORS (significator ∩ RP — strongest timing): "
            f"{fruitful or 'NONE — no significator is currently ruling, weaker timing'}"
        )

        # Self-strength flags (in own star = pure-result planet)
        ss = adv.get("self_strength") or {}
        ss_planets = [p for p, v in ss.items() if v]
        if ss_planets:
            lines.append(f"SELF-STRENGTH PLANETS (in own star — pure results): {ss_planets}")

        # Primary cusp sign type (KSK overlay)
        cs = adv.get("primary_cusp_sign_type") or {}
        if cs:
            lines.append(
                f"PRIMARY CUSP SIGN: {cs.get('sign')} "
                f"({cs.get('movability')}, {cs.get('fruitfulness')})"
            )

        # Star-Sub Harmony of the primary cusp's CSL — 3-layer split
        # (PR A1.3-fix-2: SELF layer added; for Rahu/Ketu CSL it now
        # includes the conjunction-proxy chain via get_rahu_ketu_significations).
        h = adv.get("star_sub_harmony") or {}
        if h:
            lines.append(
                f"\nSTAR–SUB HARMONY (H{h.get('primary_cusp')} CSL = {h.get('csl_planet')}, "
                f"in star of {h.get('star_lord')}, in sub of {h.get('sub_lord')}):"
            )
            if "self_houses" in h:
                lines.append(
                    f"  SELF layer (planet itself): {h.get('self_houses', [])} "
                    f"(rel={h.get('self_relevant', [])}, denial={h.get('self_denial', [])})"
                )
            lines.append(
                f"  STAR layer (nature/colour): {h.get('star_houses', [])} "
                f"(rel={h.get('star_relevant', [])}, denial={h.get('star_denial', [])})"
            )
            lines.append(
                f"  SUB layer (deciding gate):  {h.get('sub_houses', [])} "
                f"(rel={h.get('sub_relevant', [])}, denial={h.get('sub_denial', [])})"
            )
            lines.append(f"  HARMONY VERDICT: {h.get('harmony')}")

        # PR A1.3-fix-5 — Supporting cusp sub-lord activations (KSK timing rule)
        # Without this block the LLM only saw H7's CSL for marriage timing
        # and missed the H2/H11 sub-lord activation that often fires earlier.
        sup_cusps = adv.get("supporting_cusp_activations") or []
        if sup_cusps:
            lines.append(
                "\nSUPPORTING CUSP SUB-LORD CHAINS (KSK timing rule — AD lord that is "
                "the SUB-LORD of any of these AND signifies the OTHER relevant houses "
                "is the marriage/career/etc trigger):"
            )
            for sc in sup_cusps:
                marker = "PRIMARY" if sc.get("is_primary") else "supporting"
                lines.append(
                    f"  H{sc['house']} ({marker}) sub-lord = {sc['sub_lord']} → "
                    f"signifies {sc.get('signified_houses', [])} "
                    f"(rel:{sc.get('signified_relevant', [])}, "
                    f"den:{sc.get('signified_denial', [])}); "
                    f"signifies-other-relevant={sc.get('signifies_other_relevant', [])} "
                    f"→ KSK-timing-trigger={'YES' if sc.get('ksk_timing_active') else 'no'}"
                )

        # PR A1.3-fix-5 — AD-lord-as-supporting-cusp-sub-lord triggers
        ad_triggers = adv.get("ad_sublord_triggers") or []
        if ad_triggers:
            lines.append(
                "\nUPCOMING AD-LORD = SUPPORTING-CUSP-SUB-LORD TRIGGERS (KSK Reader timing rule):"
            )
            for t in ad_triggers:
                primary_tag = " [PRIMARY CUSP]" if t.get("is_primary_cusp") else ""
                ksk_tag = "  ⭐ KSK-fires" if t.get("ksk_timing_active") else ""
                lines.append(
                    f"  {t['antardasha_lord']:9} ({t['start']} → {t['end']}): "
                    f"activates H{t['activates_house']}{primary_tag}{ksk_tag}"
                )

        # RP overlap on MD/AD + upcoming ADs
        rp_o = adv.get("rp_overlap") or {}
        md_o = rp_o.get("md") or {}
        ad_o = rp_o.get("ad") or {}
        lines.append(
            f"\nRP OVERLAP — MD lord {md_o.get('lord')}: {md_o.get('slots', 0)} RP slots; "
            f"AD lord {ad_o.get('lord')}: {ad_o.get('slots', 0)} RP slots"
        )
        upcoming = rp_o.get("upcoming_antardashas") or []
        if upcoming:
            lines.append("UPCOMING ANTARDASHA RP-RIPENESS (higher slots = riper timing):")
            for u in upcoming:
                lines.append(
                    f"  {u.get('antardasha_lord')} ({u.get('start')} → {u.get('end')}): "
                    f"{u.get('rp_overlap', 0)} RP slots {u.get('rp_slots') or ''}"
                )

        # Per-topic confidence
        conf = adv.get("confidence_score")
        if conf is not None:
            lines.append(
                f"\nENGINE CONFIDENCE FOR THIS TOPIC: {conf}/100  "
                f"(synthesised from promise + harmony + fruitful sigs + RP overlap; "
                f"calibration is conservative — your KSK reasoning may justify ±10)"
            )

        # PR A1.3-fix-6 — Planetary aspects
        asp = adv.get("aspects_by_planet") or {}
        aspr = adv.get("aspects_received") or {}
        if asp:
            lines.append("\nPLANETARY ASPECTS (Vedic — count from planet's house):")
            for p, info in asp.items():
                lines.append(f"  {p:8} from H{info['from_house']:2} aspects houses {info['aspects']}")
            lines.append("\nASPECTS RECEIVED BY EACH HOUSE (use for health/career/marriage modifiers):")
            for h in range(1, 13):
                ps = aspr.get(h, [])
                if ps:
                    lines.append(f"  H{h:2}: {ps}")

        # PR A1.3-fix-6 — Combustion (Mercury/Venus near Sun = effects delayed/hidden)
        comb = adv.get("combustion") or {}
        comb_flags = [(p, c) for p, c in comb.items() if c.get("is_combust") or c.get("borderline")]
        if comb_flags:
            lines.append("\nCOMBUSTION FLAGS (planet near Sun — KP says effects are delayed/hidden):")
            for p, c in comb_flags:
                tag = "COMBUST" if c["is_combust"] else "borderline-combust"
                lines.append(f"  {p}: {c['distance_from_sun_deg']}° from Sun (threshold {c['threshold_deg']}°) — {tag}")

        # PR A1.3-fix-6 — Tight conjunctions
        conjs = adv.get("conjunctions") or []
        if conjs:
            lines.append("\nTIGHT CONJUNCTIONS (orb < 8°; planets exchanging signification):")
            for c in conjs:
                lines.append(f"  {c['planet_a']} + {c['planet_b']}: orb {c['orb_deg']}° ({c['tightness']})")

        # PR A1.3-fix-6 — Pada (refines navamsa-level signification)
        pada_data = adv.get("pada") or {}
        if pada_data:
            lines.append("\nPADA (1/2/3/4) per planet — D9 navamsa sign refinement:")
            for p, d in pada_data.items():
                lines.append(f"  {p:8} pada-{d.get('pada')} → navamsa-sign {d.get('navamsa_sign')}")

        # PR A1.3-fix-6 — 8th lord disposition
        h8d = adv.get("eighth_lord") or {}
        if h8d.get("available"):
            lines.append(
                f"\n8TH LORD DISPOSITION (longevity / sexual function / transformation):"
            )
            lines.append(
                f"  8L = {h8d.get('h8_lord')} in H{h8d.get('house')} {h8d.get('sign')}, "
                f"star={h8d.get('star_lord')}, sub={h8d.get('sub_lord')}"
            )
            lines.append(f"  Signified houses: {h8d.get('signified_houses', [])}")
            for tag in (h8d.get("tags") or []):
                lines.append(f"  - {tag}")

        # PR A1.3-fix-6 — Partner profile (marriage topic only)
        pp = adv.get("partner_profile") or {}
        if pp.get("available"):
            lines.append("\nSPOUSE / PARTNER PROFILE (chart-derived; cite directly, don't recompute):")
            lines.append(f"  H7 sign: {pp.get('h7_sign')} ({pp.get('sign_stability')})")
            lines.append(f"  H7 nakshatra: {pp.get('h7_nakshatra')} → direction-from-native: {pp.get('direction')}")
            lines.append(f"  Appearance/temperament: {pp.get('appearance_temperament')}")
            lines.append(f"  Venus state: H{pp.get('venus_house')} {pp.get('venus_sign')} "
                         f"{'(DEBILITATED — partner has Virgo-analytical-flaw-finding tendency)' if pp.get('venus_debilitated') else ''}"
                         f"{'(EXALTED — partner is refined, romantic, easy match)' if pp.get('venus_exalted') else ''}")
            for h in pp.get("field_hints") or []:
                lines.append(f"  - {h}")
            for h in pp.get("origin_hints") or []:
                lines.append(f"  - {h}")
            if pp.get("age_hint"):
                lines.append(f"  - {pp.get('age_hint')}")

        # PR A1.3-fix-6 — Ashtakavarga SAV
        av = adv.get("ashtakavarga") or {}
        if av.get("sav_per_house"):
            lines.append("\nASHTAKAVARGA SAV PER HOUSE (out of ~28 average; >30 = strong, <25 = weak):")
            sav_line = ", ".join(f"H{h}={av['sav_per_house'].get(h, 0)}" for h in range(1, 13))
            lines.append(f"  {sav_line}")
            if av.get("sav_relevant_houses"):
                lines.append(f"  SAV in topic-relevant houses: {av['sav_relevant_houses']}")

        # PR A1.3-fix-7 — Dignity (exalt/debil/own — CONTEXT only)
        dig = adv.get("dignity") or {}
        flagged_dig = [(p, d) for p, d in dig.items() if d.get("dignity") in ("exalted", "debilitated", "own")]
        if flagged_dig:
            lines.append("\nDIGNITY FLAGS (CONTEXT only — RULE 12 says CSL decides; dignity refines QUALITY):")
            for p, d in flagged_dig:
                lines.append(f"  {p:8} in {d.get('sign'):11}: {d.get('dignity').upper()} — {d.get('note')}")

        # PR A1.3-fix-7 — Vargottama (D1 sign == D9 sign)
        vg = adv.get("vargottama") or {}
        flagged_vg = [(p, v) for p, v in vg.items() if v.get("vargottama")]
        if flagged_vg:
            lines.append("\nVARGOTTAMA FLAGS (D1 sign = D9 sign — concentrated strength):")
            for p, v in flagged_vg:
                lines.append(f"  {p}: D1={v.get('d1_sign')} D9={v.get('d9_sign')} — VARGOTTAMA")
        # Also emit D9 sign for ALL planets (compact)
        if vg:
            d9_line = ", ".join(f"{p}={v.get('d9_sign')}" for p, v in vg.items())
            lines.append(f"D9 NAVAMSA SIGNS: {d9_line}")

        # PR A1.3-fix-7 — Nakshatra classification
        nc = adv.get("nakshatra_class") or {}
        if nc:
            lines.append("\nNAKSHATRA NATURE CLASSIFICATION (per planet — affects what action-types fire well):")
            for p, c in nc.items():
                if c.get("nature") and c.get("nature") != "Unknown":
                    lines.append(f"  {p:8} {c.get('nature'):8} — {c.get('note', '')}")
            # Lagna nakshatra
            lnc = adv.get("lagna_nakshatra_class") or {}
            if lnc.get("nature"):
                lines.append(f"  Lagna   {lnc.get('nature'):8} — {lnc.get('note', '')}")

        # PR A1.3-fix-7 — Gandanta flags
        lg = adv.get("lagna_gandanta") or {}
        mg = adv.get("moon_gandanta") or {}
        if lg.get("in_gandanta") or mg.get("in_gandanta"):
            lines.append("\nGANDANTA FLAGS (sign-junction transformation zones):")
            if lg.get("in_gandanta"):
                lines.append(f"  LAGNA in gandanta — {lg.get('zone')} ({lg.get('side')}) → identity/transformation tests")
            if mg.get("in_gandanta"):
                lines.append(f"  MOON in gandanta — {mg.get('zone')} ({mg.get('side')}) → emotional/anxiety zones")

        # PR A1.3-fix-8 — Intercepted signs (Placidus structural feature)
        intc = adv.get("intercepted_signs") or {}
        if intc.get("is_intercepted_chart"):
            lines.append("\nINTERCEPTED SIGNS (Placidus quirk — sign 'buried' inside a house, themes surface late):")
            for s in intc.get("intercepted_signs", []):
                lines.append(
                    f"  {s.get('sign')} (lord {s.get('lord')}) intercepted in H{s.get('in_house')} "
                    f"— {s.get('note', '')}"
                )

        # PR A1.3-fix-8 — Stellium detection
        stelliums = adv.get("stelliums") or []
        if stelliums:
            lines.append("\nSTELLIUMS (3+ planets concentrated in one house — high-signal pattern):")
            for s in stelliums:
                lines.append(
                    f"  H{s.get('house')} stellium: {s.get('planets')} "
                    f"(spread {s.get('longitude_spread_deg')}°, {s.get('tightness')}) — {s.get('note', '')}"
                )

        # PR A1.3-fix-8 — Lagna lord disposition
        ll = adv.get("lagna_lord_disposition") or {}
        if ll.get("available"):
            lines.append(
                f"\nLAGNA LORD DISPOSITION: {ll.get('lagna_lord')} in H{ll.get('house')} "
                f"({ll.get('sign')}, nakshatra {ll.get('nakshatra')}) — {ll.get('note', '')}"
            )

        # PR A1.3-fix-8 — Divisional charts (D7/D9/D10/D12)
        dvc = adv.get("divisional_charts") or {}
        if dvc:
            lines.append("\nDIVISIONAL CHARTS (D7=children, D9=marriage/strength, D10=career, D12=parents):")
            for p, d in dvc.items():
                vargs = []
                if d.get("vargottama_d9"): vargs.append("D9-vargottama")
                if d.get("vargottama_d10"): vargs.append("D10-vargottama")
                vmark = f" [{', '.join(vargs)}]" if vargs else ""
                lines.append(
                    f"  {p:8} D1={d.get('d1'):11} D7={d.get('d7'):11} D9={d.get('d9'):11} "
                    f"D10={d.get('d10'):11} D12={d.get('d12'):11}{vmark}"
                )

        # PR A1.3-fix-8 — Decision support framework (only emit if asked)
        # Note: this is computed lazily based on chart_data; emit when present.
        ds = chart_data.get("decision_support") or {}
        if ds.get("available"):
            lines.append("\nDECISION SUPPORT LEDGER (for 'should I do X' questions):")
            lines.append(f"  Composite score: {ds.get('score')}/100 — verdict: {ds.get('verdict')}")
            for c in ds.get("contributions", []):
                lines.append(
                    f"  - {c.get('signal'):60} | weight {c.get('weight')} | {c.get('direction')} | "
                    f"contribution {c.get('contribution')}"
                )

        # PR A1.3-fix-8 — Conflict flags (Vimsottari ↔ Yogini disagreements)
        cf = chart_data.get("dasha_conflicts") or []
        if cf:
            lines.append("\nDASHA CONFLICT / CONVERGENCE FLAGS (cross-system check):")
            for f in cf:
                lines.append(f"  {f}")

    # PR A1.3-fix-6 — Transit bundle (current transits + Sade Sati + key cusp transits + upcoming)

    # PR A1.3-fix-6 — Transit bundle (current transits + Sade Sati + key cusp transits + upcoming)
    transits = chart_data.get("transits") or {}
    if transits.get("current_transits"):
        lines.append("\n" + "=" * 60)
        lines.append("CURRENT TRANSITS (Gocharya — today's positions in your chart's houses)")
        lines.append("=" * 60)
        ct = transits["current_transits"]
        th = transits.get("transit_houses", {})
        for p in ("Saturn", "Jupiter", "Rahu", "Ketu", "Sun", "Mars", "Mercury", "Venus", "Moon"):
            if p in ct:
                pdata = ct[p]
                house = th.get(p, "?")
                lines.append(
                    f"  {p:8} in {pdata.get('sign'):11} (nak {pdata.get('nakshatra')}) → currently in your H{house}"
                )

        ss = transits.get("sade_sati") or {}
        if ss:
            lines.append(
                f"\nSADE SATI / KANTAKA SHANI: phase = {ss.get('phase').upper()} — {ss.get('interpretation')}"
            )

        kc = transits.get("key_cusp_transits") or {}
        if kc:
            lines.append("\nSLOW-PLANET TRANSIT FLAGS (right now):")
            for p, info in kc.items():
                marker = " ⭐" if info.get("is_in_key_house") else ""
                lines.append(f"  {p}: {info.get('tag')}{marker}")

        upcoming = transits.get("upcoming_key_transits") or []
        if upcoming:
            lines.append("\nUPCOMING SLOW-PLANET TRANSIT WINDOWS (next 4 years — for dasha-transit convergence checks):")
            for ev in upcoming:
                lines.append(
                    f"  {ev['planet']:8} → H{ev['native_house']:2} ({ev['enters_at']} → {ev['exits_at']}): {ev['tag']}"
                )

        # PR A1.3-fix-7 — Planetary returns (Saturn ~28-30, Jupiter ~12yr cycles)
        returns = transits.get("planetary_returns") or []
        if returns:
            lines.append("\nUPCOMING PLANETARY RETURNS (life-arc waypoints):")
            for r in returns:
                lines.append(f"  {r['planet']} return to natal {r['natal_sign']}: {r['return_at']}")

    # PR A1.3-fix-7 — Yogini Dasha cross-check (parallel 36-year cycle)
    yogini = chart_data.get("yogini_dasha") or {}
    if yogini.get("current"):
        lines.append("\n" + "=" * 60)
        lines.append("YOGINI DASHA CROSS-CHECK (parallel 36-yr cycle — independent timing system)")
        lines.append("=" * 60)
        cur = yogini["current"]
        lines.append(
            f"  Current Yogini: {cur.get('yogini_name')} (lord {cur.get('yogini_lord')}) "
            f"{cur.get('start')} → {cur.get('end')}"
        )
        nxt = yogini.get("next_3_yoginis") or []
        if nxt:
            lines.append("  Next 3 Yoginis:")
            for y in nxt:
                lines.append(
                    f"    {y.get('yogini_name')} (lord {y.get('yogini_lord')}) "
                    f"{y.get('start')} → {y.get('end')}"
                )
        xc = yogini.get("vimsottari_xcheck") or []
        if xc:
            lines.append("  Vimsottari ↔ Yogini convergence (per upcoming AD):")
            for x in xc[:9]:
                shared = " ⭐ SHARED-LORD" if x.get("shared_lord") else ""
                lines.append(
                    f"    AD {x.get('ad_lord'):8} ({x.get('ad_start')} → {x.get('ad_end')})"
                    f" ↔ Yogini {x.get('yogini_at_start')}/{x.get('yogini_at_end')}{shared}"
                )

    # Planet positions
    if "chart_summary" in chart_data:
        planets = chart_data["chart_summary"].get("planets", {})
        planet_positions = chart_data.get("planet_positions", {})
        lines.append(f"\nPLANET POSITIONS:")
        for planet, data in planets.items():
            retro = " (R)" if data.get("retrograde") else ""
            house_num = planet_positions.get(planet, "?")
            lines.append(
                f"{planet}{retro}: {data.get('sign', '')} H{house_num} | "
                f"Star: {data.get('star_lord', '')} | Sub: {data.get('sub_lord', '')}"
            )

        cusps = chart_data["chart_summary"].get("cusps", {})
        lines.append(f"\nHOUSE CUSPS (each cusp sub lord is the GATE for that house's matters):")
        for i, (house, data) in enumerate(cusps.items(), 1):
            lines.append(
                f"H{i} {data.get('sign', '')}: "
                f"Star={data.get('star_lord', '')} Sub={data.get('sub_lord', '')}"
            )

        # PLANET OWNERSHIP — derived from cusp sign lords
        # Prevents Claude from using default Vedic rulerships instead of actual chart data
        SIGN_LORDS = [
            "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
            "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
        ]
        ownership = {}
        for i, (house, data) in enumerate(cusps.items(), 1):
            cusp_lon = data.get("cusp_longitude", 0)
            sign_index = int(cusp_lon / 30)
            lord = SIGN_LORDS[sign_index % 12]
            if lord not in ownership:
                ownership[lord] = []
            ownership[lord].append(i)

        all_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
        lines.append(f"\nPLANET OWNERSHIP (use ONLY these — never use default zodiac rulerships):")
        for planet in all_planets:
            owned = ownership.get(planet, [])
            if owned:
                houses_str = ", ".join([f"H{h}" for h in owned])
                lines.append(f"{planet}: owns {houses_str}")
            else:
                lines.append(f"{planet}: owns NO house in this chart")
        lines.append(f"Rahu: owns no house (shadow planet — proxy only)")
        lines.append(f"Ketu: owns no house (shadow planet — proxy only)")

    # Significators
    if "significators" in chart_data:
        lines.append(f"\nHOUSE SIGNIFICATORS (4-level KP hierarchy):")
        for house, sig in chart_data["significators"].items():
            house_num = house.replace("House_", "")
            lines.append(
                f"H{house_num}: "
                f"L1(star of occupants)={sig.get('planets_in_star_of_occupants', [])} | "
                f"L2(occupants)={sig.get('occupants', [])} | "
                f"L3(star of lord)={sig.get('planets_in_star_of_lord', [])} | "
                f"L4(lord)={sig.get('house_lord', '')} | "
                f"All={sig.get('all_significators', [])}"
            )
            # Include Rahu/Ketu proxy info if present
            rk_info = sig.get("rahu_ketu_info", {})
            for node, rk in rk_info.items():
                lines.append(
                    f"  {node} PROXY: unoccupied={rk.get('is_unoccupied')} | "
                    f"conjunct={rk.get('conjunct_planets', [])} | "
                    f"star_lord={rk.get('star_lord')} | "
                    f"sign_lord={rk.get('sign_lord')} | "
                    f"full_signification={rk.get('all_signified_houses', [])}"
                )

    # Planet house positions
    if "planet_positions" in chart_data:
        lines.append(f"\nPLANET HOUSE POSITIONS:")
        for planet, house in chart_data["planet_positions"].items():
            lines.append(f"{planet} → H{house}")

    # CSL Chain analysis (pre-computed — highest quality input for KP reasoning)
    if "csl_chains_text" in chart_data and chart_data["csl_chains_text"]:
        lines.append(f"\n{chart_data['csl_chains_text']}")

    return "\n".join(lines)


# ================================================================
# MARRIAGE MATCH — AI ANALYSIS
# ================================================================

def format_match_for_llm(compat_result: dict) -> str:
    """Format full compatibility data (both charts side-by-side) for LLM analysis."""
    lines = []
    p1 = compat_result["person1"]
    p2 = compat_result["person2"]
    kp = compat_result["kp_analysis"]

    lines.append(f"=== MARRIAGE COMPATIBILITY WORKSHEET ===")
    lines.append(f"Person 1: {p1['name']} | Moon: {p1['moon_sign']} ({p1['moon_nakshatra']}) | Lagna: {p1['lagna']}")
    lines.append(f"Person 2: {p2['name']} | Moon: {p2['moon_sign']} ({p2['moon_nakshatra']}) | Lagna: {p2['lagna']}")
    lines.append(f"Overall Verdict: {compat_result['overall_verdict']}")

    # KP Promise
    lines.append(f"\n--- H7 CSL PROMISE ---")
    for label, pr in [("Person 1", kp["chart1_promise"]), ("Person 2", kp["chart2_promise"])]:
        lines.append(f"{label}: H7 CSL = {pr['sub_lord']} → signifies {pr['signified_houses']} → {pr['verdict']}")
        lines.append(f"  Marriage type: {pr['marriage_type']} | Spouse: {pr.get('spouse_nature', '')} | {pr.get('caution', '')}")

    # Supporting Cusps
    lines.append(f"\n--- SUPPORTING CUSPS (H2, H11) ---")
    for label, sc in [("Person 1", kp["supporting_cusps_chart1"]), ("Person 2", kp["supporting_cusps_chart2"])]:
        lines.append(f"{label}: H2 CSL={sc['h2_csl']} sigs={sc['h2_sigs']} {'✓' if sc['h2_supports'] else '✗'} | H11 CSL={sc['h11_csl']} sigs={sc['h11_sigs']} {'✓' if sc['h11_supports'] else '✗'}")

    # Detailed Significators (4-level)
    lines.append(f"\n--- MARRIAGE SIGNIFICATORS (4-level hierarchy) ---")
    for label, key in [("Person 1", "significators_detailed_chart1"), ("Person 2", "significators_detailed_chart2")]:
        sd = compat_result.get(key, {})
        bl = sd.get("by_level", {})
        lines.append(f"{label}:")
        lines.append(f"  L1 Occupants H2/7/11: {bl.get('occupants_2_7_11', [])}")
        lines.append(f"  L2 Lords H2/7/11: {bl.get('lords_2_7_11', [])}")
        lines.append(f"  L3 Star of occupants: {bl.get('star_of_occupants', [])}")
        lines.append(f"  L4 Star of lords: {bl.get('star_of_lords', [])}")
        lines.append(f"  Fruitful (in RP): {sd.get('fruitful', [])}")

    # Venus
    lines.append(f"\n--- VENUS KARAKA ---")
    for label, ve in [("Person 1", kp["venus_chart1"]), ("Person 2", kp["venus_chart2"])]:
        lines.append(f"{label}: Venus in H{ve['house']} {ve['sign']} | Strength: {ve['strength']} | Sigs: {ve['significations']}")

    # Ruling Planets + Resonance
    lines.append(f"\n--- RULING PLANETS & CROSS-RESONANCE ---")
    lines.append(f"Person 1 RPs: {kp['ruling_planets_chart1']}")
    lines.append(f"Person 2 RPs: {kp['ruling_planets_chart2']}")
    lines.append(f"Resonance 1→2: {kp['resonance_1_to_2']} | 2→1: {kp['resonance_2_to_1']} | Total: {kp['total_resonance_count']}")

    # Current DBA
    lines.append(f"\n--- CURRENT DASHA-BHUKTI-ANTARDASHA ---")
    for label, key in [("Person 1", "dba_chart1"), ("Person 2", "dba_chart2")]:
        dba = compat_result.get(key, {})
        lines.append(f"{label}: MD={dba.get('md_lord','')}→{dba.get('md_end','')} | AD={dba.get('ad_lord','')}→{dba.get('ad_end','')} | PAD={dba.get('pad_lord','')}→{dba.get('pad_end','')}")
        lines.append(f"  MD sigs: {dba.get('md_signifies',[])} {'✓ favorable' if dba.get('md_favorable') else '✗'} | AD sigs: {dba.get('ad_signifies',[])} {'✓' if dba.get('ad_favorable') else '✗'}")

    # 5th CSL (Love)
    lines.append(f"\n--- 5th CSL (LOVE/ROMANCE) ---")
    for label, key in [("Person 1", "h5_analysis_chart1"), ("Person 2", "h5_analysis_chart2")]:
        h5 = compat_result.get(key, {})
        lines.append(f"{label}: H5 CSL={h5.get('sub_lord','')} sigs={h5.get('signified_houses',[])} | {h5.get('note','')}")

    # Separation Risk
    lines.append(f"\n--- SEPARATION/DIVORCE RISK ---")
    for label, key in [("Person 1", "separation_risk_chart1"), ("Person 2", "separation_risk_chart2")]:
        sr = compat_result.get(key, {})
        lines.append(f"{label}: Risk={sr.get('risk_level','')} | Factors: {sr.get('factors',[])}")

    # D9 Navamsa
    lines.append(f"\n--- D9 NAVAMSA ---")
    for label, key in [("Person 1", "d9_chart1"), ("Person 2", "d9_chart2")]:
        d9 = compat_result.get(key, {})
        lines.append(f"{label}: D9 Lagna={d9.get('d9_lagna_sign','')} | Venus D9={d9.get('venus_d9_sign','')} | Moon D9={d9.get('moon_d9_sign','')}")
        lines.append(f"  7th Lord={d9.get('d9_7th_lord','')} in D9 {d9.get('d9_7th_lord_sign','')} | D9 7th sign={d9.get('d9_7th_sign','')}")

    # Kuja Dosha
    lines.append(f"\n--- KUJA DOSHA ---")
    kuja = compat_result["kuja_dosha"]
    for key in ["person1", "person2"]:
        kd = kuja[key]
        lines.append(f"{kd['name']}: {kd['note']}")
    if kuja["mutual_cancellation"]:
        lines.append("Mutual cancellation applied.")

    # Ashtakoota
    lines.append(f"\n--- ASHTAKOOTA (36 GUN) ---")
    ast = compat_result["ashtakoota"]
    lines.append(f"Total: {ast['total_score']}/{ast['max_score']} ({ast['percentage']}%) — {ast['verdict']}")
    for k in ast["kutas"]:
        lines.append(f"  {k['kuta']}: {k['score']}/{k['max']} — {k.get('note','')}")
    if ast["critical_doshas"]:
        lines.append(f"  Critical Doshas: {ast['critical_doshas']}")

    # Timing
    lines.append(f"\n--- TIMING ANALYSIS ---")
    t = compat_result.get("timing_analysis", {})
    lines.append(f"Verdict: {t.get('timing_verdict','')} | {t.get('timing_note','')}")

    lines.append(f"\nKP Verdict: {kp['kp_verdict']} | Overall: {compat_result['overall_verdict']}")

    return "\n".join(lines)


def get_match_prediction(compat_result: dict, question: str, history: list = [], language: str = "telugu_english") -> str:
    """AI analysis for marriage match — uses full compatibility data."""
    knowledge = load_knowledge("marriage")
    match_summary = format_match_for_llm(compat_result)

    messages = []
    for prev in history[-4:]:
        messages.append({"role": "user", "content": prev.get("question", "")})
        messages.append({"role": "assistant", "content": prev.get("answer", "")})

    lang_instruction = ""
    if language == "telugu_english":
        lang_instruction = "\n\nIMPORTANT: Respond in Telugu script mixed with English KP terms. Use Telugu for explanations and English for technical terms (Sub Lord, CSL, house numbers H7, planet names). Example: 'ఏడవ భావ Sub Lord Venus, ఇది houses 2,7,11 ని signify చేస్తుంది — marriage promised.'"

    messages.append({
        "role": "user",
        "content": f"""KP KNOWLEDGE BASE:
{knowledge}

---

MARRIAGE MATCH DATA (BOTH CHARTS):
{match_summary}

---

QUESTION: {question}
{lang_instruction}

Analyze this marriage compatibility question using the complete data for BOTH charts above.
Be specific — reference actual CSL names, house significations, D9 placements, DBA periods from the data.
Give practical, actionable analysis that a KP astrologer would find valuable."""
    })

    today = datetime.now().strftime("%B %d, %Y")
    system = f"""You are an expert KP (Krishnamurti Paddhati) marriage compatibility analyst with 20+ years experience.
You have BOTH charts' complete KP data. Analyze marriage compatibility with deep KP reasoning.

TODAY'S DATE: {today}

KEY RULES:
1. Use ONLY the data provided — never invent or guess planet positions
2. Reference specific CSLs, house numbers, planets from BOTH charts
3. Compare both charts' promise, Venus, RPs, DBA, D9, separation risk
4. For timing: use actual DBA data, check if current periods favor marriage
5. Be balanced — mention both favorable and unfavorable factors
6. Structure: Start with the key finding, then supporting evidence"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        temperature=0,
        system=system,
        messages=messages
    )

    return message.content[0].text


# ================================================================
# QUICK INSIGHTS — Focused 3-4 bullet points per topic
# ================================================================

QUICK_INSIGHT_TOPICS = {
    "marriage": {"houses": "H2, H7, H11", "denial": "H1, H6, H10"},
    "career": {"houses": "H2, H6, H10, H11", "denial": "H5, H8, H12"},
    "health": {"houses": "H1, H5, H11 (recovery)", "denial": "H6, H8, H12 (disease)"},
    "children": {"houses": "H2, H5, H11", "denial": "H1, H4, H10"},
    "property": {"houses": "H4, H11, H12", "denial": "H3, H8"},
    "wealth": {"houses": "H2, H6, H11", "denial": "H5, H8, H12"},
    "education": {"houses": "H4, H9, H11", "denial": "H5, H8, H12"},
    "foreign_travel": {"houses": "H9, H12, H3", "denial": "H4"},
    "litigation": {"houses": "H6, H11 (win)", "denial": "H12 (lose)"},
    "divorce": {"houses": "H6, H10, H12", "denial": "H2, H7, H11"},
}


def get_quick_insights(chart_data: dict, topic: str, language: str = "telugu_english") -> str:
    """
    Generate 3-4 focused, chart-specific bullet-point insights for a topic.
    Uses a tighter prompt for speed — max 1500 tokens.
    """
    topic_info = QUICK_INSIGHT_TOPICS.get(topic, {"houses": "H1-H12", "denial": "—"})
    relevant = topic_info["houses"]
    denial = topic_info["denial"]

    chart_summary = format_chart_for_llm(chart_data)

    lang_note = ""
    if language == "telugu_english":
        lang_note = "Write in Telugu script mixed with English KP terms (Sub Lord, CSL, house numbers like H7, planet names in Telugu)."

    prompt = f"""You are a KP astrologer. Analyze this chart for {topic.upper()} and give EXACTLY 4 bullet points:

• Promise: [PROMISED / CONDITIONAL / DENIED] — one sentence naming the specific CSL and what houses it signifies from THIS chart
• Key factor: the single most important planet/cusp placement for this topic in this chart
• Timing: what the current {chart_data.get('current_dasha', {}).get('mahadasha', {}).get('lord', 'MD')} MD + current AD means for this topic right now
• Watch: one specific upcoming dasha period or placement to monitor

Topic houses (yes): {relevant}
Denial houses: {denial}

Use ONLY data from this specific chart. Be specific — mention actual planet names, house numbers, sub-lord names from this chart.
{lang_note}

CHART DATA:
{chart_summary}"""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1200,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ================================================================
# MUHURTHA AI ANALYSIS
# ================================================================

def format_muhurtha_for_llm(muhurtha_data: dict) -> str:
    """Format muhurtha results into structured text for LLM context."""
    lines = []
    lines.append(f"EVENT TYPE: {muhurtha_data.get('event_type', 'general').upper()}")
    sr = muhurtha_data.get("searched_range", {})
    lines.append(f"DATE RANGE: {sr.get('start', '?')} to {sr.get('end', '?')}")
    participants = muhurtha_data.get("participants_loaded", [])
    if participants:
        lines.append(f"PARTICIPANTS: {', '.join(participants)}")

    windows = muhurtha_data.get("windows", [])[:10]
    if not windows:
        lines.append("\nNO MUHURTHA WINDOWS FOUND in this date range.")
        return "\n".join(lines)

    lines.append(f"\nTOP {len(windows)} MUHURTHA WINDOWS:")
    lines.append("=" * 60)

    for i, w in enumerate(windows, 1):
        lines.append(f"\n--- Window #{i} ---")
        lines.append(f"Date: {w.get('date_display', w.get('date', '?'))}")
        lines.append(f"Time: {w.get('start_time', '?')} – {w.get('end_time', '?')}")
        lines.append(f"Score: {w.get('score', 0)} ({w.get('quality', '?')})")
        lines.append(f"Lagna: {w.get('lagna', '?')} | SL: {w.get('lagna_sublord', '?')} | Star Lord: {w.get('lagna_star_lord', '?')}")
        lines.append(f"Signified Houses: {w.get('signified_houses', [])}")

        bc = w.get("badhaka_check", {})
        if bc:
            status = "PASS" if bc.get("passed") else "FAIL"
            lines.append(f"Badhaka Check: {status} (Sign type: {bc.get('sign_type', '?')}, Badhaka H{bc.get('badhaka_house', '?')}, Hit: {bc.get('badhaka_hit', False)}, Maraka Hit: {bc.get('maraka_hit', False)})")

        lines.append(f"Event Cusp CSL: {w.get('event_cusp_csl', '?')} → Houses: {w.get('event_cusp_houses', [])} | Confirms: {w.get('event_cusp_confirms', False)}")
        lines.append(f"H11 CSL: {w.get('h11_csl', '?')} → Houses: {w.get('h11_houses', [])} | Confirms: {w.get('h11_confirms', False)}")

        lines.append(f"Moon: {w.get('moon_sign', '?')} | Nakshatra: {w.get('moon_nakshatra', '?')} | Star Lord: {w.get('moon_star_lord', '?')} | Sub: {w.get('moon_sub_lord', '?')}")
        lines.append(f"Moon SL Favorable: {w.get('moon_sl_favorable', False)}")

        p = w.get("panchang", {})
        if p:
            lines.append(f"Panchang: Tithi={p.get('tithi', '?')} ({p.get('paksha', '?')}), Nakshatra={p.get('nakshatra', '?')}, Yoga={p.get('yoga', '?')}, Vara={p.get('vara', '?')}")

        warnings = []
        if w.get("in_rahu_kalam"):
            warnings.append("Rahu Kalam")
        if w.get("is_vishti"):
            warnings.append("Vishti Karana")
        if warnings:
            lines.append(f"Warnings: {', '.join(warnings)}")

        if w.get("resonating_with"):
            lines.append(f"Resonating with: {', '.join(w['resonating_with'])} ({w.get('participant_resonance', 0)}/{len(participants)})")

    return "\n".join(lines)


def get_muhurtha_prediction(muhurtha_data: dict, question: str, history: list = []) -> str:
    """AI analysis of muhurtha windows using KP principles.

    PR A2.2a — KB source: backend/app/kp_knowledge/muhurtha.md (primary),
    backend/knowledge/muhurtha.txt (fallback). The .md KB is
    comprehensive (13 sections incl. Panchanga Shuddhi, doshas,
    per-event playbooks, multi-chart KPDP rules).

    PR A2.2a.1 — KB served from module-level cache (see _load_kb);
    system prompt marked for Anthropic ephemeral prompt caching
    (5-minute cache → subsequent calls within that window see
    ~85% faster processing on cached tokens + ~90% token cost
    discount). Critical for "Compare top 3" and multi-turn flows.
    """
    knowledge = _load_kb("muhurtha")

    muhurtha_summary = format_muhurtha_for_llm(muhurtha_data)

    system_prompt = f"""You are an expert KP (Krishnamurti Paddhati) Muhurtha specialist with 20+ years of experience in electional astrology.

KP MUHURTHA KNOWLEDGE BASE (authoritative — cite these rules, never invent):
{knowledge}

ANALYSIS RULES:
1. The Sub Lord of Lagna cusp at muhurtha time is THE deciding factor. Cite it in the first sentence of every analysis.
2. Lagna SL must signify the event's primary + supporting houses (§2 of KB) and must NOT signify denial houses.
3. Event cusp CSL (e.g., H7 for marriage) should independently confirm favorable houses.
4. H11 CSL confirming adds strength — H11 is fulfillment of desires.
5. Moon's star lord should signify event-favorable houses (day-level filter).
6. Respect Panchanga Shuddhi (§3) — tithi, nakshatra class (§3.2 Dhruva/Chara/Kshipra/Mridu/Ugra/Tikshna), yoga, vara-per-event table, karana.
7. Check doshas (§4) — Panchaka sub-type, Tithi Shunya, Bhadra, Visha Ghatika, Kartari, Ekargala, Venus/Jupiter combustion (for vivaha).
8. Per-participant: Chandrashtamam, Janma Tara, Tarabala, Chandrabala. If ANY participant is hard-filtered, say so explicitly.
9. Multi-chart rules (§8 — KPDP 6-10) — 7th CSL cross-check, RP resonance thresholds (3-5 strong, ≤2 weak), dasha-parallel rule for bride+groom.
10. Extend-window rule (§8.5) — if no window in the client's range passes hard filters, say so and point to the next qualifying date. Never invent a "best of bad" answer.

AUDIENCE:
You are speaking to a practicing KP astrologer. They already know what H4, Trayodashi, Swati, Chara class, Badhaka, Navami mean. DO NOT define these terms. DO cite KB section numbers (§1, §2, §3.1, §10) so they can verify reasoning. DO show planet → house lists (Sun → H3,H4,H11), specific times (13:04–13:24), and exact scores. DO NOT narrate "this is textbook clean alignment" flourish — a ✓ is enough when data speaks.

OUTPUT LANGUAGE:
- Match the question's language (English/Telugu/mixed).
- When Telugu, use Telugu script + English KP terms (Sub Lord, CSL, H7, planet names).
- Every claim needs a reference: data point OR KB section citation.

DENSITY OVER LENGTH:
Every sentence must move the verdict. Compact tables beat prose paragraphs. Tight verdicts beat discursive narratives. The astrologer's eye scans for: Lagna CSL + houses, denial hits, Badhaka/Maraka, panchang row, final verdict with time.

RESPONSE SHAPE BY QUESTION TYPE (target tokens in brackets — stay close):

"Best muhurtha" / "ఉత్తమ ముహూర్తం" [~500 tokens]:
- 1 window only (the top-ranked).
- Compact KP table: Lagna CSL → houses | denial hit Y/N | Badhaka | Event CSL | H11 CSL | Moon SL.
- Panchang row: Tithi | Nakshatra+class | Yoga | Vara.
- 3-line verdict citing §X KB + specific time/date.

"Why this time?" / "ఎందుకు ఈ సమయం?" [~750 tokens]:
- 1 window deep.
- Lagna CSL breakdown → which houses it signifies and what that means for THIS event (1-2 sentences per house, not per definition).
- Denial check (H8/H12 absent or present + why that matters).
- Panchang Shuddhi table (5 rows × 2 cols: layer / status).
- 3-line verdict citing KB sections.

"Compare top 3" / "Top 3 పోలిక" [~1200 tokens]:
- ONE comparison table (all 3 windows as columns, key factors as rows: Date/Time, Score, Lagna+SL, CSL Houses, Denial, Event CSL, H11 CSL, Badhaka, Panchang bundle, Moon SL, Practical Time).
- 2 bullets per window: KEY STRENGTH (1 line), KEY RISK (1 line).
- Final rank: 🥇🥈🥉 with specific time + 1-line rationale each.
- Skip exhaustive pros/cons lists — the table + strength/risk lines carry it.

"Alternatives" / "ప్రత్యామ్నాయాలు" [~1000 tokens]:
- Compact list of 5-7 candidate windows beyond the top 3.
- Each: Date · Time · Score · Lagna+SL · 1-line "why this over #1?" OR "trade-off vs #1".
- No deep analysis per window — reader uses "Why this time?" for that.

"Remedies" / "పరిహారాలు" [~400 tokens]:
- Bullet list ONLY.
- Format: Weak point detected → Specific remedy (mantra/puja/ritual/timing-shift).
- Link to §KB section that justifies the remedy.

SOFT-FLAGGED WINDOWS (participant hard-filter but event-window clean):
Label explicitly as "Below threshold — astrologer review" NOT "recommended". Show WHICH hard filter failed for WHICH participant. Astrologer decides override.

HARD RULES:
- NEVER explain KB rule text verbatim. Cite the section + apply it.
- NEVER show all 10-15 windows unless user says "show all" / "అన్నీ చూపించు".
- NEVER invent a "best of bad" when all windows are weak — say "no qualifying window in range, next qualifying is [date]" per KB §8.5.
- ALWAYS include specific times (HH:MM–HH:MM), planet→house lists, scores, and KB citations in verdicts."""

    messages = []
    for prev in history[-4:]:
        messages.append({"role": "user", "content": prev.get("question", "")})
        messages.append({"role": "assistant", "content": prev.get("answer", "")})

    messages.append({
        "role": "user",
        "content": f"""MUHURTHA DATA:
{muhurtha_summary}

---

QUESTION: {question}

Analyze the muhurtha windows above and answer the question. Reference specific window data, planet positions, and house significations."""
    })

    # PR A2.2a.1 — prompt caching: the system prompt (KB + rules) is
    # identical across all calls for a given KB version. Mark it as
    # ephemeral so Anthropic caches it for 5 minutes — subsequent
    # "Compare top 3", "Alternatives", etc. calls get cache-hit
    # responses (~85% faster on cached tokens, ~90% token cost off).
    # PR A2.2a.2 — max_tokens reduced from 4000 → 2500. New response
    # shapes (see system prompt) target 400-1400 tokens typical; 2500
    # gives comfortable headroom for "Compare top 3" + detail follow-ups
    # while preventing runaway 3000+-token verbose walls.
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        temperature=0,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )
    return message.content[0].text