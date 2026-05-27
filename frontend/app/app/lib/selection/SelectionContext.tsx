"use client";

/**
 * SelectionContext — the GLOBAL selected-entity state.
 *
 * Part of Phase 9 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.① for the
 * full architectural rationale.
 *
 * What this provides:
 *   - One source of truth for "what entity is the user focused on?"
 *   - A `useSelection()` hook that any component can subscribe to
 *   - History stack (for breadcrumb — Phase 9.7)
 *   - Pin tray (for manual cross-reference holders — Phase 9.6)
 *   - Cross-tab persistence (lives at workspace root, above tab state)
 *
 * What this does NOT do:
 *   - It does NOT render any UI. Components subscribe and decide what
 *     to show (glow, drawer, peek, etc.)
 *   - It does NOT know about KP doctrine. It's a generic entity-focus
 *     state machine — what counts as "related" is in `relation.ts`
 *     (Phase 9.8).
 *   - It does NOT auto-persist selection to localStorage. The current
 *     selection is ephemeral; only the pin tray persists.
 *
 * Reading guide:
 *   - selection state machine: §1
 *   - history (breadcrumb): §2
 *   - pin tray: §3
 *   - hook + helpers: §4
 *   - SSR safety: §5
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import {
  type SelectedEntity, type SelectionHistoryEntry,
  HISTORY_MAX, PIN_TRAY_MAX, PIN_TRAY_STORAGE_KEY_PREFIX,
  entityLabel, entitiesEqual,
} from "./types";

// ── §1. The Context shape ──────────────────────────────────────────
interface SelectionContextValue {
  /** Currently focused entity (or null). */
  selected: SelectedEntity;
  /** Set the focused entity. Pushes the previous selection onto history. */
  select: (entity: SelectedEntity) => void;
  /** Clear focus (entity becomes null + drawer dismisses). */
  clear: () => void;

  /** Breadcrumb history (oldest first, capped at HISTORY_MAX). */
  history: SelectionHistoryEntry[];
  /** Jump back to a specific history entry; pops everything newer. */
  jumpToHistory: (index: number) => void;
  /** Clear the breadcrumb (does NOT clear current selection). */
  clearHistory: () => void;

  /** Pinned entities (kept across selection changes). */
  pinned: SelectedEntity[];
  /** Pin the given entity (or current selection if no arg). */
  pin: (entity?: SelectedEntity) => void;
  /** Unpin by index in the tray. */
  unpin: (index: number) => void;
  /** Clear all pins. */
  clearPins: () => void;

  /**
   * The chart identity this selection is for. Used to scope pin tray
   * localStorage so pins don't leak across charts. Set by the provider
   * when chart switches.
   */
  chartScopeKey: string | null;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

// ── §2. Provider props ─────────────────────────────────────────────
interface SelectionProviderProps {
  children: ReactNode;
  /**
   * A stable key identifying the current chart (e.g. chart id, session
   * id, or `name_dob` composite). When this changes, the provider
   * clears the current selection + history (pins persist per chart via
   * localStorage scoped by this key).
   */
  chartScopeKey?: string | null;
}

