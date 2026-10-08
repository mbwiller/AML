/**
 * The flashcard deck, built at build time from the lessons
 * (docs/CONTENT_AUTHORING.md §8; VISION.md §9.5). Pure and deterministic: the
 * same content always yields the same cards, ids, and HTML.
 *
 * Generated cards, in lesson order and document order within a lesson:
 *
 * - one **statement → formula** card per `<Definition>` (`card:<def-id>`):
 *   front = the title and "state the definition"; back = the body's first
 *   display formula and its first paragraph ("say it in words"), or the first
 *   paragraph (plus a list that follows it) when the body has no display math;
 * - one **formula → when/why** card per `<Derivation>` with a `resultTex`
 *   (`card:<der-id>:when`): front = the result; back = the title (which states
 *   the conditions) and the slide provenance;
 * - one **cloze** card per `<Derivation>` whose title names the result's key
 *   term (`card:<der-id>:cloze`, see `clozeFromTitle`); skipped otherwise;
 * - every hand-written card in `src/content/flashcards/*.yaml`, by its own id,
 *   after the generated cards of its lesson.
 *
 * Draft lessons follow src/lib/lessons.ts `isNavigable`: hidden in production,
 * visible in `pnpm dev`. Cards from hidden lessons are not emitted.
 */
import { findBlocks } from '@/lib/content/mdx-scan';
import type { Flashcard, GlossaryTerm, GraphNode, Lesson, Unit } from '@/lib/content/schemas';
import { isNavigable, lessonHref, lessonNumber, unitNumber } from '@/lib/lessons';
import { escapeHtml, renderDisplayTex } from '@/lib/markdown/render-tex';

import { parseBlocks, renderBlock, renderProse, stripAnchors, type Block } from './render';
import type { CardType, Deck, DeckCard, DeckUnit } from './types';

export interface LessonSource {
  data: Lesson;
  /** Raw MDX body (frontmatter removed). */
  body: string;
}

