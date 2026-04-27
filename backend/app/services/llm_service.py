import os
import anthropic
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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
    # PR A1.3 — relative-related topic aliases route to parents_family + bhavat_bhavam
    "parents": "health.txt",
    "mother": "health.txt",
    "father": "health.txt",
    "spouse": "marriage.txt",
    "siblings": "other_topics.txt",
    "general": "general.txt",
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
]

def load_knowledge(topic: str) -> str:
    general_path = os.path.join(KNOWLEDGE_DIR, "general.txt")
    topic_file = TOPIC_TO_FILE.get(topic, "general.txt")
    topic_path = os.path.join(KNOWLEDGE_DIR, topic_file)
    content = []
    try:
        with open(general_path, "r", encoding="utf-8") as f:
            content.append("=== CORE KP PRINCIPLES ===\n" + f.read())
    except:
        pass
    try:
        if topic_file != "general.txt":
            with open(topic_path, "r", encoding="utf-8") as f:
                content.append(f"=== KP RULES FOR {topic.upper()} ===\n" + f.read())
    except:
        pass
    # PR A1.3 — Topic-specific deep-dive files (children/health/profession/family).
    # Loaded only when the topic actually requires them, to keep prompt size manageable.
    for deep_file in TOPIC_DEEP_DIVE.get(topic, []):
        deep_path = os.path.join(KNOWLEDGE_DIR, deep_file)
        try:
            with open(deep_path, "r", encoding="utf-8") as f:
                section_name = deep_file.replace(".md", "").replace(".txt", "").upper().replace("_", " ")
                content.append(f"=== {section_name} (DEEP DIVE) ===\n" + f.read())
        except:
            pass
    # Always load advanced KP theory files (foundational, every query).
    for adv_file in ADVANCED_FILES:
        adv_path = os.path.join(KNOWLEDGE_DIR, adv_file)
        try:
            with open(adv_path, "r", encoding="utf-8") as f:
                section_name = adv_file.replace(".md", "").replace(".txt", "").upper().replace("_", " ")
                content.append(f"=== {section_name} ===\n" + f.read())
        except:
            pass
    return "\n\n".join(content)


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

RULE 7 — DASHA HIERARCHY MUST BE RESPECTED (MD → AD → PAD):
A favorable PAD lord CANNOT override an unfavorable AD lord.
A favorable AD lord CANNOT override a total-denier MD lord.

AD MUST SUPPORT PAD:
For an event to occur in a PAD window, the AD lord must signify the relevant
houses (at least partially). If AD lord has zero relevant house touch, NO PAD
within that AD can produce the event regardless of how strong the PAD lord is.

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

RULE 10 — NEVER INVENT SIGNIFICATIONS:
Use ONLY the house significations provided in the "HOUSE SIGNIFICATORS" section.
NEVER say "Mercury signifies H8 and H10" unless shown in the provided data.
NEVER infer significations from general KP knowledge or planet nature.
The chart data is pre-calculated and authoritative. Trust it completely.

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

RULE 17 — NATIVE PROFILE: USE GENDER + AGE PROVIDED, NEVER GUESS (PR A1.3a):
The chart data ALWAYS contains a NATIVE PROFILE block at the top with:
  - Gender (Male / Female / Other / UNKNOWN)
  - Age in years (computed today from birth_date)
  - Birth date

You MUST use these values, NOT guess them from the name.

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

RULE 11 — FOUR-STEP SUB LORD ANALYSIS:
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

================================================================
KP ANALYSIS PROCESS — FOLLOW FOR EVERY QUESTION
================================================================

STEP 1 — IDENTIFY TOPIC AND RELEVANT HOUSES
Identify topic. Get relevant houses and denial houses from RULE 5.

STEP 2 — CUSPAL SUB LORD ANALYSIS (Promise Gate)
- Get sub lord of primary cusp from HOUSE CUSPS section
- If sub lord is Rahu/Ketu: note their occupation house first, then apply
  RULE 8 proxy chain. Use the provided "full_signification" list directly.
