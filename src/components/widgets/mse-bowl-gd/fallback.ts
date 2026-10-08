/**
 * Static fallback for `mse-bowl-gd`: the contours of R̂, the whole
 * gradient-descent path for the authored params, the start, and the
 * least-squares minimum, as plain SVG (token colors only) for no-JS, print,
 * and the moment before hydration.
 */
import { formatTick, pathData } from '../line-fit-playground/plot';
import { bowlFrame, contourPolylines, pathPixels, windowPoints } from './geometry';
import type { Params } from './manifest';
import { bowlModel } from './model';

const W = 360;
const H = 250;
const f1 = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const m = bowlModel(p);
  const fr = bowlFrame(windowPoints(m.run, p.init, m.star), W, H);
  const { inner } = fr;
  const contours = contourPolylines(fr, m.h, m.star)
    .map(
      (pts) =>
        `<path d="${pathData(pts, true)}" fill="none" stroke="var(--viz-2)" stroke-opacity="0.55" />`,
    )
    .join('');
  const path = pathPixels(fr, m.run, m.run.iterations);
  const end = path[path.length - 1] ?? [0, 0];
  const sx = fr.sx(m.star[0]);
  const sy = fr.sy(m.star[1]);
  const grid =
    fr.xTicks
      .map(
        (t) =>
          `<text x="${f1(fr.sx(t))}" y="${inner.y1 + 15}" text-anchor="middle" font-size="11" fill="var(--muted)">${formatTick(t, fr.xStep)}</text>`,
      )
      .join('') +
    fr.yTicks
      .map(
        (t) =>
          `<text x="${inner.x0 - 6}" y="${f1(fr.sy(t) + 4)}" text-anchor="end" font-size="11" fill="var(--muted)">${formatTick(t, fr.yStep)}</text>`,
      )
      .join('');
  const feature = p.standardize ? 'z' : 'bmi';
  const label =
    `Contours of the mean squared error over (θ_${feature}, θ_one) with the gradient-descent path ` +
    `from (${p.init[0]}, ${p.init[1]}), η = ${p.eta}: ${m.run.iterations} iterations, ` +
    `${m.run.status === 'converged' ? 'stopped by the rule' : m.run.status}.`;
  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font-sans)">` +
    `<rect width="${W}" height="${H}" fill="var(--surface)" />` +
    `<defs><clipPath id="mbg-fallback-clip"><rect x="${inner.x0}" y="${inner.y0}" width="${inner.x1 - inner.x0}" height="${inner.y1 - inner.y0}" /></clipPath></defs>` +
    `<rect x="${inner.x0}" y="${inner.y0}" width="${inner.x1 - inner.x0}" height="${inner.y1 - inner.y0}" fill="none" stroke="var(--border)" />` +
    grid +
    `<g clip-path="url(#mbg-fallback-clip)">${contours}` +
    `<path d="${pathData(path)}" fill="none" stroke="var(--viz-4)" stroke-width="2" />` +
    `</g>` +
    `<circle cx="${f1(fr.sx(p.init[0]))}" cy="${f1(fr.sy(p.init[1]))}" r="5" fill="var(--surface)" stroke="var(--fg)" stroke-width="1.5" />` +
    `<path d="M${f1(sx - 6)} ${f1(sy - 6)}L${f1(sx + 6)} ${f1(sy + 6)}M${f1(sx - 6)} ${f1(sy + 6)}L${f1(sx + 6)} ${f1(sy - 6)}" stroke="var(--fg)" stroke-width="2" />` +
    `<circle cx="${f1(end[0])}" cy="${f1(end[1])}" r="4.5" fill="var(--viz-4)" stroke="var(--surface)" stroke-width="1.5" />` +
    `<text x="${(inner.x0 + inner.x1) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--muted)">θ_${feature} (horizontal), θ_one (vertical)</text>` +
    `</svg>`
  );
}
