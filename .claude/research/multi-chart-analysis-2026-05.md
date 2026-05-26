# Multi-Chart Analysis — Architecture Track

**Started:** 2026-05-26
**Goal:** Let the astrologer pull 2-4 charts into a single AI conversation and ask multi-chart questions (couple fertility, sibling property dispute, business partnership, employer-employee compatibility, etc.) — any KP scenario that requires combining multiple natal charts.

**Safety rollback:** Tag `may-26-best-UI-backend` on `develop` is the known-good state pre-multi-chart. If anything breaks, `git reset --hard may-26-best-UI-backend` rolls back the entire branch.

---

## TL;DR for the next session

1. We're NOT building "use case categories" (fertility / business / family). KP doctrine rejects that — events map to **house groups** (100+ catalogued), and the AI infers which group applies from the question text + charts in context.
2. We use the **KPRM (KP Relationship Method)** framework by Kanak Kumar Bosmia as the canonical multi-chart approach.
3. UX paradigm: **`@-mention` syntax in chat + persistent context chips** (like Slack/Notion/Linear). User types `@ramya` to add a chart to the conversation; chips above the input show who's currently in context.
4. **Zero quality impact on existing single-chart flows** — purely additive (new endpoint, new LLM function, new KB file). Sacred regions (`get_system_prompt`, `format_chart_for_llm`, `compute_compatibility`) UNTOUCHED.
5. Max **4 charts** per conversation (cost + cognitive cap).
6. KB authored by Claude (user has no KP background; trusts research). Sourced from JyotishPortal house-groupings + Bosmia's KPRM + existing KB files for tone/style.

---

## Phasing (incremental, each shippable)

### Phase 1 — KB foundation (this branch, this PR)
- `backend/app/kp_knowledge/multi_chart_analysis.md` (NEW, ~10-12K tokens) — sole doctrinal source for the new flow.
- Tracking doc (this file).
- **Stop here, ask user to review the KB before any code.**

### Phase 2 — Backend foundation
- `backend/app/services/multi_chart_engine.py` (NEW) — `compute_multi_chart_context(charts: list, question: str, …)` builds per-chart compute + cross-chart overlay + selects relevant KB sections.
- `get_multi_chart_prediction()` and `get_multi_chart_prediction_stream()` in `llm_service.py` (NEW functions — do NOT modify `get_prediction*`).
- `POST /astrologer/multi-analyze` and `/multi-analyze-stream` endpoints (NEW in `astrologer.py`).
- Tests: regression suite covering 4-5 representative scenarios (couple fertility, sibling property, business 3-way, employer-employee, mixed-purpose general).

### Phase 3 — Frontend chips + @-mention
- `<MultiChartContextChips>` component above the Analysis tab AI input.
- `@-mention` dropdown integrated into the chat input (autocomplete from `savedSessions` + "+ pick new chart inline").
- Wire to `/astrologer/multi-analyze-stream`.

### Phase 4 — Per-chart pills + question templates
- Each AI answer carries a "Charts analyzed: ♂ Manyue · ♀ Ramya" pill (Trust-1 extended).
- When ≥ 2 charts in context, AI suggests pre-filled question-template chips inferred from the chart combo.

### Phase 5 — Polish (only if needed)
- Persistence: multi-chart session survives reload.
- Multi-chart section in `pdf_engine_v2.py` for export.

---

## Sacred regions — UNTOUCHED guarantee

| Existing surface | Status |
|---|---|
| `get_system_prompt()` | Untouched |
| `format_chart_for_llm` | Untouched |
| `format_match_for_llm` | Untouched |
| Single-chart endpoints (`/analyze`, `/ask`, `/analyze-stream`, `/ask-stream`) | Untouched |
| `compute_compatibility` (Match engine) | Untouched |
| All existing 55 KB files | Untouched |
| 168 backend tests | Pass unchanged |

---

## Cost model (rough, for sizing decisions)

Per multi-chart call:
- Each chart's `build_full_chart_data` = ~40-50K input tokens (KB + per-chart compute)
- For 2 charts: ~90-100K input tokens (KB shared, per-chart compute duplicated)
- For 4 charts: ~160-180K input tokens

Cache strategy: the KB block is shared across all multi-chart calls → cache-hit after first call. Per-chart blocks are per-chart-specific → cache-write on first use, cache-hit on repeat. With Sonnet at $3/M input + $0.30/M cache-read, expect:
- First multi-chart call (2 charts, cold): ~$0.40
- Follow-up on same charts (warm): ~$0.05-0.08
- 4-chart cold: ~$0.70

