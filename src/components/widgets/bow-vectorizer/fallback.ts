/**
 * Static fallback for `bow-vectorizer`: the default report's sparse vector
 * as a strip over the fitted vocabulary plus its first nonzero entries, as
 * plain SVG rendered at build time by `Widget.astro` for no-JS, print, and
 * the moment before hydration. Colors are token references.
 */
import type { Params } from './manifest';
import { defaultText, fitFor, vectorizeText } from './pipeline';

const WIDTH = 360;
const STRIP_Y = 40;
const STRIP_H = 28;
const ROW = 16;
const SHOWN = 8;

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderFallback(p: Params): string {
  const fit = fitFor(p);
  const doc = defaultText(p);
  const { vector } = vectorizeText(doc.text, fit.vocab, p);
  const size = Math.max(vector.size, 1);
  const maxV = Math.max(1, ...vector.entries.map(([, v]) => v));
  const ticks = vector.entries
    .map(([j, v]) => {
      const x = 4 + ((WIDTH - 8) * (j + 0.5)) / size;
      const h = (STRIP_H * v) / maxV;
      return `<line x1="${x.toFixed(1)}" y1="${STRIP_Y + STRIP_H}" x2="${x.toFixed(1)}" y2="${(STRIP_Y + STRIP_H - h).toFixed(1)}" stroke="var(--viz-2)" stroke-width="2" />`;
    })
    .join('');
  const rows = vector.entries
    .slice(0, SHOWN)
    .map(([j, v], i) => {
      const y = STRIP_Y + STRIP_H + 22 + i * ROW;
      return (
        `<text x="4" y="${y}" fill="var(--muted)">${j}</text>` +
        `<text x="48" y="${y}" fill="var(--fg)">${escape(fit.vocab.terms[j] ?? '?')}</text>` +
        `<text x="${WIDTH - 4}" y="${y}" text-anchor="end" fill="var(--fg)">${v}</text>`
      );
    })
    .join('');
  const height = STRIP_Y + STRIP_H + 22 + Math.min(SHOWN, vector.entries.length) * ROW + 16;
  const title =
    `${doc.id}: ${vector.entries.length} of |V| = ${vector.size} columns nonzero` +
    ` (vocabulary fitted on ${p.trainSize} reports; ${fit.raw.terms.length} before preprocessing)`;
  const more =
    vector.entries.length > SHOWN
      ? `<text x="4" y="${height - 4}" fill="var(--muted)">… ${vector.entries.length - SHOWN} more nonzero entries</text>`
      : '';

  return (
    `<svg viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" ` +
    `aria-label="Bag-of-words vector of a NOTES report. ${escape(title)}" ` +
    `xmlns="http://www.w3.org/2000/svg" style="font-family: var(--font-sans); font-size: 11px">` +
    `<rect width="${WIDTH}" height="${height}" fill="var(--surface)" />` +
    `<text x="4" y="16" fill="var(--fg)" font-weight="600">${escape(doc.id)}: ${vector.entries.length} of ${vector.size} columns nonzero</text>` +
    `<text x="4" y="32" fill="var(--muted)">${p.binary ? 'binary' : 'counts'}; ${fit.raw.terms.length} words before preprocessing</text>` +
    `<rect x="4" y="${STRIP_Y}" width="${WIDTH - 8}" height="${STRIP_H}" fill="var(--surface-2)" />` +
    ticks +
    rows +
    more +
    `</svg>`
  );
}
