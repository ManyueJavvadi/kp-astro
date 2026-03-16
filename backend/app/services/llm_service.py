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
    """Load topic-specific KP rules from knowledge files."""
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
# SYSTEM PROMPTS
# ================================================================

def get_system_prompt(mode: str) -> str:
    today = datetime.now().strftime("%B %d, %Y")

    if mode == "astrologer":
        return f"""You are a KP astrology assistant helping a professional KP astrologer analyze a chart. Output a complete structured KP worksheet the astrologer can use directly with their client.

TODAY'S DATE: {today}
Do not reference past time windows as future ones.

RESPONSE FORMAT — USE THIS EXACT STRUCTURE EVERY TIME:

## TOPIC: [Topic] | HOUSES: [Relevant Houses]

---

## 1. CUSPAL SUB LORD ANALYSIS

**Primary Cusp ([House] cusp):**
- Sub Lord: [Planet]
- Sub Lord's Star Lord: [Planet]
- Sub Lord signifies houses: [List]
- Verdict: PROMISED / DENIED / CONDITIONAL

**Supporting Cusps:**
- [Cusp] Sub Lord: [Planet] → signifies: [Houses] → [Supports/Weakens]

---

## 2. SIGNIFICATORS FOR RELEVANT HOUSES

| House | Occupants | House Lord | Star of Occupants | Star of Lord |
|-------|-----------|------------|-------------------|--------------|
| [H]   | [Planets] | [Planet]   | [Planets]         | [Planets]    |

**Fruitful Significators** (common with Ruling Planets): [List]
**Non-Fruitful Significators:** [List]

---

## 3. RULING PLANETS (at time of query)

| Factor | Planet |
|--------|--------|
| Day Lord | [Planet] |
| Lagna Sign Lord | [Planet] |
| Lagna Star Lord | [Planet] |
| Moon Sign Lord | [Planet] |
| Moon Star Lord | [Planet] |

**Fruitful overlap with significators:** [List]

---

## 4. PROMISE ANALYSIS

**Verdict:** PROMISED / DENIED / CONDITIONAL
**Primary reason:** [Sub lord signifies which houses]
**Supporting:** [Other confirming factors]
**Against:** [Any denial/delay factors]

---

## 5. CURRENT DASHA ANALYSIS

**Mahadasha:** [Planet] ([Start] → [End])
- Houses signified: [List]
- Relevant to topic: YES / NO / PARTIAL

**Antardasha:** [Planet] ([Start] → [End])
- Houses signified: [List]
- Relevant to topic: YES / NO / PARTIAL

**Dasha Verdict:** ACTIVE / INACTIVE / PARTIAL

---

## 6. PRATYANTARDASHA WINDOWS

| PD Lord | Period | Houses Signified | Relevance |
|---------|--------|------------------|-----------|
| [Planet] | [Start–End] | [Houses] | HIGH / MED / LOW |

**Most favorable PD window:** [Period + reason]

---

## 7. TIMING VERDICT

**Strongest Period:** [Month/Year range]
**Reason:** [Dasha + AD + PD lords all signify relevant houses + RP overlap]
**Secondary Window:** [Next best period]

---

## 8. KP RULES APPLIED

[List specific KP rules used so astrologer can verify methodology]

---

## 9. CLIENT SUMMARY (Plain Language)

[2-3 sentences the astrologer can say directly to the client]

---

RULES:
- Use exact dates from provided dasha data only
- Reference actual sub lords from provided chart data only
- State clearly if data is insufficient
- Do not invent or estimate any values"""

    else:
        return f"""You are an expert KP astrologer giving a warm, clear reading to someone with no astrology background.

TODAY'S DATE: {today}
Do not suggest time windows that have already passed.

RESPONSE RULES:
- Plain English only — no KP jargon
- Lead with a direct answer: "Yes, marriage is indicated" or "The chart shows a delay here"
- Explain WHY in simple terms without technical terms
- Give timing in plain language: "Mid-2026 to early 2027 looks like your strongest window"
- Warm, direct, confident tone
- Write in flowing paragraphs — not bullet points
- No disclaimers or warnings at the end
- Maximum 350 words

STRUCTURE:
1. Direct answer (promised or not) — 1-2 sentences
2. Why the chart shows this — 2-3 sentences in plain language
3. Timing — specific periods in plain English
4. One practical insight

You have the complete analyzed chart — use it fully. Do not ask for more details."""


# ================================================================
# TOPIC DETECTION
# ================================================================

def detect_topic(question: str) -> str:
    """Use Claude to detect KP topic from question."""
    topic_map = {
        "marriage": "marriage",
        "job": "job",
        "career": "job",
        "foreign_travel": "foreign_travel",
        "foreign_settle": "foreign_settle",
        "education": "education",
        "health": "health",
        "children": "children",
        "property": "property",
        "wealth": "wealth",
        "litigation": "litigation",
    }

    prompt = f"""You are a KP astrology assistant. Given this question, identify the PRIMARY life topic.

Question: "{question}"

Choose exactly ONE topic from this list:
- marriage (relationships, spouse, wedding, love, partner)
- job (career, employment, promotion, business, work)
- foreign_travel (travel abroad, visa, overseas trip)
- foreign_settle (settling abroad, immigration, PR, green card)
- education (studies, exam, college, degree, results)
- health (illness, disease, surgery, recovery, hospital)
- children (baby, pregnancy, child, conception)
- property (house, land, flat, real estate, plot)
- wealth (money, investment, financial, loan, debt)
- litigation (court, legal case, dispute, lawyer)

Reply with ONLY the topic name, nothing else."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )
        detected = message.content[0].text.strip().lower()
        return topic_map.get(detected, "job")
    except:
        q = question.lower()
        if any(w in q for w in ["marr", "wife", "husband", "wedding", "spouse"]):
            return "marriage"
        if any(w in q for w in ["health", "sick", "ill", "disease", "hospital"]):
            return "health"
        if any(w in q for w in ["travel", "abroad", "foreign", "visa"]):
            return "foreign_travel"
        return "job"


# ================================================================
# MAIN PREDICTION FUNCTION
# ================================================================

def get_prediction(chart_data: dict, question: str, history: list = [], mode: str = "user") -> str:
    """Generate prediction using KP chart data, knowledge base, and mode-specific prompt."""

    detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic

    # Load relevant KP rules
    knowledge = load_knowledge(detected_topic)

    # Format chart data
    chart_summary = format_chart_for_llm(chart_data)

    # Build messages with history
    messages = []

    for prev in history[-4:]:
        messages.append({"role": "user", "content": prev["question"]})
        messages.append({"role": "assistant", "content": prev["answer"]})

    # Current question with knowledge base injected
    messages.append({
        "role": "user",
        "content": f"""KP KNOWLEDGE BASE (relevant rules for this question):
{knowledge}

