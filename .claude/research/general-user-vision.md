# DevAstroAI — General-User Mode Vision

**Status:** Draft v1 — 2026-05-28
**Author:** synthesis of three parallel research streams (consumer-app
psychology, competitor analysis, KP doctrinal differentiation +
premium design references)
**Purpose:** Define the *complete* general-user mode before any code
is written. Astrologer mode is "more or less at ceiling"; this doc
covers the SECOND half — the consumer product — from signup ritual to
daily habit to the moment they pay.

---

## TL;DR — The opportunity in one sentence

> **The first beautiful, mobile-first, KP-rigorous astrology app that
> shows its work, speaks plain language, respects the user's time,
> and never runs a per-minute meter.**

Every word in that sentence names something a major incumbent is
currently failing at:

- *Beautiful* — KP-only apps look like Excel 2010 (KPlogy, KP Stellar,
  KPAstro Touch).
- *Mobile-first* — KP-only apps are desktop/installable software.
- *KP-rigorous* — AstroSage / Astrotalk / ClickAstro default to
  Parashari; KP is buried in dropdowns.
- *Shows its work* — every consumer app is a black box ("you may face
  challenges in relationships").
- *Plain language* — KP-only apps speak in Sanskrit jargon.
- *Respects user's time* — Astrotalk + AstroYogi explicitly drag
  per-minute consults.
- *No per-minute meter* — the #1 trust-killer in Indian consult
  markets (Trustpilot reviews: "deliberately weak call quality so
  users keep paying").

**No Indian-market consumer KP app exists.** The category is open.

---

## 1. Target persona — who exactly are we serving?

The Indian general-public KP astrology user is multiple distinct
people. v1 must pick a sharp primary persona; v2 can broaden.

### Primary (v1)

**"The Decision Seeker"** — 28-42, urban / semi-urban India (AP /
Telangana belt focus, with English overflow for Tier-1 + diaspora),
mid-career or recently married, facing one of these life moments
*right now*:

- "Should I take this job offer? When will my career change?"
- "Is this the right person to marry?" / "Why isn't my marriage
  finalising?"
- "When's the right muhurtha to start my business / move house / file
  a court case?"
- "Will I conceive this year?" / "Is this child's name auspicious?"

They are **not browsing for entertainment**. They have a specific
question, and the app must be the most credible thing they could
have asked. They consult their family pandit too — we must not
contradict him; we must give him a stronger answer with visible
math.

**Why this persona:**

1. They're the high-intent slice that converts.
2. Their questions map 1:1 onto KP's doctrinal moat (Horary, Dasha
   timing, Muhurtha to the minute, compatibility verdict).
3. They share screenshots and reports on family WhatsApp — built-in
   distribution.
4. They're old enough to have money and young enough to trust an app
   over a pandit if the app earns it.

### Secondary (v1.5)

**"The Cultural Participant"** — 35-65, uses daily panchang, marks
muhurthas for family events, observes tithis/nakshatras, mostly
Telugu-speaking. Won't convert through identity content but WILL
convert through impeccable daily-panchang + festival reminders. Free
utility floor.

### Deferred (v2+)

- **Diaspora user** (English-first, US/UK/AUS): same product, English
  interface. v1 ships ready for them via the existing language
  switcher; no extra build.
- **Identity-explorer Gen Z** (Co-Star-style): different product. v3
  if ever.

### Personas we are NOT serving (explicitly say no)

- People who want lottery/gambling predictions.
- People who want pure remedies / gemstones / pooja-selling
  (we don't sell fear).
- People who want live psychic chat marketplaces (we are software,
  not Astrotalk).
- People who want generic Parashari kundli matching (we do KP, and
  KP compatibility is a *verdict* not a 36-point score).

---

## 2. Strategic pillars (the 5 non-negotiables)

These come straight from the research consensus across all three
agents. Every product decision must trace back to one of these.

### Pillar 1 — Decision-first IA (not identity-first)

Indian users open astrology apps to make a decision, not discover
themselves. **The home screen must lead with verbs:**
- "Ask a question" (Horary)
- "Find a muhurtha" (timing)
- "Match a kundli" (compatibility verdict)
- "Today" (panchang + your dasha brief)

Not "Today's mood" or "Your sun sign." The Co-Star pattern fails
this audience.

### Pillar 2 — Show the math, always

KP's doctrinal moat is auditability — every prediction traces to
a cusp sub-lord, a significator chain, a dasha-bhukti window. **The
math is the trust signal.** Even users who don't understand it read
visible specificity as "this is real."

Concrete rule: every verdict screen has a "see why" expansion that
shows the CSL, the significators, the dasha lords, and the RP
overlap. No black boxes. Co-Star and AstroSage AI both get killed in
reviews for hidden logic.

### Pillar 3 — AI as narrator over deterministic engine, never predictor

Indian AI tolerance is LOW in this category — AstroSage AI is rated
"0% accurate" in reviews. **The KP engine predicts (deterministic,
auditable). The LLM narrates (plain-language story, doctrine
explanation, follow-up Q&A).** This positioning is invisible from
the surface but makes our predictions defensible.

Marketing: "Math by Krishnamurti Paddhati, words by AI." Not "AI
astrology."

### Pillar 4 — No fear-based monetization, ever

The biggest open positioning in the entire Indian astrology market.
Every incumbent monetizes through "buy this gemstone or face doom."
This is the #1 trust-killer in 1-star reviews across AstroSage,
Astrotalk, ClickAstro.

**Hard rules:**

- Never end a reading with "you must buy X to avoid Y."
- Never sell remedies / poojas / gemstones / yantras as in-app
  purchases.
- Remedies appear ONLY as informational text ("Traditional remedies
  for Saturn-Mars affliction include…"), never with a buy button.
- Paid tier is **depth** (longer reports, more questions), not
  **safety from doom**.

This rule alone differentiates us in 1-star reviews from day one.

### Pillar 5 — Cultural authenticity is a hard requirement

Telugu rendering must be impeccable. Panchang must match the family
pandit's almanac. KP-Ayanamsa must be visible (no silent Lahiri
fallback). Nakshatra / tithi / muhurtha names spelled correctly in
Telugu. One "sssss" or one wrong rahu kalam and the user churns AND
warns their family.

**Concrete:** dedicated Telugu font (Noto Sans Telugu, NOT Helvetica
fallback). Show "KP-Ayanamsa" badge in chart settings. Cross-reference
panchang values against published Telugu almanac (Kashi, Mulugu) on
launch day; deviation = a hotfix release.

---

## 3. The five killer features — KP's doctrinal moat, consumer-translated

These are the five things ONLY a KP-rigorous engine can do
credibly. Each maps to a high-intent consumer query and a
shareable artifact.

### Killer #1 — "Ask the Stars" (KP Horary engine)

**The unfair advantage.** No Vedic / Western consumer app delivers
a binary yes/no with this level of doctrinal weight. KP Horary takes
a number 1-249, the question moment, and the cuspal sub-lord of the
relevant house — and outputs a *verdict* with timing.

**Flow:**

1. User types question in plain English/Telugu ("Will I get this
   job?").
2. Engine classifies the house (job = 10, marriage = 7, child = 5,
   etc.).
3. Ceremonial friction screen: *"Take a breath. Hold your question
   in mind. When ready, pick a number 1-249."* (One Sec lineage —
   slowness IS the product, makes the answer feel earned.)
4. User picks number → chart is cast for the question moment.
5. **Verdict screen:**
   - Hero: serif "YES" / "NO" / "FAVORABLE BUT DELAYED" — typography
     does the heavy lifting.
   - Subtitle: timing window ("April 2027, third week").
   - Below: "See why" expansion → CSL, significators, RPs.
   - Tap-to-share: WhatsApp-ready card.

**Output ceiling:** "Your 7th cusp sub-lord Saturn is in the star of
Mars, which signifies 2-7-11. Marriage is promised. Likely period:
Sun-Jupiter sub-bhukti, March-May 2027."

### Killer #2 — "Now-Planets" (live Ruling Planets widget)

**The synchronicity overlay.** Ruling Planets are the planets in
charge *right now* (ascendant + Moon sign/star/sub lords at this
moment). KP doctrine treats them as live confirmation signals.

**Implementation:**

- Small pulsing widget on the home screen: "Right now, Venus +
  Jupiter are ruling. Favorable for love + new ventures."
- Auto-refresh on location/time change.
- Tap → full RP breakdown + "what this means for you" narrative.
- Push notification when RPs align with the user's natal favorable
  set ("Your Venus is being ruled right now — auspicious window for
  partnership matters").

**Doctrinal honesty:** the engine knows when RPs align with the
native's significator chain — push when it's a real confluence, not
spam.

### Killer #3 — "Life Tape" (Dasha as scrubable timeline)

**The highest-leverage visual idea.** Dasha is a deterministic
20-year roadmap of life chapters. Every other app renders it as a
tree of brackets. We render it as a **horizontal scrubable timeline
with "you are here" pulse** — Apple Health + Spotify Wrapped lineage.

**Flow:**

- Open Life Tape → see your life from birth to ~120 years, painted
  by dasha lord colors (purple Rahu, gold Jupiter, etc.).
- Pulse on current MD-AD-PAD position.
- Scrub left or right → preview future windows.
- Each window: hero card with "Life Chapter: Jupiter MD (2024-2040)",
  3 KP-doctrine themes ("Career expansion in 2027-29 Mercury Bhukti",
  "Marriage window in Venus Antara, late 2026"), warnings ("Saturn
  Bhukti = pause/restraint, 2030-32").
- Tap any window → AI-narrated full reading for that period.

**Why this wins:** turns abstract dasha into a *time machine you
can hold*. No astrology app does this. Shareable to WhatsApp ("look
at my Saturn period!").

### Killer #4 — "Muhurtha to the Minute"

**The precision advantage.** KP muhurtha narrows the broad Vedic
panchang to 15-30 minute windows by casting a chart for the proposed
moment and checking the cusp sub-lord.

**Use cases:**

- Business launch / contract signing / vehicle purchase / griha
  pravesh / namakaran / vehicle puja.
- User picks event type + date range + city.
- Engine returns 1-3 windows per day, color-coded by quality (gold =
  best, silver = good, gray = avoid).
- Each window: tap → "why this 25 minutes" doctrine card +
  add-to-calendar / set-reminder.

**Verdict typography:** "June 14, 11:42-12:07 AM IST" as the hero.
Caption: "Cuspal sub-lord favors 2-10-11, ascendant unafflicted."

### Killer #5 — "Bond Verdict" (compatibility with words, not score)

**Replace the 36-guna lottery.** Vedic Ashtakoot says "28/36, good
match" with no explanation. KP says:

> "His 7th CSL Saturn signifies 2-7-11 → marriage is promised from
> his side. Her 7th CSL Venus signifies 2-7 → also promised. Cross-
> signification: his 5th lord is in her 7th → mutual emotional bond
> strong. Friction risk: her 6th sub-lord = his Mars → workplace /
> ego friction patterns. Verdict: Bonded, with one watch-point."

**Output is a narrative card,** not a score. The verdict word is the
hero ("BONDED", "BLESSED", "CHALLENGING", "BLOCKED"). Subtitle: 1
sentence why. Body: 3 themes (promise, friction, timing). Share-ready
WhatsApp card.

---

## 4. The user journey — signup to daily habit

Designed in 7 phases. Each phase has a job, a peak moment, and a
churn risk.

### Phase 1 — First impression (landing page → app open)

- **Job:** establish "this is a serious KP app, not gimmicky"
- **Peak moment:** the serif "Decode the cosmos" hero (already
  shipped) + a *visible* "KP-Ayanamsa · Swiss Ephemeris" badge
- **Churn risk:** any cosmic-purple-glitter aesthetic = instant
  churn for our persona

### Phase 2 — Onboarding (birth details collection)

- **Job:** collect birth details + persona (so we know which
  killer feature to lead with)
- **Peak moment:** a single screen ritual — name + DOB/TOB/POB + ONE
  question: "What brings you here today?" with 4 chips: Marriage /
  Career / Timing / Curious
- **Churn risk:** long form with too many fields. Place picker MUST
  work first try. (Already polished.)

### Phase 3 — First chart reveal (the "wow" moment)

- **Job:** prove accuracy in 5 seconds
- **Peak moment:** chart renders with a fade-in serif headline:
  "**You are a Sun-in-Virgo, Capricorn ascendant, Rahu Mahadasha
  native.**" + immediately below: a 3-sentence personal note
  ("Right now you're in a phase about restructuring how others see
  you…"). Math visible behind a "see why" tap.
- **Churn risk:** if the chart fails to render or shows wrong nakshatra,
  user is gone forever.

### Phase 4 — First killer feature (depending on Phase 2 answer)

Routed by the chip they picked in onboarding:

- **Marriage** chip → straight into "Bond Verdict" with partner
  details (or a placeholder showing "Add partner to see your
  bond")
- **Career** chip → straight into "Life Tape" with their current
  Bhukti highlighted + 3 career themes
- **Timing** chip → straight into "Muhurtha to the Minute" with
  upcoming auspicious windows
- **Curious** chip → "Ask the Stars" (Horary) with a guided demo
  question

This is the **first paid-feature touchpoint.** First use is free —
they get one full verdict screen with all the math visible.

### Phase 5 — The follow-up question (the AI moment)

- **Job:** show that this app *understands* their specific
  question, not generic horoscope
- **Peak moment:** after the first verdict, an inline "Ask anything
  about this" input. User types a follow-up; AI narrator (grounded
  in their chart's CSL chain + dasha) answers with citation: "This
  conclusion comes from your H7 sub-lord Saturn at 23° in Rohini,
  which signifies 2 (family commitment) and 7 (partnership)."
- **Churn risk:** if AI sounds generic, all credibility evaporates.
  The streaming Anthropic + KP-grounded prompt system already in
  astrologer mode IS the moat — wire it identically.

### Phase 6 — The habit hook (return tomorrow)

- **Job:** create a reason to come back tomorrow without paying
- **Peak moment:** "Now-Planets" widget on home + opt-in push:
  "Tomorrow morning, RPs align with your career sector — get your
  daily window?"
- **Daily push content** (deterministic, NOT generic):
  - 1 line of today's panchang relevant to the user
  - 1 line of personal dasha context
  - 1 line of "today's window for X" if RPs align
- **Churn risk:** generic horoscope-app spam. Pushes MUST trace to
  the native's chart math, not a sun-sign template.

### Phase 7 — The paywall (only after value delivered)

- **Job:** convert at exactly the right moment, never before
- **Peak moment:** user has used the app 3+ times, asked 2+ AI
  follow-ups, is on a high-value query → soft paywall with a
  specific, time-bound offer: "Unlock unlimited Horary questions
  + full 14-section life report for ₹X/year."
- **Churn risk:** paywall on first session = instant uninstall.
  Paywall after value = 26% conversion (category norm).

---

## 5. Information architecture (mobile-first)

Based on Pillar 1 (decision-first) + Notion's progressive disclosure
principle.

### Home (the front door)

A single scrollable home with these stations top-to-bottom:

1. **Hero greeting** — name + current dasha line (1 sentence)
2. **Now-Planets pulsing widget** — RPs right now + 1-line meaning
3. **Today's panchang strip** — date / tithi / nakshatra / rahu kalam
4. **3-card action row** — "Ask the Stars" / "Find a Muhurtha" /
   "Bond Verdict" (the killer features, never hidden)
5. **Life Tape preview** — current chapter card + "See full timeline"
6. **Yesterday's question** (if any) — quick return to last verdict
7. **Daily insight** — 1 deterministic, chart-specific line of the
   day

### Bottom nav (4 primary tabs + More)

- **Home** — the above
- **Ask** — Horary + AI chat in one surface
- **Chart** — full KP chart (south/north/east) + planets + houses
  + dasha tree (progressively disclosed)
- **Today** — panchang + RPs + muhurthas + festivals
- **More** — Compatibility, Life Tape (Dasha timeline), settings,
  saved questions, language

### Critical: NO tab for "Horoscope"

Co-Star's daily horoscope is the wrong frame for our persona. The
"daily insight" lives ON the home screen as a single deterministic
line. Not a tab. Not a feed. Not a scroll-bait surface.

### Progressive disclosure

- Day 1 visible: Home, Ask, Chart, Today, More
- Locked under More until earned: Life Tape (need natal chart),
  Compatibility (need partner details), Saved Questions, Advanced
  KP settings (Sub-sub-lord, ayanamsa toggles, expert mode)

---

## 6. Design language (the visual moat)

### 6.1 Color discipline (60-30-10, lift from Notion + Co-Star)

- **60% neutral surface** — `#09090f` background, `#16161f` cards
- **30% text** — `#f0f0f0` primary, `#888899` muted
- **10% accent** — gold `#c9a96e` used like punctuation:
  - The verdict word ("YES" / "BONDED" / "April 2027")
  - The active tab underline
  - The Now-Planets pulse
  - The current dasha highlight

**Hard rule:** gold appears ONLY on the answer. Everything else is
monochrome. This is what makes the answer feel earned.

### 6.2 Typography hierarchy (verdict-first)

- **Hero verdict (28-42px, DM Serif Display)** — the answer is the
  star
- **Subtitle (14-15px DM Sans, muted)** — what / when / where
- **Body (13px DM Sans)** — narrative
- **Caption (10-11px DM Sans uppercase, letterspaced)** — section
  labels, KP terms
- **Telugu fallback:** Noto Sans Telugu, never Helvetica fallback

### 6.3 Motion philosophy (Linear lineage)

- Reveal easing `[0.16, 1, 0.3, 1]` — entrances, fades
- Overshoot easing `[0.34, 1.56, 0.64, 1]` — ONLY moments of joy
  (verdict reveal, share success)
- Continuous loops `[0.45, 0, 0.55, 1]` — breathing, RP pulse
- No bounce on functional UI

### 6.4 Information density (Things 3 lineage)

- Whitespace is a feature. Cards have generous padding.
- Each numeric value (degrees, dates, scores) gets typographic respect
  — it's not buried in a sentence, it's the focal point with
  caption.
- One idea per screen on mobile; users scroll to see more, never
  pan/swipe in surprising directions.

### 6.5 Ceremonial friction (One Sec lineage)

- Horary number picker: 2-second "breathe" interstitial before the
  number wheel appears.
- Muhurtha picker: a "set your intention" line before the windows
  generate.
- Bond verdict: "this verdict considers both charts in entirety; take
  time to read" — never present as a quick lookup.

### 6.6 Things to BAN

- Purple gradients
- Glitter, stars-as-cosmic-decoration, zodiac wheels-as-aesthetic
- Crystal ball / sparkly cursor / "magic" UI
- Bouncy / playful icons that betray seriousness
- Anything that signals "this is a fun toy" — we are a precision
  tool for real decisions

---

## 7. Engagement loop (daily / weekly / monthly)

### Daily

- **Morning push (7am local)** — "Today, Mars rules. Your
  Saturn-Bhukti continues its restraint phase. Best window for new
  starts: 11:42 AM."
- **Home open** — Now-Planets widget + today's panchang chip
- **Habit anchor:** the panchang itself. Telugu families consult
  panchang before scheduling anything. We are the panchang they
  actually trust because it's KP-Ayanamsa.

### Weekly

- **Sunday push** — "Your week ahead: Tuesday is your Mercury-Mars
  day; expect movement on the matter you asked about last week."
- **Recap card** on Sunday home — 3 lines: what RPs favored, what
  the user asked, what's coming.

### Monthly

- **First-of-month report** — "Your June, in 5 minutes" — current
  Bhukti themes, 2 best windows for activity, festivals, panchang
  highlights. Shareable to WhatsApp ("forward to family").

### Event-driven

- **Bhukti changes** — push the day a major sub-period starts:
  "You enter Jupiter-Mercury Bhukti today. Expansion + communication
  themes for 13 months."
- **RP-natal alignment** — push when ruling planets align with the
  native's favorable significators ("Right now your Venus is being
  ruled — auspicious for partnership questions").
- **Festival reminders** — Karthika Masam, Sankranti, Ugadi, Diwali,
  Akshaya Tritiya. Cultural anchors.

---

## 8. Pricing model (recommended)

**Hybrid: free utility + flat-fee depth, NO per-minute, NO live
human marketplace v1.**

### Free tier (forever-free, never paywalled)

- Birth chart (south/north/east) + planets table
- Daily panchang for your location
- Now-Planets widget + 3 daily insights
- 1 Horary question / day
- 1 Muhurtha query / week
- 1 Bond Verdict / month
- Full Life Tape preview (3 chapters visible)

### Paid tier — "Premium" (recommended: ₹999/year or ₹149/month)

- Unlimited Horary questions
- Unlimited Muhurtha queries (any event type, any date range)
- Unlimited Bond Verdicts
- Full Life Tape (all chapters + scrubable timeline)
- Saved questions history + AI follow-up unlimited
- Multi-chart (up to 5 charts — partner, parents, child)
- PDF reports (the 14-section Phase-14 PDF engine, branded "Annual
  KP Report" / "Marriage Compatibility Report" / etc.)
- Telugu + English bilingual exports

### Hard rules

- **No per-minute meters.**
- **No remedy / gemstone / pooja in-app purchases.**
- **No dark-pattern auto-renew.** Annual renewal = explicit re-opt-in
  email 7 days before charge, cancel anywhere in 1 tap.
- **No upsells inside readings.** A verdict screen has zero CTAs to
  buy anything.

### Future tiers (deferred)

- **Pro consultation** — flat-fee async written reports by a real
  KP astrologer (Manyue's father + 2-3 vetted astrologers). ₹2,500
  one-off. NOT per-minute. NOT live chat. ASYNC = no time pressure
  on either side. Yodha-style.

### What we will never do

- Live per-minute chat marketplaces (that's Astrotalk; let them have
  it; they lose trust every year)
- Pay-to-remove-ads
- "Buy this gemstone or your career suffers"

---

## 9. What to revamp vs keep (from current state)

I haven't read the current general-user-mode source code as you
instructed. Based on the astrologer-mode pieces already shipped,
here's what likely transfers and what should be torn down.

### Keep (already at ceiling)

- Backend (KP engines, Swiss Ephemeris, Horary, Muhurtha, Match)
- Frontend design tokens (gold accent, DM Serif Display, motion
  tokens from theme.ts)
- The astrologer-mode HousePanel sections (occupants, sub-lord chain,
  4-level significators) → reuse via HousePanelContent
- PDF engine v2 (14 sections, no AI in PDF, deterministic) → rebrand
  as "Premium KP Annual Report"
- Mobile bottom-nav + drawer pattern → keep, just swap the tabs
- The AI streaming chat + KP-grounded prompt system → keep, that's
  the moat

### Revamp completely (general-user mode)

- The home screen layout (whatever exists today → the 7-station
  home described in §5)
- The onboarding flow (single-screen ritual with persona chip)
- The topic chips (replace "Marriage / Career / Health / Foreign
  Travel / Children / Education / Property / Wealth / Finance /
  Legal" grid with the 5 killer-feature CTAs)
- The default landing tab after onboarding (Home, not Chart)
- Pricing pages / paywalls (currently none → add the Premium tier)

### Build new

- "Now-Planets" widget (engine exists in horary RP code; needs
  consumer wrapper)
- "Life Tape" scrubable Dasha timeline
- "Muhurtha to the Minute" consumer flow (engine exists; needs
  consumer wrapper + event-type selector)
- "Bond Verdict" narrative card (replaces match score grid)
- Ceremonial friction interstitials (Horary number picker, muhurtha
  intention)
- Daily push notification system
- The Premium paywall + Stripe / Razorpay integration

---

## 10. Pre-launch checklist (before going public)

This is the "are we ready to release to general public" gate.

### Must-have (P0 — gate the launch)

- [ ] All 5 killer features shipped (Horary, Now-Planets, Life Tape,
      Muhurtha, Bond Verdict)
- [ ] Mobile-first IA shipped (§5)
- [ ] Telugu rendering verified against 3 published almanacs (Mulugu,
      Kashi, one TN almanac)
- [ ] KP-Ayanamsa badge visible in chart settings
- [ ] No per-minute meters anywhere
- [ ] No remedy / gemstone in-app purchases
- [ ] PDF report renders correctly in Telugu (Noto Sans Telugu)
- [ ] Payment integration (Razorpay for INR, Stripe for international)
- [ ] Cancellation flow ≤ 1 tap, no dark patterns
- [ ] Privacy policy + terms covering birth-data sensitivity
- [ ] App Store listing (iOS PWA + Play Store) with screenshots
- [ ] Onboarding works in EN + TE + TE-EN modes
- [ ] Error toasts (the AppToast we just shipped — verify all error
      paths trigger it visibly)
- [ ] Place picker works on slow connections (Nominatim retry +
      fallback)
- [ ] Mobile keyboard doesn't hide input (verified via
      `interactiveWidget`)
- [ ] Streaming AI works under flaky network (resume / retry)

### Should-have (P1 — ship soon-after)

- [ ] Daily push notification system (web push first; native later)
- [ ] WhatsApp share intent integration (deeplinks + share cards)
- [ ] Multi-chart support (partner / parents / child)
- [ ] Saved questions history
- [ ] Bilingual PDF reports (Telugu + English)
- [ ] Analytics that respect privacy (no birth data sent to analytics)

### Nice-to-have (P2 — post-launch iterate)

- [ ] Apple Watch complication (Now-Planets)
- [ ] Calendar integration (auto-add muhurthas to Google Calendar)
- [ ] Web push subscription for desktop browser users
- [ ] Festival reminder push (Karthika, Sankranti, Ugadi, Diwali)
- [ ] Community / referral system (NOT chat — referral codes only)

### Pre-launch testing (P0)

- [ ] 50-chart accuracy regression — Manyue, Ramya, Vineetha, Sreeja
      fixtures + 46 fresh charts
- [ ] Compare 10 muhurthas to a verified Mulugu panchang
- [ ] Compare 10 Bond Verdicts to a senior KP astrologer's reading
- [ ] Compare 10 Horary verdicts to KSK textbook examples
- [ ] App store review pre-screen (5 KP astrologer friends test for
      a week, send feedback)

---

## 11. Open decisions — your call before we build

Three things only you can decide. Pick one option per question.

### Q1. Primary persona — confirm or correct?

My research-driven default: **The Decision Seeker (28-42, AP/Telangana,
specific life question)** as v1 primary, with **Cultural Participant
(daily panchang)** as the free-utility floor.

**Alternative:** lead with Cultural Participant first (panchang +
festivals are the highest-frequency entry point), drive paid conversion
from Decision Seeker secondary.

**My recommendation:** primary = Decision Seeker, but free panchang +
RPs are the daily-utility anchor that brings BOTH personas back. They
coexist on the same home screen.

### Q2. Pricing gut — confirm or correct?

My recommendation: **₹999/year flat (or ₹149/month), no per-minute
ever, no remedies ever.** Async written consultations as a future
tier (₹2,500/one-off) once we have astrologers vetted.

**Decisions you make:**

- Annual price point — ₹999 / ₹1,499 / ₹1,999?
- Free tier limits — 1 Horary/day or 1 Horary/week?
- Are consultations v1 or post-launch?

### Q3. Astrologer in the loop — yes or no for v1?

The single biggest fork in the product:

- **Option A — Software only v1.** No live or async astrologer
  consultations. We are 100% KP engine + AI narrator. Faster to
  ship, smaller scope, but limits revenue ceiling (Astrotalk's
  ₹1,182 Cr is mostly consultations).
- **Option B — Software + async astrologer reports v1.** Add 1-3
  vetted astrologers (starting with your father?) who deliver
  flat-fee written reports within 48h. Higher revenue, more trust,
  but adds operational complexity.

**My recommendation:** **A for launch, B as the v1.5 expansion** —
gives us 3-6 months of pure-software ramp, then adds consultations
when product-market fit is proven and astrologer onboarding is
designed properly. Operational mistakes early kill trust.

### Q4. What hard NOs do you want to lock in?

Help me list what's permanently off-limits. My defaults:

- [ ] No remedies / gemstones / poojas as IAP — ❓ confirm
- [ ] No per-minute consultations — ❓ confirm
- [ ] No fear-based copy ("you must…") — ❓ confirm
- [ ] No identity content ("today's mood for Scorpios") — ❓ confirm
- [ ] No live psychic chat marketplaces — ❓ confirm
- [ ] No dark-pattern auto-renew — ❓ confirm
- [ ] No data sharing / sale of birth records — ❓ confirm
- [ ] Astrology tab as a "horoscope feed" — ❓ confirm
- [ ] Add yours…

---

## 12. Three-month roadmap (suggested)

If we get sign-off on this vision:

### Month 1 — Foundations (Phase G1)

- Revamp home + onboarding (§4 Phase 1-3)
- Build "Ask the Stars" Horary consumer flow
- Build "Now-Planets" widget
- Wire AppToast to all error paths (already shipped)

### Month 2 — Killer features (Phase G2)

- Build "Life Tape" Dasha timeline
- Build "Muhurtha to the Minute" consumer flow
- Build "Bond Verdict" narrative card
- Daily push notification system

### Month 3 — Monetization + launch (Phase G3)

- Premium paywall + Razorpay/Stripe
- Pre-launch testing (regression + KP astrologer review)
- Marketing landing page revamp
- App Store / Play Store listings
- Soft launch to Telugu KP astrologer network (your father's
  referrals)
- Public launch

---

## Closing thought

The research is unambiguous: **the white space is real and large,
and the existing KP-rigorous engine + the design language already in
place put DevAstroAI within striking distance of being the first
credible consumer KP app in India.** The work between here and a
public launch is bounded — 5 killer features, 1 IA revamp, 1
monetization integration, careful Telugu rendering, no fear-based
upsells.

The thing to protect at all costs is the cultural authenticity.
Astrotalk lost trust over per-minute meters; AstroSage lost trust
over ad spam and "0% accurate AI"; ClickAstro lost trust over
copy-paste reports. **The mistake to avoid is shortcuts that work
in the US but corrode trust in India.** This document tries to
internalize that learning at every layer.

Next step: your decisions on Q1-Q4 in §11. Then we plan Phase G1.
