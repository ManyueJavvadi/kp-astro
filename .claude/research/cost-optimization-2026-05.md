# Cost Optimization Investigation — May 2026

**Status:** Phase 1 (diagnostics rollout) — in progress
**Owner:** Manyue + Claude (collaborative)
**Started:** 2026-05-25
**Goal:** Cut Anthropic API spend with **zero quality / accuracy loss** before public launch.

This doc is the single source of truth for the cost-optimization arc. Read it at the
start of any session that touches caching, llm_service.py, cost_audit.py, or
Anthropic billing. It exists because we tried cost optimization once before
(Phase 13.1, PR 33) and broke production by bumping cache TTL without the right
beta header — keeping a doc means we don't repeat that mistake.

---

## TL;DR for the next session

1. We have a **cost leak hypothesis but no proof**.
2. The PR landed on `claude/cache-diag-probe` adds cache diagnostics behind
   `CACHE_DIAG=1` env flag. **It does nothing by default.**
3. To collect data: set `CACHE_DIAG=1` in Railway env, run normal app for 48h,
   then `railway logs | grep diag_reason` and bucket by reason type.
4. Whichever `*_changed` type dominates is the actual bug. Then we fix the root
   cause and that fix is the real cost reduction.
5. **Do NOT bump cache TTL to 24h** without first investigating whether the
   beta still exists and whether the header plumbing works (PR 33 burned on this).

---

## Hard constraints (read before suggesting any change)

### Quality protection (from CLAUDE.md)
- **`backend/app/services/llm_service.py` is a sacred region.** Specifically:
  `get_system_prompt()`, prompt blocks, `format_chart_for_llm`,
  `format_match_for_llm`, multi-model routing logic.
- **Hard rule:** any PR that breaks AI quality must be REVERTED, not patched.
- **Golden chart fixtures** must regress-pass: Manyue (09/09/2000 12:31 PM Tenali),
  Ramya, Vineetha, Sreeja. (Harness still pending — was on Phase A backlog.)

### Anthropic API facts (verified from official docs, 2026-05-25)
- **Published TTL options:** `5m` (1.25× write) and `1h` (2× write) only.
- **24h cache:** NOT in current public docs. PR 33 (May 2026) tried bumping to
  24h without the `extended-cache-ttl-2025-04-11` beta header → broke
  `/astrologer/analyze-stream`. Reverted in commit `1fe7c5c`. The 24h beta may
  no longer exist publicly. **Do not retry without contacting Anthropic support
  to confirm beta is still live.**
- **Max 4 cache breakpoints per request.** We currently have 6 `cache_control`
  sites — 2 are silently ignored. Worth auditing later.
- **20-block lookback window** per breakpoint.
- **Minimum cacheable tokens:** Sonnet 4.6 = 1,024; Haiku 4.5 = **4,096**.
  Calls below threshold silently skip caching. This may explain Haiku's
  poor amortization (0.64×) — some Haiku calls may be under 4096 tokens.
- **Cache refresh on hit is FREE** — TTL resets on every read, no cost.
  Important: this means 5m cache works fine for tight conversations; the only
  win from 1h/24h is for users who leave and come back.
- **Hierarchy:** tools → system → messages. Changing system invalidates messages.

### Sacred call-site inventory (llm_service.py)
| # | Line | Endpoint | Model | Shape | Notes |
|---|---|---|---|---|---|
| 1 | 3031 | `llm.detect_topic` | Haiku 4.5 | one-shot | ~10 token classifier |
| 2 | 3421 | `llm.get_prediction` | Sonnet/Haiku | multi-turn | Non-streaming prediction |
| 3 | 3751 | `llm.get_prediction_stream` | Sonnet/Haiku | streaming multi-turn | **Biggest $$ — Analysis tab** |
| 4 | 5374 | `llm.get_match_prediction` | Sonnet 4.6 | mostly one-shot | Match analysis |
| 5 | 5440 | `llm.get_quick_insights` | Haiku 4.5 | dead | Removed in PR 1 of this arc |
| 6 | 5801 | `llm.get_muhurtha_prediction` | Sonnet 4.6 | multi-turn capable | Muhurtha analysis |

### Mid-stream multi-model routing (expected `model_changed` noise)
The Analysis path intentionally switches **Sonnet → Haiku** when a user moves
from a full_topic to a sub_question follow-up (lines 3409-3415 + 3739-3745).
**This will show up as `cache_miss_reason: model_changed` in diagnostics.**
That is by design, not a bug. Ignore those entries when grepping.

