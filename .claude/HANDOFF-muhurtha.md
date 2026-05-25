# Handoff — Muhurtha Tab Audit + PR Queue

**Created**: 2026-05-24 (after Match M1–M14 shipped to `claude/eager-elbakyan`)
**Purpose**: After Match work, the next focus is Muhurtha. The audit is
already finished — this doc tells the next Claude session how to convert
the audit into shippable PRs in the same disciplined, one-PR-at-a-time
cadence we used for Horary H1–H12 and Match M1–M14.

**Read order on resume**:
1. This file
2. `.claude/research/muhurtha-audit.md` — full audit (560 lines, 2026-04-22)
3. `.claude/BACKLOG.md` and `.claude/DAILY_LOG.md` last entries
4. `git log --oneline origin/claude/eager-elbakyan -25` for shipped status
5. `CLAUDE.md` for sacred regions + sensitivity protocol

---

## 0. State of Play

### Match (just finished) — 14 PRs on `claude/eager-elbakyan`
```
ad2f6b8  PR M6  Nadi dosha directional cancellation
056284b  PR M7  Combust H7 CSL clinical flag
93a0942  PR M8  Borderline H7 CSL caveat
decc588  PR M9  Sensitivity tier framing + auto-escalators
56c8948  PR M10 Joint Sookshma days-precision wedding windows
d758238  PR M11 Bhavat Bhavam relative-marriage rotation
dedf7b4  PR M12 Reasoning trace + astrologer notes + JSON export
c5714c8  PR M13 + M14 Spouse profile card + best-window hero
```
(M1–M5 landed earlier — see prior handoff doc.)

All 88/88 backend tests pass; `npx tsc --noEmit` and `npx next build`
both succeed on the current tip. **The branch is `claude/eager-elbakyan`,
not `develop`** — push there; user merges down themselves.

### Muhurtha — current state
- **Backend**: `backend/app/services/muhurtha_engine.py` (1,418 lines),
  `backend/app/services/muhurtha_findings.py` (555 lines),
  `backend/app/routers/muhurtha.py` (102 lines).
- **Frontend**: `frontend/app/app/tabs/MuhurthaTab.tsx` (1,411 lines,
  3-step wizard + leaderboard + AI chat).
- **Knowledge**: `backend/knowledge/muhurtha.txt` (150 lines) +
  `backend/app/kp_knowledge/muhurtha.md` (590 lines).
- **Tests**: 0. Adding the first pytest harness is one of the early PRs.

---

## 1. The Audit (TL;DR)

Per `.claude/research/muhurtha-audit.md`:

- Single-chart muhurtha is **production-quality** today: 15+ scoring
  factors, Tara Bala, Chandrabala, Hora lord, Rahu/Yama/Gulika/
  Durmuhurtha/Vishti avoidances, event-location Lagna, LLM analysis.
- The **headline gap** is true **multi-chart muhurtha**: today's
  "participant resonance" check is a +10 RP-match proxy, not real
  per-participant signification / Chandrashtamam / Tarabala / DBA
  alignment / Badhakesh-Marakesh DBA rejection.
- The audit also lists **11 secondary classical gaps** (Dashas not
  checked at the moment, Varjyam/Amrit Kala not scored, Panchaka /
  Tithi Shunya / Kartari / Ekargala doshas absent, Lagna-type and
  weekday tables not event-specific, Shukra/Guru Tara not enforced
  for vivaha, etc.).

The audit ends with a **5-wave PR plan**. Use it verbatim — don't
re-research. Below is the operational distillation.

---

## 2. PR Queue — Mu1 → Mu15 (waves W1–W5)

Same cadence as Horary H1–H12 and Match M1–M14:
**one PR per commit**, individually testable, push after each.
Wave order is enforcement order (later waves depend on earlier).

### W1 — Foundation (must ship before everything else)

#### Mu1 — pytest harness + golden Muhurtha fixtures
- Scope: `backend/tests/test_muhurtha_engine.py` (NEW). Mirror the
  Horary / Compatibility test files. Fixtures: Manyue chart + a
  fixed wedding-grade scenario with known expected window.
- Verify: pytest run from `backend/` finds the new tests and they
  pass.
- Commit: `PR Mu1 — pytest harness + golden muhurtha fixtures`

#### Mu2 — Numeric muhurtha confidence 0-100 + audit ledger
- Mirror Match M1 / Horary H3. Add `confidence_score` and
  `confidence_breakdown` to each window in the `find` response.
  Today scoring is already integer; just normalise to 0-100 +
  surface a per-rule ledger (factor name, delta, note).
