/**
 * Static fallback for `encoding-explorer`: the targets-vs-predictions chart
 * for the authored encoding and a one-line summary, as plain SVG rendered at
 * build time by `Widget.astro` for no-JS, print, and the moment before the
 * island hydrates. Colors are token references so it follows the theme.
 */
import { CHART, chartBars, gridTicks } from './chart';
import type { Params } from './manifest';
import { ENCODING_LABELS, designMatrix, leastSquares, targetsFor, type Encoding } from './math';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const f1 = (v: number) => v.toFixed(1);

/** The encoding actually shown: the authored one if offered, else the first offered. */
export function activeEncoding(p: Pick<Params, 'encoding' | 'encodings'>): Encoding {
  return p.encodings.includes(p.encoding) ? p.encoding : (p.encodings[0] ?? 'integer');
}

export function renderFallback(p: Params): string {
  const encoding = activeEncoding(p);
  const y = targetsFor(p.categories.length, p.targets);
  const { X } = designMatrix(p.categories, encoding, p.intercept);
  const fit = leastSquares(X, y);
  const bars = chartBars(p.categories, y, fit.fitted);
  const H = CHART.height + 22;

  const grid = gridTicks()
    .map(
      (t) =>
        `<line x1="${CHART.left}" y1="${f1(t.y)}" x2="${CHART.width - CHART.right}" y2="${f1(t.y)}" stroke="var(--border)" />` +
        `<text x="${CHART.left - 4}" y="${f1(t.y + 4)}" text-anchor="end" fill="var(--muted)">${t.v}</text>`,
    )
    .join('');
  const marks = bars
    .map(
      (b) =>
        `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.width)}" height="${f1(b.height)}" fill="var(--viz-2)" fill-opacity="0.55" />` +
        `<circle cx="${f1(b.cx)}" cy="${f1(b.ty)}" r="4" fill="var(--surface)" stroke="var(--fg)" stroke-width="2" />` +
        `<text x="${f1(b.cx)}" y="${CHART.height - 8}" text-anchor="middle" fill="var(--fg)">${escape(b.label)}</text>`,
    )
    .join('');
  const summary =
    `${ENCODING_LABELS[encoding]}${p.intercept ? ' with intercept' : ''}: ` +
    `${fit.p} columns, rank ${fit.rank}; ` +
    `${fit.exact ? 'fits every target exactly' : 'cannot fit every target'}`;

  return (
    `<svg viewBox="0 0 ${CHART.width} ${H}" width="${CHART.width}" height="${H}" role="img" ` +
    `aria-label="Targets (dots) and fitted values (bars) per category. ${escape(summary)}" ` +
    `xmlns="http://www.w3.org/2000/svg" style="font-family: var(--font-sans); font-size: 11px">` +
    `<rect width="${CHART.width}" height="${H}" fill="var(--surface)" />` +
    grid +
    marks +
    `<text x="4" y="${H - 4}" fill="var(--fg)">${escape(summary)}</text>` +
    `</svg>`
  );
}
