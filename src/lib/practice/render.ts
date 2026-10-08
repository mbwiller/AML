/**
 * Build-time rendering of lesson snippets for cards and quiz items: a small
 * subset of MDX prose (paragraphs, lists, `**bold**`, `*em*`, `` `code` ``,
 * `[[term|text]]`, `<EqRef>`), with `$…$` / `$$…$$` through the shared KaTeX
 * options (src/lib/markdown/render-tex.ts). Other JSX tags are dropped and
 * their text kept. Framework-free and deterministic, so it is unit-tested.
 */
import { escapeHtml, renderDisplayTex, renderInlineMath } from '@/lib/markdown/render-tex';

export interface Segment {
  math: boolean;
  display: boolean;
  text: string;
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

/** Split text into prose and math runs. `\$` in prose is a literal dollar sign. */
export function splitMath(text: string): Segment[] {
  const out: Segment[] = [];
  let plain = '';
  let i = 0;
  const flush = () => {
    if (plain) out.push({ math: false, display: false, text: plain });
    plain = '';
  };
  while (i < text.length) {
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
      if (close !== -1 && text.slice(i + open.length, close).trim()) {
        flush();
        out.push({ math: true, display, text: text.slice(i + open.length, close) });
        i = close + open.length;
        continue;
      }
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

/**
 * Remove `\tag{…}` and unwrap `\htmlId{…}{…}`: a card or quiz item shows a
 * formula out of its lesson, so equation numbers and anchor ids would be wrong
 * (and duplicate ids on the practice page).
 */
export function stripAnchors(tex: string): string {
  let out = tex.replace(/\\tag\*?\{[^{}]*\}/g, '');
  for (;;) {
    const at = out.indexOf('\\htmlId{');
    if (at === -1) break;
    const idEnd = matchBrace(out, at + '\\htmlId'.length);
    if (idEnd === -1) break;
    let k = idEnd + 1;
    while (out[k] === ' ') k++;
    if (out[k] !== '{') {
      out = out.slice(0, at) + out.slice(idEnd + 1);
      continue;
    }
    const bodyEnd = matchBrace(out, k);
    if (bodyEnd === -1) break;
    out = out.slice(0, at) + out.slice(k + 1, bodyEnd) + out.slice(bodyEnd + 1);
  }
  return out.trim();
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** `eq-2-4-1` → `(2.4.1)`. */
function eqLabel(id: string): string {
  return `(${id.replace(/^eq-/, '').replace(/-/g, '.')})`;
}

/** Drop JSX from a prose run, keeping text; `<EqRef id>` becomes its number. */
function stripJsx(text: string): string {
  return text
    .replace(/<EqRef\s+id=["']([^"']+)["']\s*\/>/g, (_m, id: string) => eqLabel(id))
    .replace(/<\/?[A-Z][A-Za-z0-9.]*(?:\s+[^<>]*?)?\s*\/?>/g, '')
    .replace(/[ \t]{2,}/g, ' ');
}

/** `[[term|text]]` → text, `[[term]]` → the id with hyphens as spaces (as remark-sticky does). */
function stripStickies(text: string): string {
  return text.replace(
    /\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/g,
    (_m, id: string, display?: string) => (display ?? id.replace(/-/g, ' ')).trim(),
  );
}

/** Inline markdown on already-escaped prose. */
function inlineMarkdown(escaped: string): string {
  const codes: string[] = [];
  let s = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\uE000${codes.length - 1}\uE001`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\([^)\s]*\)/g, '$1');
  return s.replace(/\uE000(\d+)\uE001/g, (_m, i: string) => codes[Number(i)] ?? '');
}

export interface ProseOptions {
  /** Applied to each math run's TeX before rendering (cloze blanks). */
  mapTex?: ((tex: string) => string) | undefined;
  /** Applied to each escaped prose run after inline markdown (cloze blanks). */
  mapHtml?: ((html: string) => string) | undefined;
}

/** One line or paragraph of MDX prose → HTML (no block wrapper). */
export function renderProse(text: string, options: ProseOptions = {}): string {
  const mapTex = options.mapTex ?? ((t: string) => t);
  const mapHtml = options.mapHtml ?? ((h: string) => h);
  return splitMath(text.replace(/\s*\n\s*/g, ' ').trim())
    .map((seg) => {
      if (seg.math) {
        const tex = mapTex(stripAnchors(seg.text));
        return seg.display ? renderDisplayTex(tex) : renderInlineMath(tex);
      }
      return mapHtml(inlineMarkdown(escapeHtml(stripStickies(stripJsx(seg.text)))));
    })
    .join('')
    .trim();
}

export type Block =
  | { kind: 'math'; tex: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] };

const LIST_RE = /^\s*(?:[-*]|\d+\.)\s+/;

/** Split an MDX snippet into display-math blocks, paragraphs, and lists. */
export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length === 0) return;
    const nonEmpty = para.filter((l) => l.trim());
    const first = nonEmpty[0];
    if (first !== undefined && LIST_RE.test(first)) {
      const items: string[] = [];
      for (const l of nonEmpty) {
        if (LIST_RE.test(l)) items.push(l.replace(LIST_RE, ''));
        else items[items.length - 1] = `${items[items.length - 1] ?? ''} ${l.trim()}`;
      }
      out.push({ kind: 'list', ordered: /^\s*\d+\./.test(first), items });
      para = [];
      return;
    }
    const text = para.join('\n').trim();
    if (text) out.push({ kind: 'para', text });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (trimmed.startsWith('$$')) {
      flush();
      // Collect until the closing $$ (same line or a later one).
      const rest = trimmed.slice(2);
      const sameLine = rest.indexOf('$$');
      if (sameLine !== -1) {
        out.push({ kind: 'math', tex: rest.slice(0, sameLine) });
        const after = rest.slice(sameLine + 2).trim();
        if (after) para.push(after);
        continue;
      }
      const tex: string[] = [rest];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j] ?? '';
        const close = l.indexOf('$$');
        if (close !== -1) {
          tex.push(l.slice(0, close));
          break;
        }
        tex.push(l);
      }
      out.push({ kind: 'math', tex: tex.join('\n') });
      i = j;
      continue;
    }
    if (!trimmed) {
      flush();
      continue;
    }
    para.push(line);
  }
  flush();
  return out.filter((b) => b.kind !== 'para' || stripJsx(b.text).trim() !== '');
}

/** Render one block to HTML. */
export function renderBlock(block: Block, options: ProseOptions = {}): string {
  switch (block.kind) {
    case 'math': {
      const tex = (options.mapTex ?? ((t: string) => t))(stripAnchors(block.tex));
      return `<div class="pc-formula">${renderDisplayTex(tex)}</div>`;
    }
    case 'para':
      return `<p>${renderProse(block.text, options)}</p>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      return `<${tag}>${block.items.map((t) => `<li>${renderProse(t, options)}</li>`).join('')}</${tag}>`;
    }
  }
}
