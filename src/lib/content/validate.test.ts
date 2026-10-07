import { describe, expect, it } from 'vitest';

import {
  findDerivations,
  findHeadings,
  findJsxTags,
  findMathSpans,
  findStickyUses,
  maskNonProse,
  splitFrontmatter,
} from './mdx-scan';
import { quizItemSchema } from './schemas';
import { findCycle, runValidation, summaryLine, type RawFile } from './validate';

// ---------------------------------------------------------------------------
// Fixtures: a minimal, passing content tree held in memory
// ---------------------------------------------------------------------------

const NOW = new Date('2026-10-06T12:00:00Z');
const UNIT = 'u6-generative-models-and-naive-bayes';

const glossaryFile = (id: string, term: string, related: string[] = []): RawFile => ({
  path: `src/content/glossary/${id}.mdx`,
  text: `---
id: ${id}
term: ${term}
field: probability
firstUsedIn: ${UNIT}
related: [${related.join(', ')}]
---

**What it is.** A short definition with $p(x \\mid y)$ in it.

**How ML uses it.** Everywhere.
`,
});

const lessonText = (body: string, extraFrontmatter = ''): string => `---
title: "Naive Bayes"
unit: ${UNIT}
order: 3
slug: naive-bayes
summary: "From the parameter explosion to a closed-form MLE."
lectures:
  - { lecture: 9, pages: "20-40" }
concepts: [bernoulli-nb-mle, laplace-smoothing]
prerequisites: [bayes-rule, bernoulli]
homework: [hw3]
cases: [notes]
estimatedMinutes: 50
status: draft
authors: [jide]
${extraFrontmatter}---

${body}
`;

const LESSON_BODY = `<Frame data="labeled pairs" model="a joint" objective="maximize" optimizer="closed form" />

<Objectives>

- Derive the Bernoulli NB MLE using [[bernoulli]] and [[bayes-rule|Bayes' rule]].

</Objectives>

<Definition id="def-6-3-1" title="Conditional independence" source="L9 p.24">

Features are independent given the label: $p(x \\mid y) = \\prod_j p(x_j \\mid y)$.

</Definition>

<Derivation id="der-6-3-2" title="The MLE of ψ" goalTex="\\hat\\psi = s/n_k" resultTex="\\hat\\psi_{jk} = \\frac{s}{n_k}" source="L9 p.32">

<Chunk title="Isolate the terms">

<Step justification="Bernoulli pmf in product form" sticky="bernoulli">
$$\\log P(x_j \\mid y = k) = x_j \\log \\psi + (1 - x_j)\\log(1 - \\psi)$$
</Step>

<Step justification="first-order condition" fadeable>
$$\\hat\\psi = \\frac{s}{n_k}$$
</Step>

</Chunk>

</Derivation>

<Widget name="bow-nb-scorer" dataset="notes" smoothing={false} challenge="Type a word the training set never saw." />

<Example case="notes" title="Scoring a report">

With $n_k = 40$ and $s = 6$ the estimate is $\\hat\\psi = 6/40$.

</Example>

<Check ids={["q-u6-l3-001", "q-u6-l3-002"]} />

<Pitfall title="Zero counts" misconception="nb-zero-prob">

A zero count is not a zero probability.

</Pitfall>

<HomeworkBridge hw="hw3" skills={["bernoulli-nb-mle"]} />

<Summary>

- $\\hat\\psi_{jk} = s / n_k$.

</Summary>`;

