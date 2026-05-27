# KP Audit Notes and User Mode Architecture

Date: 2026-05-26
Branch context: develop
Purpose: future working notes for Codex/AI agents before designing or changing General Public User Mode.

## Current Goal

Build a premium General Public Mode for a strict KP astrology product without disturbing:

- Existing backend calculation accuracy.
- Existing Astrologer Mode workflows.
- Existing professional astrologer UI/data density.

The public mode should reuse the accurate astrologer backend wherever possible, but present results through simpler, trust-building, consumer-grade flows.

## High-Level Audit Verdict

The backend foundation is strong. The project already uses the correct KP pillars:

- Swiss Ephemeris.
- KP/Krishnamurti ayanamsa via `swe.SIDM_KRISHNAMURTI_VP291`.
- Placidus house cusps.
- Mean Node for Rahu.
- Ketu derived opposite Rahu.
- Vimshottari-based star/sub-lord division.
- Four-level KP significator hierarchy.
- Cuspal sub-lord promise checks.
- Dasha/Antardasha/Pratyantardasha/Sookshma timing layers.
- Ruling Planets.
- KP 1-249 horary table.
- Panchang and Muhurtha scanning.
- Relationship compatibility engines.
- LLM explanation layer with KP knowledge base.

Do not rewrite the backend just to build public mode. The better strategy is an isolation layer: create public-facing adapters/DTOs/endpoints that call the existing engines, then reshape the output for consumer UI.

## External Reference Cross-Checks

Useful references checked during audit:

- Swiss Ephemeris documentation: confirms Krishnamurti ayanamshas, including Krishnamurti/Senthilathiban based on zero ayanamsa year 291.
- AstroSage KP overview: confirms sub-lords are Vimshottari-proportional and Placidus is used in KP.
- Dekho Panchang KP overview: confirms KP emphasis on Placidus, sub-lord, four-level significators, and ruling planets.
- JyotishPortal KP 1-249 table: confirms public table source for KP horary numbering.
- Drik Panchang: confirms Panchang elements, sunrise-locality dependency, Rahu Kalam, Bhadra/Vishti, Abhijit, Panchaka, Tarabalam/Chandrabalam style public presentation.

Use web references again if making a public documentation/marketing claim. For implementation decisions, prefer deterministic backend outputs and repository-local tests.

## Important Backend Files

Core KP calculation:

- `backend/app/services/chart_engine.py`
- `backend/app/services/kp_advanced_compute.py`
- `backend/app/services/chart_pipeline.py`
- `backend/app/services/csl_chains.py`
- `backend/app/services/kp_transit_compute.py`
- `backend/app/services/kp_yogini_dasha.py`

Public feature engines:

- `backend/app/services/compatibility_engine.py`
- `backend/app/services/horary_engine.py`
- `backend/app/services/muhurtha_engine.py`
- `backend/app/services/panchangam.py` or panchang-related route/service files
- `backend/app/services/llm_service.py`

KP knowledge:

- `backend/knowledge/*.txt`
- `backend/knowledge/*.md`
- `backend/app/kp_knowledge/horary.md`
- `backend/app/kp_knowledge/muhurtha.md`
- `backend/app/kp_knowledge/panchang.md`

Frontend public namespace:

- `frontend/app/app/components/UserModeUI/`

Astrologer mode should remain isolated and untouched unless the user explicitly asks.

## Key Accuracy Risks Found

### 1. Ruling Planet Model Drift

Observed:

- `chart_engine.get_ruling_planets()` emits a 7-slot model:
  - Day Lord
  - Asc Sign Lord
  - Asc Star Lord
  - Asc Sub Lord
  - Moon Sign Lord
  - Moon Star Lord
  - Moon Sub Lord
- `backend/knowledge/timing_confirmation.txt` describes a 6-RP model including Hora Lord.
- `backend/knowledge/kp_ruling_planets_deep.md` describes original 5 RPs plus extended 7 RPs.
- `muhurtha_engine.py` separately computes Hora Lord and uses it in scoring.

Risk:

- The LLM can mix multiple RP traditions and explain a result differently from the engine.

Recommendation:

- Create canonical RP policy:
  - Natal/public predictions: 7-slot RP model from engine.
  - Muhurtha: event-time RP plus Hora where engine returns it.
  - Horary: 7-slot RP unless explicitly changed.
