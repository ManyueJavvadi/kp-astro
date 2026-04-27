# KP Pattern Library — Recognised Combinations

This file catalogues the high-signal KP patterns that recur across charts.
The LLM should look for these patterns BEFORE generic significator scans —
they compress many small signals into one named diagnosis the astrologer
can cite.

Each pattern lists: **What to look for**, **Why it works** (KSK
reasoning), **What to say** (verdict template), and **Caveats**.

---

## MARRIAGE — Fructification Patterns

### Pattern M1: Venus + Jupiter joint period (the classical marriage trigger)
- **Look for**: AD = Venus AND Venus is significator of H7 OR H11 OR H2
- **OR**: AD = Jupiter AND Jupiter signifies H2/H7/H11 AND Jupiter is in RP
- **Why**: Venus is the karaka of marriage; Jupiter is the karaka of family/expansion. When either is the AD lord AND a significator AND a Ruling Planet, the trigger fires.
- **Verdict**: "Venus AD (date → date) is the strongest marriage window in this chart — significator status is confirmed AND Venus is currently ruling."
- **Caveats**: If Venus also signifies H6 strongly, expect partner-from-workplace; if H12, partner from far away.

### Pattern M2: Saturn delay-not-denial
- **Look for**: H7 CSL chain shows Saturn as one of the layer planets, Saturn is a significator of relevant houses
- **Why**: KSK Reader explicitly states "Saturn comes — delay but not denial" (when Saturn is a significator). Distinguishes from Saturn-as-denial (only signifies H1/H6/H10/H12).
- **Verdict**: "Saturn AD will delay but not deny. The actual fructification will be in the PAD of [a relevant-house significator within Saturn AD]."
- **Caveats**: Only applies when Saturn signifies a relevant house. If Saturn ONLY signifies denial houses, this pattern does not apply — that case is denial.

### Pattern M3: H7 in fixed sign + strong fruitful CSL
- **Look for**: H7 cusp falls in a Fixed sign (Taurus / Leo / Scorpio / Aquarius), and CSL is a strong A/B significator of H2/H7/H11
- **Why**: Fixed sign at H7 = once married, stable union. Movable sign + weak CSL = potential remarriage. Dual sign = two marriages possible.
- **Verdict**: "H7 in [sign] (fixed) plus strong CSL signification = stable single marriage."
- **Caveats**: Fixed sign alone is NOT enough — must combine with CSL signifying relevant houses.

### Pattern M5: AD-lord = supporting-cusp-sub-lord (PRIMARY KSK TIMING TRIGGER) ⭐
- **Look for**: An upcoming AD lord that IS the sub-lord of H2, H7, or H11, AND whose 4-step chain signifies the OTHER two relevant cusps
- **Why**: KSK Reader (Marriage chapter, verbatim): *"Marriage fructifies in the joint period of significators of 2, 7 and 11. When the AD lord IS THE SUB-LORD of any one of these cusps AND its chain signifies the other two, that AD is the primary marriage-trigger window."*
- **Why this matters more than karaka-AD**: Many charts have Mercury or Jupiter (not Venus) as the H2 + H11 sub-lord. In such charts, Mercury AD or Jupiter AD will trigger marriage YEARS before the Venus AD — and the chart's natural marriage timing IS that earlier AD, not Venus AD. Karaka-bias (waiting for Venus AD) is a PARASHARI leak that KSK rejects.
- **Verdict template**: "[Planet] is the sub-lord of H[2/7/11] AND signifies H[other relevant cusps]. Per KSK strict timing, [Planet]'s AD ([start]→[end]) is the primary marriage-trigger window. Marriage most likely fires in this AD's [Venus or Jupiter or supporting-significator] PAD."
- **Caveats**:
  - The sub-lord must signify AT LEAST one of the OTHER relevant cusps (not just be the sub-lord cosmetically)
  - If the sub-lord chain signifies ONLY denial houses, it does not trigger marriage
  - Combine with star-sub harmony of H7 CSL — both must be aligned
- **Engine support**: The `ad_sublord_triggers` block in ADVANCED COMPUTE lists every upcoming AD lord that is a marriage-cusp sub-lord. The `ksk_timing_active` flag is true when the AD lord's chain signifies other relevant cusps.

