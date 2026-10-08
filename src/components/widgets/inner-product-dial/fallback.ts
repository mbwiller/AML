/**
 * Static fallback for `inner-product-dial`: the gradient g, the unit step u,
 * the projection of g on u, and (optionally) the descent half-plane, as plain
 * SVG markup rendered at build time by `Widget.astro` for no-JS, print, and
 * the moment before hydration. Colors are token references.
 */
import type { Params } from './manifest';
import {
  descentHalfPlane,
  directionalDerivative,
  unitFromDegrees,
  viewHalfWidth,
  type Vec2,
} from './math';

const SIZE = 340;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const g = p.gradient;
  const w = viewHalfWidth(g);
  const px = (v: number) => ((v + w) / (2 * w)) * SIZE;
  const py = (v: number) => SIZE - px(v);
  const u = unitFromDegrees(p.angle);
  const rate = directionalDerivative(g, u);
  const proj: Vec2 = [rate * u[0], rate * u[1]];

  const seg = (a: Vec2, b: Vec2, attrs: string) =>
    `<line x1="${f(px(a[0]))}" y1="${f(py(a[1]))}" x2="${f(px(b[0]))}" y2="${f(py(b[1]))}" ${attrs} />`;
  const dotAt = (a: Vec2, color: string) =>
    `<circle cx="${f(px(a[0]))}" cy="${f(py(a[1]))}" r="4" fill="${color}" />`;

  const half = p.showHalfSpace
    ? `<polygon points="${descentHalfPlane(g, { x: [-w, w], y: [-w, w] })
        .map(([x, y]) => `${f(px(x))},${f(py(y))}`)
        .join(' ')}" fill="var(--viz-negative)" fill-opacity="0.12" />`
    : '';

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" ` +
    `aria-label="The gradient g = (${g[0]}, ${g[1]}), a unit step u at ${f(p.angle)} degrees, and the projection of g on u, of signed length ${rate.toFixed(2)}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    half +
    `<line x1="0" y1="${SIZE / 2}" x2="${SIZE}" y2="${SIZE / 2}" stroke="var(--border)" />` +
    `<line x1="${SIZE / 2}" y1="0" x2="${SIZE / 2}" y2="${SIZE}" stroke="var(--border)" />` +
    seg(g, proj, 'stroke="var(--muted)" stroke-dasharray="4 3"') +
    seg(
      [0, 0],
      proj,
      `stroke="${rate < 0 ? 'var(--viz-negative)' : 'var(--viz-positive)'}" stroke-width="5"`,
    ) +
    seg([0, 0], g, 'stroke="var(--viz-4)" stroke-width="2.5"') +
    dotAt(g, 'var(--viz-4)') +
    seg([0, 0], u, 'stroke="var(--viz-3)" stroke-width="3"') +
    dotAt(u, 'var(--viz-3)') +
    `</svg>`
  );
}
