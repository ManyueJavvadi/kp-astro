# Muhurtha Engine — Capability Matrix

**PR Phase 8 (Gap 6 fix), May 27, 2026.**

This document is the single source of truth for what the
`muhurtha_engine.py` actually computes and emits. Use it to:

- Decide which UI badges to show on a muhurtha result row
- Decide what the LLM can cite as "engine-confirmed" vs "doctrine-only"
- Audit KB doctrine claims against actual engine capability before
  shipping features that depend on a specific check

If a check appears in `muhurtha.txt` (the doctrine KB) but NOT in this
matrix, the LLM must NOT claim "the engine flagged it" — it can mention
the doctrinal concern but should explicitly note "doctrine-only,
not engine-verified".

---

## 1. Engine-emitted output schema (per window)

Every muhurtha-scan window emits the following structured fields. Group
headings match the natural reading order of a muhurtha verdict.

### 1.1 Time / day grounding

| Field | Type | Source | Notes |
|---|---|---|---|
| `start_dt` / `peak_jd` / `delta` | datetime / float / minutes | window walker | Window start + peak (best minute within) + total span |
| `start_time` / `window` | str | window walker | "HH:MM-HH:MM" display string |
| `date` / `date_display` | str | window walker | "YYYY-MM-DD" / "Mon, 17 Jun 2026" |
| `vara` / `day_event_tz` | str / str | weekday | Weekday name + tz |
| `sunrise` / `sunset` | float JD | swe.rise_trans | Used to gate Rahu Kalam / Yamagandam / Gulika slots |
| `within_practical_hours` | bool | window walker | False if outside the 5:00–21:00 scan range |

### 1.2 Panchang (5-limb day grounding)

| Field | Type | Source | UI badge eligibility |
|---|---|---|---|
| `tithi` / `tithi_num` | str / int (1–30) | swe.calc_ut Sun-Moon distance | ✓ Badge: tithi name |
| `nakshatra` / `star_lord` / `sub_lord` | str | swe.calc_ut Moon longitude | ✓ Badge: nakshatra name |
| `yoga` | str (27 yoga names) | Sun+Moon longitude | ✓ Badge: yoga name |
| `karana` (via tithi/2) | implicit | tithi half-division | ✓ Badge: karana name |
| `sun_moon_sep_deg` | float | derived | Used for tithi computation |
| `hora_lord` / `hora_auspicious` | str / bool | `_get_hora_lord(jd, sunrise, sunset, weekday)` | ✓ Badge: hora lord; flag if hora is auspicious for the event |
| `ghatika_num` | int (1–60) | derived from sunrise | ✓ Badge: ghatika |

### 1.3 Inauspicious time slots (avoidances)

| Field | Type | Engine status | UI badge eligibility |
|---|---|---|---|
| `rahu_kalam_hhmm` / `in_rahu_kalam` | str / bool | ✓ Computed per weekday slot table | ✓ Red badge if `in_rahu_kalam` |
| `yamagandam_hhmm` / `in_yamagandam` | str / bool | ✓ Computed | ✓ Red badge |
| `gulika_hhmm` / `in_gulika` | str / bool | ✓ Computed | ✓ Red badge |
| `durmuhurtha_hhmm` / `in_durmuhurtha` | list[str] / bool | ✓ 2 weekday-specific slots | ✓ Red badge |
| `abhijit_hhmm` / `in_abhijit` | str / bool | ✓ 8th of 15 muhurtas (not Wed) | ✓ Green badge if in Abhijit |
| `disha_shula_blocked` / `disha_shula_direction` | bool / str | ✓ Computed | ✓ Yellow badge with direction |

### 1.4 Specialty doshas / yogas (advanced classical)

| Field | Type | Engine status | UI badge eligibility |
|---|---|---|---|
| `is_vishti` / `bhadra_part` | bool / str ("mukha"/"tail") | ✓ Computed | ✓ Red badge if vishti+mukha |
| `mahapata_active` / `mahapata_variety` | bool / str ("vyatipata"/"vaidhriti") | ✓ Computed (PR R2-PR2) | ✓ Red badge |
| `vyatipata_or_vaidhriti` / `vyatipata_hard` | bool / bool | ✓ Computed | ✓ Red badge if hard |
| `mrityu_yoga_active` / `mrityu_yoga_hard` | bool / bool | ✓ Vara × Nakshatra grid | ✓ Red badge |
| `dagdha_tithi_active` / `dagdha_tithi_hard` | bool / bool | ✓ Sun-sign × tithi grid | ✓ Yellow badge |
| `kalapurusha_avoid` | bool | ✓ Computed | ✓ Yellow badge |
| `kartari_ekargala_combined_hard` | bool | ✓ Computed (PR Mu7) | ✓ Red badge |
| `visha_ghatika_active` / `visha_ghatika_num` | bool / int | ✓ Computed | ✓ Yellow badge |
| `varjyam_active` | bool | ✓ Computed (approx via nakshatra-sunrise) | ✓ Yellow badge |
| `amrit_active` | bool | ✓ Computed | ✓ Green badge |
| `tithi_shunya_active` / `tithi_shunya_masa` | bool / str | ✓ Computed (Sun-sign masa) | ✓ Yellow badge |
| `nakshatra_vedha_active` | bool | ✓ Computed | ✓ Yellow badge |
| `panchaka_active` / `panchaka_subtype` / `panchaka_blocks_event` | bool / str / bool | ✓ Computed | ✓ Red badge if blocks_event |
| `solar_month_blocked` | bool | ✓ Computed | ✓ Yellow badge |
| `vara_event_approved` / `vara_event_avoided` | bool / bool | ✓ Per event-type tables | ✓ Green/red badge |

