"use client";
import { useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";

/**
 * PR21 — drag-to-dismiss for bottom sheets.
 *
 * Attach `dragProps` to the drag handle / header. Apply `sheetStyle`
 * to the sheet root. On a downward drag past the threshold (or with
 * sufficient velocity) we call `onClose`. Otherwise we spring back.
 *
 * Upward drags are damped (elastic resistance) so the sheet doesn't
 * get yanked above its anchor, matching the native iOS feel.
 */
export function useSheetDrag(opts: {
  onClose: () => void;
  threshold?: number;            // min px to count as dismiss (default 90)
  velocityThreshold?: number;    // px/ms for flick (default 0.6)
}) {
  const { onClose, threshold = 90, velocityThreshold = 0.6 } = opts;
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startT = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const capturedId = useRef<number | null>(null);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    // Only track primary pointer
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startY.current = e.clientY;
    startT.current = performance.now();
    lastY.current = e.clientY;
    lastT.current = startT.current;
    capturedId.current = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) return;
    const raw = e.clientY - startY.current;
    // Elastic resistance on upward drag so the sheet doesn't shoot up.
    const adjusted = raw < 0 ? raw / 4 : raw;
    setDy(adjusted);
    lastY.current = e.clientY;
    lastT.current = performance.now();
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (capturedId.current !== e.pointerId) return;
    const distance = lastY.current - startY.current;
    const duration = Math.max(1, lastT.current - startT.current);
    const velocity = distance / duration;   // px/ms
    capturedId.current = null;
    setDragging(false);
    if (distance >= threshold || velocity >= velocityThreshold) {
      // Animate off-screen, then fire onClose.
      setDy(window.innerHeight);
      setTimeout(() => {
        onClose();
        setDy(0);
      }, 180);
    } else {
      // Snap back.
      setDy(0);
    }
  }, [onClose, threshold, velocityThreshold]);

  const sheetStyle: CSSProperties = {
    transform: `translateY(${dy}px)`,
    transition: dragging ? "none" : "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const dragProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    style: { touchAction: "none" as const, cursor: dragging ? "grabbing" : "grab" },
  };

  return { dragProps, sheetStyle, dragging };
}
