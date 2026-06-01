# General-User Home Screen — Three Radical Concepts

**Status:** Concept exploration, no references consulted
**Constraint:** Each concept must (a) be radically different from the others,
(b) make all 5 killer features (Horary, Now-Planets, Life Tape, Muhurtha,
Bond Verdict) coherent in one interface, (c) feel like nothing existing in
the astrology category, (d) be technically buildable in 4 weeks.
**Author note:** Written without looking at any astrology / consumer app
screenshots while drafting. Intentional choice to avoid anchoring.

---

## How to read this

Three concepts follow. Read each, then read my "honest comparison" at the
end. Each concept describes:

1. **The dominant metaphor** — what this screen actually *is*, in one line
2. **The first two seconds** — what your eye sees when the app opens
3. **The five killer features** — how they're surfaced (or not)
4. **The defining moment** — the one thing about this screen that no other
   astrology app does
5. **What it visually rejects** — the conventions it explicitly says no to
6. **Honest weaknesses** — where this concept could fail

Concepts are intentionally named with no marketing polish — these are
working titles to make them easier to talk about.

---

# CONCEPT A — "The Almanac"

## Dominant metaphor

**The app is your living panchang. Time is the primary interface — not
tabs, not menus, not widgets. You navigate your life by scrolling
through days.**

It's not a calendar in the appointment-book sense. It's an almanac in
the *pandit's leather book* sense — every day has a personality, a
ruling cosmic state, a verdict for what's auspicious. Today is the
one you can touch; yesterday and tomorrow are visible at the edges,
inviting scroll.

## The first two seconds

Open the app. You see a vertical column of days, three visible — yesterday
(faded above), today (in full bloom, centered), tomorrow (faded below).

The center "today" card occupies maybe 60% of the screen. It's serif-heavy,
gold ink on near-black paper. The top of today's card:

> **Wednesday · Shukla Dwadashi · Chitra**
> *Mars rules · Auspicious window 11:42–12:07*

Below that, in serif:

> *You are in Saturn Mahadasha · Jupiter Bhukti.*
> *Today, Mercury supports decisions about communication and family
> matters. Avoid major commitments after 14:30.*

Below that, three small cards in a row — what I'll call **"glances"**:

- "Now Planets" — 5 pulsing dots showing current RPs
- "Open questions" — count of questions you've asked recently
- "Muhurtha" — the day's best windows

Above today's card, the edge of yesterday's faded card peeks in. Below,
tomorrow's. The user scrolls vertically through their life.

## The five killer features

| Killer feature | How it appears in The Almanac |
|---|---|
| **Horary ("Ask the Stars")** | Pull-down from anywhere = a question prompt. Available always. Not on home screen as a CTA — it's the *universal verb* of the app. |
| **Now-Planets** | Lives as a glance card under today. Tap → full RP page. Always visible because today is always visible. |
| **Life Tape (Dasha timeline)** | Long-scroll. Scroll WAY down (or use a "zoom out" gesture) — days collapse into weeks → months → years → your Bhuktis → your Mahadashas. The almanac IS the Life Tape. They're the same surface at different zoom levels. |
| **Muhurtha** | Tap any day card → see that day's best windows + ability to ask for muhurtha for a specific event ("name a baby on this day?"). |
| **Bond Verdict** | Pinned charts (your partner, family) appear as ghosted gold ribbons across day cards. You scroll and see "your wife's Saturn Bhukti starts on day X" laid over your own days. Multi-chart is *spatial* in the Almanac. |

## The defining moment

**Pinch-to-zoom on days → weeks → months → years.** The same screen,
the same metaphor, just compressed. At month-zoom, you see big colored
bands of your Bhuktis like geological strata. At year-zoom, you see
your whole life painted by dasha lord colors — Spotify Wrapped meets
Apple Health meets a vedic almanac. No other astrology app treats
the chart-of-your-life as a *scrubable physical artifact*.

## What it visually rejects

- **Tabs** — there's no nav. The screen is one surface, zoom-driven.
- **Dashboards** — no widgets-grid, no card-cluster aesthetic.
- **Action CTAs** — no "Tap to ask" buttons. The verbs are gestures
  (pull-down to ask, long-press to mark, pinch to zoom).
- **Identity content** — never "today's mood for Capricorns." Today's
  content is *yours* alone.
- **Horoscope feeds** — there's no scroll of generic content. You can
  only scroll your own timeline.

