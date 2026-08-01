"""
dosha_cancellation.py — parihara (cancellation) logic for the match doshas.

WHY THIS MATTERS MORE THAN THE DOSHA ITSELF (2026-08-01)
--------------------------------------------------------
Flagging "Nadi dosha" or "Manglik" without checking whether it is
CANCELLED is the single clearest amateur tell in matchmaking, and it is
how families get needlessly frightened out of workable matches. Every
classical dosha ships with its own parihara set; a practising astrologer
checks the parihara before they say a word to the family.

So: this module never reports a dosha alone. Each result carries
    raw flag  ->  applicable cancellations  ->  net severity
which is exactly the sentence an astrologer needs to be able to say:
"technically yes, but it is cancelled because ..."

Self-contained (no compatibility_engine import → no circular import).

Sources consulted: jagannathhora mangal-dosha-cancellation-rules;
astroyogi + anytimeastro gana/nadi koota; astrosight dosha guides;
classical parihara lists as recorded across those.
"""

from __future__ import annotations

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# Natural planetary friendship (classical). Used by the Bhakoot and Gana
# parihara rules, both of which hinge on the two Moon-sign lords.
FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
}

NAKSHATRA_SPAN = 360.0 / 27.0        # 13°20'
PADA_SPAN = NAKSHATRA_SPAN / 4.0     # 3°20'


