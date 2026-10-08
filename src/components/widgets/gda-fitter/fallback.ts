/**
 * Static fallback for `gda-fitter`: the same picture as the live widget
 * (two-class scatter, fitted 1σ and 2σ ellipses, the Bayes boundary, and the
 * logistic-regression line when asked for) as plain SVG markup, rendered at
 * build time by `Widget.astro` for no-JS, print, and the moment before the
 * island hydrates. Colors are token references so it follows the theme.
 */
import { createSeededRandom } from '../_shared/seeded-random';
import { ellipsePoints } from '../gaussian-2d-covariance/math';
import { adverseProjection } from './data';
import type { Params } from './manifest';
import {
  applyEdits,
  clipLineToBox,
  fitGda,
  fitLogistic,
  gdaScore,
  linearBoundary,
  syntheticPoints,
  zeroContour,
  type Box,
  type LabeledPoint,
  type Vec2,
} from './math';

/** Plot window half-width in math units, per dataset; shared with the live widget. */
export function domainFor(dataset: Params['dataset']): number {
  return dataset === 'adverse' ? 4 : 6;
}

export function boxFor(dataset: Params['dataset']): Box {
  const d = domainFor(dataset);
  return { x: [-d, d], y: [-d, d] };
}

/** The sample for these params, before the reader's edits. */
export function samplePoints(p: Params): LabeledPoint[] {
  if (p.dataset === 'adverse') return adverseProjection(p.features, p.n, p.seed);
  return syntheticPoints(
    { n: p.n, prior: p.prior, separation: p.separation, rotation: p.rotation },
    createSeededRandom(p.seed),
  );
}

const SIZE = 360;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const D = domainFor(p.dataset);
  const box = boxFor(p.dataset);
  const px = (v: number) => ((v + D) / (2 * D)) * SIZE;
  const py = (v: number) => SIZE - px(v);
  const path = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${f(px(x))},${f(py(y))}`).join(' ');

  const points = applyEdits(samplePoints(p), p.movedPoints, p.removedPoints);
  const fit = fitGda(points, p.sharedCovariance);
  const colors = ['var(--viz-negative)', 'var(--viz-positive)'] as const;

  const scatter = points
    .map(({ x: [x, y], y: k }) =>
      k === 1
        ? `<path d="M${f(px(x))} ${f(py(y) - 3.5)}l3.5 3.5-3.5 3.5-3.5-3.5z" fill="${colors[1]}" />`
        : `<circle cx="${f(px(x))}" cy="${f(py(y))}" r="2.5" fill="${colors[0]}" />`,
    )
    .join('');

  let ellipses = '';
  if (!fit.degenerate) {
    for (const k of [0, 1] as const) {
      const { mu } = fit.classes[k];
      for (const r of [2, 1]) {
        const pts = ellipsePoints(fit.cov[k], r, 72).map(([x, y]): Vec2 => [x + mu[0], y + mu[1]]);
        ellipses += `<polygon points="${path(pts)}" fill="${colors[k]}" fill-opacity="0.08" stroke="${colors[k]}" stroke-width="${r === 1 ? 2 : 1.5}" />`;
      }
    }
  }

  let boundary = '';
  if (!fit.degenerate) {
    if (p.sharedCovariance) {
      const seg = clipLineToBox(linearBoundary(fit), box);
      if (seg)
        boundary = `<polyline points="${path(seg)}" fill="none" stroke="var(--viz-boundary)" stroke-width="2.5" />`;
    } else {
      boundary = zeroContour((x, y) => gdaScore(fit, [x, y]), box, 48)
        .map(
          (line) =>
            `<polyline points="${path(line)}" fill="none" stroke="var(--viz-boundary)" stroke-width="2.5" />`,
        )
        .join('');
    }
  }

  let logistic = '';
  if (p.showLogisticRegression && points.length > 0) {
    const seg = clipLineToBox(fitLogistic(points), box);
    if (seg)
      logistic = `<polyline points="${path(seg)}" fill="none" stroke="var(--viz-4)" stroke-width="2" stroke-dasharray="6 4" />`;
  }

  const label =
    `Two-class scatter of ${points.length} points with GDA's fitted class ellipses` +
    (fit.degenerate
      ? ''
      : ` and its ${p.sharedCovariance ? 'linear' : 'quadratic'} decision boundary`) +
    (p.showLogisticRegression ? ' and the logistic-regression boundary' : '');

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    `<g fill-opacity="0.55">${scatter}</g>` +
    ellipses +
    boundary +
    logistic +
    `</svg>`
  );
}