## Honest weaknesses

1. **Discoverability is hard.** First-time users may not know to pull
   down for Horary or pinch to zoom. Needs onboarding hints.
2. **Vertical column risks feeling boring** if every day looks the same.
   Need visual variation by panchang quality (festival days bloom,
   inauspicious days desaturate, dasha-shift days have a gold line
   across).
3. **The "open questions" glance** competes with the day card for
   attention. Could feel cluttered if done wrong.
4. **Multi-chart as "ghost ribbons" is poetic but might be unreadable**
   in practice. Needs careful execution.

---

# CONCEPT B — "The Oracle"

## Dominant metaphor

**The app is a presence you consult. Dialogue is the entire interface.
You ask, it answers. There is no dashboard. There is no menu. There
is the question and the verdict.**

It's the ChatGPT pattern applied to astrology — but where ChatGPT is
infinite open-ended chat, the Oracle is *constrained*: every answer is
KP-grounded, every verdict is auditable, every reply can be expanded
into the math. The AI is the spokesperson; the deterministic KP engine
is the priest.

## The first two seconds

Open the app. The screen is nearly empty. Centered, slightly above the
vertical middle:

> **What do you want to know?**

In elegant DM Serif Display, ~32px, soft off-white on near-black.

Below it, a question input field with subtle gold border. Below that,
four ghost-text suggestions (in muted gray) — *not* buttons, just
hints of what to type:

> *Will I get this job?*
> *When will I marry?*
> *Is June 14 a good day to sign the contract?*
> *Am I compatible with [name]?*

Above the question, in tiny letterspaced caps, a single discreet line:

> WED · SHUKLA DWADASHI · CHITRA · MARS RULES

Below the input — and only after the first session — your **"open
questions"** appear as a soft list:

> *Tuesday, 4:12 PM — "Will I get the Bangalore offer?"*
> *Verdict: Yes, but delayed (June). · Resolving*
>
> *Last Sunday — "Best muhurtha to start course?"*
> *Verdict: June 14, 11:42 AM. · Pending*

That's the whole screen. No tabs. No widgets. No grid.

## The five killer features

| Killer feature | How it appears in The Oracle |
|---|---|
| **Horary** | The default verb. Type a question → Horary engine routes. The number-picker ceremony (1-249) appears as a modal. |
| **Now-Planets** | The discreet caps line at top. Tap → full RP page. Subtle, always present, never dominant. |
| **Life Tape** | Type "What's my life chapter?" or "How long is my Saturn period?" — AI routes to Life Tape view. Or accessible via long-press on the title. |
| **Muhurtha** | Type "Best date for [event]" — routes to Muhurtha. The AI knows. |
| **Bond Verdict** | Type "Am I compatible with [name]?" — routes to Bond. AI prompts for partner birth details if not on file. |

**Everything is dispatched through natural-language input.** The AI
parses your intent, the KP engine runs the math, the verdict comes back
with full audit trail.

## The defining moment

**The screen never has more than 3 things on it at once.** This is
radical for a feature-dense app. The architecture is: question → verdict
→ history. Anything else is summoned. Categories like "Compatibility"
and "Muhurtha" never appear as buttons — only as *what the AI did with
your question*.

A user asks "Will I get this job?" — gets a verdict screen with serif
"YES — March 2027." Beneath it: full math expansion, an "Ask Gemini ↗"
cross-check link, a "Save" action. Then back to the empty Oracle. Asks
"What about my partner — will it work out?" — Bond Verdict appears. The
home screen is just *where the asking happens*.

## What it visually rejects

- **All grid layouts** — no card grids, no widget tiles.
- **All tabs** — no bottom nav, no top tabs. Single surface.
- **All discoverability via buttons** — you discover features by
  *asking* them into existence.
- **Decoration** — almost no images, no illustrations, no chart drawings
  on home. Words are the only ornament.
- **Daily horoscope** — there is no scroll, no feed, no content.

## Honest weaknesses

1. **The "type to discover" pattern is severe.** Users who don't know
   what to ask will bounce. The ghost-text suggestions help but aren't
   enough — needs an onboarding tutorial that's *itself* a conversation.
2. **Voice input becomes obligatory.** Typing on mobile is friction;
   voice + Web Speech API has to work flawlessly day 1.
3. **No spatial memory.** Users can't "remember where the muhurtha tab
   is" because there isn't one. Power users may prefer a tab.
