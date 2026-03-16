import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

KP_SYSTEM_PROMPT = """You are an expert KP (Krishnamurti Paddhati) astrologer with deep knowledge of the KP system. You analyze birth charts and answer questions using strict KP methodology.

CORE KP PRINCIPLES YOU FOLLOW:

1. SUB LORD IS FINAL AUTHORITY
   - The sub lord of a cusp determines if a matter is promised
   - If the sub lord signifies the relevant houses, the matter is promised
   - If not, the matter is denied regardless of other factors

2. SIGNIFICATOR HIERARCHY (in order of strength)
   - Planets occupying the house (strongest)
   - Lord of the house (sign lord of cusp)
   - Planets in the star of occupants
   - Planets in the star of house lord

3. PROMISE BEFORE TIMING
   - Always check if matter is promised FIRST
   - Only after promise is confirmed, look at timing
   - Never give timing for a denied matter

4. TIMING THROUGH DASHA
   - Event happens when dasha AND antardasha lords are significators of relevant houses
   - Transit (gochara) must also support — transiting planets over relevant cusps confirm the period

5. RULING PLANETS
   - At time of query: day lord, lagna lord, lagna star lord, moon sign lord, moon star lord
   - These act as divine filters — the operating dasha periods must connect to ruling planets

6. KEY HOUSE COMBINATIONS
   - Marriage: 2, 7, 11 (with 1 for self)
   - Job/Career: 2, 6, 10, 11
   - Foreign travel: 3, 9, 12
   - Foreign settlement: 8, 12
   - Children: 2, 5, 11
   - Health issues: 1, 5, 8, 12
   - Property: 4, 11, 12
   - Education: 4, 9, 11

7. DENIAL CONDITIONS
   - Sub lord of relevant cusp signifies 1, 6, 8, 12 strongly → matter denied or delayed
   - Retrograde planets as significators → delays
   - Sub lord in enemy sign → weakened results

8. YOUR RESPONSE STYLE
   - Always state whether matter is promised or not first
   - Then explain the significators and why
   - Then give timing if promised
   - Use clear, simple language — the person asking may not know astrology deeply
   - Be honest about uncertainty — say "chart suggests" not "you will definitely"
   - Be direct and confident in your analysis. Do not add disclaimers or warnings at the end.
   - Keep responses focused and practical

IMPORTANT: You will receive pre-calculated chart data including planets, cusps, significators, dasha periods, promise analysis and ruling planets. Use this data directly — do not recalculate. Your job is to interpret and explain the analysis in a meaningful, helpful way."""

def detect_topic(question: str) -> str:
    """
    Use Claude to detect KP topic from question.
    Much more accurate than keyword matching.
    """
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
- marriage (relationships, spouse, wedding, love)
- job (career, employment, promotion, business)
- foreign_travel (travel abroad, visa, overseas trip)
- foreign_settle (settling abroad, immigration, PR)
- education (studies, exam, college, degree)
- health (illness, disease, surgery, recovery)
- children (baby, pregnancy, child)
- property (house, land, flat, real estate)
- wealth (money, investment, financial)
- litigation (court, legal case, dispute)

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
        # Fallback — simple check
        q = question.lower()
        if any(w in q for w in ["marr", "wife", "husband", "wedding", "spouse", "bride", "groom"]):
            return "marriage"
        if any(w in q for w in ["health", "sick", "ill", "disease", "hospital"]):
            return "health"
        if any(w in q for w in ["travel", "abroad", "foreign", "visa"]):
            return "foreign_travel"
        return "job"

    # Check each topic's keywords
    matches = {}
    for topic, keywords in topic_keywords.items():
        count = sum(1 for kw in keywords if kw in question_lower)
        if count > 0:
            matches[topic] = count

    if not matches:
        return "job"  # sensible default

    # Return topic with most keyword matches
    return max(matches, key=matches.get)

