# Muhurtha Audit + Research — 2026-04-22

**Purpose**: Plan of record for Track A.2 (Muhurtha deep-dive). Mirrors the
shape of `.claude/research/panchang-audit.md` — inventory first, then gaps,
then a phased PR plan.

---

## 0. TL;DR

The current Muhurtha engine is **production-quality for single-chart
muhurtha** — 4-min scans, Lagna SL signification, Badhaka/Maraka,
event-cusp CSL, H11 confirmer, Panchang integration, 15+ scoring factors,
Tara Bala, Chandrabala, Hora lord, Rahu/Yama/Gulika/Durmuhurtha/Vishti
avoidances, event-location Lagna support, LLM analysis with history.

The **one big gap** is the reason the user's dad actually uses it: a real
**multi-chart muhurtha** where a restaurant opening serves all the
partners, a wedding serves both bride+groom, a family trip serves every
traveller. What we have today is a *proxy* (Lagna-SL appears in each
participant's natal Ruling Planets → +10 per match). Not dual-signification.
Not per-participant Chandrashtamam / Tarabala rejection. Not DBA alignment.

The right answer is a **filter → score → aggregate** pipeline on top of
the existing single-chart engine. Everything we have stays; we add a
per-participant evaluation layer and change the aggregation.

Also: during this audit I discovered two Panchang gaps worth patching
(Nakshatra Vedha / Panchaka exceptions), detailed in §7.

---

## 1. What's Already Implemented

### 1.1 Backend

**Router** — `backend/app/routers/muhurtha.py`
- `POST /muhurtha/find` — `MuhurthaRequest` → `{windows, date_windows, best_window, nearby_better, …}`
- `POST /muhurtha/analyze` — LLM analysis with multi-turn history

**Engine** — `backend/app/services/muhurtha_engine.py`
- 4-min step, 5:00 AM – 21:00 range, up to 60 days
- Consecutive same-SL windows merged (≤ 8 min gap, same day)
- Per-hour planet cache, per-day Panchang cache

**Scoring** — 15+ factors:

| Factor | Weight | Notes |
|---|---|---|
| Lagna SL signifies **primary** event house | +40 | Core KP rule |
| Lagna SL signifies supporting houses (max 2) | +15 each | |
| Lagna SL signifies no denial house | +20 | |
| Auspicious tithi | +20 / −30 | |
| Auspicious nakshatra | +15 | |
| Inauspicious yoga | −40 | Vishkambha, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti |
| Good weekday (M/W/Th/F) | +10 / −15 | |
| Tara Bala (if participant) | +25 / −20 | |
| Chandrabala (if participant) | +15 / −15 | |
| Hora lord Jup/Ven/Merc vs Sun/Sat/Mars | +10 / −10 | |
| Lagna lord retrograde | −15 | |
| Badhaka/Maraka hit | −25 | Primary user's Lagna only |
| Event cusp CSL confirms | +15 | |
| H11 CSL confirms | +10 | |
| Moon star lord favorable | +10 | |
| Participant RP resonance | +10 each | This is the "multi-chart" proxy |
| Abhijit (not Wed) | +30 | |
| **Inauspicious windows (penalty)** | | |
| Rahu Kalam | −50 | |
| Yamagandam | −60 | |
| Gulika Kalam | −50 | |
| Durmuhurtha | −80 | |
| Vishti Karana | −30 | |

**Quality thresholds**: ≥95 Excellent · 65-94 Good · 35-64 Fair · <35 Weak

**Event types** — 10 presets with primary / supporting / denial houses:
marriage (7 · 2,11,5 · 1,6,10,12), business (10 · 2,6,11 · 5,12),
house_warming (4 · 11,2 · 3,10,8), travel (9 · 3,12 · 2,8), education
(4 · 9,11 · 3,12), vehicle (4 · 3,11 · 8,12), medical (1 · 5,11 · 6,8,12),
legal (6 · 11,3 · 5,12), investment (2 · 5,11 · 8,12), general
(1 · 2,11 · 6,8,12).

### 1.2 Frontend

`frontend/app/app/page.tsx` (≈ lines 3522–4400) — 3-step wizard, best-window
hero, nearby-better alert, calendar date strip, ranked leaderboard with
expandable KP/Panchang/Moon/Status panels, AI analysis chat with 5 topic
pills. Visually: this is already a *wow* tab, no UI rework needed.

### 1.3 Knowledge Base

`backend/knowledge/muhurtha.txt` — 6 sections (core principle, event-house
requirements, avoidances, scoring thresholds, client-explanation templates,
natal-chart combination). Sufficient for the LLM's current single-chart
prompts; needs to be **rewritten as Markdown with multi-chart semantics
added** for v2.

### 1.4 Tests

**None.** `backend/tests/test_muhurtha_engine.py` does not exist.

---

## 2. The Gap — Multi-Chart "Restaurant Opening" Muhurtha

**User's dad's real workflow**:
> "Client comes for a restaurant opening → I ask for all partners' charts
> → I find a window that's good for all of them within the client's range
> → if none, I tell them 'wait a month, there's a much better date.'"

**What "good for all of them" means** (per the multi-chart research report,
cross-referenced to KPDP 6-10 rules from K. Subramaniam / Kanak Bosmia):

For EACH participant at the candidate moment, check:

- **Cuspal-sub-lord cross-check** — the event Lagna / 7th / 10th CSL
  (whichever matches the event) must appear as a significator of
  **2/7/11** (or the event's house group) in THEIR natal chart.
- **Chandrashtamam rejection** — if the moment's Moon is in the 8th rashi
  from their natal Moon → HARD REJECT.
- **Janma Tara rejection** — if the moment's Moon is in their own
  birth-star (janma nakshatra, first star of the 9-cycle) → REJECT.
- **Chandrabala** — Moon in 2/3/6/7/10/11 from their natal Moon = good.
- **Tarabala** — count nakshatras forward from their janma star and mod 9;
  Sampat/Kshema/Sadhaka/Mitra/Atimitra = good.
- **DBA alignment** — their current Mahadasha/Antardasha lords should
  signify the event house group (or at least not 6/8/12). If everyone
  is running a good DBA, huge confirmation.
- **Badhakesh/Marakesh DBA** — hard reject if active.
- **Ruling-planet resonance** — count of the moment's 5 RPs that appear
  as natal event-house significators for them. 3-5 = strong, 0-2 = weak.

Today we do **only** RP resonance (one of the eight checks). Everything
else either doesn't happen or is checked against the primary user only.

**What this PR needs to deliver**:

1. **Per-participant evaluation layer** — every check above, returned as
   a `participant_check` dict per window.
2. **Hard-filter stage** — a window is rejected if ANY participant fails
   a hard constraint (configurable: Chandrashtamam, Janma Tara, Badhaka
   DBA are hard; others soft).
3. **Soft-score aggregation** — per-participant score 0-100; aggregate
   via `min()` for equal-weight events (marriage), weighted for hierarchical
   events (business primary 0.6 + secondaries 0.4, primary must clear 70).
4. **"Extend the window" logic** — if no candidate passes hard filters
   in the client's range, SCAN FORWARD (up to +90 days) for the next
   qualifying window and surface it as the `extend_suggestion`. The tool
   must not invent a "best of bad" answer; it must tell the truth.
5. **UI per-participant breakdown** — a "Partners" sub-panel in the
   expanded window card showing each participant's Tarabala class,
   Chandrabala ok/ko, DBA lords + grade, RP count, Chandrashtamam pass/fail.

---

## 3. Secondary Gaps (Not Multi-Chart, Still Worth Fixing)

### 3.1 Dashas are never checked at the muhurtha moment

The engine doesn't compute ANY participant's running Mahadasha / Antardasha
/ Pratyantardasha at the candidate moment. This is a major KP omission —
"the muhurtha moment should fall in a DBA whose lords signify the event
houses" is straight KSK.

### 3.2 Varjyam + Amrit Kala not scored in muhurtha

We compute these in Panchang (PR A1.2c) but muhurtha doesn't consume
them. Amrit Kala should be +20, Varjyam should be −25.

### 3.3 Panchaka dosha not enforced per event

We flag Panchaka in Panchang but Muhurtha doesn't reject/penalize
Panchaka for events that are traditionally blocked by it (vivaha,
griha-pravesh, yatra, vahana, dhanya). Exceptions exist (Ghora Panchaka,
Mrityu Panchaka, Chora, Agni, Roga — five sub-types, only some block
specific activities).

### 3.4 Tithi Shunya not enforced per masa

We identify void tithis in Panchang but muhurtha doesn't enforce
"this tithi is shunya in this masa → avoid for auspicious starts".

### 3.5 Kartari Dosha not checked

Planets flanking muhurtha Moon or Lagna = Kartari (scissor) dosha.
Classical muhurtha rejects this; we don't check.

### 3.6 Ekargala Dosha not checked

Moon + Sun in same sign = Ekargala. Blocks auspicious starts. Not checked.

### 3.7 Lagna-type preference not applied per event

Fixed Lagna (Tau/Leo/Sco/Aqu) preferred for griha pravesh, foundation,
installation. Movable (Ari/Can/Lib/Cap) for travel, sales, launches.
Dual (Gem/Vir/Sag/Pis) for education, partnerships, treaties. Today
we don't weight by Lagna type.

### 3.8 Hora Lord per-event weighting

Today: Jup/Ven/Merc = +10 universally. Correct version: event-specific.
Jupiter hora best for marriage/education/religious; Venus for
wedding/arts/relationships; Mercury for business/contracts/travel;
Mars for surgery/athletics (+); Saturn for foundations, demolitions (+);
Moon for daily business, meetings; Sun for leadership events.

### 3.9 Shukra / Guru Tara (combustion) for vivaha

Classical: no marriage while Venus or Jupiter is combust. Not checked.

### 3.10 Solar-month rule for vivaha

Classical: marriage only when Sun transits
Mesha/Vrishabha/Mithuna/Vrischika/Makara/Kumbha. (Pushya/Cancer is
avoided.) Not checked.

### 3.11 Weekday specificity by event

Today: M/W/Th/F good universally. Correct:
- Marriage — Mon, Wed, Thu, Fri (avoid Sat, Sun, Tue)
- Travel — Mon, Wed, Thu (avoid Tue, Sat — travel losses)
- Business launch — Wed (Mercury), Thu (Jupiter)
- Medical/surgery — Tue (Mars) is actually *preferred* for surgery!
- Foundation/construction — Mon, Thu (stability)
- Loan/debt repayment — Wed, Thu
- Vehicle purchase — Mon, Wed, Thu

Our universal table penalizes surgery on Tuesday. Wrong.

### 3.12 Nakshatra classes per event

We use a flat "auspicious nakshatra" set of 11 nakshatras. Classical is
per-event:

| Class | Nakshatras | Events |
|---|---|---|
| Dhruva (fixed) | Rohini, Uttara, U-Shadha, U-Bhadrapada | Foundation, installation, long-term contracts |
| Chara (movable) | Swati, Punarvasu, Sravana, Dhanishta, Shatabhisha | Travel, transport, vehicle |
| Kshipra (swift) | Ashwini, Pushya, Hasta, Abhijit | Short trips, medicine, studies, sports |
| Ugra (fierce) | Bharani, Magha, Purva, P-Ashadha, P-Bhadra | Demolition, violent acts, debt collection |
| Mridu (mild) | Mrigashira, Chitra, Anuradha, Revati | Art, dance, jewelry, romance |
| Tikshna (sharp) | Ardra, Ashlesha, Jyeshtha, Moola | Surgery, exorcism, incantations |
| Mishra (mixed) | Krittika, Vishakha | Both benefic + malefic |
| Adha-mukha | Bharani, Krittika, Ashlesha, Magha, Vishakha, Jyeshtha, Moola, P-Ashadha, P-Bhadra | Digging, well, mine, underground |
| Urdhva-mukha | Rohini, Ardra, Pushya, Uttara, U-Shadha, U-Bhadra, Shravana, Dhanishta, Shatabhisha | Upward — coronation, climbing, flag-hoisting |
| Tiryan-mukha | Punarvasu, Anuradha, Hasta, Mrigashira, Revati, Chitra, Swati | Sideways — travel, boundary-setting |

We need to map each event type to 1-2 favourable nakshatra classes and
weight accordingly.

---

## 4. Proposed Implementation — Phased Plan

### PR A2.2a — KB rewrite (foundation)

Rewrite `backend/knowledge/muhurtha.txt` → `backend/app/kp_knowledge/muhurtha.md`.
New structure:

1. Core KP rule (Lagna SL)
2. Panchanga Shuddhi (5-fold purity, per-event)
3. Doshas — full catalogue (Panchaka/Tithi Shunya/Kartari/Ekargala/Vedha/
   Visha Ghatika), definitions, exceptions, remedies
4. Per-event rule sets (marriage, business, travel, griha pravesha,
   vehicle, medical, education, property, investment, legal — with
   nakshatra classes, tithi sets, weekday preferences, Lagna-type
   preferences, Hora-lord preferences, season rules, avoidances)
5. Multi-chart methodology (KPDP 6-10 with examples)
6. Ruling Planets at muhurtha (the 5 — Day/Moon-sign-L/Moon-star-L/
   Lagna-sign-L/Lagna-star-L — and thresholds for RP resonance)
7. Dasha check per participant (rules for 6/8/12 rejection,
   badhakesh/marakesh rejection, same-parallel-dasha rule)
8. The "extend window" rule — classical justification for refusing
   bad muhurthas

No code changes. Pure KB upgrade. Deliverable: `muhurtha.md` + new
`panchang.md` patches for Panchaka / Tithi Shunya exceptions.

**Size**: ~600-800 lines. Read by LLM system prompt. 1 day's work.

### PR A2.2b — Per-participant evaluation layer

In `muhurtha_engine.py`, add `_evaluate_participant(window, participant)`
returning:

```python
{
  "name": str,
  "tarabala": int,                 # 1-9
  "tarabala_class": str,           # "Sampat" / "Vipat" / ...
  "tarabala_ok": bool,
  "chandrabala": int,              # 1-12 (from natal Moon)
  "chandrabala_ok": bool,
  "chandrashtamam": bool,          # True = Moon in 8th from natal
  "janma_tara": bool,              # True = Moon in janma nakshatra
  "current_dasha": {"md": str, "ad": str, "pd": str},
  "dasha_lords_signify": [houses],
  "dasha_ok": bool,
  "badhakesh_active": bool,        # any DBA lord = natal badhakesh?
  "marakesh_active": bool,
  "rp_count": int,                 # 0-5
  "rp_matches": [str],             # which RPs resonate
  "hard_reject": bool,             # any hard filter triggered?
  "hard_reject_reason": str | None,
  "soft_score": int                # 0-100
}
```

Aggregate per window:

```python
{
  "per_participant": [{…per_participant…}, ...],
  "aggregate_score": int,
  "aggregation_mode": "min" | "weighted" | "primary_only",
  "hard_rejected_for": [names],    # any participant hard-rejected this window
  "min_participant_score": int,
  "primary_participant_score": int,
}
```

### PR A2.2c — Hard-filter + soft-flag tier + extend-window logic

**Three-tier result model** (decision 2026-04-22, user-approved):

1. **Passed** (top tier, headline display) — every participant clears
   every hard filter. Shown in the main leaderboard with green/gold
   quality chips as today.
2. **Soft-flagged** (second tier, astrologer-review section) — window
   passes Panchanga Shuddhi + Lagna SL but ONE OR MORE participants
   hit a hard filter (Chandrashtamam, Janma Tara, Badhakesh DBA, etc.).
   Displayed in a distinct collapsed section below the main results
   with red chips per-participant. Label: "Below threshold — for
   astrologer review". The astrologer decides whether the window is
   still usable (e.g., a secondary partner's Chandrashtamam may be
   acceptable for a business opening where primary is solid).
3. **Rejected** (not shown) — window fails Panchanga Shuddhi outright
   or has broken Lagna SL. Never surfaced.

This honours the classical "reject hard" rule (passed tier must be
clean) while preserving practitioner judgment (soft-flagged tier
exposes the full data). The user's dad can still say "actually this
date works despite the flag" without the tool quietly hiding the data.

If no candidates exist in EITHER tier within the client's range, scan
forward up to +90 days, find the first qualifying window, return as
`extend_suggestion`:

```python
{
  "extend_suggestion": {
    "date": str,
    "start_time": str,
    "end_time": str,
    "aggregate_score": int,
    "days_from_range_end": int,
    "blocking_reason": str,     # what blocked the client's window
  }
}
```

### PR A2.2d — Frontend per-participant UI

In the expanded window card (today has 2×2 panels), add a **5th panel**:
"Partners" — table with row per participant, columns: Name, Tarabala,
Chandrabala, DBA, RP count, Verdict. Reject reasons shown inline when
they apply. Aggregate score + aggregation mode shown prominently.

When `extend_suggestion` is present → red/amber banner at top of results:
"No qualifying window in your range. Next qualifying window is on
[date] — [days] away. [Explain why]."

### PR A2.2e — Secondary rule fixes (§3 items)

- Consume Amrit Kala / Varjyam from Panchang
- Per-event weekday tables
- Per-event nakshatra-class tables
- Lagna-type preference per event
- Hora-lord preference per event
- Panchaka / Tithi Shunya event-blocking
- Solar-month rule for vivaha
- Venus/Jupiter combustion check for vivaha
- Kartari / Ekargala detection

### PR A2.2f — Tests

`backend/tests/test_muhurtha_engine.py`:
- Scoring regression tests (pin known-good windows)
- Per-participant Chandrashtamam rejection test
- Multi-chart aggregate ordering test
- Extend-suggestion emission test
- Per-event Lagna-type preference test

---

## 5. Data the Engine Needs That It Doesn't Have

1. **Participant's full natal chart** — today we extract natal RPs only
   (lagna sign/star lord, moon sign/star lord). For per-participant
   DBA / Badhaka / Maraka / event-house significators, we need the full
   natal cusp positions + planet placements. Parked today; compute on
   demand from the participant form data.
2. **Participant Vimshottari dasha timeline** — compute once per
   participant (from birth moon position + birth datetime), cache by
   `participant_id`.
3. **Badhakesh/Marakesh per participant** — derived from their natal
   Lagna sign. Formula well-known (movable → 11th; fixed → 9th; dual →
   7th). Add utility function.
4. **Janma nakshatra per participant** — already implied by RP extraction;
   surface explicitly.

---

## 6. Out of Scope (Deferred)

- **D9 Navamsa muhurtha** — some traditions check D9 Lagna for marriage
  specifically. Adds complexity; defer until A2.2e ships.
- **Yearly muhurtha calendar** (e.g., "best 20 days in 2026 for
  marriage") — batch generation. Nice feature, no one asked for it yet.
- **Mobile UI polish** for the new Partners panel — the existing
  Muhurtha tab is desktop-first; mobile CSS exists but is not the
  focus of this track.
- **Classical D60, D10 chart support** for muhurtha — too niche.

---

## 7. Panchang Gaps Surfaced by This Research

Worth patching in a small PR A1.2d-patch:

1. **Panchaka sub-types** — today we flag nakshatras 22-26 as "Panchaka
   dosha". Classical splits into 5 sub-categories (Mrityu/Agni/Roga/
   Raja/Chora) each blocking different activities. We could either:
   (a) keep the flat flag but cite in KB which activities each sub-type
   blocks, or (b) emit sub-type in API response. Option (a) is
   cheap, option (b) is correct; ship (a) now, (b) with A2.2e.
2. **Tithi Shunya per masa** — we identify void tithis but don't expose
   WHICH events they void. Add a per-event table in the KB.
3. **Visha Ghatika / Yama Ghantam** — a 5-ghati (120-min) toxic window
   per nakshatra, different from Varjyam. Separate table; add to
   Panchang backend + UI if the user wants another "avoid" chip.
4. **Nakshatra-pada quality** — we display pada 1-4 but don't score it.
   Pada 1 of each nakshatra is generally weakest; pada 4 strongest for
   fixed-result events.

---

## 8. Why This Is A High-Value Track

1. **Differentiation** — no public astrology tool does real multi-chart
   muhurtha with per-participant breakdowns + honest "wait for a better
   date" logic. KundaliGPT doesn't. AstroSage doesn't. Prokerala doesn't.
2. **Real user need** — user's dad's exact workflow. This tab in its
   current state is "good single-chart muhurtha"; post-A2.2 it becomes
   "what my dad actually does."
3. **Defensibility** — the KPDP 6-10 cross-chart engine is hard to
   re-implement without understanding KP. Once ours works, it's a moat.
4. **Monetization alignment** — premium feature ("combined chart
   muhurtha") slots naturally into a pricing tier above the basic
   single-chart version.

---

## 9. Confidence Notes

- **High confidence**: Per-participant Tarabala / Chandrabala /
  Chandrashtamam / DBA gate, RP resonance framework, KPDP 6-10 rules,
  extend-window logic.
- **Medium confidence**: Per-event Lagna-type / nakshatra-class /
  weekday tables. Classical sources agree broadly but diverge on
  specifics. Choose one authority (Muhurtha Chintamani translation +
  B.V. Raman's *Muhurtha* book) and stick with it.
- **Lower confidence**: Exact RP-count thresholds (3/5 = strong, etc.)
  and soft-score weights. These are practitioner rules of thumb, not
  from a canonical formula. Tune with real muhurthas checked against
  user's dad's published muhurthas.

---

## 10. Next Step (awaiting user sign-off)

Shortest-to-value sequence:

1. **A2.2a** (KB rewrite) — 1 day. Immediately improves AI analysis
   quality on existing single-chart muhurthas.
2. **A2.2b + A2.2c** (per-participant eval + extend-window) — 2-3 days.
   Delivers the multi-chart feature your dad uses.
3. **A2.2d** (frontend Partners panel) — 1 day. Surfaces new data.
4. **A2.2e** (secondary rules: nakshatra classes, weekday tables,
   combustion, solar-month) — 2 days.
5. **A2.2f** (tests) — 1 day.

Total: roughly a week of focused work. Each PR is reversible.
