import { describe, expect, it } from 'vitest';

import {
  PRACTICE_HREF,
  buildBridgeContext,
  formatDueDate,
  homeworkState,
  isPastDue,
  linkQuizIds,
  practiceHref,
  resolveSkill,
  type BridgeLesson,
} from './homework';

const NB_BODY = `
## Fitting by maximum likelihood

<Derivation id="der-6-3-3" title="The MLE of psi" goalTex="\\hat\\psi">
<Step justification="log of a product">$a = b$</Step>
</Derivation>

<Check ids={["q-u6-l3-009", "q-u6-l3-007"]} />

\`\`\`
<Check ids={["q-u6-l3-099"]} />
\`\`\`
`;

const GDA_BODY = `
<Derivation id="der-7-2-3" title="The MLE of mu">
<Step justification="gradient of a quadratic form">$x$</Step>
</Derivation>

<Check ids={["q-u7-l2-005"]} />
<Check ids={["q-u6-l3-009"]} />
`;

function lesson(
  partial: Partial<BridgeLesson> & Pick<BridgeLesson, 'unit' | 'slug'>,
): BridgeLesson {
  return {
    id: `${partial.unit}/${partial.slug}`,
    title: partial.slug,
    number: '0.0',
    href: `/units/${partial.unit}/${partial.slug}`,
    concepts: [],
    body: '',
    ...partial,
  };
}

const nb = lesson({
  unit: 'u6-generative-models-and-naive-bayes',
  slug: 'naive-bayes',
  title: 'Naive Bayes',
  number: '6.3',
  concepts: ['bernoulli-nb-mle', 'laplace-smoothing'],
  body: NB_BODY,
});
const gda = lesson({
  unit: 'u7-gaussian-discriminant-analysis',
  slug: 'gaussian-discriminant-analysis',
  title: 'Gaussian discriminant analysis',
  number: '7.2',
  concepts: ['gda-mle-mean'],
  body: GDA_BODY,
});
const spam = lesson({
  unit: 'u6-generative-models-and-naive-bayes',
  slug: 'spam-exercise',
  title: 'The spam exercise',
  number: '6.4',
  concepts: ['bernoulli-nb-mle'],
});

const ctx = buildBridgeContext({
  lessons: [nb, spam, gda],
  nodes: [
    {
      id: 'bernoulli-nb-mle',
      label: 'Bernoulli NB MLE',
      unit: 'u6-generative-models-and-naive-bayes',
      lesson: 'naive-bayes',
      derivation: 'der-6-3-3',
    },
    {
      id: 'gda-mle-mean',
      label: 'GDA MLE of the mean',
      unit: 'u7-gaussian-discriminant-analysis',
      lesson: 'gaussian-discriminant-analysis',
      derivation: 'der-7-2-3',
    },
    {
      id: 'gda-prediction',
      label: 'GDA prediction',
      unit: 'u7-gaussian-discriminant-analysis',
      lesson: 'gaussian-discriminant-analysis',
      derivation: 'der-7-2-9',
    },
  ],
  glossary: [{ id: 'covariance', term: 'Covariance' }],
  quizzes: [
    { id: 'q-u6-l3-009', concepts: ['bernoulli-nb-mle'] },
    { id: 'q-u6-l3-007', concepts: ['bernoulli-nb-mle', 'categorical-prior-mle'] },
    { id: 'q-u6-l3-001', concepts: ['bernoulli-nb-mle'] },
    { id: 'q-u7-l2-005', concepts: ['gda-mle-mean'] },
  ],
});

describe('buildBridgeContext', () => {
  it('indexes derivations and checks by the lesson that defines them, first lesson wins', () => {
    expect(ctx.derivations.get('der-6-3-3')).toBe(nb);
    expect(ctx.derivations.get('der-7-2-3')).toBe(gda);
    expect(ctx.checks.get('q-u6-l3-009')).toBe(nb);
    expect(ctx.checks.get('q-u7-l2-005')).toBe(gda);
  });

  it('ignores <Check> inside code blocks', () => {
    expect(ctx.checks.has('q-u6-l3-099')).toBe(false);
  });
});

