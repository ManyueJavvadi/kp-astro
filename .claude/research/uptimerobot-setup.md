# UptimeRobot Setup Guide — 5 minutes

**Purpose**: Get alerted within 5 minutes if devastroai backend goes down,
instead of discovering it accidentally hours later (like the May 19 Railway
outage).

**Cost**: Free tier covers our needs (50 monitors, 5-minute interval).

---

## Step-by-step

### 1. Create account
Go to https://uptimerobot.com → Sign up (free).

### 2. Add a new monitor

Click **"+ New Monitor"**. Configure:

| Field | Value |
|---|---|
| **Monitor Type** | HTTP(S) |
| **Friendly Name** | DevAstroAI Backend |
| **URL** | `https://devastroai.up.railway.app/health` |
| **Monitoring Interval** | 5 minutes |
| **Monitor Timeout** | 30 seconds |
| **Alert Contacts** | Your email (verify first) — optionally add SMS |

**Critical setting** — under "Advanced":
- **HTTP Method**: GET
- **Custom HTTP Statuses** → set "Up" to: `200, 200`
  (anything else, including the 503 our `/health` returns on critical failure, is treated as "Down")
- **Keyword Monitoring** (optional but recommended):
  - Type: "Should exist"
  - Keyword: `"status":"ok"`
  - This catches the "degraded" case (HTTP 200 but `status: "degraded"` in body) → still alerts

### 3. Verify it works

After saving:
- Status should show "Up" within 1 minute (green dot)
- Click the monitor → view the response. Should show JSON like:
  ```json
  {
    "status": "ok",
    "checks": {
      "ephemeris": {"status": "ok", "detail": "Sun sidereal lon at J2000 = 256.32°"},
      "chart_compute": {"status": "ok", "detail": "12 cusps + 9 planets generated"},
      "anthropic_key": {"status": "ok", "detail": "key configured"}
    },
    "version": "0.1.0",
    "commit": "abc123def",
    "uptime_seconds": 12345,
    "timestamp": "2026-05-20T..."
  }
  ```

### 4. Test the alert (optional but recommended)

You want to confirm alerts actually reach you BEFORE there's a real outage.

Quickest way to test:
1. Go to Railway → DevAstroAI service → Settings → temporarily set
   `ANTHROPIC_API_KEY` to empty string (this triggers `degraded` status)
2. Wait 5-10 minutes
3. You should get an alert email from UptimeRobot
4. Restore the env var and confirm "Up" status returns

**Don't forget step 4** — keep the env var restored.

### 5. Optional — add public status page

UptimeRobot free tier includes a public status page:
- Sidebar → Status Pages → Create
- Name: "DevAstroAI Status"
- Add the backend monitor
- Get a URL like `https://stats.uptimerobot.com/AbC123`
- Link it from devastroai.vercel.app footer or settings page

This is what users would see during an outage — much better than a CORS error.

---

## What the `/health` endpoint returns

The endpoint we just shipped (PR F2) returns:

**HTTP 200 + `status: "ok"`** when everything works:
- Ephemeris compute works (swisseph can return planet positions)
- Chart compute works (full chart generation succeeds with test data)
- Anthropic API key is configured

**HTTP 200 + `status: "degraded"`** when something non-critical fails:
- Chart compute still works
- But Anthropic key is missing → AI features won't work
- Charts still generate, just no AI analysis

**HTTP 503 + `status: "down"`** when critical features fail:
- Ephemeris broken (rare — usually means swisseph files missing)
- Chart compute fails (engine bug or env issue)
- Backend is effectively useless

UptimeRobot will treat:
- 200 + `"status":"ok"` keyword present → **UP** ✓
- 200 + `"status":"ok"` keyword MISSING (degraded) → **DOWN** ⚠ (alerts)
- 503 → **DOWN** 🚨 (alerts)
- No response / timeout → **DOWN** 🚨 (alerts — this caught Railway outages)

---

## What you'll see when something goes wrong

Email subject: `Monitor is DOWN: DevAstroAI Backend (https://devastroai.up.railway.app/health)`

Email body shows:
- When it went down (UTC timestamp)
- What error (timeout / 503 / keyword missing)
- Quick link to the monitor history

Action items in the email:
1. Check https://status.railway.app — is it a Railway issue?
2. If not Railway, check Railway dashboard logs
3. If logs show an exception, fix and redeploy
4. If everything looks fine but `/health` reports `down`, hit `/health` manually
   to see which check failed in the JSON body

---

## Frequency: every 5 minutes

Free tier sets monitoring interval at 5 minutes minimum. That means:
- Worst case detection time: 5 minutes after backend goes down
- Worst case recovery confirmation: 5 minutes after backend comes back

For our scale (current usage), 5 minutes is fine. If you go to paid tier
($7/month), interval drops to 1 minute.

---

## What this prevents

The May 19 Railway outage scenario:
- **Without UptimeRobot**: user discovered manually hours after outage started
- **With UptimeRobot**: email/SMS within 5 minutes of outage

Future outages of any kind (Railway issue, env var lost, deployment broken,
Anthropic key expired) will alert you instead of users discovering them.

This is the lowest-effort highest-leverage reliability improvement we can ship.

---

## Quick reference

| Action | Where |
|---|---|
| UptimeRobot dashboard | https://uptimerobot.com/dashboard |
| Railway dashboard | https://railway.app |
| Railway status page | https://status.railway.app |
| Anthropic status | https://status.anthropic.com |
| Vercel status | https://www.vercel-status.com |

**Time to set up: ~5 minutes. Do it before the next outage, not after.**
