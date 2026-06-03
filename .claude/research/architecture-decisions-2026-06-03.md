# Architecture Decisions — 2026-06-03 (ADR-005)

Supersedes nothing. Captures architecture choices made during the
deep-scan-driven hardening sweep on 2026-06-02 → 2026-06-03 that
aren't documented in ADR-001/002/003/004 or in the older
client-portal / matching-network / pricing-payment specs.

Each section: **Decision → Rationale → How we know it's right →
What we'd change** (in the spirit of ADR-001 conventions).

---

## 5.1 Backend operational layer — auto-migrate on deploy

**Decision:** Railway `startCommand` chains
`alembic upgrade head && uvicorn …`. Migrations are a hard gate; if
they fail the deploy fails (Railway's restartPolicy retries; the
OLD version keeps serving). A startup probe in `main.py` queries
`information_schema` and logs `schema_drift_detected missing_columns=…`
if any expected column is absent — so any future regression is
diagnosable from logs in seconds instead of from a 500-spiral.

**Rationale:** On 2026-06-02 migration 0003 (portal_enabled +
portal_visibility + promoted_from_key) shipped to Railway WITHOUT the
DB being migrated, because the previous startCommand was
`uvicorn …` only. Every `GET /clients` 500'd because the model
referenced columns Postgres didn't have. The deploy passed CI, the
app booted, the first auth-gated CRUD request failed. Auto-migration
removes that class of foot-gun forever.

**How we know it's right:** schema-drift probe + auto-migrate are
belt-and-braces. If alembic ever silently no-ops (e.g., revision
divergence), the probe surfaces missing columns immediately. If the
probe is bypassed (RAILWAY env not configured), auto-migration still
runs first.

**What we'd change:** if we move to a multi-instance deploy, only one
instance should run migrations on boot. Either gate by a per-deploy
release command (Railway's `predeployCommand` once they support it
fully) or wrap in an advisory-lock SELECT inside Alembic's `env.py`.

## 5.2 Frontend HTTP layer — authedAxios wrapper

**Decision:** `frontend/lib/api/authedAxios.ts` is a thin wrapper
around `axios.post` that injects the Supabase JWT via
`getToken()`. All workspace-refresh / chart-compute callsites
(`page.tsx` × 4, `AddClientModal` × 1) flow through it. Mirrors
`apiFetch`'s 401-dispatch behavior (CustomEvent
`devastroai:auth-invalidated` → AuthProvider signs the user out →
`/auth/login?reauth=1`).

**Rationale:** When `/astrologer/workspace` was auth-gated in wave-1,
five frontend callers needed `Authorization: Bearer …` headers added.
Migrating each to `apiFetch` would have required rewriting their
surrounding flow logic (axios's `AxiosResponse` shape vs `apiFetch`'s
typed-T return). A 30-line wrapper preserves the existing flow shape
and makes JWT plumbing a one-import change.

**How we know it's right:** ADR-004's TanStack mutations all
internally use `apiFetch`. The wrapper exists ONLY for the historical
axios callsites — it's not a parallel API client, it's a JWT-injection
adapter.

**What we'd change:** eventual migration of page.tsx workspace calls
to TanStack mutations + apiFetch — `authedAxios.ts` deletes itself
at that point.

## 5.3 Rate-limit memory bound

**Decision:** `_request_log` dict in `main.py` caps at `RATE_LIMIT_MAX_KEYS`
(default 20,000). On overflow, evict the LRU-stalest 25% via a sorted
scan of `_request_log_last_touch`.

**Rationale:** The in-memory sliding-window rate limiter would grow
unbounded across IPs over a process's lifetime. With Railway uptime
~weeks and a popular public surface (`/c/{slug}`), the dict would
accumulate every IP that ever hit a rate-limited endpoint. Cheap O(n)
eviction at the cap keeps memory bounded; 20,000 entries × ~200 bytes
each = ~4 MB, negligible.

**How we know it's right:** alternative is `cachetools.TTLCache` —
adds a dep, gives slightly cleaner semantics (auto-evict on access),
but same outcome. Sorted-scan is acceptable at this scale.

**What we'd change:** when we move to multi-instance deploys, the
in-memory limit becomes per-instance (i.e., 10x the global limit
with 10 instances). Switch to Redis-backed limiter at that point —
keep the same API.

## 5.4 AI-draft → client-note promotion contract

**Decision:** `client_notes.source` (`astrologer` | `ai_draft`) +
`client_notes.promoted_from_key` (`<chart_session_id>:<message_index>`,
nullable, partial-indexed) form the promotion contract. The portal
admin AiDraftsLane reads from `chart_session.analysis_messages`
(immutable audit trail) and exposes "Make public" / "Edit & publish" /
"Dismiss" actions. Make-public creates a new `client_notes` row with
`source='ai_draft'` and `promoted_from_key=<key>`. Already-promoted
drafts are detected by exact key match (not substring) and shown with
a "Published" badge.

