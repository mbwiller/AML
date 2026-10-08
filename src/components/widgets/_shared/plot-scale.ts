/**
 * Tiny, framework-free helpers for widgets that draw their own SVG charts
 * (axes with titles, several panels) rather than a Mafs plane: a linear
 * scale, "nice" tick values, and polyline path strings. Used both by React
 * widgets and by the build-time static fallbacks, so the two agree.
 */

export interface Frame {
  /** viewBox width and height. */
  width: number;
  height: number;
  /** Inner margins in viewBox units. */
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface Scale {
  (v: number): number;
  domain: readonly [number, number];
  range: readonly [number, number];
  invert(px: number): number;
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const s = ((v: number) => r0 + (v - d0) * k) as Scale;
  s.domain = domain;
  s.range = range;
  s.invert = (px: number) => d0 + (px - r0) / k;
  return s;
}

/** x and y scales for a frame: x left → right, y bottom → top. */
export function frameScales(
  frame: Frame,
  x: readonly [number, number],
  y: readonly [number, number],
): { x: Scale; y: Scale } {
  const { width, height, margin } = frame;
  return {
    x: linearScale(x, [margin.left, width - margin.right]),
    y: linearScale(y, [height - margin.bottom, margin.top]),
  };
}

/** Tick values from lo to hi (inclusive) at multiples of `step`. */
export function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const start = Math.ceil(lo / step - 1e-9) * step;
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/**
 * An SVG path through the points, split into separate sub-paths wherever a
 * value is not finite or falls outside [yMin, yMax] in data units (so a
 * curve leaving the panel is clipped rather than drawn across the margin).
 */
export function polylinePath(
  points: readonly (readonly [number, number])[],
  x: Scale,
  y: Scale,
): string {
  const [ya, yb] = y.domain;
  const lo = Math.min(ya, yb);
  const hi = Math.max(ya, yb);
  let d = '';
  let pen = false;
  for (const [px, py] of points) {
    if (!Number.isFinite(py) || py < lo || py > hi) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${x(px).toFixed(1)} ${y(py).toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** Sample f on [a, b] at `count` + 1 evenly spaced points. */
export function sampleCurve(
  f: (v: number) => number,
  a: number,
  b: number,
  count = 120,
): [number, number][] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const v = a + ((b - a) * i) / count;
    return [v, f(v)] as [number, number];
  });
}

/** A number for a readout: a true minus sign, fixed decimals, no "−0.00". */
export function formatNumber(v: number, decimals = 2): string {
  const s = v.toFixed(decimals);
  if (Number(s) === 0) return (0).toFixed(decimals);
  return s.replace('-', '−');
}
