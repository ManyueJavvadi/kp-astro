# Phase 1 — Auth + DB setup checklist

**Created:** 2026-06-01
**For:** Manyue, doing dashboard work to unlock the Phase 1 backend +
frontend code that's now on `develop`.

The code on `develop` is complete and won't crash without these steps —
auth-gated endpoints just return clean 503 errors saying "not configured."
But to actually let astrologers sign up and persist chart sessions, you
need to do the 4 dashboard steps below.

**Total time: ~20 minutes.** No coding required.

---

## Step 1 — Delete the dormant Supabase project (~3 min)

Why: The existing project `sbhutroxbbqenmdqeyhd` is auto-paused with an
RLS warning, was set up carelessly in 2025, and we want a clean slate
for auth-only use.

1. Go to **https://supabase.com/dashboard**
2. Sign in with the same account that owns `sbhutroxbbqenmdqeyhd`
3. Click into the **DevAstroAI** organization
4. Click into the project (it'll say "Paused" or "Auto-paused")
5. Settings (cog icon, bottom left) → **General**
6. Scroll to bottom → **Delete project**
7. Type the project name to confirm

---

## Step 2 — Create a fresh Supabase project (~5 min)

Why: We need a clean, intentionally-configured project. We'll use it
ONLY for auth (Postgres stays on Railway).

1. Same Supabase dashboard → **New project** (top right)
2. Organization: DevAstroAI (or create one)
3. **Project name:** `devastroai-auth` (or whatever — pick a clear name)
4. **Database password:** generate a strong one, store in your password
   manager. We won't use this — Supabase auto-generates a Postgres for
   you that we'll IGNORE — but it's required.
5. **Region:** choose closest to your astrologers. **Mumbai (ap-south-1)
   is the right pick for India.**
6. **Pricing plan:** Free tier is fine (50,000 monthly active users)
7. Click **Create new project**. Takes ~2 min to provision.

Once provisioned, grab the credentials:

8. Left sidebar → **Settings** (cog icon)
9. **API** subsection
10. Copy these THREE values into a temporary safe note (or password
    manager). You'll paste them into Vercel + Railway in Step 4.

   | Label | What to copy | Where it appears |
   |---|---|---|
   | **Project URL** | `https://xxxxxxxxxx.supabase.co` | Top of API page |
   | **anon (public) API key** | A long `eyJ...` token | "Project API keys" → `anon` `public` |
   | **service_role (secret) API key** | Another long `eyJ...` token | "Project API keys" → `service_role` `secret` |

11. Same page, scroll down to **JWT Settings**
12. Copy the **JWT Secret** — different from anon/service_role; this
    is what the backend uses to verify tokens.

   | Label | What to copy |
   |---|---|
   | **JWT Secret** | A shorter random string (not `eyJ...`) |

13. Left sidebar → **Authentication** → **Providers**
14. Make sure **Email** is enabled (it is by default)
15. **Important:** Email → "Confirm email" toggle should be **ON**.
    Without this, anyone can sign up without verifying they own the
    email address.

---

## Step 3 — Add Postgres to Railway (~5 min)

Why: Our app data (astrologers, clients, chart_sessions, etc.) lives in
Postgres. We use Railway for the backend already; adding their Postgres
keeps everything in one vendor.

1. Go to **https://railway.app/dashboard**
2. Click into the **kp-astro** project (or whatever yours is named)
3. Click **+ New** (top right)
4. **Database** → **Add PostgreSQL**
5. Railway provisions a Postgres instance and auto-creates a
   `DATABASE_URL` env var **on the Postgres service itself.** We need
   to share it with our backend service.

6. Click into the **Postgres** service (the new one)
7. **Variables** tab → find `DATABASE_URL` (it'll start with
   `postgresql://`)
8. Copy that value to your temp safe note.

   Actually — better way:
9. Click into your **backend service** (the FastAPI one)
10. **Variables** tab → click **+ New Variable**
11. **Variable Reference** (not raw value): Set name `DATABASE_URL`,
    value picker → choose **Postgres** service → `DATABASE_URL`. This
    makes Railway auto-update if the URL ever changes.
12. Save. Backend service redeploys automatically.

Once Postgres is up and `DATABASE_URL` is set on the backend, the
migration must run once:

13. Click into your backend service → **Settings** → **Custom Start
    Command** OR run via Railway's **Shell** feature (in the service
    details, there's a "Shell" tab if the service is running):

    ```bash
    cd backend && alembic upgrade head
    ```

    Or simpler: run it from your local machine after setting
    `DATABASE_URL` in your `.env` file:

    ```bash
    cd backend
    cp ../SETUP-PHASE-1.md.example .env  # if you have an example file
    # OR write DATABASE_URL=<the railway value> into .env manually
    ./venv/Scripts/python -m alembic upgrade head   # Windows
    # or: ./venv/bin/python -m alembic upgrade head  # macOS/Linux
    ```

    Either way, the migration creates all 7 tables (astrologers,
    clients, chart_sessions, client_notes, subscriptions, usage_events,
    audit_log) and the pgcrypto extension.

---

## Step 4 — Set env vars in Railway + Vercel (~7 min)

### 4a — Railway (backend) env vars

In the **backend service** → **Variables** tab, add these new vars
(`DATABASE_URL` already added in Step 3):

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | The Supabase URL from Step 2 (`https://xxxx.supabase.co`) | Public, but env var anyway |
| `SUPABASE_JWT_SECRET` | The JWT Secret from Step 2 | **SECRET — never commit** |
| `ENVIRONMENT` | `production` | Used by Pydantic Settings for log level / safety guards |
| `LOG_LEVEL` | `INFO` | Optional; default is INFO |

Railway will redeploy the backend after each variable change. Wait for
it to come back up.

### 4b — Vercel (frontend) env vars

Vercel dashboard → your **devastroai** project → **Settings** → **Environment
Variables**:

| Name | Value | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same URL from Step 2 | Production + Preview + Development | `NEXT_PUBLIC_*` = inlined at build time, visible in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon (public) key from Step 2 | Production + Preview + Development | Anon key is designed to be public; safe in browser |
| `NEXT_PUBLIC_API_URL` | `https://devastroai.up.railway.app` (your backend URL) | Production + Preview + Development | Already set probably — verify |

**Do NOT** put `SUPABASE_JWT_SECRET` or `service_role` key on Vercel.
Those stay on the backend (Railway) only.

After saving, **trigger a redeploy** in Vercel (Deployments → latest →
"⋯" → Redeploy → uncheck "Use existing build cache"). Or just push a
new commit and it redeploys automatically.

---

## Verify it's all wired

After both services redeploy:

1. Hit `https://devastroai.up.railway.app/health` in your browser. You
   should see:

   ```json
   {
     "status": "ok",
     "checks": {
       "ephemeris": {"status": "ok", ...},
       "chart_compute": {"status": "ok", ...},
       "anthropic_key": {"status": "ok", ...},
       "database": {"status": "ok", "detail": "SELECT 1 returned 1"},
       "auth": {"status": "ok", "detail": "SUPABASE_URL + SUPABASE_JWT_SECRET configured"}
     },
     ...
   }
   ```

   If `database` or `auth` says `"status": "fail"`, the env var isn't set
   on the backend service. Re-check Step 4a.

2. Open `https://devastroai.com/auth/signup` in your browser. You should
   see the signup form (NOT the "Auth not configured yet" message).
   If you see the latter, the frontend env vars are wrong — re-check
   Step 4b and trigger a Vercel redeploy.

3. Create a test account. You should get an email with a confirm link
   (check spam folder). Click it → you land at `/auth/confirm` →
   auto-redirects to `/app`.

4. Once logged in, the sidebar should be empty (no saved sessions yet).
   This is the read-side sync working — it pulled an empty list from the
   DB.

---

## What works after Phase 1 ships

✅ **Astrologers can sign up.** Email/password, email confirm, password
   reset — all working.

✅ **Database is provisioned and the schema is in place.** All 7 tables
   exist with indexes, FKs, partial indexes for Phase M matching.

✅ **Auth-gated backend endpoints work.** `GET /me`, `PATCH /me`,
   `GET /chart-sessions`, `POST /chart-sessions`, etc.

✅ **Sidebar reads from DB when signed in.** TanStack Query caches +
   invalidates. Empty list for fresh accounts.

✅ **/health surfaces all subsystems** so you can debug at a glance.

## What's NOT done yet (next focused commits)

⏳ **Write-side mutation pass-through** (P1.5b). Today, when you create
   a new chart while signed in, it appears in the sidebar but disappears
   on page refresh. Next commit wires the create/update/delete flows in
   page.tsx through to the API. This is a focused page.tsx edit that
   warrants its own verification pass.

⏳ **Profile editing UI** (P1.6 follow-up). The `PATCH /me` endpoint
   exists but there's no frontend form for editing display name / bio /
   photo URL yet. We'll add a `/app/profile` page when needed (probably
   alongside the client portal pages).

⏳ **Subscription billing flow** (Phase 2 — Razorpay integration).
   Schema is in place (`subscriptions` table); no checkout UI yet.

⏳ **Client CRUD UI** (Phase 3 — client portal pages). Schema in place
   (`clients` + `client_notes` + `portal_slug`); no add-client form yet.

⏳ **Astrologer-mode protected route gate.** Today `/app` works without
   login. To require login (and redirect to `/auth/login`), we add a
   gate in `/app/layout.tsx`. Holding off until astrologer mode formally
   becomes login-required (post-Phase-2).

---

## If something breaks

**Rollback:** Last safe state on develop is tagged `june-1-astrologermode-topnotch`.

```bash
git fetch --tags
git reset --hard june-1-astrologermode-topnotch
git push --force-with-lease origin develop
```

This reverts ALL Phase 1 code, but DOES NOT delete the Supabase project
or the Railway Postgres add-on (those stay set up for when you're
ready to try again).

**Cost so far:** Supabase free tier ($0/mo, 50k MAU limit). Railway
Postgres add-on (~$5-15/mo depending on usage — first $5 free with
Railway's hobby plan).