- Expose `ruling_planets_5`, `ruling_planets_7`, and `hora_lord` separately if both are needed.
- Do not claim Hora-based timing unless Hora is actually computed and returned for that flow.

### 2. "Any One Relevant House" Is Too Broad

Observed:

- `llm_service.get_system_prompt()` contains broad "ANY ONE relevant house = PROMISED" language.
- Several KB files correctly require house combinations:
  - Foreign settlement: H3 + H9 + H12.
  - Higher education: H4 + H9 + H11.
  - Children: H2 + H5 + H11.
  - Litigation win: H6 + H11.
  - Job materialization often requires H2 + H6 + H10 + H11.
  - Business success can require H7 + H10 + H11 plus money flow houses.

Risk:

- Public verdicts may become over-positive if one supporting house is treated as enough for complex topics.

Recommendation:

- Add a deterministic rule matrix, not prompt-only prose:
  - `topic`
  - `primary_cusp`
  - `relevant_houses`
  - `denial_houses`
  - `threshold_mode`: `any`, `all`, `minimum_combo`, `primary_plus_support`
  - `required_groups`
  - `sensitivity_tier`
  - `consumer_claim_level`

### 3. Horary Knowledge Table Drift

Observed:

- `backend/app/kp_knowledge/horary.md` has a topic-house table that differs from `TOPIC_HOUSE_MAP_CANONICAL` in `chart_engine.py`.
- Example drift:
  - Marriage in horary doc: H2, H5, H7, H11.
  - Canonical natal marriage: H2, H7, H11.
  - Property and finance also differ.

Risk:

- The horary engine may compute one house set while the AI explains another.

Recommendation:

- Either document horary-specific deltas explicitly or generate horary docs from the same canonical rule matrix.
- Add regression tests: each horary topic should declare which house rule source it uses.

### 4. Rahu/Ketu Proxy Handling Is Uneven

Observed:

- `chart_engine.get_significators()` calculates `rahu_ketu_info`, but the proxy-derived houses are not merged into `all_significators`.
- `kp_advanced_compute.compute_star_sub_harmony()` handles node proxy logic more explicitly.

Risk:

- Basic promise/dasha helpers can undercount Rahu/Ketu and disagree with advanced evidence.

Recommendation:

- For public UI, trust advanced/workspace evidence over the simpler helper.
- Later backend fix: add a normalized node-proxy significator expansion used by all engines.

### 5. Dasha Precision Is Date-Level

Observed:

- Dasha boundaries are formatted as `YYYY-MM-DD`.
- Calculations use 365.25 days per year.
- This is fine for broad timelines but not exact event hour/day precision.

Risk:

- Public UI could overclaim "exact timing" when backend only supports date-level dasha boundaries.

Recommendation:

- Public copy should say "favorable period", "stronger window", "timing support", not guaranteed exact date.
- If exact-date products are planned, preserve timezone-aware datetime boundaries and add tests around boundary transitions.

### 6. Muhurtha Engine Is Strong But Needs Capability Matrix

Observed implemented in `muhurtha_engine.py`:

- 4-minute scanning.
- KP Lagna sub-lord event-house scoring.
- Event denial house hard filters.
- Panchang factors: Tithi, Nakshatra class, Yoga, Vara, Karana/Vishti.
- Rahu Kalam, Yamagandam, Gulika, Durmuhurtha.
- Abhijit Muhurtha.
- Hora Lord scoring.
- Janma Tara and Chandrashtamam participant filters.
- Badhaka/Maraka.
- Event cusp CSL, H11 CSL, Moon star-lord checks.
- Venus/Jupiter combustion for marriage.
- Solar-month marriage rule.
- Kartari and Ekargala soft penalties.

Risk:

- `muhurtha.md` knows more rules than the engine may return. Public UI must not show a check as "passed" unless the engine returns that field.

Recommendation:

- Build a Muhurtha capability map:
  - returned field
  - rule name
  - hard/soft
  - UI badge label
  - explanation template

### 7. LLM Should Explain, Not Decide

Observed:

- User mode routes can use cheaper/leaner LLM behavior.
- The prompt is huge and contains some broad rules that can conflict with topic KB.

Risk:

- Public accuracy suffers if the AI is the primary decision-maker.

Recommendation:

