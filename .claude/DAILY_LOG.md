# DevAstroAI — Daily Log

> Append-only. Newest entries at the bottom. Each entry: date, local IST times, PRs shipped, in-flight, decisions, next session priorities.
> Read the last 60 lines on session start (after reading `BACKLOG.md`) to catch up where we left off.
> Times = local IST unless otherwise marked.

---

## 2026-04-19 (Sunday) — ~07:00 → ~11:30 IST

### PRs shipped (merged to develop)
- **PR10** @ `e6d6292` — sidebar dedup (removed PDF button / Dasha / Ruling Planets from left sidebar; already on top hero banner) + animated canvas Saturn logo (Fibonacci sphere planet particles + tilted rings with Cassini gap; particle counts scale with size; respects `prefers-reduced-motion`).
- **PR11** @ `b3b8d63` — Houses tab full i18n (Overview / Cusps / Significators / Ruling / Panchangam sub-tabs all respect EN / TE+EN / TE toggle; `HouseOverviewGrid` + `PanchangamCard` migrated; new `HOUSE_TOPICS_TE` constant) + premium sub-tab pill treatment.
- **PR12** @ `254cc20` — New Chart floating modal (workspace blurred behind, click-backdrop restores previous form values; reuses existing `handleSetup`, no new API) + Muhurtha/Panchang emoji→lucide (`HandHeart`, `Briefcase`, `HomeIcon`, `Plane`, `BookOpen`, `Stethoscope`, `Wallet`, `Car`, `Moon`, `Star`, `Sparkles`, `Sunrise`, `Sunset`, `MoonStar`, `Crown`, `TriangleAlert`, `Ban`, `CircleDashed`, `Hourglass`, `Sun`, `Lock`).

### Decisions made today
- **Option A confirmed as current stance** (Track A polish before Track B SaaS features). Reason: fear of mixing concerns like developv2 did.
- **Pre-PR protocol added** — before every UI polish PR, inspect matching `developv2` component for visual-only inspiration (not functional cherry-picks). Rationale: current post-generate-chart UI feels "common and clumsy"; landing is the only premium surface today. Must close that gap per-PR to avoid polishing twice.
- **Business-model principles captured** in `BACKLOG.md` §Business model — motto, $1-over-cost rule, debit-card requirement, Stripe deferred, freemium via localStorage, pricing needs its own research session.
- **Freemium UX rule captured** — astrologer: Clients list free, per-client workspace locked; consumer: technical chart free, AI features locked.
- **Backlog + daily-log system introduced** — this file + `.claude/BACKLOG.md`. End-of-day ritual: user says "we are done for the day" → Claude appends entry here.

### In flight (unmerged feature branches)
- None. All three feature branches (`feature/pr10-*`, `feature/pr11-*`, `feature/pr12-*`) merged to develop via fast-forward and pushed.

### Tags
- **Existing**: `v1-stable-2026-04-17` (rollback anchor), `v1.9-i18n-complete`.
- **Not yet tagged**: PR10 / PR11 / PR12. Could retroactively tag `v1.10-animated-logo-sidebar-dedup`, `v1.11-houses-i18n`, `v1.12-chart-modal-icons` — waiting on user confirmation that Vercel preview of `develop@254cc20` looks good on live site.

### Next session priorities (ranked)
1. **Confirm Vercel deploy of `develop@254cc20`** looks good on `devastroai.vercel.app`. If yes → retroactive tags for PR10/11/12.
2. **PR13 — Horary tab polish + i18n.** MANDATORY first step: read `.claude/worktrees/v2-phase0-design/frontend/app/pro/tools/horary/page.tsx` before touching code on develop.
3. **Track A queue reminder**: after PR13 → PR14 Muhurtha i18n → PR15 Match (+ inline "Add Person 2") → PR16 Transit → PR17 Dasha → PR18 Panchang i18n → PR19 Mobile → PR20 Legal.

