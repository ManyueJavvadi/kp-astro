/**
 * Planet palette — single source of truth for planet colors + glyphs.
 *
 * Every tab (Chart, Houses, Dasha, Analysis, Horary, Muhurtha, Match,
 * Transit) MUST render planets using these constants. Users learn the
 * color association over time (Saturn = slate, Jupiter = yellow, etc.)
 * which is a durable UX moat — once learned, information density goes
 * up without text.
 *
 * These are traditional Vedic associations, not arbitrary choices —
 * don't tweak unless you have a KP-school reason.
 *
 * Originally split across:
 *   app/app/components/constants.ts        (colors)
 *   app/app/types/workspace.ts             (symbols)
 * Both now re-export from here for backwards compatibility.
 */

export const PLANET_COLORS: Record<string, string> = {
  Sun:     "#F59E0B", // amber / gold
  Moon:    "#93C5FD", // soft blue
  Mars:    "#EF4444", // red
  Mercury: "#34D399", // green
  Jupiter: "#FBBF24", // yellow
  Venus:   "#F472B6", // pink
  Saturn:  "#94A3B8", // slate grey
  Rahu:    "#A78BFA", // purple (shadow node — north)
  Ketu:    "#FB923C", // orange (shadow node — south)
};

export const PLANET_GLYPHS: Record<string, string> = {
  Sun:     "\u2609", // ☉
  Moon:    "\u263D", // ☽
  Mars:    "\u2642", // ♂
  Mercury: "\u263F", // ☿
  Jupiter: "\u2643", // ♃
  Venus:   "\u2640", // ♀
  Saturn:  "\u2644", // ♄
  Rahu:    "\u260A", // ☊ (ascending node)
  Ketu:    "\u260B", // ☋ (descending node)
};

/** Legacy alias — same data, kept so existing workspace imports keep working. */
export const PLANET_SYMBOLS = PLANET_GLYPHS;

/** Short English planet codes (for compact chips). */
export const PLANET_SHORT: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
  Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

/** Safe look-ups with sensible fallbacks. */
export function planetColor(name: string | undefined | null): string {
  if (!name) return "#888899";
  return PLANET_COLORS[name] ?? "#888899";
}
export function planetGlyph(name: string | undefined | null): string {
  if (!name) return "?";
  return PLANET_GLYPHS[name] ?? name[0];
}
export function planetShort(name: string | undefined | null): string {
  if (!name) return "?";
  return PLANET_SHORT[name] ?? name.slice(0, 2);
}

/** Hex + alpha → rgba helper (small, no color-lib dep). */
export function planetRgba(name: string | undefined | null, alpha: number): string {
  const hex = planetColor(name);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