---

## Baseline cost data (from Anthropic Console, 2026-05-25, last 7 days)

Total month-to-date: **$61.26 USD** (≈ ₹5,150 at ₹84/USD, or ≈ ₹3,800 at ₹62/CAD
if you read your console as CAD).

### Sonnet 4.6 — 5.4M input tokens
| Bucket | Tokens | % | $/M | Cost (week) |
|---|---|---|---|---|
| Uncached | 770K | 14% | $3.00 | $2.31 |
| Cache write 5m | 53K | 1% | $3.75 | $0.20 |
| **Cache write 1h** | **1.7M** | **32%** | **$6.00** | **$10.20** |
| Cache read | 2.8M | 52% | $0.30 | $0.84 |
| **Total input** | 5.4M | 100% | — | **$13.55** |

Read ratio: **78.5%** · Write amortization: **1.58×** (poor — should be 5×+)

### Haiku 4.5 — 819K input tokens
| Bucket | Tokens | % | $/M | Cost (week) |
|---|---|---|---|---|
| Uncached | 170K | 21% | $0.80 | $0.14 |
| Cache write 5m | 0 | 0% | — | $0 |
| **Cache write 1h** | **395K** | **48%** | **$1.60** | **$0.63** |
| Cache read | 254K | 31% | $0.08 | $0.02 |
| **Total input** | 819K | 100% | — | **$0.79** |

Read ratio: 59.9% · Write amortization: **0.64×** (cache is net-NEGATIVE)

### Cost composition (visual confirmation from Cost → Token Type chart)
- ~70% of cost is **prompt caching write (1h)** — the orange bar dominates every day
- ~10% is output, ~10% uncached input, **<5% cache reads** — cache reads barely register

### What the numbers tell us
1. Caching is **barely above break-even** on Sonnet (1.58× vs needed 2.22× for 1h cache to fully amortize)
2. Haiku caching is **actively losing money** (0.64× — caching writes cost more than they save)
3. Output tokens are NOT the issue — they're ~$5/month
4. The leak is in **how often the same content is re-cached** across sessions

---

## Diagnostics rollout plan (this PR)

### What's being added (PR `claude/cache-diag-probe`)
- New module `backend/app/services/cache_diag.py` — feature-flag check, in-memory
  prev_id store with LRU cap, beta header constant, safe response-extraction.
- Extended `backend/app/services/cost_audit.py` — `log_anthropic_call()` accepts
  two new optional kwargs: `diag_reason: str | None` and `diag_missed_tokens: int`.
  Existing call sites pass nothing → output unchanged.
- 4 call sites in `llm_service.py` switched to `client.beta.messages.create/stream`
  **only when `CACHE_DIAG=1` env var is set**, with diagnostics threading and
  prev_id forward-passing via session key `f"{endpoint}:{chart_hash}:{topic}:{mode}:{lang}"`.

### Risk model
- **Default OFF.** With `CACHE_DIAG` unset, code paths are byte-identical.
- **Try/except around all diagnostics code.** SDK shape mismatches degrade
  silently to "diagnostics off" — never breaks the user-facing call.
- **Beta is best-effort by Anthropic design** — per docs: *"Diagnostics never
  blocks or fails your request."*
- **In-memory prev_id dict capped at 500 entries** with LRU eviction.

### Rollout sequence
1. ✅ Merge PR to develop (with CACHE_DIAG unset → zero behavior change)
2. Set `CACHE_DIAG=1` in Railway environment variables, restart
3. Use the app normally for **48 hours**
4. `railway logs | grep diag_reason` — bucket counts by reason type
5. Bring the bucket distribution back to this doc + Claude session to identify root cause
6. Write actual cost-reduction fix as a separate PR
7. Set `CACHE_DIAG=0` again after fix verified — no need to leave beta on long-term

### Expected outcomes (what we hope to see in 48h logs)
| `diag_reason` dominance | Likely root cause | Fix shape |
|---|---|---|
| `system_changed` | Timestamp / variable date in system prompt | Move dynamic data out of cache-controlled block |
| `tools_changed` | Tools list reordering or schema serialization drift | Force deterministic ordering |
| `messages_changed` | Conversation history being mutated, not appended | Fix history serialization on backend |
| `model_changed` | Expected (intentional Sonnet→Haiku switch) | No action (noise floor) |
| `previous_message_not_found` | Sessions too long-gapped or workspace mismatch | Tune session-key TTL |
| `unavailable` | Beyond comparison horizon | No action |

