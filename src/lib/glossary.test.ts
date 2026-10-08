import { describe, expect, it } from 'vitest';

import type { GlossaryTerm } from './content/schemas';
import {
  FIELD_LABELS,
  FIELD_ORDER,
  groupByField,
  isField,
  knownRelated,
  matchesQuery,
  normalizeSearch,
  placePopover,
  searchText,
  usedBy,
} from './glossary';

const term = (id: string, field: GlossaryTerm['field'], aliases: string[] = []): GlossaryTerm => ({
  id,
  term: id
    .split('-')
    .map((w, i) => (i === 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' '),
  aliases,
  field,
  related: [],
});

describe('groupByField', () => {
  it('orders groups by the style-guide field order and terms alphabetically', () => {
    const groups = groupByField([
      term('trace', 'linear-algebra'),
      term('variance', 'probability'),
      term('determinant', 'linear-algebra'),
      term('bayes-rule', 'probability'),
      term('f1-score', 'evaluation'),
    ]);
    expect(groups.map((g) => g.field)).toEqual(['probability', 'linear-algebra', 'evaluation']);
    expect(groups[0]?.terms.map((t) => t.id)).toEqual(['bayes-rule', 'variance']);
    expect(groups[1]?.terms.map((t) => t.id)).toEqual(['determinant', 'trace']);
    expect(groups[0]?.label).toBe(FIELD_LABELS.probability);
  });

  it('omits empty fields and labels every field', () => {
    expect(groupByField([])).toEqual([]);
    for (const f of FIELD_ORDER) expect(FIELD_LABELS[f]).toMatch(/^[A-Z]/);
    expect(isField('ml')).toBe(true);
    expect(isField('topology')).toBe(false);
    expect(isField(undefined)).toBe(false);
  });
});

describe('matchesQuery', () => {
  const bayes: GlossaryTerm = {
    id: 'bayes-rule',
    term: "Bayes' rule",
    aliases: ["Bayes' theorem", 'Bayes theorem'],
    field: 'probability',
    related: [],
  };

  it('matches on the term, its aliases, and the id, ignoring case and quotes', () => {
    expect(matchesQuery(bayes, 'bayes')).toBe(true);
    expect(matchesQuery(bayes, 'THEOREM')).toBe(true);
    expect(matchesQuery(bayes, 'bayes rule')).toBe(true);
    expect(matchesQuery(bayes, 'Bayes’ rule')).toBe(true);
    expect(matchesQuery(bayes, 'covariance')).toBe(false);
  });

  it('treats an empty or whitespace query as match-all', () => {
    expect(matchesQuery(bayes, '')).toBe(true);
    expect(matchesQuery(bayes, '   ')).toBe(true);
  });

  it('normalizes diacritics and whitespace', () => {
    expect(normalizeSearch('  Σ   Covariance matrix ')).toBe('σ covariance matrix');
    expect(searchText(bayes)).toContain("bayes' theorem");
  });
});

describe('usedBy and knownRelated', () => {
  const lessons = [
    { data: { unit: 'u6', slug: 'a', title: 'A', order: 1, prerequisites: ['bayes-rule'] } },
    { data: { unit: 'u6', slug: 'b', title: 'B', order: 2, prerequisites: ['covariance'] } },
    {
      data: { unit: 'u7', slug: 'c', title: 'C', order: 1, prerequisites: ['bayes-rule', 'trace'] },
    },
  ];

  it('returns the lessons whose prerequisites include the id, in the given order', () => {
    expect(usedBy(lessons, 'bayes-rule').map((l) => l.data.slug)).toEqual(['a', 'c']);
    expect(usedBy(lessons, 'nothing')).toEqual([]);
  });

  it('drops related ids with no glossary file', () => {
    expect(knownRelated(['variance', 'ghost', 'trace'], new Set(['trace', 'variance']))).toEqual([
      'variance',
      'trace',
    ]);
  });
});

describe('placePopover', () => {
  const viewport = { width: 1000, height: 800 };
  const card = { width: 320, height: 200 };

  it('opens below, aligned with the trigger, when there is room', () => {
    const p = placePopover({ top: 100, bottom: 120, left: 50, right: 90 }, card, viewport);
    expect(p).toEqual({ top: 128, left: 50, side: 'below' });
  });

  it('flips above when it does not fit below and there is more room above', () => {
    const p = placePopover({ top: 700, bottom: 720, left: 50, right: 90 }, card, viewport);
    expect(p.side).toBe('above');
    expect(p.top).toBe(700 - 8 - 200);
  });

  it('stays below when neither side fits but below has more room', () => {
    const tall = { width: 320, height: 700 };
    const p = placePopover({ top: 40, bottom: 60, left: 50, right: 90 }, tall, viewport);
    expect(p.side).toBe('below');
    expect(p.top).toBe(68);
  });

  it('clamps horizontally and never goes off the left edge on narrow viewports', () => {
    const phone = { width: 390, height: 700 };
    const wide = { width: 358, height: 200 };
    const right = placePopover({ top: 100, bottom: 120, left: 300, right: 340 }, wide, phone);
    expect(right.left).toBe(390 - 8 - 358);
    const left = placePopover({ top: 100, bottom: 120, left: 2, right: 40 }, wide, phone);
    expect(left.left).toBe(8);
    const overflowing = placePopover(
      { top: 100, bottom: 120, left: 100, right: 140 },
      { width: 500, height: 100 },
      phone,
    );
    expect(overflowing.left).toBe(8);
  });
});
