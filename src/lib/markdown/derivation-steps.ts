/**
 * Server-side step numbering for `<Derivation>` (VISION.md §7: every step has
 * a stable URL fragment). `Derivation.astro` renders its slot to HTML, then
 * this walks the `<li … data-step>` tags in document order and gives each one
 * `id="<derivation>-step-<n>"` and `data-n="<n>"`, plus a per-step link
 * affordance. The visible number comes from the CSS counter in `Step.astro`,
 * which counts the same elements in the same order, so id and number agree.
 *
 * Pure string processing so Vitest covers it without Astro.
 */
import { stepId } from '@/lib/derivation-state';

export interface NumberedSteps {
  html: string;
  /** Steps counted across chunks. */
  total: number;
  /** Steps per `[data-chunk]`, in order (steps outside any chunk are not listed). */
  chunkSizes: number[];
}

const TAG = /<(li|div)\b([^>]*)>/g;
const DATA_STEP = /(?:^|\s)data-step(?=\s|=|$)/;
const DATA_CHUNK = /(?:^|\s)data-chunk(?=\s|=|$)/;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** The "copy link" affordance injected at the top of each step. Styled from `Derivation.astro`. */
export function stepLinkHtml(derivationId: string, n: number): string {
  const id = escapeAttr(stepId(derivationId, n));
  return (
    `<a class="step-link" href="#${id}" data-step-link aria-label="Copy link to step ${n}" title="Copy link to step ${n}">` +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>' +
    '</svg></a>'
  );
}

export function numberDerivationSteps(html: string, derivationId: string): NumberedSteps {
  let n = 0;
  const chunkSizes: number[] = [];
  const out = html.replace(TAG, (tag: string, name: string, attrs: string) => {
    if (name === 'div' && DATA_CHUNK.test(attrs)) {
      chunkSizes.push(0);
      return tag;
    }
    if (name === 'li' && DATA_STEP.test(attrs)) {
      n += 1;
      const last = chunkSizes.length - 1;
      if (last >= 0) chunkSizes[last] = (chunkSizes[last] ?? 0) + 1;
      const id = escapeAttr(stepId(derivationId, n));
      return `<li${attrs} id="${id}" data-n="${n}">${stepLinkHtml(derivationId, n)}`;
    }
    return tag;
  });
  return { html: out, total: n, chunkSizes };
}
