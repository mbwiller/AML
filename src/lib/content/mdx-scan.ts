/**
 * Framework-free helpers that pull structure out of an MDX source string
 * without compiling it: frontmatter, `[[term]]` uses, JSX tags and their
 * props, `<Derivation>` blocks with their `<Step>`s, `<Example>` bodies,
 * headings, and top-level `import`/`export` lines.
 *
 * Everything here works on offsets into the original string so that line
 * numbers in validator findings are exact. Regions that MDX would never treat
 * as prose or JSX (fenced code, inline code, `$…$` / `$$…$$` math, and
 * `{/* … *\/}` comments) are blanked out before scanning, so a `<` inside TeX
 * or a `[[` inside a code block cannot produce a false finding.
 */

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

export interface FrontmatterSplit {
  /** Raw YAML between the `---` fences, or null when the file has none. */
  frontmatter: string | null;
  /** Everything after the closing fence (or the whole file). */
  body: string;
  /** 1-based line number on which `body` starts in the original source. */
  bodyLine: number;
}

export function splitFrontmatter(src: string): FrontmatterSplit {
  const text = src.startsWith('﻿') ? src.slice(1) : src;
  const lines = text.split('\n');
  if (lines[0]?.trimEnd() !== '---') return { frontmatter: null, body: text, bodyLine: 1 };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trimEnd() === '---') {
      return {
        frontmatter: lines.slice(1, i).join('\n'),
        body: lines.slice(i + 1).join('\n'),
        bodyLine: i + 2,
      };
    }
  }
  // Unterminated frontmatter: treat the whole file as frontmatter so YAML errors surface.
  return {
    frontmatter: lines.slice(1).join('\n'),
    body: '',
    bodyLine: lines.length + 1,
  };
}

// ---------------------------------------------------------------------------
// Line numbers
// ---------------------------------------------------------------------------

