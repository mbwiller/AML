import { createSeededRandom } from '../_shared/seeded-random';
import {
  drawBatch,
  empiricalRisk,
  exampleGradient,
  fullGradient,
  gdPath,
  hessian,
  leastSquares,
  makeProblem,
  meanVec,
  minibatchGradient,
  noiseFloor,
  rmsSpread,
  sampleMinibatchGradients,
  sgdPath,
  singleExampleCovariance,
  theoreticalSpread,
  THETA_TRUE,
} from './math';

const p = makeProblem(100, 5);
const probe: [number, number] = [-1, 0.5];

describe('the seeded least-squares problem', () => {
  it('is deterministic for a seed', () => {
    expect(makeProblem(10, 5)).toEqual(makeProblem(10, 5));
    expect(makeProblem(10, 5)).not.toEqual(makeProblem(10, 6));
  });

  it('has its least-squares solution near θ_true, with zero full gradient there', () => {
    const hat = leastSquares(p);
    expect(Math.hypot(hat[0] - THETA_TRUE[0], hat[1] - THETA_TRUE[1])).toBeLessThan(0.3);
    const g = fullGradient(p, hat);
    expect(Math.hypot(g[0], g[1])).toBeLessThan(1e-10);
    // and it minimizes R̂
    expect(empiricalRisk(p, hat)).toBeLessThan(empiricalRisk(p, [hat[0] + 0.1, hat[1]]));
  });

  it('∇R̂(θ) = H(θ − θ̂) for the quadratic R̂', () => {
    const H = hessian(p);
    const hat = leastSquares(p);
    const d: [number, number] = [probe[0] - hat[0], probe[1] - hat[1]];
    const g = fullGradient(p, probe);
    expect(g[0]).toBeCloseTo(H.a * d[0] + H.b * d[1], 10);
    expect(g[1]).toBeCloseTo(H.b * d[0] + H.c * d[1], 10);
  });
});

describe('unbiasedness (der-2-5-9 steps 1-5)', () => {
  it('the average of the n per-example gradients is exactly the full gradient', () => {
    const all = Array.from({ length: p.n }, (_, i) => exampleGradient(p, probe, i));
    const m = meanVec(all);
    const g = fullGradient(p, probe);
    expect(m[0]).toBeCloseTo(g[0], 12);
    expect(m[1]).toBeCloseTo(g[1], 12);
    expect(
      minibatchGradient(
        p,
        probe,
        Array.from({ length: p.n }, (_, i) => i),
      ),
    ).toEqual(fullGradient(p, probe));
  });

  it('the mean of many sampled minibatch gradients approaches the full gradient', () => {
    const g = fullGradient(p, probe);
    for (const b of [1, 4, 16]) {
      const m = meanVec(sampleMinibatchGradients(p, probe, b, 20_000, 5, true));
      expect(Math.hypot(m[0] - g[0], m[1] - g[1])).toBeLessThan(
        0.05 * Math.hypot(g[0], g[1]) + 0.05,
      );
    }
  });
});

describe('variance (der-2-5-9 steps 6-8)', () => {
  const s1 = singleExampleCovariance(p, probe);
  const g = fullGradient(p, probe);

  it('the RMS spread matches √(tr Σ₁ / b) and shrinks like 1/√b', () => {
    const spread = (b: number) =>
      rmsSpread(sampleMinibatchGradients(p, probe, b, 8000, 5, true), g);
    const s1x = spread(1);
    const s4 = spread(4);
    const s16 = spread(16);
    expect(s1x / theoreticalSpread(s1, p.n, 1, true)).toBeCloseTo(1, 1);
    expect(s4 / theoreticalSpread(s1, p.n, 4, true)).toBeCloseTo(1, 1);
    expect(s1x / s4).toBeGreaterThan(1.85);
    expect(s1x / s4).toBeLessThan(2.15);
    expect(s1x / s16).toBeGreaterThan(3.7);
    expect(s1x / s16).toBeLessThan(4.3);
  });

  it('without replacement the spread carries (n − b)/(n − 1) and vanishes at b = n', () => {
    expect(theoreticalSpread(s1, p.n, p.n, false)).toBe(0);
    const full = sampleMinibatchGradients(p, probe, p.n, 5, 5, false);
    for (const v of full) {
      expect(v[0]).toBeCloseTo(g[0], 10);
      expect(v[1]).toBeCloseTo(g[1], 10);
    }
    const emp = rmsSpread(sampleMinibatchGradients(p, probe, 50, 8000, 5, false), g);
    expect(emp / theoreticalSpread(s1, p.n, 50, false)).toBeCloseTo(1, 1);
  });
});

describe('drawBatch', () => {
  it('draws valid indices; without replacement they are distinct', () => {
    const rng = createSeededRandom(3);
    const w = drawBatch(rng, 10, 25, true);
    expect(w).toHaveLength(25);
    expect(w.every((i) => i >= 0 && i < 10)).toBe(true);
    const wo = drawBatch(rng, 10, 7, false);
    expect(new Set(wo).size).toBe(7);
  });
});

describe('paths', () => {
  it('GD converges to θ̂; constant-step SGD keeps a noise floor that shrinks with b', () => {
    const hat = leastSquares(p);
    const gd = gdPath(p, probe, 0.1, 200);
    const end = gd.at(-1) ?? probe;
    expect(Math.hypot(end[0] - hat[0], end[1] - hat[1])).toBeLessThan(1e-4);
    const floor1 = noiseFloor(sgdPath(p, probe, 0.1, 1, 400, 5, true), hat);
    const floor16 = noiseFloor(sgdPath(p, probe, 0.1, 16, 400, 5, true), hat);
    expect(floor1).toBeGreaterThan(0.05);
    expect(floor16).toBeLessThan(floor1 / 2);
  });
});
