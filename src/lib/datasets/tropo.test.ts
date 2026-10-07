import { describe, expect, it } from 'vitest';

import { stableStringify } from './serialize';
import { generate, spec } from './tropo';

const dataset = generate();

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? Number.NaN;
}

function sd(xs: number[]): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

describe('TROPO generator', () => {
  it('is deterministic for the seed', () => {
    expect(stableStringify(generate(spec.seed))).toBe(stableStringify(dataset));
    expect(stableStringify(generate(spec.seed + 1))).not.toBe(stableStringify(dataset));
  });

  it('has 2,000 rows with unique TRO-nnnn ids', () => {
    expect(dataset.n).toBe(2000);
    const ids = dataset.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(2000);
    expect(ids.every((id) => /^TRO-\d{4}$/.test(id))).toBe(true);
    expect(ids[1999]).toBe('TRO-2000');
  });

  it('MI prevalence is about 15%', () => {
    const rate = dataset.rows.filter((r) => r.mi === 1).length / dataset.n;
    expect(Math.abs(rate - 0.15)).toBeLessThan(0.02);
  });

  it('class medians and spreads of log troponin match the log-normal parameters', () => {
    const logs = (k: 0 | 1) =>
      dataset.rows.filter((r) => r.mi === k).map((r) => Math.log(r.troponin));
    const l0 = logs(0);
    const l1 = logs(1);
    expect(Math.abs(median(l0) - Math.log(8))).toBeLessThan(0.08);
    expect(Math.abs(median(l1) - Math.log(60))).toBeLessThan(0.25);
    expect(Math.abs(sd(l0) - 0.6)).toBeLessThan(0.05);
    expect(Math.abs(sd(l1) - 0.9)).toBeLessThan(0.15);
  });

  it('troponin is positive with one decimal; nuisance variables are in range', () => {
    for (const r of dataset.rows) {
      expect(r.troponin).toBeGreaterThan(0);
      expect(Math.round(r.troponin * 10) / 10).toBe(r.troponin);
      expect(['F', 'M']).toContain(r.sex);
      expect(r.onsetHours).toBeGreaterThanOrEqual(0.5);
      expect(r.onsetHours).toBeLessThanOrEqual(48);
    }
  });
});
