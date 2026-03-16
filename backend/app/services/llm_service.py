import os
import anthropic
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ================================================================
# KNOWLEDGE BASE LOADER
# ================================================================

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge")

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
            text = f.read()
            content.append("=== CORE KP PRINCIPLES ===\n" + text)
            
    except:
        pass
    try:
        if topic_file != "general.txt":
            with open(topic_path, "r", encoding="utf-8") as f:
                text = f.read()
                content.append(f"=== KP RULES FOR {topic.upper()} ===\n" + text)
                
    except :
        pass
        
    return "\n\n".join(content)


# ================================================================
# UNIFIED SYSTEM PROMPT — SAME ANALYSIS, SPLIT OUTPUT
# ================================================================

def get_system_prompt() -> str:
    today = datetime.now().strftime("%B %d, %Y")
    return f"""You are an expert KP (Krishnamurti Paddhati) astrologer. You always perform the same complete, rigorous KP analysis regardless of who is asking. The depth of your thinking never changes — only how you present the output changes based on the MODE specified in the message.

TODAY'S DATE: {today}
CRITICAL: Never suggest time windows that have already passed. Use ONLY the exact dasha dates provided in the chart data. Never guess or invent antardasha sequences.

================================================================
ANALYSIS PROCESS — FOLLOW THIS FOR EVERY QUESTION
================================================================

STEP 1 — TOPIC AND HOUSES
Identify relevant houses for the topic. Use provided promise analysis.

STEP 2 — CUSPAL SUB LORD
Check sub lord of primary cusp. What houses does it signify?
Check supporting cusps. Determine PROMISED / DENIED / CONDITIONAL.

STEP 3 — SIGNIFICATORS
Use provided significator data. Cross-reference with ruling planets.
Identify fruitful significators (planets common to both).

STEP 4 — DASHA ANALYSIS
Use ONLY the exact antardasha sequence provided.
Check if MD and AD lords signify relevant houses.

STEP 5 — TIMING
Use upcoming antardasha sequence (exact dates provided) to identify windows.
Fruitful AD/PD lords that also signify relevant houses = active timing windows.

STEP 6 — RULING PLANETS FILTER
Cross-check dasha lords against ruling planets provided.
Common planets = confirmed timing signals.

STEP 7 — VERDICT
State promise. Give specific timing using only provided dates.

================================================================
OUTPUT FORMAT — BASED ON MODE IN THE MESSAGE
================================================================

IF MODE = USER:
- Warm plain English only. No astrology jargon whatsoever.
- Never say: sub lord, cusp, significator, antardasha, dasha, nakshatra, star lord
- Instead say: "key planet", "planetary period", "timing window", "ruling influences"
- Structure: Direct answer → Why → Timing → One practical insight
- Max 350 words. Flowing paragraphs. No bullet points. No tables.
- Timing must still be accurate — use the correct antardasha sequence

IF MODE = ASTROLOGER:
Use this exact structure with full technical detail:

## TOPIC: [Topic] | HOUSES: [List]

## 1. CUSPAL SUB LORD ANALYSIS
**Primary Cusp (Hx):**
- Sub Lord: [Planet]
- Star Lord of Sub Lord: [Planet]
- Houses signified: [List]
- Verdict: PROMISED / DENIED / CONDITIONAL

**Supporting Cusps:**
| Cusp | Sub Lord | Signifies | Verdict |
|------|----------|-----------|---------|

## 2. SIGNIFICATORS FOR RELEVANT HOUSES
| House | Occupants | Lord | Star of Occ | Star of Lord |
|-------|-----------|------|-------------|--------------|

**Fruitful Significators (overlap with RPs):** [List]
**Non-Fruitful:** [List]

## 3. RULING PLANETS
| Factor | Planet |
|--------|--------|
| Day Lord | [x] |
| Lagna Sign Lord | [x] |
| Lagna Star Lord | [x] |
| Moon Sign Lord | [x] |
| Moon Star Lord | [x] |

**RP overlap with significators:** [List]

## 4. PROMISE ANALYSIS
**Verdict:** PROMISED / DENIED / CONDITIONAL
**Primary reason:** [Cuspal analysis]
**Supporting:** [Other factors]
**Against:** [Denial/delay factors]

## 5. DASHA ANALYSIS
**Mahadasha:** [Planet] ([Start] → [End]) | Houses: [List] | Relevant: YES/NO
**Antardasha:** [Planet] ([Start] → [End]) | Houses: [List] | Relevant: YES/NO
**Dasha Verdict:** ACTIVE / INACTIVE / PARTIAL

## 6. UPCOMING ANTARDASHA SEQUENCE
[Use exact dates from provided data only]
| AD Lord | Period | Houses Signified | Relevant? |
|---------|--------|------------------|-----------|

## 7. PRATYANTARDASHA WINDOWS
| PD Lord | Approx Period | Houses | Relevance |
|---------|---------------|--------|-----------|

## 8. TIMING VERDICT
**Strongest window:** [Specific period + reason]
**Secondary window:** [Next best]
**Unfavorable periods:** [Which AD/PD to avoid]

## 9. KP RULES APPLIED
[List specific rules from knowledge base used]

## 10. CLIENT SUMMARY
[2-3 plain English sentences the astrologer can say to the client]
"""


# ================================================================
# TOPIC DETECTION
# ================================================================

