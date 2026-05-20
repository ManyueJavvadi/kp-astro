# DevAstroAI — v2 Roadmap & Refactor Plan

**Date**: 2026-05-20
**Author**: Claude
**Status**: PLANNING ONLY — no code changes shipped yet. User to prioritize before any PRs.

This doc covers four things you asked about:
1. Refactor strategy for `page.tsx` (now 8,589 lines, not 6K)
2. General user vs KP astrologer dashboard differentiation
3. Innovative UI revamp for post-entry experience
4. Code audit findings (loopholes / gaps / bugs)

At the end is a **recommended PR sequence** with effort estimates so you can pick what ships first.

---

## 1. Current State Diagnosis

### `page.tsx` is now 8,589 lines (worse than you remember)

Last estimate was 6K; it's grown ~40% since. Tab block boundaries (verified via grep):

| Tab | Line range | Approx lines |
|---|---|---|
| Setup/Onboarding | 1–2472 | 2,472 |
| Chart | 2473–2580 | 108 |
| Houses | 2581–2975 | 395 |
| Dasha | 2976–3549 | 574 |
| Panchang | 3550–4505 | 956 |
| Muhurtha | 4506–5733 | 1,228 |
| Match | 5734–7206 | 1,473 |
| Horary | 7207–8061 | 855 |
| Analysis | 8062–end | ~528 |

**The single file holds eight different ~mini-apps stitched together.** This is the biggest engineering debt in the codebase.

### Existing extracted components (good — shows pattern works)

The team has been extracting components piecemeal:
- `CommandOrb` (mobile nav, 496 lines)
- `RasiChart` / `SouthIndianChart` / `HousePanel` (chart visualizations)
- `DashaTimeline` / `PanchangamCard` / `TaraChakraWidget`
- Five `Horary*` components (already a good extraction pattern)
- `LiveLocationPill`, `RPContextStrip`, `PromiseBadge`, `ClinicalFlagsStrip`

**The pattern works**. Need to apply it to the big tab blocks systematically.

### v2 vision (from `v2-phase0-design` worktree)

The v2 worktree shows a partially-built multi-role architecture with:

**`/pro` — KP astrologer dashboard** (28K-line page.tsx with proper hook-based architecture):
- `useMe()` — current user
- `useClientsList()` — CRM clients
- `useAccuracySummary()` — prediction tracking
- `useFollowupsList()` / `useUpdateFollowup()` — follow-up workflow
- `useSessionsList()` — chart sessions

**`/pro/clients/[id]`** — individual client view (CRM detail page)
**`/pro/settings`** — user preferences
**`/pro/tools/{horary,match,muhurtha,panchang,transit}`** — standalone tools

**`/app`** — general consumer (32K-line page.tsx)
**`/login`, `/signup`, `/auth`** — Supabase auth flow

So the original v2 plan was: **role-based routing with separate /pro and /app surfaces, Supabase auth, CRM for astrologers**. Per CLAUDE.md memory note: "Supabase + auth + CRM shipped, Muhurtha/Match/Transit native UI + consumer /app remain."

The eager-elbakyan branch (current production) **did not adopt v2 routing** — instead it kept a single `/app` page with a role toggle at setup time. This was a simplification, but lost the multi-page architecture that would have made refactoring easier.

---

## 2. `page.tsx` Refactor Plan

### Strategy: tab-by-tab component extraction

Each tab block is already gated by `activeTab === "X"` — clean extraction boundaries. The refactor pattern:

```tsx
// BEFORE (page.tsx)
{activeTab === "chart" && (
  // 108 lines of chart JSX inline
)}

// AFTER
{activeTab === "chart" && (
  <ChartTab
    workspaceData={workspaceData}
    birthDetails={birthDetails}
    lang={lang}
    onAction={handleX}
  />
)}
```

### Proposed file structure

```
frontend/app/app/
├── page.tsx                           ← shrinks from 8,589 → ~800 lines
│                                        (setup, state mgmt, tab router only)
├── tabs/                              ← NEW directory
│   ├── ChartTab.tsx                  ~110 lines
│   ├── HousesTab.tsx                 ~400 lines
│   ├── DashaTab.tsx                  ~580 lines
│   ├── PanchangTab.tsx               ~960 lines  ← still big, may need sub-extraction
│   ├── MuhurthaTab.tsx               ~1230 lines ← still big, sub-extract
│   ├── MatchTab.tsx                  ~1480 lines ← biggest, sub-extract
│   ├── HoraryTab.tsx                 ~860 lines
│   └── AnalysisTab.tsx               ~530 lines
├── hooks/                             ← NEW shared hooks
│   ├── useWorkspace.ts               ← extract chart-data fetching
│   ├── useAnalysisChat.ts            ← AI chat state for Analysis tab
│   ├── useMatchChat.ts               ← AI chat state for Match tab
│   └── useHoraryQuery.ts             ← horary state
├── lib/                               ← already exists
│   ├── maskedInput.ts
│   └── (new) tabsConfig.ts           ← centralize tab definitions
└── components/                        ← already exists (keep extracting here)
```

