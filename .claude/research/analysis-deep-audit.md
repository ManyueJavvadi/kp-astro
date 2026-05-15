# Analysis-tab deep audit — Track A.1 / PR A1.9

**Trigger**: User reported multiple charts (marriage, career, earnings) feeling
"a little bit off" to friends/family who tested them. Wants a full audit of
KB + rules + prompts against canonical KP literature, NOT a knee-jerk revert.

**Scope**: 29 KB files (~8,700 lines), 43+ rules in the system prompt
(~21K tokens), all of `llm_service.py`. Web cross-reference with multiple
canonical KP sources.

**Result**: 2 confirmed bugs (one shipped fix in PR A1.8 + system prompt
follow-up in A1.9), 1 inconsistency (fixed in A1.9), several findings
that are defensible-but-worth-documenting. NOT a wholesale rewrite — most
of the system is canonical-correct.

---

## 1. Audit methodology

For each topic (marriage, career, wealth, children, foreign, health, divorce):
1. Read the relevant KB file end-to-end
2. Cross-reference the key rules against open-web canonical KP sources
   (redastrologer.com, kpastrologylearning.com, jagannathhora.com,
    astrology.com, KP Reader IV citations, ksrinivas.com)
3. Compare the system prompt's topic-specific instruction (RULES 5, 9, 33)
   against the KB file's rules — flag any internal inconsistency
4. Look for the canonical-bug pattern: **absolute overrides** of canonical
   KP **conditional rules** (this was the proven Signal-2 bug pattern)
5. Look for **sycophantic adjustments** — rules added at a specific user's
   request that may have over-tightened verdicts

---

## 2. Bug 1 — RULE 33 absolute override (root cause of marriage misclassification)

### What was wrong

System prompt RULE 33 line 1380 (PR A1.3-fix-19) said:
```
4. Apply the OVERRIDE hierarchy explicitly
   (e.g., for marriage: 5L in 6/8/12 OVERRIDES H5-in-CSL-chain)
```

And below:
```
A common error: predicting "love-cum-arranged" because H5 appears in the
H7 CSL chain — without checking 5L placement (Signal 2). 5L in H6 NEGATES
the H5 chain signal, flipping the verdict to "family-mediated arranged."
```

This is the AUTHORITY-LEVEL rule the AI follows for every Marriage type
question in the Analysis tab. It has two stacked errors:

**Error 1: Wrong subject.** Says "5L (5th sign lord) placement." Canonical
KP rule is about **5CSL** (5th cusp sub lord) **CHAIN signification** via
the UNION method. Different mechanics — 5L is generic Vedic, 5CSL chain
is KP-canonical.

**Error 2: Wrong logic.** Says "OVERRIDES" / "NEGATES" / "flips" —
absolute language. Canonical KP rule is **CONDITIONAL** on whether the
5CSL chain *also* connects to {2, 7, 11}.

### Canonical rule per web sources

- redastrologer.com (5th cusp sub lord chapter):
  > "If the 5CSL signifies {5, 8, 12} WITHOUT connecting to houses
  > {2, 7, 11}, the relationship is destined to remain a hidden affair
  > that ends in heartbreak. HOWEVER, if the 5CSL connects to houses 7
  > and 11, even a hidden affair can materialize into marriage."

- kpastrologylearning.com (5th bhava rules) — same conditional structure.

- jagannathhora.com (5-8-12 KP formula) — same conditional structure,
  emphasizes the "if 2-7-11 anchor present" override.

### How this bug bit live charts

When the user's friend Ramya (live in inter-caste relationship with
family resistance) was Analysis-tab tested in April 2026, the AI used the
holistic deep prompt with universal_kb and correctly identified her as
"love marriage with family resistance, eventually accepted" — matching
her actual life.

When the same chart was Analysis-tab tested in May 2026, the AI was
constrained by RULE 33's absolute override which mechanically classified
her as "Family-mediated arranged" because her 5L Sun is in H8 — even
though her 5CSL chain (the canonical subject) almost certainly does
signify {2, 7, 11} via Venus owning H7 in the chain.

### Fix (PR A1.9)

