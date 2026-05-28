"use client";

/**
 * useEntityRelation — compute KP-doctrinal relation strength between
 * the currently-focused entity and the entity being rendered.
 *
 * Part of Phase 9.8 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑧.
 *
 * Returns one of: "direct" | "related" | "distant" | "none".
 * Drives the glow tier CSS class (.glow-direct / .glow-related /
 * .glow-distant) via the small companion helper `relationClass()`.
 *
 * Doctrinal relations encoded:
 *
 *   PLANET ↔ PLANET:
 *     - direct  = same planet
 *     - related = star-lord / sub-lord of the focused planet
 *               OR planets occupying the focused planet's house
 *     - distant = star-lord of the related set above (two-hop)
 *
 *   PLANET ↔ HOUSE:
 *     - direct  = (never — different types)
 *     - related = the planet OCCUPIES this house
 *               OR the planet is the SIGN LORD of this house's cusp
 *               OR the planet's star-lord occupies this house
 *     - distant = two-hop via star-lord chain
 *
 *   HOUSE ↔ HOUSE:
 *     - direct  = same house
 *     - related = (none defined — houses are static slots)
 *     - distant = (none defined)
 *
 *   HOUSE ↔ PLANET:
 *     - direct  = (never — different types)
 *     - related = planet OCCUPIES the focused house
 *               OR planet is the SIGN LORD of the focused cusp
 *               OR planet is in the star of the focused cusp's
 *                  sub-lord (KP 4-step chain Step 2)
 *     - distant = two-hop (Step 3 of the 4-step chain)
 *
 *   DASHA_LORD ↔ PLANET:
 *     - direct  = (the dasha lord IS this planet)
 *     - related = the dasha lord's star-lord or sub-lord
 *     - distant = two-hop
 *
 * The hook needs `workspaceData` to do the relation lookup (occupants,
 * sub-lords, etc.). Components that already have workspaceData pass it
 * in; the hook is a pure function (with memoization).
 *
 * Performance: relation computation is O(1) — small dictionary lookups
 * + constant-time set checks. Safe to call inside `.map()` loops.
 */

import { useMemo } from "react";
import { useSelection } from "./SelectionContext";
import type { SelectedEntity, EntityRelation } from "./types";

/**
 * The minimum workspaceData shape this hook needs to compute relations.
 * Caller passes the live `workspaceData` from page.tsx; we only read
 * what we need. Defensive: every field is optional and we degrade
 * gracefully (returns "none") if data is missing.
 */
export interface RelationWorkspace {
  planets?: Array<{
    planet_en: string;
    house?: string | number;
    star_lord_en?: string;
    sub_lord_en?: string;
  }>;
  cusps?: Array<{
    house?: number;
    sign_en?: string;
    sub_lord_en?: string;
    star_lord_en?: string;
  }>;
}

// Static sign-lord table (used when cusps lack sub_lord_en for some
// reason). Same constants as backend chart_engine.SIGN_LORDS.
const SIGN_LORDS: Record<string, string> = {
  Aries:       "Mars",
  Taurus:      "Venus",
  Gemini:      "Mercury",
  Cancer:      "Moon",
  Leo:         "Sun",
  Virgo:       "Mercury",
  Libra:       "Venus",
  Scorpio:     "Mars",
  Sagittarius: "Jupiter",
  Capricorn:   "Saturn",
  Aquarius:    "Saturn",
  Pisces:      "Jupiter",
};

/**
 * The hook. Pass the entity being rendered (the "target"); reads the
 * current focus from SelectionContext. Returns the relation tier.
 */
export function useEntityRelation(
  target: NonNullable<SelectedEntity> | null | undefined,
  workspace: RelationWorkspace | null | undefined,
): EntityRelation {
  const { selected } = useSelection();

  return useMemo(() => {
    if (!target || !selected) return "none";
    return computeRelation(selected, target, workspace ?? {});
  }, [target, selected, workspace]);
}

/** Companion: convert a relation tier to its CSS class name. */
export function relationClass(rel: EntityRelation): string {
  switch (rel) {
    case "direct":  return "glow-direct";
    case "related": return "glow-related";
    case "distant": return "glow-distant";
    case "none":    return "";
  }
}

