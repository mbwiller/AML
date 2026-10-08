import { describe, expect, it } from 'vitest';

import type { Flashcard, Lesson, Unit } from '@/lib/content/schemas';

import { buildDeck, clozeFromTitle, deckStats, type LessonSource } from './cards';
import { parseBlocks, renderProse, stripAnchors } from './render';

const unit: Unit = {
  id: 'u6-generative-models-and-naive-bayes',
  title: 'Generative models and Naive Bayes',
  order: 6,
  summary: 's',
  lectures: 'L8',
};

function lesson(over: Partial<Lesson>, body: string): LessonSource {
  return {
    data: {
      title: 'Naive Bayes',
      unit: unit.id,
      order: 3,
      slug: 'naive-bayes',
      summary: 's',
      lectures: [],
      concepts: ['naive-bayes-assumption', 'bernoulli-nb-mle', 'laplace-smoothing'],
      prerequisites: [],
      homework: [],
      cases: [],
      estimatedMinutes: 30,
      status: 'review',
      authors: [],
      ...over,
    },
    body,
  };
}

const BODY = `
## Definitions

<Definition id="def-6-3-2" title="Naive Bayes assumption" source="L9 p.24">

Given the label, the features are [[conditional-independence|conditionally independent]]:

$$p(x \\mid y) = \\prod_{j=1}^{d} p(x_j \\mid y). \\tag{6.3.1} \\htmlId{eq-6-3-1}{}$$

It says nothing about the marginal. <SlideRef lecture={9} pages="24" />

</Definition>

<Definition id="def-6-3-9" title="Vocabulary" source="L9 p.10">

The set $V$ of words we keep, see <EqRef id="eq-6-3-1" />.

- one
- two

</Definition>

<Derivation
  id="der-6-3-4"
  title="The MLE of ψ_jk is a coin-flip frequency"
  goalTex="\\hat\\psi_{jk}"
  resultTex="\\hat\\psi_{jk} = \\frac{n_{jk}}{n_k}"
  source="L9 p.33 (stated)"
>
<Step justification="j">
$$a = b$$
</Step>
</Derivation>

<Derivation id="der-6-3-7" title="Log-space scores, and posteriors through log-sum-exp" goalTex="a" resultTex="\\log p">
</Derivation>
`;

const graphNodes = [
  { id: 'bernoulli-nb-mle', label: 'Bernoulli NB MLE', derivation: 'der-6-3-4' },
  { id: 'naive-bayes-assumption', label: 'Naive Bayes assumption' },
];

describe('clozeFromTitle', () => {
  it('blanks the predicate noun phrase after is/are', () => {
    expect(clozeFromTitle('The MLE of μ_k is the class mean')).toEqual({
      before: 'The MLE of μ_k is the ',
      term: 'class mean',
      after: '',
    });
    expect(clozeFromTitle('The MLE of Σ_k is the class covariance, divided by n_k')?.term).toBe(
      'class covariance',
    );
    expect(clozeFromTitle('With per-class covariances, the log-odds are quadratic in x')).toEqual({
      before: 'With per-class covariances, the log-odds are ',
      term: 'quadratic',
      after: ' in x',
    });
  });

  it('skips titles without a clear term', () => {
    expect(clozeFromTitle('The pooled-covariance MLE')).toBeNull();
    expect(clozeFromTitle("A linear model's predictions on the whole dataset are Xθ")).toBeNull();
    expect(clozeFromTitle('In a linear model, features do not interact')).toBeNull();
    expect(clozeFromTitle('The estimate is a long weighted average of noisy counts')).toBeNull();
    expect(clozeFromTitle('The sum is not a metric')).toBeNull();
  });
});

describe('render helpers', () => {
  it('strips equation tags and unwraps htmlId', () => {
    expect(stripAnchors('a = b \\tag{6.3.1} \\htmlId{eq-6-3-1}{}')).toBe('a = b');
    expect(stripAnchors('\\htmlId{x}{c^2} + 1')).toBe('c^2 + 1');
  });

  it('renders stickies, EqRefs, emphasis, and math in prose', () => {
    const html = renderProse(
      'See [[bayes-rule]] and [[a|the A]] in <EqRef id="eq-2-4-1" />, **bold** $x$.',
    );
    expect(html).toContain('bayes rule');
    expect(html).toContain('the A');
    expect(html).toContain('(2.4.1)');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('[[');
  });

  it('splits blocks into math, paragraphs, and lists', () => {
    const blocks = parseBlocks(
      'Para one\nline two\n\n$$\nx\n$$\n\n- a\n- b\n\n<SlideRef lecture={1} pages="2" />',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['para', 'math', 'list']);
  });
});

