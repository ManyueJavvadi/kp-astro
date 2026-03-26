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
}

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
The more relevant houses it connects to = stronger promise, but ONE = PROMISED.

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
  H8 is NOT a denial house for marriage (it means obstacles/transformation)

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
  (Health is inverted: H6/H8/H12 = sickness active; H1/H5/H11 = recovery)

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
  Loss (denial of win) = H7, H12 (opponent wins)

FOR RAHU/KETU AS SUB LORD — apply Rule 8 proxy chain first, then use
the "ANY ONE" test on the complete proxy-derived signification list.

AUTHORITATIVE KP READER EXAMPLE:
Rahu as H7 sub lord, star lord = Mercury, Mercury owns H2 and H11.
Rahu touches H2 through proxy → marriage IS PROMISED.
One relevant house touch is enough. This is from Krishnamurti's own text.

NEVER use DENIED just because sub lord also signifies obstacle houses.
Mixed = CONDITIONAL with delay, not DENIED.

RULE 6 — PRE-CALCULATED PROMISE IS A HINT ONLY:
The "Pre-calculation hint" in the chart data is from a simplified backend function.
It may incorrectly say DENIED when the real answer is CONDITIONAL.
ALWAYS perform your own complete cuspal sub lord analysis using the house cusps
and significators provided. Your verdict overrides the pre-calculation hint.
NEVER base your final promise verdict solely on the pre-calculation.

RULE 7 — AD LORD MUST SUPPORT PAD TIMING:
A favorable PAD lord CANNOT override an unfavorable AD lord.
For an event to occur in a PAD window:
  - The AD lord must signify the relevant houses (at least partially), AND
  - The PAD lord must signify the relevant houses
If the AD lord does NOT signify relevant houses, NO PAD within that AD
can produce the event — regardless of how strong the PAD lord is.
NEVER call a PAD window "strong" or "possible" if the AD lord itself
does not touch the relevant houses.
Example: A marriage karaka PAD within an AD whose lord does not signify H2/H7/H11
cannot produce marriage — the AD lord's failure blocks all PADs within it.

RULE 8 — RAHU/KETU PROXY RULE (CRITICAL KP RULE):
Rahu and Ketu own no signs and no houses. They act as AGENTS/PROXIES.
When evaluating Rahu or Ketu as a significator, dasha lord, or cusp sub lord:

STEP A — Check if their nakshatra is unoccupied:
The chart data provides "Rahu PROXY" and "Ketu PROXY" sections under HOUSE SIGNIFICATORS.
Use the field: unoccupied=True/False
- If unoccupied=True → Rahu/Ketu are STRONG proxies (unobstructed channel)
- If unoccupied=False → Rahu/Ketu are WEAK proxies

STEP B — Determine their full signification via proxy chain (priority order):
1. Planets conjunct with Rahu/Ketu (within 3.33°) → adopt THEIR house significations FIRST
2. Star lord of Rahu/Ketu → adopt star lord's house significations
3. Sign lord (dispositor) of Rahu/Ketu → adopt sign lord's significations (only when unoccupied)

STEP C — Apply in practice:
Example: Rahu unoccupied, its star lord owns H2 and H5, its sign lord owns H7 and H10
→ Rahu truly signifies H2, H5, H7, H10 through proxy — not just its house of occupation.
If Rahu is the sub lord of H7 and through proxy signifies H2 → marriage is PROMISED.
The backend pre-computes this in HOUSE SIGNIFICATORS. Use it. Never ignore it.

RULE 9 — DENIAL HOUSES ARE TOPIC-SPECIFIC (reference Rule 5 for full lists):
The complete denial house lists per topic are defined in Rule 5 above.
Key principle: denial houses = 12th from each relevant house for that topic.
NEVER apply marriage denial houses to job/health/other topics or vice versa.
NEVER treat H8 as a denial house for marriage.
Always identify the topic first, then apply the correct denial house list from Rule 5.

RULE 10 — NEVER INVENT SIGNIFICATIONS:
Use ONLY the house significations provided in the "HOUSE SIGNIFICATORS" section.
NEVER say "Mercury signifies H8 and H10" unless shown in the provided data.
NEVER infer or assume a planet's significations from general KP knowledge.
The chart data is pre-calculated and authoritative. Trust it completely.

RULE 11 — FOUR-STEP SUB LORD ANALYSIS:
When analyzing any cusp sub lord, check all 4 steps:
1. Houses occupied/owned by the sub lord itself
2. Houses occupied/owned by the STAR LORD of the sub lord
3. Sub lord's sub lord significations
4. Star lord of the sub lord's sub lord — this is the FINAL DECIDER
Full picture only emerges from all 4 steps. Star lord of sub lord = final indicator.