/** Pure relation computation — exported for testing / non-hook use. */
export function computeRelation(
  focused: NonNullable<SelectedEntity>,
  target: NonNullable<SelectedEntity>,
  workspace: RelationWorkspace,
): EntityRelation {
  // Same entity (regardless of layer/value) → direct match.
  if (entitiesSameForRelation(focused, target)) return "direct";

  // Planet ↔ Planet
  if (focused.type === "planet" && target.type === "planet") {
    const f = focused.value, t = target.value;
    const fPlanet = workspace.planets?.find(p => p.planet_en === f);
    if (fPlanet) {
      if (fPlanet.star_lord_en === t || fPlanet.sub_lord_en === t) return "related";
      // Same-house occupants
      const fHouse = String(fPlanet.house ?? "");
      const sameHouse = workspace.planets?.some(p => p.planet_en === t && String(p.house ?? "") === fHouse);
      if (sameHouse) return "related";
    }
    // Two-hop: star/sub of related set
    const tPlanet = workspace.planets?.find(p => p.planet_en === t);
    if (fPlanet && tPlanet) {
      if (
        tPlanet.star_lord_en === fPlanet.star_lord_en ||
        tPlanet.sub_lord_en  === fPlanet.sub_lord_en
      ) return "distant";
    }
    return "none";
  }

  // House ↔ House
  if (focused.type === "house" && target.type === "house") {
    // No defined non-direct relation between houses.
    return "none";
  }

  // House (focused) ↔ Planet (target)
  if (focused.type === "house" && target.type === "planet") {
    const cusp = workspace.cusps?.find(c => c.house === focused.value);
    if (!cusp) return "none";
    if (cusp.sub_lord_en === target.value)  return "related";
    if (cusp.star_lord_en === target.value) return "related";
    const cuspSignLord = cusp.sign_en ? SIGN_LORDS[cusp.sign_en] : undefined;
    if (cuspSignLord === target.value)      return "related";
    // Planet occupying this house
    const occupant = workspace.planets?.find(
      p => String(p.house ?? "") === String(focused.value) && p.planet_en === target.value,
    );
    if (occupant) return "related";
    // Two-hop via star/sub chain
    if (cusp.sub_lord_en) {
      const subPlanet = workspace.planets?.find(p => p.planet_en === cusp.sub_lord_en);
      if (subPlanet && (subPlanet.star_lord_en === target.value || subPlanet.sub_lord_en === target.value)) {
        return "distant";
      }
    }
    return "none";
  }

  // Planet (focused) ↔ House (target) — symmetric to the above.
  if (focused.type === "planet" && target.type === "house") {
    const cusp = workspace.cusps?.find(c => c.house === target.value);
    if (!cusp) return "none";
    if (cusp.sub_lord_en === focused.value)  return "related";
    if (cusp.star_lord_en === focused.value) return "related";
    const cuspSignLord = cusp.sign_en ? SIGN_LORDS[cusp.sign_en] : undefined;
    if (cuspSignLord === focused.value)      return "related";
    const occupant = workspace.planets?.find(
      p => String(p.house ?? "") === String(target.value) && p.planet_en === focused.value,
    );
    if (occupant) return "related";
    if (cusp.sub_lord_en) {
      const subPlanet = workspace.planets?.find(p => p.planet_en === cusp.sub_lord_en);
      if (subPlanet && (subPlanet.star_lord_en === focused.value || subPlanet.sub_lord_en === focused.value)) {
        return "distant";
      }
    }
    return "none";
  }

  // Dasha lord (focused) ↔ Planet (target)
  if (focused.type === "dasha_lord" && target.type === "planet") {
    if (focused.value === target.value) return "direct";
    const fPlanet = workspace.planets?.find(p => p.planet_en === focused.value);
    if (fPlanet && (fPlanet.star_lord_en === target.value || fPlanet.sub_lord_en === target.value)) {
      return "related";
    }
    return "none";
  }

  // Planet (focused) ↔ Dasha lord (target)
  if (focused.type === "planet" && target.type === "dasha_lord") {
    if (focused.value === target.value) return "direct";
    const tPlanet = workspace.planets?.find(p => p.planet_en === target.value);
    if (tPlanet && (tPlanet.star_lord_en === focused.value || tPlanet.sub_lord_en === focused.value)) {
      return "related";
    }
    return "none";
  }

  // Fallthrough: no defined relation (nakshatra/sub_lord cases or
  // type mismatches). Returns "none" — no glow.
  return "none";
}

/** Helper: identity check that treats dasha-lord same value as same. */
function entitiesSameForRelation(
  a: NonNullable<SelectedEntity>,
  b: NonNullable<SelectedEntity>,
): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "dasha_lord" && b.type === "dasha_lord") {
    // For "direct" highlight we treat any layer of the same lord as
    // direct (MD Rahu and AD Rahu still glow each other as "you're
    // looking at Rahu somewhere in the dasha tree").
    return a.value === b.value;
  }
  return a.value === (b as { value: string | number }).value;
}