def detect_topic(question: str) -> str:
    topic_map = {
        "marriage": "marriage", "job": "job", "career": "job",
        "foreign_travel": "foreign_travel", "foreign_settle": "foreign_settle",
        "education": "education", "health": "health", "children": "children",
        "property": "property", "wealth": "wealth", "litigation": "litigation",
    }
    prompt = f"""Identify the PRIMARY life topic in this question.

Question: "{question}"

Choose exactly ONE:
marriage / job / foreign_travel / foreign_settle / education / health / children / property / wealth / litigation

Reply with ONLY the topic name."""

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
    detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic

    knowledge = load_knowledge(detected_topic)
    chart_summary = format_chart_for_llm(chart_data)

    messages = []
    for prev in history[-4:]:
        messages.append({"role": "user", "content": prev["question"]})
        messages.append({"role": "assistant", "content": prev["answer"]})

    messages.append({
        "role": "user",
        "content": f"""KP KNOWLEDGE BASE:
{knowledge}

---

CHART DATA:
{chart_summary}

---

MODE: {mode.upper()}
Question: {question}

Perform complete KP analysis. Format output for {mode.upper()} mode as instructed."""
    })

    max_tokens = 4000 if mode == "astrologer" else 2000

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        system=get_system_prompt(),
        messages=messages
    )

    return message.content[0].text


# ================================================================
# CHART FORMATTER
# ================================================================

def format_chart_for_llm(chart_data: dict) -> str:
    lines = []

    if "name" in chart_data:
        lines.append(f"Native: {chart_data['name']}")
    if "detected_topic" in chart_data:
        lines.append(f"Topic: {chart_data['detected_topic'].upper()}")

    if "promise_analysis" in chart_data:
        p = chart_data["promise_analysis"]
        lines.append(f"\nPROMISE ANALYSIS:")
        lines.append(f"Relevant Houses: {p.get('relevant_houses', [])}")
        lines.append(f"Primary Cusp Sub Lord: {p.get('primary_cusp_sublord', '')}")
        lines.append(f"Sub Lord Signifies: {p.get('sublord_signifies', [])}")
        lines.append(f"Promise: {'PROMISED' if p.get('is_promised') else 'NOT PROMISED'} — {p.get('promise_strength', '')}")

    if "current_dasha" in chart_data:
        d = chart_data["current_dasha"]
        md = d.get("mahadasha", {})
        ad = d.get("antardasha", {})
        lines.append(f"\nCURRENT DASHA:")
        lines.append(f"Mahadasha: {md.get('lord')} ({md.get('start')} → {md.get('end')})")
        lines.append(f"Antardasha: {ad.get('antardasha_lord')} ({ad.get('start')} → {ad.get('end')})")

    # CRITICAL — full antardasha sequence with exact dates
    if "upcoming_antardashas" in chart_data:
        lines.append(f"\nFULL ANTARDASHA SEQUENCE (use ONLY these exact dates):")
        for ad in chart_data["upcoming_antardashas"]:
            lines.append(
                f"  {ad.get('antardasha_lord')}: "
                f"{ad.get('start')} → {ad.get('end')}"
            )

    if "timing_analysis" in chart_data:
        t = chart_data["timing_analysis"]
        lines.append(f"\nTIMING ANALYSIS:")
        lines.append(f"MD lord {t.get('mahadasha_lord')} relevant: {t.get('mahadasha_relevant')}")
        lines.append(f"AD lord {t.get('antardasha_lord')} relevant: {t.get('antardasha_relevant')}")
        lines.append(f"Assessment: {t.get('timing_assessment')}")

    if "ruling_planets" in chart_data:
        rp = chart_data["ruling_planets"]
        lines.append(f"\nRULING PLANETS:")
        lines.append(f"Day Lord: {rp.get('day_lord')}")
        lines.append(f"Lagna Sign Lord: {rp.get('lagna_sign_lord')}")
        lines.append(f"Lagna Star Lord: {rp.get('lagna_star_lord')}")
        lines.append(f"Moon Sign Lord: {rp.get('moon_sign_lord')}")
        lines.append(f"Moon Star Lord: {rp.get('moon_star_lord')}")
        lines.append(f"All RPs: {rp.get('ruling_planets')}")

    if "chart_summary" in chart_data:
        planets = chart_data["chart_summary"].get("planets", {})
        lines.append(f"\nPLANET POSITIONS:")
        for planet, data in planets.items():
            lines.append(
                f"{planet}: {data.get('sign', '')} H{data.get('house', '')} | "
                f"Star: {data.get('star_lord', '')} | Sub: {data.get('sub_lord', '')}"
            )

        cusps = chart_data["chart_summary"].get("cusps", {})
        lines.append(f"\nHOUSE CUSPS:")
        for i, (house, data) in enumerate(cusps.items(), 1):
            lines.append(
                f"H{i} {data.get('sign', '')}: "
                f"Star={data.get('star_lord', '')} Sub={data.get('sub_lord', '')}"
            )

    if "significators" in chart_data:
        lines.append(f"\nHOUSE SIGNIFICATORS:")
        for house, sig in chart_data["significators"].items():
            house_num = house.replace("House_", "")
            lines.append(
                f"H{house_num}: Occupants={sig.get('occupants', [])} | "
                f"Lord={sig.get('house_lord', '')} | "
                f"All={sig.get('all_significators', [])}"
            )

    if "planet_positions" in chart_data:
        lines.append(f"\nPLANET HOUSE POSITIONS:")
        for planet, house in chart_data["planet_positions"].items():
            lines.append(f"{planet} → H{house}")

    return "\n".join(lines)