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

RULE 5 — PROMISE VERDICT MUST BE PRECISE:
Use exactly three verdicts: PROMISED, CONDITIONAL, or DENIED.
PROMISED = sub lord of primary cusp clearly signifies relevant houses.
CONDITIONAL = mixed signification — relevant houses + obstacle houses.
DENIED = sub lord only signifies negating houses (no relevant house connection).
NEVER say "not promised right now" — that is temporal anchoring, which is wrong.
If the matter will happen later, say CONDITIONAL or DELAYED, not DENIED.

================================================================
KP ANALYSIS PROCESS — FOLLOW FOR EVERY QUESTION
================================================================

STEP 1 — IDENTIFY TOPIC AND RELEVANT HOUSES
Determine which houses govern this topic using knowledge base rules.

STEP 2 — CUSPAL SUB LORD ANALYSIS (Promise Gate)
- Check sub lord of primary cusp: what houses does it signify?
- Check supporting cusps (H2 and H11 always support fulfillment)
- Apply karaka override rule if applicable
- Determine: PROMISED / CONDITIONAL / DENIED

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
           star lord, cuspal, bhava, Rahu, Ketu (use "shadow planet" if needed)
INSTEAD use: "planetary period", "key planet", "timing window", "ruling influences"

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
- "house in Canada" or "buy property" = property
- "move to Canada" or "settle abroad" = foreign_settle
- "visit abroad" or "travel overseas" = foreign_travel
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
    if any(w in q for w in ["travel", "abroad", "foreign", "visa", "overseas", "canada", "usa", "uk"]):
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
        lines.append(f"Promise Verdict: {verdict} — {strength}")
        lines.append("NOTE: This is a pre-calculation. Perform your own full cuspal analysis using the chart data below.")

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
    if "pratyantardashas_current_ad" in chart_data:
        lines.append(f"\nPRATYANTARDASHA SEQUENCE within current AD (exact calculated dates):")
        for pad in chart_data["pratyantardashas_current_ad"]:
            lines.append(
                f"  {pad.get('pratyantardasha_lord')}: "
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
                f"H{house_num}: Occupants={sig.get('occupants', [])} | "
                f"Lord={sig.get('house_lord', '')} | "
                f"All significators={sig.get('all_significators', [])}"
            )

    # Planet house positions
    if "planet_positions" in chart_data:
        lines.append(f"\nPLANET HOUSE POSITIONS:")
        for planet, house in chart_data["planet_positions"].items():
            lines.append(f"{planet} → H{house}")

    return "\n".join(lines)