def pada_of(moon_lon: float) -> int:
    """Nakshatra pada (1..4) for a Moon longitude."""
    return int((moon_lon % NAKSHATRA_SPAN) // PADA_SPAN) + 1


def sign_of(lon: float) -> str:
    return SIGNS[int((lon % 360) // 30)]


def _mutual_friends(a: str, b: str) -> bool:
    if not a or not b:
        return False
    if a == b:
        return True
    return b in FRIENDS.get(a, set()) and a in FRIENDS.get(b, set())


def _one_way_friend(a: str, b: str) -> bool:
    return bool(a and b) and (b in FRIENDS.get(a, set()) or a in FRIENDS.get(b, set()))


# ── NADI DOSHA ────────────────────────────────────────────────────────

def nadi_cancellation(
    *,
    has_dosha: bool,
    boy_moon_lon: float | None,
    girl_moon_lon: float | None,
    boy_nakshatra: str,
    girl_nakshatra: str,
    boy_moon_sign: str,
    girl_moon_sign: str,
    boy_star_lord: str = "",
    girl_star_lord: str = "",
) -> dict:
    """
    Nadi dosha carries the heaviest weight (8/36) and the most cancellations.

    Classical parihara applied here:
      1. Same rasi (Moon sign) but DIFFERENT nakshatra.
      2. Same nakshatra but DIFFERENT pada.
      3. Moon-sign lords are the same planet, or mutual friends.
      4. Both share the same nakshatra (star) lord.
    """
    if not has_dosha:
        return {
            "raw_dosha": False, "cancelled": False, "cancellations": [],
            "net_severity": "None",
            "note": "No Nadi dosha — the two Nadis differ.",
        }

    cancellations: list[str] = []

    same_sign = bool(boy_moon_sign) and boy_moon_sign == girl_moon_sign
    same_nak = bool(boy_nakshatra) and boy_nakshatra == girl_nakshatra

    if same_sign and not same_nak:
        cancellations.append("Same Moon sign but different nakshatra")

    if same_nak and boy_moon_lon is not None and girl_moon_lon is not None:
        if pada_of(boy_moon_lon) != pada_of(girl_moon_lon):
            cancellations.append(
                f"Same nakshatra but different pada "
                f"({pada_of(boy_moon_lon)} vs {pada_of(girl_moon_lon)})"
            )

    bl = SIGN_LORDS.get(boy_moon_sign, "")
    gl = SIGN_LORDS.get(girl_moon_sign, "")
    if bl and gl:
        if bl == gl:
            cancellations.append(f"Both Moon signs ruled by {bl}")
        elif _mutual_friends(bl, gl):
            cancellations.append(f"Moon-sign lords {bl} and {gl} are mutual friends")

    if boy_star_lord and boy_star_lord == girl_star_lord:
        cancellations.append(f"Both share the same star lord ({boy_star_lord})")

    cancelled = len(cancellations) > 0
    return {
        "raw_dosha": True,
        "cancelled": cancelled,
        "cancellations": cancellations,
        "net_severity": "Cancelled" if cancelled else "Stands",
        "note": (
            "Nadi dosha is present but CANCELLED — " + "; ".join(cancellations)
            if cancelled else
            "Nadi dosha present with no applicable parihara — treat seriously."
        ),
    }


# ── BHAKOOT DOSHA ─────────────────────────────────────────────────────

def bhakoot_cancellation(
    *,
    has_dosha: bool,
    boy_moon_sign: str,
    girl_moon_sign: str,
    boy_star_lord: str = "",
    girl_star_lord: str = "",
) -> dict:
    """
    Bhakoot (Rasi) dosha — the 6/8, 2/12 or 5/9 Moon-sign relation.

    Classical parihara:
      1. The two Moon-sign lords are the same planet.
      2. The two Moon-sign lords are mutual friends.
      3. Both share the same nakshatra lord.
    """
    if not has_dosha:
        return {
            "raw_dosha": False, "cancelled": False, "cancellations": [],
            "net_severity": "None", "note": "No Bhakoot dosha.",
        }

    cancellations: list[str] = []
    bl = SIGN_LORDS.get(boy_moon_sign, "")
    gl = SIGN_LORDS.get(girl_moon_sign, "")

    if bl and gl:
        if bl == gl:
            cancellations.append(f"Both Moon signs ruled by {bl}")
        elif _mutual_friends(bl, gl):
            cancellations.append(f"Moon-sign lords {bl} and {gl} are mutual friends")

    if boy_star_lord and boy_star_lord == girl_star_lord:
        cancellations.append(f"Both share the same star lord ({boy_star_lord})")

    cancelled = len(cancellations) > 0
    return {
        "raw_dosha": True,
        "cancelled": cancelled,
        "cancellations": cancellations,
        "net_severity": "Cancelled" if cancelled else "Stands",
        "note": (
            "Bhakoot dosha is present but CANCELLED — " + "; ".join(cancellations)
            if cancelled else
            "Bhakoot dosha present with no applicable parihara."
        ),
    }


# ── GANA DOSHA ────────────────────────────────────────────────────────

def gana_exception(
    *,
    boy_gana: str,
    girl_gana: str,
    boy_moon_sign: str,
    girl_moon_sign: str,
) -> dict:
    """
    Gana dosha softeners.

    The classical tables are asymmetric: a Rakshasa BOY with a Deva or
    Manushya girl is the harsh case, while a Manushya boy with a Rakshasa
    girl is explicitly noted as the exception and is not treated as a flat
    zero. Friendly Moon-sign lords soften it further.
    """
    harsh = (boy_gana == "Rakshasa" and girl_gana in ("Deva", "Manushya"))
    mild_exception = (boy_gana == "Manushya" and girl_gana == "Rakshasa")
    deva_rakshasa = {boy_gana, girl_gana} == {"Deva", "Rakshasa"}

    softeners: list[str] = []
    bl = SIGN_LORDS.get(boy_moon_sign, "")
    gl = SIGN_LORDS.get(girl_moon_sign, "")
    if bl and gl and (bl == gl or _mutual_friends(bl, gl)):
        softeners.append(f"Moon-sign lords {bl} and {gl} are friendly")
    if mild_exception:
        softeners.append(
            "Manushya boy with Rakshasa girl — classical exception, not a flat zero"
        )

    if boy_gana == girl_gana:
        severity = "None"
    elif deva_rakshasa:
        severity = "Softened" if softeners else "Significant"
    elif harsh:
        severity = "Softened" if softeners else "Moderate"
    elif mild_exception:
        severity = "Mild"
    else:
        severity = "None"

    return {
        "boy_gana": boy_gana, "girl_gana": girl_gana,
        "harsh_direction": harsh,
        "classical_exception": mild_exception,
        "softeners": softeners,
        "net_severity": severity,
        "note": (
            f"{boy_gana} boy / {girl_gana} girl — {severity.lower()}"
            + (f"; {'; '.join(softeners)}" if softeners else "")
        ),
    }


# ── MANGLIK / KUJA DOSHA ──────────────────────────────────────────────

MANGLIK_HOUSES = {1, 2, 4, 7, 8, 12}

# House/sign pairs that classically neutralise Manglik.
_HOUSE_SIGN_EXEMPTIONS = {
    2: {"Gemini", "Virgo"},
    12: {"Taurus", "Libra"},
    4: {"Aries", "Scorpio"},
    7: {"Capricorn", "Cancer"},
}


def manglik_cancellation(
    *,
    mars_house: int | None,
    mars_sign: str,
    lagna_sign: str = "",
    jupiter_influences_mars: bool = False,
    saturn_influences_mars: bool = False,
    both_manglik: bool = False,
    mars_navamsa_exalted: bool = False,
    moon_conjunct_mars: bool = False,
    jupiter_venus_in_lagna_or_7th: bool = False,
    age_years: float | None = None,
) -> dict:
    """
    Full classical parihara set for Manglik, well beyond the own-sign /
    exalted / Jupiter-aspect trio the engine checked before.

    Every input is optional — callers pass what they can compute, and the
    result states which cancellations actually applied.
    """
    if mars_house is None or mars_house not in MANGLIK_HOUSES:
        return {
            "raw_dosha": False, "cancelled": False, "cancellations": [],
            "net_severity": "None", "mars_house": mars_house,
            "note": f"No Manglik dosha (Mars in H{mars_house})."
                    if mars_house else "Mars position unavailable.",
        }

    cancellations: list[str] = []

    if both_manglik:
        cancellations.append("Both partners Manglik — mutually neutralising")
    if mars_sign in ("Aries", "Scorpio"):
        cancellations.append(f"Mars in its own sign ({mars_sign})")
    if mars_sign == "Capricorn":
        cancellations.append("Mars exalted in Capricorn")
    if mars_navamsa_exalted:
        cancellations.append("Mars exalted in the Navamsa")
    if jupiter_influences_mars:
        cancellations.append("Jupiter conjunct/aspecting Mars")
    if saturn_influences_mars:
        cancellations.append("Saturn aspecting Mars — Mars's force disciplined")
    if moon_conjunct_mars:
        cancellations.append("Moon conjunct Mars — dosha neutralised")
    if jupiter_venus_in_lagna_or_7th:
        cancellations.append("Jupiter–Venus in the lagna or 7th")
    if mars_house in _HOUSE_SIGN_EXEMPTIONS and mars_sign in _HOUSE_SIGN_EXEMPTIONS[mars_house]:
        cancellations.append(f"Mars in H{mars_house} in {mars_sign} — classical exemption")
    if lagna_sign in ("Cancer", "Leo"):
        cancellations.append(f"Mars is yogakaraka for {lagna_sign} lagna")

    maturation_note = None
    if age_years is not None and age_years >= 28:
        maturation_note = (
            "Mars matures around 28; classical practice treats the raw dosha "
            "as softened past that age."
        )

    cancelled = len(cancellations) > 0
    base_severity = "Severe" if mars_house in (7, 8) else \
                    "Moderate" if mars_house in (1, 12) else "Mild"

    return {
        "raw_dosha": True,
        "mars_house": mars_house,
        "mars_sign": mars_sign,
        "cancelled": cancelled,
        "cancellations": cancellations,
        "base_severity": base_severity,
        "net_severity": "Cancelled" if cancelled else base_severity,
        "maturation_note": maturation_note,
        "note": (
            f"Mars in H{mars_house} ({base_severity.lower()}) but CANCELLED — "
            + "; ".join(cancellations)
            if cancelled else
            f"Mars in H{mars_house} — {base_severity.lower()} Manglik, no "
            "applicable parihara found."
        ),
    }


def summarise_cancellations(*results: dict) -> dict:
    """
    Roll the individual dosha results into the one line an astrologer says
    to the family: what stands, what was cancelled.
    """
    standing, cancelled = [], []
    for r in results:
        if not r or not r.get("raw_dosha"):
            continue
        label = r.get("dosha_name") or r.get("note", "")[:24]
        (cancelled if r.get("cancelled") else standing).append(label)
    return {
        "any_standing": bool(standing),
        "standing": standing,
        "cancelled": cancelled,
        "note": (
            "All flagged doshas carry a valid parihara."
            if not standing and cancelled else
            "No doshas flagged." if not standing and not cancelled else
            f"{len(standing)} dosha(s) stand without parihara."
        ),
    }
