/**
 * Static fallback for `gaussian-2d-covariance`: the same picture as the live
 * widget (scatter, 1σ and 2σ ellipses, eigenvectors) as plain SVG markup,
 * rendered at build time by `Widget.astro` for no-JS, print, and the moment
 * before the island hydrates. Colors are token references so it follows the
 * theme like everything else.
 */
import { createSeededRandom } from '../_shared/seeded-random';
import type { Params } from './manifest';
import {
  covarianceMatrix,
  eigenSymmetric2,
  ellipsePoints,
  standardNormals,
  transformSamples,
} from './math';

/** Plot window in math units, shared with the live widget. */
export const DOMAIN = 7;
const SIZE = 360;
const FALLBACK_POINTS = 120;

const px = (v: number) => ((v + DOMAIN) / (2 * DOMAIN)) * SIZE;
const py = (v: number) => SIZE - px(v);
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const sigma = covarianceMatrix(p.sigmaX, p.sigmaY, p.rho);
  const e = eigenSymmetric2(sigma);
  const rng = createSeededRandom(p.seed);
  const points = p.showSamples
    ? transformSamples(standardNormals(Math.min(p.n, FALLBACK_POINTS), rng), sigma)
    : [];

  const ellipse = (r: number) =>
    `<polygon points="${ellipsePoints(sigma, r, 72)
      .map(([x, y]) => `${f(px(x))},${f(py(y))}`)
      .join(
        ' ',
      )}" fill="var(--viz-2)" fill-opacity="0.08" stroke="var(--viz-2)" stroke-width="1.5" />`;

  const vectors = p.showEigenvectors
    ? e.vectors
        .map((v, i) => {
          const s = Math.sqrt(Math.max(e.values[i] ?? 0, 0));
          return `<line x1="${f(px(0))}" y1="${f(py(0))}" x2="${f(px(s * v[0]))}" y2="${f(py(s * v[1]))}" stroke="var(--viz-4)" stroke-width="2" />`;
        })
        .join('')
    : '';

  const scatter = points
    .map(([x, y]) => `<circle cx="${f(px(x))}" cy="${f(py(y))}" r="2.5" />`)
    .join('');

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" ` +
    `aria-label="Scatter of ${points.length} samples from a two-dimensional Gaussian with its one- and two-sigma ellipses${p.showEigenvectors ? ' and eigenvectors' : ''}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    `<g fill="var(--viz-1)" fill-opacity="0.5">${scatter}</g>` +
    ellipse(2) +
    ellipse(1) +
    vectors +
    `</svg>`
  );
}
