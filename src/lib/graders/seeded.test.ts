import { describe, expect, it } from 'vitest';

import { hashSeed, mulberry32, sampleSeededParams } from './seeded';

const item = {
  answer: 0.15,
  seeded: { n_k: [20, 40, 50, 80], s: [3, 6, 9, 12] },
  formula: 's / n_k',
};

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('is stable and distinguishes ids', () => {
    expect(hashSeed('q-u6-l3-004')).toBe(hashSeed('q-u6-l3-004'));
    expect(hashSeed('q-u6-l3-004')).not.toBe(hashSeed('q-u6-l3-005'));
    expect(Number.isInteger(hashSeed('x'))).toBe(true);
  });
});

describe('sampleSeededParams', () => {
  it('picks one listed value per parameter and evaluates the formula', () => {
    const { params, answer } = sampleSeededParams(item, 7);
    expect(item.seeded.n_k).toContain(params['n_k']);
    expect(item.seeded.s).toContain(params['s']);
    expect(answer).toBeCloseTo((params['s'] ?? 0) / (params['n_k'] ?? 1));
  });

  it('is reproducible for a seed and varies across seeds', () => {
    expect(sampleSeededParams(item, 3)).toEqual(sampleSeededParams(item, 3));
    const seen = new Set<string>();
    for (let seed = 0; seed < 32; seed++)
      seen.add(JSON.stringify(sampleSeededParams(item, seed).params));
    expect(seen.size).toBeGreaterThan(4);
  });

  it('returns the bank answer and no params for unseeded items', () => {
    expect(sampleSeededParams({ answer: 16 }, 1)).toEqual({ params: {}, answer: 16 });
    expect(sampleSeededParams({ answer: 16, formula: '4 * 4' }, 1)).toEqual({
      params: {},
      answer: 16,
    });
  });

  it('handles a one-value list', () => {
    expect(sampleSeededParams({ answer: 1, seeded: { a: [5] }, formula: 'a' }, 99)).toEqual({
      params: { a: 5 },
      answer: 5,
    });
  });

  it('propagates an evaluator error for a formula that names an unknown parameter', () => {
    expect(() =>
      sampleSeededParams({ answer: 1, seeded: { a: [1] }, formula: 'a + b' }, 1),
    ).toThrow(/unknown name "b"/);
  });
});
