"""
south_indian_matching.py — Dashakoota (10 Porutham) + Papa Samyam.

WHY THIS MODULE EXISTS (2026-08-01)
-----------------------------------
Our Match tab was built on the NORTH INDIAN frame (Ashtakoota, 36 gunas).
South Indian / Telugu practice — which is what our primary astrologer
audience actually uses — runs a DIFFERENT system:

  * Dashakoota (10 poruthams) rather than Ashtakoota (8 kootas)
  * Rajju is checked FIRST, before any total
  * Rajju + Vedha are treated as HARD BLOCKERS by many practitioners
    (reject regardless of score) — though NOT all astrologers weigh them
    that heavily, hence the dual verdict below
  * Papa Samyam — a per-chart affliction load, compared between the two
    charts. This is the tool behind "her chart alone is not good, I would
    not recommend the match no matter how many points it scores."

This module is deliberately SELF-CONTAINED (no imports from
compatibility_engine) so it can never create a circular import and so the
sacred engine internals are untouched. compatibility_engine imports THIS.

Everything here is additive: new computations, no existing verdict is
modified by this file.

Sources consulted (2026-08-01): prokerala 10-porutham + vedha-porutham
tables; sahitavivahamatching Telugu jathakam porutham guide; astroved dina
porutham; jyotish-research + sreenivasdesabhatla on Papa Samyam.
"""

from __future__ import annotations

# ── Nakshatra order (index 0 = Ashwini) ───────────────────────────────
NAKSHATRA_ORDER = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
    "Revati",
]

# Tolerant alias map — the rest of the codebase is inconsistent about a few
# spellings (Dhanishta/Dhanishtha, Mula/Moola, Shatabhisha/Satabhisha).
# Silent lookup failures here would corrupt Vedha/Rajju verdicts, so every
# lookup goes through _canon().
_NAK_ALIASES = {
    "dhanishta": "Dhanishtha", "dhanista": "Dhanishtha",
    "moola": "Mula", "mool": "Mula",
    "satabhisha": "Shatabhisha", "shatabhishaj": "Shatabhisha",
    "sathabhisha": "Shatabhisha",
    "mrigashirsha": "Mrigashira", "mrigasira": "Mrigashira",
    "jyeshta": "Jyeshtha", "jyestha": "Jyeshtha",
    "uttarashada": "Uttara Ashadha", "uttara ashada": "Uttara Ashadha",
    "purvashada": "Purva Ashadha", "purva ashada": "Purva Ashadha",
    "uttara bhadrapad": "Uttara Bhadrapada",
    "purva bhadrapad": "Purva Bhadrapada",
    "ashlesa": "Ashlesha", "aslesha": "Ashlesha",
    "aswini": "Ashwini",
    "vishaka": "Vishakha", "visakha": "Vishakha",
}


def _canon(nak: str) -> str:
    """Normalise a nakshatra name to our canonical spelling ('' if unknown)."""
    if not nak:
        return ""
    n = nak.strip()
    if n in NAKSHATRA_ORDER:
        return n
    return _NAK_ALIASES.get(n.lower(), "")


# ── VEDHA PORUTHAM ────────────────────────────────────────────────────
# 12 canonical mutually-afflicting pairs (24 nakshatras) — verified against
# prokerala's vedha table. The remaining 3 (Mrigashira, Chitra, Dhanishtha)
# are mutually vedha to one another, which completes all 27.
VEDHA_PAIRS = [
    ("Ashwini", "Jyeshtha"),
    ("Bharani", "Anuradha"),
    ("Krittika", "Vishakha"),
    ("Rohini", "Swati"),
    ("Ardra", "Shravana"),
    ("Punarvasu", "Uttara Ashadha"),
    ("Pushya", "Purva Ashadha"),
    ("Ashlesha", "Mula"),
    ("Magha", "Revati"),
    ("Purva Phalguni", "Uttara Bhadrapada"),
    ("Uttara Phalguni", "Purva Bhadrapada"),
    ("Hasta", "Shatabhisha"),
]
# The mutually-vedha triad.
VEDHA_TRIAD = {"Mrigashira", "Chitra", "Dhanishtha"}

