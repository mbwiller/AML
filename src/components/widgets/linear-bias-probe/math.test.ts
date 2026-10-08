import { describe, expect, it } from 'vitest';

import { ARM_DOSES, ARMS, spec, trueMean } from '@/lib/datasets/vasco';

import { vascoPatients } from './data';
import {
  armMeanResiduals,
  columns,
  doseStep,
  fitPopulation,
  fitSample,
  fitTex,
  fitWeighted,
  formatCoef,
  meanResidualCurve,
  populationPoints,
  predict,
  solve,
  squaredBias,
  trainingMse,
} from './math';

const patients = vascoPatients();
const linear = { features: ['dose', 'baseline_sbp'] as const, interaction: false };
const withInteraction = { ...linear, interaction: true };
const emax = { features: ['emax_dose', 'baseline_sbp'] as const, interaction: false };

describe('linear-bias-probe math', () => {
  it('builds the design columns in canonical order', () => {
    expect(columns(linear).map((c) => c.tex)).toEqual(['1', 'D', 'B']);
    expect(columns(withInteraction).map((c) => c.tex)).toEqual(['1', 'D', 'B', 'D \\cdot B']);
    expect(
      columns({ features: ['baseline_sbp', 'dose', 'dose'], interaction: false }).map((c) => c.tex),
    ).toEqual(['1', 'D', 'B']);
    expect(columns({ features: [], interaction: true }).map((c) => c.tex)).toEqual(['1']);
  });

  it('solve handles a permuted system', () => {
    expect(
      solve(
        [
          [0, 1],
          [2, 0],
        ],
        [3, 4],
      ).map((v) => Number(v.toFixed(8))),
    ).toEqual([2, 3]);
  });

  it('least squares recovers an exact plane from badly scaled columns', () => {
    const pts = [];
    for (const d of [0, 2.5, 5, 10, 20, 40]) {
      for (const b of [130, 150, 170]) {
        pts.push({ dose: d, baseline: b, y: 4 - 0.3 * d + 0.15 * b + 0.002 * d * b, w: 1 });
      }
    }
    const fit = fitWeighted(withInteraction, pts);
    expect(fit.theta[0]).toBeCloseTo(4, 6);
    expect(fit.theta[1]).toBeCloseTo(-0.3, 8);
    expect(fit.theta[2]).toBeCloseTo(0.15, 8);
    expect(fit.theta[3]).toBeCloseTo(0.002, 10);
  });

  it('the population points reproduce E[B] = 155 and Var(B) = 144 exactly', () => {
    const pts = populationPoints();
    const w = pts.reduce((s, p) => s + p.w, 0);
    const m = pts.reduce((s, p) => s + p.w * p.baseline, 0);
    const v = pts.reduce((s, p) => s + p.w * (p.baseline - 155) ** 2, 0);
    expect(w).toBeCloseTo(1, 12);
    expect(m).toBeCloseTo(155, 10);
    expect(v).toBeCloseTo(144, 8);
  });

  it('the Emax feature puts the truth in the class: zero bias with infinite data', () => {
    const fit = fitPopulation(emax);
    expect(fit.theta[0]).toBeCloseTo(spec.outcome.e0 - 0.15 * 150, 6);
    expect(fit.theta[1]).toBeCloseTo(spec.outcome.emax, 6);
    expect(fit.theta[2]).toBeCloseTo(0.15, 8);
    expect(squaredBias(fit)).toBeLessThan(1e-12);
  });

  it('a line in dose keeps a bias that more data does not remove', () => {
    const pop = fitPopulation(linear);
    const bias2 = squaredBias(pop);
    expect(bias2).toBeGreaterThan(5);
    // The pattern: the line under-predicts the drop at small and large
    // doses' ends differently from the middle (truth is concave in D).
    const curve = ARMS.map((a) => meanResidualCurve(pop, ARM_DOSES[a]));
    expect(Math.sign(curve[0] ?? 0)).toBe(1);
    expect(Math.sign(curve[2] ?? 0)).toBe(-1);
    expect(Math.sign(curve[5] ?? 0)).toBe(1);
    // Mean residual over the balanced population is zero (intercept in the class).
    expect(curve.reduce((s, v) => s + v, 0) / curve.length).toBeCloseTo(0, 8);
  });

  it('adding D·B does not shrink the bias: the truth has no interaction', () => {
    const plain = fitPopulation(linear);
    const inter = fitPopulation(withInteraction);
    expect(inter.theta[3]).toBeCloseTo(0, 10);
    expect(squaredBias(inter)).toBeCloseTo(squaredBias(plain), 8);
  });

  it('uniform effects: a +10 mg step is the same everywhere for the plane, not for the truth', () => {
    const fit = fitSample(linear, patients);
    const f = (d: number, b: number) => predict(fit, d, b);
    expect(doseStep(f, 0, 140)).toBeCloseTo(doseStep(f, 20, 170), 10);
    expect(doseStep(f, 0, 140)).toBeCloseTo(10 * (fit.theta[1] ?? 0), 10);
    expect(Math.abs(doseStep(trueMean, 0, 150))).toBeGreaterThan(
      3 * Math.abs(doseStep(trueMean, 20, 150)),
    );
    const fi = fitSample(withInteraction, patients);
    const g = (d: number, b: number) => predict(fi, d, b);
    expect(doseStep(g, 0, 130)).not.toBeCloseTo(doseStep(g, 0, 180), 3);
  });

  it('sample fits on the 300 patients approach the population fit', () => {
    const fit = fitSample(linear, patients);
    const pop = fitPopulation(linear);
    expect(Math.abs((fit.theta[1] ?? 0) - (pop.theta[1] ?? 0))).toBeLessThan(0.1);
    // Training MSE ≈ noise + baseline-free part + bias², all near 64 + bias².
    const mse = trainingMse(fit, patients);
    expect(mse).toBeGreaterThan(50);
    expect(mse).toBeLessThan(64 + squaredBias(pop) + 20);
    const res = armMeanResiduals(fit, patients);
    expect(res).toHaveLength(6);
    expect(res.reduce((s, r) => s + r.mean, 0) / 6).toBeCloseTo(0, 6);
  });

  it('formats coefficients and the fitted equation for TeX', () => {
    expect(formatCoef(-22.123)).toBe('22.12');
    expect(formatCoef(0.15)).toBe('0.15');
    expect(formatCoef(0.0012345)).toBe('0.00123');
    expect(formatCoef(0.00001234)).toBe('1.23 \\times 10^{-5}');
    const tex = fitTex({ cols: columns(linear), theta: [-5, -0.4, 0.15] });
    expect(tex).toBe('\\hat f(x) = -5.00 - 0.40\\,D + 0.15\\,B');
  });
});