- Frontend: render the ledger inside the existing window card
  expander.

### W2 — Multi-chart correctness (THE big one)

#### Mu3 — Per-participant evaluation layer (no aggregation yet)
- Add `_evaluate_participant(participant_chart, moment_chart, event)`
  in `muhurtha_engine.py`. Returns `{tarabala, chandrabala,
  chandrashtamam, janma_tara, dba, badhakesh_active, marakesh_active,
  rp_resonance, event_csl_in_natal_sigs}` per participant per window.
- Wire into the existing per-window result as
  `participant_checks: list[dict]`. **Do not change scoring yet** —
  just surface the data.
- Knowledge source: §2 of muhurtha-audit.md + classical KPDP 6–10.
- Frontend: new "Partners" sub-panel inside the leaderboard card
  expander showing each participant's stats. Hide if no participants
  supplied.

#### Mu4 — Hard-filter + soft-aggregation pipeline
- Hard rejects per participant (configurable):
  Chandrashtamam, Janma Tara, Badhakesh DBA active.
- Soft aggregation:
  - Marriage event → `min()` across participants (everyone must pass).
  - Business event → primary-weighted 0.6 + secondaries 0.4
    (primary must clear 70).
- Each window now has `aggregated_score`, `rejected_by` (list of
  participant names if any), `aggregation_strategy` string.
- Window list filtering keeps rejected windows but flags them so the
  astrologer can see WHY a date dropped out.

#### Mu5 — "Extend the window" suggestion
- If no candidate passes the hard filters inside the client's date
  range, scan FORWARD up to +90 days and surface the next qualifying
  window as `extend_suggestion: {start, end, score, gap_days}`.
- Tool MUST NOT invent a "best of bad" answer. If nothing in horizon,
  return `extend_suggestion: null` with a clear note.
- Frontend hero card promotes the extend suggestion when the in-range
  list is empty.

### W3 — Classical doshas the engine misses today

(These are independent of multi-chart and can ship in any order
inside W3, but ship one per PR.)

#### Mu6 — DBA-at-moment for every participant
- Compute each participant's running MD/AD/PD at the candidate moment.
  Score +20 if all three lords signify event houses; −30 if any lord
  is Badhakesh/Marakesh; −15 if any is in 6/8/12.
- Surfaces in the participant card.

#### Mu7 — Varjyam + Amrit Kala integration
- Already computed in Panchang (PR A1.2c). Pull them into the moment's
  scoring: `+20` if inside Amrit Kala, `−25` if inside Varjyam.

#### Mu8 — Panchaka dosha per event
- Panchaka detected in Panchang. Block events traditionally rejected
  by Panchaka (vivaha, griha-pravesh, yatra, vahana, dhanya) with
  −60. Honour the five sub-type exceptions (Ghora/Mrityu/Chora/
  Agni/Roga) — only specific sub-types block specific activities.

#### Mu9 — Tithi Shunya per masa
- Block per-tithi rules per Hindu masa table (audit §3.4). Penalty −25.

#### Mu10 — Kartari + Ekargala doshas
- Kartari: malefics flanking muhurtha Moon or Lagna in adjacent signs.
  Penalty −20.
- Ekargala: Sun and Moon in the same sign. Penalty −30 for auspicious
  starts.

### W4 — Per-event corrections

#### Mu11 — Lagna-type weighting per event
- Fixed Lagna (Tau/Leo/Sco/Aqu) +15 for griha-pravesh / foundation /
  installation. Movable +15 for travel / sales / launches. Dual +15
  for education / partnerships / treaties. Other Lagnas: 0.

#### Mu12 — Per-event weekday + hora rewrites
- Replace the universal "M/W/Th/F good" with event-keyed tables per
  audit §3.11 and §3.8.
- Surgery on Tuesday is now PREFERRED, not penalised.
- Marriage Saturday is rejected; Vehicle purchase Sunday is mild
  caution, not hard block.

#### Mu13 — Shukra/Guru Tara + Solar-month gate for vivaha
- For event = "marriage": HARD reject windows where Venus or Jupiter
  is combust (use `kp_advanced_compute.detect_combustion`).
- Also reject Sun NOT in {Aries, Taurus, Gemini, Scorpio, Capricorn,
  Aquarius}. (Cancer/Pushya is the classical avoid.)