describe('buildDeck', () => {
  const deck = buildDeck({
    lessons: [lesson({}, BODY)],
    units: [unit],
    nodes: graphNodes,
    dev: false,
  });

  it('makes one card per definition and when/cloze cards per derivation, with stable ids', () => {
    expect(deck.cards.map((c) => c.id)).toEqual([
      'card:def-6-3-2',
      'card:def-6-3-9',
      'card:der-6-3-4:when',
      'card:der-6-3-4:cloze',
      'card:der-6-3-7:when',
    ]);
    expect(deckStats(deck)).toEqual({
      'statement-formula': 2,
      'formula-when': 2,
      cloze: 1,
      total: 5,
    });
  });

  it('puts the first display formula and first paragraph on a definition back', () => {
    const def = deck.cards[0];
    expect(def?.frontHtml).toContain('Naive Bayes assumption');
    expect(def?.frontHtml).toContain('write its formula');
    expect(def?.backHtml).toContain('pc-formula');
    expect(def?.backHtml).toContain('conditionally independent');
    expect(def?.backHtml).not.toContain('eq-6-3-1');
    expect(def?.backHtml).not.toContain('6.3.1');
    expect(def?.backHtml).not.toContain('marginal');
  });

  it('uses the paragraph and the list when a definition has no display math', () => {
    const def = deck.cards[1];
    expect(def?.frontHtml).toContain('in your own words');
    expect(def?.backHtml).toContain('<ul><li>one</li><li>two</li></ul>');
  });

  it('records lesson, unit, source link, and narrowed concepts', () => {
    const [def, , when, cloze, when2] = deck.cards;
    expect(def).toMatchObject({
      lesson: `${unit.id}/naive-bayes`,
      lessonNumber: '6.3',
      unit: unit.id,
      source: `/units/${unit.id}/naive-bayes#def-6-3-2`,
      concepts: ['naive-bayes-assumption'],
      provenance: 'L9 p.24',
    });
    expect(when?.concepts).toEqual(['bernoulli-nb-mle']);
    expect(when?.frontHtml).toContain('When does this hold');
    expect(when?.backHtml).toContain('coin-flip frequency');
    expect(cloze?.frontHtml).toContain('[…]');
    expect(cloze?.frontHtml).not.toContain('coin-flip');
    expect(cloze?.backHtml).toContain('<mark class="pc-answer">coin-flip frequency</mark>');
    // No node establishes der-6-3-7: fall back to the lesson's concepts.
    expect(when2?.concepts).toEqual([
      'naive-bayes-assumption',
      'bernoulli-nb-mle',
      'laplace-smoothing',
    ]);
    expect(deck.concepts['bernoulli-nb-mle']).toBe('Bernoulli NB MLE');
  });

  it('hides draft lessons in production and shows them in dev', () => {
    const draft = lesson({ status: 'draft' }, BODY);
    expect(buildDeck({ lessons: [draft], units: [unit], dev: false }).cards).toHaveLength(0);
    expect(buildDeck({ lessons: [draft], units: [unit], dev: true }).cards).toHaveLength(5);
  });

  it('is deterministic', () => {
    const again = buildDeck({
      lessons: [lesson({}, BODY)],
      units: [unit],
      nodes: graphNodes,
      dev: false,
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(deck));
  });

  it('adds YAML cards after the lesson, with cloze blanks and a step link', () => {
    const fc: Flashcard = {
      id: 'fc-u6-l3-010',
      lesson: 'naive-bayes',
      concept: 'laplace-smoothing',
      type: 'cloze',
      front:
        'Add-one smoothing: $\\hat\\psi_{jk} = \\dfrac{s + {{c1::1}}}{n_k + {{c2::2}}}$. Why {{c3::2}}?',
      back: 'One pseudo-count for each outcome.',
      derivationStep: 'der-6-3-4#2',
      unit: unit.id,
    };
    const withYaml = buildDeck({
      lessons: [lesson({}, BODY)],
      units: [unit],
      flashcards: [fc],
      dev: false,
    });
    const card = withYaml.cards.at(-1);
    expect(card?.id).toBe('fc-u6-l3-010');
    expect(card?.concepts).toEqual(['laplace-smoothing']);
    expect(card?.source).toBe(`/units/${unit.id}/naive-bayes#der-6-3-4-step-2`);
    expect(card?.frontHtml).toContain('pc-blank');
    expect(card?.frontHtml).not.toContain('{{c');
    expect(card?.frontHtml).not.toContain('katex-error');
    expect(card?.backHtml).toContain('<mark class="pc-answer">2</mark>');
    expect(card?.backHtml).toContain('pseudo-count');
  });
});
