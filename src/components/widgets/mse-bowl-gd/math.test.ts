import { describe, expect, it } from 'vitest';

import { agreesWithPrinted } from '@/lib/datasets/printed';

import { companionFits, lecture4Points } from '../line-fit-playground/data';
import {
  conditionNumber,
  contourLevels,
  excessRisk,
  gradient,
  gradientDescent,
  halfHessian,
  hessian,
  iterate,
  leastSquares,
  levelSet,
  risk,
  standardize,
  toRawCoordinates,
  type GdOptions,
} from './math';

const raw = lecture4Points();
const companion: GdOptions = {
  init: [2, 1],
  eta: 0.1,
  stopping: 'parameter-change',
  tolerance: 1e-5,
  maxIterations: 50_000,
};

describe('the empirical risk of the Lecture 4 companion’s model', () => {
  it('least squares reproduces the cross-check (cell 23) to the printed precision', () => {
    const theta = leastSquares(raw);
    const printed = companionFits().lecture4.sklearn;
    expect(agreesWithPrinted(theta[0], printed.coef[0] ?? '')).toBe(true);
    expect(agreesWithPrinted(theta[1], printed.intercept)).toBe(true);
    expect(agreesWithPrinted(risk(raw, theta), printed.mse)).toBe(true);
  });

  it('the gradient matches central finite differences and vanishes at θ̂', () => {
    const theta = [2.5, 0.7] as const;
    const g = gradient(raw, theta);
    const h = 1e-6;
    const d0 =
      (risk(raw, [theta[0] + h, theta[1]]) - risk(raw, [theta[0] - h, theta[1]])) / (2 * h);
    const d1 =
      (risk(raw, [theta[0], theta[1] + h]) - risk(raw, [theta[0], theta[1] - h])) / (2 * h);
    expect(g[0]).toBeCloseTo(d0, 8);
    expect(g[1]).toBeCloseTo(d1, 8);
    const g0 = gradient(raw, leastSquares(raw));
    expect(Math.hypot(g0[0], g0[1])).toBeLessThan(1e-14);
  });

  it('the excess risk is the quadratic form of H/2 (R̂ is exactly a quadratic bowl)', () => {
    const star = leastSquares(raw);
    const a = halfHessian(hessian(raw));
    for (const theta of [
      [2, 1],
      [5, -0.3],
      [3.7, 0.46],
    ] as const) {
      expect(risk(raw, theta) - risk(raw, star)).toBeCloseTo(excessRisk(a, star, theta), 12);
    }
  });

  it('level-set points lie on their contour', () => {
    const star = leastSquares(raw);
    const a = halfHessian(hessian(raw));
    const c = 0.01;
    const pts = levelSet(star, a, c, 24);
    expect(pts).toHaveLength(25);
    for (const p of pts) expect(risk(raw, p) - risk(raw, star)).toBeCloseTo(c, 12);
    expect(contourLevels(1, 3, 0.5)).toEqual([0.5, 0.25, 0.125]);
  });
});

describe('gradient descent', () => {
  it('reproduces the Lecture 4 companion’s run (cells 20–21)', () => {
    const run = gradientDescent(raw, companion);
    const printed = companionFits().lecture4.gd.theta;
    const end = iterate(run, run.iterations);
    expect(run.status).toBe('converged');
    // The last line printed (every 100 iterations) is 10100.
    expect(run.iterations).toBeGreaterThanOrEqual(10_100);
    expect(run.iterations).toBeLessThan(10_200);
    expect(agreesWithPrinted(end[0], printed[0] ?? '')).toBe(true);
    expect(agreesWithPrinted(end[1], printed[1] ?? '')).toBe(true);
    expect(run.lastCheck).toBeLessThanOrEqual(1e-5);
    // The loss decreases monotonically for this stable η.
    for (let t = 1; t <= run.iterations; t += 1) {
      expect(run.losses[t] as number).toBeLessThanOrEqual(run.losses[t - 1] as number);
    }
  });

  it('converges to least squares within tolerance when run long enough', () => {
    const run = gradientDescent(raw, { ...companion, tolerance: 1e-12, maxIterations: 200_000 });
    const end = iterate(run, run.iterations);
    const star = leastSquares(raw);
    expect(run.status).toBe('converged');
    expect(Math.abs(end[0] - star[0])).toBeLessThan(1e-6);
    expect(Math.abs(end[1] - star[1])).toBeLessThan(1e-8);
  });

  it('the three stopping rules stop where they say', () => {
    for (const stopping of ['parameter-change', 'gradient-norm', 'loss-change'] as const) {
      const run = gradientDescent(raw, { ...companion, stopping, tolerance: 1e-6 });
      expect(run.status, stopping).toBe('converged');
      expect(run.lastCheck, stopping).toBeLessThanOrEqual(1e-6);
    }
    // ‖Δθ‖ = η‖∇R̂‖ (der-2-4-2): the parameter rule with ε is the gradient rule with ε/η.
    const p = gradientDescent(raw, { ...companion, stopping: 'parameter-change', tolerance: 1e-6 });
    const g = gradientDescent(raw, { ...companion, stopping: 'gradient-norm', tolerance: 1e-5 });
    expect(Math.abs(p.iterations - g.iterations)).toBeLessThanOrEqual(1);
  });

  it('diverges when η exceeds 2/λ_max and reports it', () => {
    const lMax = 2 * (1 + 0.01); // λ_max ≈ 2.0, a little above 2 · mean(1²)
    const run = gradientDescent(raw, { ...companion, eta: 2 / lMax + 0.2, maxIterations: 5_000 });
    expect(run.status).toBe('diverged');
  });

  it('stops at maxIterations and keeps the path length consistent', () => {
    const run = gradientDescent(raw, { ...companion, maxIterations: 100 });
    expect(run.status).toBe('max-iterations');
    expect(run.iterations).toBe(100);
    expect(run.path).toHaveLength(2 * 101);
    expect(run.losses).toHaveLength(101);
    expect(iterate(run, 0)).toEqual([2, 1]);
    expect(iterate(run, 1e9)).toEqual(iterate(run, 100));
  });
});

describe('standardization', () => {
  it('makes H = 2I, so κ drops from hundreds to 1', () => {
    const kRaw = conditionNumber(hessian(raw));
    const s = standardize(raw);
    const h = hessian(s.data);
    expect(h.a).toBeCloseTo(2, 12);
    expect(h.b).toBeCloseTo(0, 12);
    expect(h.c).toBe(2);
    expect(conditionNumber(h)).toBeCloseTo(1, 10);
    expect(kRaw).toBeGreaterThan(100);
  });

  it('describes the same least-squares line in different coordinates', () => {
    const s = standardize(raw);
    const back = toRawCoordinates(leastSquares(s.data), s);
    const star = leastSquares(raw);
    expect(back[0]).toBeCloseTo(star[0], 10);
    expect(back[1]).toBeCloseTo(star[1], 12);
  });

  it('cuts the companion’s iteration count by two orders of magnitude', () => {
    const before = gradientDescent(raw, companion);
    const after = gradientDescent(standardize(raw).data, companion);
    expect(after.status).toBe('converged');
    expect(after.iterations * 100).toBeLessThan(before.iterations);
    // With H = 2I and η = 0.1 every error component shrinks by 0.8 per step.
    expect(after.iterations).toBeLessThan(80);
  });
});
