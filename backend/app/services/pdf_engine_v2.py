"""
KP Chart PDF Export Engine v2.

Phase 14 / PR A — full astrologer-grade KP report. Replaces the
3-page tables-only v1 (which stays in `pdf_engine.py` as the legacy
fallback) with a 30-50 page deterministic report covering every
section a practising KP astrologer needs to compose a consultation.

Design rules (locked-in by user review):
  - **NO LLM CALLS.** Every section is computed from the workspace
    dict (which is already populated by the engine when the chart is
    generated). Cost = $0. Always renders fully even if the user
    never visited the Analysis tab.
  - **NO Parashari-flavoured doshas** (Sade Sati / Kuja / Kaal Sarpa).
    KP weights these differently and we don't ship a strict-KP KB
    for them. Excluded to avoid rendering wrong verdicts.
  - **Same report for consumer + astrologer modes.** Brand cover
    differences come from a future astrologer-customisation pass;
    the body content is identical.

Sections, in order:
   1. Cover
   2. Table of contents
   3. Birth details + Panchang context
   4. South Indian chart with planet placements
   5. Planet positions — full KP table
   6. House cusps with CSL chains (Sub → Star → Sign)
   7. Ruling Planets at birth — KSK strength order + extended 5+2
   8. 4-level significators — all 12 houses (L1/L2/L3/L4)
   9. Per-house signification verdict (chain + houses signified)
  10. Vimshottari Mahadasha tree (full 120-year)
  11. Antardashas in current Mahadasha — detailed
  12. Pratyantardashas in current Antardasha
  13. Tara Chakra + Chandra Bala (today)
  14. Vargottama planets + sign-dignity reference
  15. Borderline CSL summary (birth-time precision flags)
  16. KP glossary
  17. Footer — engine version + chart fingerprint
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ─── Palette (same gold theme as v1) ───────────────────────────────────────
GOLD = colors.HexColor("#9B7D3A")
DARK_GOLD = colors.HexColor("#6B5220")
LIGHT_GOLD = colors.HexColor("#D4AF6A")
CARD_BG = colors.HexColor("#F8F6F1")
MUTED = colors.HexColor("#6B7280")
BORDER = colors.HexColor("#D1C5A8")
BORDER_FAINT = colors.HexColor("#E8DFC8")
WHITE = colors.white
BLACK = colors.HexColor("#1C1917")
GREEN = colors.HexColor("#059669")
RED = colors.HexColor("#DC2626")
BLUE = colors.HexColor("#2563EB")

SIGNS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


# ─── Styles ────────────────────────────────────────────────────────────────
def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title_xl": ParagraphStyle(
            "title_xl", parent=base["Title"],
            fontName="Helvetica-Bold", fontSize=30, leading=34,
            textColor=GOLD, alignment=TA_CENTER, spaceAfter=4,
        ),
        "title_sub": ParagraphStyle(
            "title_sub", fontName="Helvetica", fontSize=12, leading=16,
            textColor=MUTED, alignment=TA_CENTER, spaceAfter=14,
        ),
        "h1": ParagraphStyle(
            "h1", fontName="Helvetica-Bold", fontSize=18, leading=22,
            textColor=DARK_GOLD, spaceBefore=14, spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2", fontName="Helvetica-Bold", fontSize=13, leading=16,
            textColor=DARK_GOLD, spaceBefore=12, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", fontName="Helvetica-Bold", fontSize=11, leading=14,
            textColor=BLACK, spaceBefore=8, spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=10, leading=14,
            textColor=BLACK, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", fontName="Helvetica", fontSize=8, leading=11,
            textColor=MUTED,
        ),
        "footer": ParagraphStyle(
            "footer", fontName="Helvetica", fontSize=8, leading=10,
            textColor=MUTED, alignment=TA_CENTER,
        ),
        "verdict_yes": ParagraphStyle(
            "verdict_yes", fontName="Helvetica-Bold", fontSize=10,
            textColor=GREEN,
        ),
        "verdict_no": ParagraphStyle(
            "verdict_no", fontName="Helvetica-Bold", fontSize=10,
            textColor=RED,
        ),
        "label": ParagraphStyle(
            "label", fontName="Helvetica-Bold", fontSize=9,
            textColor=DARK_GOLD,
            spaceAfter=2,
        ),
    }


def _table_base() -> list:
    return [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GOLD),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), BLACK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CARD_BG]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]


# ─── Math helpers ─────────────────────────────────────────────────────────
def _navamsa_sign(longitude_deg: float) -> str:
    """KP/Vedic D9 navamsa sign for a given sidereal longitude (degrees).

    Each sign of 30° is divided into 9 navamsas of 3°20' each.
    Universal computational formula (independent of element-start rule):
        navamsa_idx = floor(longitude / 3.333…) % 12
    """
    if longitude_deg is None:
        return ""
    nav_size = 30.0 / 9.0  # 3.333333…
    idx = int(longitude_deg // nav_size) % 12
    return SIGNS_EN[idx]


def _is_vargottama(planet_sign_en: str, planet_longitude: float) -> bool:
    """True iff D1 sign == D9 sign for the planet."""
    if not planet_sign_en or planet_longitude is None:
        return False
    return _navamsa_sign(planet_longitude) == planet_sign_en


def _planet_dignity(planet_en: str, sign_en: str) -> str:
    """Classical dignity for a planet in a sign — exalted / debilitated /
    own / mooltrikona / friend / enemy / neutral. KP uses these rarely
    but they're useful reference data so we surface them here.
    """
    EXALT = {
        "Sun": "Aries", "Moon": "Taurus", "Mars": "Capricorn",
        "Mercury": "Virgo", "Jupiter": "Cancer", "Venus": "Pisces",
        "Saturn": "Libra", "Rahu": "Taurus", "Ketu": "Scorpio",
    }
    DEBIL = {
        "Sun": "Libra", "Moon": "Scorpio", "Mars": "Cancer",
        "Mercury": "Pisces", "Jupiter": "Capricorn", "Venus": "Virgo",
        "Saturn": "Aries", "Rahu": "Scorpio", "Ketu": "Taurus",
    }
    OWN = {
        "Sun": ["Leo"], "Moon": ["Cancer"], "Mars": ["Aries", "Scorpio"],
        "Mercury": ["Gemini", "Virgo"], "Jupiter": ["Sagittarius", "Pisces"],
        "Venus": ["Taurus", "Libra"], "Saturn": ["Capricorn", "Aquarius"],
    }
    if EXALT.get(planet_en) == sign_en:
        return "Exalted"
    if DEBIL.get(planet_en) == sign_en:
        return "Debilitated"
    if sign_en in OWN.get(planet_en, []):
        return "Own"
    return "—"


def _safe_float(v, default: float = 0.0) -> float:
    """Coerce to float. Frontend sometimes ships strings for lat/lon."""
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _chart_fingerprint(workspace: dict) -> str:
    """Stable hash of the chart so each PDF carries a verifiable
    fingerprint at the bottom — astrologers can confirm which chart a
    saved PDF belongs to without trusting the filename."""
    raw = "|".join([
        str(workspace.get("name", "")),
        str(workspace.get("date", "")),
        str(workspace.get("time", "")),
        f"{_safe_float(workspace.get('latitude', 0)):.4f}",
        f"{_safe_float(workspace.get('longitude', 0)):.4f}",
        f"{_safe_float(workspace.get('timezone_offset', 0)):.2f}",
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()


# ─── Section: Cover ───────────────────────────────────────────────────────
def _cover(workspace: dict, s: dict) -> list:
    flow: list = []
    name = workspace.get("name", "—")
    date = workspace.get("date", "—")
    time = workspace.get("time", "—")
    place = workspace.get("place") or ""
    lat = _safe_float(workspace.get("latitude"))
    lon = _safe_float(workspace.get("longitude"))
    flow.append(Spacer(1, 60 * mm))
    flow.append(Paragraph("KP JYOTISH REPORT", s["title_sub"]))
    flow.append(Paragraph(name, s["title_xl"]))
    flow.append(Paragraph(
        f"{date} · {time} · {place or f'{lat:.2f}°, {lon:.2f}°'}",
        s["title_sub"],
    ))
    flow.append(Spacer(1, 8 * mm))
    flow.append(HRFlowable(width="40%", thickness=0.6, color=GOLD,
                            hAlign="CENTER", spaceAfter=8))
    flow.append(Paragraph("Krishnamurti Paddhati · KSK strict",
                          s["title_sub"]))
    flow.append(Spacer(1, 80 * mm))
    flow.append(Paragraph(
        f"Generated by DevAstroAI · "
        f"{datetime.now().strftime('%d %b %Y · %H:%M')} IST",
        s["footer"],
    ))
    flow.append(Paragraph(
        f"Chart fingerprint · {_chart_fingerprint(workspace)}",
        s["footer"],
    ))
    flow.append(PageBreak())
    return flow


# ─── Section: Table of contents (manual, since dynamic TOC needs canvas) ──
def _toc(s: dict) -> list:
    flow: list = []
    flow.append(Paragraph("Contents", s["h1"]))
    flow.append(Spacer(1, 4))
    items = [
        ("1.  Birth Details · Panchang Context", "page 3"),
        ("2.  South Indian Chart", "page 5"),
        ("3.  Planet Positions — full KP table", "page 6"),
        ("4.  House Cusps with CSL Chains", "page 8"),
        ("5.  Ruling Planets — KSK Strength + Extended 5+2", "page 11"),
        ("6.  4-Level Significators (all 12 houses)", "page 12"),
        ("7.  Per-House Signification Verdict", "page 16"),
        ("8.  Vimshottari Mahadasha Tree (120-year)", "page 21"),
        ("9.  Antardashas in Current Mahadasha", "page 23"),
        ("10. Pratyantardashas in Current Antardasha", "page 26"),
        ("11. Tara Chakra · Chandra Bala", "page 27"),
        ("12. Vargottama Planets · Sign Dignities", "page 29"),
        ("13. Borderline CSL Summary", "page 30"),
        ("14. KP Glossary", "page 31"),
    ]
    rows = [[Paragraph(label, s["body"]),
             Paragraph(f"<i>{page_label}</i>", s["small"])]
            for label, page_label in items]
    t = Table(rows, colWidths=[140 * mm, 30 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER_FAINT),
    ]))
    flow.append(t)
    flow.append(Paragraph(
        "Page numbers are approximate — sections may flow across pages "
        "depending on chart density.",
        s["small"],
    ))
    flow.append(PageBreak())
    return flow


# ─── Section: Birth Details + Panchang ────────────────────────────────────
def _birth_details(workspace: dict, s: dict) -> list:
    flow: list = []
    name = workspace.get("name", "—")
    date = workspace.get("date", "—")
    time = workspace.get("time", "—")
    place = workspace.get("place") or "—"
    lat = _safe_float(workspace.get("latitude"))
    lon = _safe_float(workspace.get("longitude"))
    tz = _safe_float(workspace.get("timezone_offset"))
    pan_birth = workspace.get("panchangam_birth", {}) or {}

    flow.append(Paragraph("1.  Birth Details", s["h1"]))
    rows = [
        ["Name", name, "Date", date],
        ["Time (24h)", time, "Place", place],
        ["Latitude", f"{lat:.4f}°N" if lat >= 0 else f"{abs(lat):.4f}°S",
         "Longitude", f"{lon:.4f}°E" if lon >= 0 else f"{abs(lon):.4f}°W"],
        ["Timezone offset", f"UTC{'+' if tz >= 0 else ''}{tz:.2f}",
         "Ayanamsa", "KP-Krishnamurti (sidereal)"],
    ]
    t = Table(rows, colWidths=[35 * mm, 55 * mm, 30 * mm, 50 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
        ("TEXTCOLOR", (2, 0), (2, -1), DARK_GOLD),
        ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
        ("BACKGROUND", (2, 0), (2, -1), CARD_BG),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 10))

    if pan_birth:
        flow.append(Paragraph("Birth Panchang Context", s["h2"]))
        pan_rows = [
            ["Vara (weekday)", pan_birth.get("vara_en") or pan_birth.get("vara") or "—"],
            ["Tithi", pan_birth.get("tithi_en") or pan_birth.get("tithi") or "—"],
            ["Nakshatra", pan_birth.get("nakshatra_en") or pan_birth.get("nakshatra") or "—"],
            ["Nakshatra pada", str(pan_birth.get("nakshatra_pada", "—"))],
            ["Yoga", pan_birth.get("yoga_en") or pan_birth.get("yoga") or "—"],
            ["Karana", pan_birth.get("karana_en") or pan_birth.get("karana") or "—"],
            ["Hora lord (at birth)", pan_birth.get("hora_lord_en") or pan_birth.get("hora_lord") or "—"],
            ["Sunrise", pan_birth.get("sunrise") or "—"],
            ["Sunset", pan_birth.get("sunset") or "—"],
            ["Rahu Kalam", pan_birth.get("rahu_kalam") or "—"],
        ]
        pt = Table(pan_rows, colWidths=[55 * mm, 115 * mm])
        pt.setStyle(TableStyle(_table_base() + [
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
            ("BACKGROUND", (0, 0), (-1, 0), WHITE),
        ]))
        # The above will treat row 0 as header — rebuild without header.
        pt = Table(pan_rows, colWidths=[55 * mm, 115 * mm])
        pt.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
            ("TEXTCOLOR", (1, 0), (1, -1), BLACK),
            ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [WHITE, CARD_BG]),
            ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ]))
        flow.append(pt)
    flow.append(PageBreak())
    return flow


# ─── Section: South Indian Chart ──────────────────────────────────────────
def _south_indian_chart(planets: list, cusps: list) -> Table:
    house_map: dict[int, list[str]] = {i: [] for i in range(1, 13)}
    for p in planets:
        try:
            h = int(p.get("house", 0))
        except (ValueError, TypeError):
            h = 0
        if 1 <= h <= 12:
            short = p.get("planet_short") or (p.get("planet_en", "")[:2])
            if p.get("retrograde"):
                short += "℞"
            house_map[h].append(short)

    cusp_sign: dict[int, str] = {}
    cusp_deg: dict[int, str] = {}
    for c in cusps:
        cusp_sign[c.get("house_num", 0)] = (c.get("sign_en", "") or "")[:3]
        cusp_deg[c.get("house_num", 0)] = f"{c.get('degree_in_sign', 0):.0f}°"

    def cell(h: int) -> str:
        sign = cusp_sign.get(h, "")
        deg = cusp_deg.get(h, "")
        head = f"H{h} {sign} {deg}"
        body = " ".join(house_map[h])
        return f"{head}\n{body}" if body else head

    layout = [
        [cell(12), cell(1), cell(2), cell(3)],
        [cell(11), "", "", cell(4)],
        [cell(10), "", "", cell(5)],
        [cell(9), cell(8), cell(7), cell(6)],
    ]
    col_w = 38 * mm
    row_h = 32 * mm
    t = Table(layout, colWidths=[col_w] * 4, rowHeights=[row_h] * 4)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.8, BORDER),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLACK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (1, 1), (2, 2), CARD_BG),
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BACKGROUND", (1, 1), (2, 2), CARD_BG),
    ]))
    return t


def _section_chart(workspace: dict, s: dict) -> list:
    flow: list = []
    planets = workspace.get("planets", []) or []
    cusps = workspace.get("cusps", []) or []
    flow.append(Paragraph("2.  South Indian Chart", s["h1"]))
    flow.append(Paragraph(
        "Each cell carries the house number, sign, cusp degree, and "
        "any planets occupying that house. Lagna is H1.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    flow.append(_south_indian_chart(planets, cusps))
    flow.append(PageBreak())
    return flow


# ─── Section: Planet Positions (full KP) ──────────────────────────────────
def _section_planets(workspace: dict, s: dict) -> list:
    flow: list = []
    planets = workspace.get("planets", []) or []
    flow.append(Paragraph("3.  Planet Positions — full KP", s["h1"]))
    flow.append(Paragraph(
        "Each row carries the planet's sidereal degree, sign, "
        "nakshatra, star lord, sub lord, occupied house, and "
        "retrograde / vargottama flags.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [[
        "Planet", "Lon", "Sign", "Deg", "Nakshatra",
        "Star Lord", "Sub Lord", "H", "Vrg", "R",
    ]]
    for p in planets:
        lon = p.get("longitude", 0) or 0
        sign = p.get("sign_en", "") or ""
        vrg = "✓" if _is_vargottama(sign, lon) else ""
        retro = "℞" if p.get("retrograde") else ""
        rows.append([
            p.get("planet_en", ""),
            f"{lon:.2f}°",
            sign,
            f"{(p.get('degree_in_sign', 0) or 0):.2f}°",
            p.get("nakshatra_en", ""),
            p.get("star_lord_en", ""),
            p.get("sub_lord_en", ""),
            str(p.get("house", "")),
            vrg,
            retro,
        ])
    t = Table(rows, colWidths=[
        18 * mm, 17 * mm, 22 * mm, 16 * mm, 26 * mm,
        20 * mm, 20 * mm, 8 * mm, 10 * mm, 8 * mm,
    ])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(Spacer(1, 8))
    flow.append(Paragraph(
        "<b>Vrg</b> (Vargottama) — planet's D1 sign equals its D9 navamsa "
        "sign; signals strength.  <b>R</b> — retrograde.",
        s["small"],
    ))
    flow.append(PageBreak())
    return flow


# ─── Section: House Cusps with CSL chains ─────────────────────────────────
def _section_cusps(workspace: dict, s: dict) -> list:
    flow: list = []
    cusps = workspace.get("cusps", []) or []
    flow.append(Paragraph("4.  House Cusps · CSL Chains", s["h1"]))
    flow.append(Paragraph(
        "For every house, the cuspal Sub Lord is the most decisive single "
        "indicator in KP — its full chain (Sub → Star → Sign) gates "
        "what the house will or will not deliver.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["H", "Sign", "Cusp lon", "Nakshatra", "Sub Lord",
             "Star Lord", "Sign Lord", "Borderline?"]]
    sign_lord_map = {
        "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
        "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
        "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
        "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
    }
    for c in sorted(cusps, key=lambda x: x.get("house_num", 0)):
        sign = c.get("sign_en", "") or ""
        sign_lord = sign_lord_map.get(sign, "—")
        borderline = c.get("borderline_csl")
        bd = "—"
        if borderline:
            d = c.get("deg_to_nearest_boundary")
            bd = f"⚠ {d:.3f}°" if isinstance(d, (int, float)) else "⚠"
        rows.append([
            f"H{c.get('house_num', '')}",
            sign,
            f"{(c.get('cusp_longitude', 0) or 0):.3f}°",
            c.get("nakshatra_en", "") or "",
            c.get("sub_lord_en", "") or "",
            c.get("star_lord_en", "") or "",
            sign_lord,
            bd,
        ])
    t = Table(rows, colWidths=[
        12 * mm, 22 * mm, 22 * mm, 27 * mm,
        22 * mm, 22 * mm, 22 * mm, 22 * mm,
    ])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(Spacer(1, 8))
    flow.append(Paragraph(
        "<b>Borderline?</b> — cusp longitude is within 0.3° of a sub-lord "
        "boundary (≈ 1.2 minutes of clock time at average ascendant rate). "
        "When flagged, the cusp's CSL could flip with a small birth-time "
        "error; KP rectification via Ruling Planets is recommended.",
        s["small"],
    ))
    flow.append(PageBreak())
    return flow


# ─── Section: Ruling Planets (KSK strength + extended 5+2) ────────────────
def _section_ruling_planets(workspace: dict, s: dict) -> list:
    flow: list = []
    rp = workspace.get("ruling_planets", {}) or {}
    flow.append(Paragraph("5.  Ruling Planets · KSK Strength Order", s["h1"]))
    flow.append(Paragraph(
        "Ruling Planets at the native's moment of birth, ordered per "
        "K.S. Krishnamurti — Asc Star Lord (strongest) descending to "
        "Day Lord (weakest). The extended 5+2 system adds Asc Sub Lord "
        "and Moon Sub Lord.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    core = [
        ("1", "Asc Star Lord (strongest)", rp.get("lagna_star_lord_en") or "—"),
        ("2", "Asc Sign Lord", rp.get("lagna_sign_lord_en") or "—"),
        ("3", "Moon Star Lord", rp.get("moon_star_lord_en") or "—"),
        ("4", "Moon Sign Lord", rp.get("moon_sign_lord_en") or "—"),
        ("5", "Day Lord (weakest)", rp.get("day_lord_en") or "—"),
    ]
    rows = [["#", "Slot", "Planet"]] + [list(r) for r in core]
    t = Table(rows, colWidths=[10 * mm, 80 * mm, 80 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(Spacer(1, 8))

    # Extended 5+2
    asc_sub = rp.get("lagna_sub_lord_en") or ""
    moon_sub = rp.get("moon_sub_lord_en") or ""
    if asc_sub or moon_sub:
        flow.append(Paragraph("Extended (KSK 5+2)", s["h2"]))
        ext_rows = [["Slot", "Planet"]]
        if asc_sub:
            ext_rows.append(["Asc Sub Lord", asc_sub])
        if moon_sub:
            ext_rows.append(["Moon Sub Lord", moon_sub])
        et = Table(ext_rows, colWidths=[90 * mm, 80 * mm])
        et.setStyle(TableStyle(_table_base()))
        flow.append(et)
        flow.append(Spacer(1, 8))

    # Frequency table — which planet fills how many of the 7 slots
    ctx = rp.get("rp_context") or {}
    planet_slots: dict[str, list] = ctx.get("planet_slots") or {}
    strongest: list = ctx.get("strongest") or []
    if planet_slots:
        flow.append(Paragraph("RP Frequency · 7-slot map", s["h2"]))
        ranked = sorted(planet_slots.items(),
                        key=lambda kv: (-len(kv[1]), kv[0]))
        f_rows = [["Planet", "Slots filled", "Slots", "Strongest?"]]
        for planet, slots in ranked:
            star = "★" if planet in strongest else ""
            f_rows.append([
                planet, f"{len(slots)} / 7",
                ", ".join(slots), star,
            ])
        ft = Table(f_rows, colWidths=[28 * mm, 24 * mm, 100 * mm, 18 * mm])
        ft.setStyle(TableStyle(_table_base()))
        flow.append(ft)
    flow.append(PageBreak())
    return flow


# ─── Section: 4-level Significators ───────────────────────────────────────
def _section_significators(workspace: dict, s: dict) -> list:
    flow: list = []
    sigs = workspace.get("significators", {}) or {}
    flow.append(Paragraph("6.  Significators · All 12 Houses (4 levels)",
                          s["h1"]))
    flow.append(Paragraph(
        "KP four-level priority (strongest → weakest): "
        "<b>L1</b> planets in the star of occupants, "
        "<b>L2</b> occupants of the house, "
        "<b>L3</b> planets in the star of the house lord, "
        "<b>L4</b> the house lord itself.",
        s["body"],
    ))
    flow.append(Spacer(1, 8))
    for h in range(1, 13):
        sig = sigs.get(f"House_{h}", {}) or {}
        l1 = sig.get("planets_in_star_of_occupants_en") or []
        l2 = sig.get("occupants_en") or []
        l3 = sig.get("planets_in_star_of_lord_en") or []
        l4 = sig.get("house_lord_en") or "—"
        all_sig = sig.get("all_significators_en") or []
        flow.append(Paragraph(f"H{h} · {sig.get('house_te') or ''}", s["h3"]))
        rows = [
            ["L1 — in star of occupants",
             ", ".join(l1) if l1 else "—"],
            ["L2 — occupants",
             ", ".join(l2) if l2 else "—"],
            ["L3 — in star of lord",
             ", ".join(l3) if l3 else "—"],
            ["L4 — house lord", l4],
            ["All significators (priority order)",
             ", ".join(all_sig) if all_sig else "—"],
        ]
        t = Table(rows, colWidths=[60 * mm, 110 * mm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
            ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [WHITE, CARD_BG]),
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER_FAINT),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ]))
        flow.append(t)
        flow.append(Spacer(1, 6))
        if h % 3 == 0 and h < 12:
            flow.append(PageBreak())
    flow.append(PageBreak())
    return flow


# ─── Section: Per-House Signification Verdict ─────────────────────────────
def _section_per_house_verdict(workspace: dict, s: dict) -> list:
    flow: list = []
    csl_chains = workspace.get("csl_chains", {}) or {}
    flow.append(Paragraph("7.  Per-House Signification Verdict", s["h1"]))
    flow.append(Paragraph(
        "For each house, the cuspal Sub Lord's full signification chain — "
        "which houses it touches via its own occupation/rulership, its "
        "star lord's chain, and its sub lord's chain. The combined "
        "signification union is shown last.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    if not csl_chains:
        flow.append(Paragraph(
            "(No CSL chain data in workspace.)", s["small"]))
        flow.append(PageBreak())
        return flow
    # `csl_chains` is keyed by INT house numbers (1..12) — see
    # services/csl_chains.py. Tolerate both int and "H1"-string keys
    # in case backend ever emits either shape.
    def _to_int_key(k):
        if isinstance(k, int):
            return k
        try:
            return int(str(k).replace("H", "").replace("h", "")) or 0
        except ValueError:
            return 0
    keys = sorted(csl_chains.keys(), key=_to_int_key)
    for k in keys:
        chain = csl_chains.get(k) or {}
        if not chain:
            continue
        h = _to_int_key(k)
        flow.append(Paragraph(f"H{h} · CSL chain", s["h3"]))
        # Real field names from services/csl_chains.py:
        #   csl, csl_house, csl_rules, csl_star_lord,
        #   csl_star_lord_house, csl_star_lord_rules,
        #   csl_sub_lord, csl_sub_lord_house, all_significations
        csl = chain.get("csl") or "—"
        csl_house = chain.get("csl_house") or 0
        csl_rules = chain.get("csl_rules") or []
        star = chain.get("csl_star_lord") or "—"
        star_house = chain.get("csl_star_lord_house") or 0
        star_rules = chain.get("csl_star_lord_rules") or []
        sub_of_sub = chain.get("csl_sub_lord") or "—"
        sub_of_sub_house = chain.get("csl_sub_lord_house") or 0
        full = chain.get("all_significations") or []
        rows = [
            [
                "CSL (Sub Lord)",
                f"{csl} · in H{csl_house}" if csl_house else csl,
                "rules",
                ", ".join(f"H{x}" for x in csl_rules) or "—",
            ],
            [
                "CSL Star Lord",
                f"{star} · in H{star_house}" if star_house else star,
                "rules",
                ", ".join(f"H{x}" for x in star_rules) or "—",
            ],
            [
                "CSL Sub-Lord",
                f"{sub_of_sub} · in H{sub_of_sub_house}" if sub_of_sub_house else sub_of_sub,
                "—",
                "—",
            ],
            [
                "Combined chain",
                "",
                "All houses signified",
                ", ".join(f"H{x}" for x in full) or "—",
            ],
        ]
        t = Table(rows, colWidths=[30 * mm, 44 * mm, 22 * mm, 74 * mm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
            ("TEXTCOLOR", (2, 0), (2, -1), DARK_GOLD),
            ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
            ("BACKGROUND", (2, 0), (2, -1), CARD_BG),
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER_FAINT),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        flow.append(t)
        flow.append(Spacer(1, 4))
    flow.append(PageBreak())
    return flow


# ─── Section: Vimshottari Mahadasha Tree ──────────────────────────────────
def _section_vimshottari_md(workspace: dict, s: dict) -> list:
    flow: list = []
    md = workspace.get("mahadasha", {}) or {}
    md_tree = workspace.get("vimshottari_mahadasha_tree") \
        or workspace.get("mahadashas") \
        or workspace.get("mahadasha_periods") \
        or []
    flow.append(Paragraph("8.  Vimshottari Mahadasha Tree", s["h1"]))
    flow.append(Paragraph(
        "Full 120-year Vimshottari cycle. The currently-running MD is "
        "highlighted; lords cycle in the order Sun → Moon → Mars → Rahu → "
        "Jupiter → Saturn → Mercury → Ketu → Venus.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["Lord", "From", "To", "Years", "Active?"]]
    if md_tree:
        for d in md_tree:
            lord = d.get("lord_en") or d.get("lord") or "—"
            start = d.get("start") or "—"
            end = d.get("end") or "—"
            years = d.get("years")
            yr_str = f"{years}y" if years is not None else "—"
            active = "← NOW" if d.get("is_current") else ""
            rows.append([lord, start, end, yr_str, active])
    else:
        # Fallback: show only the current MD if no tree available
        rows.append([
            md.get("lord_en") or "—",
            md.get("start") or "—",
            md.get("end") or "—",
            "—",
            "← NOW",
        ])
    t = Table(rows, colWidths=[28 * mm, 36 * mm, 36 * mm, 24 * mm, 28 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(Spacer(1, 6))
    flow.append(Paragraph(
        "<i>Total cycle: 120 years (Sun 6 + Moon 10 + Mars 7 + Rahu 18 + "
        "Jupiter 16 + Saturn 19 + Mercury 17 + Ketu 7 + Venus 20).</i>",
        s["small"],
    ))
    flow.append(PageBreak())
    return flow


# ─── Section: Antardashas in current MD ───────────────────────────────────
def _section_antardashas(workspace: dict, s: dict) -> list:
    flow: list = []
    md = workspace.get("mahadasha", {}) or {}
    ad_list = workspace.get("antardashas", []) or []
    flow.append(Paragraph(
        f"9.  Antardashas in {md.get('lord_en') or '—'} Mahadasha", s["h1"]))
    flow.append(Paragraph(
        "Each Antardasha period within the running Mahadasha. The "
        "currently-active AD is marked. A KP astrologer reads bhukti "
        "fruits from the AD lord's signification chain combined with "
        "the MD lord's.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["Lord", "From", "To", "Active?"]]
    for d in ad_list:
        lord = d.get("lord_en") or "—"
        start = d.get("start") or "—"
        end = d.get("end") or "—"
        active = "← NOW" if d.get("is_current") else ""
        rows.append([lord, start, end, active])
    t = Table(rows, colWidths=[36 * mm, 44 * mm, 44 * mm, 30 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(PageBreak())
    return flow


# ─── Section: Pratyantardashas in current AD ──────────────────────────────
def _section_pratyantardashas(workspace: dict, s: dict) -> list:
    flow: list = []
    ad = workspace.get("current_antardasha", {}) or {}
    pad_list = workspace.get("pratyantardashas", []) or []
    flow.append(Paragraph(
        f"10. Pratyantardashas in {ad.get('lord_en') or '—'} Antardasha",
        s["h1"]))
    flow.append(Paragraph(
        "Sookshma-precision sub-period within the current AD. Day-level "
        "timing in KP is read from the PAD lord's chain crossing the AD "
        "lord's chain.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["Lord", "From", "To", "Active?"]]
    for d in pad_list:
        lord = d.get("lord_en") or "—"
        start = d.get("start") or "—"
        end = d.get("end") or "—"
        active = "← NOW" if d.get("is_current") else ""
        rows.append([lord, start, end, active])
    t = Table(rows, colWidths=[36 * mm, 44 * mm, 44 * mm, 30 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(PageBreak())
    return flow


# ─── Section: Tara Chakra + Chandra Bala ──────────────────────────────────
def _section_tara_chakra(workspace: dict, s: dict) -> list:
    flow: list = []
    tara = workspace.get("tara_chakra", {}) or {}
    flow.append(Paragraph("11. Tara Chakra · Chandra Bala", s["h1"]))
    flow.append(Paragraph(
        "Native's Navatara cycle relative to janma nakshatra (1st star). "
        "Each transit nakshatra falls into one of nine taras — Janma, "
        "Sampat, Vipat, Kshema, Pratyari, Sadhaka, Vadha, Mitra, Atimitra "
        "— colour-coded for friendliness.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    janma = tara.get("janma_nakshatra_en") or tara.get("janma_nakshatra") or "—"
    moon_sign = tara.get("janma_rasi_en") or tara.get("janma_rasi") or "—"
    flow.append(Paragraph(
        f"<b>Janma nakshatra:</b> {janma}  ·  "
        f"<b>Janma rasi:</b> {moon_sign}",
        s["body"],
    ))
    flow.append(Spacer(1, 6))

    chakra = tara.get("chakra") or []
    if chakra:
        flow.append(Paragraph("Full Navatara Chakra (27 nakshatras)",
                              s["h2"]))
        rows = [["#", "Nakshatra", "Tara", "Quality"]]
        for entry in chakra:
            num = str(entry.get("number") or entry.get("idx") or "")
            nak = entry.get("nakshatra_en") or entry.get("nakshatra") or ""
            tara_name = entry.get("tara_en") or entry.get("tara") or ""
            quality = entry.get("quality") or entry.get("polarity") or ""
            rows.append([num, nak, tara_name, quality])
        t = Table(rows, colWidths=[12 * mm, 50 * mm, 40 * mm, 60 * mm])
        t.setStyle(TableStyle(_table_base()))
        flow.append(t)
    flow.append(PageBreak())
    return flow


# ─── Section: Vargottama planets + dignities ──────────────────────────────
def _section_vargottama(workspace: dict, s: dict) -> list:
    flow: list = []
    planets = workspace.get("planets", []) or []
    flow.append(Paragraph("12. Vargottama Planets · Sign Dignities", s["h1"]))
    flow.append(Paragraph(
        "A planet is <b>vargottama</b> when its D1 (rasi) sign equals its "
        "D9 (navamsa) sign — strength signal independent of dignity. "
        "Sign-dignity (Exalted / Debilitated / Own) is included as "
        "reference data; KP weights signification chains over dignity.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["Planet", "D1 sign", "D9 navamsa", "Vargottama?", "Dignity"]]
    for p in planets:
        sign = p.get("sign_en", "") or ""
        lon = p.get("longitude", 0) or 0
        nav = _navamsa_sign(lon)
        v = "✓" if (sign == nav) else "—"
        dig = _planet_dignity(p.get("planet_en", ""), sign)
        rows.append([p.get("planet_en", ""), sign, nav, v, dig])
    t = Table(rows, colWidths=[32 * mm, 32 * mm, 32 * mm, 28 * mm, 32 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(PageBreak())
    return flow


# ─── Section: Borderline CSL Summary ──────────────────────────────────────
def _section_borderline(workspace: dict, s: dict) -> list:
    flow: list = []
    cusps = workspace.get("cusps", []) or []
    borderline = [c for c in cusps if c.get("borderline_csl")]
    flow.append(Paragraph("13. Borderline CSL · Birth-Time Precision",
                          s["h1"]))
    if not borderline:
        flow.append(Paragraph(
            "No cusp's CSL is within 0.3° of a sub-lord boundary in this "
            "chart. Birth time is precise enough that small errors will "
            "not flip any cuspal sub lord.",
            s["body"],
        ))
        flow.append(PageBreak())
        return flow
    flow.append(Paragraph(
        f"{len(borderline)} of 12 cusps have a CSL within 0.3° of a "
        "sub-lord boundary. A small birth-time error could flip the CSL "
        "for these houses, which means the underlying KP verdict for "
        "events tied to those houses could change. KP rectification via "
        "Ruling Planets is recommended before taking irreversible "
        "decisions on these life areas.",
        s["body"],
    ))
    flow.append(Spacer(1, 6))
    rows = [["House", "Sign", "Current CSL", "Distance to boundary",
             "Adjacent CSL"]]
    for c in borderline:
        d = c.get("deg_to_nearest_boundary")
        d_str = f"{d:.4f}°" if isinstance(d, (int, float)) else "—"
        adjacent = c.get("next_sub_lord_at_boundary") \
            or c.get("prev_sub_lord_at_boundary") or "—"
        rows.append([
            f"H{c.get('house_num', '')}",
            c.get("sign_en", "") or "",
            c.get("sub_lord_en", "") or "",
            d_str, adjacent,
        ])
    t = Table(rows, colWidths=[18 * mm, 28 * mm, 30 * mm, 50 * mm, 36 * mm])
    t.setStyle(TableStyle(_table_base()))
    flow.append(t)
    flow.append(PageBreak())
    return flow


# ─── Section: KP Glossary ─────────────────────────────────────────────────
def _section_glossary(s: dict) -> list:
    flow: list = []
    flow.append(Paragraph("14. KP Glossary", s["h1"]))
    items = [
        ("Cuspal Sub Lord (CSL)",
         "The Sub Lord of a house cusp — the single most decisive "
         "indicator in KP for whether a house will deliver its events. "
         "If the CSL signifies the relevant + supporting houses, the "
         "house is signified; if it signifies denial houses, denied."),
        ("Sub Lord",
         "Within each nakshatra of 13°20', the 9 sub-divisions are "
         "owned by the Vimshottari sequence in proportion to each "
         "lord's years. Each degree of the zodiac thus has a Sign Lord, "
         "Star Lord, and Sub Lord."),
        ("Star Lord (Nakshatra Lord)",
         "The lord of the nakshatra a planet or cusp falls in. In KP, "
         "the star lord governs the planet's results more than its "
         "sign lord."),
        ("Significator",
         "A planet that signifies a house, by occupation, by being in "
         "the star of the occupant, by being the house lord, or by "
         "being in the star of the house lord. KP uses 4 priority "
         "levels (L1 strongest → L4 weakest)."),
        ("Ruling Planets (RPs)",
         "Planets ruling the moment in question — Day Lord, Lagna Sign "
         "Lord, Lagna Star Lord, Moon Sign Lord, Moon Star Lord, plus "
         "the extended Asc Sub Lord and Moon Sub Lord (KSK 5+2 system). "
         "A signifying planet that is also an RP gains decisive weight."),
        ("Vimshottari Mahadasha",
         "120-year planetary cycle; each planet rules a fixed period "
         "(Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, "
         "Mercury 17, Ketu 7, Venus 20)."),
        ("Antardasha · Pratyantardasha",
         "Sub-periods within the running Mahadasha (and within each "
         "AD). KP timing fires when AD/PAD lords' signification chains "
         "overlap with the desired event's house-set."),
        ("Vargottama",
         "A planet whose rasi sign matches its navamsa sign — a "
         "strength marker independent of dignity."),
        ("Borderline CSL",
         "A cusp longitude within 0.3° of a sub-lord boundary — a "
         "small birth-time error could flip its CSL. Birth-time "
         "rectification recommended."),
        ("KSK Strict",
         "K.S. Krishnamurti's published methodology (the 6 KP Readers "
         "+ KP Calculations). DevAstroAI rejects post-KSK extensions "
         "(Khullar's CIL/SSL theory etc.) in favour of the original "
         "system."),
    ]
    for term, defn in items:
        flow.append(Paragraph(f"<b>{term}</b>", s["h3"]))
        flow.append(Paragraph(defn, s["body"]))
        flow.append(Spacer(1, 4))
    return flow


# ─── Footer canvas (page numbers + chart fingerprint per page) ────────────
def _make_footer(workspace: dict):
    fingerprint = _chart_fingerprint(workspace)
    name = workspace.get("name", "—")

    def _draw(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        # Left: chart + fingerprint
        canvas.drawString(
            18 * mm, 10 * mm,
            f"{name} · {workspace.get('date', '')} · fp:{fingerprint}",
        )
        # Right: page number
        page = canvas.getPageNumber()
        canvas.drawRightString(
            A4[0] - 18 * mm, 10 * mm,
            f"page {page}",
        )
        # Top thin gold line
        canvas.setStrokeColor(BORDER_FAINT)
        canvas.setLineWidth(0.3)
        canvas.line(18 * mm, A4[1] - 10 * mm,
                    A4[0] - 18 * mm, A4[1] - 10 * mm)
        canvas.restoreState()

    return _draw


# ─── Public entry ─────────────────────────────────────────────────────────
def generate_pdf_v2(workspace: dict) -> bytes:
    """Build the full v2 KP report and return its bytes."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=18 * mm,
    )
    s = _styles()
    story: list = []

    story += _cover(workspace, s)
    story += _toc(s)
    story += _birth_details(workspace, s)
    story += _section_chart(workspace, s)
    story += _section_planets(workspace, s)
    story += _section_cusps(workspace, s)
    story += _section_ruling_planets(workspace, s)
    story += _section_significators(workspace, s)
    story += _section_per_house_verdict(workspace, s)
    story += _section_vimshottari_md(workspace, s)
    story += _section_antardashas(workspace, s)
    story += _section_pratyantardashas(workspace, s)
    story += _section_tara_chakra(workspace, s)
    story += _section_vargottama(workspace, s)
    story += _section_borderline(workspace, s)
    story += _section_glossary(s)

    footer = _make_footer(workspace)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