function baseFixture(overrides: Partial<Record<string, string>> = {}): RawFile[] {
  const files: RawFile[] = [
    {
      path: 'src/content/units.yaml',
      text: `- id: ${UNIT}
  title: "Generative models and Naive Bayes"
  order: 6
  summary: "Generative modeling."
  lectures: "L8 pp. 19–43; L9 pp. 1–40"
`,
    },
    {
      path: `src/content/units/${UNIT}/03-naive-bayes.mdx`,
      text: lessonText(LESSON_BODY),
    },
    glossaryFile('bernoulli', 'Bernoulli distribution', ['bayes-rule']),
    glossaryFile('bayes-rule', "Bayes' rule"),
    {
      path: 'src/content/graph/nodes.yaml',
      text: `- id: bernoulli-nb-mle
  label: "Bernoulli NB MLE"
  type: method
  field: ml
  unit: ${UNIT}
  lesson: naive-bayes
  derivation: der-6-3-2
- id: laplace-smoothing
  label: "Laplace smoothing"
  type: method
  field: ml
  unit: ${UNIT}
  lesson: naive-bayes
`,
    },
    {
      path: 'src/content/graph/edges.yaml',
      text: `- { from: bernoulli-nb-mle, to: laplace-smoothing, type: requires }
`,
    },
    {
      path: `src/content/quizzes/${UNIT}.yaml`,
      text: `- id: q-u6-l3-001
  lesson: naive-bayes
  concepts: [bernoulli-nb-mle]
  type: mc
  difficulty: 1
  source: "L9 p.27 poll"
  prompt: "Naive Bayes assumes that, given the label, the features are"
  options:
    - { text: "independent", correct: true }
    - { text: "identically distributed", misconception: nb-iid-confusion }
    - { text: "Gaussian", misconception: nb-requires-gaussian }
  explanation: "Conditional independence."
- id: q-u6-l3-002
  lesson: ${UNIT}/naive-bayes
  concepts: [bernoulli-nb-mle]
  type: numeric
  prompt: "With $n_k = 40$ and $s = 6$, $\\\\hat\\\\psi$ is"
  answer: 0.15
  tolerance: 0.005
  seeded: { n_k: [20, 40], s: [3, 6] }
  formula: "s / n_k"
- id: q-u6-l3-007
  lesson: naive-bayes
  type: which-step
  derivation: der-6-3-2
  corrupt: { step: 2, replaceTex: "\\\\hat\\\\psi = n_k / s", explanation: "Inverted." }
- id: q-u6-l3-008
  lesson: naive-bayes
  type: match
  prompt: "Match each term to its formula."
  pairs: [{ left: "prior", right: "phi_k" }]
`,
    },
    {
      path: `src/content/flashcards/${UNIT}.yaml`,
      text: `- id: fc-u6-l3-010
  lesson: naive-bayes
  concept: laplace-smoothing
  type: cloze
  front: "Add-one smoothing adds {{c1::1}} to the numerator."
  back: "One pseudo-count per outcome."
  derivationStep: "der-6-3-2#2"
`,
    },
    {
      path: 'src/content/cases/notes.mdx',
      text: `---
id: notes
title: "Clinical notes"
tagline: "Free-text reports as bags of words"
variables:
  - { name: word counts, symbol: "x_j", description: "presence of word j" }
  - label
generativeModel:
  tex: "x_j \\\\mid y \\\\sim \\\\mathrm{Bernoulli}(\\\\psi_{jy})"
  parameters: { d: 500 }
seed: 42
usedIn: [naive-bayes]
---

A hospital's notes, generated with [[bernoulli]] features.
`,
    },
    {
      path: 'src/content/homework/hw3.mdx',
      text: `---
id: hw3
title: "HW3: Naive Bayes and GDA"
due: 2026-10-19
live: true
units: [${UNIT}]
---

## Readiness gate

| Skill | Lesson | Check |
|---|---|---|
| Bernoulli NB MLE | 6.3 | q-u6-l3-001 |
`,
    },
  ];
  return files.map((f) =>
    overrides[f.path] !== undefined ? { path: f.path, text: overrides[f.path] ?? '' } : f,
  );
}

const messages = (findings: { message: string }[]) => findings.map((f) => f.message);

// ---------------------------------------------------------------------------
// End-to-end validation
// ---------------------------------------------------------------------------