**Rationale:** Two principles —

1. **Project, don't mirror.** `analysis_messages` is the source of
   truth for what the AI said when. Mirroring AI Q&As into client_notes
   at the moment they happen would duplicate data and create a sync
   problem ("which copy is authoritative if the astrologer edits one?").
   Projection keeps the audit trail intact.
2. **Exact link, not substring.** Earlier version detected promotion
   by substring-matching the answer text — fragile (could false-positive
   when AI's standard prefix appears in multiple drafts). The
   `promoted_from_key` column eliminates that.

**How we know it's right:** the alternative (Mirror) was specifically
discussed and rejected on 2026-06-02. The "audit trail vs UX
simplicity" tradeoff is resolved in favor of the trail because:
- We need it for future prediction-accuracy tracking (`outcome` column
  on client_notes counts ai_draft-sourced predictions separately).
- Astrologer edits to a promoted note SHOULD diverge from the AI's
  original answer — that IS the value of curation.

**What we'd change:** if we later want the UI to show the original AI
answer alongside the edited published note (a "diff view"), we'd add
a `promoted_at` timestamp and snapshot the original answer text to
the note. Defer until the outcome ledger UI ships.

## 5.5 Portal kill switch + per-field visibility

**Decision:** `clients.portal_enabled` (boolean, default true) +
`clients.portal_visibility` (JSONB, default `{}`). When
`portal_enabled = false`, public `/c/{slug}` returns 404 (not 403)
so the URL looks invalid from the outside. `portal_visibility`
inspected keys: `show_birth_time`, `show_birth_place`, `show_gender`.
Missing keys default to TRUE (preserves existing behavior).

**Rationale:** Client-portal-spec Q6 originally proposed just plain
UUID slugs. In practice:
- Astrologers asked: "what if the client shares the link more widely
  than intended?" → kill switch.
- Some clients are privacy-sensitive about exact birth time / place
  on a forwardable URL → per-field visibility.

**How we know it's right:** 404-on-disabled matches WhatsApp /
LinkedIn's pattern of "private link" — doesn't confirm or deny
existence to anyone without the slug + permission. JSONB visibility
is forward-compatible — adding `show_snapshot` / `show_notes_<type>`
later requires no migration.

**What we'd change:** when we add ANOTHER toggle (likely
`show_predictions_only` for "high-trust client" preset), promote the
inspected-keys list to a `PortalVisibilityKey` enum on the model and
fail-loud on unknown keys. Today the loose dict shape is fine.

## 5.6 Observability — Sentry + request_id correlation

**Decision:** `sentry-sdk[fastapi]` initialized in `main.py` BEFORE
FastAPI app creation, gated by `SENTRY_DSN` env var. PII off
(`send_default_pii=False`). Release tag from Railway commit SHA.
SSE handlers (`analyze-stream`, `multi-analyze-stream`) capture
`request.state.request_id` and include it in BOTH the exception log
line AND the SSE error payload returned to the client.

**Rationale:** A 500 inside an SSE generator was previously unfindable
in logs by request_id, because the inner generator's try/except
logged without rid context. Including rid in the SSE error response
also gives users something to quote in support requests.

**How we know it's right:** Sentry is the de-facto error-tracking
choice in Python; alternatives (Honeybadger, Bugsnag, Datadog) all
require comparable wire-up and cost more for our usage profile.
Defer Datadog APM until we have ≥10 paying astrologers.

**What we'd change:** when the SSE generators stabilize, instrument
them with `sentry_sdk.start_transaction` for per-stream timing
visibility. Today the FastAPI integration auto-instruments
non-streaming endpoints only.

## 5.7 Defense-in-depth note: Pydantic optional fields on response models

**Decision:** Response models that include columns from recently-shipped
migrations declare the new fields with safe defaults
(`outcome: str = "na"`, `source: str = "astrologer"`, etc.). Belt-and-
braces: the server_default on the model handles new INSERTs; the
Pydantic default handles deploys where the migration hasn't applied
yet AND legacy rows that pre-date the migration.

**Rationale:** Even with auto-migration + the schema-drift probe,
there's a window where (a) the new code is running, (b) the migration
hasn't completed yet, and (c) the first request hits. Pydantic
defaults make the response succeed cleanly even in that window.

**How we know it's right:** caught one such race window during
wave-2 testing (briefly between the deploy starting and `alembic
upgrade head` finishing). Without the defaults, every /clients GET
would 500 for those ~10 seconds.

**What we'd change:** nothing — this is intentional belt-and-braces.

---

## Process notes

- This file follows the same conventions as
  `architecture-decisions-2026-06-01.md` (ADR-004 etc.). Future ADRs
  go in `architecture-decisions-YYYY-MM-DD.md`.
- When superseding any decision in this file, link from the new ADR
  and add a `**SUPERSEDED by ADR-NNN**` banner at the top of the
  affected section here — don't delete the original (history matters).
