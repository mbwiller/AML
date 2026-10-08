/**
 * Static fallback for `line-fit-playground`: the same picture as the live
 * widget (20 patients, the line for the authored θ, residual segments and
 * squares when asked for) as plain SVG for no-JS, print, and the moment
 * before hydration. Token colors only.
 */
import { lecture2Points } from './data';
import { frame, lineSegment, residualGlyphs } from './geometry';
import type { Params } from './manifest';
import { metrics } from './math';
import { fixed, formatTick } from './plot';

const W = 360;
const H = 260;
const f1 = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const data = lecture2Points(p.dataset);
  const line = { theta0: p.theta0, theta1: p.theta1 };
  const fr = frame(W, H);
  const { inner } = fr;
  const glyphs = residualGlyphs(fr, data, line);
  const m = metrics(data.x, data.y, line);

  const grid =
    fr.yTicks
      .map(
        (t) =>
          `<line x1="${inner.x0}" x2="${inner.x1}" y1="${f1(fr.sy(t))}" y2="${f1(fr.sy(t))}" stroke="var(--border)" />` +
          `<text x="${inner.x0 - 6}" y="${f1(fr.sy(t) + 4)}" text-anchor="end" font-size="11" fill="var(--muted)">${formatTick(t, fr.yStep)}</text>`,
      )
      .join('') +
    fr.xTicks
      .map(
        (t) =>
          `<text x="${f1(fr.sx(t))}" y="${inner.y1 + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${formatTick(t, fr.xStep)}</text>`,
      )
      .join('');

  const squares = p.showSquares
    ? glyphs
        .map(
          (g) =>
            `<rect x="${f1(g.square.x)}" y="${f1(g.square.y)}" width="${f1(g.square.size)}" height="${f1(g.square.size)}" fill="var(--viz-5)" fill-opacity="0.12" stroke="var(--viz-5)" stroke-opacity="0.6" />`,
        )
        .join('')
    : '';
  const segments = p.showResiduals
    ? glyphs
        .map(
          (g) =>
            `<line x1="${f1(g.px)}" x2="${f1(g.px)}" y1="${f1(g.py)}" y2="${f1(g.pyHat)}" stroke="var(--viz-5)" stroke-width="1.5" />`,
        )
        .join('')
    : '';
  const [a, b] = lineSegment(fr, line);
  const points = glyphs
    .map((g) => `<circle cx="${f1(g.px)}" cy="${f1(g.py)}" r="3.5" fill="var(--viz-1)" />`)
    .join('');

  const label =
    `Scatter of 20 patients, BMI against disease progression, with the line ` +
    `${fixed(p.theta0, 0)} + ${fixed(p.theta1, 1)}x; MSE ${m.mse.toFixed(0)}, R² ${fixed(m.r2, 2)}`;

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font-sans)">` +
    `<rect width="${W}" height="${H}" fill="var(--surface)" />` +
    `<defs><clipPath id="lfp-fallback-clip"><rect x="${inner.x0}" y="${inner.y0}" width="${inner.x1 - inner.x0}" height="${inner.y1 - inner.y0}" /></clipPath></defs>` +
    grid +
    `<g clip-path="url(#lfp-fallback-clip)">${squares}${segments}` +
    `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="var(--viz-6)" stroke-width="2.5" />` +
    `</g>${points}` +
    `<text x="${(inner.x0 + inner.x1) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">BMI (companion scale, 30·bmi + 25)</text>` +
    `</svg>`
  );
}