4. **Hard to advertise.** Every other astrology app's screenshots show
   features. Ours show a blank prompt. Marketing has to lean on
   *answers*, not interface.
5. **Easy to copy.** ChatGPT made this pattern table-stakes. Our moat
   has to be 100% in the KP-grounded answer quality, not interface
   novelty.

---

# CONCEPT C — "The Compass"

## Dominant metaphor

**The app is a circular instrument. Your life's astrological state is
visible at all times as a literal compass — and you rotate it to
navigate. Space is the interface, not time, not language.**

Think: a brass-and-gold astrolabe on your phone. Concentric rings.
A pointer. Your finger spins the instrument. It always knows where
you are in your dasha, what's ruling right now, and which direction
the cosmos is pointing today.

This is the spatial / geometric concept — the opposite of Oracle's
text-everything and Almanac's vertical-time. Every feature has a
*position* on the instrument.

## The first two seconds

Open the app. The screen is dominated by a circular instrument — about
75% of the viewport.

**Center disc** (small, ~80px): your current Mahadasha lord, painted
in its color (Saturn = deep slate, Jupiter = soft gold, Venus = pearl-
pink). Below the disc, in tiny serif: "Saturn Mahadasha · year 8 of 19".

**Inner ring** (~140px): five small pulsing dots — today's Ruling
Planets. They move slowly throughout the day (because RPs actually
change with the rising sign).

**Middle ring** (~200px): four labeled cardinal positions — the four
killer-feature anchors:
- North: **Ask** (Horary)
- East: **Bond** (Compatibility)
- South: **Life Tape** (Dasha journey)
- West: **Muhurtha** (Timing)

These are not buttons exactly — they're *destinations* on the
compass. You rotate the instrument to point the needle at one, or
tap directly to jump.

**Outer ring** (~280px): a faint time-band showing the next 12 months,
with your upcoming dasha-shift marked. You scrub the outer ring with
finger to scrub time.

**The needle** in the center always points to today's *recommended
direction* — meaning the AI has analyzed today's RPs against your
chart and decided which feature is most relevant right now. "Today,
your Venus is being ruled — the needle points to Bond. Auspicious
day for relationship questions."

