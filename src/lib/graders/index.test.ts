import { describe, expect, it } from 'vitest';

import { grade } from './index';

describe('grade', () => {
  it('dispatches mc', () => {
    const item = {
      type: 'mc' as const,
      options: [{ correct: true }, { misconception: 'ignore-prior' }],
    };
    expect(grade(item, 0)).toMatchObject({ supported: true, correct: true, correctIndex: 0 });
    expect(grade(item, 1)).toMatchObject({
      supported: true,
      correct: false,
      misconception: 'ignore-prior',
    });
    expect(grade(item, 'x')).toMatchObject({ supported: true, correct: false, message: /Choose/ });
  });

  it('dispatches numeric with and without seeded params', () => {
    const item = { type: 'numeric' as const, answer: 602, tolerance: 0, formula: 'K * d + K - 1' };
    expect(grade(item, '602')).toMatchObject({ supported: true, correct: true });
    expect(grade(item, '601')).toMatchObject({ supported: true, correct: false });
    expect(grade(item, '11', { params: { K: 2, d: 5 } })).toMatchObject({
      supported: true,
      correct: true,
    });
    expect(grade(item, 'eleven')).toMatchObject({
      supported: true,
      correct: false,
      message: /Could not read/,
    });
    expect(grade(item, 602)).toMatchObject({ supported: true, correct: true });
  });

  it('dispatches which-step', () => {
    const item = {
      type: 'which-step' as const,
      corrupt: { step: 2, replaceTex: 'x', explanation: 'why' },
    };
    expect(grade(item, 1)).toMatchObject({ supported: true, correct: true, explanation: 'why' });
    expect(grade(item, 0)).toMatchObject({ supported: true, correct: false });
    expect(grade(item, '1')).toMatchObject({ supported: true, correct: false, message: /Choose/ });
  });

  it('reports other types as unsupported', () => {
    for (const type of ['match', 'order', 'predict', 'estimate', 'code-trace'] as const) {
      expect(grade({ type }, 0)).toEqual({
        supported: false,
        reason: `no grader for "${type}" yet`,
      });
    }
  });
});
