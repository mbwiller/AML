import { describe, expect, it } from 'vitest';

import { generate, logit, sigmoid, spec } from './adverse';
import { stableStringify } from './serialize';

const dataset = generate();

describe('ADVERSE generator', () => {
  it('is deterministic for the seed', () => {
    expect(stableStringify(generate(spec.seed))).toBe(stableStringify(dataset));
    expect(stableStringify(generate(spec.seed + 1))).not.toBe(stableStringify(dataset));
  });

  it('has 5,000 rows with unique ADV-nnnn ids', () => {
    expect(dataset.n).toBe(5000);
    expect(dataset.rows).toHaveLength(5000);
    const ids = dataset.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(5000);
    expect(ids.every((id) => /^ADV-\d{4}$/.test(id))).toBe(true);
    expect(ids[116]).toBe('ADV-0117');
  });

  it('prevalence is 6% ± 1%, for the seed and for the true risks', () => {
    const events = dataset.rows.filter((r) => r.y === 1).length / dataset.n;
    expect(Math.abs(events - 0.06)).toBeLessThan(0.01);
    const meanRisk = dataset.rows.reduce((a, r) => a + r.p, 0) / dataset.n;
    expect(Math.abs(meanRisk - 0.06)).toBeLessThan(0.01);
    for (const seed of [11, 12, 13]) {
      const other = generate(seed);
      const rate = other.rows.filter((r) => r.y === 1).length / other.n;
      expect(Math.abs(rate - 0.06)).toBeLessThan(0.012);
    }
  });

  it('covariates stay in their physiological ranges and doses are VASCO arms', () => {
    const doses = new Set<number>(spec.covariates.doses);
    for (const r of dataset.rows) {
      expect(Number.isInteger(r.age)).toBe(true);
      expect(r.age).toBeGreaterThanOrEqual(18);
      expect(r.age).toBeLessThanOrEqual(95);
      expect(r.egfr).toBeGreaterThanOrEqual(8);
      expect(r.egfr).toBeLessThanOrEqual(130);
      expect(r.potassium).toBeGreaterThanOrEqual(2.8);
      expect(r.potassium).toBeLessThanOrEqual(6.8);
      expect(doses.has(r.dose)).toBe(true);
      expect([0, 1]).toContain(r.nsaid);
      expect([0, 1]).toContain(r.diabetes);
      expect([0, 1]).toContain(r.y);
    }
  });

  it('stores the true risk p = σ(logit(x)) for every row', () => {
    for (const r of dataset.rows) {
      expect(Math.abs(r.p - sigmoid(logit(r)))).toBeLessThan(5e-5 + 1e-12);
    }
  });

  it('the eGFR-30 kink raises risk: patients below 30 have higher mean risk', () => {
    const low = dataset.rows.filter((r) => r.egfr < 30);
    const mid = dataset.rows.filter((r) => r.egfr >= 30 && r.egfr < 50);
    const mean = (rows: typeof low) => rows.reduce((a, r) => a + r.p, 0) / rows.length;
    expect(low.length).toBeGreaterThan(30);
    expect(mean(low)).toBeGreaterThan(2 * mean(mid));
  });

  it('age and eGFR are negatively correlated', () => {
    const n = dataset.n;
    const ma = dataset.rows.reduce((a, r) => a + r.age, 0) / n;
    const me = dataset.rows.reduce((a, r) => a + r.egfr, 0) / n;
    let c = 0;
    let va = 0;
    let ve = 0;
    for (const r of dataset.rows) {
      c += (r.age - ma) * (r.egfr - me);
      va += (r.age - ma) ** 2;
      ve += (r.egfr - me) ** 2;
    }
    expect(c / Math.sqrt(va * ve)).toBeLessThan(-0.3);
  });
});
