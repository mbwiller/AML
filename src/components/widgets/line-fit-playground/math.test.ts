import { describe, expect, it } from 'vitest';

import { agreesWithPrinted } from '@/lib/datasets/printed';

import { companionFits, lecture2Points, lecture4Points } from './data';
import { fitLad, fitOls, metrics, predict, residuals } from './math';
import { formatTick, linearScale, niceStep, thinPolyline, ticks } from './plot';

const { x, y } = lecture2Points();

describe('least squares on the 20-patient BMI data', () => {
  it('reproduces the Lecture 2 companion’s slope and intercept to the printed precision', () => {
    const fit = fitOls(x, y);
    const printed = companionFits().lecture2;
    expect(agreesWithPrinted(fit.theta1, printed.slope), `${fit.theta1}`).toBe(true);
    expect(agreesWithPrinted(fit.theta0, printed.intercept), `${fit.theta0}`).toBe(true);
    expect(fit.theta1.toFixed(4)).toBe('37.3788');
    expect(fit.theta0.toFixed(2)).toBe('-797.08');
  });

  it('reproduces the Lecture 4 cross-check (scaled bmi, target / 300)', () => {
    const d = lecture4Points();
    const fit = fitOls(d.x, d.y);
    const printed = companionFits().lecture4.sklearn;
    expect(agreesWithPrinted(fit.theta1, printed.coef[0] ?? '')).toBe(true);
    expect(agreesWithPrinted(fit.theta0, printed.intercept)).toBe(true);
    expect(agreesWithPrinted(metrics(d.x, d.y, fit).mse, printed.mse)).toBe(true);
  });

  it('satisfies the normal equations: residuals sum to 0 and are orthogonal to x', () => {
    const fit = fitOls(x, y);
    const r = residuals(x, y, fit);
    const sum = r.reduce((a, b) => a + b, 0);
    const dot = r.reduce((a, b, i) => a + b * (x[i] as number), 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9);
    expect(Math.abs(dot)).toBeLessThan(1e-7);
  });

  it('is the minimum of the MSE: nudging either parameter raises it', () => {
    const fit = fitOls(x, y);
    const best = metrics(x, y, fit).mse;
    for (const [d0, d1] of [
      [1, 0],
      [-1, 0],
      [0, 0.05],
      [0, -0.05],
    ] as const) {
      const m = metrics(x, y, { theta0: fit.theta0 + d0, theta1: fit.theta1 + d1 }).mse;
      expect(m).toBeGreaterThan(best);
    }
  });
});

describe('metrics', () => {
  const small = { x: [0, 1, 2, 3], y: [1, 3, 2, 6] };

  it('computes MAE, MSE, RMSE, and R² with the 1/n kept', () => {
    // ŷ = 1 + x: residuals 0, 1, −1, 2.
    const m = metrics(small.x, small.y, { theta0: 1, theta1: 1 });
    expect(m.mae).toBeCloseTo(1, 12);
    expect(m.mse).toBeCloseTo(6 / 4, 12);
    expect(m.rmse).toBeCloseTo(Math.sqrt(1.5), 12);
    // ȳ = 3; Σ(y − ȳ)² = 4 + 0 + 1 + 9 = 14; R² = 1 − 6/14.
    expect(m.r2).toBeCloseTo(1 - 6 / 14, 12);
  });

  it('R² is 0 for the flat line at ȳ and negative for a worse line', () => {
    expect(metrics(small.x, small.y, { theta0: 3, theta1: 0 }).r2).toBeCloseTo(0, 12);
    expect(metrics(small.x, small.y, { theta0: 10, theta1: 0 }).r2).toBeLessThan(0);
  });

  it('predict and residuals agree', () => {
    const line = { theta0: -500, theta1: 25 };
    expect(predict(line, 24)).toBe(100);
    expect(residuals([24], [130], line)).toEqual([30]);
  });
});

describe('least absolute deviations', () => {
  it('has MAE no larger than the least-squares line, which has the smaller MSE', () => {
    const lad = fitLad(x, y);
    const ols = fitOls(x, y);
    expect(metrics(x, y, lad).mae).toBeLessThanOrEqual(metrics(x, y, ols).mae);
    expect(metrics(x, y, ols).mse).toBeLessThanOrEqual(metrics(x, y, lad).mse);
  });

  it('is a local minimum of the MAE', () => {
    const lad = fitLad(x, y);
    const best = metrics(x, y, lad).mae;
    for (const [d0, d1] of [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.02],
      [0, -0.02],
      [12, -0.5],
      [-12, 0.5],
    ] as const) {
      const m = metrics(x, y, { theta0: lad.theta0 + d0, theta1: lad.theta1 + d1 }).mae;
      expect(m).toBeGreaterThanOrEqual(best - 1e-12);
    }
  });
});

describe('plot helpers', () => {
  it('linear scales map and invert', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(5)).toBe(50);
    expect(s.invert(25)).toBe(7.5);
  });

  it('nice ticks are multiples of 1, 2, or 5 × 10^k', () => {
    expect(niceStep(0, 350, 5)).toBe(50);
    expect(ticks(0, 350, 5)).toEqual([0, 50, 100, 150, 200, 250, 300, 350]);
    expect(ticks(22.5, 28, 5)).toEqual([23, 24, 25, 26, 27, 28]);
    expect(formatTick(-0.05, 0.05)).toBe('−0.05');
  });

  it('thinPolyline keeps the ends and drops sub-pixel steps', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => [i * 0.01, 0] as const);
    const thin = thinPolyline(pts, 1);
    expect(thin[0]).toEqual([0, 0]);
    expect(thin[thin.length - 1]).toEqual([9.99, 0]);
    expect(thin.length).toBeLessThan(15);
  });
});
