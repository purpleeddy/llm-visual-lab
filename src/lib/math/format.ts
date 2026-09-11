/**
 * Printing numbers.
 * Fixed decimal places, so neither the digits nor the column width jump about
 * while a value is being changed.
 */

/**
 * The minus sign used on screen.
 * An ASCII hyphen (-) is too short to read as a minus in front of a number.
 * Screens get U+2212; `<input type="number">` gets ASCII, via fmtInput.
 */
const MINUS = '−';

function withTypographicMinus(text: string): string {
  return text.startsWith('-') ? MINUS + text.slice(1) : text;
}

/** Fixed decimal places. Negative zero is written as zero. */
export function fmt(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) {
    return value > 0 ? '+∞' : `${MINUS}∞`;
  }
  const rounded = Number(value.toFixed(decimals));
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return withTypographicMinus(safe.toFixed(decimals));
}

/** An integer stays an integer, anything else gets fixed places. For display. */
export function fmtCompact(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return value > 0 ? '+∞' : `${MINUS}∞`;
  if (Number.isInteger(value)) return withTypographicMinus(String(value));
  return fmt(value, decimals);
}

/**
 * The string to put in the value of an `<input type="number">`.
 * It has to be an ASCII hyphen here: U+2212 is not a valid number, and the
 * browser responds by blanking the field.
 */
export function fmtInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(value);
}

/** A fraction as a percentage, for the labels on the probability bars. */
export function fmtPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${withTypographicMinus((value * 100).toFixed(decimals))}%`;
}

/**
 * Maps a probability in 0..1 onto heatmap steps 0..6.
 * The number is always printed alongside, so colour is never the only cue.
 */
export function heatLevel(p: number): number {
  if (!Number.isFinite(p) || p <= 0) return 0;
  if (p < 0.05) return 1;
  if (p < 0.15) return 2;
  if (p < 0.3) return 3;
  if (p < 0.5) return 4;
  if (p < 0.75) return 5;
  return 6;
}

/** Parses a typed string. An empty or malformed field gives null. */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '−') return null;
  const normalized = trimmed.replace('−', '-');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
