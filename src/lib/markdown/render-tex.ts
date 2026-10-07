/**
 * Build-time KaTeX for component props (VISION.md §9.1; STYLE_GUIDE.md §2.2–2.3).
 *
 * rehype-katex handles math in markdown bodies. Props such as `goalTex`,
 * `resultTex`, `justification`, and the `<Frame>` cells never pass through
 * remark, so components render them here with the same `katexOptions`
 * (macros, `\htmlClass` / `\htmlId` trust, `htmlAndMathml` output) that every
 * page and widget uses. Errors never throw; KaTeX prints the source in a
 * `.katex-error` span, which the smoke build greps for.
 *
 * Framework-free: Node only, so it is unit-tested with Vitest.
 */
import katex from 'katex';

import { katexOptions } from '@/lib/katex-macros';

const BASE_OPTIONS = { ...katexOptions, throwOnError: false };

/** Render TeX (no delimiters) as a display block: `<span class="katex-display">…`. */
export function renderDisplayTex(tex: string): string {
  return katex.renderToString(tex.trim(), { ...BASE_OPTIONS, displayMode: true });
}

/** Render TeX (no delimiters) inline: `<span class="katex">…`. */
export function renderInlineMath(tex: string): string {
  return katex.renderToString(tex.trim(), { ...BASE_OPTIONS, displayMode: false });
}

/** Escape the five HTML-significant characters. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a plain-text string that may contain `$…$` (inline) or `$$…$$`
 * (display) spans. Text outside math is HTML-escaped; `\$` outside math is a
 * literal dollar sign (STYLE_GUIDE.md §2.3); an unmatched `$` is left as text.
 */
export function renderInlineTex(text: string): string {
  let html = '';
  let plain = '';
  let i = 0;
  const n = text.length;

  const flush = (): void => {
    if (plain) {
      html += escapeHtml(plain);
      plain = '';
    }
  };

  while (i < n) {
    const ch = text[i];

    if (ch === '\\' && text[i + 1] === '$') {
      plain += '$';
      i += 2;
      continue;
    }

    if (ch === '$') {
      const display = text[i + 1] === '$';
      const open = display ? '$$' : '$';
      const close = findClosing(text, i + open.length, open);
      if (close !== -1) {
        const tex = text.slice(i + open.length, close);
        if (tex.trim()) {
          flush();
          html += display ? renderDisplayTex(tex) : renderInlineMath(tex);
          i = close + open.length;
          continue;
        }
      }
    }

    plain += ch;
    i += 1;
  }

  flush();
  return html;
}

/** Index of the next unescaped `delimiter` at or after `from`, or -1. */
function findClosing(text: string, from: number, delimiter: string): number {
  let j = from;
  while (j < text.length) {
    if (text[j] === '\\') {
      j += 2;
      continue;
    }
    if (text.startsWith(delimiter, j)) return j;
    j += 1;
  }
  return -1;
}