System prompt RULE 33 rewritten:
- Replaced the absolute "5L in 6/8/12 OVERRIDES" example with the canonical
  conditional "5CSL chain hits {5,8,12} WITHOUT {2,7,11} → fails;
  if BOTH → love-with-obstacles, can materialize"
- Added an explicit Canonical KP Correction block documenting both errors
  and the canonical rule, with web citations
- Added a general anti-pattern warning: any rule using "ALWAYS OVERRIDES /
  ABSOLUTELY NEGATES / FLIPS unconditionally" should be treated with
  suspicion; canonical KP rules are almost always conditional

PR A1.8 already fixed the engine + marriage.txt §12. PR A1.9 closes the
loop by fixing the system prompt rule itself.

---

## 3. Bug 2 — "Jupiter Override" inconsistency

### What was inconsistent

System prompt **RULE 12** says:
> "KARAKAS ARE CONTEXT, NEVER OVERRIDE CSL (PR A1.3)"

`children_detailed.md` line 53 correctly says:
> "Strong Jupiter = natural support for fertility (but does NOT override CSL)"

But `other_topics.txt` line 275 (PART 9 — Wealth/Children Type Classification)
had:
```
THE JUPITER OVERRIDE FOR CHILDREN/WEALTH:
...
→ Jupiter partially compensates for weak H5 sub lord for children.

KARAKA STRENGTH RULE:
When the natural significator (karaka) of a house is STRONG (well-placed,
in good star, appears in Ruling Planets) it can elevate a conditional promise
toward a more positive verdict.
```

The TITLE says "OVERRIDE" and the body says "compensates / elevates." These
contradict RULE 12 + the children_detailed.md correct statement.

Since the AI may read this section when answering wealth or children type
questions, the inconsistency is real — it can produce verdicts that flip
a CSL denial to a soft promise based on Jupiter strength alone, which
violates strict KP per Krishnamurti.

### Fix (PR A1.9)

`other_topics.txt` Part 9 rewritten:
- Renamed "JUPITER OVERRIDE" to "JUPITER AS CONTEXT-BOOSTER (NOT OVERRIDE)"
- Reworded "partially compensates / elevates" to "is a strong context-
  booster on top of an already-promising H5 CSL chain. It does NOT
  rescue a Denied H5 verdict by itself."
- Cross-referenced to RULE 12 explicitly
- Same treatment applied to the "WHEN KARAKA IS WEAK" subsection —
  reworded to "friction signal, NOT verdict-flipper"

This brings other_topics.txt in line with RULE 12 + children_detailed.md.

---

## 4. Findings that are defensible — documented for transparency

These were checked during the audit and found to be defensible under
strict-KP reading, even though they differ from some loose web sources.

### 4.1 Wealth set: 2/6/11 vs 2/6/10/11

Our `other_topics.txt` Part 4 says:
> "KSK STRICT — wealth is 2/6/11, NOT 2/6/10/11"
> "H10 is RELEVANT FOR PROFESSION, not for wealth. KSK separates them:
>  2/7/10 = business income (career); 2/6/11 = WEALTH ACCUMULATION."

Loose web sources sometimes lump 2/6/10/11 together for "wealth" generally.
Our finer-grained KSK-strict distinction (career income vs accumulated
wealth as separate question scopes) is defensible per KSK Reader. **No
change.**

### 4.2 Marriage denial houses: {1, 6, 10} vs {1, 6, 10, 12}

System prompt RULE 5 has:
> "Denial = H1, H6, H10 (absolute denial)"
> "Denial — QUALIFIED = H12 ('delayed or not with this party')"

This separates absolute-denial from qualified-denial-H12 (delay/foreign
spouse). Match engine's `MARRIAGE_DENIAL_HOUSES = {1, 6, 10, 12}` lumps
them. The system prompt is more nuanced (H12 is qualified not absolute).
**Both readings have KP support.** Match engine choice is conservatively
correct (treats H12 as denial). System prompt choice is more sophisticated
(distinguishes between absolute and qualified). **No change needed but
worth noting** that the Match-tab Analysis-tab outputs may differ
slightly on H12 cases — this is by design.

### 4.3 Career/Job KB (job.txt + profession_detailed.md)

