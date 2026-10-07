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

/**
 * Promote a step body that MDX parsed as inline math to display math.
 *
 * The contract's skeleton writes `<Step …>` and `$$…$$` on adjacent lines
 * with no blank line between them, which MDX reads as a paragraph holding
 * one inline `<span class="katex">`. When the rendered slot is exactly that
 * (one paragraph, one inline KaTeX span, nothing else), the TeX is read back
 * from KaTeX's `<annotation encoding="application/x-tex">` and re-rendered in
 * display mode. Anything else (display math already, prose, several spans)
 * is returned untouched.
 */
export function promoteInlineMath(html: string): string {
  if (html.includes('katex-display')) return html;
  const paragraph = /^\s*<p>\s*(<span class="katex">[\s\S]*<\/span>)\s*<\/p>\s*$/.exec(html);
  if (!paragraph?.[1]) return html;
  const spans = paragraph[1].match(/<span class="katex">/g);
  if (!spans || spans.length !== 1) return html;
  const annotation = /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/.exec(
    paragraph[1],
  );
  if (!annotation?.[1]) return html;
  return renderDisplayTex(unescapeHtml(annotation[1]));
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}
