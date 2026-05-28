"use client";

/**
 * useDrawerSnap — multi-snap bottom drawer (Google-Maps-style).
 *
 * Part of Phase 9.2 mobile cross-reference design language.
 * Built as a separate hook from `useSheetDrag` (which is binary
 * open/close) so existing consumers (HousePanel, CommandOrb sheet)
 * remain untouched. See `.claude/research/mobile-cross-reference-design.md`
 * §1.② for the full spec.
 *
 * Behavior:
 *   - Three snap states: "peek" (default 15vh), "default" (50vh),
 *     "full" (90vh). Heights are configurable per-instance.
 *   - User drags handle vertically → drawer follows finger.
 *   - On release: snap to the NEAREST configured snap state.
 *   - Drag below "peek" by `dismissThreshold` (or sufficient velocity)
 *     → fire onDismiss.
 *   - Drag above "full" damped (elastic resistance) — doesn't go higher.
 *   - Initial snap state is `default` when the drawer first opens; can
 *     be reset via the returned `setSnap` action.
 *
 * Returns:
 *   - `snap`: current snap state name ("peek" | "default" | "full")
 *   - `setSnap`: programmatic setter
 *   - `dragProps`: spread onto the drag handle element
 *   - `sheetStyle`: spread onto the drawer root (height + transform)
 *   - `dragging`: true while user is mid-drag (disables transition)
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

export type DrawerSnap = "peek" | "default" | "full";

export interface UseDrawerSnapOpts {
  /** Called when the user dismisses the drawer (drags below peek). */
  onDismiss: () => void;
  /** Snap heights in vh (viewport-height percentage). Defaults: 15/50/90. */
  snapHeightsVh?: Record<DrawerSnap, number>;
  /** Initial snap when drawer opens. Default: "default". */
  initialSnap?: DrawerSnap;
  /** Pixels below peek snap that count as dismiss. Default: 60. */
  dismissThreshold?: number;
  /** px/ms velocity that counts as a flick-dismiss. Default: 0.6. */
  velocityThreshold?: number;
}

const DEFAULT_HEIGHTS: Record<DrawerSnap, number> = {
  peek:    15,
  default: 50,
  full:    90,
};

export function useDrawerSnap(opts: UseDrawerSnapOpts) {
  const {
    onDismiss,
    snapHeightsVh = DEFAULT_HEIGHTS,
    initialSnap = "default",
    dismissThreshold = 60,
    velocityThreshold = 0.6,
  } = opts;

  const [snap, setSnap] = useState<DrawerSnap>(initialSnap);
  const [dragOffset, setDragOffset] = useState(0); // px from current snap
  const [dragging, setDragging] = useState(false);

  const startY     = useRef(0);
  const startT     = useRef(0);
  const lastY      = useRef(0);
  const lastT      = useRef(0);
  const capturedId = useRef<number | null>(null);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startY.current = e.clientY;
    startT.current = performance.now();
    lastY.current  = e.clientY;
    lastT.current  = startT.current;
    capturedId.current = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) return;
    const raw = e.clientY - startY.current;
    // Determine if drag would push drawer above "full" (i.e., raw is
    // very negative when at full snap). Apply elastic damping there.
    const currentHeightVh = snapHeightsVh[snap];
    const viewportH = (typeof window !== "undefined" ? window.innerHeight : 800);
    const currentHeightPx = (currentHeightVh / 100) * viewportH;
    const fullHeightPx    = (snapHeightsVh.full / 100) * viewportH;
    const wouldExceedFull = -raw + currentHeightPx > fullHeightPx;
    const adjusted = wouldExceedFull ? raw / 4 : raw;
    setDragOffset(adjusted);
    lastY.current = e.clientY;
    lastT.current = performance.now();
  }, [snap, snapHeightsVh]);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) return;
    const distance = lastY.current - startY.current;
    const duration = Math.max(1, lastT.current - startT.current);
    const velocity = distance / duration; // px/ms, positive = downward
    capturedId.current = null;
    setDragging(false);

    const viewportH = (typeof window !== "undefined" ? window.innerHeight : 800);

    // Compute the effective height the user dragged to (current snap
    // height minus downward drag, in px).
    const currentHeightPx = (snapHeightsVh[snap] / 100) * viewportH;
    const effectiveHeightPx = currentHeightPx - distance;

    // Dismiss check: drag below peek by dismissThreshold OR flick-down.
    const peekHeightPx = (snapHeightsVh.peek / 100) * viewportH;
    if (
      effectiveHeightPx < peekHeightPx - dismissThreshold ||
      velocity >= velocityThreshold
    ) {
      setDragOffset(0);
      onDismiss();
      return;
    }

    // Snap to nearest: find the snap whose pixel height is closest
    // to effectiveHeightPx.
    const candidates: { snap: DrawerSnap; px: number }[] = [
      { snap: "peek",    px: (snapHeightsVh.peek    / 100) * viewportH },
      { snap: "default", px: (snapHeightsVh.default / 100) * viewportH },
      { snap: "full",    px: (snapHeightsVh.full    / 100) * viewportH },
    ];
    let best = candidates[0];
    let bestDist = Math.abs(effectiveHeightPx - best.px);
    for (const c of candidates.slice(1)) {
      const d = Math.abs(effectiveHeightPx - c.px);
      if (d < bestDist) { best = c; bestDist = d; }
    }
    setSnap(best.snap);
    setDragOffset(0);
  }, [snap, snapHeightsVh, dismissThreshold, velocityThreshold, onDismiss]);

  // Sheet style: height = current snap height − dragOffset (downward drag
  // shrinks the drawer; upward drag grows it). We apply via height instead
  // of translate so the drawer never extends off the bottom of the viewport.
  const baseHeightVh = snapHeightsVh[snap];
  const heightPx =
    (baseHeightVh / 100) * (typeof window !== "undefined" ? window.innerHeight : 800)
    - dragOffset;

  const sheetStyle: CSSProperties = {
    height: Math.max(0, heightPx),
    transition: dragging ? "none" : "height 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const dragProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    style: { touchAction: "none" as const, cursor: dragging ? "grabbing" : "grab" },
  };

  return { snap, setSnap, dragProps, sheetStyle, dragging };
}
