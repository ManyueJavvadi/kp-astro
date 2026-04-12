import os
import anthropic
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ================================================================
# KNOWLEDGE BASE LOADER
# ================================================================

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge")

TOPIC_TO_FILE = {
    "marriage": "marriage.txt",
    "job": "job.txt",
    "foreign_travel": "foreign.txt",
    "foreign_settle": "foreign.txt",
    "education": "other_topics.txt",
    "children": "other_topics.txt",
    "property": "other_topics.txt",
    "wealth": "other_topics.txt",
    "litigation": "other_topics.txt",
    "health": "health.txt",
    "divorce": "divorce.txt",
}

# Advanced KP files always loaded alongside topic-specific file
ADVANCED_FILES = ["kp_csl_theory.txt", "timing_confirmation.txt", "planet_natures.txt"]

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
    # Always load advanced KP theory files
    for adv_file in ADVANCED_FILES:
        adv_path = os.path.join(KNOWLEDGE_DIR, adv_file)
        try:
            with open(adv_path, "r", encoding="utf-8") as f:
                section_name = adv_file.replace(".txt", "").upper().replace("_", " ")
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

RULE 5 — PROMISE VERDICT — EXACT KP RULES (NEVER DEVIATE FROM THESE):

UNIVERSAL "ANY ONE" THRESHOLD:
For ANY topic, the event is PROMISED if the sub lord of the primary cusp
signifies AT LEAST ONE relevant house through its complete chain.
It does NOT need to signify all relevant houses. ANY ONE is sufficient.

THREE VERDICTS:
PROMISED: Sub lord touches ANY ONE relevant house → event will happen.
CONDITIONAL: Sub lord touches relevant houses AND denial houses → event
  happens but with obstacles/delays. NOT the same as DENIED.
DENIED: Sub lord has ZERO connection to any relevant house AND only signifies
  denial houses. DENIAL IS RARE — only when truly zero relevant house touch.

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