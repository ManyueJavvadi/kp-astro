# Handoff — Muhurtha Tab Overhaul (REFINED 2026-05-25)

**Created**: 2026-05-24, refined 2026-05-25 after deep web research + code audit.
**Purpose**: Plan-of-record for Track A.2 (Muhurtha). Replaces the original
5-wave plan with a 6-wave plan that incorporates: (a) operational bugs the
big-picture audit missed, (b) classical doshas + edge cases surfaced by
new web research, (c) international timezone/DST realities.

**Read order on resume**:
1. This file
2. `.claude/research/muhurtha-audit.md` — original 560-line strategic audit
   (still valid; this doc supersedes only the PR sequencing, not the audit
   itself)
3. `.claude/DAILY_LOG.md` last entry
4. `git log --oneline origin/develop -25`
5. `CLAUDE.md` for sacred regions

---

## 0. State of Play (2026-05-25)

- **develop tip**: `ead1885` (Match M1–M14 merged via PR #5)
- **Match work**: all 14 PRs landed; user smoke-tested marriage flow OK.
- **Muhurtha**: NO changes yet. Engine still at the pre-Match-era version.
- **Branch**: working on `claude/eager-elbakyan`, push there. User merges
  to develop via PR.

---

## 1. What the new research changed

The original 15-PR plan (Mu1–Mu15) assumed all current code was correct
and only needed *additions*. New audit + research found:

### Critical correctness bugs the engine has TODAY (production)
1. **Marriage denial set missing H12.** `engine.EVENT_HOUSE_GROUPS["marriage"]["denial"] = [1, 6, 10]` but KB §2 says `{1, 6, 10, 12}`. Engine currently passes muhurthas where Lagna SL signifies H12 — those should be hard-rejected.
2. **DST not re-resolved per scan day.** Router does `resolve_timezone` ONCE on `date_start`; the float is used for every JD conversion in the 60-day loop. A US/UK spring-forward day mid-scan silently shifts Lagna by ~15° for half the windows.
3. **Per-event vara rollback double-counts.** Engine adds +10/−15 for global GOOD/BAD vara, then tries to UNDO when per-event preference differs — but adds the per-event bonus on TOP, swinging Tuesday/Saturday for legal/surgery by +25 instead of +10.
4. **RP set semantics inverted.** Uses participant's *natal* RP and asks if Lagna SL appears in them. Doctrine wants the *moment's* 5 RPs intersected with each participant's natal *significators* of the event house group.
5. **Polar latitude silent corruption.** `_get_sunrise_sunset_jd` returns a fake 12-hour day on exception — Rahu Kalam, hora, durmuhurtha, Abhijit are then computed against a phantom sun.
6. **Hardcoded 05:00–21:00 scan window.** Misses winter muhurthas at high latitudes; misses traditional night muhurthas (Maha Shivaratri, eclipse-window weddings, Indian wedding muhurthas after 21:00).
7. **`_natal_dasha_list` calls `calculate_antardashas` per 4-min slot per participant.** 60-day × 3-participant scan = ~64,800 redundant calls. Easy memoize.
8. **Tithi 15 vs 30 both render as "Purnima/Amavasya"** (frontend asymmetry).
9. **Vara from local-calendar midnight, not sunrise.** Pre-sunrise hours of a Vedic day are reported with tomorrow's vara. Abhijit-on-Wednesday exclusion misfires.
10. **`participants` accepts duplicates**, double-counting resonance.

### Classical doshas the engine doesn't compute (KB requires them)
- Varjyam (-25), Amrit Kala (+20) — KB §4.5 explicitly says engine should score these. Doesn't.
- Panchaka Dosha — KB §4.1 expects per-event Panchaka rejection with sub-type exceptions (Mrityu/Agni/Roga/Raja/Chora). Missing.
- Tithi Shunya per masa — KB §4.2. Missing.
- Nakshatra Vedha — KB §4.8 acknowledges absent.
- Visha Ghatika per nakshatra — KB §4.4. Missing.
- Eclipse window + Sutak (12h solar / 9h lunar / 3-day extended). Missing.
- Bhadra mukha split (face = worst, middle = soft, tail = OK). Engine treats whole Vishti as -30.
- Sandhya (twilight) window — should hard-reject ~24-48 min around sunrise/sunset for all non-spiritual events.
- Mrityu Yoga (Vara × Nakshatra grid). Missing.
- Dagdha Tithi grid (Sun-sign × tithi). Missing.
- Vyatipata / Vaidhriti — should be hard before noon, soft after; currently flat -40.
- 8th-house occupancy hard reject — KB §5.3 expects this; engine doesn't check.
- Disha Shula (direction of travel per weekday) — KB §9.4; no event-direction input today.
- Solar-month gate for vivaha — KB requires Sun in Aries/Taurus/Gemini/Scorpio/Capricorn/Aquarius. Missing.
- Shukra/Guru Tara — KB says no marriage while Venus or Jupiter combust. Missing.

### Event preset expansion
KB §2 documents 19 event types; engine has 10. Missing: property buy/sell, loan, upanayana, annaprashana, vidyarambha, namakarana, pratishta. Web research adds: engagement, gold-buying, contract signing, court hearing (Tue/Sat FAVORED, not penalized!), election filing, deeksha, medication start, joining job, lease signing, planting/sowing start, mundan, karna vedha.

### International realities
- DST is **separate** from timezone offset; storing one float per city is wrong twice/year
- Hora cycle runs **sunrise-to-sunrise**, not midnight-to-midnight
- Weekday (Vara) flips at **local sunrise**, not midnight
- US client wedding at 14:30 IST = 05:00 EDT for him — dashboard must show BOTH
- Polar latitudes need explicit handling (or refusal)
- Date-Line / midnight straddle: IST sees May 24, NYC still on May 23 — result card must show event-local date

### Pro-grade UX gaps
- Multiple-windows-same-day grid (consumer apps show only best)
- Per-participant breakdown table
- Dosha checklist WITH neutralizations (Kala has this; nobody else)
- Manual dosha override with justification field
- Dual-tz display (IST + event local, side-by-side)
- Printable shubh muhurat certificate
- Save / compare named candidates ("Option A vs B vs C")
- Confidence band per window, not single score

---

## 2. Refined PR Queue — Wave 0 + Waves 1–5 (20 PRs)

Cadence stays the same: one commit per PR, individually testable, push
after each. Pace: target Wave 0 + Wave 1 + Wave 2 = ~10 PRs in first
sitting; then user smoke tests; then continue.

### Wave 0 — Critical correctness hotfixes (ship FIRST, fast, no UX)

#### Mu0a — Marriage denial set: add H12
- One-line fix in `EVENT_HOUSE_GROUPS`. Verify Tara Bala doesn't double-flag.
- Test: marriage muhurtha that PASSED before with Lagna SL signifying H12 now fails.

#### Mu0b — DST re-resolution inside scan loop
- Move `resolve_timezone(event_lat, event_lon, current_date)` INTO `_scan_date_range`.
- Cache per calendar day (one lookup per day, not per 4-min slot).
- Use `zoneinfo.ZoneInfo(iana_id).utcoffset(naive_dt_at_event)` so DST handled by stdlib.

#### Mu0c — Per-event vara: stop double-counting
- When `event in EVENT_PREFERRED_VARAS`, skip the global GOOD_VARA/BAD_VARA scoring entirely.
- Add unit test asserting Tuesday-for-legal scores exactly +10 net, not +25.

#### Mu0d — Polar latitude fail-loud guard
- `_get_sunrise_sunset_jd` exception path → raise `MuhurthaSunriseError`; calling code surfaces per-day "no sunrise — muhurtha not available" instead of silently inventing a 12-hr day.

#### Mu0e — Tithi clamp + Vedic vara at sunrise + tithi 15/30 disambiguation
- `tithi_num = min(int(...) + 1, 30)` to prevent wrap to index 31.
- `vedic_weekday = weekday of the most recent sunrise <= jd`.
- Tithi 15 = "Purnima", Tithi 30 = "Amavasya" (separate strings).

#### Mu0f — Performance: memoize antardasha + cache only slow planets
- `_natal_dasha_list` memoized per (participant_id, MD-lord, MD-start) so 60-day scan calls it 9×(participants) not 64,800×participants.
- `planet_cache` recomputes Moon every 4-min slot; caches Jup/Sat/outer per hour.

### Wave 1 — Foundation (tests + numeric trust)

#### Mu1 — pytest harness + golden fixtures
- `backend/tests/test_muhurtha_engine.py` (NEW).
- Fixtures: Manyue chart + a fixed wedding-grade scenario where we KNOW the expected best window (or expected `extend_suggestion` if range is too short).
- ≥ 10 assertions covering Mu0a–Mu0f fixes.

#### Mu2 — Numeric confidence 0-100 + audit ledger + raw vs clamped score
- Per-window `confidence_score: 0-100` + `confidence_breakdown: [{factor, delta, note}]`.
- Surface BOTH raw and clamped scores so astrologer can tell "strong base + heavy penalties" from "weak base alone".
- Frontend: ledger inside expanded window card.

### Wave 2 — Multi-chart correctness (THE big one)

#### Mu3 — Per-participant evaluation layer
- `_evaluate_participant(p, moment_chart, event)` returns `{tarabala, chandrabala, chandrashtamam, janma_tara, dba_at_moment, badhakesh_dba_active, marakesh_dba_active, rp_resonance, natal_sigs_overlap_with_moment_rps}`.
- Stored per window as `participant_checks: list[dict]`. Don't change scoring yet.
- Frontend: "Partners" sub-panel inside window expander.

#### Mu4 — Hard-filter + soft-aggregate with proper KP semantics
- **Tarabala**: hard reject only if ALL participants are in worst Tara classes (Janma/Vipat/Pratyak/Vadha). One-partner-Janma is SOFT penalty (per research finding).
- **Chandrabala**: soft penalty if multiple participants fail; SUBSTITUTABLE by Tarabala (Drik vivaha rule).
- **Chandrashtamam**: hard reject ONLY for primary participant (configurable); soft for secondaries.
- **Badhakesh DBA**: hard reject for primary; soft for others.
- **Primary participant flag** in API + frontend toggle.
- **Aggregation**: marriage = `min()` across all; business/contract = primary-weighted 0.6 + secondaries 0.4 (primary must clear 70).
- Result includes `aggregation_strategy`, `rejected_by` list.

#### Mu5 — "Extend the window" suggestion (proper version)
- Already partially exists; refine to:
  - Scan forward up to +90 days when in-range list empty
  - Return `extend_suggestion: {start, end, score, gap_days, blocking_reasons}` OR `null` (never invent)
  - Frontend promotes to hero when in-range empty
- Add `same_day_alternatives: list[Window]` — multiple viable windows on the same day (3-5), not just the best one (per UX research).

### Wave 3 — Classical doshas + KB integration

#### Mu6 — Panchang integration (varjyam / amrit / panchaka / tithi-shunya / nakshatra-vedha)
- Reuse `panchangam_engine` outputs (don't re-derive).
- Score per KB §4: Amrit Kala +20, Varjyam -25, Panchaka per event -60 with sub-type exceptions, Tithi Shunya per masa -25, Nakshatra Vedha -15.

#### Mu7 — Eclipse window + Sutak rejection
- Detect eclipse periods (solar/lunar) within search horizon.
- Sutak = 12h before solar, 9h before lunar (hard reject all events).
- Extended avoidance = ±3 days around eclipsed-graha rising/setting (soft).
- New `eclipse_advisory` block in response when window touches sutak.

#### Mu8 — Bhadra mukha split + Sandhya + Mrityu Yoga + Krura Tithis + Dagdha Tithi + Vyatipata defunct-after-noon
Bundled because they're all "swap a flat penalty for a more nuanced one":
- Vishti: face (first 3 ghatis) = -60, middle = -30, tail (last 3 ghatis) = -10
- Sandhya: 24-48 min around local sunrise/sunset = -50 for non-spiritual events
- Mrityu Yoga (Vara × Nakshatra grid) hard reject for medical/travel; soft for others
- Krura tithis (4/9/14) soft penalty for shubh except shradha/martial events
- Dagdha Tithi (Sun-sign × tithi grid) hard for marriage/travel/new ventures
- Vyatipata/Vaidhriti: hard before noon, soft after (replace flat -40)

#### Mu9 — Kartari + Ekargala + DBA-at-moment per participant + 8th-house occupancy
- Kartari: malefics flanking muhurtha Moon or Lagna in adjacent signs = -20
- Ekargala: Sun + Moon same sign = -30 for auspicious starts
- DBA-at-moment: per-participant MD/AD/PD lords vs event house group (+20 if all 3 sig, -30 if any is 6/8/12)
- 8th-house occupancy hard reject (KB §5.3)

#### Mu10 — Advanced classical (optional flag): Visha Ghatika + Lattaa + Mahapata
- Behind `advanced_dosha_check: bool` flag (default true for Tier 3 events, false otherwise) so casual queries aren't drowned in caveats.

### Wave 4 — Per-event corrections + expansion

#### Mu11 — Per-event Lagna-type + weekday + hora + Shukra/Guru Tara + Solar-month vivaha gate
Bundled per-event refinements:
- Lagna-type: Fixed +15 for griha-pravesh/foundation; Movable +15 for travel/sales; Dual +15 for education/partnerships
- Weekday: surgery Tuesday PREFERRED, court Tue/Sat FAVORED (replace universal table)
- Hora: event-keyed (Jup for marriage/edu/religious; Ven for wedding/arts; Merc for business/contracts; Mars for surgery/athletics; Sat for foundations)
- Vivaha-only: hard reject if Venus/Jupiter combust (use `kp_advanced_compute.detect_combustion`)
- Vivaha-only: hard reject if Sun not in {Aries, Taurus, Gemini, Scorpio, Capricorn, Aquarius}

#### Mu12 — Event preset expansion (10 → 27 events)
Add: namakaranam, annaprashana, upanayanam, vidyarambham, engagement, gold-buying, contract signing, court hearing, election filing, spiritual initiation, medication start, job joining, lease signing, planting/sowing, mundan, karna vedha, property buy/sell, loan disbursement.
- Each with primary house + supporting + denial + classical do/don't.
- Event icons updated; classify_event keyword map expanded; KB §2 reconciled.

#### Mu13 — Disha Shula + Kalapurusha body-part + classical 15 day-muhurta names
- Travel: prompt user for travel direction; reject if direction = vara's Shula.
- Surgery: prompt for body part; reject if Moon in Kalapurusha sign for that part.
- Surface classical name of the 15 day-muhurtas (Rudra, Aahi, Mitra, Pitra, Vasu, Vaara, Abhijit, Vijaya, Naktan, Varuna, Aryama, Bhaga …) per window for astrologer's reference.

### Wave 5 — UX trust signals + framing

#### Mu14 — Per-window evidence payload expansion + "Verify by hand" panel
Backend adds per window: cusp longitudes (H1/H7/H10/H11/event-primary), planet positions at moment (lon, sign, nak-pada, retro, combust delta), 4-step CSL chain expansion (which rule contributed each signified house), sub-boundary times (next planetary change in seconds), Tara-cycle math (birth→moon nakshatra count → tara num), sunrise/sunset/RK/YG/GL/Durm/Abhijit HHMM tags, MD/AD/PD start/end dates per participant, solar longitude for combustion checks.
Frontend: collapsible "Verify by hand" panel below each window card showing all the above.

#### Mu15 — MuhurthaReasoningTrace component (mirror Match M12 / Horary H10)
- New `frontend/app/app/components/MuhurthaReasoningTrace.tsx`.
- Section list: 1. Verdict + confidence, 2. Lagna SL + event house chain, 3. Per-participant checks, 4. Doshas active (with neutralizations), 5. Panchang context (with vedha), 6. Confidence breakdown, 7. KP rules cited.
- Plus: Copy notes + Export JSON buttons.

#### Mu16 — Sensitivity tier framing + best-window hero
- Mu16a (tier): Base tier 2 (life-impact). Escalators:
  marriage + Shukra/Guru combust → Tier 3
  medical + Mars malefic-aspect → Tier 3
  surgery + Mercury combust → Tier 3
  eclipse + any event → Tier 3
- Mu16b (hero): Promote `best_window` to giant green callout if score ≥ 80; otherwise show the extend_suggestion or "no qualifying window in range" amber.

#### Mu17 — Dual-tz display + same-day alternatives grid + dosha checklist with neutralizations + override field
Pro-grade UX delivery:
- Each window card shows BOTH IST and event-local clocks side-by-side
- Same-day-alternatives strip below the best window (3-5 windows visualized as horizontal bands)
- Dosha checklist subsection: each active dosha listed with its known cancellation rules (e.g., "Vishti tail OK", "Tarabala substitutes Chandrabala")
- Per-window "Override this dosha" affordance with mandatory justification text field (stored locally, surfaced in reasoning trace)

---

## 3. Methodology checklist (repeat per PR)

1. Re-read the audit section + research-doc finding relevant to this PR
2. Make the code change. Aim for ≤ 250 lines per PR (split if larger)
3. Add/extend `backend/tests/test_muhurtha_engine.py` asserting new behaviour on golden fixture (target +3-5 assertions per PR)
4. Run `python -m pytest -x -q` from `backend/`. Must be 88+N tests, all green
5. Run `npx tsc --noEmit` from `frontend/`. Must be clean
6. Commit message:
   `PR Mu{N} — {one-line title}`
   + multi-line body: knowledge source / classical citation / scoring math / frontend wiring
7. `git push origin claude/eager-elbakyan`
8. Notify user with what to live-test

## 4. Sacred rules (do not break)

- **Analysis tab is sacred** — backend muhurtha changes ripple into Analysis if the muhurtha output flows into the prompt. Smoke-test Analysis output after each backend change.
- **Don't change muhurtha_engine signatures** without updating router AND `llm_service.py` prompt builder
- **Bilingual everywhere** — every new label needs `t(en, te)` on frontend, every new note needs `_en + _te` on backend
- **Every new rule needs a comment citing source** — KSK section / Muhurta Chintamani / classical author. No "tribal knowledge"
- **Hard rejects vs soft penalties** — be explicit. Astrologer shouldn't have to guess.
- **`.claude/scheduled_tasks.lock`** is gitignored — do NOT re-add it
- **`participants` deduplication** — engine MUST dedupe by name+date+time before scoring
- **DST resolution** — every JD conversion in the scan must use the event-location IANA tz with the DST-aware utcoffset at that moment. Never trust a stored float.

## 5. Quick reference — useful existing helpers

| Helper | File | Use |
|---|---|---|
| `detect_combustion(planets)` | `kp_advanced_compute.py` | Mu11 vivaha Shukra/Guru |
| `is_borderline_csl(lon)` | `chart_engine.py` | Mu14 evidence panel |
| `sub_boundary_distance(lon)` | `chart_engine.py` | Mu14 sub-boundary times |
| `calculate_dashas`, `_antardashas`, `_pratyantardashas`, `_sookshma_dashas` | `chart_engine.py` | Mu9 DBA-at-moment |
| `_planet_significations(...)` | `compatibility_engine.py` | Mu3 natal-sig-overlap |
| Panchang fields (varjyam, amrit_kala, panchaka, tithi_shunya, nakshatra_vedha) | `panchangam_engine.py` | Mu6 |
| `resolve_timezone(lat, lon, dt)` | (find in `timezone_utils.py` if exists; else write one using `timezonefinder` + `zoneinfo`) | Mu0b |
| `zoneinfo.ZoneInfo` (Python 3.9+) | stdlib | Mu0b DST-aware arithmetic |

## 6. Stop conditions (ask user before)

- Touching `llm_service.py` prompts (CLAUDE.md sacred-regions)
- Changing the existing quality thresholds (95 / 65 / 35)
- Removing any existing scoring factor (only refine / replace, never delete silently)
- Surfacing Tier 3 without warrant from the escalator list (over-cautious fine, over-confident not)

## 7. Done state for Track A.2

- All Wave-0 hotfixes shipped (Mu0a–Mu0f, ~6 PRs)
- All Wave-1 to Wave-5 PRs shipped (Mu1–Mu17, ~17 PRs)
- `backend/tests/test_muhurtha_engine.py` has ≥ 40 golden assertions
- `npx tsc --noEmit` + `npx next build` both pass
- Manyue's chart smoke test for `event=marriage` (Indian + USA destination) returns: best_window hero + extend_suggestion if empty + per-participant breakdown + reasoning trace + dual-tz display + correct DST-handled Lagna
- No `participants` duplicate inflation
- Eclipse week is hard-rejected
- Tuesday is FAVOURED for surgery (not penalized)
- Polar latitude returns clean error, not phantom day

Then write the next track's handoff (likely Transit deep audit, Analysis-tab additive briefings, or v2 PDF rev2).
