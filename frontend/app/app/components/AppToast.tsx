"use client";

/**
 * AppToast — the missing toast renderer.
 *
 * Phase 9.10f — page.tsx has been calling setToast() in 9 places
 * (PDF failures, time-shift errors, workspace fetch fails, validation)
 * since long before mobile, but no JSX ever rendered the state. Every
 * one of those errors was silently swallowed for users — the auto-
 * dismiss timer ran without anything appearing on screen.
 *
 * This component closes that gap. It mounts at the root of page.tsx,
 * reads the same toast state, and renders a single floating toast at
 * the bottom of the screen (above the mobile bottom nav, below the
 * BottomDrawer + modals).
 *
 * Behavior:
 *   - Slides in from below, sits 12px above the bottom safe-area
 *     (or 12px above the mobile nav on phones).
 *   - Auto-dismisses on the 5-s timer already running in page.tsx
 *     (we don't own dismissal — just rendering).
 *   - Tap × to dismiss early.
 *   - tone="error"  → red border + red icon
 *   - tone="info"   → gold border + accent icon  (default)
 *
 * Maintainability:
 *   - Stateless: state is owned by page.tsx, passed in as props.
 *   - One render, no portal — sits at z-index 70 (above pin tray 55,
 *     above bottom drawer 60, below modals 200).
 */

import React from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export interface ToastShape {
  msg: string;
  tone?: "error" | "info";
}

interface AppToastProps {
  toast: ToastShape | null;
  onClose: () => void;
}

export default function AppToast({ toast, onClose }: AppToastProps) {
  if (!toast) return null;

  const isError = toast.tone === "error";
  const Icon = isError ? AlertTriangle : CheckCircle2;
  const accentColor = isError ? "#f87171" : "#c9a96e";
  const accentBg = isError ? "rgba(248, 113, 113, 0.08)" : "rgba(201, 169, 110, 0.08)";
  const accentBorder = isError ? "rgba(248, 113, 113, 0.45)" : "rgba(201, 169, 110, 0.45)";

  return (
    <div
      role="status"
      aria-live="polite"
      className="app-toast"
      style={{
        position: "fixed",
        left: "50%",
        // 12px above bottom safe-area on desktop; the mobile rule in
        // globals.css lifts it above the bottom nav strip.
        bottom: "calc(env(safe-area-inset-bottom, 0) + 12px)",
        transform: "translateX(-50%)",
        zIndex: 70,
        maxWidth: "min(560px, calc(100vw - 24px))",
        minWidth: 220,
        padding: "12px 14px",
        background: "rgba(13, 13, 22, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${accentBorder}`,
        borderRadius: 12,
        boxShadow: `0 10px 28px rgba(0,0,0,0.5), 0 0 0 1px ${accentBorder}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        color: "var(--text)",
        fontSize: 13,
        lineHeight: 1.5,
        animation: "app-toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          width: 24, height: 24, borderRadius: 999,
          background: accentBg,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}
      >
        <Icon size={14} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        {toast.msg}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        style={{
          width: 28, height: 28, padding: 0,
          border: "none", background: "transparent",
          color: "var(--muted)", cursor: "pointer",
          borderRadius: 6,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