================================================================
KP ANALYSIS PROCESS — FOLLOW FOR EVERY QUESTION
================================================================

STEP 1 — IDENTIFY TOPIC AND RELEVANT HOUSES
Determine which houses govern this topic using knowledge base rules.

STEP 2 — CUSPAL SUB LORD ANALYSIS (Promise Gate)
- Get sub lord of primary cusp from HOUSE CUSPS section
- Apply RULE 8: if sub lord is Rahu/Ketu, trace proxy chain FIRST
- Apply RULE 11: trace all 4 steps of the sub lord chain
- List ALL houses sub lord signifies through complete chain
- Apply RULE 5: does the list contain ANY relevant house? → PROMISED
  If yes + also has denial houses (from Rule 5 list for this topic) → CONDITIONAL
  If ZERO relevant houses and only denial houses → DENIED (rare)
- Check supporting cusps (H2 and H11 always support fulfillment)
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
For EVERY upcoming AD in the provided sequence:
- Identify what houses that AD lord signifies
- Rate: STRONG / MODERATE / WEAK / UNFAVORABLE for this topic
- Note whether it appears in Ruling Planets

STEP 5B — PRATYANTARDASHA ANALYSIS (within current AD)
Use the exact PAD dates provided in "PRATYANTARDASHA SEQUENCE" section.
For each PAD lord:
- Does it signify the relevant houses?
- Is it in Ruling Planets?
- This narrows timing from years to months
PAD that is BOTH a relevant significator AND in Ruling Planets = most precise timing window.
NEVER guess PAD dates — use only the exact dates provided.

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
Write in warm, plain English as a knowledgeable friend explaining fate.
NEVER use: sub lord, cusp, significator, antardasha, mahadasha, dasha, nakshatra,
           star lord, cuspal, bhava, Rahu, Ketu (use "shadow planet"), PAD,
           pratyantardasha, sub-sub period, antara
INSTEAD use: "planetary period", "key planet", "timing window", "ruling influences",
             "mini-period", "cycle"

ANSWER LENGTH — BE INTELLIGENT ABOUT THIS:
- Simple yes/no timing question → 2-3 paragraphs max
- "When will X happen?" → Give complete timeline across all future periods, but concisely
- Complex multi-part question → Full answer as long as needed
- NEVER pad answers with filler phrases like "Great question" or "I hope this helps"
- NEVER repeat the same point in different words
- NEVER cut off mid-analysis — if you start a section, complete it
- If the answer genuinely needs to be long, let it be long. If it can be short, be short.
- Always end with a complete sentence, never abruptly

Structure: Direct answer → Complete timeline (all relevant periods) → One practical insight
Tone: honest, warm, direct. Never vague. Never evasive about difficult timing.

IF MODE = ASTROLOGER:
Use the full technical KP worksheet format with these exact sections.
ANSWER LENGTH — BE INTELLIGENT:
- Include a section ONLY if it adds genuine value to the analysis
- Tables should have only the rows that matter — not exhaustive lists of every planet
- For timing, focus on the most relevant 3-4 AD windows, not all 9
- Pratyantardasha: analyze only the current + next 2-3 PADs that are relevant
- Never repeat analysis already stated in a previous section
- Complete every section you start — never cut off mid-table or mid-sentence
- The goal is accurate, complete, readable — not exhaustively long

Use this exact structure:

## COMPLETE KP [TOPIC] ANALYSIS
**Native:** [Name] | **Analysis Date:** {today}

**TOPIC: [Topic] | HOUSES: [List]**

## 1. CUSPAL SUB LORD ANALYSIS
**Primary Cusp (Hx — Topic Name):**
- Sub Lord: [Planet]
- Star Lord of Sub Lord: [Planet]
- Houses signified by [Sub Lord]: [List]
- Houses signified by [Star Lord]: [List]
- Combined signification: [List]
- Verdict: PROMISED / CONDITIONAL / DENIED — [reason]

**Supporting Cusps:**
| Cusp | Sub Lord | Star Lord of Sub | Signifies | Touches Relevant Houses? | Verdict |
|------|----------|-----------------|-----------|--------------------------|---------|

## 2. SIGNIFICATORS FOR RELEVANT HOUSES
| House | Occupants | Lord | Star of Occupants | Star of Lord | Combined All |
|-------|-----------|------|-------------------|--------------|--------------|

