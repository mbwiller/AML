import { describe, expect, it } from 'vitest';

import { quizItemSchema, type Lesson, type Unit } from '@/lib/content/schemas';

import type { LessonSource } from './cards';
import { buildQuizBank } from './quiz-bank';

const unit: Unit = { id: 'u6-nb', title: 'NB', order: 6, summary: 's', lectures: 'L9' };

function lesson(slug: string, order: number, status: Lesson['status'], body: string): LessonSource {
  return {
    data: {
      title: slug,
      unit: unit.id,
      order,
      slug,
      summary: 's',
      lectures: [],
      concepts: [],
      prerequisites: [],
      homework: [],
      cases: [],
      estimatedMinutes: 10,
      status,
      authors: [],
    },
    body,
  };
}

const BODY = `
<Derivation id="der-6-3-2" title="t" goalTex="a" resultTex="b">
<Step justification="one">
$$a = 1$$
</Step>
<Step justification="two">
$$b = 2$$
</Step>
</Derivation>

<Pitfall title="Zero counts" misconception="nb-zero-prob">
Body.
</Pitfall>
`;

const items = [
  {
    id: 'q-1',
    lesson: 'naive-bayes',
    concepts: ['bernoulli-nb-mle'],
    type: 'mc',
    prompt: 'Pick $x$.',
    options: [
      { text: 'right', correct: true },
      { text: 'zero', misconception: 'nb-zero-prob' },
    ],
    explanation: 'See der-6-3-2 step 2.',
    discriminates: ['ridge', 'lasso'],
  },
  {
    id: 'q-2',
    lesson: 'naive-bayes',
    type: 'numeric',
    prompt: '$s/n$ with s = 6, n = 40',
    answer: 0.15,
    tolerance: 0.005,
    seeded: { s: [3, 6], n: [20, 40] },
    formula: 's / n',
  },
  {
    id: 'q-3',
    lesson: 'naive-bayes',
    type: 'which-step',
    derivation: 'der-6-3-2',
    corrupt: { step: 2, replaceTex: 'b = 3', explanation: 'Wrong.' },
  },
  { id: 'q-4', lesson: 'naive-bayes', type: 'order', prompt: 'Order these.' },
  {
    id: 'q-5',
    lesson: 'draft-lesson',
    type: 'mc',
    prompt: 'p',
    options: [{ text: 'a', correct: true }, { text: 'b' }],
  },
].map((i) => ({ ...quizItemSchema.parse(i), unit: unit.id }));

describe('buildQuizBank', () => {
  const bank = buildQuizBank({
    items,
    lessons: [lesson('naive-bayes', 3, 'review', BODY), lesson('draft-lesson', 4, 'draft', '')],
    units: [unit],
    nodes: [],
    dev: false,
  });

  it('keeps gradable items of visible lessons only', () => {
    expect(bank.items.map((i) => i.id)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(bank.units.map((u) => u.id)).toEqual([unit.id]);
  });

  it('renders HTML and resolves pitfall and derivation-step links to lesson URLs', () => {
    const mc = bank.items[0];
    if (mc?.type !== 'mc') throw new Error('expected mc');
    expect(mc.promptHtml).toContain('class="katex"');
    expect(mc.options[0]?.correct).toBe(true);
    expect(mc.options[1]?.pitfallHref).toBe(`/units/${unit.id}/naive-bayes#pitfall-nb-zero-prob`);
    expect(mc.derivationLink).toEqual({
      href: `/units/${unit.id}/naive-bayes#der-6-3-2-step-2`,
      label: 'Go to step 2 (Lesson 6.3)',
    });
    expect(mc.discriminates).toEqual(['ridge', 'lasso']);
  });

  it('carries the numeric client copy and builds which-step lists', () => {
    const num = bank.items[1];
    if (num?.type !== 'numeric') throw new Error('expected numeric');
    expect(num).toMatchObject({ answer: 0.15, tolerance: 0.005, formula: 's / n' });
    expect(num.hint).toContain('within ±0.005');
    const ws = bank.items[2];
    if (ws?.type !== 'which-step') throw new Error('expected which-step');
    expect(ws.steps).toHaveLength(2);
    expect(ws.corrupt).toEqual({ step: 2 });
    expect(ws.derivationLink?.href).toBe(`/units/${unit.id}/naive-bayes#der-6-3-2-step-2`);
  });
});
