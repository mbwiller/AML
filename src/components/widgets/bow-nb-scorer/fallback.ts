/**
 * Static fallback for `bow-nb-scorer`: the per-word vote bars and the score
 * for the default report, as plain SVG rendered at build time by
 * `Widget.astro` for no-JS, print, and the moment before the island
 * hydrates. Colors are token references so it follows the theme.
 */
import { VOCABULARY, WORD_INDEX, modelFor, noteText, reportRow } from './data';
import type { Params } from './manifest';
import { score, splitWords, topVotes } from './math';

const WIDTH = 360;
const ROW = 20;
const LABEL_W = 96;
const VALUE_W = 56;
const TRACK_X = LABEL_W + 8;
const TRACK_W = WIDTH - TRACK_X - VALUE_W - 8;

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Signed number with a real minus sign; infinities and 0/0 spelled out. */
export function formatSigned(v: number, digits = 2): string {
  if (Number.isNaN(v)) return '0/0';
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '−∞';
  const s = Math.abs(v).toFixed(digits);
  return v < 0 && s !== (0).toFixed(digits) ? `−${s}` : `+${s}`;
}

export function renderFallback(p: Params): string {
  const model = modelFor(p.trainSize, p.seed, p.smoothing);
  const text = noteText(reportRow(p.seed, p.report));
  const s = score(model, splitWords(text, WORD_INDEX).tokens);
  const votes = topVotes(s.votes, p.maxWords);
  const finite = votes.map((v) => Math.abs(v.vote)).filter(Number.isFinite);
  const maxMag = Math.max(1e-9, ...finite);
  const height = 44 + votes.length * ROW + 8;
  const mid = TRACK_X + TRACK_W / 2;

  const rows = votes
    .map((v, i) => {
      const y = 44 + i * ROW;
      const serious = Number.isNaN(v.vote) ? false : v.vote > 0;
      const frac = Number.isFinite(v.vote) ? Math.abs(v.vote) / maxMag : 1;
      const w = Math.max(1, (frac * TRACK_W) / 2);
      const x = serious ? mid : mid - w;
      const color = serious ? 'var(--viz-positive)' : 'var(--viz-negative)';
      const word = escape(VOCABULARY[v.j] ?? '?');
      return (
        `<text x="${LABEL_W}" y="${y + 14}" text-anchor="end" fill="var(--fg)">${word}</text>` +
        `<rect x="${x.toFixed(1)}" y="${y + 4}" width="${w.toFixed(1)}" height="${ROW - 8}" fill="${color}" ${Number.isFinite(v.vote) ? '' : 'fill-opacity="0.45" stroke="' + color + '" stroke-dasharray="3 2"'} />` +
        `<text x="${WIDTH - 4}" y="${y + 14}" text-anchor="end" fill="var(--fg)">${formatSigned(v.vote)}</text>`
      );
    })
    .join('');

  const posterior = Number.isNaN(s.posterior) ? 'undefined' : s.posterior.toFixed(3);
  const title =
    `log posterior odds ${formatSigned(s.logOdds)}; P(serious | x) = ${posterior}` +
    `${p.smoothing ? '' : '; no smoothing'}`;

  return (
    `<svg viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" ` +
    `aria-label="Per-word Naive Bayes votes for the default report: ${escape(title)}" ` +
    `xmlns="http://www.w3.org/2000/svg" style="font-family: var(--font-sans); font-size: 12px">` +
    `<rect width="${WIDTH}" height="${height}" fill="var(--surface)" />` +
    `<text x="4" y="16" fill="var(--fg)" font-weight="600">${escape(title)}</text>` +
    `<text x="${mid}" y="34" text-anchor="middle" fill="var(--muted)">← non-serious · serious →</text>` +
    `<line x1="${mid}" y1="40" x2="${mid}" y2="${height - 4}" stroke="var(--viz-boundary)" />` +
    rows +
    `</svg>`
  );
}
