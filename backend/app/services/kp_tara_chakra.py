"""
kp_tara_chakra.py — Navatara Chakra (Tara Bala) computation (PR A1.3-fix-20).

Tara Chakra is a 27-nakshatra-into-9-Tara classification system, computed
from the native's birth nakshatra (Janma Nakshatra). Used in classical
Vedic + KP analysis for:
  - Daily auspiciousness (today's Moon nakshatra → today's Tara for native)
  - Muhurtha selection (filter time windows by favorable Tara)
  - Transit analysis (each transiting planet's current Tara)
  - Dasha refinement (which AD lords transit through favorable Taras)

The 9 Taras (each repeating 3 times across 27 nakshatras):

  1. Janma     (1st, 10th, 19th from Janma Nakshatra)  — neutral
  2. Sampat    (2nd, 11th, 20th)  — favorable (wealth, resources)
  3. Vipat     (3rd, 12th, 21st)  — unfavorable (trouble, danger)
  4. Kshema    (4th, 13th, 22nd)  — favorable (well-being, health)
  5. Pratyari  (5th, 14th, 23rd)  — unfavorable (adversaries, delay)
  6. Sadhana   (6th, 15th, 24th)  — favorable (achievement, success)
  7. Naidhana  (7th, 16th, 25th)  — unfavorable (disease, destruction)
  8. Mitra     (8th, 17th, 26th)  — favorable (friendship, support)
  9. Atimitra  (9th, 18th, 27th)  — favorable (best friend, blessings)

Counting rule: position from janma = ((target_idx - janma_idx) mod 27) + 1
              tara index = ((position - 1) mod 9) + 1

KP integration angle: while KP traditionally emphasizes cuspal sub lords
+ ruling planets, Tara Chakra adds a complementary daily-favorability
filter. A KP-active timing trigger (AD/PAD lord) firing on a Sampat or
Sadhana day is doubly amplified.
"""

from __future__ import annotations

from typing import Any

# Canonical 27-nakshatra order (KSK Reader, Vimsottari sequence is the same)
NAKSHATRAS_27: list[str] = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
]

# Telugu transliteration for UI parity (same order)
NAKSHATRAS_27_TE: list[str] = [
    "అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర",
    "ఆర్ద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష", "మఘ",
    "పుబ్బ", "ఉత్తర", "హస్త", "చిత్త", "స్వాతి",
    "విశాఖ", "అనురాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ",
    "ఉత్తరాషాఢ", "శ్రవణ", "ధనిష్ఠ", "శతభిష", "పూర్వాభాద్ర",
    "ఉత్తరాభాద్ర", "రేవతి",
]

# 9 Taras
TARAS: list[str] = [
    "Janma", "Sampat", "Vipat", "Kshema", "Pratyari",
    "Sadhana", "Naidhana", "Mitra", "Atimitra",
]
TARAS_TE: list[str] = [
    "జన్మ", "సంపత్", "విపత్", "క్షేమ", "ప్రత్యరి",
    "సాధన", "నైధన", "మిత్ర", "అతిమిత్ర",
]

TARA_NATURE: dict[str, str] = {
    "Janma":     "neutral",
    "Sampat":    "favorable",
    "Vipat":     "unfavorable",
    "Kshema":    "favorable",
    "Pratyari":  "unfavorable",
    "Sadhana":   "favorable",
    "Naidhana":  "unfavorable",
    "Mitra":     "favorable",
    "Atimitra":  "favorable",
}

TARA_EFFECT: dict[str, str] = {
    "Janma":     "Self-identity, mental health, core karma. Neutral — not for new starts but stable.",
    "Sampat":    "Wealth, resources, financial gains. Favorable for money matters and new ventures.",
    "Vipat":     "Trouble, danger, accidents. Avoid major actions; defer travel and risky decisions.",
    "Kshema":    "Well-being, health, happiness. Favorable for health treatments and family events.",
    "Pratyari":  "Adversaries, obstacles, delays. Avoid confrontations and signing contracts.",
    "Sadhana":   "Achievement, success, victory. Favorable for goal-setting and effort-based work.",
    "Naidhana":  "Disease, destruction, endings. Avoid critical decisions; postpone surgeries if optional.",
    "Mitra":     "Friendship, alliance, support. Favorable for meetings, partnerships, and reconciliation.",
    "Atimitra":  "Greater friend, blessings, harmony. Most auspicious for major undertakings.",
}


