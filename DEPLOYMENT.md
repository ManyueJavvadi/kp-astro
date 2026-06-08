# DEPLOYMENT — dev/staging/prod for DevAstroAI

Last updated: 2026-06-08 (Step 1 of launch-prep playbook).

This doc describes the **branch → environment → URL** mapping after
the dev/prod separation is set up, plus the click-by-click setup
steps you only do once.

---

## TL;DR — the new workflow

```
Local change
    ↓
git commit
    ↓
git push origin develop  ──────────►  staging.devastroai.com   (Vercel)
                                       └──► devastroai-staging.up.railway.app (Railway backend)
                                              └──► staging Postgres (separate DB)
                                              └──► staging Supabase project (separate users)

After you smoke-test on staging and it looks good:

git checkout main
git merge develop
git push origin main  ─────────────►  devastroai.com           (Vercel prod)
                                       └──► devastroai.up.railway.app (Railway backend prod)
                                              └──► prod Postgres
                                              └──► prod Supabase project
```

**Rollback prod**: `git revert <bad-sha> && git push origin main`.  
**Rollback staging**: same on `develop`. Anyone (Claude, you) can ship to staging freely. Only intentional `git merge develop → main` ships to prod.

---

## Branch responsibilities

| Branch       | Deploys to           | Who can push                  |
|--------------|----------------------|-------------------------------|
| `develop`    | Staging (auto)       | Anyone — Claude pushes freely |
| `main`       | **Production (auto)**| You only (manual merge)       |
| `feature/*`  | Vercel preview URLs  | Anyone — auto preview per PR  |

---

## One-time setup — Tomorrow's click-through

You'll do this once. ~3 hours including the smoke test at the end.
Do sections A → B → C → D → E in order. Ping me when you start each one — I'll watch your screenshots and unblock.

### Section A — Supabase (~30 min)

The new STAGING Supabase project is for test signups so they don't pollute the real prod user table.

