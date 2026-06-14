# KP significator node-proxy fix — HELD for a dad-present validation session

**Status:** RESEARCHED + SCOPED, deliberately NOT applied. User decision
2026-06-14: *"Hold entirely for a dad session."* The engine
(`compatibility_engine.py` and the other significator functions) is
UNTOUCHED. Do not apply any of the changes below without your dad present
to eyeball the before→after on real charts.

Why held: every one of these fixes changes a **production-stable or
just-validated verdict** (flagship Match tab, marriage classifier, horary,
muhurtha, transit). The sacred protocol in `CLAUDE.md` requires *"explicit
user approval + regression suite pass"* for `compatibility_engine.py`, and
there is **no Match-verdict golden snapshot** to validate against — the
"Ramya / Vineetha / Sreeja / Manyue" fixtures are real charts validated by
eye, not automated tests (`tests/conftest.py` is 8 lines).

---

## Doctrine research (web, 2026-06-14) — what's confirmed

1. **The KP 4-step IS canonical and INCLUDES the sub lord.** A planet
   gives the results of its Star Lord and Sub Lord; Step 4 = Star Lord of
   the Sub Lord = the final decider.
   - https://kpastrology.astrosage.com/kp-learning-home/related-systems/four-step-theory
   - https://www.astrogle.com/astrology/four-step-theory-and-explanation.html
2. **Rahu/Ketu MUST use the proxy.** A node has no sign ownership; it acts
   as agent of (a) the planet CONJUNCT it, (b) the planet ASPECTING it,
   (c) its DISPOSITOR (sign lord), plus (d) its STAR (nakshatra) lord. A
   node is *stronger* than an ordinary planet and takes preference as a
   significator. Any significator computation that omits this proxy
   **under-counts the node = doctrinally wrong.**
   - https://redastrologer.com/rahu-and-ketu-in-kp-astrology/
   - https://x.com/ResearcherVedic/status/1961426427028418804

The Analysis-tab path ALREADY does this correctly via
`chart_engine.get_rahu_ketu_significations()` (priority: conjunct →
star lord → dispositor, with the "untenanted nakshatra = strong proxy"
rule). The reference node model lives at `chart_engine.py:1657`.

---

## The actual inconsistencies (file:line) — confirmed by code read

There are ~9 implementations of "houses a planet signifies". Two families:
- **3-layer + node proxy** (Analysis verdict path): `_layered_signified_houses`
  (`kp_advanced_compute.py:969`), used by `compute_star_sub_harmony` and
  `rank_sookshmas_by_fire_score`, and effectively matched by
  `compute_supporting_cusp_activations` (`kp_advanced_compute.py:1701`,
  feeds the RULE-34 tier). These are INTERNALLY consistent. ✓
- **4-step, NO node proxy** (Match path): `compatibility_engine._planet_significations`
  (`compatibility_engine.py:470`). True 4-step (Step 4 added in PR M1.1)
  but **no Rahu/Ketu proxy** → under-counts whenever a node is in the
  chain. Used by the H7 CSL chain, `_h7_sublord_promise`, Mangal-Dosha,
  AD/PD/SD timing, the renunciation flag — AND the marriage classifier
  now wired into single-chart Analysis.

Lighter methods in the other stable engines (NOT necessarily wrong — may
be tuned; treat as separate decisions):
- Horary `_planet_significations` (`horary_engine.py:579`) — self+star,
  **no sub layer** (KSK says the sub is the deciding gate).
- Transit `_planet_significations` (`transit_engine.py:49`) + Muhurtha
  `_sublord_significations` (`muhurtha_engine.py:1254`) — "1.5-step"
  (star's *occupied* house only; drops ownership + sub + node proxy).
- Dead 2-layer `_lord_signifies` (`kp_advanced_compute.py:895`).

---

## Proposed fix #1 (the priority one) — node proxy in the Match engine

In `compatibility_engine._planet_significations`, for `planet_name in
("Rahu","Ketu")`, fold in the node proxy so it matches doctrine + the
Analysis path. Cleanest: reuse `chart_engine.get_rahu_ketu_significations`
(build the `cusps` dict + `planet_positions` it needs from compat's
`planets` + `cusp_lons`), OR inline the same logic (dispositor occ+own +
conjunct-planet houses within 3.33°). It only ADDS houses to a node's
set — so it can only make a node-CSL verdict *more* promising, never less.

**Expected blast radius:** any chart where Rahu/Ketu is the H7 CSL, the
5CSL, or anywhere in a marriage/timing chain. On Manyue (H7 CSL = Rahu)
the marriage verdict happened to come out right WITHOUT the proxy because
Rahu's star (Jupiter) + sub (Venus) already covered the houses — so this
fix may change *few* real verdicts, but it WILL change some.

## Optional later — bring marriage classifier in line / unify lighter engines
Only after #1 is dad-validated. Horary/transit/muhurtha changes are
separate dad decisions (they alter those tabs' stable output).

---

## Dad-validation plan (do this in the session)

1. Build a snapshot harness: for each real chart (Manyue + 3 others —
   need birth data for Ramya/Vineetha/Sreeja), dump the CURRENT engine
   outputs: Match H7 verdict + score, marriage-type classification, the
   per-topic promise/harmony/tier for marriage. Commit as the baseline.
2. Apply fix #1.
3. Re-dump; show dad the exact before→after DIFF per chart.
4. Dad confirms each changed verdict is *more* correct (or neutral). If
   any verdict gets WORSE, revert — do not patch forward (hard rule).
5. Only then commit, with the snapshot harness as the permanent
   regression guard the protocol always wanted.

---

## What WAS shipped 2026-06-14 (safe, already on develop+main)
- RULE 16.1: LLM transcribes the engine's primary-cusp Star–Sub Harmony
  verdict instead of re-deriving it (commit `799da36`). Determinism only;
  zero engine-logic change.
- Sync hardening: Trigger D skips half-streamed saves; fast-forward
  resolves equal-length two-device divergence (clobber-safe).
- (Trigger C PATCH-volume reduction intentionally NOT done per user.)