Both files audited end-to-end. No absolute-override bugs found. job.txt
correctly says:
- "When CSL signifies BOTH primary denial AND relevant houses → CONDITIONAL"
- "Apply KSK strict bhukti rule"

profession_detailed.md is descriptive-only (planet→field associations),
no override rules. **Clean.**

### 4.4 Children KB (children_detailed.md)

Correctly states "Strong Jupiter does NOT override CSL." Internally
consistent. **Clean.**

### 4.5 Foreign KB (foreign.txt)

No absolute-override patterns. Uses canonical {3, 9, 12} relevant +
{2, 8, 11} denial logic per KSK Reader. **Clean.**

### 4.6 Health KB (health.txt + health_detailed.md)

No absolute-override patterns. Uses canonical {1, 6, 8, 12} health-
relevant logic. **Clean.**

---

## 5. Why the user's friends felt "a little off"

Three plausible causes — listed in likely order:

### 5.1 The actual bug (Bug 1) for marriage type questions

Anyone with 5L in H6/H8/H12 was mechanically getting "family-mediated
arranged" classification regardless of their actual chart structure.
Ramya is one documented case. Others likely include any chart where
H5 IS in the H7 CSL chain (love tendency present) but 5L happens to
be in dussthana (a placement that occurs in ~25% of charts). The
April→May regression in the AI output is the same pattern.

**Fix shipped in PR A1.8 (engine + marriage.txt) + PR A1.9 (system
prompt).** Should resolve most marriage-type misclassifications.

### 5.2 Karaka-override drift (Bug 2)

For children and wealth questions, the AI may have been over-weighting
Jupiter strength to soften CSL denials. Hard to quantify how many
charts this affected without re-running, but the inconsistency was real.

**Fix shipped in PR A1.9 (other_topics.txt).** Brings karaka treatment
in line with strict KP.

### 5.3 Per-chart calibration friction (NOT a bug — inherent to KP)