1. Sign in at https://supabase.com — go to your existing organisation.
2. Click **New Project**.
   - Name: `devastroai-staging`
   - Database password: generate a strong one, save it in your password manager
   - Region: same as your prod project (lowest latency to Railway)
   - Pricing plan: **Free** (we don't need paid for staging)
3. Wait for the project to finish provisioning (~2 min).
4. **Replicate prod settings into staging:**
   - Settings → Auth → Email Templates: copy each template body from the prod project tab into staging (signup confirm, password reset, magic link, change email). The default Supabase templates work but yours probably have DevAstroAI branding.
   - Settings → Auth → URL Configuration:
     - Site URL: `https://staging.devastroai.com`
     - Redirect URLs (add): `https://staging.devastroai.com/auth/confirm`, `http://localhost:3000/auth/confirm`
   - Settings → API → JWT Settings:
     - Confirm "JWT Signing Keys" is set to **Asymmetric (recommended)** — same as prod. If the prod project uses asymmetric, staging must too. (Hotfix from 2026-06-02.)
5. **Save these values for later** (you'll paste them into Railway + Vercel):
   - `SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `SUPABASE_JWT_SECRET` = Settings → API → JWT Settings → JWT Secret (NOT anon, NOT service_role)
   - `SUPABASE_ANON_KEY` (or publishable key) = Settings → API → Project API keys

---

### Section B — Railway (~45 min)

You'll add a SECOND backend service to your existing Railway project. The existing service stays on `main` (will be prod); the new one tracks `develop` (will be staging).

1. Open your existing Railway project.
2. **First** — make sure your existing backend service is configured for prod-only:
   - Click your existing backend service → Settings → Source → confirm "Branch" is set to `main`. If it currently says `develop`, change it to `main` AFTER section E (so you don't break prod mid-setup). For now leave it.
3. Click **+ New** → **Empty Service**. Name it `backend-staging`.
4. Inside `backend-staging`:
   - Settings → Source → "Connect Repo" → pick your GitHub repo → set Branch = `develop`
   - Settings → Source → Root Directory = `backend` (same as prod service)
   - Settings → Build → Builder = `NIXPACKS` (matches `railway.json`)
5. Add a Postgres add-on JUST FOR STAGING:
   - In the project view (not inside the service), click **+ New** → **Database** → **PostgreSQL**. Name it `postgres-staging`.
   - Click into `backend-staging` service → Variables tab → click **Reference Variable** → pick `postgres-staging.DATABASE_URL`. This auto-injects the staging DB URL.
6. Copy env vars from prod backend → paste into staging backend, **overriding** these to staging values:

   | Variable                  | Staging value                                          |
   |---------------------------|--------------------------------------------------------|
   | `DATABASE_URL`            | Auto-injected from `postgres-staging` (step 5)         |
   | `SUPABASE_URL`            | New staging URL (from Section A step 5)                |
   | `SUPABASE_JWT_SECRET`     | New staging JWT secret (Section A step 5)              |
   | `FRONTEND_URL`            | `https://staging.devastroai.com`                       |
   | `ENVIRONMENT`             | `staging`                                              |
   | `SENTRY_ENVIRONMENT`      | `staging`                                              |
   | `CORS_ALLOWED_ORIGINS`    | `https://staging.devastroai.com,http://localhost:3000` |
   | `ANTHROPIC_API_KEY`       | Same as prod (we share the key)                        |

   Leave everything else the same as prod.
7. Wait for the first deploy to finish (~3 min). Check the deploy logs — Alembic should auto-migrate the empty staging DB to the latest schema (`0004_client_interactions_table`).
8. Hit `https://<railway-staging-url>/health` in your browser. Should return `{"status": "ok", ...}`.
9. **Save the staging backend URL** (something like `https://backend-staging-production-xxxx.up.railway.app`) — you'll paste it into Vercel next.

---

### Section C — Vercel (~30 min)

Your existing Vercel project will be reconfigured so Production = `main` and Preview = `develop`.

1. Open your existing Vercel project (devastroai.com).
2. Settings → Git → **Production Branch** = `main`. Save.
3. Settings → Git → Deploy Hooks → if any exist for `develop`, delete them. We'll let normal Preview deploys handle it.
4. Settings → Domains:
   - `devastroai.com` should already be there. It serves Production = `main`.
   - Click **Add** → enter `staging.devastroai.com` → assign it to **Preview / develop branch** (Vercel will ask which branch this domain serves).
5. Settings → Environment Variables. For each variable currently set, click it and SPLIT it:
   - Set "Production" scope to current prod value (no change for those)
   - Add a "Preview" scope value pointing at staging

   | Variable                          | Production              | Preview                          |
   |-----------------------------------|-------------------------|----------------------------------|
   | `NEXT_PUBLIC_ENV`                 | `production`            | `staging`                        |
   | `NEXT_PUBLIC_API_URL`             | Current prod URL        | Staging backend URL (Section B step 9) |
   | `NEXT_PUBLIC_SITE_URL`            | `https://devastroai.com`| `https://staging.devastroai.com` |
   | `NEXT_PUBLIC_SUPABASE_URL`        | Current prod            | New staging URL (Section A step 5) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Current prod            | New staging anon key             |

6. Trigger a redeploy of `develop` so the new Preview env vars take effect:
   - Deployments tab → find the latest `develop` build → click ⋯ → **Redeploy** (NOT "Use existing build cache" — full rebuild so env vars get inlined).

---

### Section D — DNS (~15 min)

You only need this if `devastroai.com` is registered through Cloudflare / GoDaddy / Namecheap / similar.

1. Sign in to your DNS provider for `devastroai.com`.
2. Add a new record:
   - Type: `CNAME`
   - Name: `staging`
   - Value: `cname.vercel-dns.com`
   - TTL: Auto (or 300s)
3. Wait ~5 min for DNS propagation. You can check with `nslookup staging.devastroai.com` from a terminal.
4. Back in Vercel → Settings → Domains → next to `staging.devastroai.com` you should see a green checkmark within 10 min. SSL cert auto-issues.

---

### Section E — Smoke test (~30 min, together)

This is the moment of truth. We'll verify staging is fully isolated from prod.

1. Push a TINY harmless change to develop (I'll prep — e.g. typo fix in CLAUDE.md).
2. Watch in parallel:
   - Vercel dashboard → confirm staging.devastroai.com gets a new deploy
   - Vercel dashboard → confirm devastroai.com is NOT touched
   - Railway dashboard → confirm backend-staging redeploys (because develop changed)
   - Railway dashboard → confirm backend (prod) is NOT redeployed
3. Visit https://staging.devastroai.com:
   - Top-right corner should show a "STAGING" banner (I'll add this UI in a separate small commit)
   - Sign up with a throwaway email
   - Confirm the email lands and the link points at `staging.devastroai.com/auth/confirm`
   - Click confirm → log in → land on `/app/clients`
4. Visit your prod Supabase dashboard → Auth → Users → confirm the throwaway email is NOT there (it should only be in staging Supabase)
5. Generate a chart on staging → confirm it persists. Then check prod DB → confirm the row is NOT there.
6. If all of the above pass: **dev/prod separation is live**. We can safely do the S5 route refactor next.

---

## Common gotchas

- **CORS errors on staging**: backend's `CORS_ALLOWED_ORIGINS` must include `https://staging.devastroai.com`. If you see "blocked by CORS" in browser console, this is almost certainly the cause.
- **Supabase JWT verification fails**: staging backend MUST use the staging Supabase JWT_SECRET. Mixing prod backend with staging Supabase tokens (or vice versa) gives `401 invalid_token` on every authed request.
- **Migrations didn't run**: check Railway deploy logs. Look for `Running upgrade ... -> 0004_client_interactions_table`. If you see migration errors, the deploy will have failed and the OLD version keeps serving — fix and redeploy.
- **Forgot to redeploy after env var change**: `NEXT_PUBLIC_*` are inlined at BUILD time, not runtime. After changing them in Vercel you MUST trigger a redeploy.

---

## After tomorrow — daily workflow

```bash
# Make a change (Claude or you)
git add ...
git commit -m "feat: ..."
git push origin develop

# Watch staging.devastroai.com deploy + smoke-test it manually

# Happy with staging? Ship to prod:
git checkout main
git pull origin main
git merge develop
git push origin main

# Bad prod deploy? Revert:
git checkout main
git revert <bad-sha>
git push origin main
```

---

## Files added in this Step 1 prep

- `DEPLOYMENT.md`  ← you are here
- `backend/.env.example`  (updated with staging-specific vars)
- `frontend/.env.example`  (updated with NEXT_PUBLIC_ENV + staging vars)
- `main` branch created from `develop` (initial state = current production)

Coming in a separate small commit after this:
- `<STAGING>` banner UI in the frontend top-right when `NEXT_PUBLIC_ENV !== "production"`
