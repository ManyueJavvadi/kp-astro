"use client";

/**
 * MobileAiOrb — floating round shortcut to the Analysis tab.
 *
 * Part of Phase 9.9 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑨.
 *
 * Pattern (Notion-inspired): the AI surface is a primary entry point
 * but isn't a "tab" in the traditional sense — it's a *workspace
 * companion* that should always be one tap away. Notion places "Ask"
 * as a floating round button bottom-right; we mirror that convention.
 *
 * Behavior:
 *   - Renders only on mobile.
 *   - Self-gated: hides when the user is ALREADY on the Analysis tab
 *     (no point sitting there saying "go to Analysis").
 *   - Self-gated: hides when the BottomDrawer is open (selection
 *     focus) — the drawer wants the screen for itself.
 *   - Tap → setActiveTab("analysis").
 *
 * Why a separate component (not just a chip inside MobileBottomNav):
 *   - The Notion convention is visually distinct — a round chrome
 *     surface that floats *above* the tab strip, not within it.
 *   - Keeps Analysis discoverable from every tab without consuming a
 *     primary nav slot (where it'd compete with the chart's core tabs).
 *   - In future phases we can attach long-press to open a
 *     quick-prompt sheet (e.g. "Ask about this chart…") without
 *     redesigning the bottom strip.
 *
 * Maintainability:
 *   - Position depends on MOBILE_NAV_HEIGHT exported from
 *     MobileBottomNav. If the nav height changes, this orb tracks
 *     automatically.
 *   - Visual idle = continuous gold breath via inline @keyframes
 *     (added once to globals.css under `.mobile-ai-orb` block if
 *     extracted). For now we use a hand-rolled CSS variable cycle.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import { useSelection } from "../../lib/selection";
import { useLanguage } from "@/lib/i18n";
import { MOBILE_NAV_HEIGHT } from "./MobileBottomNav";

interface MobileAiOrbProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const AI_TAB_ID = "analysis";

export default function MobileAiOrb({ activeTab, onTabChange }: MobileAiOrbProps) {
  const { lang } = useLanguage();
  const { selected } = useSelection();

  // Gating: never on the analysis tab itself, never when something is
  // selected (the drawer occupies focus).
  if (activeTab === AI_TAB_ID) return null;
  if (selected != null) return null;

  const label = lang === "en" ? "Ask AI" : "AI అడగండి";

  return (
    <button
      type="button"
      onClick={() => onTabChange(AI_TAB_ID)}
      aria-label={label}
      className="mobile-ai-orb"
      style={{
        position: "fixed",
        // 2026-05-27 — moved from right→left edge per real-device feedback
        // (was overlapping the SE chart cell where Su/Ma typically sit and
        // covering the "East" chart-style toggle). Lives above the
        // AI-calls badge in the left rail so the entire chart canvas +
        // right edge stay unobstructed.
        // 2026-05-27 (Phase 9.10f) — bumped 12→18px so the orb sits
        // clear of iOS's left-edge swipe-back gesture region (≤ ~16px
        // from edge tends to compete with the navigation gesture).
        left: 18,
        // Sits above the AI-calls badge (which is itself lifted above
        // the bottom nav via CSS). Stack order, bottom→top:
        //   bottom nav → AI-calls badge → MobileAiOrb.
        bottom: `calc(${MOBILE_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0) + 48px)`,
        zIndex: 53,
        // Shrunk 52→44 so the floating control feels lighter against
        // dense chart content.
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "0.5px solid rgba(201, 169, 110, 0.5)",
        background:
          "radial-gradient(circle at 30% 30%, rgba(232, 201, 138, 0.95), rgba(201, 169, 110, 0.85) 70%, rgba(140, 110, 60, 0.92))",
        color: "#1a1410",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          "0 6px 22px rgba(201, 169, 110, 0.35), 0 0 0 4px rgba(201, 169, 110, 0.08)",
        cursor: "pointer",
        transition: "transform 160ms ease-out, box-shadow 160ms",
        animation: "mobile-ai-orb-breath 4.4s ease-in-out infinite",
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <Sparkles size={19} strokeWidth={2} />
    </button>
  );
}