---

## Cost-side strategies considered + rejected

**From `llm_cost_reduction_report.md` review (2026-05-25):**

| Strategy | Verdict | Why |
|---|---|---|
| Switch 1h → 5m cache | ✗ Reject | Worse for cross-session reuse; user pattern not tight enough |
| Dynamic KB pruning by question_type | ✗ Reject | Cache-busting (two prefixes → two writes); quality risk on reasoning style; sacred region |
| Dense JSON chart compaction | ✗ Reject | Touches sacred `format_chart_for_llm`; saves ~$10/yr; not worth risk |
| Haiku routing for all follow-ups | ✗ Reject (already partial) | Already doing this for sub_question; further pushing breaks accuracy; user has spent weeks tuning Sonnet path |
| 24h cache TTL | ⚠ Hold | Was on backlog; current public docs don't list it; need to confirm beta still exists before retry |
| Conversation history sliding window + summarization | ✅ Possible future PR | Genuine win; not in current PR scope |
| Time-invariant `answer_cache` keys (drop today_ist for natal queries) | ✗ Reject as proposed | User correctly pointed out RPs / current dasha / transits genuinely depend on "today" — would serve stale answers |
| Deterministic shortcuts for lookup-class queries | ✅ Possible future PR | "What's my current dasha?" etc. — engine can answer at $0 |
| Cache breakpoint placement audit | ✅ This PR partially helps | Diagnostics will tell us if breakpoints are misplaced |
| Per-user query rate limit | ✅ Recommended pre-launch | Prevents abuse spike from draining credits |

---

## INR / USD pricing strategy (for public launch)

**Anthropic prices in USD. There is no INR billing option.** The "CAD" you see
in your console is your payment-method display currency; the underlying math is USD.

For an INR-priced product (₹X/month subscription for Indian astrologers):

1. **Internally model your subscription as "covers $Y of Claude cost + fixed margin"**, display as ₹ to the user. Re-evaluate ₹ price quarterly as USD/INR moves.
2. **Build a 20-25% FX buffer** into INR pricing. Don't price at exact USD-cost × FX rate — protect against rupee weakness + bank conversion fees.
3. **Set a hard monthly cap** in Anthropic console (Manage → Limits) — prevents runaway bug from draining your account.
4. **Implement per-user query rate limits** in FastAPI — e.g., 50 Sonnet calls / astrologer / day. One abusive client cannot blow up the bill.
5. **Use Razorpay / Stripe India / PayU** for INR payment collection on the revenue side. Cost side stays USD, gap is your margin.
6. **Track cost-per-astrologer** as a key metric — augment `cost_audit.py` with a user/session attribution column once auth lands.

Current FX reference (2026-05-25): 1 USD ≈ ₹84 · 1 CAD ≈ ₹62

---

## Open questions for after diagnostics data lands

- Is the 24h cache beta still live? (Ask Anthropic support; do NOT just bump TTL blind.)
- Are any of the 6 `cache_control` sites in `llm_service.py` redundant (the
  4-breakpoint max means 2 are silently ignored — which two?)
- Why does Haiku amort sit at 0.64×? Are some Haiku calls below the 4,096-token
  minimum cacheable size? (Diagnostics + audit log token counts will tell.)
- Should we add conversation history compaction as the next PR? (Depends on
  whether `messages_changed` shows up frequently in 48h data.)
- Should we add deterministic shortcuts for lookup-class queries (e.g.,
  "What's my current dasha?")? (Audit Analysis logs to see how many queries
  are mechanical lookups.)

---

## Session continuity checklist

Next session picking this up should:
1. Read this doc top to bottom (5 min).
2. Check `git log --oneline origin/develop` for the `cache-diag-probe` PR landing.
3. If `CACHE_DIAG=1` was set on Railway: `railway logs --since 48h | grep diag_reason | sort | uniq -c | sort -rn`.
4. Bring the distribution to the conversation.
5. Identify dominant `diag_reason`, look up the matching "Fix shape" in the
   "Expected outcomes" table above.
6. Write the targeted fix PR.

**Do NOT** start by suggesting "let's bump cache TTL to 24h" — see Phase 13.1
history and the constraints section above.
