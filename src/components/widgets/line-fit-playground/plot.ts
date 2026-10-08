/**
 * Tiny plotting helpers shared by `line-fit-playground` and `mse-bowl-gd`
 * (and their static fallbacks): linear scales, "nice" ticks, and SVG path
 * strings. Pure; no React, no DOM ("D3 computes, React draws" without
 * pulling in d3-scale for two linear maps).
 */

export interface Scale {
  (v: number): number;
  domain: readonly [number, number];
  range: readonly [number, number];
  invert(p: number): number;
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const f = ((v: number) => r0 + (v - d0) * k) as Scale;
  f.domain = domain;
  f.range = range;
  f.invert = (p: number) => (k === 0 ? d0 : d0 + (p - r0) / k);
  return f;
}

/** Step of 1, 2, or 5 × 10^k giving about `count` intervals over [min, max]. */
export function niceStep(min: number, max: number, count: number): number {
  const span = Math.abs(max - min);
  if (!(span > 0) || !(count > 0)) return 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const m = raw / power;
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return nice * power;
}

/** Tick values: multiples of `niceStep` inside [min, max]. */
export function ticks(min: number, max: number, count: number): number[] {
  const step = niceStep(min, max, count);
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const out: number[] = [];
  const start = Math.ceil(lo / step - 1e-9);
  for (let i = start; i * step <= hi + step * 1e-9; i += 1) {
    const v = i * step;
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

/** Tick label with as many decimals as the step needs, and a true minus sign. */
export function formatTick(v: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return minus(v.toFixed(decimals));
}

/** Replace a leading hyphen-minus with U+2212 for display. */
export function minus(text: string): string {
  return text.replace(/^-/, '−');
}

/** Fixed decimals for display, with U+2212 and no "−0.00". */
export function fixed(v: number, decimals: number): string {
  const text = v.toFixed(decimals);
  return Number(text) === 0 ? (0).toFixed(decimals) : minus(text);
}

/** `M x y L x y …` with one decimal (sub-pixel precision is invisible). */
export function pathData(points: readonly (readonly [number, number])[], close = false): string {
  if (points.length === 0) return '';
  const parts = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  return parts.join('') + (close ? 'Z' : '');
}

/**
 * Drop points closer than `minDistance` pixels to the last kept point (the
 * first and last are always kept), so a 10,000-step path draws as a few
 * hundred segments.
 */
export function thinPolyline(
  points: readonly (readonly [number, number])[],
  minDistance: number,
): [number, number][] {
  const out: [number, number][] = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const p = points[i] as readonly [number, number];
    const last = out[out.length - 1];
    if (!last || i === n - 1 || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDistance) {
      out.push([p[0], p[1]]);
    }
  }
  return out;
}
