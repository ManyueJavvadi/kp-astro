/**
 * Selection module barrel — Phase 9 mobile cross-reference design language.
 *
 * Import from here in app code:
 *   import { useSelection, SelectionProvider, type SelectedEntity }
 *     from "@/app/app/lib/selection";
 *
 * See `.claude/research/mobile-cross-reference-design.md` for the full
 * architecture.
 */

export {
  SelectionProvider, useSelection, useSelectionSafe,
} from "./SelectionContext";

export {
  HISTORY_MAX, PIN_TRAY_MAX, PIN_TRAY_STORAGE_KEY_PREFIX,
  entityLabel, entitiesEqual,
  type SelectedEntity, type SelectedHouse, type SelectedPlanet,
  type SelectedDashaLord, type SelectedNakshatra, type SelectedSubLord,
  type EntityRelation, type SelectionHistoryEntry,
} from "./types";