KP gives **structural probability**, not deterministic certainty (per
the system prompt's free-will caveat). Two friends comparing notes will
often find one or two specific predictions feel "a bit off" because:
- AI gives a single most-likely scenario; actual life can take a less-
  likely path due to free will, remedies, environmental factors
- KP timing is bhukti-precision but the AI may give AD-precision in
  text (e.g., "Apr-Dec 2028") when actual event fires in a sub-window
- Type classifications (love vs arranged) are not always cleanly
  one-or-other in real life

These are inherent and NOT bugs. The fix is to:
- Always state the structural-probability caveat
- Use the 5-tier verdict scale (Strongly Promised → Denied) honestly
- Avoid false certainty
- Acknowledge "the chart can support more than one path" when signals
  are mixed (RULE 35 already covers this)

---

## 6. What was checked but did NOT need fixing

For posterity:
- RULES 1–11 (chart fidelity rules): clean, well-defensive
- RULE 5 (5-tier verdict + A/B/C/D significator): canonical KSK Reader V
- RULE 8 (Rahu/Ketu proxy): canonical
- RULE 11 (KSK strict bhukti rule): direct quote from KSK Reader
- RULE 12 (karakas are context, never override CSL): canonical, exactly
  the rule that the now-fixed other_topics.txt was violating
- RULE 16 (Star-Sub harmony): well-grounded
- RULE 18 (engine advanced_compute usage): canonical
- RULE 19 (gold-standard structure): formatting only
- RULE 21 (KSK strict timing trigger): canonical
- RULE 22 (transits/gocharya as secondary): correct hierarchy
- RULE 23 (planetary aspects): canonical (Mars 4/7/8, Saturn 3/7/10,
  Jupiter 5/7/9)
- RULES 24-32: detailed nuance rules, no absolute-override patterns
- RULE 34 (multi-cusp confirmation tier): canonical
- RULE 35 (pushback re-verification): excellent integrity rule, exactly
  the rule that ensures the AI doesn't cater
- RULE 39 (RPs from engine, never invented): canonical
- RULE 41 (badhaka/maraka recognition): canonical
- RULE 42 (Moon as query-moment pulse): canonical
- RULE 43 (CSL or significator in retrograde star): canonical

---

## 7. Anti-pattern rule for future additions

Added to system prompt as part of PR A1.9 RULE 33 fix:

> **General anti-pattern**: any rule stated with absolute language
> ("ALWAYS OVERRIDES", "ABSOLUTELY NEGATES", "FLIPS unconditionally")
> should be treated with suspicion. Canonical KP rules are almost
> always CONDITIONAL on a combination of factors. State the
> conditions explicitly in reasoning so the user can audit.

This applies retroactively — any future KB or rule changes that introduce
absolute overrides should be flagged in review.

---

## 8. What this audit did NOT do (deferred)

Things checked at a high level but not deeply re-verified against canonical
KP literature (low priority based on what user mentioned):

- Muhurtha rules (muhurtha.txt) — separate engine, different scope
- Transit rules (transit_rules.txt) — different consumer, lower risk
- Doshas (doshas.txt) — Parashari-leaning, our KP analysis already
  de-emphasizes per RULE 15 (rejected Parashari rules)
- Bhavat Bhavam (bhavat_bhavam.md) — used for relative-questions only,
  RULE 13 handles correctly
- KP CSL theory (kp_csl_theory.txt) — foundational doc, no override
  patterns
- Personality (personality_psychology.md) — descriptive, no verdict

If user feedback surfaces issues in these areas, a follow-up audit can
target them specifically.

---

## 9. Verification checklist (post-PR-A1.9)

For the user to confirm the fixes worked:

- [ ] Reload `/app`. Open Ramya's chart in Analysis tab. Ask "love or
      arranged marriage?". Expected output: "Love marriage with
      obstacles / different background — eventually family accepts"
      with specific citation of her 5CSL chain hitting BOTH {5,8,12}
      and {2,7,11}. NOT the May "family-mediated arranged" reading.

- [ ] Open Manyue's chart in Analysis tab. Same question. Expected:
      output reflects HIS actual chart structure (whatever it is), not
      any preferred narrative. If his chart genuinely shows
      family-mediated, that's correct. If it shows love-cum-arranged,
      that's also correct. The point is the verdict should come from
      his 5CSL chain analysis, not from a hardcoded rule.

- [ ] Test a children/wealth question with a chart where Jupiter is
      strong but H5 / H2 CSL chain is in denial houses. Expected:
      AI cites Jupiter as quality booster but does NOT manufacture
      a promise from a denial verdict.

- [ ] Compare any pre-A1.9 Analysis output with post-A1.9 on the
      same chart. Verdict should differ ONLY in cases where the bug
      was active (5L in 6/8/12 marriage-type, or strong-Jupiter-over-
      denial-CSL children/wealth). Other verdicts should be stable.

---

*Doc author: Claude. Date: 2026-05-15.
 PRs: A1.8 (engine + marriage.txt §12 fixes), A1.9 (system prompt RULE 33
 + other_topics.txt Jupiter-context fix).*

## Citations

- [Red Astrologer — Marriage Predictions in KP](https://redastrologer.com/marriage-predictions-in-kp/)
- [KP Astrology Learning — 5th Bhava Rules](https://kpastrologylearning.com/kp-jyotish-astrology-fifth-house-bhava-rules/)
- [KP Astrology Learning — 7th Bhava Rules](https://kpastrologylearning.com/kp-jyotish-astrology-seventh-house-bhava-rules/)
- [AstroIndia — Rahu in 3rd House](https://astroindia.com/blogs/astrology/rahu-in-3rd-house)
- [Jagannath Hora — 5-8-12 KP Formula](https://jagannathhora.com/marriage-or-breakup-kp-astrology-5-8-12-formula/)
- [KP Astrology Pro — 12 Houses Complete Guide](https://kpastrologypro.com/blog/12-houses-kp-astrology)
- [Astrology Expert — KP Sub-Lord Theory](https://astrology-expert.com/blog/what-is-kp-astrology-expert-guide-to-krishnamurti-paddhati-sub-lord-theory-job-promotion)
- [IndiaDivine — KP Rule to be Rich](https://www.indiadivine.org/content/topic/1504179-kp-rule-to-be-rich/)
- [GautamCrystals — Financial Problems in Astrology](https://www.gautamcrystals.com/post/why-am-i-facing-financial-problems-astrology)
