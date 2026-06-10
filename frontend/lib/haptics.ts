/**
 * Shared haptic feedback — 2026-06-10 UX overhaul.
 *
 * Extracted from CommandOrb so any surface can fire subtle vibration on
 * meaningful moments (copy success, chart cast complete, verdict reveal).
 * No-ops silently on browsers without navigator.vibrate (e.g. iOS Safari,
 * desktop), so it's always safe to call.
 */

export function haptic(pattern: number | number[]): void {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore — haptics are a progressive enhancement */
  }
}

/** Named patterns so call sites read intent, not magic numbers. */
export const HAPTIC = {
  /** Light tap — taps, toggles. */
  tap: 8,
  /** Selection tick — picking an item. */
  select: 6,
  /** Success — copy done, chart cast, action confirmed. */
  success: [12, 40, 18] as number[],
  /** Emphasis — a verdict / reveal moment. */
  reveal: [10, 30, 10, 30, 24] as number[],
};