export interface DeckInput {
  lessons: LessonSource[];
  units: Unit[];
  flashcards?: Flashcard[];
  nodes?: Pick<GraphNode, 'id' | 'label' | 'derivation'>[];
  glossary?: Pick<GlossaryTerm, 'id' | 'term'>[];
  /** `import.meta.env.DEV`: drafts are visible in dev only. */
  dev: boolean;
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

export const definitionCardId = (defId: string) => `card:${defId}`;
export const whenCardId = (derId: string) => `card:${derId}:when`;
export const clozeCardId = (derId: string) => `card:${derId}:cloze`;

// ---------------------------------------------------------------------------
// Cloze term from a derivation title
// ---------------------------------------------------------------------------

export interface ClozeParts {
  before: string;
  term: string;
  after: string;
}

/** Determiners and adverbs stripped from the front of the predicate. */
const LEADING = /^(?:(?:the|a|an|its|their|exactly|always|still|also|just|then)\s+)+/i;
/** The predicate's noun phrase ends at the first of these. */
const STOP_RE =
  /\s*(?:[,;:(]|\s(?:and|with|when|for|under|by|in|on|if|so|because|plus|than|from|to|at|whose)\s)/i;
const WORD_RE = /^[A-Za-z][A-Za-z'-]*$/;
const MAX_TERM_WORDS = 4;

/**
 * The key term of a derivation title of the form "<subject> is|are <term>…",
 * e.g. "The MLE of μ_k is the class mean" → `class mean`. The term is the
 * predicate's leading noun phrase: determiners stripped, cut at the first
 * comma or preposition, 1–4 plain words (no symbols, digits, or Greek), and
 * not a negation. Returns null when no such term is clear, and the deck then
 * skips the cloze card.
 */
export function clozeFromTitle(title: string): ClozeParts | null {
  const verb = /\s(is|are)\s/.exec(title);
  if (!verb) return null;
  const head = title.slice(0, verb.index + verb[0].length);
  let rest = title.slice(verb.index + verb[0].length);
  const lead = LEADING.exec(rest)?.[0] ?? '';
  rest = rest.slice(lead.length);
  const stop = STOP_RE.exec(rest);
  const term = (stop ? rest.slice(0, stop.index) : rest).trim();
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_TERM_WORDS) return null;
  if (!words.every((w) => WORD_RE.test(w))) return null;
  if (/^(not|no|never|only)$/i.test(words[0] ?? '')) return null;
  return {
    before: head + lead,
    term,
    after: rest.slice(term.length),
  };
}

// ---------------------------------------------------------------------------
// Hand-written cloze syntax: {{c1::text}}
// ---------------------------------------------------------------------------

const CLOZE_RE = /\{\{c\d+::([\s\S]*?)\}\}/g;

function clozeFront(text: string): string {
  return renderProse(text, {
    mapTex: (tex) => tex.replace(CLOZE_RE, '\\boxed{\\;?\\;}'),
    mapHtml: (html) => html.replace(CLOZE_RE, '<span class="pc-blank">[…]</span>'),
  });
}

function clozeBack(text: string): string {
  return renderProse(text, {
    mapTex: (tex) => tex.replace(CLOZE_RE, '\\boxed{$1}'),
    mapHtml: (html) => html.replace(CLOZE_RE, '<mark class="pc-answer">$1</mark>'),
  });
}

// ---------------------------------------------------------------------------
// Card bodies
// ---------------------------------------------------------------------------

const p = (cls: string, html: string) => `<p class="${cls}">${html}</p>`;

function definitionBack(blocks: Block[]): string | null {
  const isAlso = (b: Block) => b.kind === 'para' && /^\s*Also written as/i.test(b.text);
  const body = blocks.filter((b) => !isAlso(b));
  const formula = body.findIndex((b) => b.kind === 'math');
  const prose = body.findIndex((b) => b.kind !== 'math');
  const picked = new Set<number>();
  if (formula !== -1) picked.add(formula);
  if (prose !== -1) {
    picked.add(prose);
    // Without a formula, a list right after the lead paragraph is the definition itself.
    if (formula === -1 && body[prose]?.kind === 'para' && body[prose + 1]?.kind === 'list') {
      picked.add(prose + 1);
    }
  }
  // Source order, so a sentence ending in a colon still precedes its formula.
  const parts = [...picked]
    .sort((a, b) => a - b)
    .flatMap((i) => {
      const b = body[i];
      return b ? [renderBlock(b)] : [];
    });
  return parts.length ? parts.join('') : null;
}

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const slug = (s: string) => norm(s).replace(/ /g, '-');

interface ConceptIndex {
  byDerivation: Map<string, string[]>;
  labels: Map<string, string>;
}

function conceptIndex(input: DeckInput): ConceptIndex {
  const byDerivation = new Map<string, string[]>();
  const labels = new Map<string, string>();
  for (const g of input.glossary ?? []) labels.set(g.id, g.term);
  for (const n of input.nodes ?? []) {
    labels.set(n.id, n.label);
    if (n.derivation) {
      const list = byDerivation.get(n.derivation) ?? [];
      list.push(n.id);
      byDerivation.set(n.derivation, list);
    }
  }
  return { byDerivation, labels };
}

/** A definition's concept: the lesson concept whose id or label matches the title, else all of them. */
function definitionConcepts(title: string, lesson: Lesson, index: ConceptIndex): string[] {
  const t = norm(title);
  const hit = lesson.concepts.filter(
    (c) => c === slug(title) || norm(index.labels.get(c) ?? '') === t,
  );
  return hit.length ? hit : [...lesson.concepts];
}

/** A derivation's concepts: the graph nodes it establishes, else the lesson's concepts. */
function derivationConcepts(derId: string, lesson: Lesson, index: ConceptIndex): string[] {
  const nodes = index.byDerivation.get(derId);
  return nodes?.length ? [...nodes] : [...lesson.concepts];
}

// ---------------------------------------------------------------------------
// Deck
// ---------------------------------------------------------------------------

export function deckUnits(units: Unit[]): DeckUnit[] {
  return [...units]
    .sort((a, b) => a.order - b.order)
    .map((u) => ({ id: u.id, title: u.title, number: String(unitNumber(u.id) ?? u.order) }));
}

function sortedVisible(input: DeckInput): LessonSource[] {
  const unitOrder = new Map(input.units.map((u) => [u.id, u.order]));
  return input.lessons
    .filter((l) => isNavigable(l.data, input.dev))
    .sort(
      (a, b) =>
        (unitOrder.get(a.data.unit) ?? Number.MAX_SAFE_INTEGER) -
          (unitOrder.get(b.data.unit) ?? Number.MAX_SAFE_INTEGER) || a.data.order - b.data.order,
    );
}

/** Lesson canonical id for a YAML `lesson` field (`<unit>/<slug>` or a bare slug). */
function resolveLessonRef(
  ref: string,
  lessons: LessonSource[],
  unit?: string,
): LessonSource | undefined {
  if (ref.includes('/')) return lessons.find((l) => `${l.data.unit}/${l.data.slug}` === ref);
  const matches = lessons.filter((l) => l.data.slug === ref);
  return matches.find((l) => l.data.unit === unit) ?? matches[0];
}

/** Derivation id → the lesson whose body defines it. */
export function derivationIndex(lessons: LessonSource[]): Map<string, LessonSource> {
  const out = new Map<string, LessonSource>();
  for (const l of lessons) {
    for (const d of findBlocks(l.body, 'Derivation')) {
      const id = d.attrs['id'];
      if (typeof id === 'string' && !out.has(id)) out.set(id, l);
    }
  }
  return out;
}

export function buildDeck(input: DeckInput): Deck {
  const lessons = sortedVisible(input);
  const index = conceptIndex(input);
  const derivations = derivationIndex(lessons);
  const cards: DeckCard[] = [];
  const conceptIds = new Set<string>();

  const yamlByLesson = new Map<LessonSource, Flashcard[]>();
  for (const fc of input.flashcards ?? []) {
    const lesson = resolveLessonRef(fc.lesson, lessons, fc.unit);
    if (!lesson) continue; // hidden (draft) or unknown lesson: the validator reports unknown ones
    const list = yamlByLesson.get(lesson) ?? [];
    list.push(fc);
    yamlByLesson.set(lesson, list);
  }

  for (const lesson of lessons) {
    const { data, body } = lesson;
    const href = lessonHref(data.unit, data.slug);
    const base = {
      lesson: `${data.unit}/${data.slug}`,
      lessonNumber: lessonNumber(data.unit, data.order),
      lessonTitle: data.title,
      unit: data.unit,
    };
    const push = (card: Omit<DeckCard, keyof typeof base>) => {
      card.concepts.forEach((c) => conceptIds.add(c));
      cards.push({ ...base, ...card });
    };

    // Definitions and derivations in document order.
    const defs = findBlocks(body, 'Definition').map((b) => ({ kind: 'def' as const, b }));
    const ders = findBlocks(body, 'Derivation').map((b) => ({ kind: 'der' as const, b }));
    const blocks = [...defs, ...ders].sort((x, y) => x.b.line - y.b.line);

    for (const { kind, b } of blocks) {
      const id = typeof b.attrs['id'] === 'string' ? b.attrs['id'] : undefined;
      const title = typeof b.attrs['title'] === 'string' ? b.attrs['title'] : undefined;
      const provenance = typeof b.attrs['source'] === 'string' ? b.attrs['source'] : undefined;
      if (!id || !title) continue;

      if (kind === 'def') {
        const parsed = parseBlocks(b.inner);
        const back = definitionBack(parsed);
        if (!back) continue;
        const hasFormula = parsed.some((x) => x.kind === 'math');
        push({
          id: definitionCardId(id),
          type: 'statement-formula',
          origin: 'definition',
          concepts: definitionConcepts(title, data, index),
          source: `${href}#${id}`,
          title,
          provenance,
          frontHtml:
            p('pc-kicker', 'Definition') +
            p('pc-title', renderProse(title)) +
            p(
              'pc-prompt',
              hasFormula
                ? 'State the definition and write its formula.'
                : 'State the definition in your own words.',
            ),
          backHtml: back,
        });
        continue;
      }

      const resultTex = typeof b.attrs['resultTex'] === 'string' ? b.attrs['resultTex'] : undefined;
      if (!resultTex) continue;
      const concepts = derivationConcepts(id, data, index);
      const formula = `<div class="pc-formula">${renderDisplayTex(stripAnchors(resultTex))}</div>`;
      const meta = provenance
        ? p('pc-meta', `${escapeHtml(id)} · ${renderProse(provenance)}`)
        : p('pc-meta', escapeHtml(id));
      push({
        id: whenCardId(id),
        type: 'formula-when',
        origin: 'derivation',
        concepts,
        source: `${href}#${id}`,
        title,
        provenance,
        frontHtml:
          p('pc-kicker', 'Result') + formula + p('pc-prompt', 'When does this hold, and why?'),
        backHtml: p('pc-title', renderProse(title)) + meta,
      });

      const cloze = clozeFromTitle(title);
      if (cloze) {
        // renderProse trims, so put back the spaces around the blank.
        const before = renderProse(cloze.before) + (/\s$/.test(cloze.before) ? ' ' : '');
        const after = (/^\s/.test(cloze.after) ? ' ' : '') + renderProse(cloze.after);
        const sentence = (blank: string) => p('pc-cloze', `${before}${blank}${after}`);
        push({
          id: clozeCardId(id),
          type: 'cloze',
          origin: 'derivation',
          concepts,
          source: `${href}#${id}`,
          title,
          provenance,
          frontHtml:
            p('pc-kicker', 'Fill the blank') +
            sentence('<span class="pc-blank">[…]</span>') +
            formula,
          backHtml: sentence(`<mark class="pc-answer">${escapeHtml(cloze.term)}</mark>`) + formula,
        });
      }
    }

    for (const fc of yamlByLesson.get(lesson) ?? []) {
      const step = fc.derivationStep ? /^(.+)#(\d+)$/.exec(fc.derivationStep) : null;
      const target = step?.[1] ? derivations.get(step[1]) : undefined;
      const source =
        step?.[1] && step[2]
          ? `${target ? lessonHref(target.data.unit, target.data.slug) : href}#${step[1]}-step-${step[2]}`
          : href;
      const type: CardType = fc.type;
      push({
        id: fc.id,
        type,
        origin: 'yaml',
        concepts: [fc.concept],
        source,
        title: fc.front
          .replace(CLOZE_RE, '…')
          .replace(/\$[^$]*\$/g, '…')
          .slice(0, 80),
        frontHtml:
          type === 'cloze'
            ? p('pc-kicker', 'Fill the blank') + p('pc-cloze', clozeFront(fc.front))
            : p('pc-body', renderProse(fc.front)),
        backHtml:
          type === 'cloze'
            ? p('pc-cloze', clozeBack(fc.front)) + p('pc-body', renderProse(fc.back))
            : p('pc-body', renderProse(fc.back)),
      });
    }
  }

  const concepts: Record<string, string> = {};
  for (const c of [...conceptIds].sort()) concepts[c] = index.labels.get(c) ?? c.replace(/-/g, ' ');

  return { version: 1, cards, units: deckUnits(input.units), concepts };
}

/** Cards by type, for reports and the README. */
export function deckStats(deck: Deck): Record<CardType, number> & { total: number } {
  const out = { 'statement-formula': 0, 'formula-when': 0, cloze: 0, total: deck.cards.length };
  for (const c of deck.cards) out[c.type]++;
  return out;
}
