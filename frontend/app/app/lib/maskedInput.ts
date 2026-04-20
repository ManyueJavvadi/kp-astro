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

/** DD/MM/YYYY mask. */
export function formatMaskedDate(val: string, oldVal: string): string {
  const isShortening = val.length < oldVal.length;
  const digits = val.replace(/\D/g, "").slice(0, 8);

  // Clamp day + month values as the user types.
  let dd = digits.slice(0, 2);
  let mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (dd.length === 2) dd = String(Math.min(31, Math.max(1, parseInt(dd) || 1))).padStart(2, "0");
  if (mm.length === 2) mm = String(Math.min(12, Math.max(1, parseInt(mm) || 1))).padStart(2, "0");

  // Assemble with separators, but only append trailing "/" while typing,
  // never while shortening — that's what lets backspace work.
  let out = dd;
  if (digits.length > 2 || (digits.length === 2 && !isShortening)) out += "/";
  if (digits.length > 2) out += mm;
  if (digits.length > 4 || (digits.length === 4 && !isShortening)) out += "/";
  if (digits.length > 4) out += yyyy;
  return out.slice(0, 10);
}

/** HH:MM mask (12-hour, 01–12). */
export function formatMaskedTime(val: string, oldVal: string): string {
  const isShortening = val.length < oldVal.length;
  const digits = val.replace(/\D/g, "").slice(0, 4);

  let hh = digits.slice(0, 2);
  let mins = digits.slice(2, 4);
  if (hh.length === 2) hh = String(Math.min(12, Math.max(1, parseInt(hh) || 1))).padStart(2, "0");
  if (mins.length === 2) mins = String(Math.min(59, parseInt(mins) || 0)).padStart(2, "0");

  let out = hh;
  if (digits.length > 2 || (digits.length === 2 && !isShortening)) out += ":";
  if (digits.length > 2) out += mins;
  return out.slice(0, 5);
}
