/**
 * Numbers, labels, and slide references derived from content ids
 * (STYLE_GUIDE.md §3; VISION.md §9.1: numbering is derived from `id`, never
 * from position, so it is stable across builds).
 *
 *   numberFromId('def-6-3-1')  → '6.3.1'
 *   labelFromId('def-6-3-1')   → 'Definition 6.3.1'
 *   eqRefText('eq-6-3-1')      → '(6.3.1)'
 *   parseSlideSource('L9 p.24 (stated)') → { lecture: 9, pages: '24', note: '(stated)' }
 *   formatPages('12-14')       → 'pp.12–14'
 *
 * Framework-free so scripts and tests can import it without Astro.
 */

/** Id prefixes in the contract and the label each one prints. */
export const KIND_LABELS = {
  def: 'Definition',
  thm: 'Theorem',
  prop: 'Proposition',
  lem: 'Lemma',
  der: 'Derivation',
  eq: 'Equation',
} as const;

export type KindPrefix = keyof typeof KIND_LABELS;
export type KindLabel = (typeof KIND_LABELS)[KindPrefix];

const ID_PATTERN = /^([a-z]+)(?:-(\d+(?:-\d+)*))?$/;

/** The alphabetic prefix of an id (`def-6-3-1` → `def`), or `null` if the id is malformed. */
export function kindFromId(id: string): string | null {
  const match = ID_PATTERN.exec(id.trim());
  return match?.[1] ?? null;
}

/** The dotted number of an id (`def-6-3-1` → `6.3.1`); empty when the id carries no number. */
export function numberFromId(id: string): string {
  const match = ID_PATTERN.exec(id.trim());
  if (!match) return '';
  return (match[2] ?? '').replace(/-/g, '.');
}

/**
 * The label printed on a box (`def-6-3-1` → `Definition 6.3.1`). An explicit
 * `kind` wins over the prefix, so `<Theorem id="thm-…">` and a mismatched id
 * still print what the author wrote. Unknown prefixes are capitalized as is.
 */
export function labelFromId(id: string, kind?: KindLabel): string {
  const prefix = kindFromId(id);
  const number = numberFromId(id);
  const label =
    kind ??
    (prefix && prefix in KIND_LABELS
      ? KIND_LABELS[prefix as KindPrefix]
      : prefix
        ? prefix.charAt(0).toUpperCase() + prefix.slice(1)
        : '');
  return [label, number].filter(Boolean).join(' ');
}

/** The text of an equation reference (`eq-6-3-1` → `(6.3.1)`); falls back to the raw id. */
export function eqRefText(id: string): string {
  const number = numberFromId(id);
  return number ? `(${number})` : `(${id})`;
}

/** A parsed `source` prop (`L9 p.24 (stated: 'recall…')`). */
export interface SlideSource {
  lecture: number;
  /** Pages as written, with ranges normalized to a hyphen: `24`, `12-14`. */
  pages: string;
  /** Anything after the page reference, trimmed; empty when there is none. */
  note: string;
}

const SOURCE_PATTERN = /^\s*L(\d+)\s*p+\.?\s*(\d+(?:\s*[–-]\s*\d+)?)\s*(.*)$/s;

/** Parse a `source` string; `null` when it does not start with `L<n> p.<k>`. */
export function parseSlideSource(source: string): SlideSource | null {
  const match = SOURCE_PATTERN.exec(source);
  if (!match?.[1] || !match[2]) return null;
  return {
    lecture: Number(match[1]),
    pages: match[2].replace(/\s*[–-]\s*/, '-'),
    note: (match[3] ?? '').trim(),
  };
}

/** `47` → `p.47`; `12-14` or `12–14` → `pp.12–14` (en dash in print). */
export function formatPages(pages: string): string {
  const trimmed = pages.trim();
  const range = /^(\d+)\s*[–-]\s*(\d+)$/.exec(trimmed);
  if (range) return `pp.${range[1]}–${range[2]}`;
  return `p.${trimmed}`;
}

/** The chip text for a slide reference: `L7 p.47`, `L7 pp.12–14`. */
export function slideRefLabel(lecture: number, pages: string): string {
  return `L${lecture} ${formatPages(pages)}`;
}

/** The anchor in `/materials` for a slide reference: `/materials#L7-p47`, `/materials#L7-p12-14`. */
export function slideRefHref(lecture: number, pages: string): string {
  const normalized = pages.trim().replace(/\s*[–-]\s*/, '-');
  return `/materials#L${lecture}-p${normalized}`;
}

/** Kebab-case slug of a free string (`Lecture 8 Code Companion.ipynb` → `lecture-8-code-companion-ipynb`). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