---

ANALYZED CHART DATA:
{chart_summary}

---

Question: {question}

Please analyze using strict KP methodology."""
    })

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=get_system_prompt(mode),
        messages=messages
    )

    return message.content[0].text


# ================================================================
# CHART FORMATTER
# ================================================================

def format_chart_for_llm(chart_data: dict) -> str:
    """Format the analyzed chart data into clean text for Claude."""
    lines = []

    if "name" in chart_data:
        lines.append(f"Native: {chart_data['name']}")

    # Detected topic
    if "detected_topic" in chart_data:
        lines.append(f"Detected Topic: {chart_data['detected_topic'].upper()}")

    # Promise analysis
    if "promise_analysis" in chart_data:
        p = chart_data["promise_analysis"]
        lines.append(f"\nPROMISE ANALYSIS:")
        lines.append(f"Topic: {p.get('topic', '')}")
        lines.append(f"Relevant Houses: {p.get('relevant_houses', [])}")
        lines.append(f"Primary Cusp Sub Lord: {p.get('primary_cusp_sublord', '')}")
        lines.append(f"Sub Lord Signifies: {p.get('sublord_signifies', [])}")
        lines.append(f"Promise: {'PROMISED' if p.get('is_promised') else 'NOT PROMISED'} — {p.get('promise_strength', '')}")

    # Current dasha
    if "current_dasha" in chart_data:
        d = chart_data["current_dasha"]
        md = d.get("mahadasha", {})
        ad = d.get("antardasha", {})
        lines.append(f"\nCURRENT DASHA:")
        lines.append(f"Mahadasha: {md.get('lord')} ({md.get('start')} → {md.get('end')})")
        lines.append(f"Antardasha: {ad.get('antardasha_lord')} ({ad.get('start')} → {ad.get('end')})")

    # Timing analysis
    if "timing_analysis" in chart_data:
        t = chart_data["timing_analysis"]
        lines.append(f"\nTIMING ANALYSIS:")
        lines.append(f"MD lord {t.get('mahadasha_lord')} signifies relevant houses: {t.get('mahadasha_relevant')}")
        lines.append(f"AD lord {t.get('antardasha_lord')} signifies relevant houses: {t.get('antardasha_relevant')}")
        lines.append(f"Assessment: {t.get('timing_assessment')}")
        lines.append(f"Timing Favorable: {t.get('timing_favorable')}")

    # Ruling planets
    if "ruling_planets" in chart_data:
        rp = chart_data["ruling_planets"]
        lines.append(f"\nRULING PLANETS (at time of query):")
        lines.append(f"Day Lord: {rp.get('day_lord')}")
        lines.append(f"Lagna Sign Lord: {rp.get('lagna_sign_lord')}")
        lines.append(f"Lagna Star Lord: {rp.get('lagna_star_lord')}")
        lines.append(f"Moon Sign Lord: {rp.get('moon_sign_lord')}")
        lines.append(f"Moon Star Lord: {rp.get('moon_star_lord')}")
        lines.append(f"All Ruling Planets: {rp.get('ruling_planets')}")

    # Planet positions
    if "chart_summary" in chart_data:
        planets = chart_data["chart_summary"].get("planets", {})
        lines.append(f"\nPLANET POSITIONS:")
        for planet, data in planets.items():
            lines.append(
                f"{planet}: {data.get('sign', '')} | "
                f"House: {data.get('house', '')} | "
                f"Star Lord: {data.get('star_lord', '')} | "
                f"Sub Lord: {data.get('sub_lord', '')}"
            )

        # Cusps
        cusps = chart_data["chart_summary"].get("cusps", {})
        lines.append(f"\nHOUSE CUSPS (Sub Lords):")
        for i, (house, data) in enumerate(cusps.items(), 1):
            lines.append(
                f"H{i} ({data.get('sign', '')}): "
                f"Star Lord: {data.get('star_lord', '')} | "
                f"Sub Lord: {data.get('sub_lord', '')}"
            )

    # Significators
    if "significators" in chart_data:
        lines.append(f"\nHOUSE SIGNIFICATORS:")
        for house, sig in chart_data["significators"].items():
            house_num = house.replace("House_", "")
            lines.append(
                f"H{house_num}: Occupants={sig.get('occupants', [])} | "
                f"Lord={sig.get('house_lord', '')} | "
                f"All={sig.get('all_significators', [])}"
            )

    # Planet house positions
    if "planet_positions" in chart_data:
        lines.append(f"\nPLANET HOUSE POSITIONS:")
        for planet, house in chart_data["planet_positions"].items():
            lines.append(f"{planet} → House {house}")

    return "\n".join(lines)