### Pattern M6: Jupiter Gocharya through H11 (transit-based marriage fulfillment)
- **Look for**: A future window where Jupiter is transiting through the native's H11 cusp sign, AND the running AD/PAD has any marriage signification
- **Why**: KSK Reader (later editions): Jupiter's transit through H11 (the gain/fulfillment house) activates the marriage completion signal. When dasha + transit both point to H11 simultaneously, that is the PEAK marriage-firing window.
- **Why H11 specifically**: H1 = self awareness; H7 = matter present; H11 = matter ARRIVES (gain). Jupiter on H11 is the "arrival" trigger.
- **Verdict template**: "Jupiter transits H11 ([sign]) from [date] to [date]. This overlaps with [running AD/PAD]. The convergence of dasha + transit makes [overlap window] the peak marriage-firing window."
- **Caveats**:
  - Jupiter transit alone (without dasha support) does NOT fire marriage
  - Jupiter transit through H7 is also a trigger but weaker than H11
  - Saturn simultaneously transiting H7 can delay even with Jupiter on H11
- **Cycle reference**: Jupiter takes ~12 years through the zodiac, ~1 year per sign. Each native gets ONE Jupiter-on-H11 per ~12 years. Mark this window — it's a once-per-decade marriage-completion trigger.

---

## CHILDREN — Fructification Patterns

### Pattern C1: Jupiter + Moon joint period (childbirth trigger)
- **Look for**: AD = Jupiter and Jupiter signifies H2/H5/H11; PAD = Moon (or Moon is RP at query)
- **Why**: Jupiter is karaka for children, Moon is karaka for fertility/birth itself. Joint = birth event window.
- **Verdict**: "Jupiter AD with Moon PAD (date → date) = strongest childbirth window."
- **Caveats**: Requires fruitful sign on H5 cusp (Cancer/Scorpio/Pisces). Barren sign + Jupiter-Moon = IVF assistance likely.

### Pattern C2: Barren-sign H5 with significator promise (= IVF / medical assistance)
- **Look for**: H5 CSL signifies H2 + H5 + H11 (promise) AND H5 cusp is in barren sign (Aries/Gemini/Leo/Virgo/Capricorn)
- **Why**: KSK strict rule — both signification AND fruitful sign required for unaided childbirth. Promise + barren = children come, but with medical/IVF assistance.
- **Verdict**: "Children promised but H5 in barren [sign] — IVF / fertility treatment likely required."
- **Caveats**: Do NOT call this denial. The promise is real; the path is medical.

### Pattern C3: Mars + Saturn ND (delay)
- **Look for**: AD = Mars or Saturn, AD lord signifies H1/H4/H10 (denial set for children)
- **Why**: Mars in denial = miscarriage risk; Saturn in denial = chronic delays.
- **Verdict**: "[Mars/Saturn] AD signifies H[1/4/10] — childbirth blocked in this window. Wait for [next AD with relevant signification]."

---

## CAREER — Fructification Patterns

### Pattern J1: Service vs Business discriminator
- **Look for**: H10 CSL → does it signify H6 (service) OR H7 (business)?
- **Why**: KSK strict — H10+H6 = service/job; H10+H7 = business/self-employment; both = entrepreneur with employees / consultant.
- **Verdict**: "H10 CSL signifies [H6=SERVICE / H7=BUSINESS / both=ENTREPRENEUR]."
- **Caveats**: Without H10 connection, neither is promised — re-examine cusp.

### Pattern J2: Reinstatement / promotion test (KSK Simple Rules verbatim)
- **Look for**: H6 CSL signifies 6 OR 10 OR 2 → reinstatement possible. Signifies 1, 5, 9, 12 → no reinstatement.
- **Why**: Direct KSK rule for reappointment (Reader, H6 chapter).
- **Verdict**: "H6 CSL signifies [houses]; per KSK rule, [reinstatement possible / blocked]."
- **Caveats**: Only applies when topic is reinstatement / re-promotion, not for first job.

### Pattern J3: Government job marker
- **Look for**: Sun strongly in RP at query AND Sun is significator of H10 AND H10 CSL signifies H1/H10 (status, fame)
- **Why**: Sun = government / authority karaka. Strong Sun + H10 signification = govt sector.
- **Verdict**: "Sun is RP and significator of H10 → government / authority sector."
- **Caveats**: Sun-as-RP alone doesn't make a govt job — must signify H10.

---

## WEALTH — Fructification Patterns