_VEDHA_LOOKUP: dict[str, set[str]] = {}
for _a, _b in VEDHA_PAIRS:
    _VEDHA_LOOKUP.setdefault(_a, set()).add(_b)
    _VEDHA_LOOKUP.setdefault(_b, set()).add(_a)
for _t in VEDHA_TRIAD:
    _VEDHA_LOOKUP.setdefault(_t, set()).update(VEDHA_TRIAD - {_t})


def calc_vedha(boy_nak: str, girl_nak: str) -> dict:
    """
    Vedha Porutham — 'piercing'/affliction between the two birth stars.

    Pass/fail (not a graded score). Traditionally a Vedha pair is a
    rejection-grade signal in South Indian practice.
    """
    b = _canon(boy_nak)
    g = _canon(girl_nak)
    if not b or not g:
        return {
            "porutham": "Vedha", "passed": True, "has_dosha": False,
            "boy_nakshatra": boy_nak, "girl_nakshatra": girl_nak,
            "lookup_ok": False,
            "note": "Vedha lookup failed (unrecognised nakshatra) — treated as neutral",
        }
    afflicts = g in _VEDHA_LOOKUP.get(b, set())
    return {
        "porutham": "Vedha",
        "passed": not afflicts,
        "has_dosha": afflicts,
        "boy_nakshatra": b, "girl_nakshatra": g,
        "lookup_ok": True,
        "note": (f"{b} and {g} are a Vedha pair — mutually afflicting stars"
                 if afflicts else
                 f"{b} and {g} carry no Vedha — stars are not in conflict"),
    }


# ── DINA PORUTHAM ─────────────────────────────────────────────────────
# Dina (a.k.a. Dina Kuta / Tara Kuta in the South) — count from the GIRL's
# star to the BOY's star, divide by 9; remainders 2,4,6,8,0 are favourable
# (i.e. 1,3,5,7 = Janma/Vipat/Pratyari/Vadha are not).
_DINA_FAVOURABLE = {2, 4, 6, 8, 0}
_TARA_NAMES = {
    1: "Janma", 2: "Sampat", 3: "Vipat", 4: "Kshema", 5: "Pratyari",
    6: "Sadhaka", 7: "Vadha", 8: "Mitra", 0: "Ati Mitra",
}


def calc_dina(boy_nak: str, girl_nak: str) -> dict:
    """Dina Porutham — health/wellbeing of the union via star-count."""
    b = _canon(boy_nak)
    g = _canon(girl_nak)
    if not b or not g:
        return {"porutham": "Dina", "passed": True, "has_dosha": False,
                "lookup_ok": False,
                "note": "Dina lookup failed — treated as neutral"}
    gi = NAKSHATRA_ORDER.index(g)
    bi = NAKSHATRA_ORDER.index(b)
    count = ((bi - gi) % 27) + 1          # inclusive count, girl → boy
    rem = count % 9
    ok = rem in _DINA_FAVOURABLE
    return {
        "porutham": "Dina",
        "passed": ok, "has_dosha": not ok,
        "count": count, "remainder": rem,
        "tara_name": _TARA_NAMES.get(rem, "?"),
        "lookup_ok": True,
        "note": (f"Girl→Boy count {count}, remainder {rem} "
                 f"({_TARA_NAMES.get(rem, '?')}) — "
                 + ("favourable" if ok else "not favourable")),
    }


# ── PAPA SAMYAM (affliction balance) ──────────────────────────────────
# Papa grahas and the houses in which they generate affliction. Counted
# THREE times over: from Lagna, from the Moon, and from Venus.
PAPA_GRAHAS = ["Sun", "Mars", "Saturn", "Rahu", "Ketu"]
PAPA_HOUSES = {1, 2, 4, 7, 8, 12}
PAPA_REFERENCES = ["Lagna", "Moon", "Venus"]

