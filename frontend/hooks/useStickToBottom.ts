"use client";

/**
 * useStickToBottom — chat scroll that follows the stream WITHOUT fighting
 * the reader.
 *
 * THE BUG THIS REPLACES (2026-08-01)
 * ----------------------------------
 * page.tsx did:
 *
 *     useEffect(() => {
 *       chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
 *     }, [analysisMessages]);
 *
 * `analysisMessages` mutates on EVERY SSE chunk while an answer streams,
 * so this fired dozens of times a second, each time launching a *smooth*
 * scroll animation. The animations queued and fought each other, and —
 * critically — there was no check for whether the user had scrolled up to
 * read. Scroll up mid-answer on a phone and the next chunk (~50ms later)
 * yanked you straight back to the bottom. The app was effectively
 * unreadable while streaming, which is exactly what users reported.
 *
 * THE BEHAVIOUR THIS IMPLEMENTS (standard chat "stick to bottom")
 * --------------------------------------------------------------
 *   - If the reader is at/near the bottom, follow new content.
 *   - The moment they scroll up, STOP following — they are reading.
 *   - When they scroll back down to the bottom, resume following.
 *   - Scroll instantly (`scrollTop = scrollHeight`), never `behavior:
 *     "smooth"` — smooth animations queue and stack under a stream.
 *   - Coalesce to one scroll per animation frame, not one per chunk.
 *
 * Takes the END-MARKER ref (the existing `chatEndRef` / `messagesEndRef`)
 * and finds its scrollable ancestor itself, so no call site has to be
 * rewired to expose its container.
 */

import { useEffect, useRef, type RefObject } from "react";

/** Nearest ancestor that actually scrolls vertically. */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const oy = window.getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function useStickToBottom(
  endRef: RefObject<HTMLElement | null>,
  dep: unknown,
  { threshold = 120 }: { threshold?: number } = {},
) {
  // Whether we should currently follow new content. Starts true so the
  // first answer scrolls into view; flips false as soon as the reader
  // scrolls away from the bottom.
  const stick = useRef(true);
  const raf = useRef<number | null>(null);
  const container = useRef<HTMLElement | null>(null);

  // Track the reader's intent.
  useEffect(() => {
    const el = getScrollParent(endRef.current);
    container.current = el;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stick.current = distanceFromBottom <= threshold;
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // Re-resolve when the dep changes: the container may not exist on the
    // first render (empty chat) and appears once messages do.
  }, [endRef, dep, threshold]);

  // Follow the stream, but only while the reader is at the bottom.
  useEffect(() => {
    if (!stick.current) return;
    const el = container.current ?? getScrollParent(endRef.current);
    if (!el) return;

    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      // Instant, not smooth — one assignment, nothing to queue.
      el.scrollTop = el.scrollHeight;
      raf.current = null;
    });

    return () => {
      if (raf.current !== null) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };
  }, [dep, endRef]);
}

export default useStickToBottom;
