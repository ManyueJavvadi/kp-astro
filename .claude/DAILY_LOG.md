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
