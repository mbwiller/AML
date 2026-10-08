import { describe, expect, it } from 'vitest';

import { buildQuiz, type Interleavable } from './interleave';

function pool(): Interleavable[] {
  const out: Interleavable[] = [];
  for (const unit of ['u6', 'u7', 'u2']) {
    for (const concept of ['a', 'b', 'c', 'd']) {
      for (let k = 0; k < 4; k++) {
        out.push({ id: `${unit}-${concept}-${k}`, unit, concepts: [`${unit}-${concept}`] });
      }
    }
  }
  // Two items that both separate ridge from lasso, under different concepts.
  out.push({ id: 'u6-ridge', unit: 'u6', concepts: ['ridge'], discriminates: ['ridge', 'lasso'] });
  out.push({ id: 'u6-lasso', unit: 'u6', concepts: ['lasso'], discriminates: ['lasso', 'ridge'] });
  return out;
}

describe('buildQuiz', () => {
  it('returns count distinct items from the chosen units only', () => {
    const q = buildQuiz(pool(), { units: ['u6', 'u7'], count: 10, seed: 1 });
    expect(q).toHaveLength(10);
    expect(new Set(q.map((i) => i.id)).size).toBe(10);
    expect(q.every((i) => i.unit === 'u6' || i.unit === 'u7')).toBe(true);
  });

  it('is reproducible from its seed and changes with it', () => {
    const a = buildQuiz(pool(), { units: ['u6', 'u7'], count: 10, seed: 42 }).map((i) => i.id);
    const b = buildQuiz(pool(), { units: ['u6', 'u7'], count: 10, seed: 42 }).map((i) => i.id);
    const c = buildQuiz(pool(), { units: ['u6', 'u7'], count: 10, seed: 43 }).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('interleaves concepts: no two neighbors share a concept, and no concept repeats early', () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = buildQuiz(pool(), { units: ['u6', 'u7'], count: 8, seed });
      for (let i = 1; i < q.length; i++) {
        expect(q[i]?.concepts[0]).not.toBe(q[i - 1]?.concepts[0]);
      }
      expect(new Set(q.map((i) => i.concepts[0])).size).toBe(q.length);
      expect(new Set(q.map((i) => i.unit)).size).toBe(2);
    }
  });

  it('keeps discriminating partners adjacent whenever one of them is picked', () => {
    let seen = 0;
    for (let seed = 0; seed < 60; seed++) {
      const ids = buildQuiz(pool(), { units: ['u6'], count: 8, seed }).map((i) => i.id);
      const r = ids.indexOf('u6-ridge');
      const l = ids.indexOf('u6-lasso');
      if (r === -1 && l === -1) continue;
      seen++;
      expect(r).not.toBe(-1);
      expect(l).not.toBe(-1);
      expect(Math.abs(r - l)).toBe(1);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('returns the whole pool when it is smaller than the count', () => {
    const small = pool().filter((i) => i.unit === 'u2' && i.concepts[0] === 'u2-a');
    expect(buildQuiz(small, { units: ['u2'], count: 10, seed: 3 })).toHaveLength(4);
  });

  it('adds items from earlier units for a boss quiz', () => {
    const q = buildQuiz(pool(), {
      units: ['u7'],
      count: 10,
      seed: 5,
      earlier: { units: ['u2', 'u6'], count: 2 },
    });
    expect(q).toHaveLength(12);
    expect(q.filter((i) => i.unit !== 'u7')).toHaveLength(2);
  });
});