### Pattern W1: KSK 2/6/11 trinity confirmation
- **Look for**: H2 CSL signifies H2 + H6 + H11 (any combination from this set)
- **Why**: KSK strict wealth set is 2/6/11 (NOT 2/6/10/11 — that's career-driven income).
- **Verdict**: "H2 CSL signifies [actual houses from 2/6/11] — wealth accumulation [strongly / partially] promised."
- **Caveats**: H10 connection alone = career income not accumulated wealth.

### Pattern W2: Speculative gain marker
- **Look for**: H5 CSL signifies H2/H6/H11 AND H5 itself
- **Why**: KSK speculation rule — H5+H6+H11 with H2.
- **Verdict**: "H5 connection to 2/6/11 — speculation/investment gains possible in [AD lord period]."
- **Caveats**: H5+H8+H12 = speculation losses, opposite signal.

### Pattern W3: Loan / debt recovery
- **Look for**: H6 CSL signifies H2/H6/H11, AND H6 CSL not retrograde, AND no Saturn in chain
- **Why**: KSK rule: "money owed returned when H6 CSL signifies 2/6/11 with no Saturn affliction."
- **Verdict**: "Recovery in [AD] period; if Saturn in chain, recovery delayed indefinitely."

---

## TIMING — Cross-Topic Patterns

### Pattern T1: Joint Period Principle (the master timing rule)
- **Look for**: A future window where MD lord + AD lord + PAD lord ALL signify relevant houses
- **Why**: KSK Reader: events fire ONLY at joint periods. One or two of three = preparation, all three = fructification.
- **Verdict**: "Joint period [MD]-[AD]-[PAD] from date → date is the fructification window. Single-lord matches earlier are preparation, not the event."
- **Caveats**: The window is often <60 days even when AD spans 2 years. State the PAD precisely.

### Pattern T2: RP confirmation amplifier
- **Look for**: A significator that is ALSO a Ruling Planet at the moment of query
- **Why**: KSK: an RP-significator carries 2-3× the timing weight of a non-RP significator. The RP confirms timing readiness.
- **Verdict**: "[Planet] is BOTH a significator of [house] AND currently ruling — its dasha period is the ripe window."

### Pattern T3: Self-significator concentration
- **Look for**: A planet whose star_lord is itself (in own nakshatra)
- **Why**: KSK self-significator rule — such a planet's results arrive directly without colouring through another star lord. Effects are concentrated and purer.
- **Verdict**: "[Planet] is in its own star — when this planet is the AD/PAD lord, its effects arrive directly and are concentrated."

### Pattern T4: Sookshma (sub-PAD) day-precision firing window
- **Look for**: A PAD that signifies relevant houses, AND within it a Sookshma whose lord ALSO signifies relevant houses AND is currently a Ruling Planet
- **Why**: KSK 4-level stack — fructification is sharpest when MD + AD + PAD + Sookshma ALL signify the same relevant houses. The Sookshma is the day-precision firing window.
- **Verdict**: "Within [X] PAD (date → date), the [Sookshma lord] sookshma (date → date) is the day-precision firing window — that lord is a significator AND currently ruling."
- **Caveats**: A clean Sookshma in an unfavourable PAD does NOT fire — the PAD must support too. A clean Sookshma in a favourable PAD is the precision peak (often a 2–10 day window).
- **How to phrase**: Always cite the actual sookshma date range from the SOOKSHMA SEQUENCES block in the prompt. NEVER say "the chart data does not provide sub-PAD dates" — they are provided.

---

## DENIAL / OBSTRUCTION — Patterns

### Pattern D1: Karaka context vs denial (KSK strict)
- **Look for**: Strong / debilitated karaka (Venus for marriage, Jupiter for children, Sun for father, Mars for siblings) BUT CSL of the relevant cusp is favourable
- **Why**: KSK explicitly rejects karaka-override. Karaka = context only, NOT verdict.
- **Verdict**: "Karaka [planet] is [strong/weak], but the CSL of H[N] is [favourable/blocked] — the CSL decides; karaka is colouring, not the gate."
- **Caveats**: Some users will push back saying "but my Venus is exalted!" — explain karaka is context, CSL is verdict. KSK Reader explicit.

### Pattern D2: Total denier at Step 4 (offer-then-withdraw)
- **Look for**: CSL chain Steps 1-2 show promise (relevant house signification) BUT Step 4 (star lord of CSL's sub lord) signifies ONLY denial houses
- **Why**: When Step 4 is total denier, the event is offered then withdrawn — interview cleared but offer rescinded, engagement broken before marriage, etc.
- **Verdict**: "Steps 1-2 show promise but Step 4 ([planet]) only signifies denial — the offer comes but does not complete."
- **Caveats**: Distinguish from outright denial (which has no promise at any step). Offer-then-withdrawn is a specific failure mode.

---

## Pattern application — the workflow

1. Read the chart's relevant CSL (primary cusp sub lord).
2. Compute the A/B/C/D significators (engine provides this).
3. Compute the Star–Sub Harmony (engine provides).
4. **Pattern-match**: scan THIS file for any pattern whose conditions are met.
5. If multiple patterns fire, list them in order of strength (RP-confirmed first).
6. Cite the named pattern in your output. Naming patterns is what
   distinguishes a deep KSK reading from a generic "CSL signifies these
   houses" flat answer.