- Backend computes verdicts.
- Public UI shows deterministic proof.
- AI only translates evidence into human language.
- Every public AI answer should be grounded in the active chart/workspace/match/horary/muhurtha payload.

## Public Mode Feature Safety Levels

### Safe Now With Existing Backend

These can be built using existing backend outputs:

- Birth profile onboarding.
- Multi-profile family vault UI, up to 4 members initially.
- Consumer chart overview.
- KP life-area cards using backend verdict/proof.
- Dasha timeline as broad periods.
- Compatibility selection and result display.
- Horary 1-249 interaction and verdict proof.
- Muhurtha windows returned by engine.
- Panchang day view.
- AI Oracle with active chart context.

### Safe With Careful Copy

These are useful but need conservative language:

- "Career season is improving."
- "Marriage timing support appears stronger in this period."
- "This date has better muhurtha support than nearby options."
- "This question leans yes/no based on CSL and RP confirmation."

Avoid:

- "Guaranteed."
- "Exact date."
- "100 percent."
- "This will definitely happen."
- Deterministic claims for health, death, fertility, divorce, legal outcome, or financial risk.

### Needs Backend Hardening Before Public Launch

- Exact event day/hour prediction.
- Daily personalized topic scores.
- Monthly love/career/money calendars.
- All-family combined forecasting.
- Strong fertility/health/legal claims.
- Topic threshold correctness across all topic maps.
- Unified RP weighting.
- Node proxy parity across all engines.

## Recommended Public Mode Backend Strategy

Do not fork or rewrite astrologer backend.

Create a new public facade layer that depends on existing services:

```text
Existing KP Engines
  -> Public API/Fascade Layer
  -> Consumer DTOs
  -> UserModeUI Components
```

The facade should:

- Call existing engines.
- Normalize payloads.
- Hide raw technical fields unless needed for proof.
- Add consumer-safe labels and caveats.
- Preserve source/provenance for trust.
- Keep Astrologer Mode untouched.

Possible new backend namespace:

```text
backend/app/routes/user_mode.py
backend/app/services/user_mode_facade.py
backend/app/schemas/user_mode.py
backend/app/services/kp_rule_matrix.py
```

Initial public endpoints could be:

- `POST /user-mode/profile/summary`
- `POST /user-mode/dashboard`
- `POST /user-mode/life-area`
- `POST /user-mode/timeline`
- `POST /user-mode/oracle/context`
- `POST /user-mode/compatibility`
- `POST /user-mode/horary`
- `POST /user-mode/muhurtha`
- `POST /user-mode/panchang`

These endpoints should internally call existing endpoints/services where possible:

- `/astrologer/workspace`
- `/chart/generate`
- `/prediction/ask-stream`
- `/compatibility/match`
- `/compatibility/analyze`
- `/horary/analyze`
- `/muhurtha/find`
- `/muhurtha/analyze`
- `/panchangam/location`
- `/panchangam/calendar`

## Recommended User Mode UX Structure

### 1. Onboarding

Goal: trust and completion.

Flow:

- Name.
- Date of birth.
- Time of birth with confidence selector.
- Place of birth.
- Gender only if needed by interpretation, not as a visual identity anchor.
- Mode defaults to General Public.
- Language: English/Telugu.

UX principles:

- Make accuracy visible: ephemeris, timezone, place, birth-time confidence.
- Let user add family later, not during first chart creation.
- Do not overload with astrology jargon.

### 2. Home Dashboard

Purpose: daily return surface.

Sections:

- Profile switcher.
- "Current life weather" based on dasha and transit context.
- Top 3 active life areas.
- Today Panchang compact strip.
- Next favorable timing card.
- Ask Oracle composer.
- Quick actions:
  - Match two people.
  - Ask a yes/no question.
  - Find a good time.
  - Explore my timeline.

### 3. Life Areas

Consumer topics:

- Career and job.
- Business.
- Money.
- Marriage and relationship.
- Children/family, carefully framed.
- Education.
- Foreign travel/settlement.
- Property/vehicle.
- Legal/dispute, careful.
- Health/wellbeing, conservative.

Each area should show:

- Verdict tier.
- Why the chart supports/resists it.
- Timing support.
- What to watch.
- Ask follow-up.

No raw tables by default. Offer "Proof" expanders for KP users:

