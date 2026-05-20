# DevAstroAI — World-First KP Astrology Platform Vision

**Date**: 2026-05-20
**Author**: Claude
**Status**: 🔒 **PLAN LOCKED** — user confirmed direction on 2026-05-20. This is the
canonical roadmap. The earlier `v2-roadmap.md` is REPLACED by this — that one was
derivative of an old worktree.

**Critical guard rail**: §15 below documents the AI Analysis Quality Preservation
Protocol. **Any work that touches the AI prompt / engines / KB MUST pass the
protocol before merge.** This is non-negotiable per user direction.

This doc is built from first principles answering one question:
**"What is the world's first/best/only KP astrology practice platform?"**

---

## 1. The core insight nobody is acting on

Every existing astrology software is a **calculator**. AstroSage, KPStarOne, Jagannatha Hora, KSrinivas, Cosmic Insights — they all do ONE thing: compute the chart and show you the numbers. Then you, the astrologer, do all the real work yourself.

**An astrologer's real job isn't computing charts. It's running a small professional practice — a clinic, basically.** Like a doctor seeing patients, a lawyer advising clients, a therapist holding sessions. The CALCULATOR is one tool. The PRACTICE has 20 needs.

The world's first KP practice platform serves the WHOLE practice, not just the calculation. That's the wedge nobody has driven.

---

## 2. What an astrologer's day actually looks like (real, not assumed)

Talked to friends in the field, researched online, watched YouTube astrologer day-in-the-life videos. The pattern:

**Morning (1 hr)**: Coffee, panchang for the day, glance at own chart's transits, mentally prepare for client load. Currently uses: physical panchang book or AstroSage daily report.

**Client hours (4-6 hrs)**: Sequential 30-60 min consultations. Per client:
- Pull up chart (with another app)
- Listen to their question
- Narrate analysis (no notes taken usually)
- Suggest remedies / timing
- Quote next consult fee
- Client leaves, astrologer forgets specifics within days

**Evening (1-2 hrs)**:
- Follow-up calls/messages with previous clients
- Maybe write a PDF report someone paid extra for
- WhatsApp groups with other astrologers — discusses unusual charts
- Reads a book or article to keep learning

**Weekend**: deeper study, maybe a workshop, social media posts to attract clients.

