/**
 * DIABETES-BMI-20 against the course companions' printed outputs
 * (STYLE_GUIDE §3: a from-scratch implementation reproduces the companion's
 * numbers to the printed precision). Least squares and gradient descent are
 * written out here from the definitions, independently of the widgets.
 */
import { describe, expect, it } from 'vitest';

import { companion, generate, spec } from './diabetes-bmi-20';
import { loadDataset } from './index';
import { printedTolerance, ulp } from './printed';
import { stableStringify } from './serialize';

const dataset = generate();
const rows = dataset.rows;

/** Agreement to the printed precision (`printed.ts`: half a unit in the last place, or 2 ulp for a full repr). */
function expectPrinted(actual: number, printed: string) {
  expect(Math.abs(actual - Number(printed)), `${actual} vs printed ${printed}`).toBeLessThanOrEqual(
    printedTolerance(printed),
  );
}

/** Ordinary least squares for y ≈ θ₁x + θ₀ (centered normal equations, as scikit-learn fits). */
function ols(x: readonly number[], y: readonly number[]) {
  const n = x.length;
  const xbar = x.reduce((a, b) => a + b, 0) / n;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dx = (x[i] as number) - xbar;
    sxy += dx * ((y[i] as number) - ybar);
    sxx += dx * dx;
  }
  const slope = sxy / sxx;
  return { slope, intercept: ybar - slope * xbar };
}

function mse(x: readonly number[], y: readonly number[], slope: number, intercept: number) {
  let s = 0;
  for (let i = 0; i < x.length; i++)
    s += (slope * (x[i] as number) + intercept - (y[i] as number)) ** 2;
  return s / x.length;
}

describe('printed precision', () => {
  it('rounded prints allow half a unit in the last place; full reprs allow 2 ulp', () => {
    expect(printedTolerance('0.024179')).toBeCloseTo(5e-7, 15);
    expect(printedTolerance('3.71421938')).toBeCloseTo(5e-9, 15);
    expect(printedTolerance('37.37884216052121')).toBe(2 * ulp(37.37884216052121));
    expect(ulp(1)).toBe(2 ** -52);
    expect(ulp(37.5)).toBe(2 ** -47);
    expect(ulp(0.5)).toBe(2 ** -53);
  });
});

describe('DIABETES-BMI-20 dataset', () => {
  it('is the last 20 rows of load_diabetes, DIAB-422 to DIAB-441', () => {
    expect(dataset.n).toBe(20);
    expect(rows).toHaveLength(20);
    expect(rows.map((r) => r.sklearnRow)).toEqual(Array.from({ length: 20 }, (_, i) => 422 + i));
    expect(rows[0]?.id).toBe('DIAB-422');
    expect(rows[19]?.id).toBe('DIAB-441');
    expect(dataset.seed).toBe(0);
  });

  it('the committed JSON matches the generator and loads through loadDataset', () => {
    const loaded = loadDataset('diabetes-bmi-20');
    expect(stableStringify(loaded)).toBe(stableStringify(dataset));
    expect(loaded.rows[3]?.target).toBe(152);
  });

  it('30 · bmiScaled + 25 is the five rows the Lecture 2 companion prints (cell 8)', () => {
    const printed: [number, string, number][] = [
      [422, '27.335902', 233],
      [423, '23.811456', 91],
      [424, '25.331171', 111],
      [425, '23.779122', 152],
      [426, '23.973128', 120],
    ];
    for (const [row, bmi, target] of printed) {
      const r = rows.find((q) => q.sklearnRow === row);
      expect(r).toBeDefined();
      expectPrinted(r?.bmiRecentered ?? Number.NaN, bmi);
      expect(r?.target).toBe(target);
      expect(r?.bmiRecentered).toBe(
        (r?.bmiScaled ?? 0) * spec.recenter.scale + spec.recenter.shift,
      );
    }
  });

  it('bmiScaled is scikit-learn’s scaling of the measured BMI', () => {
    const { mean, sdPopulation, nTotal } = dataset.generativeModel.parameters.bmiScaling as {
      mean: number;
      sdPopulation: number;
      nTotal: number;
    };
    for (const r of rows) {
      expect(r.bmiScaled).toBeCloseTo((r.bmi - mean) / (sdPopulation * Math.sqrt(nTotal)), 14);
    }
  });

  it('least squares reproduces the Lecture 2 fit to the printed precision (cell 15)', () => {
    const fit = ols(
      rows.map((r) => r.bmiRecentered),
      rows.map((r) => r.target),
    );
    expectPrinted(fit.slope, companion.lecture2.slope);
    expectPrinted(fit.intercept, companion.lecture2.intercept);
    // The rounded values VISION §9.7 quotes.
    expect(fit.slope.toFixed(4)).toBe('37.3788');
    expect(fit.intercept.toFixed(2)).toBe('-797.08');
  });

  it('least squares reproduces the Lecture 4 cross-check to the printed precision (cell 23)', () => {
    const x = rows.map((r) => r.bmiScaled);
    const y = rows.map((r) => r.target / spec.targetScale);
    const fit = ols(x, y);
    expectPrinted(fit.slope, companion.lecture4.sklearn.coef[0]);
    expectPrinted(fit.intercept, companion.lecture4.sklearn.intercept);
    expectPrinted(mse(x, y, fit.slope, fit.intercept), companion.lecture4.sklearn.mse);
  });

  it('gradient descent with the Lecture 4 settings reproduces cells 20–21', () => {
    // f(X, θ) = Xθ with columns (bmi, one); mse_loss = (1/n)‖Xθ − y‖²; ∇ = (2/n)Xᵀ(Xθ − y).
    const x = rows.map((r) => r.bmiScaled);
    const y = rows.map((r) => r.target / spec.targetScale);
    const n = x.length;
    const { eta, tolerance, init } = companion.lecture4.gd;
    let theta: [number, number] = [init[0], init[1]];
    let prev: [number, number] = [1, 1];
    let iter = 0;
    let lastLoss = Number.NaN;
    while (Math.hypot(theta[0] - prev[0], theta[1] - prev[1]) > tolerance) {
      prev = theta;
      let g0 = 0;
      let g1 = 0;
      let loss = 0;
      for (let i = 0; i < n; i++) {
        const r = prev[0] * (x[i] as number) + prev[1] - (y[i] as number);
        loss += r * r;
        g0 += r * (x[i] as number);
        g1 += r;
      }
      theta = [prev[0] - eta * ((2 / n) * g0), prev[1] - eta * ((2 / n) * g1)];
      iter += 1;
      if (iter === companion.lecture4.gd.lastPrinted.iteration) lastLoss = loss / n;
    }
    // The last printed line is iteration 10100, so the loop ended in 10100–10199.
    expect(iter).toBeGreaterThanOrEqual(10100);
    expect(iter).toBeLessThan(10200);
    expect(lastLoss.toFixed(6)).toBe(companion.lecture4.gd.lastPrinted.mse);
    expectPrinted(theta[0], companion.lecture4.gd.theta[0]);
    expectPrinted(theta[1], companion.lecture4.gd.theta[1]);
  });
});
