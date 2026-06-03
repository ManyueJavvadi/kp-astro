# Client Portal Pages — Feature Spec

> **STATUS UPDATE 2026-06-03 — feature SHIPPED, all 7 design Qs decided.**
>
> The 7 "_pending_" markers below are kept for historical context but
> are now resolved by what shipped in Phase 3 (Slices 1-4) on
> 2026-06-02. Per-question outcome:
>
> | Q | Decided | What shipped |
> |---|---|---|
> | Q1 (what client sees)        | (c) simplified KP snapshot | `client_portal.py:_extract_snapshot` returns Lagna / Moon / Sun / current MD-AD only. Full chart deliberately omitted. |
> | Q2 (consult-back)            | (a) WhatsApp deep-link     | Sticky bottom CTA on `/c/[slug]`; URL built by `_build_whatsapp_url(phone, name)` with pre-filled greeting. |
> | Q3 (notes organization)      | (a) chronological          | `select … ORDER BY created_at DESC LIMIT 50` (wave-7 P0-1 scoped). |
> | Q4 (URL permanence)          | (a) permanent per-client   | `clients.portal_slug` (UUID v4) — survives chart edits. |
> | Q5 (bilingual writing)       | (a) manual                 | `client_notes.language` ('en' \| 'te' \| 'te_en'); composer language selector. AI translation deferred post-launch. |
> | Q6 (URL privacy)             | (a) plain UUID + **kill switch + per-field visibility** (beyond spec) | Migration 0003 added `portal_enabled` (404 when false) + `portal_visibility` JSONB (`show_birth_time` / `show_birth_place` / `show_gender`). Rate limit 60/min/IP also applied. |
> | Q7 (branding)                | (a) astrologer-first        | Hero shows astrologer name + years_practicing + Verified badge; "Powered by DevAstroAI" footer (viral loop). |
>
> **Schema additions NOT in original spec:**
>
> - `client_notes.outcome` (migration 0002) — pending/confirmed/partial/disconfirmed/na, groundwork for prediction-ledger UI (deferred post-launch).
> - `client_notes.source` (migration 0002) — astrologer/ai_draft, used by the AI-drafts lane.
> - `client_notes.promoted_from_key` (migration 0003) — exact link from a promoted AI Q&A back to its `<chart_session_id>:<message_index>` of origin. Replaces fragile substring matching.
>
> **API surface delta vs spec:** spec sketched `/api/c/<uuid>` and `/api/astrologer/clients/<id>/note`. Actual:
>   - Public: `GET /c/{portal_slug}` (no `/api` prefix).
>   - Astrologer notes CRUD: `GET/POST/PATCH/DELETE /clients/{id}/notes`.
>   - AI drafts (Project-arch lane): `GET /clients/{id}/ai-drafts`.
>   - `track-open` from the original spec is NOT yet implemented — deferred to a focused
>     post-launch session (see N2 in deep-scan-2 ideas).
>
> See ADR-005 (`architecture-decisions-2026-06-03.md`) §5.4–5.5 for the
> rationale on the AI-draft promotion contract and the portal kill switch
> + per-field visibility.

---

**Original spec follows (pre-2026-06-02). Treat as historical context only.**

---

**Status (original):** Approved-in-concept on 2026-05-28; awaiting 7 design
decisions before implementation.
**Target ship:** Weeks 5-7 of Sept 9 launch (Jun 25 → Jul 16).
**Effort estimate:** ~2 weeks.
**Why this matters:** the single highest-value differentiator in the
roadmap. See `launch-tracker-2026-09-09.md` for context.

---

## The idea in one paragraph

Instead of an astrologer handing the client a PDF report after a
consultation, the astrologer gets a **unique URL per client**. The
client opens that URL on their phone — sees their chart + the
astrologer's predictions + any notes. The page is **read-only for the
client, live-editable for the astrologer**. If the client calls back
next month with a follow-up, the astrologer adds a quick note in their
account → it appears on the client's page instantly. Like a Toronto
doctor's patient portal — every visit's notes captured, retrievable
forever, no PDFs lost in WhatsApp.

---

## Why it's a game-changer

1. **No more "where's my PDF" problem.** Clients lose PDFs in WhatsApp
   threads. URLs don't get lost — same link works forever.
2. **Living document instead of a frozen report.** The astrologer's
   actual practice IS iterative — clients call back, new insights
   surface in transits, the astrologer remembers something later. A
   URL captures all of it; a PDF captures one moment.