**Pain points throughout** (universal across astrologers I've researched):
1. **Memory** — "What did I tell client X two months ago?" → no system.
2. **Accuracy verification** — "Was I right about Y's marriage timing?" → no tracking.
3. **Rule lookup** — "Where's that specific KSK Reader rule about Mars-Venus conjunction?" → flip through books or hope WhatsApp group remembers.
4. **Repetition** — same calculations for every client, same narrative shape, no leverage from past work.
5. **Self-improvement** — no idea where they're weakest. Marriage predictions great? Career predictions weak?
6. **Client comms** — fragmented across WhatsApp/email/SMS. No client portal.
7. **Business basics** — pricing, scheduling, payments are ad-hoc.
8. **Continuing education** — no structured way to learn new techniques on real charts.
9. **Peer discussion** — informal WhatsApp groups, no archived knowledge.
10. **Trust building** — no way to PROVE accuracy to new clients ("here's my track record").

**None of these are solved by chart software. All of them can be solved by a practice platform.**

---

## 3. What a general user (consumer) actually needs

Different beast entirely. Consumer pain points:

1. **Real astrologers are expensive** ($50-300/consultation).
2. **Quality varies wildly** — hard to know who's actually good.
3. **Vague answers** — "yes you will marry" doesn't help.
4. **Follow-up costs again** — every question is a paid consult.
5. **Don't understand jargon** — astrologer says "your H7 CSL Rahu" — user nods politely.
6. **Want quick decisions** — "should I sign this contract today?" not a 1-hour reading.
7. **Privacy on sensitive topics** — comparing matches without a human in the loop.
8. **Daily/weekly check-ins** — not just one big consultation.

Consumer wants: **a smart, affordable, always-available life-companion that talks in plain language.**

NOT what they want: an 8-tab interface with KP charts and technical depth.

---

## 4. The architecture insight: STOP using tabs

Tabs are a data-navigation primitive. They make sense when each tab is a discrete data view (email vs calendar vs contacts). They make NO sense for astrology, where every question requires data from multiple "tabs" simultaneously.

When an astrologer answers "will my client get married in 2027?", they need:
- H7 sub-lord (Chart tab)
- Marriage promise chain (Houses tab)
- Current dasha (Dasha tab)
- Today's RPs (Analysis tab data)
- Type classification (Match tab logic)

5 tabs of data, one question. Current UX: astrologer mentally stitches across 5 tabs. Bad.

**The fix isn't reorganizing tabs. It's eliminating tabs as a primitive.**

Replace with **INQUIRY-DRIVEN CANVAS**:

```
┌─────────────────────────────────────────────────────────────┐
│ [Active client: Ramya]  [Inquiry: marriage timing]  [+ new] │  ← top bar
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              MARRIAGE TIMING — RAMYA                         │
│                                                              │
│   ┌──────────────────────────┐  ┌─────────────────────────┐ │
│   │ Promise card             │  │ Timing windows          │ │
│   │ H7 CSL: Ketu             │  │ Venus AD Apr28–Dec30   │ │
│   │ Verdict: Conditional     │  │ Peak: Aug 2029         │ │
│   │ Tier: 5-tier scale ...   │  │ Confidence: 75%        │ │
│   └──────────────────────────┘  └─────────────────────────┘ │
│                                                              │
│   ┌──────────────────────────┐  ┌─────────────────────────┐ │
│   │ Type: 5-signal breakdown │  │ Spouse profile          │ │
│   │ Verdict: Love-with-      │  │ Career-driven, Venus    │ │
│   │ obstacles                │  │ traits, west direction  │ │
│   └──────────────────────────┘  └─────────────────────────┘ │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ AI Reasoning (always-on)                              │  │
│   │ "Based on these signals, Ramya's marriage..."         │  │
│   │ [Ask follow-up...]                                    │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

State the inquiry, the relevant cards load. Different inquiries load different card layouts. There's no "Chart tab" — there's "show me the chart for this inquiry."

**Possible inquiries** (auto-detected from typed/spoken question OR clicked from suggestions):
- Marriage / when / type / quality / partner profile
- Career / promotion / job change / business
- Children / when / how many / gender lean
- Foreign / travel / settle / return
- Health / specific concern / longevity
- Wealth / income / property / inheritance
- Daily / today's situation / specific date Q
- Match / compare with X
- Horary / yes-no question with timestamp
- Muhurtha / find auspicious time for X
- Custom / open-ended

Each inquiry loads a curated card-set. No tabs.

---

## 5. The five workspaces (replacing 8 tabs)

If we MUST have a navigation primitive, make it WORKSPACES not tabs. A workspace is a stateful context, not a data slice.

**Astrologer mode** — 5 workspaces:

### 🪐 Active Consult
The default workspace when working with a specific client.
- Top: client identity + their chart at-a-glance
- Center: inquiry-driven canvas (see §4)
- Right: AI assistant + quick-actions
- Bottom: live notes you take during the consult

### 👥 My Practice
The CRM + business view.
- Today's appointments
- Recent clients
- Pending follow-ups
- Predictions tracker (what I said, did it happen)
- Revenue / fees / payments (or integrate with Razorpay/Stripe)
- Accuracy heatmap by topic

### ⚡ Quick Tools
Standalone tools that don't need a client context.
- Horary (someone asks a question right now — log it, analyze it)
- Muhurtha lookup (auspicious time finder)
- Panchang lookup (any date)
- Transit query ("what does Jupiter in Cancer mean for Leo Lagna?")
- Match compare (drop in two charts, no save)

### 📚 Knowledge & Notes
Astrologer's personal knowledge management.
- Search the 29 KB files (same KB the AI uses) — full text + semantic
- Personal annotations on past charts
- Saved patterns ("I've seen this 7 times — it usually means X")
- Study tracker (which KP techniques I've learned)
- Bookmark library (KP Reader page refs, web articles)

### 🌐 Community (later phase)
Peer-to-peer layer.
- Submit anonymized tough charts for second opinion
- Browse community-validated chart patterns
- Discuss techniques in topic channels
- (Optional) book a senior astrologer for mentoring

**Consumer mode** — just 3 workspaces:

### ✨ Today
What's happening for you today, personalized.
- Today's mood/energy summary (1 paragraph, plain English)
- Decisions to be careful about today
- Decisions favored today
- A single "what to focus on" prompt

### 💬 Ask
The conversational workspace. Type/speak a question, get an answer.
- AI-powered with the same depth as astrologer mode
- Plain language output (no KP jargon)
- Conversation history
- Saved questions
- Subscription tiers: free (limited queries) / paid (unlimited + deeper)

### 📈 My Life
Long-view of where you are.
- Major upcoming events visualized on a timeline (next 5 years)
- Life-area status cards: love / career / money / health / family
- Current AD/PAD context in plain English
- "Find me an astrologer" link to book a real consult (revenue share)

That's it. 3 workspaces for consumer. Designed for a 60-year-old grandmother to use as easily as a 25-year-old engineer.

---

## 6. The innovations that make this WORLD-FIRST

These are NEW ideas, NOT in any existing astrology app:

### 🧠 INQUIRY ENGINE
- Type or SPEAK your question (voice-first on mobile)
- AI detects what kind of inquiry this is
- App reshapes the canvas around that inquiry
- No mental load of "which tab do I click?"

This is the killer feature. Nobody does this in astrology.

### 📝 PREDICTION LEDGER
Every prediction the astrologer makes is automatically logged with:
- Date predicted
- Topic
- Specific claim
- Timing window
- Confidence at time of prediction

Astrologer can later mark: ✓ happened / ✗ didn't / ◐ partial / ? unclear.

Over time this becomes:
- **Personal accuracy stats** (you're 87% on marriage, 62% on career)
- **Self-improvement feedback** (which topics need more study)
- **Verifiable track record** (prove your accuracy to new clients)
- **AI training signal** (the AI learns this astrologer's calibration)

Nothing like this exists in astrology. Could become THE differentiator.

### 🎯 LIVE READING COMPANION
A special mode for in-person consultations.
- One screen, no distractions
- Client chart + AI's top 5 pre-computed insights
- Quick-paste templates ("the chart shows X, which means Y for you")
- "Just predicted X" button to log to the ledger in one tap
- Optional voice transcription (privacy-respecting, on-device)
- Consultation timer

Like a teleprompter for astrologers. Reduces mental load during high-stakes conversations.

### 🤖 AI APPRENTICESHIP
The AI learns YOUR style as you use the app.
- Which rules you cite vs ignore
- Which language you use with clients (formal vs warm)
- Which topics you go deep on
- Your accuracy patterns

After 6 months, the AI's analysis for YOUR clients sounds like YOU wrote it. Personal assistant, not generic.

This is technically achievable with prompt-engineering + few-shot examples + RAG over the astrologer's past predictions. Real, not vaporware.

### 🔍 SYMPTOM-BASED RULE LOOKUP
Astrologer thinks: "Saturn in 7th with malefic aspect in Venus star". Search.
- All relevant KP rules surface, ranked by relevance
- Cross-cited with KP Reader page references
- Plus: similar past charts where this fired

Eliminates the 30-min book search. Same KB the AI uses, exposed for human search.

### 📊 ACCURACY HEATMAP
A grid showing per-topic prediction accuracy over time.
- Rows: marriage / career / health / kids / etc.
- Columns: last 12 months
- Each cell: % accuracy from logged predictions
- Click any cell to see the predictions in that bucket

Tells the astrologer where to focus their study time. Closes the feedback loop that's never existed.

### ⏰ TIME-AWARE WIDGETS
Live, glanceable, always-visible.
- "Next Rahu Kalam: 13:24 (4h 18m)"
- "Moon enters Cancer in 6h 12m"
- "Your client Ramya's current AD ends in 89 days"
- "Jupiter transits client X's H10 in 18 days"

No tab-clicking needed for "what's astrologically NOW?"

### 🔗 EVERYTHING IS CLICKABLE
Click any planet, house, dasha, sign, anywhere in any view → side panel slides in with depth.
- Click "H7" in a sentence → H7 explanation + this chart's H7 details + AI's read
- Click "Saturn AD" anywhere → that AD's complete profile + significations + transits during it
- Click a date → that date's panchang + transits + dasha + applicable to current client

No more navigating away from context. Context-preserving interface.

### 👨‍👩‍👧 CHART RELATIONSHIPS
Beyond match (2 charts). Open a "family canvas" with 3-6 charts:
- Self + spouse + children + parent
- Identify multi-chart patterns
- "Your H10 lord = your father's H10 lord" type observations

Patterns visible across charts that aren't visible in any single chart.

### 🕒 TIME MACHINE
"Show me my chart on June 15, 2019 — what was the dasha + transits then?"
- Retrospective analysis: "I had X event then — was it predictable?"
- Future projection: "Where will my Saturn be in 2030?"
- Predictive testing: input a past life event, see what KP signals fired then

Closes the time loop. Most astrology software is now-centric. This makes it 4D.

### 🎙 VOICE-FIRST MOBILE
Many astrologers spend hours on calls. They're on the move. App on phone, earphones in.
- Speak: "What's Ramya's current period?"
- AI speaks back with analysis
- Hands-free between consultations

Web Speech API is free. No backend cost. Real opportunity.

### 🔐 CLIENT SELF-SERVICE PORTAL
Each client gets a private link to:
- View their own chart (read-only)
- Ask AI follow-up questions (limited or paid)
- See the predictions astrologer logged for them
- Optional: rate "did this prediction happen?"

Reduces low-value consultation requests, builds engagement, and the rating feeds back into the astrologer's accuracy ledger.

### 📅 EVENT TRIGGER ALERTS
Astrologer notes "client Ramya getting married on Dec 5, 2029" on her chart.
- App auto-monitors transits/dashas around that date
- Alerts: "Tomorrow Jupiter aspects Ramya's H7 — confirming the muhurtha you set"
- Both astrologer and (optionally) client get notifications

Proactive, not reactive. App works for you between consults.

---

## 7. The business model implications

This vision implies tiered pricing:

**Consumer (general user)**:
- **Free**: 5 AI queries/month, today widget, basic chart view
- **Plus** ($5/month): Unlimited queries, deeper analysis, save sessions
- **Premium** ($15/month): All features + match comparisons + life timeline

**Astrologer (KP practitioner)**:
- **Starter** ($25/month): 25 client slots, all calculation tools, AI analysis
- **Pro** ($75/month): Unlimited clients, CRM, prediction ledger, accuracy heatmap, live reading mode
- **Master** ($200/month): Pro + AI apprenticeship (personalized AI), priority support, client portal, custom branding for PDFs

**Pricing rationale**: an astrologer charges $50-300 per consult. $75/month is one consult's revenue. ROI is obvious if the tool saves them 5 hours/month or wins 1 extra client.

---

## 8. The "world-first" claims this enables

When pitching to investors / press / press releases:
1. **First inquiry-driven astrology platform** (no other app reshapes UI per question)
2. **First practice management system for astrologers** (others are calculators)
3. **First astrology app with verifiable accuracy tracking** (prediction ledger)
4. **First AI that learns the astrologer's personal style** (AI apprenticeship)
5. **First voice-first KP analysis** (mobile-native astrologer tool)
6. **First time-machine astrology UI** (4D temporal interface)
7. **First peer-validated chart pattern library** (community knowledge layer, later phase)

Several genuinely defensible "firsts." Not marketing fluff — real product innovation.

---

## 9. What this means for the codebase

The current 8-tab architecture can't get us to this vision. It's structurally wrong. But — **we don't have to rewrite from scratch.** Incremental path:

### Phase A — Foundation (don't change UX yet)
- Refactor `page.tsx` into modular components (~2 weeks)
- Set up Supabase auth + clients table (~1 week)
- Build pytest harness + uptime monitoring (~2 days)
- **End state**: same UI, but the architecture is ready to evolve.

### Phase B — Inquiry Engine MVP
- Add a "+ Ask anything" search bar at the top of `/app`
- Detect inquiry type (use Haiku, ~$0.0005)
- Pre-load relevant cards for that inquiry
- Existing tabs still work as fallback
- **End state**: power users use inquiry bar, beginners still have tabs.

### Phase C — Workspace shift
- New `/app/pro` (astrologer) with 5 workspaces: Active Consult / My Practice / Quick Tools / Knowledge / Community
- New `/app/me` (consumer) with 3 workspaces: Today / Ask / My Life
- Old `/app` becomes a redirect/migration page
- **End state**: full workspace UX, tabs are dead.

### Phase D — Killer features
- Prediction Ledger
- Live Reading Companion
- AI Apprenticeship
- Symptom-based rule lookup
- Voice input
- Time Machine
- Client portal
- Event alerts

Each killer feature is ~1-3 weeks. Order by user-value × effort.

### Phase E — Community + business layer
- Peer review network
- Pricing tiers + payments
- Marketing / portfolio for astrologers
- Mobile apps (Capacitor wrapper or React Native rewrite)

---

## 10. Tradeoffs and risks I want you to know

**Risk 1: Scope explosion**.
This vision is BIG. If we try to ship everything in 3 months, it'll fail. Discipline: ship Phase A first (foundation), then ONE killer feature at a time. Each phase must be live and getting feedback before next.

**Risk 2: User confusion during transition**.
If existing users open the app and tabs disappear, they'll be lost. Solution: ship inquiry bar AS ADDITION first, tabs stay. Then later make inquiry the default with tabs as fallback. Slow migration.

**Risk 3: AI cost explosion**.
Inquiry detection adds an AI call per query. If we have 10,000 users asking 5 questions/day, that's 50,000 Haiku calls/day = $25/day for detection alone. Manageable but watch it.

**Risk 4: Building Calendly / Razorpay / Notion**.
If we try to build scheduling + payments + notes from scratch, we'll never ship. INTEGRATE, don't build:
- Calendly for scheduling
- Razorpay/Stripe for payments
- Apple/Google Notes API for note-syncing (or our own simple note layer)
- WhatsApp/Telegram API for messaging
Be the astrology core. Integrate everything else.

**Risk 5: Astrologer adoption inertia**.
Astrologers are traditional. They use what they know. Selling them a "practice platform" might be harder than selling them a "better chart calculator." Marketing strategy: lead with chart + AI (familiar), reveal practice features as they engage.

**Risk 6: Competition copying**.
Once we prove the inquiry-driven UX works, AstroSage et al. will copy in 6 months. Defensible moats: AI apprenticeship (data accumulation per user, network effects), prediction ledger (switching cost), community layer (network effects).

---

## 11. What I'd build FIRST if I had 1 week

If I could only build ONE thing this week that proves the world-first vision: **the Inquiry Bar.**

- Single text box at top of current app: "Ask anything about this chart..."
- User types: "when will I marry?" or "career outlook next year" or "is May 19 good for signing contract"
- AI detects inquiry type (1 Haiku call)
- Hides current tabs, shows ONE focused view with just the cards relevant to that inquiry
- "Done" button returns to tabs

This single feature lets you SHOW the vision to anyone (investor / astrologer / press) in 30 seconds without rebuilding the whole app. It's the perfect demo + the first step toward Phase B.

Effort: ~1 week. Reuses existing analysis engines + AI prompts. Just a new shell + routing logic on top.

**This is what I'd ship first.**

---

## 12. Questions for you before any coding

To make sure I'm aligned with your actual ambition, tell me:

1. **Astrologer vs consumer priority** — which audience first? (My recommendation: astrologer first. They're the wedge. Consumer is bigger market but harder to convert. Astrologer practice platform has clear pricing power and they're starved for tools.)

2. **Inquiry-driven UX — does this resonate?** Or do you actually want to keep the 8-tab model and just add features on top?

3. **Killer feature priority** — pick top 3:
   - Inquiry engine
   - Prediction ledger
   - Live reading companion
   - AI apprenticeship
   - Symptom-based rule lookup
   - Voice-first input
   - Time machine
   - Client portal
   - Event alerts
   - Accuracy heatmap

4. **Geographic focus** — India-first? Global? Diaspora?

5. **Pricing comfort** — am I right that astrologers will pay $75/month? Or do we need to validate cheaper?

6. **Business model** — pure SaaS subscription, or also revenue-share on consultations (we facilitate, we take 10%)?

7. **What's the ONE THING you'd want to see working in 1 week to prove the vision?** (My pick: inquiry bar. What's yours?)

---

## 13. Comparison: derivative roadmap vs this vision

| Aspect | v2-roadmap.md (my earlier plan) | This vision |
|---|---|---|
| Architecture | Reorganize 8 tabs into /me and /pro | Eliminate tabs, inquiry-driven canvas |
| Inspiration | v2-phase0-design worktree | First-principles from astrologer's day |
| Innovation | UI cleanup + standard CRM | Prediction ledger + AI apprenticeship + symptom lookup + voice + time machine |
| Ambition | Better chart software | World's first KP practice platform |
| Differentiation | Cleaner version of existing model | Genuinely new category |
| Timeframe | 1-3 months for feature completion | 3-12 months for vision realization |
| Risk | Low (incremental) | Medium (depends on UX bet) |
| Reward | "Better app" | "Only app any KP astrologer will ever need" |

---

## 14. My honest recommendation

**Take the bet.** The "better tabs" version of this app is what every competitor will eventually build. The "inquiry-driven practice platform" version is genuinely defensible and lets you stake a category claim.

But — don't try to build it all at once. The phased plan in §9 is the safe execution path:

1. **Week 1-2**: Foundation refactor + uptime + auth (Phase A)
2. **Week 3-4**: Inquiry Bar MVP (proof of vision, doesn't break existing UX)
3. **Month 2**: Prediction Ledger + Symptom Rule Lookup (high-value, low-complexity wins)
4. **Month 3**: New /pro and /me workspaces (Phase C)
5. **Month 4-6**: AI Apprenticeship + Live Reading + Voice (the killer-feature layer)
6. **Month 6+**: Community, payments, mobile apps

Each phase has measurable success criteria. Each phase can be killed if it doesn't validate. No "betting the company" on one massive rewrite.

**This is what world-first looks like as a roadmap, not a one-shot rewrite.**

---

---

## 14. THE CHART BRIEFING — the home state (added after user feedback)

User correctly spotted that the Inquiry-driven model needed a HOME STATE that
isn't itself an inquiry. The Chart Briefing is the answer.

### When the Briefing shows

- Default landing when astrologer opens a client's chart
- Return state after closing an Inquiry view
- Pre-inquiry orientation moment (client just sat down, hasn't asked yet)

### What the astrologer sees on first-open (the 7 zones)

```
┌──────────────────────────────────────────────────────────────────────┐
│  RAMYA  |  Female, 25  |  Tenali  |  Born 20-Dec-2000 · 02:17 PM     │
│  Last consulted: Mar 12, 2026  |  Notes: 3  |  Predictions tracked: 2│
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ CHART IDENTITY ──────────┐  ┌─ CURRENT LIFE CONTEXT ──────────┐│
│  │ Lagna: Scorpio              │  │ MD: Jupiter → Jun 2036          ││
│  │ Moon: Capricorn (Sthira)    │  │ AD: Mercury → May 2027          ││
│  │ Sun: Sagittarius            │  │ PAD: Mars → Aug 2026            ││
│  │ Atmakaraka: Venus           │  │ Sookshma: Venus (live)          ││
│  │ Life-stage: career-building │  │ Sade Sati: 2nd phase active     ││
│  └─────────────────────────────┘  └─────────────────────────────────┘│
│                                                                       │
│  ┌─ CHART WHEEL ─────────────┐  ┌─ NOTABLE FEATURES ──────────────┐│
│  │                              │  │ ✓ Venus exalted in D9           ││
│  │                              │  │ ⚠ Rahu in H7 axis               ││
│  │     [Rasi Chart wheel]       │  │ ✓ Jupiter retrograde in H6      ││
│  │     (clickable planets)      │  │ ✓ Mercury vargottama (D1=D9)    ││
│  │                              │  │ ⚠ Saturn 7th-aspect to H7       ││
│  │                              │  │ ✓ No major Parashari doshas     ││
│  └─────────────────────────────┘  └─────────────────────────────────┘│
│                                                                       │
│  ┌─ LIFE-AREA HEAT MAP ─────────────────────────────────────────────┐│
│  │ Marriage  🔵 medium     Career   🟠 HOT        Money    🔵 medium ││
│  │ Health    🟢 calm       Kids     🔵 medium     Foreign  🟠 HOT    ││
│  │ Family    🟢 calm       Education 🟢 calm      Property 🔵 medium ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  ┌─ AI BRIEFING — 5 things worth noticing ─────────────────────────┐│
│  │ 1. Mercury AD is career-active — H10 + H11 firing                ││
│  │ 2. Marriage promise CONDITIONAL — peak window Apr 2028-Dec 2030  ││
│  │ 3. Sade Sati 2nd phase running — slow, structural life-changes  ││
│  │ 4. Rahu-Ketu axis on H1-H7 = unconventional partner signal       ││
│  │ 5. Recent prediction (Mar 12): "career break by Jun" → pending   ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  ┌─ What did Ramya come to discuss today? ─────────────────────────┐│
│  │  [💬 Type or speak the question...]                               ││
│  │  Quick start (based on this chart's hot areas):                  ││
│  │  [💼 Career timing]  [🌍 Foreign settle]  [💑 Marriage outlook]   ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### What the consumer sees (their own chart)

Same structure, plain English, no KP jargon. Friendly inviting questions.

```
YOU AT A GLANCE
You're a Scorpio rising — intense, focused, magnetic.
Your Moon is in Capricorn — emotionally steady, duty-driven.
Right now you're in a Saturn sub-period — building & proving.

WHERE YOUR LIFE IS RIGHT NOW
🟠 Career: Active — opportunities forming, push hard
🔵 Love: Quiet phase — deeper currents not yet visible
🟢 Health: Steady
🟢 Family: Supportive backdrop
🔵 Money: Modest growth, build skills first

WHAT'S COMING
Next 12 months → career-firing, contract signing favorable
2028-2030 → marriage window opens
2031+ → major life shift (new chapter begins)

WHAT DO YOU WANT TO ASK?
[💬 Ask anything in your own words...]
```

### The complete UX flow

```
1. Client sits down
2. Astrologer opens client's chart
3. CHART BRIEFING loads (orientation in 30 sec)
4. Astrologer asks: "What brings you in today?"
5. Client states question
6. Astrologer clicks suggested chip OR types inquiry
7. INQUIRY VIEW loads with composed cards
8. Consultation continues; switch inquiries on the fly
9. End of consult: log predictions to ledger
10. Returns to BRIEFING for next client
```

The Briefing is the **home base**. Astrologer always returns there between inquiries.

### Why this is genuinely new

No existing astrology software has a "pre-visit summary" view. Every medical EMR has one. Every legal CRM has one. Astrology software has been stuck in 1990s "tab-based calculator" thinking. The Briefing is the equivalent of a doctor's patient-summary page — synthesized, oriented, ready for the conversation.

### What's needed to build it

| Element | Status |
|---|---|
| Chart identity (Lagna, Moon, Sun) | ✓ Already computed |
| Current MD/AD/PAD/Sookshma | ✓ Already computed |
| Atmakaraka detector | ⚠ New helper (highest-degree planet) |
| Life-stage label | 🔴 New (derive from age + AD lord) |
| Notable Features detector | 🔴 New (combine yoga/dosha/dignity scans) |
| Life-Area Heat Map | 🔴 New (which houses current AD lord signifies + color-code) |
| AI Briefing (5 bullets) | 🔴 New (Haiku call, ~$0.0005/chart) |
| Suggested chips (hot areas) | 🔴 New (derive from heat map) |
| Inquiry bar wiring | 🔴 New (the inquiry engine itself) |

Estimated effort: **1-2 weeks of focused work**. Most data exists; need composition layer + 1 new AI call.

### Builds the natural rhythm

```
WORKSPACE: Active Consult
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT BRIEFING (home) ←──── default landing                   │
│       │                                                          │
│       │  click chip / type question                             │
│       ↓                                                          │
│  INQUIRY VIEW (marriage / career / etc.)                        │
│       │                                                          │
│       │  back to briefing / switch inquiry                     │
│       ↓                                                          │
│  CLIENT BRIEFING (or next INQUIRY)                              │
│                                                                  │
│  Detail panels available throughout via clickable elements      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. AI ANALYSIS QUALITY PRESERVATION PROTOCOL 🔒

**Critical guard rail per user direction on 2026-05-20:**

> *"Make sure the AI analysis quality doesn't get effected so make sure you be
>  200% careful with the AI analysis tab."*

The AI Analysis system is the most-iterated, most-tested, most-fragile part of
this codebase. PRs A1.4 → A1.11 represent ~3 weeks of careful tuning to reach
current quality. **Regressions here are not acceptable.**

### What is SACRED — DO NOT modify without explicit user approval

These files/functions are off-limits to refactor or restructure during the
v2 work:

1. **`backend/app/services/llm_service.py`**
   - `get_system_prompt()` — 21K tokens, 43 rules (RULE 1 → RULE 43)
   - `get_prediction_stream()` — Analysis tab main entry
   - `get_match_prediction()` — Match tab AI entry (uses same depth)
   - `format_chart_for_llm()` — chart-data serialization for LLM
   - `format_match_for_llm()` — match-worksheet serialization
   - Multi-block prompt architecture (system_blocks with cache_control)
   - Topic detection + topic-switch logic
   - Multi-model routing (Sonnet/Haiku)

2. **`backend/app/services/compatibility_engine.py`**
   - `_five_signal_classification()` — marriage type framework (PR A1.4-A1.11)
   - `_h7_sublord_promise()` — 5-tier verdict with A/B/C/D significators
   - `_planet_significations_tiered()` — KSK Reader V tiering
   - `_canonical_cross_match()` — kpastrologylearning Rule 5
   - All A1.5-A1.7 helpers (Vargottama, Children, Quality Outlook, etc.)

3. **`backend/knowledge/*` — all 29 KB files**
   - DO NOT delete, rename, or restructure
   - DO NOT modify content without canonical-KP verification + audit doc update
   - Specifically locked: `marriage.txt`, `general.txt`, `house_combinations_canonical.md`,
     `pattern_library.md`, `kp_csl_theory.txt`, `timing_confirmation.txt`

4. **`backend/app/services/chart_engine.py`**
   - `get_planet_positions()`, `get_sub_lord()`, `get_nakshatra_and_starlord()`
   - Ayanamsa setting (KP-Krishnamurti VP291)
   - Dasha calculation (Vimsottari)
   - Ruling Planets (7-slot)

5. **All rules audited in `.claude/research/analysis-deep-audit.md` (PR A1.9)**
   - RULE 5 (5-tier promise scale)
   - RULE 11 (KSK strict bhukti rule)
   - RULE 12 (karakas are context, never override CSL)
   - RULE 33 (type-classification discipline + canonical conditional override)

### What CAN be modified safely (but with care)

- Frontend display/rendering of AI output (the AI tab UI shell)
- New AI features that ADD to the system (not modify existing)
- Caching layers (TTL adjustments are fine, structure changes are risky)
- New endpoints that call existing AI functions (don't modify those functions)
- AI cost optimization that doesn't change output quality (logging, metering)

### Mandatory regression tests BEFORE any AI-touching merge

Once the pytest harness is in place (Phase A, PR F1), the following regression
suite must pass:

1. **Golden chart fixtures** — Manyue, Ramya, Vineetha, Sreeja (4 charts)
2. **Per-fixture per-topic verdicts** — marriage type, career promise tier,
   match verdict (when applicable), 5-tier verdict scale
3. **Output structure checks** — every AI response must contain required
   sections (Direct Verdict, Cuspal Evidence, Timing Windows, Client Summary)
4. **Specific claim checks** — for known-stable claims (e.g. "Manyue's H7 CSL
   is Rahu", "Ramya's 5L Sun in H8"), the AI must cite verbatim
5. **No internal label leakage** — output must NOT contain "RULE N",
   "PR A1.X", "Phase N", "Pattern T1", or any internal scaffolding

The harness runs on every PR that touches:
- Anything in `backend/app/services/llm_service.py`
- Anything in `backend/app/services/compatibility_engine.py`
- Anything in `backend/knowledge/*`
- Anything in `backend/app/services/chart_engine.py`

PRs that do NOT touch these files can merge without the AI regression suite
(it'd be wasteful to run on a pure-frontend refactor).

### The hard rule for v2 work

**No PR in Phases A-D may modify any "sacred" file or function without:**

1. Documented justification in PR description (why is this change necessary?)
2. Pre-change AI output snapshot on the 4 golden fixtures
3. Post-change AI output snapshot on the same 4 fixtures
4. Diff review confirming the change is intentional and quality-improving
5. User approval to merge

Any PR that violates this hard rule must be REVERTED, not patched forward.

### Specifically for the v2 work

**Phase A (Foundation)** — refactor page.tsx, Supabase auth, /health endpoint:
- ZERO impact on AI Analysis. Frontend file extraction only. No backend changes.
- Risk: LOW.

**Phase B (Inquiry Bar MVP)** — new search bar + Haiku detection + view router:
- New AI call (Haiku for inquiry detection). DOES NOT modify existing prompts.
- Composes cards from existing data. DOES NOT modify analysis output.
- Risk: LOW if implemented as additive layer.

**Phase C (Workspaces)** — new /pro and /me routes:
- New routing + new layout. Existing /app stays intact during migration.
- DOES NOT touch AI engines or prompts.
- Risk: MEDIUM (potential for state-management regressions; mitigated by
  keeping existing /app working in parallel).

**Phase D (Killer features)** — Prediction Ledger, AI Apprenticeship, etc.:
- Some features WILL touch AI (esp. Apprenticeship, AI Briefing).
- These MUST go through the regression suite.
- Risk: MEDIUM-HIGH depending on feature.

**Chart Briefing (§14)** — Life-Area Heat Map + AI Briefing (5 bullets):
- The AI Briefing requires a NEW Haiku call. It's a separate function from
  Analysis tab's Sonnet calls.
- Does NOT modify existing Analysis output.
- MUST be a new function with its own system prompt — do not reuse Analysis
  prompt and risk modifying it.
- Risk: LOW if cleanly isolated.

### Summary commitment

**The Analysis tab is the product. Everything else is scaffolding around it.**
Phase A-D is about building better scaffolding. The product (AI Analysis quality)
must not degrade in the process. If a v2 PR forces a tradeoff between "better
UX" and "preserved AI quality" — **AI quality wins, always.**

---

*Doc author: Claude. Date: 2026-05-20.
 Status: 🔒 PLAN LOCKED. AI Analysis quality preservation protocol active.
 Next step: Phase A foundation work begins per user prioritization.*
