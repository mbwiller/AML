import { describe, expect, it } from 'vitest';

import { buildWhichStep, extractDerivationSteps, gradeWhichStep } from './which-step';

const item = {
  corrupt: {
    step: 3,
    replaceTex: String.raw`\hat y = \argmax_{k}\; p(x \mid y = k)`,
    explanation: 'Only $p(x)$ is constant in $k$.',
  },
};

const steps = [
  String.raw`\hat y = \argmax_{k}\; p(y = k \mid x)`,
  String.raw`\hat y = \argmax_{k}\; \frac{p(x \mid y = k)\,p(y = k)}{p(x)}`,
  String.raw`\hat y = \argmax_{k}\; p(x \mid y = k)\,p(y = k)`,
];

describe('buildWhichStep', () => {
  it('replaces the corrupted step and keeps the others', () => {
    const built = buildWhichStep(item, steps);
    expect(built).not.toBeNull();
    expect(built?.correctIndex).toBe(2);
    expect(built?.steps.map((s) => s.corrupted)).toEqual([false, false, true]);
    expect(built?.steps[2]?.tex).toBe(item.corrupt.replaceTex);
    expect(built?.steps[0]?.tex).toBe(steps[0]);
    expect(built?.steps.map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it('returns null when the step is outside the derivation', () => {
    expect(buildWhichStep({ corrupt: { ...item.corrupt, step: 4 } }, steps)).toBeNull();
    expect(buildWhichStep({ corrupt: { ...item.corrupt, step: 0 } }, steps)).toBeNull();
    expect(buildWhichStep(item, [])).toBeNull();
  });
});

describe('gradeWhichStep', () => {
  it('is correct only for the corrupted index', () => {
    expect(gradeWhichStep(item, 2)).toEqual({
      correct: true,
      correctIndex: 2,
      explanation: item.corrupt.explanation,
    });
    expect(gradeWhichStep(item, 0).correct).toBe(false);
  });
});

describe('extractDerivationSteps', () => {
  const body = `
Intro with $x < y$ in prose.

<Derivation
  id="der-6-1-1"
  title="The Bayes classifier"
  goalTex="\\hat y"
  resultTex="\\hat y"
>

<Chunk title="Start">

<Step justification="prediction is the most probable label">
$$\\hat y = \\argmax_{k}\\; p(y = k \\mid x)$$
</Step>

<Step justification="Bayes' rule" sticky="bayes-rule">
$$\\hat y = \\argmax_{k}\\; \\frac{p(x \\mid y = k)\\,p(y = k)}{p(x)}$$
</Step>

</Chunk>

</Derivation>

<Derivation id="der-6-1-2" title="Other" goalTex="a" resultTex="b">

<Step>$a = b$</Step>

</Derivation>
`;

  it('returns each step of the named derivation without the fences', () => {
    expect(extractDerivationSteps(body, 'der-6-1-1')).toEqual([
      String.raw`\hat y = \argmax_{k}\; p(y = k \mid x)`,
      String.raw`\hat y = \argmax_{k}\; \frac{p(x \mid y = k)\,p(y = k)}{p(x)}`,
    ]);
    expect(extractDerivationSteps(body, 'der-6-1-2')).toEqual(['a = b']);
  });

  it('returns undefined for a derivation that is not in the body', () => {
    expect(extractDerivationSteps(body, 'der-9-9-9')).toBeUndefined();
  });
});
