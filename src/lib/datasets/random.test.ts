import { describe, expect, it } from 'vitest';

import { cholesky, clamp, createRng, round, toCdf } from './random';

const N = 20_000;

function moments(xs: number[]): { mean: number; variance: number } {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return { mean, variance };
}

describe('seeded rng', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const xa = Array.from({ length: 50 }, () => a.uniform());
    const xb = Array.from({ length: 50 }, () => b.uniform());
    const xc = Array.from({ length: 50 }, () => c.uniform());
    expect(xa).toEqual(xb);
    expect(xa).not.toEqual(xc);
  });

  it('forks give independent, reproducible streams', () => {
    const a = createRng(7).fork('parameters');
    const b = createRng(7).fork('parameters');
    const c = createRng(7).fork('rows');
    expect(a.uniform()).toBe(b.uniform());
    expect(createRng(7).fork('parameters').uniform()).not.toBe(c.uniform());
  });

  it('uniform lies in [0, 1) with the right mean and variance', () => {
    const rng = createRng(1);
    const xs = Array.from({ length: N }, () => rng.uniform());
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const { mean, variance } = moments(xs);
    expect(mean).toBeCloseTo(0.5, 1);
    expect(Math.abs(variance - 1 / 12)).toBeLessThan(0.005);
  });

  it('normal(3, 2) has mean 3 and variance 4 at n = 20 000', () => {
    const rng = createRng(2);
    const xs = Array.from({ length: N }, () => rng.normal(3, 2));
    const { mean, variance } = moments(xs);
    expect(Math.abs(mean - 3)).toBeLessThan(0.05);
    expect(Math.abs(variance - 4)).toBeLessThan(0.15);
  });

  it('bernoulli, categorical, and poisson have the right frequencies', () => {
    const rng = createRng(3);
    let ones = 0;
    for (let i = 0; i < N; i++) ones += rng.bernoulli(0.3);
    expect(Math.abs(ones / N - 0.3)).toBeLessThan(0.01);

    const counts = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const idx = rng.categorical([1, 2, 7]);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    expect(Math.abs((counts[0] ?? 0) / N - 0.1)).toBeLessThan(0.01);
    expect(Math.abs((counts[2] ?? 0) / N - 0.7)).toBeLessThan(0.015);

    const ps = Array.from({ length: N }, () => rng.poisson(25));
    const { mean, variance } = moments(ps);
    expect(Math.abs(mean - 25)).toBeLessThan(0.15);
    expect(Math.abs(variance - 25)).toBeLessThan(1);
  });

  it('logNormal has the stated median', () => {
    const rng = createRng(4);
    const xs = Array.from({ length: N }, () => rng.logNormal(Math.log(60), 0.9)).sort(
      (a, b) => a - b,
    );
    expect(Math.abs(Math.log(xs[N / 2] ?? 0) - Math.log(60))).toBeLessThan(0.03);
  });

  it('cholesky factors a covariance and mvNormal reproduces it', () => {
    const cov = [
      [4, 1.2],
      [1.2, 1],
    ];
    const l = cholesky(cov);
    const at = (i: number, j: number) => l[i]?.[j] ?? Number.NaN;
    expect(at(0, 1)).toBe(0);
    expect(at(0, 0) ** 2).toBeCloseTo(4, 10);
    expect(at(0, 0) * at(1, 0)).toBeCloseTo(1.2, 10);
    expect(at(1, 0) ** 2 + at(1, 1) ** 2).toBeCloseTo(1, 10);
    expect(() =>
      cholesky([
        [1, 2],
        [2, 1],
      ]),
    ).toThrow(/positive definite/);

    const rng = createRng(5);
    const xs = Array.from({ length: N }, () => rng.mvNormal([10, -3], cov));
    const m0 = moments(xs.map((x) => x[0] ?? 0));
    const m1 = moments(xs.map((x) => x[1] ?? 0));
    let c = 0;
    for (const x of xs) c += ((x[0] ?? 0) - m0.mean) * ((x[1] ?? 0) - m1.mean);
    c /= N - 1;
    expect(Math.abs(m0.mean - 10)).toBeLessThan(0.05);
    expect(Math.abs(m1.mean + 3)).toBeLessThan(0.03);
    expect(Math.abs(m0.variance - 4)).toBeLessThan(0.15);
    expect(Math.abs(m1.variance - 1)).toBeLessThan(0.05);
    expect(Math.abs(c - 1.2)).toBeLessThan(0.08);
  });

  it('helpers: toCdf, round, clamp', () => {
    expect(toCdf([1, 1, 2])).toEqual([0.25, 0.5, 1]);
    expect(() => toCdf([0, 0])).toThrow();
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(-0.0001, 2)).toBe(0);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});
