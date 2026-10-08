/**
 * Static fallback for `gd-2d-eigen`: the level sets of E(θ) = ½θᵀAθ and the
 * gradient-descent path for the embedding's params as plain SVG, for no-JS,
 * print, and the moment before hydration. Token colors only.
 */
import type { Params } from './manifest';
import {
  conditionNumber,
  DOMAIN,
  contourLevels,
  energy,
  gdIterates,
  hessianFromEigen,
  levelSetPoints,
} from './math';

const SIZE = 360;
const f = (v: number) => v.toFixed(1);
const px = (v: number) => ((v + DOMAIN) / (2 * DOMAIN)) * SIZE;
const py = (v: number) => SIZE - px(v);
const clamp = (v: number) => Math.min(Math.max(v, -SIZE), 2 * SIZE);

export function renderFallback(p: Params): string {
  const A = hessianFromEigen(p.lambda1, p.lambda2, p.rotation);
  const start: [number, number] = [p.start[0], p.start[1]];
  const levels = contourLevels(energy(A, start));
  const contours = levels
    .map(
      (level) =>
        `<polygon points="${levelSetPoints(p.lambda1, p.lambda2, p.rotation, level, 60)
          .map(([x, y]) => `${f(clamp(px(x)))},${f(clamp(py(y)))}`)
          .join(' ')}" fill="none" stroke="var(--viz-2)" stroke-width="1.25" />`,
    )
    .join('');
  const its = gdIterates(A, start, p.eta, p.steps);
  const path = its.map(([x, y]) => `${f(clamp(px(x)))},${f(clamp(py(y)))}`).join(' ');
  const dots = its
    .map(([x, y]) => `<circle cx="${f(clamp(px(x)))}" cy="${f(clamp(py(y)))}" r="3" />`)
    .join('');
  const kappa = conditionNumber(p.lambda1, p.lambda2);

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" ` +
    `aria-label="Gradient descent with step size ${p.eta} on an elliptical bowl with eigenvalues ${p.lambda1} and ${p.lambda2} (condition number ${kappa.toFixed(2)}), rotated ${p.rotation} degrees" ` +
    `xmlns="http://www.w3.org/2000/svg" overflow="hidden">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    contours +
    `<polyline points="${path}" fill="none" stroke="var(--viz-4)" stroke-width="1.75" />` +
    `<g fill="var(--viz-4)">${dots}</g>` +
    `</svg>`
  );
}