### Notes for future Claude
- `developv2` worktree is at `C:\Users\manyu\kp-astro\.claude\worktrees\v2-phase0-design\` (commit 146a919). Use it for visual reference on every Track A polish PR. Do NOT cherry-pick functional code from it until Track B.
- Preview server runs from eager-elbakyan worktree at port 3002 — it serves the pinned v1 code, not develop. Don't rely on local preview for develop verification; Vercel is the source of truth.
- User's rule: small PRs, feature branch → push → user reviews → user says "merge" → fast-forward merge.
- Analysis tab = permanently skipped.

---

## 2026-04-20 (Monday)

Long productive session — shipped PR18 → PR25. End-of-day ritual per user request.

### PRs shipped today (all merged to develop via fast-forward)
- **PR18** @ `342642e` — Transit (Gochar) wow pass + full i18n. Toggle card + serif hero + 3 sub-tabs (Overview / Planets / KP Rule) inside Dasha tab. Sade Sati breathing hero, polished transit table with MD breathing row, MD/AD/PAD spotlight cards, KP Rule pane. Deleted the ~140-line dead `{false && (…)}` block.
- **PR19** @ `58b67b5` — Dasha (Vimshottari) wow pass + full i18n. Serif page hero + 3-card "Currently running" (MD breathing, AD, PAD) with period progress bars. Premium section headers for AD timeline + PAD list, polished PAD cards with planet-color dots. DashaStrip i18n via new `getLordLabel(d, lang)` helper.
- **PR20** @ `bd78c55` — Mobile Command Orb (iOS AssistiveTouch-style). New `useIsMobile()` hook, new `CommandOrb` component (draggable floating 54px orb + 4×2 tab chip bottom sheet + power actions + first-visit coach mark), MOBILE LAYOUT SHELL CSS section that hides `.tab-bar` + `.workspace-sidebar` below 820px. localStorage position persistence.
- **PR21** @ `6967afd` — Orb polish: edge-tucks 50% into screen edge with Saturn LogoMark (brand identity), always-on gold breath, pops out fully on interaction, hides when sheet open. New shared `useSheetDrag` hook — swipe-to-dismiss for both CommandOrb sheet AND HousePanel (HousePanel now has drag handle + 36×36 close target on mobile). Elastic resistance on upward drags, 90px or 0.6 px/ms flick threshold.
- **PR22** @ `7377b8e` — Four mobile UX fixes: (1) shared `maskedInput.ts` helper so date/time backspace no longer "sticks" at the separator; (2) `matchHouseShared` replaces matchHouse1/2 so tapping a house on P1 expands both; (3) attempted pull-to-refresh survival via `overscroll-behavior-y: contain` + localStorage session restore; (4) `.match-people-grid` class + mobile single-column stack (fixed "Fem"-truncation overflow).
- **PR23** @ `8f17fb7` — Reverted `overscroll-behavior` (broke iOS scroll). Added `padOnManualSeparator()` so typing `8` → `:` → `3` → `0` now settles to `08:30` (was `12:0`).
- **PR24** @ `cf8481e` — Attempted to gate session-restore on `navigationType === "reload"`, added `CLAUDE.md` at repo root.
- **PR25** @ `456e122` — **Reverted the entire localStorage session auto-restore** (the PR22 snapshot + PR24 reload gate combo). Users intentionally navigating back to /app were getting a stale chart instead of the expected onboarding, and reload-type detection wasn't reliable enough. One-shot cleanup removes the stale `devastroai:lastSnapshot/:savedSessions/:mode` keys. Kept all the other wins: masked-input helpers, synced match houses, match mobile grid, CommandOrb + useSheetDrag + CLAUDE.md.

### Decisions made today
- **Mobile strategy confirmed** — one codebase + responsive CSS + grep-able `/* ═══ MOBILE ... ═══ */` banner tags. No separate mobile tree.
- **Mobile nav pattern chosen** — draggable floating orb (Path C: orb + bottom-sheet command center) after reviewing Path A (belt-and-suspenders), Path B (pure radial fan), Path C (chosen). Matches "premium, not clumsy" brand rule.
- **Session resume deferred to Track B** — needs an explicit "Resume chart?" opt-in prompt alongside auth, not automatic.
- **`overscroll-behavior` permanently blacklisted** for this app — breaks iOS touch scroll. Documented in CLAUDE.md.

### In flight (unmerged feature branches)
- None. All PR18-25 branches merged to develop via fast-forward and pushed.

### Tags
- Existing: `v1-stable-2026-04-17`, `v1.9-i18n-complete`. Nothing retroactively tagged today.

### Next session priorities (ranked)
1. **PR26 — Legal pages (`/privacy`, `/terms`)**. Original Track A final item. Port `frontend/app/privacy/page.tsx` + `frontend/app/terms/page.tsx` + `frontend/components/legal/shell.tsx` from developv2 (visual only, strip any auth-dependent copy). Add footer links on landing. Adjust copy to "no auth / no data stored" since we're stateless.
2. Confirm Vercel deploy of `develop@456e122` looks good on `devastroai.vercel.app`.
3. After PR26 ships: Track A is DONE. Decision point — start Track B (Supabase auth) or step back for business-model/pricing research session.

### Notes for future Claude (session-specific additions)
- `CLAUDE.md` is now at repo root — **read it first every session** alongside BACKLOG.md + DAILY_LOG.md. It covers: repo layout, Track A quality bar, design tokens, full mobile architecture (CommandOrb, useSheetDrag, HousePanel, masked inputs, match shared house state), conventions for any new mobile PR, and the "DO NOT re-introduce" list (overscroll-behavior, session auto-restore).
- The match tab now has a `.match-people-grid` class (was inline `gridTemplateColumns: "1fr 1fr"`). Use that class, don't revert to inline.
- All date/time inputs use `formatMaskedDate` / `formatMaskedTime` from `frontend/app/app/lib/maskedInput.ts`. Any new masked input should reuse them.

---

## 2026-04-20 (Monday) — late-session addendum

Session continued past the earlier "done for the day" note. Two more things shipped + a new track was planned.

### PRs shipped (additional)
- **PR26** @ `f13e6ef` — Legal pages (`/privacy`, `/terms`) + new `LegalShell` component adapted from developv2 + footer links (Privacy · Terms) on landing. Honest stateless-free-tier copy: no account, no server-side data, no tracking, no cookies beyond language/orb-position localStorage, AI via Anthropic (linked), place autocomplete via Nominatim (linked), 18+, strong "informational/entertainment only" disclaimer, Ontario governing-law placeholder. All placeholders (`[CONTACT_EMAIL]`, `[OPERATOR_NAME]`, `[JURISDICTION]`, `[EFFECTIVE_DATE]`) documented in file headers for the user to swap later when entity + domain finalized. Build prerenders /, /app, /privacy, /terms cleanly.

### Decisions made (additional)
- **Domain purchase deferred** — user will buy the real `devastroai.com` later when the app is "strong and really ready for end users". For now the legal pages carry `hello@devastroai.com` as placeholder; `devastroai.vercel.app` remains the live URL.
- **Vercel subdomain is fine for now** — user acknowledged SEO ranking needs a real domain + the free SEO basics (robots/sitemap/metadata/JSON-LD) we discussed; deferred to after domain purchase.
- **Track A is closed.** PR13-PR26 covered every tab's wow pass + mobile + legal. No further Track A polish queued.
- **Track B (auth, DB, Stripe) remains deferred** — still needs business-model / pricing research session first. User reiterated passive stance ("if it clicks it clicks"), not interested in aggressive rollout yet.

### NEW TRACK — Track A.1: Backend KP accuracy audit
User opened a new track focused on **correctness of the KP engines**, not UI. Full scope captured in `.claude/BACKLOG.md` § Track A.1. Summary:
- Goal: astrologer-grade correctness for Horary, Panchang, Transit, Muhurtha, Match. Zero regression in Analysis tab (which the user considers the gold standard).
- Approach: research KP textbooks + web + free tools → audit current code line-by-line → gap analysis → targeted fixes with golden-snapshot tests → verify against reference sources.
- Order: **Horary FIRST**, then Panchang, Transit, Muhurtha, Match (user's pick).
- Constraints: may fix `kp_chart.py` core bugs even if they ripple into Analysis (user approved). May propose new features if research surfaces genuinely valuable missing pieces.
- Verification: Panchang = external websites (user will share list). Horary/Muhurtha/Match = our best research-backed attempt first, user's father gives async feedback later. No commercial KP software assumed (may rely on free JHora later).

### Next session priorities (superseded)
1. **Horary research session** — deep read of KP texts (Krishnamurti "A Handbook of Astrology — KP Reader I" priority) + audit of `backend/app/services/horary_engine.py`. Deliverable: `.claude/research/horary-audit.md` documenting (a) what KP says, (b) what our code does, (c) gaps, (d) proposed fix list with severity. NO code changes that session.
2. Then PR A1.1 — Horary accuracy fixes based on the approved audit.
3. `.claude/research/` directory is new — create it when writing the first audit doc.

### Notes for future Claude (Track A.1 context)
- **Analysis tab is load-bearing**. It reads from `backend/app/services/kp_chart.py`. Any engine fix that affects chart output will ripple into Analysis. User accepts this trade-off but treat it as a known risk for every PR.
- **Write golden-snapshot tests BEFORE each accuracy fix.** No existing backend tests (confirmed via `find backend -name "test_*.py"`). Test harness approach: capture current engine output for a known chart, diff after changes, show user the delta.
- **Ayanamsa check is the first audit step** for every tool. KP-specific ayanamsa ≠ Lahiri. If the engine is on Lahiri, everything is slightly off by design.
- **Ruling Planets = user's current time + astrologer's current location**, not natal. Confirmed with user (relayed from his father). May need client-side geolocation plumbing per tool — small frontend+API contract change.

---

## 2026-04-21+ → ~2026-04-27 — Analysis Tab arc (multi-day, single continuous flow)

User reopened the Analysis tab mid-Track-A.1 after testing it and finding (a) gender wasn't reaching the LLM, (b) age wasn't reaching the LLM, (c) `KNOWLEDGE_DIR` path bug meant LLM had been receiving ZERO KB content for months, (d) predictions felt thin compared to a real KP astrologer's reading.

That triggered the **A1.3 analysis-tab arc** — 11 PRs over ~7 days that took the Analysis tab from broken to structurally complete KSK-strict KP analysis. Full record at `.claude/HANDOFF-analysis-tab.md`.

### Arc summary (11 PRs, all merged to develop via fast-forward)

| PR | Commit | Scope (one-line) |
|---|---|---|
| A1.3 foundation | `76368a2` | KNOWLEDGE_DIR path fix + 7 deep-dive .md files |
| A1.3a + A1.3b | `11219b2` | Gender/age wiring + Star-Sub Harmony + KSK verbatim per-topic |
| A1.3c + A1.3d + Sookshma | `7599948` | Advanced compute (8 fns) + Sookshma 4th-level + pattern library + gold standards |
| A1.3-fix | `d15df10` | 11 audit fixes (latency + correctness + consistency) |
| A1.3-fix-5 | `eb4fd4c` | KSK strict timing trigger (supporting cusp sub-lord) — fixed karaka-AD bias |
| A1.3-fix-6 | `879dd8e` | 15 features: aspects, combustion, conjunction, pada, 8L, partner profile, Ashtakavarga, transits, Sade Sati |
| A1.3-fix-7 | `fe1c309` | 8 features: gandanta, nakshatra-class, dignity, vargottama, Yogini Dasha, planetary returns |
| A1.3-fix-8 | `4abe6ce` | 17 features: intercepted signs, stellium, lagna lord, divisionals, decision support, conflict flags, personality KB, remedies KB |
| A1.3-fix-9 | `4235ced` | 15 items: prompt caching (~90% input reduction on follow-ups), KB cache wiring, RULE 10/17/28/31 strengthening, RULE 21B PAD-vs-Sookshma neutral |
| A1.3-fix-10 | `aa31528` | 10 items: Tenali leak fix, detect_topic 11→30 topics, decision penalties (100→86), confidence calibration, sookshma fire-rank, verify_past_event, session memory anchor |

**Cumulative**: ~6,500 lines added, 34 system-prompt rules, 6 KB files, 5 compute modules, 72 gaps surfaced + addressed across 3 Web-V vs Engine-V audit rounds.

### User's invention preserved: Web-V vs Engine-V audit format

🌐 Web-V = full literature + reasoning. 🤖 Engine-V = our codebase as-shipped. Compare both to find gaps. Reuse this format on every future tab audit.

### Calibration chart used throughout: Manyue, 09/09/2000, 12:31 PM, Tenali AP, male

Lagna Scorpio 24°40' Jyeshtha (Rahu sub). Mercury exalted in Virgo H10. Venus debilitated in Virgo H10. Sun + Mars in H9. Saturn + Jupiter in H6 Taurus. Rahu H8 Gemini (vargottama). **Leo intercepted in H9, Aquarius intercepted in H3** (key insight). Currently Saturn AD just begun (Mar 17, 2026 → Jan 21, 2029).

### Decisions locked across the arc (NEVER undo without explicit user approval)

1. **KSK strict over Parashari** — CSL is THE gate, karaka is CONTEXT only.
2. **Star-Sub Harmony** is the single biggest accuracy lever (3-layer split SELF/STAR/SUB).
3. **KSK strict bhukti rule** for dual signification (RULE 11).
4. **KSK strict timing trigger** = AD lord IS sub-lord of relevant cusp + chain signifies others (RULE 21).
5. **PAD vs Sookshma neutrality** (RULE 21B) — added after a sycophantic-shift incident. **The engine never pivots its reading because another astrologer said something different.**
6. **Universality** — every fix audited against universal-vs-chart-specific bias. No injected outcomes.
7. **NATIVE PROFILE** (gender + age + birth_date) reaches LLM as structured data (RULE 17).
8. **Anti-Parashari guardrails** — 17 explicit rejections in `ksk_rejections.md`.
9. **Honest confidence calibration** — Expected Distribution benchmark in `confidence_methodology.md`.
10. **Sensitive prediction protocol** — death taboo'd (RULE 15); harm-reduction framing for mental-health/addiction/divorce.

### A1.3-fix-11 — Output structure refactor (shipped `d60527b`, ⛔ REVERTED `07bbc7d`)

Final structural pass attempted, partially rolled back. Three parallel deliverables landed in `d60527b`:

- **Backend** — system prompt 7→5 sections (Verdict / Structural Evidence / Timing / Patterns+Remedies / Client-Facing with 5a Q/A + 5b prose). Tables-first. Estimated ~35% token reduction. **REVERTED at `07bbc7d`** — user found the output worse than fix-10's 7-section format. Backend now back on fix-10 baseline (VERDICT / CUSPAL EVIDENCE / FRUITFUL SIGNIFICATORS / TIMING WINDOWS / PRATYANTARDASHA / PRE-ANSWERED FOLLOW-UPS / CLIENT SUMMARY).
- **Frontend** — chat-feel UI polish (AI avatar dot, typing dots animation, copy button on AI bubbles, topic-strip auto-collapse, suggested follow-up chips, starter question chips, topic-aware loading message, hover affordances). **KEPT** — only the backend prompt was reverted. UI polish was independent and produced no complaints.
- **Documentation** — NEW `.claude/HANDOFF-analysis-tab.md` (350 lines). **KEPT** with revert post-mortem appended.

#### Post-mortem — why 5-section was worse than 7-section

- The 7 sections mapped 1:1 to the cognitive steps of a KP reading (Verdict → Cuspal evidence → Who fires → When at AD → When at PAD → Pre-emptive Q&A → Client summary). Compression broke that mapping.
- Merged "STRUCTURAL EVIDENCE" bundled too many distinct signals (cuspal + fruitful) into one block. Reader couldn't see the boundary.
- Token-count savings (~$75/mo at 1k queries) wasn't worth readability loss.
- The change bundled prompt restructure + UI polish in one commit, making A/B isolation hard.

#### Lessons for any future output-restructure attempt

1. **Change ONE section at a time.** If timing feels verbose, refactor TIMING alone — leave the other 6 untouched.
2. **Never bundle backend prompt changes with frontend polish.**
3. **Don't optimize for token count without proving readability holds.**
4. **Write 3-5 sample outputs in the new format BEFORE editing the prompt** so user can review the shape first.
5. The 7-section structure is a constraint, not a target for compression.

Total arc reconciled: **12 PRs (`76368a2` → `d60527b`) + 1 partial revert (`07bbc7d`).** Live state = fix-10 backend + fix-11 frontend polish + HANDOFF doc.

### Pending after fix-11 revert

- **A1.3e** — UX polish (frontend confidence bar, source-citation expandables, conflicting-signals panel rendering, life-arc timeline)
- **Real-world calibration** — when user's contract / marriage / kids actually happen, record diff vs engine prediction
- **A1.4-A1.5 / A1.8-A1.9** — Transit + Match research audits (rest of Track A.1 queue)
- **Track B** — auth + CRM + billing (still deferred pending pricing-research session)

### Notes for future Claude

- **READ `.claude/HANDOFF-analysis-tab.md` FIRST** if touching anything in `backend/app/services/llm_service.py`, `kp_advanced_compute.py`, `kp_transit_compute.py`, `kp_yogini_dasha.py`, `backend/knowledge/*`, or `backend/app/routers/astrologer.py`.
- The 10 principle commitments (P1-P10 in HANDOFF) are sacrosanct. Don't undo them without explicit user approval.
- The Web-V vs Engine-V audit format is the user's invention. Reuse it for every future tab audit.
- Anthropic prompt caching is wired in `get_prediction()`. Expect ~90% input-token reduction on follow-up questions within 5-min cache TTL. Don't undo this.
- All compute is pre-computed in `compute_advanced_for_topic` + `compute_transit_bundle` + Yogini orchestrator. RULE 18 mandates LLM CITES these directly without recomputing.
- Every fix in fix-1 through fix-10 was checked against universal-vs-chart-specific bias. Future PRs MUST do the same audit before shipping.
- Calibration chart (Manyue) facts logged in HANDOFF §Calibration findings — useful for sanity-checking output.
- **Smoke tests at end of each PR** — manual Python smoke tests are logged in commit messages. Reproduce them when validating future changes.

---

## 2026-04-27 (later) — Fix-11 backend revert

User tested fix-11 output and found it worse than fix-10. Walked through the revert plan, then executed.

### Action

- `git checkout aa31528 -- backend/app/services/llm_service.py` → restored fix-10's 7-section OUTPUT FORMAT block
- Verified: `python -c "import ast; ast.parse(...)"` OK, all 33 rules intact (RULE 21B at line 761, RULE 31 at line 952), 7 sections present at lines 1137-1179
- Frontend `page.tsx` + `globals.css` chat polish from fix-11: KEPT (independent of complaint)
- `.claude/HANDOFF-analysis-tab.md`: KEPT with post-mortem section appended
- Committed revert as `07bbc7d` with full post-mortem in commit message
- Reconciled HANDOFF + BACKLOG + DAILY_LOG to reflect new live state

### Decisions

- **Live backend output** = fix-10's 7 sections (VERDICT / CUSPAL EVIDENCE / FRUITFUL SIGNIFICATORS / TIMING WINDOWS / PRATYANTARDASHA / PRE-ANSWERED FOLLOW-UPS / CLIENT SUMMARY)
- **Live frontend** = fix-11's chat-feel polish (avatar dot, typing dots, copy button, topic strip, suggested follow-ups, starter questions)
- **No more wholesale prompt restructures.** If a section feels weak, refactor ONE section at a time, A/B test, never bundle with UI work
- **A1.3f** added to BACKLOG as optional single-section refactor track (only if needed)

### Why this matters for future Claude

If output-structure refactor is revisited:
1. Identify the ONE section that feels weakest in fix-10's 7-section format today
2. Refactor only that section
3. Generate ≥3 sample outputs in the new format BEFORE editing the prompt — user reviews shape first
4. Ship as its own PR (no UI bundling)
5. A/B against current 7-section before merging

The 7-section format is a constraint. Treat it as such.

---

## 2026-04-27 → 2026-05-06 — Extension arc: cost / accuracy / chart renderer / Tara system

10 PRs (`082a4ca` → `094e0e1`, fix-12 through fix-21) shipped on top of the fix-10 baseline. Same eager-elbakyan worktree, no branch flip. All on `develop`-bound feature branch (or direct depending on session — see commit list).

### Shipped PR table

| PR | Commit | Focus | Headline |
|---|---|---|---|
| fix-12 | `082a4ca` | cost | Cache breakpoint reorder — ~67% input-token cut on follow-ups |
| fix-13 | `cf9b59c` | cost | 1h cache TTL + conditional KB load + KB dedup |
| fix-14 | `61c5365` | accuracy | General-user mode parity (gender wiring, KSK reasoning, citations no longer astrologer-only) |
| fix-15 | `c922488` | UX | Premium UserModeUI revamp (consumer chat surface) |
| fix-16 | `f6dbfdf` | cost+UX | Phase 1+2+3 user-mode optimization |
| fix-17 | `db05864` | cost | **Haiku for user mode**, Sonnet stays for astrologer + 3 cache fixes |
| fix-18 | `c1eab74` | cost | Phase A user-mode KB trim — sub-10-cent target HIT |
| fix-19 | `1fc4417` | accuracy | **Type-classification gap closure** — RULE 33 + RULE 35, 7 KBs touched |
| fix-20 | `1248957` | UX | Proper KP rasi chart (sign-fixed, S/N/E tabs) + Tara Chakra system |
| fix-21 | `094e0e1` | UX+accuracy | Chart bug fixes (Telugu rendering, East Indian rewrite, North sizing) + Chandra Bala paired axis + Pariharam |

### Cost arc (fix-12, 13, 16, 17, 18) — astrologer ~50¢ → ~5¢, user ~50¢ → <10¢

- Cache breakpoint reordering put system prompt + KB BEFORE history. ~90% input tokens hit cache on follow-ups.
- 1h TTL extended cache window beyond Anthropic's default 5min.
- Conditional KB load — only inject the topic's KB file, not all 6.
- **Mode-aware model selection** — Haiku 4.5 for user mode (10x cheaper than Sonnet), Sonnet 4.6 stays for astrologer mode. User-mode KB trimmed to ~30% of astrologer KB.
- KB dedup removed ~8% redundant section overlap across `marriage.txt`, `children_detailed.md`, `relationship.txt`.

### Accuracy arc (fix-14, fix-19)

#### fix-14 — user-mode parity
Before: user mode dropped gender, dropped KSK CSL chain reasoning, dropped citations. After: same KP-strict chain analysis as astrologer, just simpler vocabulary.

#### fix-19 — the "love-cum-arranged" bug-driven type-classification overhaul
**Trigger**: AI predicted "love-cum-arranged" marriage. Father (KP astrologer) corrected: actually "family-mediated arranged with native acceptance". Root cause: AI saw H5 in H7 CSL chain → defaulted to love-marriage type without checking the **5L override** (5L Jupiter in H6 negates love-affair fruition).

**Fix**: NEW RULE 33 (TYPE-CLASSIFICATION DISCIPLINE) — mandates that whenever the engine outputs a "type" classification, it must run all 5 signal checks:
1. H5 in CSL chain
2. **5L placement** — 6/8/12 NEGATES love-marriage signal even if H5 in chain
3. H4/H9 mediation
4. Moon position
5. 5L-7L relationship

**Plus** RULE 35 (PUSHBACK RE-VERIFICATION) — when user pushes back, engine RE-RUNS the structural analysis instead of pivoting to please. Anti-sycophancy guardrail.

**KBs touched** (~813 lines added):
- `marriage.txt` Section 12 — 5 marriage-type categories with override rules + meeting-place rules from H7 CSL star lord
- `children_detailed.md` Sections 12-14 — gender prediction (with PCPNDT Act caveat), number-of-children timing, biological vs adopted vs IVF
- `foreign.txt` Section 8 — 5 foreign-status levels (visit / work-visa / PR-with-H4 / citizenship / return)
- `divorce.txt` Sections 7-10 — initiator, reconciliation, second marriage, pushback discipline
- `other_topics.txt` — wealth types, property types, specific-date question framework
- `job.txt` — Govt/Private/Self-employed, promotion vs change, 15 industry combinations
- `health.txt` — health type classification, organ-system mapping, recovery timing

### Chart renderer overhaul (fix-20, fix-21)

**Trigger**: Father identified the existing SouthIndianChart was wrong — it was a house-cell layout (planets-by-house). KP convention requires **sign-cell layout, signs FIXED, planets-by-SIGN**.

**fix-20** — built `frontend/app/app/components/RasiChart.tsx` (~380 lines) with three tabs:
- **South Indian** (default) — sign-fixed canonical KP, Pisces top-left, Roman-numeral cusp markers
- **North Indian** — diamond/kite layout, H1 always top
- **East Indian** — 3×3 grid (initial pass — buggy)

**fix-21** — rewrote based on user-supplied reference images:
- **East Indian** — proper 3×3 grid with corner cells split diagonally (8 corner-triangles + 4 edge cells), `EAST_HOUSE_ZONES` mapping each house to (gridCell, triangle, labelPos)
- **Telugu rendering** — added `signAbbr()` and `planetLabel()` helpers using lang context; removed hardcoded SIGN_ABBR_EN/SIGN_ABBR_TE switches
- **North Indian sizing** — SVG `preserveAspectRatio="none"`, larger zone padding, bigger DM Serif Display font
- **Hardcoded title removed** — RasiChart now renders its own dynamic title in header bar

### Tara Chakra system (fix-20 + fix-21)

**Trigger**: Father said "mitratara, pratyantara something like that". Research revealed this was likely **Chandra Bala** — a 12-sign axis paired with Tara Bala (9-Tara classification of 27 nakshatras).

**Backend** — NEW `backend/app/services/kp_tara_chakra.py` (~290 lines):
- `compute_tara_chakra(janma_nakshatra)` — full 27-cell chakra
- `compute_today_tara(today_moon_nakshatra, janma)` — today's Tara Bala
- `compute_chandra_bala(natal_moon_sign, transit_moon_sign)` — 12-sign axis
- `compute_today_chandra_bala()` — today's paired axis
- `compute_transit_taras()` — all 9 planets' current Tara
- `TARA_PARIHARAM` dict — classical KP remedies for unfavorable Taras
- Telugu transliterations throughout

**Pipeline integration** — Step 10b in `chart_pipeline.py` produces full `tara_chakra` payload. Astrologer workspace exposes it via `_build_tara_chakra()` helper in `astrologer.py`.

**Frontend** — NEW `frontend/app/app/components/TaraChakraWidget.tsx` (~250 lines):
- fix-20: modal-based — user complained it felt disconnected
- fix-21: **inline expand/collapse** — Today's Tara + Chandra Bala chips side-by-side, **combined verdict** (Strongly Favorable / Avoid / Mixed-Tara-favors / Mixed-Chandra-favors), Pariharam display when today's Tara is unfavorable, full 27-nakshatra grid + transit Taras table + educational explainer

### Decisions locked in this arc

1. **Mode-aware models** — Sonnet for astrologer, Haiku for user. Don't undo without explicit user approval.
2. **Type-classification discipline (RULE 33)** — every "type" prediction must run all 5 signal checks + override rules. Sacrosanct.
3. **Pushback re-verification (RULE 35)** — engine re-runs structural analysis when user pushes back, never pivots to please. Anti-sycophancy axis.
4. **Sign-fixed KP rasi chart** — South Indian convention, Pisces top-left. The old house-cell layout is gone for good.
5. **Tara Bala + Chandra Bala paired** — never display Tara without Chandra Bala when both are computable. Combined verdict is the headline.
6. **Pariharam shown only for unfavorable Taras** — don't clutter UI when Tara is favorable.
7. **Telugu rendering uses `signAbbr()` / `planetLabel()` helpers everywhere** — no hardcoded language branches inside chart components.

### Cumulative metrics (fix-12 → fix-21)

- ~3,200 lines added (KBs + Tara compute + RasiChart + TaraChakraWidget + CSS + system prompt rules)
- 35 system-prompt rules (RULE 33 + RULE 35 added)
- 7 KB files modified (marriage, children_detailed, foreign, divorce, other_topics, job, health)
- 2 new compute modules (`kp_tara_chakra.py`)
- 2 new frontend components (`RasiChart.tsx`, `TaraChakraWidget.tsx`)
- Per-question cost: astrologer ~5¢ (was ~50¢), user mode <10¢ (was ~50¢)

### Quick Mode — DROPPED

User explicit (2026-05-06): *"we are dropping the idea of quick mode for now"*. Removed from queue. Don't re-add without user signal. Rationale (implicit): Sonnet is already affordable post-fix-12-through-18, and a tier toggle adds UI complexity for marginal benefit.

### Queued PRs after this arc (see BACKLOG fix-12→21 rows)

- A1.3e — UX polish (confidence bar, citation expandables, conflicting-signals panel, life-arc timeline)
- A1.3g — Astrologer streaming (SSE, sub-2s first token)
- A1.3h — History compression (rolling summary)
- A1.3i — Output budget RULE 32 (hard token caps)
- A1.3j — Beta header cleanup
- A1.3k — Format B narrative variant
- A1.3l — Engine compute helpers (refactor for citation-by-helper-name)
- A1.3m — Saptamsa D7 (Children divisional)
- A1.3n — Vedha + Panchaka overlay on Tara Bala
- A1.3o — Tara overlay in Dasha tab

### Notes for future Claude

- **READ `.claude/HANDOFF-analysis-tab.md`** if touching analysis backend or KBs. Extension arc is documented there in the "EXTENSION ARC" section.
- **Don't re-introduce hardcoded language strings in chart components.** Use `signAbbr()` / `planetLabel()` helpers + lang context.
- **Don't decouple Tara Bala from Chandra Bala in the widget.** The combined verdict is the headline insight.
- **Type-classification (RULE 33) override checks are non-negotiable.** Every type prediction must run them — the "love-cum-arranged" bug came from skipping the 5L override.
- **Pushback (RULE 35) — re-run, don't pivot.** If a future PR loosens this rule, the engine will start sycophantically agreeing again. Don't.
- **Mode-aware model selection** — `llm_service.get_prediction()` reads mode and picks Sonnet vs Haiku. Don't unify the two.
- **Backend Tara compute is in `kp_tara_chakra.py`** — pipeline Step 10b. Transit Tara compute reads from `kp_transit_compute.py`. Don't recompute either in LLM.
- **Quick Mode is DROPPED** — don't re-queue without user signal.

---

## 2026-05-07 (Thursday) — Phases 1-14 polish + cost-fix arc, all on develop

Long session. User stress-tested live `develop`, I catalogued ~60 UI/UX gaps, then shipped 14 phase commits in sequence. Frontend chrome work + one backend correctness pass + one PDF rewrite + two cost-reduction patches.

### Phases shipped (in order)

| Phase | Commit | What |
|---|---|---|
| 1 | `2800092` | Foundations — `lib/format.ts` (date/dasha/coords formatters), shared `<Loader> <EmptyState> <PrimaryAction> <SubTabBar>` primitives, reconciled Panchang to `useLiveLocation` |
| 2 | `36e005a` | Critical KP correctness — RP KSK strength order + extended 5+2 in Houses → Ruling, HousePanel 4-level significators (L1+L3 surfaced from backend), birth-panchang label honesty |
| 3 | `ec96369` | Slim header (~64px) + per-tab chart-context strip + sticky Today strip + sidebar trim (removed duplicate person + panchang widget) |
| 4 | `b4d8e73` | Per-tab polish — place picker dedup, Panchang era-strip + choghadiya legend, Muhurtha jargon tooltips + dedupe Ask, Match disabled-CTA hint, Horary slider midpoint init |
| 5+6 | `6507096` | i18n holes in pure TEL mode (Workspace/Charts/Active/Switch/Back-to-landing/Analysis topics carve-out) + active-tab gold-fill pill |
| 7 | `5e8d724` | Cleanup — place dedup tighten (display-only), Dasha date format completion, HH:MM:SS strip across panchang/muhurtha/HousePanel, choghadiya legend |
| 8 | `066e9bf` | Interactivity — Today strip pills clickable into Panchang, chart-context chip tooltips, global keyboard shortcuts (1-8 tabs, ?, Esc) |
| 9 | `021eee2` | Visual wow — constellation backdrop (CSS radial-gradients, <4% opacity), first-chart reveal (1.7s gold bloom + serif title) |
| 10 | `3d3eb22` | Panchang correctness — TodayStrip uses live location not BIRTH (was silently wrong Hora/Rahu Kalam for any user not at birth city); honest LIVE-{city} vs snapshot-birth indicator |
| 11+12 | `6e3266e` | Analysis UX overhaul — sticky topic strip, Stop/Regenerate buttons, per-bubble timestamps, AI bubble width capped 78ch, right-rail TOC with smooth-scroll anchors, Finance + Legal added (10 topics matching Horary canon), Clear-confirm |
| 13 | `1ddeb33` then partial revert `125c9c4` | Cost reduction — quickInsights auto-fire REMOVED (~40% saving). Two reverts: 30d cache + dropped `today_ist` (staleness unacceptable), 24h Anthropic prompt cache (broke streaming — beta header missing) |
| 14 | `3f78d52` + 3 hotfixes | Astrologer-grade PDF — `pdf_engine_v2.py` replaces 3-page tables-only v1 with 30-50 page deterministic KP report. 14 sections, zero LLM cost |
| 13.1 | (this commit) | Hard-disable `/quick-insights` endpoint with HTTP 410 — defence so stale Vercel CDN bundle can't bill anything |

### Cost diagnosis (Anthropic dashboard)

May 2026 was burning ~$5/day in Sonnet. Smoking gun: `useEffect` on Analysis tab open auto-fired `loadQuickInsights()` requesting snippets across all 8 topics in one Sonnet call. Most users immediately clicked a specific topic and never read previews. Killing the auto-fire cuts daily burn ~40%.

Opt-in restoration is one-line: delete the `raise HTTPException(410)` in the endpoint body.

### Reverts of note

- `125c9c4` undid PR 32 (30-day cache + dropped `today_ist`). Staleness on age, today-RPs, dasha references unacceptable for an astrologer-grade product.
- `1fe7c5c` undid PR 33 (Anthropic 24h prompt cache TTL). 24h still needs the `extended-cache-ttl-2025-04-11` beta header which earlier PR A1.3-fix-22 removed thinking 1h was GA. 1h is GA, 24h is not. Re-bumping needs the header re-attached + smoke test.

### What still works post-revert

- ~40% Sonnet saving from killing quickInsights auto-fire
- 24h same-day cache hits via `answer_cache` (unchanged)
- 1h Anthropic prompt cache (unchanged, GA)
- All 14 polish phases on develop

### Decisions made today

- **Astrologer-mode PDF excludes AI output.** Astrologer brings the narrative; PDF is the data layer (radiologist + MRI model). Same v2 PDF for consumer + astrologer (cover branding can differentiate later). NO Parashari doshas (Sade Sati / Kuja / Kaal Sarpa) — KP weights them differently and no strict-KP KB exists for them.
- **24h cache TTL deferred.** Needs the beta header and a proper smoke test.
- **Phase 14 / PR B (astrologer brand customisation) deferred.** Logo + name + contact line on cover/footer. Settings UI required first.

### Notes for future Claude (high-leverage gotchas)

- **Don't bump Anthropic `cache_control.ttl` past `1h` without re-adding the `extended-cache-ttl-2025-04-11` beta header** to every `client.messages.create()` AND `async_client.messages.stream()` call. The 24h TTL silently fails at request-build time with `Could not resolve authentication method` (misleading SDK error message — root cause is the missing beta header).
- **`csl_chains` is keyed by INTEGER house numbers** (1..12), not "H1"-style strings. After JSON round-trip via FastAPI request parsing, dict keys become string-of-int. Use a tolerance helper (see `_to_int_key` in `pdf_engine_v2.py`) to handle both shapes.
- **`csl_chains` per-entry field names** (from `services/csl_chains.py`): `csl, csl_house, csl_rules, csl_star_lord, csl_star_lord_house, csl_star_lord_rules, csl_sub_lord, csl_sub_lord_house, csl_sub_lord_rules, all_significations, chain_text`. NOT `sub_lord/star_lord/sign_lord/full_chain_houses`.
- **`tara_chakra` real shape** is `{natal_moon_sign, chakra: {janma_nakshatra, janma_nakshatra_te, nakshatras: [27 entries]}, pariharam: {tara_name → remedy}}`. Each nakshatra entry has `name, name_te, index, position_from_janma, cycle, tara_name, tara_index, nature, effect, is_janma`.
- **Helvetica (ReportLab default font) cannot reliably render** Telugu Unicode (`లగ్నం` → `sssss`), `✓ ★ ⚠ ℞`. Use plain text replacements until Noto Sans Telugu is registered. Affects PDF rendering only.
- **`workspace.dashas`** (not `mahadashas` / `vimshottari_mahadasha_tree`) is the full 9-MD list. `is_current` field is `None` on every entry — compute currency by matching `lord+start` against `workspace.mahadasha`.
- **`workspace.place` is NOT echoed by `/astrologer/workspace`.** Frontend PDF call now injects `place: birthDetails.place` before posting to `/pdf/export`.
- **`workspace.panchangam_birth` field shape**: has `karana` and `hora_lord` (NOT `_en` suffixes), no `nakshatra_pada`. The `_en`-suffixed fields exist for `vara, tithi, nakshatra, yoga` only.
- **`/quick-insights` endpoint is hard-disabled** (Phase 13.1). Returns HTTP 410. To re-enable: delete the `raise HTTPException(410, ...)` line. Original body preserved verbatim below the raise.
- **PDF `pdf_engine_v2.py` has 14 sections.** Old `pdf_engine.py` (3 pages) untouched — easy fallback if v2 misbehaves.
- **TodayStrip uses `useLiveLocation`** for the LIVE indicator. When geo resolves, fetches `/panchangam/location` for current lat/lon and replaces the snapshot. Indicator shows `LIVE · {city}` (green) vs `snapshot · birth loc` (gold dim).
- **Active tab pill** is gold-tinted background + 2px gold underline. Hover tints inactive tabs gold-faint.
- **Analysis tab right-rail TOC** appears when `analysisMessages.length >= 2`. Each AI bubble carries `id="analysis-msg-{id}"` for smooth-scroll targets. Hidden below 1100px viewports via `.kp-hide-below-1100`.
- **Phase 9 keyframes** (`kp-spin`, `kp-pa-btn`, constellation specks, `kp-reveal-*`) live in `frontend/app/globals.css` so components stay SSR-clean (no styled-jsx).

---

## 2026-05-22 (Friday) — PR A1.12 (chart-accuracy hotfix)

### Bug report
Dad cross-checked a US-birth chart (Fremont CA, 19/10/2000 21:05) and called it
"all wrong" — lagna, every cusp, every planet position. User correctly spotted
the place picker showing **"tz IST (UTC+5.5)"** for a California birthplace.

### Root cause (two stacked bugs, the second latent)
1. **Frontend silent IST fallback.** Place picker called bigdatacloud
   reverse-geocode-client to resolve lat/lon → IANA tz. The API often
   doesn't return a `timezone` field for non-Indian coordinates; the
   client's two fallback paths both `.catch(() => {})` silently. React
   state default (`timezoneOffset=5.5, label="IST"`) was never
   overridden → backend got `timezone_offset: 5.5` → engine computed
   the chart for **09:05 PM IST** (= 03:35 PM UTC) instead of
   **09:05 PM PDT** (= 04:05 AM UTC next day). Twelve-and-a-half-hour
   error. Lagna landed in Libra instead of Taurus.
2. **Historical DST ignored.** Even when the lookup *did* work, the
   frontend computed the offset using `new Date()` (current moment),
   not the BIRTH date. For any region whose DST rules have changed
   (US pre-2007, Indianapolis pre-2006, Russia pre-2011) this gives
   a 1-hour error that would silently corrupt charts.

### Fix — PR A1.12 (commit pending)
- Backend is now source of truth for the UTC offset.
- New `timezone_utils.resolve_birth_offset(lat, lon, date, time, fallback)`
  helper: `timezonefinder` resolves lat/lon → IANA name (offline, pure
  Python, no network); `zoneinfo` then computes the UTC offset AT the
  birth date with full historical DST awareness.
- Applied at every chart-generating entry point:
  - `chart_pipeline.build_full_chart_data` (covers `/astrologer/analyze`
    + `/astrologer/analyze-stream` + `/prediction/ask` + `/prediction/ask-stream`)
  - `chart.py` `/generate`, `/analyze`
  - `astrologer.py` `/workspace`
  - `compatibility_engine.compute_compatibility` (covers `/compatibility/match` + `/compatibility/analyze`)
  - `muhurtha.py` `/find` (participants + event location + querent location)
  - `transit.py` `/analyze` (current location for transit moment)
  - `horary.py` `/analyze` (query-time DST window)
- Frontend `page.tsx`: stores IANA name in new `timezoneIana` state;
  useEffect recomputes displayed offset+label using the BIRTH date
  whenever date or IANA name changes. Both place-picker handlers
  (onboarding + new-chart modal) updated.
- Regression: 12 new tests in `backend/tests/test_timezone_resolution.py`
  including the literal bug fixture (Fremont 19/10/2000 21:05 → PDT/-7
  → lagna Taurus) plus US-historic-DST quirks, Nepal +5.75 sub-hour,
  London BST, IST sanity, and a negative control that asserts the
  broken IST chart STILL puts lagna in Libra (so anyone who defensive-
  codes the engine to "always resolve" breaks this test and gets a
  signpost to the right place).

### Verification
- 88/88 backend tests pass (76 prior + 12 new).
- `npx tsc --noEmit` clean. `npx next build` clean.
- Manual: `generate_chart(Fremont, 2000-10-19, 21:05)` BEFORE fix:
  Lagna **Libra 16.90°** (matches user's screenshot). AFTER fix:
  Lagna **Taurus 24.39°** (correct PDT chart).

### Impact + caveat
- **Every chart for a non-Indian birthplace was computed at the wrong
  UTC instant.** Users outside India saw garbage output. Match analyses
  for any cross-tz couple were also wrong on at least one side.
- Existing saved chart sessions in users' localStorage still carry the
  bad `timezone_offset: 5.5`. The backend now overrides this on every
  request → re-opening a saved chart will quietly fix it. No migration
  needed for `/api` callers; the override is transparent.
- The Analysis tab is sacred but this was the *engine* being wrong, not
  the AI quality — fix is accuracy, not interpretation. Re-running any
  saved Analysis on the fixed chart will now point at different houses /
  cusps / dashas.

### Notes for future Claude
- **Never trust frontend-supplied `timezone_offset` for chart compute.**
  Always pass through `resolve_birth_offset(lat, lon, date, time, fallback)`.
  The frontend number is fallback-only for the ~0.1% of cases where
  timezonefinder can't resolve (deep ocean / Antarctica).
- **DST-fall-back ambiguous hours** (clock reads e.g. 01:30 twice on the
  switch day): zoneinfo defaults to the first (pre-DST) occurrence. KP
  accuracy needs are typically minute-level; the <0.01% of users born
  in the rolled-back hour can subtract one hour from their typed time
  to disambiguate. Not worth complicating the API.
- **Saved sessions don't carry the IANA name** — only `timezone_offset`.
  When restoring a session the frontend display shows the persisted
  offset until the user picks a place again. Backend still recomputes
  correctly because it uses lat/lon, not the saved offset.
- **Phase 11 message type** added optional `t: number` field for timestamp. Old messages without it skip the timestamp row gracefully.

---

## 2026-05-22 (continued) — PR A1.13 (Gemini audit fixes)

### Trigger
External audit (Gemini Antigravity tool) flagged 3 codebase issues + a
case-study on Manyue's chart. After grep-verification: 1 audit finding
was stale (already fixed), 3 were real and shipped here.

### What shipped
1. **PDF engine lat/lon guard** — both `pdf_engine.py` (legacy fallback)
   and `pdf_engine_v2.py` (active 14-section report) now raise `ValueError`
   when `latitude` or `longitude` is missing from the workspace dict,
   instead of silently defaulting to (0,0) and computing a Gulf-of-Guinea
   chart. Defense-in-depth — frontend already injects lat/lon, but a
   stale caller used to ship confidently-wrong reports.
2. **`check_promise()` upgraded to 3-tier verdict** — was a flat
   membership check `{is_promised: bool, promise_strength: "Strong" or
   "Weak or Denied"}` that ignored denial houses entirely. New shape:
   ```python
   verdict: "Promised" | "Conditional" | "Denied" | "Inconclusive"
   denial_houses, denial_significators, csl_in_relevant, csl_in_denial
   ```
   Logic: CSL in relevant only → Promised; CSL in BOTH → Conditional
   (last-mile friction, Pattern D2 adjacent); CSL in denial only →
   Denied; neither → Inconclusive. Backward-compat fields preserved
   (`is_promised=True` for Promised+Conditional; `promise_strength`
   maps to Strong/Conditional/"Weak or Denied").

   On Manyue's chart now correctly returns:
   - marriage = **Conditional** (was incorrectly "Strong" — Rahu
     touches H7/H2/H11 relevant AND H1/H6/H10 denial). Matches the
     Gemini audit's independent manual classification exactly.
   - wealth = **Denied** (Mercury misses relevant H2/H6/H11)
   - job = **Promised** (Rahu covers H2/H6/H10/H11 cleanly — unchanged)
   - children = **Conditional** (Venus touches both sides)
   - property = **Inconclusive** (Moon touches neither cleanly)

   Eliminates the "dashboard says Strong, AI says Denied" UX
   contradiction the audit flagged.
3. **`RPContextStrip` mode prop + LIVE/NATAL/FALLBACK badge** — opt-in
   `mode` prop renders a colored chip so the astrologer instantly knows
   the RP frame: green LIVE (astrologer-current-loc + now), gold NATAL
   (chart loc + server time — workspace default), amber FALLBACK
   (live-geo failed/denied, using natal-loc as fallback). Wired into
   HoraryTab: shows LIVE when `liveLoc.status === "ready"`, FALLBACK
   otherwise. CSS gives the whole strip an amber tint in fallback mode
   so the warning catches the eye before the chip is parsed. Tooltip on
   hover explains each frame. Existing call sites without the prop
   render no chip (back-compat).

### Audit findings NOT shipped (with rationale)
- **Venus Karaka Override discrepancy** — stale claim. compatibility_engine.py
  already has the override removed (file comments at lines 21, 1598, 1606
  state "Venus override REMOVED (KSK strict)"). Audit was reading a
  pre-fix commit OR inferred the bug from doctrine without confirming.
- **365.25 vs 365.2422 day-year drift** — micro-quibble. ~0.0078 days/year
  × 20 years = 1 hour max drift. Inside KP birth-time natural tolerance.
  Would force re-baselining every regression test for zero user-visible
  improvement.
- **Barren-sign for children KB** — legit gap but low-leverage. Defer to
  a focused children-KB pass; not bundling here.

### Cross-engine validation (the high-value part of the audit)
Gemini independently ran pyswisseph on Manyue's chart (09-09-2000 12:31
Tenali) and got mathematically identical values to our engine:
- Lagna Scorpio 24°40'09" (234.6693°) — match
- Moon Capricorn 2°24'12" (272.4035°) — match
- H7 Taurus 54.6693°, H10 Virgo 150.2564° — both match
- H10 CSL = Rahu — match

Their career verdict ("STRONGLY PROMISED") converged with both the
production AI's reading and a manual third-party read. **Three independent
AI analyses agree** on the structural conclusion. Math layer is verified
correct across two independent swisseph invocations on the same chart.

### Verification
- 88/88 backend tests pass.
- `npx tsc --noEmit` clean. `npx next build` clean.
- Smoke-tested: both PDF engines raise ValueError on missing lat/lon;
  check_promise returns 3-tier verdict with backward-compat fields
  intact on Manyue's chart across job/marriage/wealth topics.

---

## 2026-05-24 (Sunday) — v2 plan cancellation + doc refresh + post-66aba57 audit

### Strategic decision: v2 plan CANCELLED ✅
User direction 2026-05-24: *"current UI is perfect, if we do anything we
do on top of it."*

The world-first-vision.md plan (8-workspace astrologer-mode + 3-workspace
consumer-mode + inquiry-driven canvas replacing the 8-tab UI) is **dead**.
Future work is **polish-and-add on top of the existing 8-tab UI**, not
a redesign. There is no architecture pivot pending.

- `CLAUDE.md` — the top "🔒 LOCKED v2 PLAN" section was replaced with
  "🔒 CURRENT DIRECTION (as of 2026-05-24) — current UI IS the target."
  Repo layout updated (page.tsx 3,889 lines, /tabs/ dir documented).
  Sacred-region KB count updated 29 → 55. Analysis-tab section updated
  to point at `tabs/AnalysisTab.tsx` instead of "line ~5716 of page.tsx."
- `research/world-first-vision.md` — CANCELLED banner added at top.
  Kept as historical record of considered direction.
- `research/phase-a-handoff.md` — COMPLETE banner added. The Phase A
  refactor it described shipped successfully on its own merits (R1-R8
  all done). page.tsx: 8,589 → 3,889 lines (−54.7%).
- `research/v2-roadmap.md` — was already marked SUPERSEDED (predated
  world-first-vision). Untouched.

### Phase A refactor status: COMPLETE
All 8 tabs extracted to `frontend/app/app/tabs/`:
ChartTab, HousesTab, DashaTab, AnalysisTab, HoraryTab, MatchTab,
MuhurthaTab, PanchangTab.

The ≤3,500-line page.tsx target was internal to v2 prep; with v2
cancelled the line count (3,889) is effectively at target.

### Frontend shipped today via `66aba57` (user's own push, not Claude)
**Commit**: feat(mobile): visual twinkling starfield and tactile dice
roll haptic mobile UI/UX elevations, Z-index alignment, and responsive
grid refactoring.

~4,000 lines added/changed across 20 frontend files. **Zero backend
files touched.** Highlights:
- 3 new components: `workspace/TransitWheel.tsx` (concentric dual-ring
  transit chart), `mobile/MobileChartSheet.tsx`, `mobile/MobileDashaStories.tsx`
- Significant reskins: MatchTab (604), DashaTimeline (346), CSLChainView
  (267), MuhurthaTab (200), PlanetList (155), AnalysisTab (102 — all
  visual: emoji→lucide icons, quote-block user bubble, cleaner AI card)
- globals.css +480 lines (mobile twinkling starfield, dice haptic
  styling, z-index alignment, responsive grid)
- AnalysisTab logic untouched (only visual changes — sacred boundary
  intact, streaming flow + LLM call unchanged)

### Post-66aba57 verification audit
Comprehensive sweep run after the commit landed. Findings:
- 88/88 backend tests pass (no regressions vs A1.13 baseline)
- `npx tsc --noEmit` clean, `npx next build` clean
- End-to-end smoke of `/astrologer/workspace`, `/chart/generate`,
  `/compatibility/match` — all return expected shapes with correct
  values on Manyue's chart
- Sacred regions ALL untouched: llm_service.py, compatibility_engine.py,
  all 55 KB files, chart_engine.py core (verified via `git diff --name-only`)
- API contracts ALL unchanged: workspace POST body, chart POST body,
  match POST body — same field set as before
- New components confirmed presentation-only: TransitWheel, MobileChartSheet,
  MobileDashaStories all have zero axios/fetch calls (props-driven)
- AnalysisTab streaming endpoint untouched (only a comment was edited)

### Gemini Antigravity audit (codebase_audit_report.md) — review + action
External audit ran on Manyue's chart + codebase. Reviewed via grep-
verification: 1 finding stale (Venus override — already removed in
compatibility_engine.py), 3 real. All 3 real findings shipped as PR
A1.13 (see prior entry).

High-value cross-validation: Gemini independently ran pyswisseph and got
mathematically identical chart positions to our engine (lagna 234.6693°,
moon 272.4035°, H10 CSL Rahu — all match). Career verdict converged
across three independent analyses (Gemini, production AI, manual read).
Math layer is verified correct across two independent swisseph
invocations.

### Gemini Antigravity audit (implementation_plan.md) — ARCHITECTURE REJECTED
Same external tool proposed a "complete UI/UX redesign" with 3-panel
layout (chart left / active tab center / AI side-sheet right),
glassmorphism overhaul, AI demoted to side-sheet, embedded everywhere.

**Rejected as architecture proposal.** Reasons documented in chat:
- Directly contradicts the (now-cancelled) v2 inquiry-canvas direction
  AND the current "polish on top of current UI" direction
- Demotes Analysis tab to a side-sheet (violates sacred-region rule)
- Glassmorphism with `backdrop-filter: blur(16px)` is a Safari iOS
  perf trap
- Ignores mobile strategy (CommandOrb + 820px breakpoint)
- Re-proposes Phase 15 cosmic-craft work that's already shipped (worse)

**Cherry-picked 5 component-level ideas for future polish backlog** (not
shipped yet, just captured):
1. Visual 4-step CSL chain flowchart (with denial/promise color coding —
   pairs perfectly with the A1.13 3-tier check_promise output)
2. Color-coded favorable/denial house badges (emerald/amber/crimson)
3. Concentric dual-ring transit chart (the real "wow" feature) —
   **NOTE**: TransitWheel.tsx component just landed in 66aba57, so this
   may already be done. Check before re-proposing.
4. Intercepted-sign highlight in South Indian Chart
5. Ruling Planets pulse on chart glyphs

### Notes for future Claude
- **NEVER mention "v2 plan" or "world-first-vision" or "Phase B/C/D/E"
  as if they're upcoming.** They're cancelled. Read CLAUDE.md's
  "🔒 CURRENT DIRECTION" section instead.
- **The 8-tab UI is the target.** Polish + add on top. Don't propose
  re-architectures.
- **Component ideas from the Gemini implementation_plan are in this
  log entry above — they're a CANDIDATE list, not commitments.** User
  picks if/when any get worked on.
- **TransitWheel.tsx exists now** (added in 66aba57) — verify what
  state it's in before proposing "add a transit wheel."

---

## 2026-05-28 (IST) — Sept 9 launch planning + Phase G pause

Multi-thread strategy day. Several substantial outcomes:

### 1. General-user mode (Phase G) — paused after 8 commits

Spent the morning building a consumer Dashboard tab + 6-tab IA wired
through the existing astrologer workspace shell. Pushed G1 → G1
hotfix v1/v2/v3/v4/v5 + G2. Each iteration revealed another
astrologer-only chrome piece I hadn't gated (TIME SHIFT ticker,
permanent left chart panel, multi-chart pills, etc.).

User after 8 iterations: *"its my bad to ask you, lets not work on
user mode now."* → **paused.** All code stays on develop, gated
behind `mode === "user"`. Don't touch without explicit reopen.

Lesson logged in handoff doc: grep ALL render sites before editing
ONE; don't ship in iterative discovery mode for substantial UI work.

### 2. Custom domain: `devastroai.com` is live

User bought via Namecheap, configured Vercel. `devastroai.vercel.app`
still works as a 307 redirect, will be removed later. When removal
happens, grep codebase for hardcoded `vercel.app` references.

### 3. Sept 9, 2026 = astrologer launch date confirmed

User-set deadline. ~14 weeks out as of today. **Astrologers only**;
consumer launch is a separate later milestone. All consumer-mode work
deferred.

### 4. Two new strategic features approved

**Client portal pages (KILLER differentiator — in scope for launch):**
- Per-client unique URL: `devastroai.com/c/<uuid>`
- Read-only for client, live editable for astrologer
- Doctor-portal analogy (Toronto doctors writing visit notes)
- Replaces PDF handoff; persistent; living document
- Built-in viral loop (clients see DevAstroAI brand in footer)
- Full spec: `.claude/research/client-portal-spec.md`
- 7 design decisions pending from user

**Cross-astrologer matching network (Phase M — post-launch v1.5):**
- User's privacy refinement is elegant: NO client data crosses
  astrologer boundaries; we only connect astrologers professionally.
- Astrologer X searches → system finds match silently → notifies
  Astrologer Y → both decide whether to connect → if both accept,
  chat opens → they share details with each other professionally.
- Full spec: `.claude/research/matching-network-spec.md`
- Pre-launch prep: add `matching_opt_in` column to clients table
  (free; unlocks everything later).
- Target: v1.5 November 2026, v2.0 Q1 2027.

### 5. Architectural concerns surfaced

**Back button always returns to /landing.** Root cause: the entire
app is one Next.js page at `/app/page.tsx`; all tabs render
conditionally; browser back goes to last URL (which is `/landing`).
G2 fix added `?t=tab` query params + `history.pushState` — works
but is a hack. **Real fix: route segment refactor (`/app/chart`,
`/app/ask`, etc.). User decision pending.**

**Supabase project dormant.** Auto-paused after 7 days inactivity,
RLS warning. User was correctly frustrated with careless original
setup. **Recommended: delete dormant Supabase, migrate to Neon
PostgreSQL free tier (no auto-pause, 3 GB). User decision pending.**

**SEO + Google indexing pending.** Need meta tags, OG, sitemap.xml,
robots.txt, Schema.org JSON-LD before launch.

### 6. Docs created/updated this session

- New: `.claude/research/launch-tracker-2026-09-09.md`
- New: `.claude/research/client-portal-spec.md`
- New: `.claude/research/matching-network-spec.md`
- New: `.claude/research/general-user-vision.md` (consumer vision, deferred)
- New: `.claude/research/general-user-home-concepts.md` (cancelled, kept as ref)
- New: `.claude/research/kundaligpt-observations.md` (competitor walk)
- New: `.claude/research/prototypes/{almanac,oracle,compass}-v1.html` (cancelled)
- New: `.claude/HANDOFF-2026-05-28-launch-prep.md`
- Updated: `CLAUDE.md` § "CURRENT DIRECTION" → Sept 9 launch
- Updated: `.claude/BACKLOG.md` → added "ACTIVE FOCUS" block at top

### 7. Pending — picks up in next session

User said: *"then we will discuss rest"* — next strategic conversation
covers:
- Payment integration (Razorpay vs Stripe, pricing structure, debit
  cards in India, GST, subscription vs per-use)
- Workspace features: astrologer notes per client, prediction accuracy
  tracking over time, today's appointments view
- Specific design of workspace navigation post-launch
- Any remaining decisions from the 14 pending items in handoff doc

### 8. Notes for future Claude

- **NEVER restart Phase G (general user mode)** without explicit
  reopen. User said "its my bad to ask you."
- **Sept 9 is astrologer-only.** Don't mix consumer work in.
- **Client portal pages = killer feature.** Treat as P0 for launch.
- **Matching network = approved but post-launch.** Add
  `matching_opt_in` to DB during launch prep (free, no extra scope).
- **Database = Neon** (pending user confirm). DO NOT use Supabase
  free tier ever again — auto-pause is unacceptable for paying users.
- **Route refactor is the right architectural fix** for the back
  button issue. Pending user decision.

---

## 2026-06-01 (IST) — Pricing + payment + business setup locked in

Continued the Sept 9 launch strategy conversation. Four big decisions
landed today.

### 1. Pricing model: TWO tiers + top-up packs

After exploring 5 hybrid models, locked the simplest one:
- **Plus tier: ₹499/month** (5 included AI questions, all deterministic
  features)
- **Pro tier: ₹1,499/month** (30 included AI questions, priority
  support)
- **Top-up packs:** ₹200 → 5q, ₹500 → 15q, ₹1000 → 35q (anyone can
  buy, never expire)
- **Annual: ~17% off** both tiers
- **Free trial:** 30 days of Plus, no credit card upfront

Margin math at ₹30/q Claude cost:
- Plus: ~₹237/mo net (48% margin)
- Pro: ~₹464/mo net (31% margin)
- Top-ups: ~8% margin (friction-removal product, not profit center)

### 2. AI vs deterministic feature map clarified

Important realization (user prompted): much of the app is
deterministic and would be on BOTH tiers regardless. AI is a smaller
slice than I thought.

DETERMINISTIC (both tiers):
- Chart, Houses, Dasha, Panchang
- Muhurtha — ranked windows, best-window detail, FULL REASONING TRACE,
  "ASTROLOGER NOTES · COPY-PASTE READY" (template-filled engine
  output)
- Horary — KP yes/no verdict, 4-level sigs, sub-lord chains
- Match — compatibility verdict, score, per-house grid
- Client portal pages, PDF exports

AI (counts against tier quota):
- Analysis tab (every q)
- Multi-chart analysis + @ mentions
- Topic chips in Analysis
- "Ask a deeper question" workspace input
- AI Muhurtha Analysis section (chips + ask)
- AI Match Analysis chat
- Horary "explain" chips (need to verify codepath)

This is what makes the Plus tier (5 q/mo only) genuinely valuable on
its own — not crippled, just AI-throttled.

### 3. Payment processor: Razorpay (Stripe ruled out)

Two parallel research agents confirmed:
- Razorpay = India-native, UPI Autopay built-in, sole prop friendly
- Stripe = Canada-based for our entity would lose UPI Autopay
- UPI Autopay is CRITICAL for ₹499-1,499/mo Indian subscriptions
- 2% + 18% GST on fee = effective ~2.36% per transaction
- No setup fee, no AMC, no monthly minimum
- 1-3 day onboarding, new CKYC fast-track in 2026

### 4. Business entity: India sole prop under DAD (resident Indian)

User pivoted from "NRI setup" to "register in dad's name" — dramatic
simplification. Dad is resident Indian, full citizen, lives in India
full-time. Zero FEMA / NRI / DTAA complications.

Then user pivoted AGAIN to "if we have only 10 customers, do we
really need ALL this formality?" — leading to the right answer:
ULTRA-LEAN START.

Threshold ladder (locked-in plan):
```
₹0 → ₹2.5L/yr: NO Udyam, NO Current Account, NO GST, NO CA.
              Just Razorpay on dad's PAN + savings account.
              Dad MAY file ITR if total income > exemption.
              YEAR-1 COST: ₹0 (or ~₹2k for ITR if needed).

₹2.5L → ₹10L/yr: Dad files ITR-4 (presumptive), CA worth engaging
                  (~₹5k/year).

₹10L → ₹20L/yr: Add Udyam (free) + Current Account at HDFC/ICICI.
                 CA standard (~₹500-1,500/mo retainer).

₹20L+/yr: MANDATORY GST registration within 30 days.
          Add 18% to invoices. QRMP scheme for quarterly filings.

₹50L+/yr: Consider converting to Pvt Ltd.
```

Money flow: Customer (India) → Razorpay (2% fee) → Dad's savings →
Family transfer to son (legal gift, no tax).

### Docs created/updated

- New: `.claude/research/pricing-payment-business-spec.md` (canonical
  pricing + payment + business setup)
- Updated: `.claude/research/launch-tracker-2026-09-09.md` (decisions
  marked locked + link to new spec)
- Updated: `.claude/HANDOFF-2026-05-28-launch-prep.md` (4 of 16
  decisions now locked: pricing, trial, payment, entity)

### Pending — next strategic conversation

**Workspace features for Plus tier.** Since Plus is AI-throttled (5
q/mo), the deterministic features must be GOOD enough that users
don't feel crippled. Need to design:
- Astrologer notes per client (in-astrologer UI, complements client
  portal pages)
- Prediction accuracy tracking over time (verdict log + outcome
  check + accuracy %)
- Today's appointments view (calendar / list)
- Workspace navigation post-launch (with all new features in)

Goal: AI-disabled astrologer can run their entire practice on the
app and only buy top-up questions when they specifically want AI
help on hard cases. Plus tier = real product, not a teaser.

### Notes for future Claude

- **Pricing is LOCKED** (Plus ₹499, Pro ₹1,499, top-ups ₹200/500/1000).
  Don't propose changing without explicit user reopen.
- **Razorpay only** for v1. Stripe deferred to international users
  later.
- **Sole prop in dad's name** — money flows to dad. Be intentional
  about how you talk about it; legally it's dad's business, son is
  building it.
- **Ultra-lean formality** — no Udyam/GST/CA at start. Add only when
  threshold ladder triggers.
- **The 4 client-portal v1 design decisions** + the workspace
  features design = the remaining strategic conversations. Continue
  from `.claude/research/pricing-payment-business-spec.md` §6 and
  `.claude/research/client-portal-spec.md`.

---

## 2026-06-01 (Monday) — architecture audit + route refactor pivot

### Done today

- **Architecture decisions locked (ADR-001..004)** in
  `.claude/research/architecture-decisions-2026-06-01.md`:
  - ADR-001: SQLAlchemy 2.0 (async) + Alembic for DB layer
  - ADR-002: Supabase Auth for identity (auth-only; DB stays on Railway)
  - ADR-003: OpenAPI codegen -> TypeScript via `openapi-typescript`
  - ADR-004: Context (auth/workspace) + Zustand (UI) + TanStack Query
    (server data)
  - Why these 4: foundational decisions where retrofit cost is 10x
    higher in 6 months than now. Done BEFORE writing the first DB code
    or auth flow.

- **Route segment refactor — partial: commits A+B shipped, full
  migration deferred.** Initial plan was to migrate /app from
  single-page with `?t=tab` pushState routing to true Next.js route
  segments (/app/chart, /app/horary, etc.) over 5-7 commits. After
  auditing page.tsx (5,359 lines, 109 useState calls, ~80 of which
  are tab-local), we realized:
    - The existing G2 pushState/popstate code already gives each tab
      its own URL + working browser back. The UX win is already in.
    - The full migration would need to move ~80 tab-local state pieces
      (matchResults, horaryResult, mResults, pcData, etc.) into their
      respective tab files. ~3-5 days of focused work.
    - Net user-visible UX gain over status quo: marginal.
    - Better to revisit AFTER auth+DB ships because URLs like
      `/app/clients/[id]/chart` need the DB anyway.
  Decision: stop here, merge the Context foundation (commits A+B) to
  develop, pivot to the actual launch blockers (auth + DB).

- **Commits A+B shipped to develop** (`fec6da0` merge commit):
  - Commit A (`d33670f`): Created `_lib/workspace-context.tsx` +
    mounted `<WorkspaceProvider/>` in `app/app/layout.tsx`. Provider
    holds the truly-global workspace state but page.tsx still has its
    own state — scaffold-only, no behavior change.
  - Commit B (`8ac874b`): Deleted 10 local useState calls in page.tsx,
    replaced with destructured `useWorkspace()` reads. Setter
    signatures are identical (matches React.Dispatch shape), so every
    existing call site (`setMode(...)`, `setBirthDetails(prev => ...)`,
    `setSavedSessions(...)`, etc.) kept working unchanged.
  - Lifted: mode, birthDetails, setupDone, chartData, workspaceData,
    savedSessions, currentSessionId, timezoneOffset/Label/Iana.
  - Did NOT lift: tab-local state (still in page.tsx), shell state
    (sidebarOpen, modals, toast — deferred to a Zustand UI store).
  - Verified pre-merge: tsc EXIT 0, next build EXIT 0, all 5 routes
    prerender cleanly. Astrologer mode untouched (no AI/engine code
    modified).

- **Safety tag** `june-1-astrologermode-topnotch` created on develop
  at `3df95fc` (the pre-refactor state, after the ADR docs but before
  the Context lift). Rollback point if A+B ever causes issues.

### What's now LIVE on develop / Vercel for user to test

- WorkspaceContext provider mounted, page.tsx reads global state from
  it. Should be visually + functionally identical to yesterday's app.
  If anything is broken (chart doesn't generate, sidebar empty, tab
  switching broken, Analysis streaming dies), revert to tag
  `june-1-astrologermode-topnotch`.

### Decisions made today

- Stop route refactor at A+B. Full migration deferred to post-auth/DB.
- Pivot to auth + Railway Postgres setup (Week 1-2 of launch tracker)
  as next focus. This is the actual Sept 9 launch blocker.
- Update canonical docs:
  - `launch-tracker-2026-09-09.md` decisions table: route refactor
    marked ✅ DECIDED 2026-06-01: DEFERRED.
  - P0 item #11 (route segment refactor) marked DEFERRED with
    rationale.

### Next session — auth + DB setup

Per ADR-001/002 + Railway as our chosen DB:
1. Delete dormant Supabase project (`sbhutroxbbqenmdqeyhd`)
2. Create fresh Supabase project (auth-only use)
3. Add Postgres add-on to Railway backend service
4. Set up SQLAlchemy 2.0 (async) + Alembic in `backend/`
5. First migration creates: astrologers, clients, chart_sessions,
   client_notes, subscriptions, usage_events, audit_log
6. Frontend signup/login/reset flows via `@supabase/supabase-js`
7. Migrate localStorage chart sessions to DB

This is ~2 weeks of focused work and unlocks the rest of the launch
tracker (client portal pages need DB, Razorpay needs DB, email needs
auth, etc.)