_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


def _sign_index(longitude: float) -> int:
    return int((longitude % 360) // 30)


def _whole_sign_house(planet_lon: float, reference_lon: float) -> int:
    """Whole-sign house of a planet counted from a reference point (1..12).

    Papa Samyam is a rasi-based (whole-sign) technique, NOT a KP-cusp one —
    so we deliberately count signs here rather than reuse the cuspal house
    logic used elsewhere in the app.
    """
    return ((_sign_index(planet_lon) - _sign_index(reference_lon)) % 12) + 1


def compute_papa_samyam(planets: dict, lagna_lon: float) -> dict:
    """
    Papa Samyam for ONE chart.

    Args:
        planets: {"Sun": {"longitude": deg}, ...} (as built by _build_chart)
        lagna_lon: ascendant longitude in degrees

    Returns a per-reference breakdown plus a total papa count. Each
    (papa graha × reference) hit counts 1, so the ceiling is
    5 grahas × 3 references = 15.

    We deliberately use a transparent COUNT rather than one of the several
    incompatible weighted schemes in circulation: the astrologer can see
    exactly which planet, in which house, from which reference — which is
    what makes the number defensible to a client.
    """
    refs: dict[str, float | None] = {"Lagna": lagna_lon}
    refs["Moon"] = (planets.get("Moon") or {}).get("longitude")
    refs["Venus"] = (planets.get("Venus") or {}).get("longitude")

    breakdown: dict[str, dict] = {}
    hits_all: list[dict] = []
    total = 0

    for ref_name in PAPA_REFERENCES:
        ref_lon = refs.get(ref_name)
        if ref_lon is None:
            breakdown[ref_name] = {
                "available": False, "count": 0, "hits": [],
                "note": f"{ref_name} not available — reference skipped",
            }
            continue
        hits = []
        for graha in PAPA_GRAHAS:
            p = planets.get(graha)
            if not p or "longitude" not in p:
                continue
            house = _whole_sign_house(p["longitude"], ref_lon)
            if house in PAPA_HOUSES:
                hit = {
                    "graha": graha, "house": house, "reference": ref_name,
                    "sign": _SIGNS[_sign_index(p["longitude"])],
                }
                hits.append(hit)
                hits_all.append(hit)
        total += len(hits)
        breakdown[ref_name] = {
            "available": True,
            "count": len(hits),
            "hits": hits,
            "note": (f"{len(hits)} papa graha(s) in houses "
                     f"{sorted({h['house'] for h in hits})} from {ref_name}"
                     if hits else f"No papa grahas in affliction houses from {ref_name}"),
        }

    if total == 0:
        band = "Clean"
    elif total <= 3:
        band = "Light"
    elif total <= 6:
        band = "Moderate"
    elif total <= 9:
        band = "Heavy"
    else:
        band = "Very heavy"

    return {
        "total": total,
        "max_possible": len(PAPA_GRAHAS) * len(PAPA_REFERENCES),
        "band": band,
        "by_reference": breakdown,
        "hits": hits_all,
        "note": f"Papa load {total}/15 ({band})",
    }


def compare_papa_samyam(boy_papa: dict, girl_papa: dict) -> dict:
    """
    Papa Samyam comparison between the two charts.

    Classical rule as recorded in South Indian sources: the two affliction
    loads should be EQUAL, or the BOY's may be the higher one. If the
    GIRL's load exceeds the boy's, the match is traditionally not
    recommended — irrespective of the guna total.

    IMPORTANT FRAMING: we report this as the classical convention plus the
    raw numbers, and we ALSO report the symmetric (gender-neutral) reading,
    because many modern practitioners apply it as a simple balance test.
    The astrologer decides which to apply. We never auto-reject.
    """
    b = boy_papa.get("total", 0)
    g = girl_papa.get("total", 0)
    diff = abs(b - g)

    if diff == 0:
        balance = "Equal"
    elif diff <= 2:
        balance = "Near-balanced"
    else:
        balance = "Imbalanced"

    classical_ok = g <= b          # girl's load must not exceed boy's
    symmetric_ok = diff <= 2       # gender-neutral balance reading

    return {
        "boy_total": b, "girl_total": g, "difference": diff,
        "balance": balance,
        "classical_rule_satisfied": classical_ok,
        "symmetric_rule_satisfied": symmetric_ok,
        "classical_note": (
            "Girl's affliction load does not exceed the boy's — classical "
            "Papa Samyam condition is satisfied."
            if classical_ok else
            "Girl's affliction load EXCEEDS the boy's — classical Papa Samyam "
            "condition is NOT satisfied. Traditionally this alone is grounds "
            "to decline the match regardless of guna score."
        ),
        "symmetric_note": (
            f"Loads are {balance.lower()} ({b} vs {g}) — afflictions broadly "
            "cancel between the charts."
            if symmetric_ok else
            f"Loads differ by {diff} ({b} vs {g}) — one partner carries "
            "materially more affliction than the other."
        ),
        "note": f"Boy {b}/15 vs Girl {g}/15 — {balance}",
    }


# ── DASHAKOOTA ASSEMBLY ───────────────────────────────────────────────
# The 10 South Indian poruthams and where each already lives in our
# Ashtakoota / extended-koota output. We only had to ADD Vedha and Dina;
# the other eight are re-used (not recomputed) so the two systems can never
# disagree with each other.
DASHAKOOTA_PORUTHAMS = [
    "Dina", "Gana", "Yoni", "Rasi", "Rasyadhipathi",
    "Rajju", "Vedha", "Vasya", "Mahendra", "Stree Deergha",
]

# Poruthams that a large part of South Indian practice treats as absolute
# blockers. Kept as data (not hardcoded logic) so the dual verdict below
# can be computed both with and without them.
HARD_BLOCKER_PORUTHAMS = ["Rajju", "Vedha"]


def build_dashakoota(
    *,
    boy_nakshatra: str,
    girl_nakshatra: str,
    ashtakoota: dict,
    extended: dict,
) -> dict:
    """
    Assemble the South Indian Dashakoota (10 poruthams) by REUSING the
    already-computed Ashtakoota/extended koota results and adding the two
    that were missing (Vedha, Dina).

    Mapping (South Indian name ← our existing koota):
        Dina          ← Tara
        Gana          ← Gana
        Yoni          ← Yoni
        Rasi          ← Bhakoota
        Rasyadhipathi ← Graha Maitri
        Vasya         ← Vasya
        Rajju         ← Rajju        (extended)
        Mahendra      ← Mahendra     (extended)
        Stree Deergha ← Stree Deergha(extended)
        Vedha         ← (new, this module)

    Note Varna and Nadi are Ashtakoota-only and are intentionally NOT part
    of the Dashakoota.

    Returns pass/fail per porutham (the authentic South Indian reading is
    'porutham present or absent', not a points total) plus a count out of
    10, and a DUAL verdict — one honouring Rajju/Vedha as hard blockers and
    one ignoring them — because practitioners genuinely differ on this.
    """
    by_name = {k.get("kuta"): k for k in (ashtakoota.get("kutas") or [])}
    ext = extended or {}

    def _from_koota(koota_key: str, label: str) -> dict:
        k = by_name.get(koota_key)
        if not k:
            return {"porutham": label, "passed": True, "has_dosha": False,
                    "lookup_ok": False, "note": f"{label} unavailable — neutral"}
        score = k.get("score", 0)
        mx = k.get("max", 1) or 1
        # A porutham is 'present' when it scores above zero and carries no
        # explicit dosha flag. Half-credit still counts as present.
        passed = (score > 0) and not k.get("has_dosha", False)
        return {
            "porutham": label, "passed": passed,
            "has_dosha": bool(k.get("has_dosha", False)),
            "score": score, "max": mx, "lookup_ok": True,
            "note": k.get("note", ""),
        }

    def _from_ext(ext_key: str, label: str) -> dict:
        k = ext.get(ext_key)
        if not k:
            return {"porutham": label, "passed": True, "has_dosha": False,
                    "lookup_ok": False, "note": f"{label} unavailable — neutral"}
        score = k.get("score", 0)
        passed = (score > 0) and not k.get("has_dosha", False)
        return {
            "porutham": label, "passed": passed,
            "has_dosha": bool(k.get("has_dosha", False)),
            "score": score, "max": k.get("max", 1), "lookup_ok": True,
            "note": k.get("note", ""),
        }

    vedha = calc_vedha(boy_nakshatra, girl_nakshatra)
    dina = calc_dina(boy_nakshatra, girl_nakshatra)

    poruthams = [
        dina,
        _from_koota("Gana", "Gana"),
        _from_koota("Yoni", "Yoni"),
        _from_koota("Bhakoota", "Rasi"),
        _from_koota("Graha Maitri", "Rasyadhipathi"),
        _from_ext("rajju", "Rajju"),
        vedha,
        _from_koota("Vasya", "Vasya"),
        _from_ext("mahendra", "Mahendra"),
        _from_ext("stree_deergha", "Stree Deergha"),
    ]

    passed_all = [p for p in poruthams if p["passed"]]
    blockers_hit = [p["porutham"] for p in poruthams
                    if p["porutham"] in HARD_BLOCKER_PORUTHAMS and not p["passed"]]

    # Verdict IGNORING the hard blockers (count out of 10)
    count_all = len(passed_all)

    # Verdict over the 8 non-blocker poruthams only
    non_blockers = [p for p in poruthams
                    if p["porutham"] not in HARD_BLOCKER_PORUTHAMS]
    count_non_blocker = len([p for p in non_blockers if p["passed"]])

    def _band(passed: int, total: int) -> str:
        pct = passed / total * 100 if total else 0
        if pct >= 80:
            return "Excellent"
        if pct >= 60:
            return "Good"
        if pct >= 40:
            return "Average"
        return "Weak"

    verdict_strict = (
        "Rejected by tradition — " + " + ".join(blockers_hit) + " dosha"
        if blockers_hit else _band(count_all, len(poruthams))
    )
    verdict_lenient = _band(count_non_blocker, len(non_blockers))

    return {
        "system": "Dashakoota (South Indian · 10 Porutham)",
        "poruthams": poruthams,
        "passed_count": count_all,
        "total_count": len(poruthams),
        "hard_blockers": HARD_BLOCKER_PORUTHAMS,
        "hard_blockers_hit": blockers_hit,
        # ── DUAL VERDICT ──
        # Practitioners genuinely differ on whether Rajju/Vedha are absolute
        # blockers, so we publish BOTH readings and let the astrologer choose.
        "verdict_strict": {
            "label": verdict_strict,
            "counts_blockers": True,
            "passed": count_all, "total": len(poruthams),
            "note": (
                "Traditional South Indian reading — Rajju and Vedha are "
                "treated as absolute blockers. "
                + (f"Blocked by: {', '.join(blockers_hit)}." if blockers_hit
                   else "No blocker triggered.")
            ),
        },
        "verdict_without_blockers": {
            "label": verdict_lenient,
            "counts_blockers": False,
            "passed": count_non_blocker, "total": len(non_blockers),
            "note": (
                "Reading for practitioners who do NOT treat Rajju/Vedha as "
                "absolute — scored over the other 8 poruthams only."
            ),
        },
        "verdicts_disagree": bool(blockers_hit),
    }
