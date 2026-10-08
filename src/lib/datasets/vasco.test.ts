import { describe, expect, it } from 'vitest';

import { findRow, loadDataset } from './index';
import { stableStringify } from './serialize';
import { ARMS, ARM_DOSES, armMoments, emaxEffect, generate, spec, trueMean } from './vasco';

const dataset = generate();
const rows = dataset.rows;

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function sd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Least squares by the normal equations (small p, Gaussian elimination). */
function ols(x: readonly (readonly number[])[], y: readonly number[]): number[] {
  const p = x[0]?.length ?? 0;
  const a = Array.from({ length: p }, () => new Array<number>(p + 1).fill(0));
  x.forEach((row, i) => {
    for (let j = 0; j < p; j++) {
      const aj = a[j] as number[];
      for (let k = 0; k < p; k++) aj[k] = (aj[k] ?? 0) + (row[j] ?? 0) * (row[k] ?? 0);
      aj[p] = (aj[p] ?? 0) + (row[j] ?? 0) * (y[i] ?? 0);
    }
  });
  for (let c = 0; c < p; c++) {
    const pivot = a[c] as number[];
    for (let r = c + 1; r < p; r++) {
      const row = a[r] as number[];
      const f = (row[c] ?? 0) / (pivot[c] ?? 1);
      for (let k = c; k <= p; k++) row[k] = (row[k] ?? 0) - f * (pivot[k] ?? 0);
    }
  }
  const theta = new Array<number>(p).fill(0);
  for (let r = p - 1; r >= 0; r--) {
    const row = a[r] as number[];
    let s = row[p] ?? 0;
    for (let k = r + 1; k < p; k++) s -= (row[k] ?? 0) * (theta[k] ?? 0);
    theta[r] = s / (row[r] ?? 1);
  }
  return theta;
}

describe('VASCO generator', () => {
  it('is deterministic for the seed', () => {
    expect(stableStringify(generate(spec.seed))).toBe(stableStringify(dataset));
    expect(stableStringify(generate(spec.seed + 1))).not.toBe(stableStringify(dataset));
  });

  it('has 300 rows with unique VAS-nnnn ids and the lessons’ variable names', () => {
    expect(dataset.n).toBe(300);
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(300);
    expect(ids.every((id) => /^VAS-\d{4}$/.test(id))).toBe(true);
    expect(dataset.variables.map((v) => v.name)).toEqual([
      'id',
      'arm',
      'dose',
      'baseline_sbp',
      'age',
      'sex',
      'delta_sbp',
    ]);
    expect(ARMS[0]).toBe('placebo');
  });

  it('assigns 50 patients per arm in permuted blocks of six', () => {
    for (const arm of ARMS) expect(rows.filter((r) => r.arm === arm)).toHaveLength(50);
    for (let b = 0; b < 50; b++) {
      const block = rows.slice(6 * b, 6 * b + 6).map((r) => r.arm);
      expect([...block].sort()).toEqual([...ARMS].sort());
    }
    for (const r of rows) expect(r.dose).toBe(ARM_DOSES[r.arm]);
  });

  it('baseline SBP is N(155, 12²) in integer mmHg; nuisance covariates in range', () => {
    const b = rows.map((r) => r.baseline_sbp);
    expect(b.every(Number.isInteger)).toBe(true);
    expect(Math.abs(mean(b) - 155)).toBeLessThan(2.1);
    expect(Math.abs(sd(b) - 12)).toBeLessThan(1.5);
    for (const r of rows) {
      expect(Number.isInteger(r.age)).toBe(true);
      expect(r.age).toBeGreaterThanOrEqual(30);
      expect(r.age).toBeLessThanOrEqual(85);
      expect(['F', 'M']).toContain(r.sex);
      expect(Math.round(r.delta_sbp * 10) / 10).toBe(r.delta_sbp);
    }
  });

  it('residuals from the true mean are N(0, 8²)', () => {
    const e = rows.map((r) => r.delta_sbp - trueMean(r.dose, r.baseline_sbp));
    expect(Math.abs(mean(e))).toBeLessThan(1.4);
    expect(Math.abs(sd(e) - 8)).toBeLessThan(0.8);
  });

  it('least squares on (1, D/(6 + D), B − 150) recovers E0, Emax, and 0.15', () => {
    const x = rows.map((r) => [1, r.dose / (6 + r.dose), r.baseline_sbp - 150]);
    const [e0, emax, coef] = ols(
      x,
      rows.map((r) => r.delta_sbp),
    );
    expect(Math.abs((e0 ?? 0) - spec.outcome.e0)).toBeLessThan(3);
    expect(Math.abs((emax ?? 0) - spec.outcome.emax)).toBeLessThan(4);
    expect(Math.abs((coef ?? 0) - spec.outcome.baselineCoef)).toBeLessThan(0.12);
  });

  it('arm means match the Emax curve, and the placebo arm matches lesson 2.2', () => {
    for (const arm of ARMS) {
      const y = rows.filter((r) => r.arm === arm).map((r) => r.delta_sbp);
      // The standard deviation of an arm mean is sqrt(67.24 / 50) ≈ 1.16.
      expect(Math.abs(mean(y) - armMoments(arm).mean)).toBeLessThan(3.5);
    }
    const placebo = armMoments('placebo');
    expect(placebo.mean).toBeCloseTo(-2.25, 10);
    expect(placebo.variance).toBeCloseTo(67.24, 10);
    expect(emaxEffect(0)).toBeCloseTo(0, 12);
    expect(emaxEffect(6)).toBeCloseTo(-11, 10);
    expect(trueMean(10, 150)).toBeCloseTo(-3 - 220 / 16, 10);
  });
});

describe('VASCO through the dataset accessor', () => {
  it("loadDataset('vasco') is the committed JSON and matches the generator", () => {
    const vasco = loadDataset('vasco');
    expect(vasco.id).toBe('vasco');
    expect(vasco.n).toBe(300);
    expect(stableStringify(vasco)).toBe(stableStringify(dataset));
    expect(findRow(vasco, 'VAS-0042')?.id).toBe('VAS-0042');
    expect(vasco.rows.filter((r) => r.arm === 'placebo')).toHaveLength(50);
  });
});
