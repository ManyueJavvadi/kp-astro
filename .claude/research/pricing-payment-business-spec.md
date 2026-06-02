# Pricing, Payment, and Business Setup Spec

**Status:** Approved-in-concept on 2026-06-01. Awaiting 3 final confirmations from user before this becomes the locked-in spec.
**Audience:** user + future Claude sessions + the CA who eventually handles filings.
**Replaces:** any earlier "pricing/business" thinking in `launch-tracker-2026-09-09.md` or `HANDOFF-2026-05-28-launch-prep.md`. Those docs now point here for these topics.

---

## TL;DR

| Decision | Locked answer |
|---|---|
| Pricing tiers | **Plus ₹499/mo** + **Pro ₹1,499/mo** (annual ~17% off) |
| Free AI per tier | Plus: 5 questions/mo · Pro: 30 questions/mo |
| Top-up packs | ₹200 / ₹500 / ₹1000 (anyone can buy, questions never expire) |
| Free trial | **30 days of Plus**, no credit card upfront |
| Payment processor | **Razorpay** (NOT Stripe — UPI Autopay is critical for Indian SaaS) |
| Business entity | **India sole proprietorship in dad's name** (resident Indian, zero NRI hassle) |
| Setup formality | **Zero at launch.** Razorpay onboarding only. Udyam/Current/GST/CA added only when revenue triggers cross thresholds. |
| Total Year-1 setup cost | **₹0** (Razorpay is free to onboard) |
| Total Year-1 ongoing cost | **~₹0 to ₹2,000** (only if dad needs to file ITR at all) |

---

## 1. The two-tier pricing model

### Plus tier — ₹499/month

For light AI users + astrologers who mostly need accurate KP calculations.

- ✅ All deterministic features (chart, houses, dasha, panchang)
- ✅ Muhurtha — ranked windows, best-window detail, full reasoning trace, copy-paste astrologer notes
- ✅ Horary — KP yes/no verdict, 4-level significators, sub-lord chains
- ✅ Match — compatibility verdict, score, per-house grid
- ✅ Client portal pages (per-client URLs)
- ✅ PDF exports
- ✅ Email support
- ✅ **5 AI questions / month** included (Analysis tab + AI chips on Horary/Match/Muhurtha)
- Buy more AI questions anytime via top-up packs
- **Annual: ₹4,999** (save ~17% vs monthly)

### Pro tier — ₹1,499/month

For astrologers who use AI heavily (deep Analysis chats, AI explanations on every tab).

- ✅ Everything in Plus
- ✅ **30 AI questions / month** included
- ✅ Priority support (24h response SLA)
- ✅ Early access to new features (Phase M matching network, etc.)
- **Annual: ₹14,999** (save ~17% vs monthly)

### Top-up packs (anyone with Plus or Pro can buy)

| Pack | Questions | Per-question rate | Discount |
|---|---|---|---|
| ₹200 | 5 | ₹40 | — |
| ₹500 | 15 | ₹33 | ~17% off |
| ₹1,000 | 35 | ₹28 | ~30% off |

**Rules:**
- Top-up questions **never expire** (carry over month to month)
- Used FIRST when included questions run out (FIFO from included → top-up)
- Buy from in-app: 2-tap purchase via Razorpay
- Same questions whether you're Plus or Pro tier

### Free trial

