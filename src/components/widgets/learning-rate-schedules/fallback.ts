/**
 * Static fallback for `learning-rate-schedules`: the distance to the minimum
 * by iteration for all four schedules (the embedding's schedule drawn bold)
 * as plain SVG, for no-JS, print, and the moment before hydration. Token
 * colors only.
 */
import type { Params } from './manifest';
import { runSchedule, SCHEDULES } from './math';

const W = 360;
const H = 220;
const PAD = 12;
const f = (v: number) => v.toFixed(1);
const COLORS = ['var(--viz-2)', 'var(--viz-1)', 'var(--viz-3)', 'var(--viz-6)'] as const;

export function renderFallback(p: Params): string {
  const T = p.steps;
  const px = (t: number) => PAD + (t / T) * (W - 2 * PAD);
  const py = (d: number) => H - PAD - (d / (1.05 * p.start)) * (H - 2 * PAD);
  const lines = SCHEDULES.map((s, k) => {
    const its = runSchedule(s, p.eta0, p.beta, p.start, T);
    const stride = Math.max(1, Math.floor(T / 120));
    const pts = its
      .filter((_, t) => t % stride === 0 || t === T)
      .map((theta, i) => `${f(px(Math.min(i * stride, T)))},${f(py(Math.abs(theta)))}`)
      .join(' ');
    const bold = s === p.schedule;
    return `<polyline points="${pts}" fill="none" stroke="${COLORS[k] ?? 'var(--viz-1)'}" stroke-width="${bold ? 3 : 1.25}" stroke-opacity="${bold ? 1 : 0.5}" />`;
  }).join('');

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Distance to the minimum over ${T} iterations for constant, inverse, inverse-square, and exponential step-size schedules, starting ${p.start} from the minimum; the ${p.schedule} schedule is bold" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="var(--surface)" />` +
    `<line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--border)" />` +
    `<line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="var(--border)" />` +
    lines +
    `</svg>`
  );
}