UX guard: question-template chips when ≥ 2 charts in context invite "deep first turn" questions — Smart-Routing-1 escalates to Sonnet. Subsequent follow-ups Haiku. Same cost pattern as single-chart.

---

## Decisions locked in (from user, 2026-05-26)

1. ✅ Max 4 charts.
2. ✅ Claude authors KB based on web research + existing KB files for tone (user has no KP background).
3. ❌ No "smart suggestions" (AI proactively suggesting chart additions) in v1.
4. ✅ Question-template chips when ≥ 2 charts in context.
5. ✅ Phased, feature-branch-per-phase, push to develop after each phase.
6. ✅ Safety tag `may-26-best-UI-backend` on develop pre-this-work.

---

## Open questions for after Phase 1 KB review

- Does the user have any KP books / authoritative sources they want me to also reference beyond the JyotishPortal + Bosmia + Hariharan stack?
- For Bhavat Bhavam rotation (when only 1 chart is loaded but querying about a relative who has no chart), do we surface a "rotational analysis" indicator in the UI so the astrologer knows the precision is lower?
- For non-marriage relationships (e.g., business partner), is there a separate "compatibility score" the user wants surfaced (like the marriage 36/8 we already compute) or is the qualitative AI answer enough?

---

## Source bibliography (KP doctrine for multi-chart)

1. **JyotishPortal — KP House Groupings** — comprehensive catalogue of life events mapped to house groups (primary + supporting): https://jyotishportal.com/KPResource/House-Grouping.aspx
2. **Krishnamurti Padhdhati Vol. 3 — House Grouping** (Archive.org) — canonical KSK reference: https://archive.org/stream/krishnamurti-padhdhati-vol-3-english/House%20Grouping%20-%20KP%20Astrology_djvu.txt
3. **KP House Grouping (AstroSage tutorial)** — modern teaching of the same: https://kpastrology.astrosage.com/kp-learning-home/house-grouping
4. **KPRM — KP Relationship Method (Kanak Kumar Bosmia)** — explicit multi-person framework covering spouse / friendship / business / father-son / employer-employee / guru-disciple: https://kpastrologer.com/product/marriage-matching/?v=644d99afb936
5. **Bhavat Bhavam — Jyothishi blog** (Vijaya Lur, KP perspective): https://vijayalur.com/2013/01/28/bhavat-bhavam/
6. **Bhavat Bhavam — Dr Saket Bhatia**: https://saketbhatia.com/understanding-bhavat-bhavam/
7. **KP Fifth House (Putra Bhava) Rules** — fertility doctrine: https://kpastrologylearning.com/kp-jyotish-astrology-fifth-house-bhava-rules/
8. **Brief Note on Panchama Bhava** (PDF): https://www.astrocounselor.com/pdf/11.pdf
9. **Business Compatibility for Marriage and Partnership (Dr Saket Bhatia)**: https://saketbhatia.com/astrological-compatibility-for-business-partnership-and-marriage/
10. **Job Change in KP — 598 vs 2-6-11 (Gautam Verma)**: https://www.gautamcrystals.com/post/job-change-kp-astrology
11. **Sibling Property Dispute Astrology (AstroTalk)**: https://astrotalk.com/astrology-blog/using-astrology-to-resolve-property-disputes-with-siblings-insideastro-iaad8-23/
12. **Ruling Planets in KP Astrology (AjmerAstro)**: https://www.ajmerastro.com/en/blog/ruling-planets-in-kp-astrology
13. **Marriage Predictions in KP Astrology (RedAstrologer)**: https://redastrologer.com/marriage-predictions-in-kp/
14. **Grouping of Events in Life as per KP (LinkedIn — CA Partha Pratim Mitra)**: https://www.linkedin.com/pulse/grouping-events-life-per-kp-astrology-ca-partha-pratim-mitra
15. **Existing KB files** in `backend/app/kp_knowledge/` and `backend/knowledge/` — used for tone, terminology, formatting conventions.

---

## Session continuity checklist

Next session picking this up should:
1. Read this doc.
2. Check `git log --oneline -10` to see how far Phase 1/2/3 progressed.
3. Read `backend/app/kp_knowledge/multi_chart_analysis.md` to understand the doctrinal foundation.
4. If user has approved the KB → proceed to Phase 2 (backend engine).
5. If user has feedback on KB → iterate on the .md before any code.