3. **Built-in viral growth loop.** Every client who opens that URL
   sees "DevAstroAI" in the footer. Friend asks how they got it.
   Friend's astrologer joins DevAstroAI. Zero-CAC growth engine.
4. **A differentiator nobody else has.** AstroTalk does per-minute
   chat. AstroSage does reports. KundaliGPT does AI consultations.
   **Nobody does a persistent, astrologer-curated client portal.**

---

## User journey

### Astrologer side

1. Astrologer adds new client (already a flow today, just DB-backed).
2. System auto-generates a unique public URL for that client:
   `devastroai.com/c/<uuid>`. UUID v4 (2^128 entropy, unguessable).
3. Astrologer can copy the URL to clipboard (button in client edit
   view) and share via WhatsApp / SMS / verbal.
4. After consulting the client, astrologer types notes inline in the
   client's portal preview screen:
   - "Verdict" notes (top-level pronouncements: "Marriage by mid-2027")
   - "Observation" notes (running journal: "Saturn aspect on Moon
      is the underlying anxiety — recommended Rudraksha")
   - "Q&A" notes (questions client asked + responses)
5. Each note has language flag (TE / EN). Astrologer writes in
   whichever language they think.
6. Astrologer can mark some notes **private** (their own reference;
   not visible on the client's public URL) vs **shared** (visible
   to the client).
7. Astrologer can edit / delete any note later. Edits are visible
   immediately on the client's portal.

### Client side

1. Client receives URL via WhatsApp from their astrologer.
2. Opens URL on phone → sees a clean, mobile-first page:
   - Their name + birth details (read-only)
   - Their KP snapshot — Lagna / Moon sign / Sun sign / current
     Mahadasha-Bhukti (NOT the full chart — too overwhelming for
     non-astrologers)
   - **Timeline of notes** from astrologer (newest first, chronological)
   - Language toggle: read in **TE** or **EN** (whatever notes
     exist in each language)
   - **"Consult back"** button — WhatsApp deep-link to astrologer's
     number, pre-filled "Namaste {Astrologer}, I have a follow-up
     question about my reading…"
3. Page has subtle "Powered by DevAstroAI" footer → click → land
   on our marketing landing.

---

## The 7 design decisions (with recommendations)

These came up in the 2026-05-28 strategy discussion. Each has a
recommended answer + open status until the user confirms.

### Q1. What can the client SEE on their page?

- (a) Just astrologer's notes + their name
- (b) Notes + their full chart (planets, houses, dasha — same as
  astrologer view but read-only)
- (c) Notes + a simplified "your KP snapshot" (Lagna, Moon, current
  Mahadasha — like the consumer Dashboard tab we proposed)

**Recommended: (c).** Full chart is overwhelming for non-astrologers;
simplified snapshot + notes feels right. Notes are the value, not
the technical chart.

**User decision:** _pending_

### Q2. "Consult back" — what happens when client clicks?

- (a) Opens WhatsApp with astrologer's number pre-filled
- (b) Sends an in-app message to astrologer's "Consultation requests"
  inbox
- (c) Both (a) for mobile, (b) for later when client doesn't have
  WhatsApp open

**Recommended: (a) for v1.** Indian astrologers + clients live on
WhatsApp. Simplest path. (b) is a v2 feature when we build the
consultation marketplace.

**User decision:** _pending_

### Q3. Notes organization — chronological or by topic?

- (a) Single timeline, newest first (like a visit-notes log)
- (b) Grouped by topic (Marriage / Career / Health / etc.)
- (c) Both — timeline as default view, "filter by topic" tab

**Recommended: (a) for v1.** Chronological matches the doctor
analogy and is simpler. Topic grouping is v2 polish.

**User decision:** _pending_

### Q4. Per-client URL — permanent or per-session?

- (a) Same URL forever, even across multiple consultations (URL =
  "this client", notes accumulate)
- (b) New URL each consultation (URL = "this session", clean slate
  each time)

**Recommended: (a).** The "doctor portal" analogy depends on
continuity. Every note from every visit lives at the same URL.

**User decision:** _pending_

### Q5. Bilingual writing — manual or AI-translated?

- (a) Astrologer writes the note in TE or EN; clients see whichever
  language was written
- (b) Astrologer writes in one language; AI auto-translates and
  clients toggle

**Recommended: (a) for v1** (faster to ship, no translation cost).
(b) for v2 when we have time to tune the AI translation for KP terms.

**User decision:** _pending_

### Q6. Privacy concern — is the URL truly public-with-UUID?

- (a) Plain UUID (anyone with link can view)
- (b) UUID + a 4-digit PIN the astrologer sets
- (c) UUID + WhatsApp OTP to client's phone

**Recommended: (a) for v1**, (b) optional later. KP-tradition
culture is openly shared with family; OTP overhead would friction
it down. UUIDs are 2^128 entropy — practically unguessable. We
rate-limit URL access to prevent brute force.

**User decision:** _pending_

### Q7. Astrologer's branding vs DevAstroAI branding — whose name
is most prominent on the client page?

- (a) Astrologer's name + photo at top; "Powered by DevAstroAI" small
  footer (white-label-ish)
- (b) DevAstroAI brand at top; astrologer credited as consultant
- (c) Equal — astrologer's name + DevAstroAI logo both visible

**Recommended: (a).** The astrologer's relationship with their client
is the trust anchor. We're the infrastructure. The viral loop still
works because every client sees "Powered by DevAstroAI" → curiosity
→ click → land on our landing page.

**User decision:** _pending_

---

## Technical architecture

### Backend

**Database schema additions** (Neon PostgreSQL):

```sql
-- Extends existing chart_sessions table OR new clients table
ALTER TABLE clients ADD COLUMN public_uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL;
ALTER TABLE clients ADD COLUMN matching_opt_in BOOLEAN DEFAULT FALSE;  -- For Phase M
ALTER TABLE clients ADD COLUMN portal_enabled BOOLEAN DEFAULT TRUE;     -- Astrologer can disable

CREATE TABLE client_notes (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
  astrologer_id BIGINT REFERENCES astrologers(id),
  text TEXT NOT NULL,
  language CHAR(2) NOT NULL CHECK (language IN ('en', 'te')),
  note_type TEXT CHECK (note_type IN ('verdict', 'observation', 'qa')),
  is_private BOOLEAN DEFAULT FALSE,   -- if TRUE, hidden from client portal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX idx_clients_uuid ON clients(public_uuid);
```

**API endpoints:**

```
# Public (no auth)
GET  /api/c/<uuid>                  → returns client_snapshot + public notes timeline
POST /api/c/<uuid>/track-open       → log that client opened the portal (optional analytics)

# Private (astrologer auth)
POST /api/astrologer/clients/<id>/note    → add a note
PUT  /api/astrologer/clients/<id>/note/<note_id>  → edit
DELETE /api/astrologer/clients/<id>/note/<note_id>  → delete
GET  /api/astrologer/clients/<id>/portal-stats     → views, last opened
```

**Rate limiting** for public endpoint: 60 req/min per UUID, 600/min per
IP. Prevents brute-force enumeration of UUIDs.

### Frontend

**New public route:** `frontend/app/c/[uuid]/page.tsx` — server-side
rendered for SEO + fast first paint. Lightweight, mobile-first, no
auth.

**Astrologer-side UI additions:**
- New tab inside the astrologer's existing client detail view: "Portal"
  - Preview of what the client sees
  - Inline note composer (textarea + language flag + private/shared toggle)
  - Notes timeline (editable + deletable)
  - "Copy portal URL" button
  - Portal analytics card (last opened, total views)

---

## What's NOT in v1

- Real-time updates to the client page (client refreshes manually)
- Notifications when client opens (only "last opened" timestamp)
- Multiple astrologers per client (one astrologer = one client = one URL)
- Client-side commenting on notes (read-only)
- Embedded chat (use WhatsApp deep-link)
- AI-generated note suggestions (manual writing only)
- Photo uploads
- Schedule next appointment (lives in separate Today's Appointments view)

All of these are good v2/v3 candidates. The discipline is to ship the
core read-only portal first, validate with real clients, then layer.

---

## Pre-launch checklist for this feature

- [ ] All 7 design decisions answered by user
- [ ] DB schema migrated on Neon
- [ ] Public `/c/[uuid]` route built + SSR'd
- [ ] Astrologer side: notes composer, edit/delete, portal preview
- [ ] WhatsApp deep-link works on iOS + Android
- [ ] Telugu rendering with Noto Sans Telugu (NOT Helvetica fallback)
- [ ] Rate limiting on public endpoint
- [ ] Portal-disable toggle (astrologer can revoke client access)
- [ ] Manual QA: 5 fake clients, 20 notes, full flow
- [ ] Beta test: your father + 2 real clients before public ship