### 1.5 Eclipse + sutak context

| Field | Type | Engine status | UI badge eligibility |
|---|---|---|---|
| `in_eclipse_extended_advisory` | bool | ✓ swe eclipse search ± 9 days | ✓ Red badge |
| `eclipse_kind` | str ("solar"/"lunar"/"none") | ✓ Computed | ✓ Show under red badge |
| `in_sutak` / `sutak_start_jd` / `sutak_end_jd` | bool / float / float | ✓ Computed pre-eclipse window | ✓ Red badge |
| `in_extended_advisory` | bool | ✓ Computed | ✓ Yellow badge |
| `veiled_by` | str | ✓ Reason for eclipse veil | ✓ Tooltip |

### 1.6 KP-specific event signification

| Field | Type | Engine status | Notes |
|---|---|---|---|
| `event_cusp_csl` | str (planet name) | ✓ KP Lagna CSL at moment | The deciding gate |
| `event_cusp_houses` / `signified_houses` | list[int] | ✓ 4-step union | Houses the event-Lagna CSL signifies |
| `event_cusp_confirms` | bool | ✓ Signified ∩ event_houses non-empty | The PROMISE confirmation |
| `event_cusp_denial_hit` | bool | ✓ Signified ∩ denial_houses non-empty | The friction signal |
| `event_primary_cusp_deg` | float | ✓ Cusp longitude | For verifying which cusp |
| `event_label` / `event_type` | str / str | ✓ Caller-supplied + classified | "marriage", "business_start", etc. |
| `event_location_different` | bool | ✓ Live geo vs event geo | True when event_lat/lon differs from query |

### 1.7 Per-participant natal evaluation (multi-chart muhurtha — PR Mu4+)

| Field | Type | Engine status | Notes |
|---|---|---|---|
| `per_participant` | list[dict] | ✓ Per chart | Per-chart evaluation entries |
| `participant_soft_concerns` / `participant_soft_total` | int / int | ✓ Aggregated | Soft-flag counts per chart |
| `hard_rejected_for` | list[str] | ✓ Names | Charts that hard-fail this window |
| `affected_participants` | list[str] | ✓ Names | Charts with soft-concerns |
| `passed` / `passed_count` / `participants_total` | bool / int / int | ✓ Aggregation | Pass counts |
| `aggregation_strategy` | str | ✓ "min"/"all_pass"/"majority" | Per event-type policy |
| `worst_tara_for_all` | bool | ✓ Computed | Only rejects if ALL participants in worst-Tara |
| `cb_tb_substitutable_fail` | bool | ✓ Computed | Tara+Chandrabala substitution rule |

### 1.8 Per-participant natal flags (computed inside per_participant entries)

For each participant chart, the engine returns:

| Field | Type | Engine status |
|---|---|---|
| `chandrashtamam` | bool | ✓ Moon transits 8th from natal Moon |
| `janma_tara` | bool | ✓ Moon in own natal nakshatra |
| `tara_bala_num` / `tara_bala_name` / `tara_bala_good` | int / str / bool | ✓ 9-Tara cycle from natal Moon nak |
| `chandrabala_num` / `chandrabala_good` | int / bool | ✓ Moon house from natal Moon |
| `badhaka_hit` / `badhaka_house` / `badhakesh` / `badhakesh_active` | bool / int / str / bool | ✓ Sign-type-specific Badhaka |
| `dussthana_count` / `dussthana_lords` | int / list | ✓ Lords in H6/H8/H12 |
| `current_md` / `current_ad` | str / str | ✓ Natal dasha tree lookup |
| `dba_lords_at_moment` / `dba_lords_signifying_event` | list / list | ✓ MD/AD lords aligning with event-houses |
| `dba_any_in_natal_dussthana` / `dba_all_signify_event` | bool / bool | ✓ Joint alignment check |
| `rp_x_natal_count` / `rp_x_natal_overlap` | int / list | ✓ Moment-RPs ∩ natal-RPs |
| `retrograde` (per planet) | dict | ✓ For Shukra/Guru combust marriage check |

### 1.9 Karaka combustion (marriage-specific)

| Field | Type | Engine status |
|---|---|---|
| `venus_combust` | bool | ✓ Venus < 10° from Sun |
| `jupiter_combust` | bool | ✓ Jupiter < 11° from Sun |
| `advanced_dosha_check_enabled` / `advanced_doshas` | bool / list | ✓ Topic-gated extras |

### 1.10 Scoring + verdict