- **30 days of Plus tier**, no credit card upfront
- 5 free AI questions during trial (same as a regular Plus month)
- At day 30: prompt user to pick Plus / Pro / cancel
- If they ignore → account stays in "trial expired" read-only mode (can see their data, can't add new clients or generate new charts) for 7 days before soft-delete warning

---

## 2. AI vs deterministic feature map (the basis for tier-gating)

**Critical clarification:** the BULK of the app's value is deterministic (no AI cost). AI is a power-up, not the core. This is what makes the Plus tier (limited AI) genuinely valuable on its own.

### 100% deterministic (zero AI cost, available on BOTH tiers)

- **Chart tab** — chart wheel, planets table, houses overview, all KP calculations
- **Houses tab** — CSL chain view, significators, house grid, KSK strength
- **Dasha tab** — full Mahadasha/Bhukti/Antardasha tree, current period highlight
- **Panchang tab** — today/monthly panchang, choghadiya, auspicious periods, current hora
- **Muhurtha tab**:
  - 10 ranked windows for any event type
  - "Best Window" detail page (verdict, score, KP doctrine checks, panchang context)
  - "FULL REASONING TRACE" (engine audit trail)
  - "ASTROLOGER NOTES · COPY-PASTE READY" (template-filled engine output, looks AI-generated but isn't)
- **Horary tab**:
  - YES/NO verdict from 7th CSL doctrine
  - 4-level significator accordion (L1/L2/L3/L4)
  - Sub-lord chains
  - Verdict timing window
- **Match tab**:
  - Compatibility verdict (BONDED / FRIENDLY / CHALLENGING / BLOCKED)
  - Per-house grid (synced houses, planet placements)
  - Both partners' chart context
- **Client portal pages** — public URL, chart snapshot, notes timeline (when notes are typed by astrologer)
- **PDF exports** — 14-section deterministic PDF (no AI in PDF, as documented in CLAUDE.md)

### AI-powered (Claude API, billable per use)

These count against the tier's monthly quota OR consume top-up questions:

- **Analysis tab** — every question = 1 AI call
- **Multi-chart analysis** (chartsInContext + @ mentions in chat) = 1 AI call
- **Topic chips in Analysis** (Marriage, Career, Health, etc.) = 1 AI call each
- **Workspace input bar** ("Ask a deeper question…") = 1 AI call
- **AI Muhurtha Analysis section** (chips: Best muhurtha, Why this time?, Compare top 3, Alternatives, Remedies + free-text input) = 1 AI call each click
- **AI Match Analysis** (any "Ask about this match" chat) = 1 AI call
- **Horary "explain in plain English"** chips (if any) = 1 AI call

**Implementation note:** every Claude API call already routes through `recordAiCall()` in the codebase (existing instrumentation). We'll extend it to deduct from astrologer's monthly quota in real-time.

---

## 3. Margin math (with ₹30/question AI cost)

### Plus tier (₹499/mo)
```
Revenue:                            ₹499
AI cost (5 q × ₹30):                ₹150
Infrastructure share (Railway/Neon): ₹100
Razorpay fee (2% + 18% GST on fee): ₹12
GST reserve (18%, if registered):    ₹0 (below threshold initially)
─────────────────────────────────────────
Net margin / astrologer / month:    ₹237  (~48% margin)
```

### Pro tier (₹1,499/mo)
```
Revenue:                            ₹1,499
AI cost (30 q × ₹30):               ₹900
Infrastructure share:                ₹100
Razorpay fee (2% + GST):             ₹35
GST reserve:                         ₹0 (below threshold initially)
─────────────────────────────────────────
Net margin / astrologer / month:    ₹464  (~31% margin)
```

### Top-up pack ₹500 → 15 questions
```
Revenue:                            ₹500
AI cost (15 q × ₹30):               ₹450
Razorpay fee:                        ₹12
─────────────────────────────────────────
Net margin per top-up sale:         ₹38   (~8% margin — thin)
```

Top-up packs are intentionally thin-margin (we make money on the subscription; top-ups are a friction-removal product, not a profit center). If we need to fatten margins later, we adjust pack pricing.

### Break-even analysis

- At AI cost ₹30/q, **Plus tier becomes a loss above ~12 AI questions/month** for that astrologer.
- At AI cost ₹30/q, **Pro tier becomes a loss above ~47 AI questions/month** for that astrologer.
- **Mitigation:** if any astrologer regularly exceeds their tier's break-even, top-up purchases cover the overage. Beyond a threshold (say, 100 q/mo on Pro), we manually reach out: "let's discuss a higher tier or per-question pricing that works for both of us."

---

## 4. Payment processor — Razorpay

### Why Razorpay (not Stripe)
- **UPI Autopay support is critical.** Indian B2B SaaS at ₹499-1,499/mo needs UPI Autopay or churn skyrockets. Stripe's UPI support is weaker and doesn't onboard Canadian entities for INR collection at all.
- Lower fees on domestic INR (2% + GST vs Stripe's 2.9% + ₹2)
- India-native onboarding for sole prop with personal PAN
- Subscription product included free

### Fee summary
- UPI / Cards / Netbanking / Wallets: **2% + 18% GST on fee** = effective ~2.36%
- International cards: 3% + GST
- Premium cards (Amex, EMI, BNPL): 3% + GST
- RuPay Credit on UPI: 2.15% + GST
- No setup fee, no AMC, no monthly minimum

### Onboarding documents (sole prop, dad's name)
- Dad's PAN
- Dad's Aadhaar
- Dad's bank account (savings is fine to start)
- Website URL with active Privacy + T&C + Refund pages
- **GSTIN: NOT required** at our scale (below ₹20L turnover)
- **Udyam: NOT required** for sole prop Razorpay onboarding

### Onboarding timeline
- 1-3 business days standard
- New CKYC fast-track (Jan 2026): activates in minutes if dad already has a Central KYC record

### UPI Autopay (eMandate)
- Native Razorpay support, built into Subscriptions product
- Default per-debit limit: ₹15,000 (way above our ₹499-1,499 prices)
- Works with bank apps (any UPI-enabled bank in India)
- User approves once → Razorpay auto-charges monthly
- Failure handling: 3 retries over 3 days → subscription paused (not cancelled)
- Recommended: send pre-charge reminder email 3-5 days before charge

### Subscription failure flow
1. Day 0: charge attempt → fails (insufficient balance, expired card, etc.)
2. Day 0: notify user via email + SMS
3. Day 1: retry charge
4. Day 3: retry charge
5. Day 3: if still failing, subscription pauses (account stays read-only)
6. User can pay manually anytime within 7 days to resume
7. Day 10: soft-delete warning email
8. Day 30 (post-failure): account closed; data archived for 60 days; user can export anytime

---

## 5. Business setup — India sole proprietorship under dad

### Why this, not Pvt Ltd
- Dad is **resident Indian** (lives in India full-time). Zero NRI / FEMA complications.
- Sole prop in dad's name = simplest, cheapest, fastest.
- Revenue projection: 10-30 astrologers in year 1 = ₹60k-₹360k/year. Below all formality thresholds.
- Pvt Ltd adds ₹40k/year compliance for no benefit at this scale.

### The threshold ladder — what to add WHEN

```
Revenue ₹0 → ₹2.5L/year (10-40 customers):
  ✅ Razorpay onboarded on dad's PAN + savings account
  ✅ Website has Privacy/T&C/Refund pages
  ✅ Dad MAYBE files ITR (only if total income > exemption: ₹2.5L < 60yo, ₹3L 60-80, ₹5L 80+)
  ❌ No Udyam needed
  ❌ No Current Account needed
  ❌ No GST needed
  ❌ No CA needed (dad can self-file via ClearTax free)

Revenue ₹2.5L → ₹10L/year (40-165 customers):
  ⚠️ Dad files ITR-4 (presumptive scheme — declare 50% as profit, simple)
  ⚠️ CA worth engaging (~₹2-5k/year for ITR filing)
  ✅ Savings account still works (bank usually OK below ~₹10L/year inflow)

Revenue ₹10L → ₹20L/year (165-330 customers):
  ⚠️ Apply for Udyam (free, 15 min online)
  ⚠️ Open Current Account at HDFC/ICICI in dad's name
  ⚠️ Move Razorpay payouts to Current Account
  ⚠️ CA engagement standard (~₹500-1,500/month retainer)
  ✅ Still no GST (under ₹20L)

Revenue approaching ₹20L/year (330+ customers):
  ⚠️ Voluntarily register for GST around ₹15-18L (don't get caught at ₹20L mandatory line)
  ⚠️ Add 18% GST to all invoices
  ⚠️ File GSTR-1 quarterly + GSTR-3B (QRMP scheme)
  ⚠️ Annual GSTR-9
  ⚠️ CA cost rises (~₹2-5k/month)

Revenue ₹50L+/year:
  ⚠️ Consider converting to Pvt Ltd for liability protection + cleaner books
  ⚠️ Dad's tax bracket likely 30%; consult CA on whether to split income via Pvt Ltd salary
```

### Year-1 setup (do these in Week 1 of launch prep)

1. **Verify dad has Indian PAN** (almost certainly yes)
2. **Confirm dad has a savings account** with online banking enabled (HDFC/ICICI/SBI etc.)
3. **Polish website pages** — Privacy, T&C, Refund policy (we have stubs, need 1-day polish)
4. **Razorpay account application** — dad applies online with PAN + Aadhaar + bank + website URL
5. **Wait 1-3 days for Razorpay KYC approval**
6. **Connect Razorpay payouts → dad's savings account**
7. **Test charging end-to-end** (charge yourself ₹10, get refund, verify settlement)
8. **Done.** Start onboarding real customers.

**Total Year-1 setup cost: ₹0**
**Total Year-1 ongoing cost: ₹0** (or ~₹2,000 if dad's total income triggers ITR filing)

### Money flow

```
Customer (India) 
  → Razorpay (charges 2% + GST)
  → Dad's savings account (T+2 settlement)
  → Dad's income (Indian-source, taxed at dad's slab rate IF total income exceeds exemption)
  → Family transfer to son (you, in Canada): legal gift, no tax implication
```

### Tax simplicity

- Dad files **one ITR per year** in India
- Recommended form: **ITR-4 (presumptive scheme)** — declare 50% of revenue as profit, pay tax on that. No need for detailed expense tracking.
- At ₹60k-₹2.5L revenue: presumptive profit = ₹30k-₹1.25L. If dad has no other income, well below exemption → **₹0 tax**.
- At ₹2.5L-₹10L revenue: presumptive profit = ₹1.25L-₹5L. Tax kicks in based on slabs (5% above ₹2.5L, etc.).
- Filing: dad can self-file on incometax.gov.in or via ClearTax (free) for simple cases.

---

## 6. Open decisions — final 3 to confirm

1. **Dad has Indian PAN + savings account + Aadhaar — confirm all three?**
2. **Dad is comfortable being the legal owner** of the business (signs Razorpay onboarding, account holder, files annual ITR if needed)?
3. **Lock the pricing** (Plus ₹499 / Pro ₹1,499 / top-up packs as specified)?

Once these are confirmed, this spec is locked in and we move to building the Razorpay + subscription tracking + question-counting infrastructure in Week 7-8 of the launch tracker.

---

## 7. Things this spec deliberately does NOT cover

These come later (post-launch or in dedicated discussions):

- **Per-astrologer dynamic pricing** (raising/lowering individual astrologers' prices based on usage patterns) — Q1 2027 feature; needs data accumulation first
- **Stripe addition** for international users (NRI, US/UK/AUS astrologers) — v1.5 when we have non-Indian demand
- **Family / studio plans** (multiple astrologers on one account) — v1.5
- **Refund policy specifics** — needs separate discussion + legal review
- **Cancellation flow** — needs separate UX design
- **Dunning emails** (the actual copy for "payment failed" / "renewal in 5 days" etc.) — write before Week 8 of launch
- **GST conversion playbook** (exact steps when we cross ₹15L turnover) — write closer to actual trigger

---

## 8. Risks I'm acknowledging upfront

- **Razorpay onboarding gets stricter unpredictably.** They sometimes add new doc requirements. If onboarding stalls, we have time before Sept 9 to escalate via their support.
- **Savings account commercial-credit risk.** Banks technically aren't supposed to receive commercial credits in savings accounts. At our scale, banks don't care. If revenue grows fast, escalate to Current Account proactively.
- **GST registration takes 7-15 days.** If we hit ₹15L unexpectedly fast, we should have started the process at ₹10L to be safe.
- **Sole prop has unlimited personal liability for dad.** For our business type (KP astrology SaaS with disclaimers), liability risk is genuinely low. But if a client lawsuit ever emerges, it hits dad's personal assets. Insurance is a separate decision later.
- **Bank account in dad's name means money "belongs" to dad legally.** Family transfers to you are legal/tax-free, but we should be intentional about how/when money flows from dad to you (you in Canada are not legally entitled to it as a co-owner — dad is the owner).

These are all manageable. None blocks Sept 9 launch.