### Sub-extraction within big tabs

**MatchTab (1,480 lines)** — biggest single block. Sub-extract:
- `MatchSetup.tsx` (person picker, form)
- `MatchVerdictHero.tsx` (verdict card with avatars + score)
- `MatchSubTabs.tsx` (sub-tab router)
- `MatchOverallPane.tsx` (Why verdict + Vargottama + Koots + Ashtakoota)
- `MatchKPPane.tsx` (Promise + Canonical Match + 5-signal + Significators)
- `MatchTimingPane.tsx` (DBA + D9 + Upcoming Windows)
- `MatchRisksPane.tsx` (Kuja, Moon, Separation, Indifference)
- `MatchAIPane.tsx` (AI chat for match)

**MuhurthaTab (1,230 lines)** — sub-extract:
- `MuhurthaSetup.tsx`
- `MuhurthaResults.tsx`
- `MuhurthaCalendarView.tsx`

**PanchangTab (956 lines)** — sub-extract:
- `PanchangDate.tsx`
- `PanchangSubElements.tsx` (tithi, nakshatra, yoga, karana, hora)
- `PanchangChoghadiya.tsx`

### Refactor as PRs (incremental, low-risk)

**PR R1 — Setup phase**: Create `tabs/` directory + `hooks/`, extract one easy tab (ChartTab — only 108 lines) as proof-of-pattern. Verify `tsc --noEmit` clean, no behavior change.

**PR R2 — Easy tabs**: Extract HousesTab + DashaTab + AnalysisTab (medium size, well-bounded).

**PR R3 — Mid tabs**: Extract HoraryTab + PanchangTab (still single-file each, no sub-extraction).

**PR R4 — Big tabs phase 1**: Extract MuhurthaTab + MatchTab as single files (still ~1,200–1,500 lines each but in separate files).

**PR R5 — MatchTab sub-extraction**: Break MatchTab into 8 sub-components (the sub-tab structure already supports this — clean boundaries).

**PR R6 — MuhurthaTab sub-extraction**.

**PR R7 — Hook extraction**: Pull shared state into hooks (useWorkspace, useAnalysisChat, useMatchChat).

Result: `page.tsx` ends ~700–900 lines, biggest tab file ~400 lines, every component testable in isolation.

**Effort**: 7 PRs, ~2–3 days of work total if uninterrupted. Each PR is mechanical (cut/paste with prop wiring), low risk, easy to review.

**Win**: After refactor, adding a new feature to a tab doesn't require scrolling through 8K lines. Component-level testing becomes possible. Visual diffs in PRs become readable.

---

## 3. General User vs KP Astrologer Dashboard

### Current state

Both roles see the SAME 8 tabs. Setup flow asks "I am a: General user / KP astrologer" but the post-setup experience is mostly identical. The only differences:
- Astrologer mode shows the workspace-sidebar with saved sessions
- Some UI affordances change (e.g., Analysis tab tone)

This is **product-architecture debt**. A general user doesn't need Horary (it's astrologer-specialist), doesn't need most of the Muhurtha depth, and doesn't need the KP-technical jargon in Analysis. An astrologer needs CRM, client notes, accuracy tracking — none of which exists.

### Recommended split

**General User (consumer) — `/app/me`**:

Tabs (4 instead of 8):
1. **My Chart** — chart + 12 houses summary, plain-English explanations
2. **My Life** — Analysis tab simplified, ask AI questions in natural language
3. **Today** — Panchang + transits relevant to me (auto-personalized, no KP jargon)
4. **My Future** — Dasha timeline + life-area predictions (love, career, money, health)

Key principles:
- Zero KP jargon visible by default (toggle in settings for advanced)
- Predictions in narrative form, not tables
- Mobile-first (consumer use)
- Free tier with optional premium for deeper analysis

**KP Astrologer (pro) — `/app/pro`**:

Tabs (8 + 3 NEW):
1. Dashboard (NEW) — today's clients, follow-ups, alerts
2. My Clients (NEW) — CRM list, search, add new client
3. Active Client — selected client's chart + all 8 analysis tabs (current Chart/Houses/Dasha/Panchang/Muhurtha/Match/Horary/Analysis)
4. Tools (NEW) — quick standalone tools (horary without saving a client, muhurtha lookup)
5. Knowledge Base (NEW) — readable KP rules reference, search the same KB the AI uses
6. Settings (NEW) — preferences, export, PDF templates

Key principles:
- Full KP technical depth visible
- CRM-first workflow: open a client → see their dashboard → drill into analysis tab
- PDF export per client
- Accuracy tracking ("you predicted X for client Y in March, was it correct?")

### Phased migration

**Phase 1 — Add role-based routing (no UI changes yet)**:
- Route `/app/me` → consumer experience
- Route `/app/pro` → astrologer experience
- Both initially render the same content, but the route boundary is set
- Setup writes role into localStorage and routes accordingly

**Phase 2 — Differentiate astrologer dashboard**:
- Build `/app/pro` landing as a dashboard (today's clients, follow-ups, alerts)
- "Active client" concept — sidebar shows clients, click to load their chart
- Implement My Clients CRM (search, add, archive)
- Use the v2-phase0-design Pro page as reference (already has `useClientsList`, `useFollowupsList` hooks designed)

**Phase 3 — Simplify consumer experience**:
- Build `/app/me` as a 4-tab simplified view
- Hide KP jargon by default
- Auto-personalize Today + My Future
- Mobile-optimized hero feel

**Phase 4 — Pro-only features**:
- Knowledge Base browser (read-only access to backend/knowledge/*)
- Accuracy tracking (link predictions to events, record outcomes)
- Bulk PDF export
- Custom report templates

### Backend implications

Most backend already supports this — the engines are stateless and the API is JSON-in/JSON-out. What needs to be added:
- **Supabase auth** (already partially designed in v2 worktree)
- **Clients table** (CRM data per astrologer)
- **Predictions table** (link AI outputs to client + topic + date for accuracy tracking)
- **Followups table** (astrologer's TODO list per client)
- **Sessions table** (saved chart sessions per user)

All of these are designed in v2-phase0-design. Worth porting that schema instead of redesigning.

---

## 4. Innovative UI Revamp for Post-Entry Experience

### Current model: tab-based, 8 equal tabs

```
[Chart] [Houses] [Dasha] [Panchang] [Muhurtha] [Match] [Horary] [Analysis]
```

Problems:
- 8 equal tabs = nothing feels prioritized
- Astrologer landing on "Chart" first time has no narrative entry point
- No "today's situation" overview
- Match and Muhurtha are workflow-heavy but compete with quick-glance tabs (Chart, Panchang)

### Proposed model: 3-zone dashboard

**Zone A — Always-visible top bar (sticky, ~40px):**
- Current time + location + day lord + Hora
- Current MD/AD/PAD chips
- Live transit alerts (Sade Sati starting, Rahu changing sign, etc.)

**Zone B — Hero workspace (the main canvas):**

Default view = **"Today" lens** — auto-aggregated view of:
- Today's panchangam (tithi, nakshatra, yoga, karana)
- Today's Ruling Planets
- Today's dasha activations
- Notable transits hitting native's houses
- Anything urgent (current Rahu Kalam, today's choghadiya for important hours)

User can switch the hero lens by clicking a left-rail icon:
- 🕰 Today (default)
- ⭐ My Chart (the static chart visualization)
- 🏠 Houses (drill-down view)
- 🌙 Dasha (timeline)
- 📅 Panchang (full daily)
- ⏰ Muhurtha (workflow)
- 💑 Match (workflow)
- ❓ Horary (workflow)
- 🤖 AI Chat (always-available sidebar)

**Zone C — Right rail (sticky, ~360px):**
- AI Chat (always there, no need to switch to "Analysis" tab)
- Recent questions / pinned insights
- "What changed today" — daily delta summary

### Why this is better

| Current model | Proposed model |
|---|---|
| 8 equal tabs, decide which to click | "Today" greets you with what matters now |
| AI chat is one of 8 destinations | AI chat is always-on in right rail |
| Mobile orb opens a sheet to switch tabs | Mobile keeps the orb but adds quick-actions for top 3 daily needs |
| New user lands on "Chart" with no story | New user lands on "Today" with their day already laid out |

### Innovation ideas (research-backed)

**1. Adaptive "first visible" content per role**
- Consumer: "Today's mood/luck" card + one daily question prompt
- Astrologer: "Today's client load" + "Pending follow-ups" + "Sigs that matter today"

**2. Time-aware widgets**
Like Apple Watch complications — small live widgets on the dashboard:
- "Next Rahu Kalam: 13:24 (4 hours)"
- "Moon enters Cancer in 6h 12m"
- "Your Sade Sati window opens July 2027"

**3. AI "Daily Brief"**
Each morning the AI generates a 3-bullet brief based on the user's chart + today's planetary positions. Personalized. Less than 60 words. Read in 15 seconds.

**4. Cross-tab linking**
Right now if user sees something interesting in Chart (e.g., "H7 is in Cancer"), they need to navigate to a separate place to learn more. Make every chart element clickable — click "H7" → side panel slides in with H7 explanation + significators + current AD effect on H7.

**5. "Compare with friend" quick action**
Match tab is heavy because it's a full screen experience. Add a quick "+ compare" button to the always-visible top bar. Adds another person without leaving current context.

**6. Voice input for AI chat**
Especially mobile. Speak your question in Telugu/English/mixed → text appears → AI responds. Lower friction than typing on mobile.

**7. Chart "annotations"**
Astrologer mode: select any planet, add a note. "Saturn in H10 — confirmed promotion in Mar 2027 for client X." Build up a personal knowledge layer over time.

**8. Notification system**
- "Your current AD is changing in 18 days — review your active predictions"
- "Jupiter transits H10 next week — high-leverage period"
- Email/push opt-in

**9. Dark/light mode toggle**
Currently dark-only. Some astrologers prefer light for PDF readability. Add toggle.

**10. Print/Export at every level**
Not just full PDF. "Print this chart only", "export this match analysis", "share this AI response". Build sharing into the fabric of the app.

---

## 5. Code Audit Findings — Gaps, Loopholes, Bugs

I scanned the codebase. Findings categorized by severity:

### Critical (verdict-distorting, ship soon)

None found beyond what we've already addressed in PR A1.7–A1.11.

### High (engineering hygiene, affects future velocity)

**H1. `page.tsx` size (8,589 lines)** — covered in §2. Biggest debt.

**H2. No automated tests anywhere**
- Zero pytest tests for backend engines
- Zero Vitest/Jest tests for frontend
- We rely entirely on manual verification + user-reported bugs
- This is genuinely risky as the engine logic grows complex
- Recommendation: pytest harness for compatibility_engine + chart_engine FIRST (those have the most KP logic)

**H3. No prompt-versioning**
- System prompt has been modified ~10 times in past month (PR A1.4 → A1.11)
- Each change can subtly shift verdicts across all topics
- No regression suite to verify "after this prompt change, charts X/Y/Z still give same answer"
- Recommendation: snapshot 5-10 hand-curated chart+question pairs, store expected AI output shape (not exact text but key claims), run as part of CI

**H4. No structured logging in production**
- Errors land in Railway logs but no centralized log aggregation
- No distinction between "user error" vs "engine bug" vs "Anthropic API failure"
- Recommendation: structured logging with severity + topic + endpoint + user_id (anonymized)

**H5. No uptime monitoring**
- The May 19 Railway outage was discovered by user manual testing
- UptimeRobot or BetterStack free tier would have alerted in 5 min
- Recommendation: ship a `/health` endpoint that checks (a) ephemeris files loaded, (b) Anthropic API reachable, (c) basic chart computation succeeds. Monitor it.

### Medium (UX or correctness, not blocking)

**M1. CORS error message is misleading to users**
- When backend is down, frontend says "Could not generate chart. Please check your connection."
- This is wrong — user's connection is fine, the backend is down
- Recommendation: have frontend check `/health` first; if backend is down, show "Service temporarily unavailable" with status page link

**M2. localStorage cleanup is incomplete**
- We removed devastroai:lastSnapshot, devastroai:savedSessions, devastroai:mode in PR25
- But there are stale keys from earlier phases that may still exist (devastroai:experimentalMatchHouse2, kp_orb_position_v1 from older versions)
- Recommendation: bump a localStorage schema version and clear old keys once

**M3. No graceful degradation if Anthropic API is rate-limited**
- If Anthropic returns 429, the user sees a generic error
- No retry-with-backoff
- No queueing
- Recommendation: implement exponential backoff in `llm_service.py` for 429 errors

**M4. Telugu typography breaks on some chart elements**
- Tested at Phase 16. Some places still render Telugu in default font.
- Recommendation: audit all user-facing strings, ensure they go through `t(en, te)`

**M5. PDF generation is synchronous and slow**
- 14-section PDF can take 8-15s to generate
- User sees blocking spinner
- Recommendation: move to background job (Railway worker dyno?) + email link when ready

**M6. Mobile keyboard covers input on iOS**
- When typing in the AI chat input on iOS, keyboard covers the field
- Recommendation: scroll-to-input on focus, or use position:sticky with viewport-aware padding

**M7. No "are you sure?" before destructive actions**
- Deleting a saved chart session deletes immediately
- Recommendation: confirmation modal

**M8. Date-of-birth input has no validation for impossible dates**
- Entering 31/02/2000 accepts the input
- Recommendation: validate after both fields filled

### Low (polish)

**L1.** Color contrast — some muted text against dark bg fails WCAG AA in spots
**L2.** No keyboard shortcuts — pro users would benefit from Cmd+K command palette
**L3.** Hero animations replay on every tab switch (subtle, could be cached)
**L4.** Sidebar workspace search doesn't fuzzy-match
**L5.** No offline indicator
**L6.** No "what's new" changelog visible to users

### Architectural opportunities (not bugs, future)

**A1. Backend monolith → engines as services**
- All engines run in one FastAPI process
- For scale, split into per-engine microservices (chart_service, llm_service, pdf_service)
- Not urgent at current traffic

**A2. Frontend state management library**
- Currently using useState + Context for everything
- As features grow, consider Zustand or Jotai
- Don't add until you feel the pain — premature optimization risk

**A3. tRPC or GraphQL?**
- REST is fine. Don't change unless there's a reason.

**A4. Database integration**
- No database currently (chart data is computed live, not stored)
- For multi-device users + CRM + accuracy tracking → Supabase Postgres
- Already designed in v2 worktree, just needs porting

**A5. Real auth (not just localStorage)**
- Currently any user can use the app anonymously
- For paid tiers + CRM + multi-device → need real auth
- Supabase Auth is the pragmatic choice

---

## 6. Recommended PR Sequence

Picking the order matters. Some PRs unlock others, some are quick wins, some are big bets.

### Tier 1 — Foundation (do first)

**PR F1 — Pytest harness + 4 golden test fixtures** (1 day)
- Set up pytest in `backend/`
- 4 fixtures: Manyue (married), Ramya (in love), Vineetha (single), Sreeja (poor compat)
- Test the marriage Match endpoint returns consistent verdict shape
- Test the chart endpoint returns same planetary positions for same input
- **Why first**: prevents future regressions, lets us refactor with confidence

**PR F2 — `/health` endpoint + UptimeRobot wiring** (2 hours)
- Backend `/health` returns 200 if (ephemeris loaded + Anthropic reachable + cache responsive)
- Frontend checks `/health` before chart generation; shows proper error message if down
- Set up UptimeRobot to ping every 5 min
- **Why early**: lets you sleep at night, fixes the May 19 outage UX

### Tier 2 — Refactor (do after Tier 1)

**PR R1 — Tabs scaffolding + extract ChartTab** (4 hours)
**PR R2 — Extract HousesTab + DashaTab + AnalysisTab** (1 day)
**PR R3 — Extract HoraryTab + PanchangTab** (1 day)
**PR R4 — Extract MuhurthaTab + MatchTab as single files** (1 day)
**PR R5 — Sub-extract MatchTab into 8 sub-pane components** (1 day)
**PR R6 — Sub-extract MuhurthaTab + PanchangTab** (1 day)
**PR R7 — Hook extraction (useWorkspace, useAnalysisChat, useMatchChat)** (1 day)

**Total**: 7 days of refactor work, results in `page.tsx` at ~800 lines, every tab in its own file, hooks extracted.

### Tier 3 — Role-based dashboards (the bigger product move)

**PR D1 — Role-based routing scaffolding** (1 day)
- `/app/me` for consumer, `/app/pro` for astrologer
- Setup writes role to localStorage and routes
- Both initially render existing experience (no UI changes yet)

**PR D2 — Supabase auth + sessions table** (2 days)
- Port from v2-phase0-design worktree
- Real login/signup with email + Google OAuth
- Session persistence cross-device

**PR D3 — Astrologer Dashboard hero** (2 days)
- `/app/pro` becomes a real dashboard (today's clients, follow-ups, alerts)
- Use v2 worktree as reference

**PR D4 — Clients CRM** (3 days)
- `/app/pro/clients` list + search + add
- `/app/pro/clients/[id]` detail view with chart + analysis tabs scoped to that client
- Notes feature per client

**PR D5 — Consumer simplified view** (2 days)
- `/app/me` becomes 4-tab simplified experience
- Hide KP jargon by default
- Mobile-first

**PR D6 — Pro tools page** (1 day)
- `/app/pro/tools/{horary,muhurtha,panchang,transit}` for standalone use
- Same engines, lighter wrapper UI

### Tier 4 — Innovation (after foundation)

**PR I1 — "Today" lens as default landing** (2 days)
- Aggregated daily view (panchang + transits + dasha activations)
- Both /me and /pro land here by default

**PR I2 — Always-on AI right rail** (2 days)
- Replace "Analysis" tab with persistent chat sidebar
- Keep tabs for everything else
- AI chat is always accessible without switching context

**PR I3 — Time-aware widgets** (2 days)
- Next Rahu Kalam countdown
- Moon sign change countdown
- Sade Sati / current AD end date

**PR I4 — Daily AI brief** (2 days)
- Morning auto-generated 3-bullet brief per user
- Cached per day per chart
- Email opt-in for daily delivery

**PR I5 — Cross-tab linking + clickable chart elements** (3 days)
- Click any planet/house in Chart → side panel with depth
- Click "H7" in any text anywhere → same panel
- Eliminates "I need to navigate to find this"

**PR I6 — Voice input for AI chat** (2 days)
- Browser Web Speech API (free, no backend cost)
- Telugu + English + mixed support

**PR I7 — Chart annotations (pro only)** (2 days)
- Add notes to any planet/house/AD
- Persistent per client (requires Supabase)

**PR I8 — Notifications system** (3 days)
- In-app notification center
- Optional email/push for major events

### Tier 5 — Polish (do whenever)

**Audit findings M1–M8 + L1–L6** — small individual PRs, each 1-4 hours.

---

## 7. My Honest Recommendations

Given context (you have an interview ongoing, real users testing, recent stability concerns), here's my prioritized take:

### Immediate (this week)

1. **PR F2 — /health + UptimeRobot** — 2 hours, sleep-better return
2. **PR F1 — Pytest harness** — 1 day, prevents future regressions

### Next 2 weeks

3. **Refactor PRs R1–R3** — extract simpler tabs first, get the pattern locked in
4. **PR D1 — Role-based routing scaffolding** — gets the architecture right before more UI changes

### Next month

5. **Refactor R4–R7** — finish the modularization
6. **PR D2 — Supabase auth** — unblocks all multi-device + CRM features
7. **PR I1 — "Today" lens** — biggest single UX win, gives the app a "narrative entry point"

### Next quarter (after foundation is solid)

8. Full astrologer dashboard (D3–D6)
9. Consumer simplified view
10. Innovation PRs (I2–I8) as appetite allows

### What I would NOT do right now

- Don't try to ship the entire v2 vision in one go — it failed before, will fail again
- Don't migrate to a different framework (Next.js + FastAPI is fine)
- Don't add a database before Supabase auth is in (chicken-and-egg)
- Don't refactor + add features simultaneously (refactor first, then build)
- Don't touch the AI prompt during refactor weeks (the prompt is now in a good place)

---

## 8. Next Step for You

Pick from these options, tell me, and I'll execute:

**Option A — Stability first**
> "Ship PR F1 + F2 (pytest + health endpoint) this week. Then we'll talk about refactor."

**Option B — Refactor first**
> "Ship R1 (scaffolding + ChartTab extraction) as proof, then continue to R2/R3 if it goes well."

**Option C — Product first**
> "I want to see the 'Today' lens concept (PR I1) before deciding on refactor. Build a prototype."

**Option D — Dashboards first**
> "Start D1 (role-based routing) since the v2 vision needs this anyway. We'll refactor opportunistically as we go."

**Option E — Multi-track**
> "Ship F2 (/health) today since it's quick. Start R1 (refactor scaffolding) in parallel. Plan D1 for next week."

**Option F — Something else you have in mind** — just tell me.

I'll wait for your call. No code changes until you decide. The plan above is the entirety of what I think is worth doing over the next 1–3 months — pick the slice that matches your bandwidth and goals.

---

*Doc author: Claude. Date: 2026-05-20.
 Status: planning only. Awaiting user prioritization.*