| Field | Type | Engine status |
|---|---|---|
| `raw_score` / `base_score` / `score` | float / float / float | ✓ Per scoring table |
| `tier` / `base_tier` | str ("excellent"/"good"/"okay"/"avoid") | ✓ Score-bucketed |
| `confidence_score` / `confidence_breakdown` | int / dict | ✓ Per scoring matrix |
| `soft_score` / `soft_concerns` / `soft_flagged_count` | int / list / int | ✓ Soft-flag tally |
| `dussthana_count` / `dussthana_lords` | int / list | ✓ For confidence penalty |
| `evidence_payload` | dict | ✓ Full per-window evidence (for LLM ingestion) |
| `reason` / `escalators` | str / list | ✓ Why the window was passed/rejected |
| `framing_note_en` / `framing_note_te` | str / str | ✓ Localized brief |

### 1.11 Suggestion / extension

| Field | Type | Engine status |
|---|---|---|
| `same_day_alternatives` | list | ✓ Other windows on the same day |
| `soft_flagged_windows` | list | ✓ Windows that are "okay but with concerns" |
| `nearby_better` | list | ✓ Windows nearby with higher tier |
| `extend_suggestion` / `ext_advisory_start_jd` / `ext_advisory_end_jd` | str / float / float | ✓ Recommend extending search if no clean window |
| `resonating_with` | list | ✓ Which participant-RPs the Lagna-SL hits |

---

## 2. Doctrine in `muhurtha.txt` that is NOT engine-computed

These doctrinal concerns are mentioned in the KB but the engine does
NOT currently compute them. LLM should treat them as advisory-only.

| Doctrine | Source | Status |
|---|---|---|
| Vidya Muhurta (school-start auspicious time) | muhurtha.txt | KB-mentioned, doctrine-only |
| Sutar-graha-yoga (planetary friendship for specific event) | muhurtha.txt | KB-mentioned, doctrine-only |
| Mrigashira-Bharani specific event rules | muhurtha.txt | KB-mentioned, doctrine-only |
| Tara substitution beyond CB+TB (e.g., 9-tara dynamic substitutability) | muhurtha.txt | Partial — see `cb_tb_substitutable_fail` |
| Sade Sati explicit gating (Saturn 12/1/2-from-Moon) for muhurtha | muhurtha.txt | KB-mentioned only |
| Pushkara navamsa boost | muhurtha.txt | KB-mentioned, doctrine-only |
| Trimsamsa malefic boost gating | muhurtha.txt | KB-mentioned, doctrine-only |

If we want any of these promoted to engine-computed, file a Phase 9
issue with the doctrine source citation + UI consumer use case.

---

## 3. UI badge consumption guide

Frontend muhurtha result rows should consume engine output as follows:

**Always show (every row):**
- `tithi`, `nakshatra`, `yoga` — primary panchang identity
- `score` / `tier` — overall verdict
- `confidence_score` — honest engine confidence

**Show only when active (red badges = hard-block):**
- `in_rahu_kalam`, `in_yamagandam`, `in_gulika` — Vedic inauspicious slots
- `mahapata_active`, `mrityu_yoga_hard`, `is_vishti+bhadra_part==mukha`
- `kartari_ekargala_combined_hard`, `vyatipata_hard`
- `in_eclipse_extended_advisory`, `in_sutak`
- `venus_combust` / `jupiter_combust` (marriage events only)
- `event_cusp_denial_hit` (the KP friction signal)

**Show when active (yellow badges = soft-concern):**
- `dagdha_tithi_active`, `varjyam_active`, `kalapurusha_avoid`
- `visha_ghatika_active`, `nakshatra_vedha_active`
- `disha_shula_blocked`, `solar_month_blocked`
- `participant_soft_concerns` (per-chart soft tally)

**Show when active (green badges = boost):**
- `in_abhijit`, `amrit_active`, `vara_event_approved`
- `event_cusp_confirms` (the KP green light)

**Multi-chart muhurtha specific:**
- `passed_count / participants_total` (e.g., "3/4 passed")
- `hard_rejected_for` (named list)
- `affected_participants` (named list with soft concerns)

---

## 4. LLM consumption guide

In a muhurtha-result LLM analysis, cite the following engine fields
VERBATIM (do not paraphrase, do not invent):

- The verdict tier + score + confidence (`tier`, `score`, `confidence_score`)
- The KP gate result (`event_cusp_csl`, `event_cusp_confirms`,
  `event_cusp_denial_hit`)
- Active inauspicious slots (only those where `in_X == True`)
- Per-participant evaluation summary (`passed_count`, `hard_rejected_for`,
  `affected_participants`)
- The reason text (`reason`, `escalators`)

NEVER claim "the engine checked X" for any X not in §1 above. If the
doctrine in muhurtha.txt mentions a check that isn't in §1, cite as
"per KB doctrine, ... but this is not engine-verified — astrologer's
judgment recommended."

---

## 5. Change log

- **v1 (2026-05-27)** — Phase 8 Gap 6 fix. Initial capability matrix
  derived from `muhurtha_engine.py` v2026-05-26. Will need refresh if
  engine adds/removes fields.