// ── §3. Provider implementation ───────────────────────────────────
export function SelectionProvider({
  children,
  chartScopeKey = null,
}: SelectionProviderProps) {
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [history, setHistory]   = useState<SelectionHistoryEntry[]>([]);
  const [pinned, setPinned]     = useState<SelectedEntity[]>([]);

  // Ref to the previous chartScopeKey so we detect chart-switch (vs
  // initial mount).
  const prevChartScopeKeyRef = useRef<string | null | undefined>(undefined);

  // ── Pin tray: load from localStorage on chart-key change ─────────
  useEffect(() => {
    // First mount with no chartScopeKey: nothing to load.
    if (chartScopeKey == null) {
      // If we previously had a key and are now switching to no-key,
      // clear pins.
      if (prevChartScopeKeyRef.current != null) {
        setPinned([]);
      }
      prevChartScopeKeyRef.current = chartScopeKey;
      return;
    }
    // Same chart as before — nothing to do (already loaded).
    if (prevChartScopeKeyRef.current === chartScopeKey) return;

    // Chart changed (or first time we see this chart):
    //   - clear current selection + history
    //   - load pins for the new chart
    setSelected(null);
    setHistory([]);
    try {
      const raw = window.localStorage.getItem(
        PIN_TRAY_STORAGE_KEY_PREFIX + chartScopeKey,
      );
      if (raw) {
        const parsed = JSON.parse(raw) as SelectedEntity[];
        if (Array.isArray(parsed)) {
          // Sanity check + cap
          setPinned(parsed.filter(Boolean).slice(0, PIN_TRAY_MAX));
        } else {
          setPinned([]);
        }
      } else {
        setPinned([]);
      }
    } catch {
      setPinned([]);
    }
    prevChartScopeKeyRef.current = chartScopeKey;
  }, [chartScopeKey]);

  // ── Pin tray: persist to localStorage on pin/unpin ───────────────
  useEffect(() => {
    if (chartScopeKey == null) return;
    try {
      window.localStorage.setItem(
        PIN_TRAY_STORAGE_KEY_PREFIX + chartScopeKey,
        JSON.stringify(pinned),
      );
    } catch { /* localStorage may be unavailable (private mode) */ }
  }, [pinned, chartScopeKey]);

  // ── Selection actions ────────────────────────────────────────────
  const select = useCallback((entity: SelectedEntity) => {
    setSelected(prev => {
      // No-op if same entity (avoid history pollution + re-renders).
      if (entitiesEqual(prev, entity)) return prev;
      // Push the previous selection onto history (if non-null).
      if (prev != null) {
        setHistory(h => {
          const next: SelectionHistoryEntry = {
            entity: prev,
            selectedAt: Date.now(),
            label: entityLabel(prev),
          };
          const merged = [...h, next];
          // Cap; drop oldest.
          return merged.length > HISTORY_MAX
            ? merged.slice(merged.length - HISTORY_MAX)
            : merged;
        });
      }
      return entity;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
    // History intentionally NOT cleared on simple dismiss — user may
    // re-open drawer and want their trail.
  }, []);

  const jumpToHistory = useCallback((index: number) => {
    setHistory(h => {
      if (index < 0 || index >= h.length) return h;
      const target = h[index];
      // Pop everything from this index onward.
      const kept = h.slice(0, index);
      // Re-select the target (this will push current selection onto kept).
      setSelected(prev => {
        if (prev != null && !entitiesEqual(prev, target.entity)) {
          // We're keeping `kept` as the new history; current selection
          // becomes the latest kept entry (after pop), then target is
          // re-selected. But to avoid weird double-push, set history
          // directly to `kept` here and let the next select() push it.
          // Workaround: don't push prev onto history this time.
        }
        return target.entity;
      });
      return kept;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // ── Pin tray actions ─────────────────────────────────────────────
  const pin = useCallback((entity?: SelectedEntity) => {
    const target = entity ?? selected;
    if (target == null) return;
    setPinned(prev => {
      // Don't double-pin the same entity.
      if (prev.some(e => entitiesEqual(e, target))) return prev;
      // Cap; drop oldest when full.
      const next = [...prev, target];
      return next.length > PIN_TRAY_MAX
        ? next.slice(next.length - PIN_TRAY_MAX)
        : next;
    });
  }, [selected]);

  const unpin = useCallback((index: number) => {
    setPinned(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clearPins = useCallback(() => {
    setPinned([]);
  }, []);

  // ── Memoize the context value to avoid re-render storms ──────────
  const value = useMemo<SelectionContextValue>(
    () => ({
      selected, select, clear,
      history, jumpToHistory, clearHistory,
      pinned, pin, unpin, clearPins,
      chartScopeKey,
    }),
    [
      selected, select, clear,
      history, jumpToHistory, clearHistory,
      pinned, pin, unpin, clearPins,
      chartScopeKey,
    ],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// ── §4. Hook ───────────────────────────────────────────────────────
/**
 * Subscribe to the selection context. Throws if used outside a
 * <SelectionProvider> — wrap your app appropriately.
 *
 * Typical use:
 *   const { selected, select } = useSelection();
 *   <td onClick={() => select({ type: "planet", value: "Venus" })}>
 */
export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (ctx == null) {
    throw new Error(
      "useSelection() must be used inside a <SelectionProvider>. " +
      "Wrap your app or workspace shell in <SelectionProvider> first.",
    );
  }
  return ctx;
}

/**
 * SSR-safe variant: returns a no-op context value if outside a
 * provider (instead of throwing). Use in components that may render
 * during server-side rendering or in storybook isolation.
 *
 * Note: actions are no-ops in fallback mode — they won't crash but
 * also won't do anything. Use only where graceful degradation is OK.
 */
export function useSelectionSafe(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (ctx == null) {
    return {
      selected: null,
      select: () => {},
      clear: () => {},
      history: [],
      jumpToHistory: () => {},
      clearHistory: () => {},
      pinned: [],
      pin: () => {},
      unpin: () => {},
      clearPins: () => {},
      chartScopeKey: null,
    };
  }
  return ctx;
}

// Re-export the type union so consumers can type their handlers without
// a second import.
export type { SelectedEntity } from "./types";