/** Returns a function mapping a 0-based offset to a 1-based line number. */
export function lineIndex(text: string): (offset: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

// ---------------------------------------------------------------------------
// Masking of non-prose regions
// ---------------------------------------------------------------------------

export interface MaskOptions {
  /** Blank `$…$` and `$$…$$` spans (default true). */
  math?: boolean;
}

/**
 * Replace fenced code, inline code, MDX comments, and (by default) math with
 * spaces, keeping every newline so offsets and line numbers are unchanged.
 */
export function maskNonProse(body: string, options: MaskOptions = {}): string {
  const math = options.math ?? true;
  const out = body.split('');
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' ';
  };
  const atLineStart = (i: number) => {
    let j = i - 1;
    while (j >= 0 && (body[j] === ' ' || body[j] === '\t')) j--;
    return j < 0 || body[j] === '\n';
  };
  const n = body.length;
  let i = 0;
  while (i < n) {
    const ch = body[i];
    // Fenced code block at line start.
    if ((ch === '`' || ch === '~') && atLineStart(i)) {
      let k = i;
      while (body[k] === ch) k++;
      const fenceLen = k - i;
      if (fenceLen >= 3) {
        const fence = ch.repeat(fenceLen);
        let close = body.indexOf(`\n${fence}`, k);
        while (close !== -1) {
          let e = close + 1 + fenceLen;
          while (body[e] === ch) e++;
          const rest = body.slice(e, body.indexOf('\n', e) === -1 ? n : body.indexOf('\n', e));
          if (rest.trim() === '') break;
          close = body.indexOf(`\n${fence}`, close + 1);
        }
        const end = close === -1 ? n : body.indexOf('\n', close + 1 + fenceLen);
        const stop = end === -1 ? n : end;
        blank(i, stop);
        i = stop;
        continue;
      }
    }
    // MDX comment.
    if (body.startsWith('{/*', i)) {
      const close = body.indexOf('*/}', i + 3);
      const stop = close === -1 ? n : close + 3;
      blank(i, stop);
      i = stop;
      continue;
    }
    // Inline code (single line).
    if (ch === '`') {
      let k = i;
      while (body[k] === '`') k++;
      const ticks = body.slice(i, k);
      const lineEnd = body.indexOf('\n', k);
      const limit = lineEnd === -1 ? n : lineEnd;
      const close = body.indexOf(ticks, k);
      if (close !== -1 && close < limit) {
        blank(i, close + ticks.length);
        i = close + ticks.length;
        continue;
      }
      i = k;
      continue;
    }
    // Escaped dollar.
    if (ch === '\\' && body[i + 1] === '$') {
      i += 2;
      continue;
    }
    if (math && ch === '$') {
      if (body[i + 1] === '$') {
        const close = body.indexOf('$$', i + 2);
        const stop = close === -1 ? n : close + 2;
        blank(i, stop);
        i = stop;
        continue;
      }
      const lineEnd = body.indexOf('\n', i + 1);
      const limit = lineEnd === -1 ? n : lineEnd;
      let k = i + 1;
      let found = -1;
      while (k < limit) {
        if (body[k] === '\\') {
          k += 2;
          continue;
        }
        if (body[k] === '$') {
          found = k;
          break;
        }
        k++;
      }
      if (found !== -1) {
        blank(i, found + 1);
        i = found + 1;
        continue;
      }
    }
    i++;
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// [[term]] uses
// ---------------------------------------------------------------------------

export interface StickyUse {
  /** The text between `[[` and `]]` or `|` (not necessarily a valid id). */
  id: string;
  display: string | undefined;
  line: number;
}

const STICKY_RE = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/g;

/** Find every `[[term]]` / `[[term|text]]` in prose (code and math are ignored). */
export function findStickyUses(body: string): StickyUse[] {
  const masked = maskNonProse(body);
  const line = lineIndex(masked);
  const out: StickyUse[] = [];
  for (const m of masked.matchAll(STICKY_RE)) {
    const id = m[1];
    if (id === undefined) continue;
    out.push({ id: id.trim(), display: m[2]?.trim(), line: line(m.index) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSX tags
// ---------------------------------------------------------------------------

export type JsxAttrValue = string | true;

export interface JsxTag {
  name: string;
  /** String props hold their literal text; `{expr}` props hold the raw expression; bare props are `true`. */
  attrs: Record<string, JsxAttrValue>;
  /** Props written as `{expr}`; the key set lets a caller tell `"7"` from `{7}`. */
  exprAttrs: Set<string>;
  selfClosing: boolean;
  closing: boolean;
  start: number;
  end: number;
  line: number;
}

const TAG_START_RE = /<(\/?)([A-Z][A-Za-z0-9.]*)(?=[\s/>])/g;

function parseAttrs(
  text: string,
  from: number,
): {
  attrs: Record<string, JsxAttrValue>;
  exprAttrs: Set<string>;
  selfClosing: boolean;
  end: number;
} | null {
  const attrs: Record<string, JsxAttrValue> = {};
  const exprAttrs = new Set<string>();
  let i = from;
  const n = text.length;
  while (i < n) {
    const ch = text[i] ?? '';
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '>')
      return { attrs, exprAttrs, selfClosing: true, end: i + 2 };
    if (ch === '>') return { attrs, exprAttrs, selfClosing: false, end: i + 1 };
    if (ch === '{') {
      // spread attribute {...x}: skip balanced braces
      const close = matchBrace(text, i);
      if (close === -1) return null;
      i = close + 1;
      continue;
    }
    const nameMatch = /^[A-Za-z_:][A-Za-z0-9_:.-]*/.exec(text.slice(i, i + 128));
    if (!nameMatch) return null;
    const name = nameMatch[0];
    i += name.length;
    while (i < n && /\s/.test(text[i] ?? '')) i++;
    if (text[i] !== '=') {
      attrs[name] = true;
      continue;
    }
    i++;
    while (i < n && /\s/.test(text[i] ?? '')) i++;
    const q = text[i];
    if (q === '"' || q === "'") {
      const close = text.indexOf(q, i + 1);
      if (close === -1) return null;
      attrs[name] = text.slice(i + 1, close);
      i = close + 1;
    } else if (q === '{') {
      const close = matchBrace(text, i);
      if (close === -1) return null;
      attrs[name] = text.slice(i + 1, close).trim();
      exprAttrs.add(name);
      i = close + 1;
    } else {
      return null;
    }
  }
  return null;
}

/** Index of the `}` matching the `{` at `open`, skipping string literals; -1 if unbalanced. */
function matchBrace(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const close = text.indexOf(ch, i + 1);
      if (close === -1) return -1;
      i = close + 1;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Find every capitalised JSX tag (opening, self-closing, or closing) in prose.
 * `masked` should come from `maskNonProse` so that TeX and code are skipped.
 */
export function findJsxTags(masked: string): JsxTag[] {
  const line = lineIndex(masked);
  const out: JsxTag[] = [];
  TAG_START_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_START_RE.exec(masked)) !== null) {
    const closing = m[1] === '/';
    const name = m[2] ?? '';
    const afterName = m.index + m[0].length;
    if (closing) {
      const gt = masked.indexOf('>', afterName);
      if (gt === -1) break;
      out.push({
        name,
        attrs: {},
        exprAttrs: new Set(),
        selfClosing: false,
        closing: true,
        start: m.index,
        end: gt + 1,
        line: line(m.index),
      });
      TAG_START_RE.lastIndex = gt + 1;
      continue;
    }
    const parsed = parseAttrs(masked, afterName);
    if (!parsed) {
      // Malformed tag: record the name so unknown components still surface, then move on.
      out.push({
        name,
        attrs: {},
        exprAttrs: new Set(),
        selfClosing: false,
        closing: false,
        start: m.index,
        end: afterName,
        line: line(m.index),
      });
      continue;
    }
    out.push({
      name,
      attrs: parsed.attrs,
      exprAttrs: parsed.exprAttrs,
      selfClosing: parsed.selfClosing,
      closing: false,
      start: m.index,
      end: parsed.end,
      line: line(m.index),
    });
    TAG_START_RE.lastIndex = parsed.end;
  }
  return out;
}

/** Distinct component names used in a body (opening or closing tags). */
export function findComponentNames(body: string): string[] {
  const names = new Set<string>();
  for (const tag of findJsxTags(maskNonProse(body))) names.add(tag.name.split('.')[0] ?? tag.name);
  return [...names];
}

/** Pull the quoted strings out of a `{["a", "b"]}` style expression. */
export function parseStringList(expr: JsxAttrValue | undefined): string[] {
  if (expr === undefined || expr === true) return [];
  const out: string[] = [];
  for (const m of expr.matchAll(/["'`]([^"'`]*)["'`]/g)) if (m[1] !== undefined) out.push(m[1]);
  return out;
}

// ---------------------------------------------------------------------------
// Blocks: Derivation / Step, Example, and generic element ranges
// ---------------------------------------------------------------------------

export interface ElementRange {
  open: JsxTag;
  /** Offset just past the matching closing tag, or the end of the opening tag when self-closing. */
  end: number;
  /** Offsets of the inner content (empty for self-closing tags). */
  innerStart: number;
  innerEnd: number;
  /** False when no matching closing tag was found (the range runs to the end of the text). */
  closed: boolean;
}

/** Pair each opening tag of `name` with its closing tag (depth-aware). */
export function findElements(tags: JsxTag[], name: string, textLength: number): ElementRange[] {
  const out: ElementRange[] = [];
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    if (!t || t.name !== name || t.closing) continue;
    if (t.selfClosing) {
      out.push({
        open: t,
        end: t.end,
        innerStart: t.end,
        innerEnd: t.end,
        closed: true,
      });
      continue;
    }
    let depth = 1;
    let j = i + 1;
    for (; j < tags.length; j++) {
      const u = tags[j];
      if (!u || u.name !== name || u.selfClosing) continue;
      depth += u.closing ? -1 : 1;
      if (depth === 0) break;
    }
    const closeTag = tags[j];
    if (closeTag)
      out.push({
        open: t,
        end: closeTag.end,
        innerStart: t.end,
        innerEnd: closeTag.start,
        closed: true,
      });
    else
      out.push({
        open: t,
        end: textLength,
        innerStart: t.end,
        innerEnd: textLength,
        closed: false,
      });
  }
  return out;
}

export interface StepInfo {
  line: number;
  justification: string | undefined;
  sticky: string | undefined;
  fadeable: boolean;
  figureState: string | undefined;
}

export interface DerivationInfo {
  id: string | undefined;
  title: string | undefined;
  goalTex: string | undefined;
  resultTex: string | undefined;
  source: string | undefined;
  line: number;
  steps: StepInfo[];
  /** True when no closing `</Derivation>` was found. */
  unclosed: boolean;
}

function str(v: JsxAttrValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Every `<Derivation>` with the `<Step>`s nested inside it (through any `<Chunk>`). */
export function findDerivations(body: string): DerivationInfo[] {
  const masked = maskNonProse(body);
  const tags = findJsxTags(masked);
  return findElements(tags, 'Derivation', masked.length).map((el) => {
    const steps = tags
      .filter(
        (t) => t.name === 'Step' && !t.closing && t.start > el.innerStart && t.start < el.innerEnd,
      )
      .map((t) => ({
        line: t.line,
        justification: str(t.attrs['justification']),
        sticky: str(t.attrs['sticky']),
        fadeable: t.attrs['fadeable'] !== undefined,
        figureState: str(t.attrs['figureState']),
      }));
    return {
      id: str(el.open.attrs['id']),
      title: str(el.open.attrs['title']),
      goalTex: str(el.open.attrs['goalTex']),
      resultTex: str(el.open.attrs['resultTex']),
      source: str(el.open.attrs['source']),
      line: el.open.line,
      steps,
      unclosed: !el.closed,
    };
  });
}

export interface BodyBlock {
  line: number;
  attrs: Record<string, JsxAttrValue>;
  /** The inner text, taken from the ORIGINAL body (math intact). */
  inner: string;
  /** 1-based line of the first inner character. */
  innerLine: number;
}

/** Inner text of every `<Name>…</Name>` element, with math and code intact. */
export function findBlocks(body: string, name: string): BodyBlock[] {
  const masked = maskNonProse(body);
  const tags = findJsxTags(masked);
  const line = lineIndex(body);
  return findElements(tags, name, masked.length).map((el) => ({
    line: el.open.line,
    attrs: el.open.attrs,
    inner: body.slice(el.innerStart, el.innerEnd),
    innerLine: line(el.innerStart),
  }));
}

// ---------------------------------------------------------------------------
// Headings, ESM, math spans
// ---------------------------------------------------------------------------

export interface Heading {
  level: number;
  text: string;
  line: number;
}

/** Markdown ATX headings outside code blocks. */
export function findHeadings(body: string): Heading[] {
  const masked = maskNonProse(body, { math: false });
  const out: Heading[] = [];
  masked.split('\n').forEach((raw, idx) => {
    const m = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(raw);
    if (m?.[1] && m[2] !== undefined) out.push({ level: m[1].length, text: m[2], line: idx + 1 });
  });
  return out;
}

/** 1-based lines of top-level `import …` / `export …` statements (ESM in MDX). */
export function findEsmLines(body: string): number[] {
  const masked = maskNonProse(body, { math: false });
  const out: number[] = [];
  masked.split('\n').forEach((raw, idx) => {
    if (/^(import|export)\s/.test(raw)) out.push(idx + 1);
  });
  return out;
}

export interface MathSpan {
  tex: string;
  display: boolean;
  line: number;
}

/** Every `$…$` and `$$…$$` span outside code blocks (used by the homework-safety check). */
export function findMathSpans(body: string): MathSpan[] {
  const noCode = maskNonProse(body, { math: false });
  const line = lineIndex(noCode);
  const out: MathSpan[] = [];
  const n = noCode.length;
  let i = 0;
  while (i < n) {
    const ch = noCode[i];
    if (ch === '\\' && noCode[i + 1] === '$') {
      i += 2;
      continue;
    }
    if (ch === '$') {
      if (noCode[i + 1] === '$') {
        const close = noCode.indexOf('$$', i + 2);
        if (close === -1) break;
        out.push({
          tex: noCode.slice(i + 2, close),
          display: true,
          line: line(i),
        });
        i = close + 2;
        continue;
      }
      const lineEnd = noCode.indexOf('\n', i + 1);
      const limit = lineEnd === -1 ? n : lineEnd;
      let k = i + 1;
      let found = -1;
      while (k < limit) {
        if (noCode[k] === '\\') {
          k += 2;
          continue;
        }
        if (noCode[k] === '$') {
          found = k;
          break;
        }
        k++;
      }
      if (found !== -1) {
        out.push({
          tex: noCode.slice(i + 1, found),
          display: false,
          line: line(i),
        });
        i = found + 1;
        continue;
      }
    }
    i++;
  }
  return out;
}
