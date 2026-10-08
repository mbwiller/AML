/**
 * Static fallback for `hessian-classifier`: the level sets of
 * f(x) = ½xᵀHx (+ the higher-order term) and the eigenvectors, as plain SVG
 * markup rendered at build time by `Widget.astro` for no-JS, print, and the
 * moment before hydration. Colors are token references.
 */
import type { Params } from './manifest';
import { classifyHessian, contourLevels, levelSets, makeSurface, type Vec2 } from './math';

/** Plot window half-width in math units, shared with the live widget. */
export const HALF = 3;
const SIZE = 340;
const f = (v: number) => v.toFixed(1);
const px = (v: number) => ((v + HALF) / (2 * HALF)) * SIZE;
const py = (v: number) => SIZE - px(v);

export function renderFallback(p: Params): string {
  const s = makeSurface(p.eigenvalues[0], p.eigenvalues[1], p.rotation, p.higherOrder);
  const kind = classifyHessian(s.h);
  const box = { x: [-HALF, HALF] as const, y: [-HALF, HALF] as const };

  const contours = p.showLevelSets
    ? levelSets(s, box, contourLevels(s.eigen, HALF), 48)
        .flatMap(({ level, lines }) =>
          lines.map((line) => {
            const pts = line.map(([x, y]) => `${f(px(x))},${f(py(y))}`).join(' ');
            const stroke =
              level === 0 ? 'var(--viz-boundary)' : level > 0 ? 'var(--viz-2)' : 'var(--viz-6)';
            const dash = level < 0 ? ' stroke-dasharray="5 4"' : '';
            const width = level === 0 ? 2.5 : 1.5;
            return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash} />`;
          }),
        )
        .join('')
    : '';

  const vectors = p.showEigenvectors
    ? s.vectors
        .map((v: Vec2, k) => {
          const tip: Vec2 = [1.5 * v[0], 1.5 * v[1]];
          return `<line x1="${f(px(0))}" y1="${f(py(0))}" x2="${f(px(tip[0]))}" y2="${f(py(tip[1]))}" stroke="var(--viz-${k === 0 ? 3 : 1})" stroke-width="2.5" />`;
        })
        .join('')
    : '';

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" ` +
    `aria-label="Level sets of the quadratic one half x transpose H x with eigenvalues ${p.eigenvalues[0]} and ${p.eigenvalues[1]}: the critical point is ${kind === 'degenerate' ? 'degenerate (the test is inconclusive)' : `a ${kind}`}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    contours +
    vectors +
    `<circle cx="${f(px(0))}" cy="${f(py(0))}" r="4" fill="var(--fg)" />` +
    `</svg>`
  );
}