def get_prediction(chart_data: dict, question: str) -> str:
    """
    Send analyzed chart data to Claude and get KP prediction.
    """
    # Auto-detect topic from question
    detected_topic = detect_topic(question)
    chart_data["detected_topic"] = detected_topic
    
    chart_summary = format_chart_for_llm(chart_data)

    user_message = f"""
Here is the fully analyzed KP chart:

{chart_summary}

Question from the person: {question}

Please analyze this using KP methodology and provide a clear, honest answer.
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system=KP_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_message}
        ]
    )

    return message.content[0].text


def format_chart_for_llm(chart_data: dict) -> str:
    """
    Format the analyzed chart data into clean text for Claude.
    """
    from datetime import datetime
    lines = []
    lines.append(f"TODAY'S DATE: {datetime.now().strftime('%B %d, %Y')}")
    lines.append("IMPORTANT: Do not suggest time windows that have already passed.")

    # Basic info
    if "name" in chart_data:
        lines.append(f"Name: {chart_data['name']}")

    # Topic and promise
    if "promise_analysis" in chart_data:
        p = chart_data["promise_analysis"]
        lines.append(f"\nTOPIC: {p.get('topic', 'general').upper()}")
        lines.append(f"Relevant Houses: {p.get('relevant_houses', [])}")
        lines.append(f"Primary Cusp Sub Lord: {p.get('primary_cusp_sublord', '')}")
        lines.append(f"Promise: {p.get('promise_strength', '')} — {'Promised' if p.get('is_promised') else 'Not Promised'}")

    # Dasha
    if "current_dasha" in chart_data:
        d = chart_data["current_dasha"]
        md = d.get("mahadasha", {})
        ad = d.get("antardasha", {})
        lines.append(f"\nCURRENT DASHA PERIOD:")
        lines.append(f"Mahadasha: {md.get('lord')} ({md.get('start')} to {md.get('end')})")
        lines.append(f"Antardasha: {ad.get('antardasha_lord')} ({ad.get('start')} to {ad.get('end')})")

    # Timing
    if "timing_analysis" in chart_data:
        t = chart_data["timing_analysis"]
        lines.append(f"\nTIMING ANALYSIS:")
        lines.append(f"Mahadasha lord {t.get('mahadasha_lord')} signifies relevant houses: {t.get('mahadasha_relevant')}")
        lines.append(f"Antardasha lord {t.get('antardasha_lord')} signifies relevant houses: {t.get('antardasha_relevant')}")
        lines.append(f"Assessment: {t.get('timing_assessment')}")

    # Ruling planets
    if "ruling_planets" in chart_data:
        rp = chart_data["ruling_planets"]
        lines.append(f"\nRULING PLANETS AT TIME OF QUERY:")
        lines.append(f"Day lord: {rp.get('day_lord')}")
        lines.append(f"Lagna lord: {rp.get('lagna_sign_lord')}")
        lines.append(f"Lagna star lord: {rp.get('lagna_star_lord')}")
        lines.append(f"Moon sign lord: {rp.get('moon_sign_lord')}")
        lines.append(f"Moon star lord: {rp.get('moon_star_lord')}")
        lines.append(f"All ruling planets: {rp.get('ruling_planets')}")

    # Planets
    if "chart_summary" in chart_data:
        planets = chart_data["chart_summary"].get("planets", {})
        lines.append(f"\nPLANET POSITIONS:")
        for planet, data in planets.items():
            lines.append(
                f"{planet}: {data['sign']}, "
                f"Star lord: {data['star_lord']}, "
                f"Sub lord: {data['sub_lord']}"
            )

        # Cusps
        cusps = chart_data["chart_summary"].get("cusps", {})
        lines.append(f"\nHOUSE CUSPS (Sub Lords):")
        for house, data in cusps.items():
            lines.append(
                f"{house}: {data['sign']}, "
                f"Sub lord: {data['sub_lord']}"
            )
        if "significators" in chart_data:
            lines.append(f"\nHOUSE SIGNIFICATORS:")
            for house, sig_data in chart_data.get("significators", {}).items():
                house_num = house.replace("House_", "")
                lines.append(
                    f"House {house_num}: "
                    f"Occupants={sig_data.get('occupants', [])}"
                    f"Lord={sig_data.get('house_lord', '')}"
                    f"All significators={sig_data.get('all_significators', [])}"
                )
        # Planet house positions
        if "planet_positions" in chart_data:
            lines.append(f"\nPLANETHOUSE POSITIONS:")
            for planet, house in chart_data["planet_positions"].items():
                lines.append(f"{planet.ljust(10)} is in House {house.rjust(2)}")

    return "\n".join(lines)