describe('runValidation', () => {
  it('accepts a complete, consistent content tree with no errors or warnings', () => {
    const result = runValidation(baseFixture(), { now: NOW });
    expect(messages(result.errors)).toEqual([]);
    expect(messages(result.warnings)).toEqual([]);
    expect(result.counts).toEqual({
      units: 1,
      lessons: 1,
      glossary: 2,
      nodes: 2,
      edges: 1,
      quizzes: 4,
      flashcards: 1,
      cases: 1,
      homework: 1,
    });
    expect(result.content.quizzes[0]?.data.unit).toBe(UNIT);
    expect(summaryLine(result)).toBe(
      'validate:content: 0 errors, 0 warnings across 1 lesson, 2 glossary terms, 2 graph nodes, 1 graph edge, 4 quiz items, 1 flashcard, 1 case, 1 homework bridge, 1 unit',
    );
  });

  it('reports an unresolved [[term]] with its line', () => {
    const body = LESSON_BODY.replace('[[bernoulli]]', '[[bernouli]]');
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    const hit = result.errors.find((e) => e.message.includes('[[bernouli]]'));
    expect(hit).toBeDefined();
    expect(hit?.message).toContain('no glossary term with id "bernouli"');
    expect(hit?.file).toBe(`src/content/units/${UNIT}/03-naive-bayes.mdx`);
    expect(hit?.line).toBe(22);
  });

  it('reports an unresolved sticky="…" on a Step', () => {
    const body = LESSON_BODY.replace('sticky="bernoulli"', 'sticky="nope"');
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toContainEqual(
      expect.stringContaining('sticky="nope" is not a glossary id'),
    );
  });

  it('rejects a cycle in the requires relation and names it', () => {
    // The lesson derives bayes-rule → bernoulli-nb-mle; this hand edge closes the loop.
    const result = runValidation(
      baseFixture({
        'src/content/graph/edges.yaml': `- { from: bernoulli-nb-mle, to: bayes-rule, type: requires }\n`,
      }),
      { now: NOW },
    );
    const hit = result.errors.find((e) => e.message.includes('cycle'));
    expect(hit?.message).toMatch(
      /bayes-rule → bernoulli-nb-mle → bayes-rule|bernoulli-nb-mle → bayes-rule → bernoulli-nb-mle/,
    );
  });

  it('rejects a component that is not in the contract', () => {
    const body = `${LESSON_BODY}\n\n<Spoiler>\n\nhidden\n\n</Spoiler>\n`;
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toContain(
      'unknown component Spoiler; the contract is docs/CONTENT_AUTHORING.md §4',
    );
  });

  it('rejects import/export statements in a lesson', () => {
    const body = `import Foo from './Foo';\n\n${LESSON_BODY}`;
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toContainEqual(expect.stringContaining('no import/export'));
  });

  it('rejects numeric answers and solution sections in a live homework', () => {
    const hw = `---
id: hw3
title: "HW3"
due: 2026-10-19
live: true
units: [${UNIT}]
---

## Readiness gate

Fine.

## Walkthrough

Problem 2: $\\hat\\psi = 0.15$.

The answer is 42.
`;
    const result = runValidation(baseFixture({ 'src/content/homework/hw3.mdx': hw }), { now: NOW });
    const hwErrors = result.errors.filter((e) => e.file === 'src/content/homework/hw3.mdx');
    expect(messages(hwErrors)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('solution section ("Walkthrough")'),
        'live homework must not contain a numeric answer in math',
        'live homework must not state a numeric answer',
      ]),
    );
    expect(hwErrors.map((e) => e.line)).toEqual(expect.arrayContaining([13, 15, 17]));
  });

  it('warns when a lesson feeding a live homework states a decimal result in an Example', () => {
    const body = LESSON_BODY.replace('$\\hat\\psi = 6/40$', '$\\hat\\psi = 0.15$');
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toEqual([]);
    expect(messages(result.warnings)).toContainEqual(
      expect.stringContaining('feeds a live homework'),
    );
  });

  it('warns about due dates that disagree with the live flag', () => {
    const past = runValidation(baseFixture(), {
      now: new Date('2026-11-01T00:00:00Z'),
    });
    expect(messages(past.warnings)).toContainEqual(
      expect.stringContaining('live: true but due 2026-10-19 is in the past'),
    );
  });

  it('reports schema failures with the file and item', () => {
    const result = runValidation(
      baseFixture({
        [`src/content/quizzes/${UNIT}.yaml`]: `- id: q-u6-l3-001
  lesson: naive-bayes
  type: mc
  prompt: "Two correct"
  options:
    - { text: "a", correct: true }
    - { text: "b", correct: true }
    - { text: "c" }
`,
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item 1 (q-u6-l3-001): options: an mc item needs exactly one correct option (found 2)',
        ),
      ]),
    );
  });

  it('checks references across collections', () => {
    const body = LESSON_BODY;
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body).replace(
          'cases: [notes]',
          'cases: [ghost]',
        ),
        'src/content/graph/edges.yaml': `- { from: bernoulli-nb-mle, to: nowhere, type: uses }\n`,
      }),
      { now: NOW },
    );
    expect(messages(result.warnings)).toEqual(
      expect.arrayContaining([expect.stringContaining('no case page yet for "ghost"')]),
    );
    expect(messages(result.errors)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"nowhere" is neither a graph node nor a glossary term'),
      ]),
    );
  });

  it('warns about derivations that break the step rules', () => {
    const steps = Array.from({ length: 16 }, (_, i) => `<Step>\n$$x_{${i}}$$\n</Step>`).join(
      '\n\n',
    );
    const body = `${LESSON_BODY}\n\n<Derivation id="der-6-3-9" title="Long">\n\n${steps}\n\n</Derivation>\n`;
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(body),
      }),
      { now: NOW },
    );
    expect(messages(result.errors)).toEqual([]);
    const w = messages(result.warnings);
    expect(w).toContain('Derivation "der-6-3-9" has 16 steps; chunk or collapse beyond 15');
    expect(w).toContain('Derivation "der-6-3-9" is missing goalTex');
    expect(w).toContain('Derivation "der-6-3-9" is missing resultTex');
    expect(w).toContain('Derivation "der-6-3-9" is missing source (slide provenance)');
    expect(w).toContain('Derivation "der-6-3-9" step 1 has no justification');
  });

  it('is fine with an empty tree except for units', () => {
    const [units] = baseFixture();
    const result = runValidation(units ? [units] : [], { now: NOW });
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scanner units
// ---------------------------------------------------------------------------

describe('mdx-scan', () => {
  it('splits frontmatter and keeps body line numbers', () => {
    const { frontmatter, body, bodyLine } = splitFrontmatter('---\na: 1\n---\n\nhello');
    expect(frontmatter).toBe('a: 1');
    expect(body).toBe('\nhello');
    expect(bodyLine).toBe(4);
  });

  it('ignores [[…]] and tags inside code, math, and comments', () => {
    const body = [
      'Real [[alpha]] use.',
      '`[[beta]]` and $[[gamma]]$ and $$<Gamma/> [[delta]]$$',
      '```',
      '<Code/> [[epsilon]]',
      '```',
      '{/* <Comment/> [[zeta]] */}',
      '<Real x="1" />',
    ].join('\n');
    expect(findStickyUses(body).map((u) => u.id)).toEqual(['alpha']);
    expect(findJsxTags(maskNonProse(body)).map((t) => t.name)).toEqual(['Real']);
  });

  it('parses props written as strings, expressions, and bare flags', () => {
    const [tag] = findJsxTags(
      '<Step justification="chain rule" fadeable figureState={{"a": 1}} n={7} />',
    );
    expect(tag?.attrs).toEqual({
      justification: 'chain rule',
      fadeable: true,
      figureState: '{"a": 1}',
      n: '7',
    });
    expect(tag?.exprAttrs.has('n')).toBe(true);
    expect(tag?.selfClosing).toBe(true);
  });

  it('collects derivations with their steps through chunks', () => {
    const body = `<Derivation id="der-1-1-1" goalTex="a" resultTex="b" source="L1 p.1">
<Chunk title="x">
<Step justification="j1" sticky="s1">
$$a$$
</Step>
<Step>
$$b$$
</Step>
</Chunk>
</Derivation>`;
    const [d] = findDerivations(body);
    expect(d?.id).toBe('der-1-1-1');
    expect(d?.steps).toHaveLength(2);
    expect(d?.steps[0]?.sticky).toBe('s1');
    expect(d?.steps[1]?.justification).toBeUndefined();
    expect(d?.unclosed).toBe(false);
  });

  it('finds headings and math spans', () => {
    const body = '# Title\n\ntext $a = 1.5$ and \\$5\n\n$$\nb = 2\n$$\n';
    expect(findHeadings(body)).toEqual([{ level: 1, text: 'Title', line: 1 }]);
    expect(findMathSpans(body).map((m) => m.tex.trim())).toEqual(['a = 1.5', 'b = 2']);
  });
});

describe('findCycle', () => {
  it('returns null for a DAG and the loop for a cycle', () => {
    const dag = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set<string>()],
    ]);
    expect(findCycle(dag)).toBeNull();
    dag.get('c')?.add('a');
    expect(findCycle(dag)).toEqual(['a', 'b', 'c', 'a']);
  });
});

