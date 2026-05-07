/**
 * Phase 1 / PR 1 — Canonical date / time / dasha / coords formatter.
 *
 * Why this module exists:
 *   The stress test on 2026-05-06 caught the product mixing date and
 *   time conventions across tabs:
 *     - dasha periods rendered as "2039-02"
 *     - tithi/yoga timestamps as "11:59:09" (seconds — not actionable)
 *     - choghadiya/hora as "08:52–09:56" (good)
 *     - birth time as "12:31 PM" (12h)
 *     - dates split between "09/09/2000", "2026-05-07", "Thursday, May 7, 2026"
 *
 *   Inconsistencies look careless. This module is the single source of
 *   truth so every surface speaks the same dialect. Phase-2/3/4/5 PRs
 *   will swap their inline formatters for these helpers — this PR only
 *   ships the module + a couple of demo wirings, no behavior change yet.
 *
 * Design rules:
 *   1. Dates default to "DD MMM YYYY" (09 Sep 2000) — unambiguous worldwide,
 *      readable to both Indian and Western users.
 *   2. Times default to "HH:MM" 24h — never seconds in user-facing copy.
 *      Use `withSeconds: true` only inside debug surfaces.
 *   3. Dasha periods compress YYYY-MM ranges to "Feb 2039 – Jan 2046".
 *   4. Coordinates render with directional letters (N/S/E/W), 2dp.
 *   5. All helpers accept `Date | string | null | undefined` and return
 *      a string. They never throw.
 */

export type DateStyle = "short" | "long" | "iso";
export type TimeOpts = { ampm?: boolean; seconds?: boolean };

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // String — try ISO first, then "DD/MM/YYYY", then native Date parse.
  const s = value.trim();
  if (!s) return null;
  // YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY (accept also DD-MM-YYYY)
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * formatDate — canonical date renderer.
 *   short  → "09 Sep 2000"   (default, recommended for user copy)
 *   long   → "Saturday, 9 September 2000"
 *   iso    → "2000-09-09"    (machine-friendly, never user-facing)
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  style: DateStyle = "short",
): string {
  const d = toDate(value);
  if (!d) return "";
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  if (style === "iso") return `${y}-${pad2(m + 1)}-${pad2(day)}`;
  if (style === "long") {
    return `${WEEKDAY_LONG[d.getDay()]}, ${day} ${MONTH_LONG[m]} ${y}`;
  }
  return `${pad2(day)} ${MONTH_SHORT[m]} ${y}`;
}

/**
 * formatTime — canonical time renderer.
 *   default          → "12:31"        (24h, no seconds — recommended)
 *   { ampm: true }   → "12:31 PM"     (consumer-friendly)
 *   { seconds:true } → "12:31:09"     (debug only)
 *
 * Accepts Date OR a "HH:MM:SS" / "HH:MM" string and strips seconds
 * by default — useful for backend payloads that include `:SS`.
 */
export function formatTime(
  value: Date | string | number | null | undefined,
  opts: TimeOpts = {},
): string {
  const { ampm = false, seconds = false } = opts;
  // String shortcut: if it's already an HH:MM(:SS) time string, format
  // without round-tripping through Date (avoids timezone surprises).
  if (typeof value === "string") {
    const m = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = m[3] ? parseInt(m[3], 10) : 0;
      if (ampm) {
        const period = hh >= 12 ? "PM" : "AM";
        hh = hh % 12 || 12;
        return seconds
          ? `${hh}:${pad2(mm)}:${pad2(ss)} ${period}`
          : `${hh}:${pad2(mm)} ${period}`;
      }
      return seconds ? `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}` : `${pad2(hh)}:${pad2(mm)}`;
    }
  }
  const d = toDate(value);
  if (!d) return "";
  let hh = d.getHours();
  const mm = d.getMinutes();
  const ss = d.getSeconds();
  if (ampm) {
    const period = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    return seconds
      ? `${hh}:${pad2(mm)}:${pad2(ss)} ${period}`
      : `${hh}:${pad2(mm)} ${period}`;
  }
  return seconds ? `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}` : `${pad2(hh)}:${pad2(mm)}`;
}

/**
 * formatTimeRange — "08:52–09:56" (en-dash, not hyphen).
 *   Both endpoints use formatTime with the same options.
 *   Accepts Date OR HH:MM strings.
 */
export function formatTimeRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  opts: TimeOpts = {},
): string {
  const a = formatTime(start, opts);
  const b = formatTime(end, opts);
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a}–${b}`;
}

/**
 * formatDateTime — combined date + time.
 *   default → "09 Sep 2000 · 12:31 PM"
 */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  opts: { style?: DateStyle; time?: TimeOpts } = {},
): string {
  const date = formatDate(value, opts.style ?? "short");
  const time = formatTime(value, opts.time ?? { ampm: true });
  if (!date && !time) return "";
  if (!date) return time;
  if (!time) return date;
  return `${date} · ${time}`;
}

/**
 * formatDashaPeriod — "Feb 2039 – Jan 2046" given two ISO/Date endpoints.
 *   - If only `start` is given: "Feb 2039 – present"
 *   - Same year, same month: "Feb 2039"
 *   - Same year, different months: "Feb–Aug 2039"
 *   - Different years: "Feb 2039 – Jan 2046"
 */
export function formatDashaPeriod(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  const a = toDate(start);
  const b = toDate(end);
  if (!a && !b) return "";
  if (a && !b) return `${MONTH_SHORT[a.getMonth()]} ${a.getFullYear()} – present`;
  if (!a && b) return `${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  // Both present.
  const am = MONTH_SHORT[a!.getMonth()];
  const ay = a!.getFullYear();
  const bm = MONTH_SHORT[b!.getMonth()];
  const by = b!.getFullYear();
  if (ay === by && am === bm) return `${am} ${ay}`;
  if (ay === by) return `${am}–${bm} ${ay}`;
  return `${am} ${ay} – ${bm} ${by}`;
}

/**
 * formatRemainingYears — "5.2 yrs left of 18" / "18 yrs total".
 *   Used by dasha summary chips.
 */
export function formatRemainingYears(
  remainingYears: number | null | undefined,
  totalYears: number | null | undefined,
): string {
  if (remainingYears == null && totalYears == null) return "";
  const fmt = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toString());
  if (remainingYears == null) return `${fmt(totalYears!)} yrs`;
  if (totalYears == null) return `${fmt(remainingYears)} yrs left`;
  return `${fmt(remainingYears)} yrs left of ${fmt(totalYears)}`;
}

/**
 * formatCoords — "17.39°N, 80.65°E" given signed lat/lon.
 *   Round to 2dp by default. Suppresses the chip entirely if both null.
 */
export function formatCoords(
  lat: number | null | undefined,
  lon: number | null | undefined,
  precision: number = 2,
): string {
  if (lat == null || lon == null) return "";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(precision)}°${ns}, ${Math.abs(lon).toFixed(precision)}°${ew}`;
}

/**
 * stripSeconds — small helper for backend strings that include :SS.
 *   "11:59:09"      → "11:59"
 *   "08:52:00 IST"  → "08:52 IST"
 *   "08:52"         → "08:52"
 */
export function stripSeconds(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/(\d{1,2}:\d{2}):\d{2}/g, "$1");
}

/**
 * formatTimezoneOffset — "+05:30" / "-04:00" given a numeric offset (hours).
 */
export function formatTimezoneOffset(hours: number | null | undefined): string {
  if (hours == null) return "";
  const sign = hours >= 0 ? "+" : "-";
  const abs = Math.abs(hours);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  return `${sign}${pad2(hh)}:${pad2(mm)}`;
}