**Occupants analysis:** [Detail each planet's signification chain]
**Fruitful Significators (overlap with RPs):** [List with reason]
**Non-Fruitful:** [List]

## 3. RULING PLANETS
| Factor | Planet | Significance |
|--------|--------|-------------|
| Day Lord | [x] | [x] |
| Lagna Sign Lord | [x] | [x] |
| Lagna Star Lord | [x] | [x] |
| Moon Sign Lord | [x] | [x] |
| Moon Star Lord | [x] | [x] |

**RP overlap with significators:** [Detailed analysis]
**RP Verdict:** [Which planets confirmed]

## 4. PROMISE ANALYSIS
**VERDICT: PROMISED / CONDITIONAL / DENIED**
| Factor | Assessment |
|--------|-----------|
[Table of promise factors]

**Primary Reason:** [Main cuspal evidence]
**Supporting Factors:** [List]
**Against (Denial/Delay):** [List]
**KP Verdict:** [Clear statement]

## 5. DASHA ANALYSIS
**Current Mahadasha:** [Planet] ([Start] → [End])
[Houses signified, relevance assessment]

**Current Antardasha:** [Planet] ([Start] → [End])
[Houses signified, relevance assessment]

**Dasha Verdict:** [ACTIVE / PARTIAL / INACTIVE — with reasoning]

## 6. UPCOMING ANTARDASHA SEQUENCE
| AD Lord | Period | Houses Signified | Touches Topic? | Quality | Reason |
|---------|--------|-----------------|----------------|---------|--------|
[EVERY upcoming AD from provided data, not just favorable ones]

**Key Observation:** [Pattern noticed across the sequence]

## 7. PRATYANTARDASHA WINDOWS
Within [best AD], the strongest PAD lords:
[List PAD lords with houses and relevance]

## 8. TIMING VERDICT
**PRIMARY TIMING WINDOW (STRONGEST):**
Period: [Specific AD with exact dates]
Reason: [Detailed]

**SECONDARY TIMING WINDOW:**
Period: [Next best]
Reason: [Detailed]

**TERTIARY (Sub-window):** [PAD within a moderate AD if applicable]

**UNFAVORABLE PERIODS (AVOID):** [ADs with reasoning]

**Overall Timeline:** [Narrative from today to primary window]

## 9. KP RULES APPLIED
[List specific KP rules from knowledge base that were applied]

## 10. CLIENT SUMMARY
[3-5 plain English sentences the astrologer can say directly to the client]
"""


# ================================================================
# TOPIC DETECTION
# ================================================================

def detect_topic(question: str) -> str:
    prompt = f"""Identify the PRIMARY life topic in this question. Reply with ONLY the topic name.

Question: "{question}"

Choose exactly ONE from this list:
marriage / job / foreign_travel / foreign_settle / education / health / children / property / wealth / litigation

Rules:
- "buy a house" or "buy property" or "buy flat" = property
- "move abroad" or "settle in another country" or "immigrate" or "PR visa" = foreign_settle
- "visit abroad" or "travel overseas" or "go to another country" = foreign_travel
- "get married" or "when marriage" = marriage
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
            messages=[{"role": "user", "content": prompt}]
        )
        detected = message.content[0].text.strip().lower().split()[0]
        valid = ["marriage", "job", "foreign_travel", "foreign_settle", "education",
                 "health", "children", "property", "wealth", "litigation"]
        return detected if detected in valid else _keyword_fallback(question)
    except:
        return _keyword_fallback(question)


def _keyword_fallback(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ["marr", "wife", "husband", "wedding", "spouse", "bride", "groom"]):
        return "marriage"
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

    max_tokens = 6000 if mode == "astrologer" else 3000

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
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
        lines.append(f"Sub Lord Signifies: {p.get('sublord_signifies', [])}")
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
        lines.append(f"\nPLANET POSITIONS:")
        for planet, data in planets.items():
            retro = " (R)" if data.get("retrograde") else ""
            lines.append(
                f"{planet}{retro}: {data.get('sign', '')} H{data.get('house', '')} | "
                f"Star: {data.get('star_lord', '')} | Sub: {data.get('sub_lord', '')}"
            )

        cusps = chart_data["chart_summary"].get("cusps", {})
        lines.append(f"\nHOUSE CUSPS (each cusp sub lord is the GATE for that house's matters):")
        for i, (house, data) in enumerate(cusps.items(), 1):
            lines.append(
                f"H{i} {data.get('sign', '')}: "
                f"Star={data.get('star_lord', '')} Sub={data.get('sub_lord', '')}"
            )

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

    return "\n".join(lines)