### W5 — Polish + audit-trail UX

#### Mu14 — Muhurtha reasoning trace + astrologer notes + JSON export
- Mirror Match PR M12 / Horary PR H10 component.
  New: `frontend/app/app/components/MuhurthaReasoningTrace.tsx`.
- Section list: 1. Verdict + score, 2. Lagna SL + event house chain,
  3. Per-participant checks, 4. Doshas active, 5. Panchang context,
  6. Confidence breakdown.
- Plus: Copy notes + Export JSON buttons.

#### Mu15 — Sensitivity tier framing + best-window hero
- Mu15a (tier): muhurtha base tier = 2 (life-impact). Escalators:
  marriage + Shukra/Guru combust → Tier 3; medical + Mars
  malefic-aspect → Tier 3; surgery + Mercury combust → Tier 3.
- Mu15b (hero): promote `best_window` to a giant green callout at
  the top of the leaderboard if any window scores ≥ 80.

---

## 3. Methodology checklist (repeat per PR)

1. Read the audit section relevant to this PR.
2. Make the code change. Aim for ≤ 200 lines per PR (split if larger).
3. Add or extend a pytest in `backend/tests/test_muhurtha_engine.py`
   that asserts the new behavior on the golden fixture.
4. Run `python -m pytest -x -q` from `backend/`. Must be 88/88+ green.
5. Run `npx tsc --noEmit` from `frontend/`. Must be clean.
6. Commit:
   `PR Mu{N} — {one-line title}` + a multi-line body explaining the
   knowledge source + the scoring math + the frontend wiring.
7. `git push origin claude/eager-elbakyan`.
8. Tell the user the PR shipped and what to test on the live app.

---

## 4. Sacred rules (do not break)

- **Analysis tab is sacred** — Muhurtha changes can affect Analysis if
  the muhurtha output flows into the prompt. Spot-check the Analysis
  output after each backend change.
- **Don't change muhurtha-engine signatures** without updating the
  router AND the LLM prompt builder in `llm_service.py`.
- **Bilingual everywhere** — every new label needs `t(en, te)` on
  frontend, every new note needs `_en` + `_te` on backend.
- **Backend KP doctrine** — every new rule needs a comment citing
  the KSK section / classical source. No "tribal knowledge" without
  a paper trail.
- **Hard rejects vs soft penalties** — be explicit which is which.
  Astrologer should never have to guess.
- **Lock files** — `.claude/scheduled_tasks.lock` is now gitignored;
  do NOT re-add it. If `git status` shows it, you broke the gitignore.

---

## 5. Quick reference — useful existing helpers

| Helper | File | Use |
|---|---|---|
| `detect_combustion(planets)` | `kp_advanced_compute.py` | Combust check for Mu13 |
| `is_borderline_csl(lon)` | `chart_engine.py` | If event Lagna borderline |
| `sub_boundary_distance(lon)` | `chart_engine.py` | Caveat surface |
| `calculate_dashas(...)` etc. | `chart_engine.py` | Mu6 DBA-at-moment |
| `calculate_sookshma_dashas(pd)` | `chart_engine.py` | If we ever need sookshma at moment |
| `_planet_significations(...)` | `compatibility_engine.py` | Event-house sig check for participants |
| Panchang fields (varjyam, amrit_kala, panchaka, tithi_shunya) | `panchangam_engine.py` | Mu7-Mu9 sources |

---

## 6. Stop conditions

Stop and ask the user before:
- Touching `llm_service.py` prompts (per CLAUDE.md sacred-regions list).
- Changing the muhurtha quality thresholds (95 / 65 / 35).
- Removing any existing scoring factor (only additions / refinements).
- Anything that could surface a "Tier 3" framing without it being
  warranted by the audit — over-cautious is fine, over-confident isn't.

---

## 7. Done state

Track A.2 (Muhurtha) is considered DONE when:
- All 15 PRs (Mu1–Mu15) have shipped to `claude/eager-elbakyan`
- `backend/tests/test_muhurtha_engine.py` has ≥ 10 golden tests
- `npx tsc --noEmit` + `npx next build` still pass
- A live smoke test against Manyue's chart for `event=marriage`
  returns a verdict with: best_window hero + extend_suggestion (if
  empty range) + per-participant breakdown + reasoning trace open-able.

Then write a NEW handoff for whatever Track A.3 is (likely Panchang
deep audit, or Today's-sky transit revamp). Repeat the pattern.
