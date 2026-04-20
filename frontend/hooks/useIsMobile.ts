"use client";
import { useEffect, useState } from "react";

/**
 * PR20 — returns true when the viewport is below the mobile breakpoint.
 * Default breakpoint 820px matches our MOBILE LAYOUT SHELL CSS block.
 * SSR-safe: returns false on the server so layouts render consistently.
 */
export function useIsMobile(breakpoint = 820): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setIsMobile(mql.matches);
    apply();
    // modern browsers
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, [breakpoint]);

  return isMobile;
}
