# Session Handoff — 2026-05-28 (Sept 9 launch prep)

**Audience:** future Claude sessions + user reading back next time.
**TL;DR:** Sept 9 = astrologer launch. General-user mode paused. New
killer feature (client portal pages) approved. Matching network
approved for v1.5. Several pending decisions before code starts.

---

## What happened in today's session (chronological)

1. **General-user mode (Phase G) attempted in 8 commits.** Built a
   Dashboard tab + 6-tab consumer IA + tried to strip astrologer
   chrome. User said *"its my bad to ask you, lets not work on user
   mode now."* **Paused.** Code still on develop; mode toggle still
   exists; user-mode chrome partially stripped via v5 hotfix but the
   experience is still not the designed UX. **Don't touch it without
   explicit reopen.**

2. **Custom domain shipped.** `devastroai.com` is live in production.
   `devastroai.vercel.app` still works as a redirect, will be removed
   later. When user says "remove vercel domain," grep for hardcoded
   `vercel.app` references (env vars, CORS configs, PDF footer URLs).

3. **Launch date confirmed: Sept 9, 2026.** **ASTROLOGER-ONLY**
   launch. Consumer launch is a separate later milestone. See
   `.claude/research/launch-tracker-2026-09-09.md`.

4. **Back-button architectural concern raised.** User: *"every
   navigation astrologer do, the back is going to landing."* Root
   cause: `/app` is one Next.js page; all tabs render conditionally;
   browser back goes to last URL change (which is `/landing`). My
   recent G2 fix added `?t=tab` query params which helps, but the
   real fix is route segments (`/app/chart`, `/app/ask`, etc.).
   **Recommended: route refactor before launch. User decision
   pending.**

5. **Supabase situation.** Project dormant (auto-paused after 7 days
   inactivity, RLS warning). User was correctly frustrated with the
   careless original setup. **Recommended: delete dormant Supabase,
   migrate to Neon PostgreSQL free tier (no auto-pause, 3 GB).
   User decision pending.**

6. **Client portal pages — KILLER FEATURE approved.** Per-client
   unique URL (devastroai.com/c/<uuid>), read-only for client, live
   editable for astrologer. Doctor-portal analogy. Replaces PDF
   handoff. Built-in viral loop. **Full spec:
   `.claude/research/client-portal-spec.md`.** 7 design decisions
   pending from user.

7. **Matching network — Phase M approved.** Cross-astrologer
   marriage match discovery. User's refined privacy design is
   elegant: NO client data crosses astrologer boundaries; we only
   connect astrologers professionally. **Full spec:
   `.claude/research/matching-network-spec.md`.** Target: v1.5
   November 2026 / v2.0 Q1 2027.

8. **SEO + Google indexing identified as pending.** Discoverability
   on searches like "AI astrology," "KP astrology online,"
   "kundali AI." Required for launch (meta tags, OG, sitemap.xml,
   robots.txt, Schema.org JSON-LD).

9. **Still to discuss in next session:**
   - Payment integration (Razorpay vs Stripe, pricing structure)
   - Workspace features: astrologer notes per client, prediction
     accuracy tracking over time
   - Today's appointments view
   - Specific design of the workspace navigation post-launch

---

## Open decisions (must be answered before Week 3 of launch sequencing)

These are blocking the code start. Listed by priority:

| # | Decision | My recommendation | User decision |
|---|---|---|---|
| 1 | Route segment refactor — yes or defer? | **Yes, do it Week 3-4** | _pending_ |
| 2 | Database choice (Neon / Railway / other)? | **Neon free tier** | _pending_ |
| 3 | Pricing point (₹999 / ₹1,499 / ₹1,999/yr)? | ₹1,499/yr | _pending_ |
| 4 | Free trial length (14 / 30 / none)? | 30 days | _pending_ |
| 5 | Max clients per astrologer? | Unlimited | _pending_ |
| 6 | Email provider (Resend / SendGrid / SES)? | Resend | _pending_ |
| 7 | OAuth v1 (email-only / +Google / +Apple)? | Email-only v1 | _pending_ |
| 8 | Client portal Q1: what client SEES (notes only / full chart / simplified snapshot)? | Simplified snapshot + notes | _pending_ |
| 9 | Client portal Q2: consult-back (WhatsApp / in-app / both)? | WhatsApp v1 | _pending_ |
| 10 | Client portal Q3: notes organization (chronological / by topic / both)? | Chronological v1 | _pending_ |
| 11 | Client portal Q4: per-URL permanence (forever / per-session)? | Forever | _pending_ |
| 12 | Client portal Q5: bilingual writing (manual / AI-translated)? | Manual v1 | _pending_ |
| 13 | Client portal Q6: URL privacy (UUID / +PIN / +OTP)? | Plain UUID v1 | _pending_ |
| 14 | Client portal Q7: branding (astrologer-first / DevAstroAI-first / equal)? | Astrologer-first | _pending_ |

