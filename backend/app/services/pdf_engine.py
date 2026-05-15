"""
KP Chart PDF Export Engine.
Generates a professional PDF report from workspace data using reportlab.
"""
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Color palette matching the dark UI theme (adapted for PDF white background)
GOLD = colors.HexColor("#9B7D3A")
DARK_GOLD = colors.HexColor("#6B5220")
LIGHT_GOLD = colors.HexColor("#D4AF6A")
DARK_BG = colors.HexColor("#1A1A2E")
CARD_BG = colors.HexColor("#F8F6F1")
MUTED = colors.HexColor("#6B7280")
BORDER = colors.HexColor("#D1C5A8")
WHITE = colors.white
BLACK = colors.HexColor("#1C1917")
GREEN = colors.HexColor("#059669")
RED = colors.HexColor("#DC2626")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=22, textColor=GOLD, spaceAfter=2, alignment=TA_CENTER),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, textColor=MUTED, spaceAfter=8, alignment=TA_CENTER),
        "section": ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=13, textColor=DARK_GOLD, spaceBefore=14, spaceAfter=6),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, textColor=BLACK, spaceAfter=4),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, textColor=MUTED),
        "footer": ParagraphStyle("footer", fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER),
        "kuta_header": ParagraphStyle("kuta_header", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE),
    }


def _table_style_base():
    return [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GOLD),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), BLACK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CARD_BG]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]


def _south_indian_chart(planets: list, cusps: list) -> Table:
    """
    Build a 4×4 South Indian chart grid as a reportlab Table.
    Houses in fixed positions:
      [12][1][2][3]
      [11][ ][ ][4]
      [10][ ][ ][5]
      [9 ][8][7][6]
    """
    # Map house → planets
    house_map: dict[int, list[str]] = {i: [] for i in range(1, 13)}
    for p in planets:
        # PR A1.3-fix-24 — chart_formatter emits "house" as a STRING
        # (e.g. "7"). Without int() coercion, `1 <= "7" <= 12` raises
        # TypeError → PDF crashed for every chart with planets in houses.
        try:
            h = int(p.get("house", 0))
        except (ValueError, TypeError):
            h = 0
        if 1 <= h <= 12:
            short = p.get("planet_short", p.get("planet_en", "")[:2])
            if p.get("retrograde"):
                short += "℞"
            house_map[h].append(short)

    # House cusp sign
    cusp_sign: dict[int, str] = {}
    for c in cusps:
        cusp_sign[c.get("house_num", 0)] = c.get("sign_en", "")[:3]

    def cell(h: int) -> str:
        sign = cusp_sign.get(h, "")
        planets_str = " ".join(house_map[h])
        return f"H{h}\n{sign}\n{planets_str}" if planets_str else f"H{h}\n{sign}"

    layout = [
        [cell(12), cell(1), cell(2), cell(3)],
        [cell(11), "",       "",      cell(4)],
        [cell(10), "",       "",      cell(5)],
        [cell(9),  cell(8),  cell(7), cell(6)],
    ]

    col_w = 33 * mm
    row_h = 22 * mm
    t = Table(layout, colWidths=[col_w] * 4, rowHeights=[row_h] * 4)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.8, BORDER),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLACK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        # Center cells (span) — blank
        ("BACKGROUND", (1, 1), (2, 2), CARD_BG),
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BACKGROUND", (1, 1), (2, 2), CARD_BG),
    ]))
    return t


