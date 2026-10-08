/**
 * Static fallback for `dgp-sampler`: the same scatter, true line, and OLS
 * line as the live widget, as plain SVG markup rendered at build time by
 * `Widget.astro` for no-JS, print, and the moment before hydration. Colors
 * are token references so it follows the theme like everything else.
 */
import { createSeededRandom } from '../_shared/seeded-random';
import type { Params } from './manifest';
import { olsFit, sampleDgp, standardDraws, X_HALF, yHalfRange, type Dgp } from './math';

const W = 480;
const H = 300;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const dgp: Dgp = { alpha: p.alpha, beta: p.beta, sigmaX: p.sigmaX, sigmaEps: p.sigmaEps };
  const yHalf = yHalfRange(dgp);
  const px = (x: number) => ((x + X_HALF) / (2 * X_HALF)) * W;
  const py = (y: number) => H - ((y + yHalf) / (2 * yHalf)) * H;

  const points = sampleDgp(dgp, standardDraws(p.n, createSeededRandom(p.seed)), p.n);
  const fit = olsFit(points);

  const line = (a: number, b: number, attrs: string) =>
    Number.isFinite(a) && Number.isFinite(b)
      ? `<line x1="0" y1="${f(py(a - b * X_HALF))}" x2="${W}" y2="${f(py(a + b * X_HALF))}" ${attrs} />`
      : '';

  const scatter = points
    .map(([x, y]) => `<circle cx="${f(px(x))}" cy="${f(py(y))}" r="3" />`)
    .join('');

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Scatter of ${points.length} draws from Y = α + βX + ε with the OLS line${p.showConditionalMean ? ' and the true line α + βx' : ''}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="var(--surface)" />` +
    `<line x1="0" y1="${f(py(0))}" x2="${W}" y2="${f(py(0))}" stroke="var(--border)" />` +
    `<line x1="${f(px(0))}" y1="0" x2="${f(px(0))}" y2="${H}" stroke="var(--border)" />` +
    `<g fill="var(--viz-1)" fill-opacity="0.6">${scatter}</g>` +
    (p.showConditionalMean
      ? line(p.alpha, p.beta, 'stroke="var(--viz-4)" stroke-width="2.5"')
      : '') +
    line(
      fit.alphaHat,
      fit.betaHat,
      'stroke="var(--viz-6)" stroke-width="2" stroke-dasharray="7 5"',
    ) +
    `</svg>`
  );
}