def _normalize(nak_name: str) -> str:
    """Normalize incoming nakshatra name for lookup."""
    if not nak_name:
        return ""
    s = nak_name.strip()
    # Common alias normalizations
    aliases = {
        "Pubba": "Purva Phalguni",
        "Uttara": "Uttara Phalguni",
        "U.Phalguni": "Uttara Phalguni",
        "P.Phalguni": "Purva Phalguni",
        "Pushyami": "Pushya",
        "Aslesha": "Ashlesha",
        "Magha": "Magha",
        "Chitta": "Chitra",
        "Vishaakha": "Vishakha",
        "Jyeshta": "Jyeshtha",
        "Moola": "Mula",
        "P.Ashadha": "Purva Ashadha",
        "U.Ashadha": "Uttara Ashadha",
        "Shravan": "Shravana",
        "Dhanistha": "Dhanishta",
        "Shatataraka": "Shatabhisha",
        "Shatabhishak": "Shatabhisha",
        "P.Bhadrapada": "Purva Bhadrapada",
        "U.Bhadrapada": "Uttara Bhadrapada",
    }
    return aliases.get(s, s)


def _nak_index(nak_name: str) -> int:
    """Return 0-based index in NAKSHATRAS_27, or -1 if unknown."""
    norm = _normalize(nak_name)
    try:
        return NAKSHATRAS_27.index(norm)
    except ValueError:
        return -1


def compute_tara_chakra(janma_nakshatra: str) -> dict[str, Any]:
    """
    Build the full 27-nakshatra Tara Chakra for a native.

    Returns:
        {
          "janma_nakshatra": str,
          "janma_nakshatra_te": str,
          "nakshatras": [
            {
              "name": str (English),
              "name_te": str (Telugu),
              "index": int (0-26),
              "position_from_janma": int (1-27),
              "cycle": int (1, 2, or 3),
              "tara_name": str,
              "tara_name_te": str,
              "tara_index": int (0-8),
              "nature": "favorable" | "unfavorable" | "neutral",
              "effect": str,
              "is_janma": bool (true for native's birth nakshatra)
            },
            ...27 entries
          ]
        }
    """
    janma_idx = _nak_index(janma_nakshatra)
    if janma_idx < 0:
        return {
            "janma_nakshatra": janma_nakshatra,
            "janma_nakshatra_te": "",
            "nakshatras": [],
            "error": f"Unknown nakshatra: {janma_nakshatra}",
        }

    out_list: list[dict[str, Any]] = []
    for i, nak in enumerate(NAKSHATRAS_27):
        position = ((i - janma_idx) % 27) + 1  # 1..27
        cycle = ((position - 1) // 9) + 1       # 1, 2, 3
        tara_idx = (position - 1) % 9           # 0..8
        tara_name = TARAS[tara_idx]
        out_list.append({
            "name": nak,
            "name_te": NAKSHATRAS_27_TE[i],
            "index": i,
            "position_from_janma": position,
            "cycle": cycle,
            "tara_name": tara_name,
            "tara_name_te": TARAS_TE[tara_idx],
            "tara_index": tara_idx,
            "nature": TARA_NATURE[tara_name],
            "effect": TARA_EFFECT[tara_name],
            "is_janma": (i == janma_idx),
        })

    return {
        "janma_nakshatra": NAKSHATRAS_27[janma_idx],
        "janma_nakshatra_te": NAKSHATRAS_27_TE[janma_idx],
        "nakshatras": out_list,
    }


def compute_tara_for_nakshatra(janma_nakshatra: str, target_nakshatra: str) -> dict[str, Any] | None:
    """
    Compute the Tara classification for a specific target nakshatra,
    relative to the native's janma. Used for "today's Moon Tara" or
    "transiting Saturn's Tara" lookups.
    """
    chakra = compute_tara_chakra(janma_nakshatra)
    if not chakra.get("nakshatras"):
        return None
    target_norm = _normalize(target_nakshatra)
    for entry in chakra["nakshatras"]:
        if entry["name"] == target_norm:
            return entry
    return None


def compute_transit_taras(
    janma_nakshatra: str,
    transit_planets: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    For each transiting planet, return its current Tara classification
    relative to the native's janma nakshatra.

    Args:
        janma_nakshatra: native's birth nakshatra
        transit_planets: from kp_transit_compute.get_current_transits(),
                         shape {planet: {nakshatra, longitude, ...}}

    Returns:
        list of {planet, current_nakshatra, tara_name, nature, effect}
    """
    out: list[dict[str, Any]] = []
    for planet, data in transit_planets.items():
        target_nak = data.get("nakshatra")
        if not target_nak:
            continue
        tara = compute_tara_for_nakshatra(janma_nakshatra, target_nak)
        if not tara:
            continue
        out.append({
            "planet": planet,
            "current_nakshatra": target_nak,
            "tara_name": tara["tara_name"],
            "tara_name_te": tara["tara_name_te"],
            "nature": tara["nature"],
            "effect": tara["effect"],
            "position_from_janma": tara["position_from_janma"],
            "cycle": tara["cycle"],
        })
    return out


def compute_today_tara(
    janma_nakshatra: str,
    moon_current_nakshatra: str,
) -> dict[str, Any] | None:
    """
    Compute today's Tara for the native, based on current Moon nakshatra.
    This is the headline daily-favorability indicator.
    """
    return compute_tara_for_nakshatra(janma_nakshatra, moon_current_nakshatra)