User said: *"let me think more carefully and discuss few more things before we start doing anything."* All 14 of these are part of that thinking.

---

## What's locked in (DO NOT re-litigate without explicit reopen)

- Sept 9 = astrologer launch (not consumer).
- Client portal pages = killer feature, in scope for launch.
- Matching network = approved, post-launch v1.5.
- General-user mode = paused. Don't touch.
- Pricing model = subscription (not per-minute meter, NEVER per-minute).
- No remedy/gemstone monetization.
- No fear-based copy.
- KP doctrinal accuracy = sacred (analysis tab, KB files, KP engines).
- Cultural authenticity (Telugu rendering, KP-Ayanamsa) = non-negotiable.

---

## What's been built in the last 2 weeks (Phase 9.10 + G1)

| Phase | What shipped |
|---|---|
| 9.10a-f | Mobile real-device polish (header overflow, AI orb position, BottomDrawer content via HousePanelContent, multi-chart pills, AppToast, etc.) |
| G1 | DashboardTab component + 6-tab consumer IA wired into shell |
| G1 hotfix v1 | Onboarding compaction (form fits in viewport) |
| G2 | Per-tab URL routing via window.history.pushState (`?t=` query param) |
| G1 hotfix v2 | Onboarding gate broadened — created bug |
| G1 hotfix v3 | Real fix: user mode now calls `/astrologer/workspace`, gets full workspaceData |
| G1 hotfix v4 | Dashboard + Ask render in wide-desktop layout |
| G1 hotfix v5 | Stripped astrologer chrome (TIME SHIFT, left chart panel, multi-chart pills) from user mode |

All on develop. Astrologer mode unaffected. User mode partially-functional but visually rough.

---

## Important context not to lose

### Custom domain
- Production: `devastroai.com`
- Old: `devastroai.vercel.app` (still works as 307 redirect; delete later)
- Configured 2026-05-28 via Namecheap + Vercel

### Dormant Supabase
- Project ID: `sbhutroxbbqenmdqeyhd`
- Org: DevAstroAI
- Auto-paused, RLS warning, NOT USED for anything currently
- Action: delete cleanly when we set up Neon

### File map for the new feature work
- `.claude/research/launch-tracker-2026-09-09.md` — canonical launch checklist
- `.claude/research/client-portal-spec.md` — client portal pages design
- `.claude/research/matching-network-spec.md` — Phase M (post-launch v1.5)
- `.claude/research/general-user-vision.md` — consumer vision (DEFERRED post-launch)
- `.claude/research/kundaligpt-observations.md` — competitor walkthrough notes
- `.claude/HANDOFF-2026-05-28-launch-prep.md` — this file

### Tech debt to address before launch
- One 5000-line `app/app/page.tsx` should be split (route segments)
- localStorage → DB migration (auth flow needed first)
- No real error monitoring (Sentry pending)
- No DB backup verification (pending DB choice)

---

## How to resume next session

If you (Claude) are reading this fresh:

1. **Read `.claude/research/launch-tracker-2026-09-09.md` first** — it's the canonical pre-launch source.
2. **Then read this handoff** — captures the strategic context.
3. **Then read `client-portal-spec.md` + `matching-network-spec.md`** for the two big new features.
4. **Check `.claude/DAILY_LOG.md`** for any updates after this handoff.
5. **Ask user about the pending decisions** before starting any code. The 14 items in §"Open decisions" are blockers.

If you're picking up the conversation:
- User has likely answered some of the pending decisions by now.
- Continue with payment + workspace features discussion (per user's *"then we will discuss rest"*).
- Don't propose anything that contradicts §"What's locked in".

---

## One key thing I learned this session

**Stop iterating without understanding the codebase first.** Today's 8
user-mode commits happened because I edited one render path, shipped,
discovered another render path, shipped again. The correct pattern is
grep for ALL render sites before editing one. Future Claude: do the
audit before the edit, always. The user is patient but they shouldn't
have to be.
