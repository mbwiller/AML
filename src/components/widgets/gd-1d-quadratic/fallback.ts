/**
 * Static fallback for `gd-1d-quadratic`: the parabola and the gradient-descent
 * iterates for the embedding's (a, b, c, η, θ(0)) as plain SVG, for no-JS,
 * print, and the moment before hydration. Token colors only.
 */
import type { Params } from './manifest';
import { contractionFactor, energy, gdIterates, plotWindow, regime, REGIME_LABEL } from './math';

const W = 360;
const H = 240;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const q = { a: p.a, b: p.b, c: p.c };
  const win = plotWindow(q, p.theta0);
  const px = (x: number) => ((x - win.x[0]) / (win.x[1] - win.x[0])) * W;
  const py = (y: number) => H - ((y - win.y[0]) / (win.y[1] - win.y[0])) * H;
  const clampY = (y: number) => Math.min(Math.max(py(y), -H), 2 * H);

  const curve: string[] = [];
  for (let i = 0; i <= 80; i += 1) {
    const x = win.x[0] + ((win.x[1] - win.x[0]) * i) / 80;
    curve.push(`${f(px(x))},${f(clampY(energy(q, x)))}`);
  }
  const its = gdIterates(q, p.theta0, p.eta, p.steps);
  const pts = its.map((t) => `${f(px(t))},${f(clampY(energy(q, t)))}`);
  const dots = its
    .map((t) => `<circle cx="${f(px(t))}" cy="${f(clampY(energy(q, t)))}" r="3.5" />`)
    .join('');
  const r = contractionFactor(p.a, p.eta);

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Gradient descent on the parabola E = ½·${p.a}θ² + ${p.b}θ + ${p.c} with step size ${p.eta}: contraction factor ${r.toFixed(2)}, ${REGIME_LABEL[regime(p.a, p.eta)]}" ` +
    `xmlns="http://www.w3.org/2000/svg" overflow="hidden">` +
    `<rect width="${W}" height="${H}" fill="var(--surface)" />` +
    `<polyline points="${curve.join(' ')}" fill="none" stroke="var(--viz-2)" stroke-width="2" />` +
    `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--viz-4)" stroke-width="1.5" />` +
    `<g fill="var(--viz-4)">${dots}</g>` +
    `</svg>`
  );
}
