/**
 * Geometry of the targets-vs-predictions chart, shared by the live widget
 * (React draws it) and the static fallback (an SVG string). Pure: positions
 * in a fixed viewBox, no colors.
 */

export const CHART = { width: 320, height: 180, left: 28, right: 8, top: 10, bottom: 26 };
/** The y axis spans the targets' range, 0–10. */
export const Y_MAX = 10;

export interface ChartBar {
  k: number;
  label: string;
  /** Band center. */
  cx: number;
  /** Bar (fitted ŷ) rectangle, clamped to the axis range. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Target dot. */
  ty: number;
  /** ŷ outside [0, 10]: an arrow marks the clamp. */
  clipped: 'above' | 'below' | null;
}

export function yToPx(v: number): number {
  const inner = CHART.height - CHART.top - CHART.bottom;
  const clamped = Math.max(0, Math.min(Y_MAX, v));
  return CHART.top + inner * (1 - clamped / Y_MAX);
}

export function chartBars(
  categories: readonly string[],
  targets: readonly number[],
  fitted: readonly number[],
): ChartBar[] {
  const K = categories.length;
  const inner = CHART.width - CHART.left - CHART.right;
  const band = inner / Math.max(K, 1);
  const baseline = yToPx(0);
  return categories.map((label, k) => {
    const cx = CHART.left + band * (k + 0.5);
    const f = fitted[k] ?? 0;
    const top = yToPx(f);
    const width = Math.min(band * 0.56, 36);
    return {
      k,
      label,
      cx,
      x: cx - width / 2,
      y: Math.min(top, baseline),
      width,
      height: Math.abs(baseline - top),
      ty: yToPx(targets[k] ?? 0),
      clipped: f > Y_MAX + 1e-9 ? 'above' : f < -1e-9 ? 'below' : null,
    };
  });
}

/** Horizontal gridlines at 0, 2, …, 10. */
export function gridTicks(): { v: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => ({ v: 2 * i, y: yToPx(2 * i) }));
}
