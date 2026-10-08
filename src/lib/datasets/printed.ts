/**
 * "Reproduce the companion's numbers to the printed precision" (STYLE_GUIDE
 * §3), made exact. A notebook prints a float either rounded (`%.6f`, numpy's
 * eight decimals) or as Python's shortest round-trip `repr` (16–17
 * significant digits, i.e. the float64 itself).
 *
 * - Rounded prints: agreement means |actual − printed| ≤ half a unit in the
 *   last printed decimal place.
 * - Full `repr` prints (15 or more significant digits): the digits are the
 *   float64, and two correct implementations that sum in a different order
 *   differ in the last binary digit or two. Agreement means within 2 ulp of
 *   the printed value (relative error below 5e-16).
 */

/** Unit in the last place of a finite float64. */
export function ulp(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const exponent = Math.floor(Math.log2(a));
  // log2 can be off by one at exact powers of two; correct it.
  const e = 2 ** exponent > a ? exponent - 1 : 2 ** (exponent + 1) <= a ? exponent + 1 : exponent;
  return 2 ** (e - 52);
}

function significantDigits(printed: string): number {
  const mantissa = printed.replace(/^[-+]/, '').split(/e/i)[0] ?? '';
  return mantissa.replace('.', '').replace(/^0+/, '').length;
}

/** The largest |actual − printed| that still counts as agreeing with `printed`. */
export function printedTolerance(printed: string): number {
  const value = Number(printed);
  if (!Number.isFinite(value)) throw new Error(`not a printed number: ${printed}`);
  if (significantDigits(printed) >= 15) return 2 * ulp(value);
  const dot = printed.indexOf('.');
  const decimals = dot === -1 ? 0 : printed.length - dot - 1;
  return 0.5 * 10 ** -decimals;
}

/** True when `actual` agrees with the printed string to its printed precision. */
export function agreesWithPrinted(actual: number, printed: string): boolean {
  return Math.abs(actual - Number(printed)) <= printedTolerance(printed);
}
