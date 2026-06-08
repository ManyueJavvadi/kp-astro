/**
 * EnvBanner — a tiny "STAGING" / "DEV" badge in the top-right corner of
 * every page when the build is NOT production. Added 2026-06-08 as part
 * of Step 1 (dev/prod separation playbook).
 *
 * Why: with staging.devastroai.com and devastroai.com both open in
 * adjacent browser tabs, it's painfully easy to test the wrong one,
 * commit data to the wrong DB, or panic about a "bug" that's actually
 * a stale staging deploy. A persistent visual cue removes that whole
 * class of mistake.
 *
 * Production builds (NEXT_PUBLIC_ENV=production) render nothing — the
 * banner is invisible to real users.
 *
 * No interactivity, no z-index war with modals (sits behind dialogs
 * via pointer-events: none on the wrapper). Pure CSS, no JS state.
 */

// Resolution order (first non-empty wins):
//   1. NEXT_PUBLIC_ENV       — operator-set, highest priority. Use to
//                              tag a staging or dev build explicitly.
//   2. NEXT_PUBLIC_VERCEL_ENV — Vercel auto-injects "production" /
//                              "preview" / "development" on every build.
//                              Acts as a safe fallback so the banner
//                              never accidentally shows on prod even if
//                              you forget to set NEXT_PUBLIC_ENV.
//   3. "development"         — local dev (npm run dev) without either set.
const _vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
const ENV = (
  process.env.NEXT_PUBLIC_ENV ||
  // Map Vercel's "preview" to our "staging" label so the banner reads
  // correctly on staging.devastroai.com without further config.
  (_vercelEnv === "preview" ? "staging" : _vercelEnv) ||
  "development"
).toLowerCase().trim();

const LABELS: Record<string, { text: string; bg: string; fg: string }> = {
  staging: { text: "STAGING", bg: "#f59e0b", fg: "#1c1c0e" },
  development: { text: "DEV", bg: "#60a5fa", fg: "#0c1a2e" },
  // any other value gets a neutral fallback label
  unknown: { text: ENV.toUpperCase(), bg: "#888", fg: "#111" },
};

export function EnvBanner() {
  if (ENV === "production") return null;
  const conf = LABELS[ENV] ?? LABELS.unknown;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 99999,
        pointerEvents: "none",
        padding: "4px 10px",
        background: conf.bg,
        color: conf.fg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.8,
        fontFamily: "'DM Sans', sans-serif",
        borderBottomLeftRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
    >
      {conf.text}
    </div>
  );
}