describe('resolveSkill', () => {
  it('links every lesson whose concepts include the skill, in course order, and the derivation anchor', () => {
    const r = resolveSkill(ctx, 'bernoulli-nb-mle');
    expect(r.known).toBe(true);
    expect(r.label).toBe('Bernoulli NB MLE');
    expect(r.lessons.map((l) => l.href)).toEqual([nb.href, spam.href]);
    expect(r.derivation).toEqual({
      id: 'der-6-3-3',
      label: 'Derivation 6.3.3',
      href: `${nb.href}#der-6-3-3`,
    });
  });

  it('links practice items to their inline check, else to /practice, inline first', () => {
    const r = resolveSkill(ctx, 'bernoulli-nb-mle');
    expect(r.practice).toEqual([
      { id: 'q-u6-l3-007', href: `${nb.href}#check-q-u6-l3-007`, inline: true },
      { id: 'q-u6-l3-009', href: `${nb.href}#check-q-u6-l3-009`, inline: true },
      { id: 'q-u6-l3-001', href: PRACTICE_HREF, inline: false },
    ]);
  });

  it("falls back to the graph node's lesson when no frontmatter lists the concept", () => {
    const r = resolveSkill(ctx, 'gda-prediction');
    expect(r.lessons.map((l) => l.href)).toEqual([gda.href]);
    // der-7-2-9 is not defined in any lesson body, so no derivation link.
    expect(r.derivation).toBeUndefined();
    expect(r.practice).toEqual([]);
  });

  it('resolves glossary terms and unknown ids without throwing', () => {
    expect(resolveSkill(ctx, 'covariance')).toMatchObject({ label: 'Covariance', known: true });
    const unknown = resolveSkill(ctx, 'no-such-skill');
    expect(unknown).toMatchObject({ label: 'no such skill', known: false, lessons: [] });
  });
});

describe('practice links in homework tables', () => {
  it('practiceHref points at the hosting check or /practice', () => {
    expect(practiceHref(ctx, 'q-u7-l2-005')).toBe(`${gda.href}#check-q-u7-l2-005`);
    expect(practiceHref(ctx, 'q-u6-l3-001')).toBe('/practice');
  });

  it('linkQuizIds links bare ids in text and leaves tags and existing links alone', () => {
    const html =
      'q-u6-l3-009, q-u6-l3-001 <a href="/x#q-u6-l3-007">q-u6-l3-007</a> <span title="q-u7-l2-005">—</span>';
    const out = linkQuizIds(html, (id) => practiceHref(ctx, id));
    expect(out).toContain(
      `<a href="${nb.href}#check-q-u6-l3-009" data-practice-item="q-u6-l3-009"><code>q-u6-l3-009</code></a>`,
    );
    expect(out).toContain('<a href="/practice" data-practice-item="q-u6-l3-001">');
    expect(out).toContain('<a href="/x#q-u6-l3-007">q-u6-l3-007</a>');
    expect(out).toContain('<span title="q-u7-l2-005">—</span>');
    expect(out.match(/data-practice-item/g)).toHaveLength(2);
  });
});

describe('homework dates', () => {
  const oct7 = new Date('2026-10-07T12:00:00Z');

  it('live wins over the clock; otherwise past or upcoming by due date', () => {
    expect(homeworkState({ due: '2026-10-19', live: true }, oct7)).toBe('live');
    expect(homeworkState({ due: '2026-09-16', live: false }, oct7)).toBe('past');
    expect(homeworkState({ due: '2026-11-18', live: false }, oct7)).toBe('upcoming');
  });

  it('a homework is not past due on its due date', () => {
    expect(isPastDue('2026-10-07', oct7)).toBe(false);
    expect(isPastDue('2026-10-06', oct7)).toBe(true);
  });

  it('formats due dates in UTC', () => {
    expect(formatDueDate('2026-10-19')).toBe('Monday, October 19, 2026');
  });
});