- Primary cusp.
- CSL.
- Relevant houses.
- Denial houses.
- Dasha lords.
- RP overlap.

### 4. Timeline

Use dasha as the main consumer mental model.

Visual model:

- Current Mahadasha as a long band.
- Antardashas as chapters.
- Pratyantardasha/Sookshma only when useful.
- Life-area chips over periods.
- "Strong", "mixed", "wait", "avoid overclaiming" states.

Copy:

- "Supportive period."
- "Mixed period."
- "Preparation period."
- "Low-support period."

### 5. Oracle Chat

The chat should be context-aware, not a generic chatbot.

Capabilities:

- Ask about active profile.
- Switch profile inside thread.
- Mention family members.
- Ask relationship questions involving two profiles.
- Convert a question into:
  - natal topic analysis
  - compatibility
  - horary
  - muhurtha

Guardrail:

- Oracle must cite backend evidence in simple language.
- For high-sensitivity questions, avoid fatalistic or medical/legal/financial certainty.

### 6. Compatibility

Flow:

- Select person A.
- Select person B.
- Choose intent:
  - Marriage compatibility.
  - Relationship understanding.
  - Timing support.
  - Family acceptance.
- Show result:
  - overall relationship map
  - emotional fit
  - practical fit
  - KP marriage promise/timing
  - Guna score as supporting, not final authority
  - friction zones
  - best next questions

### 7. Horary / Prashna

Make 1-249 interactive but not gimmicky.

Flow:

- User writes one sincere question.
- UI asks them to pick a number 1-249.
- Number grid or wheel.
- Backend calculates verdict.
- UI reveals:
  - answer lean: yes/no/mixed
  - confidence
  - key cusp/CSL
  - RP confirmation
  - caveat

Important:

- Never call the number magic.
- Explain that the number maps to a KP zodiac subdivision.

### 8. Muhurtha

Flow:

- Choose event type.
- Choose people involved.
- Choose date range and location.
- Engine scans.
- UI shows:
  - best windows
  - why this window is good
  - avoid windows
  - rule badges
  - calendar export later

For trust:

- Show hard rejections separately.
- Do not show "best of bad" as auspicious.

## Frontend Isolation Strategy

Keep all public mode UI under:

```text
frontend/app/app/components/UserModeUI/
```

Recommended component structure:

```text
UserModeUI/
  index.tsx
  layout/
    UserShell.tsx
    UserTopBar.tsx
    ProfileSwitcher.tsx
  i18n/
    en.ts
    te.ts
    types.ts
  data/
    adapters.ts
    mockPublicPayloads.ts
  dashboard/
    PublicDashboard.tsx
    LifeWeatherCard.tsx
    PanchangStrip.tsx
    QuickActions.tsx
  profiles/
    ProfileVault.tsx
    ProfileForm.tsx
  life-areas/
    LifeAreaHub.tsx
    LifeAreaCard.tsx
    KpProofDrawer.tsx
  timeline/
    DashaTimeline.tsx
    PeriodDetailPanel.tsx
  oracle/
    OraclePanel.tsx
    ContextChips.tsx
  compatibility/
    CompatibilityFlow.tsx
    MatchResult.tsx
  horary/
    HoraryQuestionFlow.tsx
    NumberPicker249.tsx
    HoraryVerdict.tsx
  muhurtha/
    MuhurthaFinder.tsx
    MuhurthaWindowList.tsx
    RuleBadgeGrid.tsx
```

English and Telugu strings should be fully separated. No inline mixed-language copy in components.

## Development Sequence

Recommended order:

1. Freeze current Astrologer Mode and backend behavior as untouched.
2. Create public DTO contract from existing backend responses.
3. Build User Mode shell and navigation.
4. Build profile vault and language foundation.
5. Build dashboard using mocked DTOs.
6. Wire dashboard to existing backend facade.
7. Build life-area views.
8. Build Oracle context chat.
9. Build compatibility flow.
10. Build horary flow.
11. Build muhurtha flow.
12. Add visual QA and responsive testing.
13. Add backend hardening only where public claims need it.

## Non-Negotiable Product Principle

Accuracy and trust are the brand. If a feature cannot be supported by deterministic KP evidence, do not present it as a prediction. Present it as:

- educational context,
- exploratory insight,
- lower-confidence tendency,
- or do not ship it.

