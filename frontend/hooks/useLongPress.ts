"use client";

/**
 * useLongPress — primitive hook for long-press gesture detection.
 *
 * Part of Phase 9.4 EntityPeek primitive.
 * See `.claude/research/mobile-cross-reference-design.md` §1.③.
 *
 * Returns event handlers (spread on the target element) plus the
 * current `isPressed` state. Fires:
 *   - onLongPress() after `delayMs` ms (default 400) while still pressed
 *   - onTap() if pointer was released before `delayMs` elapsed
 *
 * Movement beyond `moveThreshold` px during the hold cancels the
 * long-press (treats it as a drag — onTap also won't fire). This is
 * the "TAP_DEADZONE" pattern from CommandOrb.tsx.
 *
 * Pointer events are used (PointerEvent) so the hook works for touch
 * AND mouse AND pen with a single code path.
 *
 * Validated in production by Cosmic Insights (App Store) which uses
 * long-press on any house to show a popup. We replicate that pattern.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseLongPressOpts {
  /** Fired after delayMs ms of continuous pressure. */
  onLongPress: (e: ReactPointerEvent<HTMLElement>) => void;
  /** Fired on quick tap (release before delayMs). Optional. */
  onTap?: (e: ReactPointerEvent<HTMLElement>) => void;
  /** Long-press threshold in ms. Default 400. */
  delayMs?: number;
  /** Movement (in any direction) above this cancels the press. Default 6 px. */
  moveThreshold?: number;
}

export function useLongPress(opts: UseLongPressOpts) {
  const { onLongPress, onTap, delayMs = 400, moveThreshold = 6 } = opts;
  const [isPressed, setIsPressed] = useState(false);

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXY      = useRef({ x: 0, y: 0 });
  const capturedId   = useRef<number | null>(null);
  const fired        = useRef(false);   // true if onLongPress already fired
  const lastEventRef = useRef<ReactPointerEvent<HTMLElement> | null>(null);

  // Stable refs to callbacks (so consumers don't have to memoize).
  const onLongPressRef = useRef(onLongPress);
  const onTapRef       = useRef(onTap);
  useEffect(() => { onLongPressRef.current = onLongPress; }, [onLongPress]);
  useEffect(() => { onTapRef.current       = onTap;       }, [onTap]);

  const cancel = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    capturedId.current = null;
    setIsPressed(false);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startXY.current = { x: e.clientX, y: e.clientY };
    capturedId.current = e.pointerId;
    fired.current = false;
    lastEventRef.current = e;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      fired.current = true;
      timerRef.current = null;
      if (lastEventRef.current) onLongPressRef.current(lastEventRef.current);
    }, delayMs);
  }, [delayMs]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) return;
    const dx = e.clientX - startXY.current.x;
    const dy = e.clientY - startXY.current.y;
    if (Math.hypot(dx, dy) > moveThreshold) {
      // Treat as drag — cancel both long-press and tap.
      cancel();
    } else {
      lastEventRef.current = e;
    }
  }, [moveThreshold, cancel]);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) {
      cancel();
      return;
    }
    if (timerRef.current != null) {
      // Released before long-press timer fired → counts as a tap.
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (!fired.current && onTapRef.current) {
        onTapRef.current(e);
      }
    }
    capturedId.current = null;
    setIsPressed(false);
  }, [cancel]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isPressed,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      style: { touchAction: "manipulation" as const },
    },
  };
}
