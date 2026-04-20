"""
Canonical KP 1-249 sub-lord table.

The zodiac has 27 nakshatras × 9 sub-lords = 243 base subs. The KP canonical
table has 249 entries because 6 sub-lords cross a sign boundary and are each
represented as TWO rows (one per sign). The 6 boundary crossings occur at
the same positions in the Rahu-Moon-Mars nakshatra sequence for each of 3
signs that end mid-nakshatra-sub: effectively Rahu's sub and Moon's sub
each get extra split rows at Cancer/Leo, Scorpio/Sagittarius, and Pisces/Aries.

Rather than hand-maintain the 249 rows, we generate them programmatically
and insert the 6 sign-boundary split rows in-place so the table is correct
by construction.

Reference: JyotishPortal canonical table
           https://jyotishportal.com/KPResource/KP1-249.aspx
           (cross-referenced with KSK "A Handbook of Astrology — KP Reader I")

Each entry contains:
    num:            1-249, monotonically increasing with longitude
    lon_start:      starting sidereal longitude (0-360), KP New ayanamsa
    lon_end:        ending sidereal longitude
    sign:           zodiac sign of lon_start (Aries .. Pisces)
    nakshatra_idx:  0-26
    nakshatra:      nakshatra name
    star_lord:      nakshatra lord
    sub_lord:       sub lord

The "Query Lagna longitude" for a given prashna number is lon_start.
"""
from __future__ import annotations

NAKSHATRA_SPAN = 360.0 / 27  # 13°20' = 13.333...

NAKSHATRAS = [
    ("Ashwini", "Ketu"), ("Bharani", "Venus"), ("Krittika", "Sun"),
    ("Rohini", "Moon"), ("Mrigashira", "Mars"), ("Ardra", "Rahu"),
    ("Punarvasu", "Jupiter"), ("Pushya", "Saturn"), ("Ashlesha", "Mercury"),
    ("Magha", "Ketu"), ("Purva Phalguni", "Venus"), ("Uttara Phalguni", "Sun"),
    ("Hasta", "Moon"), ("Chitra", "Mars"), ("Swati", "Rahu"),
    ("Vishakha", "Jupiter"), ("Anuradha", "Saturn"), ("Jyeshtha", "Mercury"),
    ("Mula", "Ketu"), ("Purva Ashadha", "Venus"), ("Uttara Ashadha", "Sun"),
    ("Shravana", "Moon"), ("Dhanishta", "Mars"), ("Shatabhisha", "Rahu"),
    ("Purva Bhadrapada", "Jupiter"), ("Uttara Bhadrapada", "Saturn"),
    ("Revati", "Mercury"),
]

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

LORD_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars",
                 "Rahu", "Jupiter", "Saturn", "Mercury"]

DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}
TOTAL_DASHA = 120


def _sign_of(longitude: float) -> str:
    """Zodiac sign of a given longitude (0-360)."""
    return SIGNS[int((longitude % 360) / 30)]


def _build_249_table() -> list[dict]:
    """
    Generate the 249-row KP sub-lord table.

    Core logic:
        For each of 27 nakshatras, iterate 9 sub-lords in order starting
        from the nakshatra lord. Each sub's span is proportional to its
        dasha years. If a sub crosses a sign boundary (lon_start in sign A
        but lon_end in sign B), split it into TWO rows — one ending at the
        sign boundary (sign A), one starting at the sign boundary (sign B).
        Both rows keep the same nakshatra + sub-lord since both fields are
        determined by longitude within the nakshatra, not by sign.
    """
    rows: list[dict] = []
    num = 1

    for nak_idx in range(27):
        nak_start_lon = nak_idx * NAKSHATRA_SPAN
        nak_name, nak_lord = NAKSHATRAS[nak_idx]
        start_idx = LORD_SEQUENCE.index(nak_lord)

        current_lon = nak_start_lon
        for j in range(9):
            sub_lord = LORD_SEQUENCE[(start_idx + j) % 9]
            span = (DASHA_YEARS[sub_lord] / TOTAL_DASHA) * NAKSHATRA_SPAN
            sub_end = current_lon + span

            # Does this sub cross a sign boundary?
            start_sign_idx = int(current_lon / 30)
            end_sign_idx = int(sub_end / 30) if sub_end < 360 else 11
            # sub_end exactly on a 30° boundary still counts as start_sign
            if abs(sub_end - (end_sign_idx * 30)) < 1e-9 and end_sign_idx != start_sign_idx:
                end_sign_idx -= 1

            if start_sign_idx == end_sign_idx:
                # single-sign sub — one row
                rows.append({
                    "num": num,
                    "lon_start": round(current_lon % 360, 6),
                    "lon_end": round(sub_end % 360 if sub_end < 360 else 360.0, 6),
                    "sign": SIGNS[start_sign_idx],
                    "nakshatra_idx": nak_idx,
                    "nakshatra": nak_name,
                    "star_lord": nak_lord,
                    "sub_lord": sub_lord,
                })
                num += 1
            else:
                # sub crosses a sign boundary — split into TWO rows
                boundary_lon = (start_sign_idx + 1) * 30.0
                rows.append({
                    "num": num,
                    "lon_start": round(current_lon % 360, 6),
                    "lon_end": round(boundary_lon % 360, 6),
                    "sign": SIGNS[start_sign_idx],
                    "nakshatra_idx": nak_idx,
                    "nakshatra": nak_name,
                    "star_lord": nak_lord,
                    "sub_lord": sub_lord,
                })
                num += 1
                rows.append({
                    "num": num,
                    "lon_start": round(boundary_lon % 360, 6),
                    "lon_end": round(sub_end % 360 if sub_end < 360 else 360.0, 6),
                    "sign": SIGNS[end_sign_idx],
                    "nakshatra_idx": nak_idx,
                    "nakshatra": nak_name,
                    "star_lord": nak_lord,
                    "sub_lord": sub_lord,
                })
                num += 1

            current_lon = sub_end

    return rows


KP_249_TABLE: list[dict] = _build_249_table()
assert len(KP_249_TABLE) == 249, f"Expected 249 rows, got {len(KP_249_TABLE)}"


def number_to_lagna_longitude(number: int) -> tuple[float, dict]:
    """
    Map a KP prashna number (1-249) to the starting longitude of that sub
    and return the matching table row.

    Raises ValueError for numbers outside 1-249 — no more silent modulo wrap.
    """
    if not 1 <= number <= 249:
        raise ValueError(f"Prashna number must be 1-249, got {number}")
    row = KP_249_TABLE[number - 1]
    return row["lon_start"], row