describe('quizItemSchema', () => {
  it('keeps extra fields on open item types and defaults the common ones', () => {
    const parsed = quizItemSchema.parse({
      id: 'q-u1-l1-001',
      lesson: 'x',
      type: 'order',
      prompt: 'Order the steps',
      steps: ['a', 'b'],
    });
    expect(parsed.type).toBe('order');
    expect(parsed.difficulty).toBe(2);
    expect(parsed.source).toBe('original');
    expect((parsed as Record<string, unknown>)['steps']).toEqual(['a', 'b']);
  });

  it('requires a formula when a numeric item is seeded', () => {
    const r = quizItemSchema.safeParse({
      id: 'q-u1-l1-002',
      lesson: 'x',
      type: 'numeric',
      prompt: 'p',
      answer: 1,
      seeded: { n: [1, 2] },
    });
    expect(r.success).toBe(false);
  });

  it('checks numeric formulas with the safe evaluator', () => {
    const result = runValidation(
      baseFixture({
        [`src/content/quizzes/${UNIT}.yaml`]: `- id: q-u6-l3-002
  lesson: naive-bayes
  type: numeric
  prompt: "p"
  answer: 0.15
  seeded: { n_k: [20, 40] }
  formula: "s / n_k"
- id: q-u6-l3-003
  lesson: naive-bayes
  type: numeric
  prompt: "p"
  answer: 0.15
  formula: "Math.floor(1)"
- id: q-u6-l3-004
  lesson: naive-bayes
  type: numeric
  prompt: "p"
  answer: 0.15
  tolerance: 0.001
  formula: "6 / 40 + 1"
- id: q-u6-l3-005
  lesson: naive-bayes
  type: numeric
  prompt: "p"
  answer: 357
  formula: "floor(0.01 * 35788)"
`,
      }),
      { now: NOW },
    );
    const errors = messages(result.errors);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('(q-u6-l3-002): formula: unknown name "s"'),
        expect.stringContaining('(q-u6-l3-003): formula:'),
      ]),
    );
    expect(errors.filter((m) => m.includes('q-u6-l3-005'))).toEqual([]);
    expect(messages(result.warnings)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('(q-u6-l3-004): formula evaluates to 1.15, but answer is 0.15'),
      ]),
    );
  });

  it('warns about h1 headings in a lesson body', () => {
    const result = runValidation(
      baseFixture({
        [`src/content/units/${UNIT}/03-naive-bayes.mdx`]: lessonText(
          `# The model\n\n${LESSON_BODY}`,
        ),
      }),
      { now: NOW },
    );
    expect(messages(result.warnings)).toEqual(
      expect.arrayContaining([expect.stringContaining('h1 heading "The model"')]),
    );
  });
});
