/**
 * PR22 — shared helpers for masked date + time inputs.
 *
 * Problem: previous handlers appended the separator ("/" or ":") as soon
 * as the digit count reached 2/4. On backspace, the browser strips the
 * separator, our handler re-strips non-digits, sees 2 digits, appends
 * the separator again — the input appears frozen.
 *
 * Fix: compare new length to old. When the user is deleting, do NOT
 * append a trailing separator. Only append it when actively typing more
 * digits. Lets backspace work naturally across the separator boundary.
 */

/**
 * When the user types a separator manually (e.g. typing "8" then ":")
 * we want to interpret that as "I'm done with this field" and left-pad
 * the previous section with a leading zero. Without this, the helper
 * strips the separator, stays at "8", then clamps "83" to "12" once
 * the user types the next digit.
 *
 * Returns the expanded digit string to continue formatting from, OR
 * null if no left-pad is needed.
 */
function padOnManualSeparator(val: string, oldVal: string, seps: string[]): string | null {
  if (val.length <= oldVal.length) return null;        // not a typing event
  const addedChar = val[val.length - 1] ?? "";
  if (!seps.includes(addedChar)) return null;          // didn't type a separator
  // Count digits BEFORE the typed separator.
  const before = val.slice(0, -1).replace(/\D/g, "");
  // Pad lone-digit groups (1st group length 1 → pad to 2; after first
  // separator, digits 3 means second group length 1 → pad).
  if (before.length === 1) return "0" + before;
  if (before.length === 3) return before.slice(0, 2) + "0" + before.slice(2);
  return null;
}

/** DD/MM/YYYY mask. */
export function formatMaskedDate(val: string, oldVal: string): string {
  const isShortening = val.length < oldVal.length;
  const padded = padOnManualSeparator(val, oldVal, ["/", "-", "."]);
  const rawDigits = padded ?? val.replace(/\D/g, "");
  const digits = rawDigits.slice(0, 8);

  // Clamp day + month values as the user types.
  let dd = digits.slice(0, 2);
  let mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (dd.length === 2) dd = String(Math.min(31, Math.max(1, parseInt(dd) || 1))).padStart(2, "0");
  if (mm.length === 2) mm = String(Math.min(12, Math.max(1, parseInt(mm) || 1))).padStart(2, "0");

  // Assemble with separators.
  // - If user just typed a manual separator, always append it (padded
  //   case: digits now has length 2 or 4 and the user's intent is clear).
  // - Otherwise only add trailing "/" while actively typing more digits.
  const forceSep = padded !== null;
  let out = dd;
  if (digits.length > 2 || (digits.length === 2 && (!isShortening || forceSep))) out += "/";
  if (digits.length > 2) out += mm;
  if (digits.length > 4 || (digits.length === 4 && (!isShortening || forceSep))) out += "/";
  if (digits.length > 4) out += yyyy;
  return out.slice(0, 10);
}

/** HH:MM mask (12-hour, 01–12). */
export function formatMaskedTime(val: string, oldVal: string): string {
  const isShortening = val.length < oldVal.length;
  const padded = padOnManualSeparator(val, oldVal, [":", ".", " "]);
  const rawDigits = padded ?? val.replace(/\D/g, "");
  const digits = rawDigits.slice(0, 4);

  let hh = digits.slice(0, 2);
  let mins = digits.slice(2, 4);
  if (hh.length === 2) hh = String(Math.min(12, Math.max(1, parseInt(hh) || 1))).padStart(2, "0");
  if (mins.length === 2) mins = String(Math.min(59, parseInt(mins) || 0)).padStart(2, "0");

  const forceSep = padded !== null;
  let out = hh;
  if (digits.length > 2 || (digits.length === 2 && (!isShortening || forceSep))) out += ":";
  if (digits.length > 2) out += mins;
  return out.slice(0, 5);
}
