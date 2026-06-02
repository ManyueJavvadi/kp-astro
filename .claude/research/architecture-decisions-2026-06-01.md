# Architecture Decisions Record — 2026-06-01

**Status:** Locked. These four decisions were made before starting the
route segment refactor, to prevent painful retrofits later in 2026/2027.
**Audience:** future Claude sessions + user. Read before any
auth/DB/state-touching PR.

---

## ADR-001: ORM / database layer

**Decision:** SQLAlchemy 2.0 (async) + Alembic for migrations.

**Why:**
- Python-native, matches our FastAPI backend — zero extra language runtime
- SQLAlchemy 2.0+ is fully type-safe (Mapped[] generics)
- Alembic migrations are battle-tested, autogenerate works well
- Async support via `AsyncSession` matches our async FastAPI handlers
- Postgres on Railway is the target DB

**Rejected:**
- **Prisma** — would require a separate Node service talking to backend; operational complexity
- **Raw SQL + asyncpg** — too much boilerplate per CRUD; type drift between Python and DB schema

**Setup checklist when first DB code lands:**
1. `pip install sqlalchemy[asyncio] alembic asyncpg`
2. `backend/app/db/` package: `engine.py`, `session.py`, `base.py`
3. `backend/alembic.ini` + `backend/alembic/` migrations dir
4. First migration creates: `astrologers`, `clients`, `chart_sessions`, `client_notes`, `subscriptions`, `usage_events`, `audit_log`
5. Connection string from `DATABASE_URL` env var (Railway Postgres auto-injects this)

---

## ADR-002: Auth provider

**Decision:** Supabase Auth (auth tokens only — NOT Supabase DB).

**Why:**
- Free at our scale (well under 50k MAU)
- SDK already in `requirements.txt` from the dormant project — zero install friction
- Handles email/password + reset + confirm + magic links out of the box
- JWT-based; backend can verify tokens without calling Supabase per request
- We keep our own Postgres on Railway — Supabase is only the identity layer

**Rejected:**
- **Lucia** — full control but we'd write password hashing, reset tokens, session management ourselves. Security risk for v1.
- **Clerk** — $25/mo at 10k MAU, gorgeous but overkill for astrologer-only launch
- **NextAuth / Auth.js** — opinionated, harder to customize for India OTP/UPI flows we may want later

**Integration shape:**
- Frontend uses `@supabase/supabase-js` for signup/login/reset flows
- Frontend receives JWT, stores in httpOnly cookie or memory + refresh token
- Frontend sends `Authorization: Bearer <jwt>` on every backend request
- Backend has `verify_supabase_jwt()` dependency that decodes via Supabase JWKS
- `astrologers` table has `supabase_user_id` (UUID) as foreign key to identity

**Important:** The dormant Supabase project (ID `sbhutroxbbqenmdqeyhd`) should be
DELETED first, then we create a fresh project specifically for auth-only use.
The dormant one was set up carelessly and has RLS warnings; clean slate is
safer.

---

## ADR-003: Frontend/backend type sharing

**Decision:** Generate TypeScript types from FastAPI's OpenAPI spec.

**Why:**
- FastAPI already emits `/openapi.json` for free
- `openapi-typescript` is a one-script codegen — produces a single `api-types.ts` file
- Catches API contract drift at compile time, not at runtime
- ~1 day setup cost saves an entire class of bugs forever

**Rejected:**
- **Manual sync** — works in week 1, painful by week 20 as we add 30+ endpoints
- **tRPC** — would require Node backend, not happening
- **Defer** — every endpoint we add before setting this up is one more thing to backfill

**Setup checklist:**
1. `npm i -D openapi-typescript`
2. `frontend/scripts/generate-api-types.sh` — fetches `BACKEND_URL/openapi.json` → `frontend/lib/api-types.ts`
3. Add to `frontend/package.json`: `"types:gen": "bash scripts/generate-api-types.sh"`
4. Run in CI before `tsc --noEmit` so type drift fails the build
5. Commit the generated file (so dev doesn't need backend running)

---

## ADR-004: Frontend state architecture

**Decision:** Three-layer state strategy.

| Layer | Tool | Use for |
|---|---|---|
| Identity / session | **React Context** (`AuthContext`) | Logged-in astrologer, JWT, current language. Rarely changes. |
| Workspace / app state | **Zustand** (`useChartStore`, `useUIStore`) | Active tab, active chart, modal flags, mobile orb position, sheet state. Changes often. |
| Server data | **TanStack Query** (`@tanstack/react-query`) | Clients list, saved sessions, billing data, anything fetched from backend. Handles caching, refetch, optimistic updates. |

**Why:**
- Each tool solves a different problem; mixing them is a feature, not a bug
- Context for things that change rarely (avoid re-render storms)
- Zustand for things that change often (tiny ~1KB, simpler API than Context+useReducer)
- TanStack Query so we never hand-roll fetch+cache+invalidate logic again

**Rejected:**
- **Context-only** — re-render performance problems for high-frequency UI state
- **Zustand-only** — would mix server cache with UI state, gets messy at scale
- **Redux Toolkit** — heavy, overkill for our needs

**Migration plan (during route refactor):**
1. Extract auth + language + workspaceData → `AuthContext`
2. Extract `activeTab`, modal flags, mobile orb state → `useUIStore` (Zustand)
3. Extract chart sessions, birth details → `useChartStore` (Zustand) initially, migrate to TanStack Query mutations once DB persistence lands
4. New API calls go through TanStack Query from day 1

---

## What this DOESN'T decide (still open)

These are P1/P2 items flagged in the audit; decide as we hit them:

- Cache backend (in-memory → Redis at 50 paying astrologers)
- Background jobs (Railway cron v1 → Celery later if scale demands)
- Multi-tradition extensibility (add `tradition: Literal["kp"]` field everywhere NOW)
- Razorpay webhook signature verification (build helper from line 1)
- Env var validation (Pydantic BaseSettings — 30 min setup)
- API versioning (`/v1/` prefix from day 1 — cheap insurance)
- File storage (Railway volumes v1 → Cloudflare R2 at scale)
- Sentry error monitoring (on launch tracker P0)
- Analytics events table (`events(actor_id, event_type, payload jsonb, ts)`)
- Frontend error boundary (wrap each route segment)

---

## How to use this doc

When you (future Claude) start a PR that touches auth, DB, types, or state:
1. Read this doc first
2. If the PR aligns with these ADRs → proceed
3. If the PR contradicts an ADR → STOP, surface to user, get explicit reversal
4. New decisions of similar weight → add ADR-005, ADR-006, etc.

These decisions are reversible but expensive to reverse. Don't reverse
casually.