def generate_pdf(workspace: dict) -> bytes:
    """Generate PDF bytes from workspace data."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
    )
    s = _styles()
    story = []

    planets: list = workspace.get("planets", [])
    cusps: list = workspace.get("cusps", [])
    name: str = workspace.get("name", "—")
    date: str = workspace.get("date", "—")
    time: str = workspace.get("time", "—")
    place: str = workspace.get("place", "")
    lat: float = workspace.get("latitude", 0)
    lon: float = workspace.get("longitude", 0)
    mahadasha: dict = workspace.get("mahadasha", {}) or {}
    antardasha: dict = workspace.get("current_antardasha", {}) or {}
    pratyantardasha: dict = workspace.get("current_pratyantardasha", {}) or {}
    antardashas: list = workspace.get("antardashas", [])
    ruling: dict = workspace.get("ruling_planets", {}) or {}
    significators: dict = workspace.get("significators", {}) or {}

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("KP Jyotish Chart Report", s["title"]))
    story.append(Paragraph("Krishnamurti Paddhati (KP) System", s["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=10))

    # Birth Details table
    story.append(Paragraph("Birth Details", s["section"]))
    birth_data = [
        ["Name", name, "Date", date],
        ["Time", time, "Place", place or f"{lat:.3f}°N, {lon:.3f}°E"],
        ["Latitude", f"{lat:.4f}°", "Longitude", f"{lon:.4f}°"],
    ]
    bt = Table(birth_data, colWidths=[38 * mm, 58 * mm, 32 * mm, 50 * mm])
    bt.setStyle(TableStyle(_table_style_base() + [
        ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
        ("BACKGROUND", (2, 0), (2, -1), CARD_BG),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
        ("TEXTCOLOR", (2, 0), (2, -1), DARK_GOLD),
        ("BACKGROUND", (0, 0), (-1, 0), WHITE),  # override header row for 2-col layout
    ]))
    story.append(bt)
    story.append(Spacer(1, 8))

    # ── South Indian Chart ────────────────────────────────────────────────────
    story.append(Paragraph("Birth Chart (South Indian)", s["section"]))
    chart_table = _south_indian_chart(planets, cusps)
    story.append(chart_table)
    story.append(Spacer(1, 10))

    # ── Planet Positions ──────────────────────────────────────────────────────
    story.append(Paragraph("Planet Positions", s["section"]))
    p_header = ["Planet", "Sign", "Deg", "Nakshatra", "Star Lord", "Sub Lord", "House", "R"]
    p_rows = [p_header]
    for p in planets:
        retro = "℞" if p.get("retrograde") else ""
        deg = p.get("degree_in_sign", 0)
        p_rows.append([
            p.get("planet_en", ""),
            p.get("sign_en", ""),
            f"{deg:.2f}°",
            p.get("nakshatra_en", ""),
            p.get("star_lord_en", ""),
            p.get("sub_lord_en", ""),
            str(p.get("house", "")),
            retro,
        ])
    pt = Table(p_rows, colWidths=[22 * mm, 24 * mm, 16 * mm, 28 * mm, 22 * mm, 22 * mm, 14 * mm, 8 * mm])
    pt.setStyle(TableStyle(_table_style_base()))
    story.append(pt)
    story.append(Spacer(1, 10))

    # ── House Cusps ───────────────────────────────────────────────────────────
    story.append(Paragraph("House Cusps", s["section"]))
    c_header = ["House", "Sign", "Cusp Lon", "Nakshatra", "Star Lord", "Sub Lord"]
    c_rows = [c_header]
    for c in sorted(cusps, key=lambda x: x.get("house_num", 0)):
        c_rows.append([
            f"H{c.get('house_num', '')} {c.get('house_en', '')}",
            c.get("sign_en", ""),
            f"{c.get('cusp_longitude', 0):.4f}°",
            c.get("nakshatra_en", ""),
            c.get("star_lord_en", ""),
            c.get("sub_lord_en", ""),
        ])
    ct = Table(c_rows, colWidths=[28 * mm, 24 * mm, 22 * mm, 28 * mm, 24 * mm, 24 * mm])
    ct.setStyle(TableStyle(_table_style_base()))
    story.append(ct)
    story.append(Spacer(1, 10))

    # ── Dasha ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("Vimsottari Dasha", s["section"]))
    dasha_summary = [
        ["Period", "Lord", "From", "To"],
        ["Maha Dasha (MD)", mahadasha.get("lord_en", "—"), mahadasha.get("start", "—"), mahadasha.get("end", "—")],
        ["Antardasha (AD)", antardasha.get("lord_en", "—"), antardasha.get("start", "—"), antardasha.get("end", "—")],
        ["Pratyantardasha (PAD)", pratyantardasha.get("lord_en", "—"), pratyantardasha.get("start", "—"), pratyantardasha.get("end", "—")],
    ]
    dt = Table(dasha_summary, colWidths=[50 * mm, 30 * mm, 38 * mm, 38 * mm])
    dt.setStyle(TableStyle(_table_style_base() + [
        ("BACKGROUND", (0, 1), (0, 3), CARD_BG),
        ("FONTNAME", (0, 1), (0, 3), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (0, 3), DARK_GOLD),
    ]))
    story.append(dt)
    story.append(Spacer(1, 6))

    # Next antardashas
    if antardashas:
        story.append(Paragraph("Upcoming Antardasha Periods", s["section"]))
        ad_header = ["#", "Lord", "From", "To", "Current"]
        ad_rows = [ad_header]
        shown = 0
        for ad in antardashas:
            if shown >= 8:
                break
            ad_rows.append([
                str(shown + 1),
                ad.get("lord_en", ""),
                ad.get("start", ""),
                ad.get("end", ""),
                "✓" if ad.get("is_current") else "",
            ])
            shown += 1
        adt = Table(ad_rows, colWidths=[10 * mm, 30 * mm, 38 * mm, 38 * mm, 18 * mm])
        adt.setStyle(TableStyle(_table_style_base() + [
            # Highlight current row
            *[("BACKGROUND", (0, i + 1), (-1, i + 1), colors.HexColor("#FEF3C7"))
              for i, ad in enumerate(antardashas[:8]) if ad.get("is_current")],
        ]))
        story.append(adt)
        story.append(Spacer(1, 10))

    # ── Ruling Planets ────────────────────────────────────────────────────────
    story.append(Paragraph("Ruling Planets", s["section"]))
    all_rps = ruling.get("all_en", "—")
    if isinstance(all_rps, list):
        all_rps = ", ".join(all_rps) if all_rps else "—"
    rp_data = [
        ["Lagna Sign Lord", ruling.get("lagna_sign_lord_en", "—"),
         "Lagna Star Lord", ruling.get("lagna_star_lord_en", "—")],
        ["Moon Sign Lord", ruling.get("moon_sign_lord_en", "—"),
         "Moon Star Lord", ruling.get("moon_star_lord_en", "—")],
        ["Day Lord", ruling.get("day_lord_en", "—"), "All RPs", all_rps],
    ]
    rpt = Table(rp_data, colWidths=[40 * mm, 32 * mm, 40 * mm, 32 * mm + 12 * mm])
    rpt.setStyle(TableStyle(_table_style_base() + [
        ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
        ("BACKGROUND", (2, 0), (2, -1), CARD_BG),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), DARK_GOLD),
        ("TEXTCOLOR", (2, 0), (2, -1), DARK_GOLD),
        ("BACKGROUND", (0, 0), (-1, 0), WHITE),
    ]))
    story.append(rpt)
    story.append(Spacer(1, 10))

    # ── Significators ─────────────────────────────────────────────────────────
    if significators:
        story.append(Paragraph("House Significators", s["section"]))
        sig_header = ["House", "Occupants", "House Lord", "All Significators"]
        sig_rows = [sig_header]
        for i in range(1, 13):
            key = f"House_{i}"
            sig = significators.get(key, {})
            occupants = sig.get("occupants_en", "—") or "—"
            if isinstance(occupants, list):
                occupants = ", ".join(occupants) if occupants else "—"
            all_sigs = sig.get("all_significators_en", "—") or "—"
            if isinstance(all_sigs, list):
                all_sigs = ", ".join(all_sigs) if all_sigs else "—"
            sig_rows.append([
                f"H{i}",
                occupants,
                sig.get("house_lord_en", "—"),
                all_sigs,
            ])
        sigt = Table(sig_rows, colWidths=[28 * mm, 28 * mm, 28 * mm, 72 * mm])
        sigt.setStyle(TableStyle(_table_style_base()))
        story.append(sigt)
        story.append(Spacer(1, 10))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=8, spaceAfter=6))
    story.append(Paragraph(
        f"Generated by DevAstroAI · KP System · {datetime.now().strftime('%d %b %Y %H:%M')} IST",
        s["footer"]
    ))

    doc.build(story)
    return buf.getvalue()
