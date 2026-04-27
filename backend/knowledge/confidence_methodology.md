# Confidence Methodology — How the Engine's Score is Computed

The Analysis tab emits an `ENGINE CONFIDENCE FOR THIS TOPIC: X/100`
value computed from the chart's structural features. This file
documents how that score is derived so the LLM can:

1. Cite the score honestly without inflating it
2. Adjust ±10 when the LLM's KSK reasoning genuinely contradicts the
   structural score (must explain WHY)
3. Translate the 0–100 number into a verbal confidence the astrologer
   can communicate to the client

## Components — what feeds the score

```
Promise verdict tier         0–40   (40% weight)
Star–Sub Harmony             0–25   (25% weight)
Fruitful significator count  0–15   (15% weight)
MD lord RP overlap           0–10   (10% weight)
AD lord RP overlap           0–10   (10% weight)
─────────────────────────────────
Total                        0–100
```

### Component 1 — Promise verdict tier (0–40)

| Verdict tier         | Points |
|----------------------|--------|
| STRONGLY PROMISED    | 40     |
| PROMISED             | 30     |
| CONDITIONAL          | 20     |
| WEAKLY PROMISED      | 10     |
| DENIED               |  5     |
| (unknown / default)  | 15     |

Source: the engine's `check_promise()` simplified verdict, mapped to
the 5-tier scale in RULE 5.

### Component 2 — Star–Sub Harmony (0–25)

| Harmony score | Points |
|---------------|--------|
| HARMONY       | 25     |
| ALIGNED       | 18     |
| MIXED         | 10     |
| TENSION       |  6     |
| CONTRA        |  6     |
| DENIED        |  0     |
| UNKNOWN       |  8     |

Source: the engine's `compute_star_sub_harmony()` layer-split.

### Component 3 — Fruitful significator count (0–15)

`min(15, fruitful_count × 5)` — capped at 15.

Source: `get_fruitful_significators()` = significators ∩ Ruling
Planets at query moment. Each fruitful sig adds 5 points; capped at
3 sigs (15 points) to prevent saturation.

### Component 4 — MD lord RP overlap (0–10)

`min(10, md_overlap × 5)` — capped at 10.

How many of the 7 RP slots the current Mahadasha lord occupies.
Stronger MD anchoring → riper timing.

### Component 5 — AD lord RP overlap (0–10)

`min(10, ad_overlap × 5)` — capped at 10.

Same as Component 4 but for the current Antardasha lord.

## Verbal translation — number → astrologer's voice

| Score range | Verbal certainty                       |
|-------------|----------------------------------------|
| 90–100      | "Extremely high confidence — promised" |
| 75–89       | "Strong confidence — promised"          |
| 60–74       | "Moderately confident — likely"         |
| 45–59       | "Mixed signals — possible with effort"  |
| 30–44       | "Low confidence — significant obstacles"|
| 0–29        | "Very low — denial likely"             |

Use these phrasings in the client-summary section. The numerical
score itself goes in section 1 (Direct Verdict) and section 5
(Confidence + Caveats).

## When LLM may adjust the score (±10 max)

Adjustments must be backed by KSK reasoning. Allowed cases:

**Adjust DOWN (–10):**
- Total Denier at Step 4 (offer-then-withdraw pattern fires) — even
  if other components score high, the ultimate-stage block reduces
  confidence.
- Karaka of the topic is severely afflicted by Saturn AND in denial
  houses — context overlay (KSK still says CSL decides, but extreme
  karaka affliction warrants caution).
- Native's age makes the topic biologically/practically unlikely
  (e.g., natural childbirth at age 47 — engine doesn't model
  biology).

**Adjust UP (+10):**
- Multiple non-overlapping Pattern Library hits all firing in the
  same direction (e.g., Pattern M1 + M3 + T1 + T2 all firing for
  marriage).
- A self-significator (planet in own star) is the topic CSL — KSK
  flags pure-result concentration.
- Three or more upcoming ADs all show RP-overlap >= 2 — extended
  ripeness over a long horizon.

## When NOT to adjust

- The user disagrees with the verdict. Per RULE 4, do not shift
  under pushback. The score is structural; the user's belief does
  not change it.
- The current dasha "feels lucky" or "feels difficult". Not
  measurable, not adjustable.
- General Parashari yogas claim something different. Per RULE 15,
  Parashari overlay is rejected — the engine score is KSK-grounded.

## Caveats to always state

Every Analysis-tab answer's section 5 should include:

1. **Calibration caveat**: "The engine confidence is conservative —
   we under-state rather than over-state. A score of 70 means
   genuinely 70% structural support, not 'I hope it's 70%'."
2. **Free-will caveat**: "KP gives the structural promise and timing
   windows. Decisions and effort still matter; the chart shows what
   is possible, not what is certain."
3. **Verification caveat**: "If the verdict here disagrees with prior
   astrological readings, KP works at sub-lord level — same Rashi
   and same nakshatra can give different verdicts. The disagreement
   is method-driven, not error."

The LLM must include at least the calibration caveat for any score
< 75. The free-will caveat applies to all answers about future
events.

## Expected Confidence Distribution (PR A1.3-fix-10 — calibration sanity)

Across ~100 typical KP queries, the distribution of engine confidence
SHOULD look approximately like:

| Range | % of charts | What it means |
|---|---|---|
| 90+ | ≤10% | Rare — strongest possible confluence (HARMONY + 3+ fruitful + 2+ RP slots + KSK-fires + vargottama). |
| 75–89 | ~30% | Common — clear promise with strong timing alignment. |
| 60–74 | ~40% | Most common — promise present, timing is conditional or has friction. |
| 45–59 | ~15% | Mixed — TENSION harmony, contradicting signals, weak SAV. |
| <45 | ≤5% | Rare — clear denial signature, multiple dussthana activations. |

If a chart returns 90+ on EVERY topic, calibration is drifting high.
Likely causes:
- Decision-support adding too many positive contributors without
  matching penalty contributors
- Star-Sub Harmony returning HARMONY too often (check the leaning
  threshold in compute_star_sub_harmony)
- Engine confidence ceiling (clamp at 100) hiding actual over-credit

If a chart returns <45 on EVERY topic, calibration is drifting low.
Likely cause: denial-house weights too punitive in TOPIC_DENIAL.

LLM SELF-CHECK: When you state engine confidence ≥ 90, ask yourself:
"Is this chart genuinely in the top 10% of strength for this topic?"
If the chart has ANY of these friction signals, 90+ is suspect:
- Pattern D2 fires (Step 4 partial denier)
- TENSION or MIXED harmony
- 0 fruitful significators
- Lord of running PAD has any denial-house touch
- Recent past failures the user mentions

In those cases, treat the engine score as a CEILING and adjust
verbal certainty downward by 5-10 in your output. The engine is
conservative-aligned but can over-credit on positive-feedback loops.