- Apply RULE 11: trace all 4 steps. Note self-significator status.
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
For EVERY upcoming AD lord, apply the FULL 4-step Rule 11 chain:
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
For each PAD lord, apply the FULL 4-step Rule 11 chain:
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
Scan ALL upcoming AD lords. For each, apply the full 4-step Rule 11 chain before rating.
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
    prompt = f"""Identify the PRIMARY life topic in this question. Reply with ONLY the topic name.

Question: "{question}"

Choose exactly ONE from this list:
marriage / divorce / job / foreign_travel / foreign_settle / education / health / children / property / wealth / litigation

Rules:
- "buy a house" or "buy property" or "buy flat" = property
- "move abroad" or "settle in another country" or "immigrate" or "PR visa" = foreign_settle
- "visit abroad" or "travel overseas" or "go to another country" = foreign_travel
- "get married" or "when marriage" = marriage
- "divorce" or "separation" or "breakup" or "marital discord" or "split" = divorce
- "job" or "career" or "work" = job
- "sick" or "health" or "disease" = health
- "child" or "baby" or "pregnant" = children
- "study" or "education" or "degree" = education
- "money" or "wealth" or "savings" = wealth
- "court" or "case" or "lawsuit" = litigation

Reply with ONLY the single topic word."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        detected = message.content[0].text.strip().lower().split()[0]
        valid = ["marriage", "divorce", "job", "foreign_travel", "foreign_settle", "education",
                 "health", "children", "property", "wealth", "litigation"]
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

def get_prediction(chart_data: dict, question: str, history: list = [], mode: str = "user") -> str:
    detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic

    knowledge = load_knowledge(detected_topic)
    chart_summary = format_chart_for_llm(chart_data)

    # Build conversation history — pass answers only, strip time-specific question context
    # This prevents temporal anchoring from leaking between questions
    messages = []
    for prev in history[-4:]:
        # Pass previous question stripped of year/time references to prevent leakage
        clean_question = prev.get("question", "")
        messages.append({"role": "user", "content": clean_question})
        messages.append({"role": "assistant", "content": prev.get("answer", "")})

    messages.append({
        "role": "user",
        "content": f"""KP KNOWLEDGE BASE:
{knowledge}

---

CHART DATA:
{chart_summary}

---

MODE: {mode.upper()}
CURRENT QUESTION: {question}

IMPORTANT: Answer THIS question independently. Do not assume any timeframe from previous questions.
Perform complete KP analysis. Format output for {mode.upper()} mode as instructed in the system prompt."""
    })

    max_tokens = 16000 if mode == "astrologer" else 4000

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        temperature=0,
        system=get_system_prompt(),
        messages=messages
    )

    return message.content[0].text


# ================================================================
# CHART FORMATTER — Structured KP Worksheet for LLM
# ================================================================

def format_chart_for_llm(chart_data: dict) -> str:
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

    # Promise analysis
    if "promise_analysis" in chart_data:
        p = chart_data["promise_analysis"]
        lines.append(f"\nPROMISE ANALYSIS (pre-calculated):")
        lines.append(f"Relevant Houses: {p.get('relevant_houses', [])}")
        lines.append(f"Primary Cusp Sub Lord: {p.get('primary_cusp_sublord', '')}")
        lines.append(f"All Significators for Relevant Houses: {p.get('relevant_significators', [])}")
        is_promised = p.get('is_promised', False)
        strength = p.get('promise_strength', '')
        # Determine conditional vs promised vs denied
        if is_promised:
            verdict = "PROMISED"
        elif "conditional" in str(strength).lower() or "partial" in str(strength).lower():
            verdict = "CONDITIONAL"
        else:
            verdict = "DENIED"
        lines.append(f"Pre-calculation hint (VERIFY with your own cuspal analysis): {verdict} — {strength}")
        lines.append("IMPORTANT: This backend check is simplified — it may say DENIED when the real answer is CONDITIONAL. Always do your own full cuspal sub lord analysis using the house cusps and significators below. Your analysis overrides this hint.")

    # Current dasha — MD + AD + PAD
    if "current_dasha" in chart_data:
        d = chart_data["current_dasha"]
        md = d.get("mahadasha", {})
        ad = d.get("antardasha", {})
        pad = d.get("pratyantardasha", {})
        lines.append(f"\nCURRENT DASHA:")
        lines.append(f"Mahadasha: {md.get('lord')} ({md.get('start')} → {md.get('end')})")
        lines.append(f"Antardasha: {ad.get('antardasha_lord')} ({ad.get('start')} → {ad.get('end')})")
        if pad:
            lines.append(f"Pratyantardasha (PAD): {pad.get('pratyantardasha_lord')} ({pad.get('start')} → {pad.get('end')})")

    # CRITICAL — full antardasha sequence
    if "upcoming_antardashas" in chart_data:
        lines.append(f"\nFULL ANTARDASHA SEQUENCE (use ONLY these exact dates — never guess):")
        for ad in chart_data["upcoming_antardashas"]:
            lines.append(
                f"  {ad.get('antardasha_lord')}: "
                f"{ad.get('start')} → {ad.get('end')}"
            )

    # PAD sequence within current AD
    if "all_ad_pratyantardashas" in chart_data:
        lines.append(f"\nPRATYANTARDASHA SEQUENCES FOR ALL ANTARDASHAS:")
        for ad_lord, pads in chart_data["all_ad_pratyantardashas"].items():
            lines.append(f"  [{ad_lord} AD]:")
            for pad in pads:
                lines.append(
                    f"    {pad.get('pratyantardasha_lord')}: "
                    f"{pad.get('start')} → {pad.get('end')}"
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