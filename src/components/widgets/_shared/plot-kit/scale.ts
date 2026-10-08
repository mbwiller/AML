/**
 * Tiny scale and tick helpers for `MiniChart` (D3 computes, React draws; the
 * repo ships d3-random and d3-force only, so the two functions of d3-scale we
 * need live here). Pure and unit-tested in `scale.test.ts`.
 */

export type Domain = readonly [number, number];

/** Linear map from `domain` to `range`; a zero-width domain maps to the range midpoint. */
export function linearScale(domain: Domain, range: Domain): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** Base-10 log map; values ≤ 0 map to NaN (the caller breaks the line there). */
export function logScale(domain: Domain, range: Domain): (v: number) => number {
  const lin = linearScale([Math.log10(domain[0]), Math.log10(domain[1])], range);
  return (v) => (v > 0 ? lin(Math.log10(v)) : Number.NaN);
}

/** "Nice" step (1, 2, or 5 × 10^k) for about `count` ticks over [min, max]. */
export function niceStep(min: number, max: number, count: number): number {
  const span = Math.abs(max - min);
  if (span === 0 || !Number.isFinite(span)) return 1;
  const raw = span / Math.max(count, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const err = raw / power;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  return mult * power;
}

/** Ticks at multiples of a nice step inside [min, max]. */
export function linearTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const step = niceStep(lo, hi, count);
  const start = Math.ceil(lo / step - 1e-9);
  const end = Math.floor(hi / step + 1e-9);
  const ticks: number[] = [];
  for (let k = start; k <= end; k += 1) {
    const v = k * step;
    // Round away float dust (0.30000000000000004).
    ticks.push(Number(v.toPrecision(12)) || 0);
  }
  return ticks;
}

/** Powers of ten inside [min, max] (both > 0), thinned to at most `max` ticks. */
export function logTicks(min: number, max: number, maxTicks = 5): number[] {
  const lo = Math.ceil(Math.log10(min) - 1e-9);
  const hi = Math.floor(Math.log10(max) + 1e-9);
  const exps: number[] = [];
  for (let e = lo; e <= hi; e += 1) exps.push(e);
  const stride = Math.max(1, Math.ceil(exps.length / maxTicks));
  return exps.filter((e) => (e - lo) % stride === 0).map((e) => 10 ** e);
}

/** Short tick label: integers as-is, powers of ten as 10^k, else ≤3 significant digits. */
export function formatTick(v: number, log = false): string {
  if (v === 0) return '0';
  if (log) {
    const e = Math.round(Math.log10(v));
    if (e === 0) return '1';
    if (e === 1) return '10';
    return `1e${e}`;
  }
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(3)));
}
