/**
 * Static fallback for `generative-vs-discriminative-toggle`: the ADVERSE
 * scatter with the active model's boundary (solid, its "event" side shaded)
 * and the other model's boundary dashed, as plain SVG rendered at build time
 * by `Widget.astro` for no-JS, print, and the moment before hydration.
 * Colors are token references so it follows the theme.
 */
import type { Params } from './manifest';
import type { Vec2 } from './math';
import {
  DOMAIN,
  bayesBoundary,
  fitDiscriminative,
  fitGenerative,
  logisticBoundary,
  samplePoints,
} from './scene';

const SIZE = 360;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const px = (v: number) => ((v + DOMAIN) / (2 * DOMAIN)) * SIZE;
  const py = (v: number) => SIZE - px(v);
  const path = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${f(px(x))},${f(py(y))}`).join(' ');

  const points = samplePoints(p);
  const fit = fitGenerative(points, p.sharedCovariance);
  const bayes = bayesBoundary(fit, p.prior);
  const lr = logisticBoundary(fitDiscriminative(points));
  const generative = p.model === 'generative';
  const active = generative ? bayes : lr;
  const other = generative ? lr : bayes;
  const activeColor = generative ? 'var(--viz-boundary)' : 'var(--viz-4)';
  const otherColor = generative ? 'var(--viz-4)' : 'var(--viz-boundary)';

  const scatter = points
    .map(({ x: [x, y], y: k }) =>
      k === 1
        ? `<path d="M${f(px(x))} ${f(py(y) - 3.5)}l3.5 3.5-3.5 3.5-3.5-3.5z" fill="var(--viz-positive)" />`
        : `<circle cx="${f(px(x))}" cy="${f(py(y))}" r="2.2" fill="var(--viz-negative)" fill-opacity="0.5" />`,
    )
    .join('');
  const region =
    active.region.length > 2
      ? `<polygon points="${path(active.region)}" fill="var(--viz-positive)" fill-opacity="0.1" />`
      : '';
  const lines = (b: typeof bayes, color: string, dashed: boolean) =>
    b.polylines
      .map(
        (pl) =>
          `<polyline points="${path(pl)}" fill="none" stroke="${color}" stroke-width="${dashed ? 2 : 2.5}"${dashed ? ' stroke-dasharray="6 4"' : ''} />`,
      )
      .join('');

  const label =
    `${points.length} ADVERSE patients (${p.features[0]} against ${p.features[1]}, standardized) with the ` +
    (generative
      ? `generative model's Bayes boundary at p(y = 1) = ${p.prior.toFixed(2)}`
      : 'logistic-regression boundary') +
    (p.showOther ? ' and the other model dashed' : '');

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    region +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    scatter +
    (p.showOther ? lines(other, otherColor, true) : '') +
    lines(active, activeColor, false) +
    `</svg>`
  );
}
