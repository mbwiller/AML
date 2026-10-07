import { describe, expect, it } from 'vitest';

import { gradeMc } from './mc';

const item = {
  options: [
    { text: 'independent', correct: true },
    { text: 'identically distributed', misconception: 'nb-iid-confusion' },
    {
      text: 'Gaussian',
      misconception: 'nb-requires-gaussian',
      explanation: 'Nothing is Gaussian.',
    },
    { text: 'uncorrelated across documents' },
  ],
  explanation: 'Conditional independence.',
};

describe('gradeMc', () => {
  it('accepts the correct option and reports no misconception', () => {
    expect(gradeMc(item, 0)).toEqual({
      correct: true,
      misconception: undefined,
      explanation: 'Conditional independence.',
      correctIndex: 0,
    });
  });

  it('returns the distractor misconception and the item explanation', () => {
    expect(gradeMc(item, 1)).toEqual({
      correct: false,
      misconception: 'nb-iid-confusion',
      explanation: 'Conditional independence.',
      correctIndex: 0,
    });
  });

  it('prefers the option explanation when the distractor has one', () => {
    expect(gradeMc(item, 2).explanation).toBe('Nothing is Gaussian.');
  });

  it('handles untagged distractors (true/false items)', () => {
    const r = gradeMc(item, 3);
    expect(r.correct).toBe(false);
    expect(r.misconception).toBeUndefined();
  });

  it('treats an out-of-range or non-integer index as wrong', () => {
    expect(gradeMc(item, 9).correct).toBe(false);
    expect(gradeMc(item, -1).correct).toBe(false);
    expect(gradeMc(item, 0.5).correct).toBe(false);
    expect(gradeMc(item, Number.NaN).correct).toBe(false);
  });

  it('reads `correct` only when it is literally true', () => {
    const r = gradeMc({ options: [{}, { correct: false }] }, 0);
    expect(r.correct).toBe(false);
    expect(r.correctIndex).toBe(-1);
  });
});
