"use client";

/**
 * WorkspaceContext — shared workspace state lifted out of /app/page.tsx.
 *
 * Why this exists (2026-06-01):
 *   The route segment refactor (each tab gets its own URL like /app/chart,
 *   /app/horary) needs shared state to survive navigation between segments.
 *   page.tsx was holding ALL state including ~15 truly-global pieces used
 *   across multiple tabs. Those get lifted here.
 *
 *   Tab-LOCAL state (matchResults, horaryResult, mResults, pcData, etc.)
 *   moves into the respective tab component file, NOT into this context.
 *   This Context only holds what genuinely needs to be shared.
 *
 * ADR alignment (.claude/research/architecture-decisions-2026-06-01.md):
 *   - ADR-004: Context for identity/workspace (this file), Zustand for
 *     high-frequency UI state (modal flags, mobile orb position — future),
 *     TanStack Query for server data (clients list, sessions — future,
 *     when DB persistence ships).
 *
 * What's in the Context (the truly-global set):
 *   - mode: "user" | "astrologer" — gates astrologer-only features
 *   - birthDetails: BirthDetails — the active chart's input
 *   - chartData: any — raw chart computation result (planets, cusps)
 *   - workspaceData: any — derived workspace bundle (CSL chains, dashas,
 *     panchang, etc.) returned by /astrologer/workspace
 *   - setupDone: boolean — onboarding gate; false = show OnboardingCard
 *   - savedSessions: ChartSession[] — astrologer's saved client charts
 *   - currentSessionId: string — which saved session is active
 *   - timezoneOffset/Label/Iana — birth timezone for the active chart
 *
 * What's NOT in the Context (and why):
 *   - activeTab — REPLACED by URL pathname once route segments land
 *   - tab-local state (matchResults, etc.) — belongs in tab files
 *   - shell state (sidebarOpen, modal flags, toast) — moving to a
 *     separate Zustand UI store in a later commit (ADR-004)
 *
 * Read order for future Claude sessions:
 *   1. .claude/research/architecture-decisions-2026-06-01.md (ADR-004)
 *   2. This file
 *   3. The provider in app/app/layout.tsx
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import type { BirthDetails, ChartSession } from "../types";

// ─── Type ─────────────────────────────────────────────────────────────

export interface WorkspaceContextValue {
  // Identity / mode
  mode: "user" | "astrologer";
  setMode: React.Dispatch<React.SetStateAction<"user" | "astrologer">>;

  // The active chart's input
  birthDetails: BirthDetails;
  setBirthDetails: React.Dispatch<React.SetStateAction<BirthDetails>>;

  // Computed chart + workspace bundle
  chartData: any;
  setChartData: React.Dispatch<React.SetStateAction<any>>;
  workspaceData: any;
  setWorkspaceData: React.Dispatch<React.SetStateAction<any>>;

  // Onboarding gate
  setupDone: boolean;
  setSetupDone: React.Dispatch<React.SetStateAction<boolean>>;

  // Saved sessions (astrologer mode)
  savedSessions: ChartSession[];
  setSavedSessions: React.Dispatch<React.SetStateAction<ChartSession[]>>;
  currentSessionId: string;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string>>;

  // Birth timezone for the active chart
  timezoneOffset: number;
  setTimezoneOffset: React.Dispatch<React.SetStateAction<number>>;
  timezoneLabel: string;
  setTimezoneLabel: React.Dispatch<React.SetStateAction<string>>;
  timezoneIana: string | null;
  setTimezoneIana: React.Dispatch<React.SetStateAction<string | null>>;
}

// ─── Context ──────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"user" | "astrologer">("user");
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({
    name: "",
    date: "",
    time: "",
    ampm: "AM",
    place: "",
    latitude: null,
    longitude: null,
    gender: "",
  });
  const [chartData, setChartData] = useState<any>(null);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [setupDone, setSetupDone] = useState(false);
  const [savedSessions, setSavedSessions] = useState<ChartSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [timezoneOffset, setTimezoneOffset] = useState(5.5);
  const [timezoneLabel, setTimezoneLabel] = useState("IST");
  const [timezoneIana, setTimezoneIana] = useState<string | null>(null);

  // Memoize the value object so consumers that destructure stable fields
  // don't re-render when unrelated fields change. Each useState already
  // returns a stable setter reference, so only the state values vary.
  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      setMode,
      birthDetails,
      setBirthDetails,
      chartData,
      setChartData,
      workspaceData,
      setWorkspaceData,
      setupDone,
      setSetupDone,
      savedSessions,
      setSavedSessions,
      currentSessionId,
      setCurrentSessionId,
      timezoneOffset,
      setTimezoneOffset,
      timezoneLabel,
      setTimezoneLabel,
      timezoneIana,
      setTimezoneIana,
    }),
    [
      mode,
      birthDetails,
      chartData,
      workspaceData,
      setupDone,
      savedSessions,
      currentSessionId,
      timezoneOffset,
      timezoneLabel,
      timezoneIana,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Consume the workspace context.
 *
 * Throws if called outside <WorkspaceProvider/>. That's intentional —
 * silent null returns hide bugs at integration time.
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspace() must be called inside <WorkspaceProvider/>. " +
        "Make sure the component is rendered under app/app/layout.tsx.",
    );
  }
  return ctx;
}

/**
 * Optional consumer — returns null instead of throwing.
 *
 * Use for components that may render both inside AND outside /app
 * (e.g., a shared component pulled into landing page).
 */
export function useOptionalWorkspace(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