Below the compass, three lines of context (the panchang strip, your
current Bhukti, today's auspicious window).

## The five killer features

| Killer feature | How it appears in The Compass |
|---|---|
| **Horary** | The North cardinal point. Tap → goes into Ask flow with ceremonial number picker. Always visible. |
| **Now-Planets** | The inner ring is the Now-Planets. They're the *most visible thing on the home screen at all times*. |
| **Life Tape** | The South cardinal point. Tap → enter timeline view. |
| **Muhurtha** | The West cardinal point. Tap → event-type selector + date range. |
| **Bond Verdict** | The East cardinal point. Tap → choose partner / family member to compare. |

**Plus** the outer ring lets you scrub time forward/back — which
means RPs, dasha, and the needle's recommendation all update for the
future moment you're examining. It's a *time-travel compass*.

## The defining moment

**The needle's recommendation changes throughout the day** based on
your chart's interaction with current RPs. At 9am: needle on West
(Muhurtha) because Mars rules and it's good for action. At 2pm: needle
shifts to East (Bond) because Venus enters as the sub-ruler. The
compass *breathes*.

And — most importantly — you can **scrub the outer ring forward to a
future date** and the entire compass re-renders for that moment. "Show
me what my chart looks like June 14 at 11am" — the inner ring shows
the RPs for that future moment, the needle points to what'll be most
auspicious then. This is something no astrology app has ever done.

## What it visually rejects

- **Lists** — everything is radial. No vertical scrolling on home.
- **Tabs** — features are positions, not pages.
- **Cards** — the interface is geometric, not card-based.
- **Text-first** — the chrome is visual; words are minimal labels.
- **Static screenshots** — this concept lives in motion. A still image
  doesn't convey it.

## Honest weaknesses

1. **Most complex of the three to build.** Real circular interface
   with rotation, scrub gestures, animated rings — a serious engineering
   investment.
2. **Could feel gimmicky.** "Astrology compass" sounds clever; might
   end up feeling like a fidget toy. Execution must be premium-
   instrument feel, not childish-game feel.
3. **Discoverability of the time-scrub is hard.** Without onboarding,
   users won't know they can drag the outer ring.
4. **Doesn't scale to power users.** Eventually users want lists, search,
   filters. The Compass is poetic for the first 100 sessions, may feel
   limiting after.
5. **Hard to translate to landscape / tablet / desktop.** Strongest on
   mobile portrait; awkward elsewhere.

---

# HONEST COMPARISON

## What each one IS, in one line

- **Almanac:** "My astrological life is a scrubable timeline."
- **Oracle:** "I have a question; the cosmos answers."
- **Compass:** "I am here, and the universe is pointing me there."

## Strengths matrix

| Dimension | Almanac | Oracle | Compass |
|---|---|---|---|
| Feels novel (no other app does this) | ★★★★ | ★★★ | ★★★★★ |
| Feels intuitive on first open | ★★★ | ★★ | ★★ |
| Daily-return habit-forming | ★★★★ | ★★★ | ★★★★ |
| Premium-feel possible | ★★★★ | ★★★★★ | ★★★★ |
| Easy for marketing screenshots | ★★★ | ★★ | ★★★★★ |
| Buildable in 4 weeks | ★★★★ | ★★★★★ | ★★ |
| Scales to power users long-term | ★★★★ | ★★★ | ★★ |
| Distinct from all incumbents | ★★★★ | ★★★ | ★★★★★ |

## Where each shines / fails

### Almanac is best if…
…we believe the *daily-panchang habit* is the foundation of trust with
Indian KP users. The chart-of-your-life-as-a-scrubable-timeline is its
unique insight. **Risk:** could feel like a sophisticated calendar app
if execution doesn't make the dasha-painting beautiful.

### Oracle is best if…
…we believe the AI-grounded-in-KP is our actual moat and we want to
expose it directly. **Most differentiated visually** from the entire
astrology category. **Risk:** ChatGPT-clone vibe, and harder to teach
new users what they can ask.

### Compass is best if…
…we want a signature "wow, this is something new" image that anchors
the brand. **The marketing screenshot is built in.** **Risk:** most
expensive to build, may feel like a gadget rather than a tool, and
power users may grow out of it.

## My honest pick (if I had to choose ONE)

**Almanac, with one feature from Oracle pulled in.**

- The almanac's *time-is-the-interface* metaphor is the most defensibly
  novel — no astrology app treats your life as a scrubable physical
  artifact. The Spotify-Wrapped-meets-pandit's-book feel is genuine
  innovation.
- The pinch-to-zoom from days → years → Mahadashas is a 10x moment
  the others don't have.
- Pull-down-anywhere to ask a question (from Oracle) makes the
  Horary engine accessible without polluting the calendar surface.

**That said — I have one bias to flag.** The Compass is the boldest of
the three. If we want the marketing-still-image-that-makes-people-talk,
it's the compass. If we want the deep-use-app-that-people-live-in,
it's the almanac. If we want the AI-first-future-proof, it's the oracle.

The decision is yours to call. I won't bias more than that.

## Possible blends (if you want one)

- **Almanac + Oracle (my pick):** scrubable timeline as the body, plus
  pull-down universal question. Calendar in the day, ChatGPT in the
  gesture.
- **Compass + Oracle:** the compass as home, with a "tap the center" =
  open the Oracle question prompt. Radial UI + dialogue summoning.
- **Almanac + Compass:** scroll vertically through days, but each day
  has a small compass widget showing that day's RPs. Probably overstuffed.
- **All three:** absolutely not. Pick a metaphor and commit.

---

## What I'm asking you to do

Read the three. Don't try to be polite about which one excites you.

- **"Almanac feels right"** → I commit to that, start spec'ing the
  pinch-to-zoom + day card design.
- **"Oracle is the bold move"** → I commit to that, start spec'ing the
  question-driven UX + AI dispatch.
- **"Compass is the wow"** → I commit to that, build the radial
  instrument first.
- **"Blend 1 + 2"** → great, I detail the Almanac + Oracle hybrid.
- **"None of these — keep thinking"** → I write 3 more, with a
  different framing (currently they're: time-driven, language-driven,
  space-driven; next round could be: ritual-driven, accountability-
  driven, community-driven).

**No pressure to pick.** If all three feel wrong, that's data. We try
again. The point of this exercise is to find the metaphor *you*
believe in before we build pixel one. The right answer might not be
in this document — but writing it forced me to actually imagine, not
just imitate. That was the goal.
