/**
 * Selection Atom — global focused-entity types.
 *
 * Part of Phase 9 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` for the
 * full architectural rationale.
 *
 * This file is the SINGLE SOURCE OF TRUTH for what "an entity the
 * user is focused on" can be. Adding a new entity type (e.g.,
 * "Yogini lord" when we ship Yogini Dasha support, or "client" when
 * CRM ships) = one new union member here + the rest of the system
 * picks it up via `useSelection()`.
 *
 * Discipline:
 *   - Keep the union small and KP-canonical (no random one-off types)
 *   - Each member has a `type` discriminator + a `value` payload
 *   - Optional metadata (layer for dasha, etc.) stays on the union
 *     member that needs it — don't add fields to every member
 *   - Adding a member is a non-breaking change; downstream consumers
 *     using exhaustive switches will get a TypeScript error and be
 *     forced to handle the new case
 */

/** A house (1-12) that the user has focused on. */
export interface SelectedHouse {
  type: "house";
  /** House number 1..12 */
  value: number;
}

/** A planet (English name) the user has focused on. */
export interface SelectedPlanet {
  type: "planet";
  /** Canonical English name: Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu */
  value: string;
}

/** A dasha lord active at a specific layer (MD/AD/PAD/SD). */
export interface SelectedDashaLord {
  type: "dasha_lord";
  /** Planet name */
  value: string;
  /** Which dasha layer: Mahadasha / Antardasha / Pratyantardasha / Sookshma */
  layer: "MD" | "AD" | "PAD" | "SD";
}

/** A nakshatra (27 lunar mansions). */
export interface SelectedNakshatra {
  type: "nakshatra";
  /** Canonical English nakshatra name (e.g., "Ashwini", "Rohini") */
  value: string;
}

/** A sub-lord (KP concept) — a planet at a specific cuspal sub. */
export interface SelectedSubLord {
  type: "sub_lord";
  /** Planet name */
  value: string;
}

/**
 * The complete Selection Atom: any of the above OR null (nothing focused).
 *
 * Future entity types (one entry per union member):
 *   - Client (when CRM ships): { type: "client", value: clientId }
 *   - Appointment: { type: "appointment", value: apptId, when: Date }
 *   - Note: { type: "note", value: noteId, scope: "chart" | "client" }
 *
 * Each addition is one line + downstream `switch(entity.type)` blocks
 * get a TypeScript error pointing to every place that needs an update.
 */
export type SelectedEntity =
  | SelectedHouse
  | SelectedPlanet
  | SelectedDashaLord
  | SelectedNakshatra
  | SelectedSubLord
  | null;

/**
 * Visual relation strength between the currently-selected entity and
 * an entity being rendered. Used by `useEntityRelation()` (Phase 9.8)
 * to drive the glow hierarchy.
 *
 *   "direct"   = the entity IS the selected entity (strongest highlight)
 *   "related"  = entity has a direct KP relationship (lord, occupant,
 *                star-lord, sub-lord, signified-house, etc.)
 *   "distant"  = entity has a two-hop relationship (lord's lord, etc.)
 *   "none"     = no relation (default — no highlight)
 */
export type EntityRelation = "direct" | "related" | "distant" | "none";

/**
 * History stack for the breadcrumb (Phase 9.7).
 * Capped at HISTORY_MAX entries; oldest drops when full.
 */
export interface SelectionHistoryEntry {
  entity: SelectedEntity;
  /** When this entity was selected (epoch ms) — for analytics + UI */
  selectedAt: number;
  /** Human-readable label shown in breadcrumb (e.g., "H7", "Venus", "MD Rahu") */
  label: string;
}

/** Cap on breadcrumb history depth. */
export const HISTORY_MAX = 6;

/** Cap on pin tray size (Phase 9.6). */
export const PIN_TRAY_MAX = 3;

/** localStorage key for pin tray persistence (per-chart). */
export const PIN_TRAY_STORAGE_KEY_PREFIX = "devastroai:pinTray:";

/** Helper: produce a stable human-readable label for an entity. */
export function entityLabel(entity: SelectedEntity): string {
  if (!entity) return "";
  switch (entity.type) {
    case "house":      return `H${entity.value}`;
    case "planet":     return entity.value;
    case "dasha_lord": return `${entity.layer} ${entity.value}`;
    case "nakshatra":  return entity.value;
    case "sub_lord":   return `${entity.value} (sub)`;
  }
}

/** Helper: structural equality check (for memo + dedup). */
export function entitiesEqual(a: SelectedEntity, b: SelectedEntity): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.type !== b.type) return false;
  if (a.type === "dasha_lord" && b.type === "dasha_lord") {
    return a.value === b.value && a.layer === b.layer;
  }
  // For all other types, value comparison suffices.
  return a.value === (b as { value: string | number }).value;
}
