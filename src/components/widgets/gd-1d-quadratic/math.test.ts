import {
  contractionFactor,
  derivative,
  energy,
  errorAt,
  etaDivergence,
  etaOpt,
  gdIterates,
  minimizer,
  plotWindow,
  regime,
  stepsToTolerance,
} from './math';

// Lesson 2.5's embedding: E = ½·2θ² − 4θ + 0, so θ* = 2, η_opt = 0.5, 2η_opt = 1.
const q = { a: 2, b: -4, c: 0 };

describe('the quadratic', () => {
  it('has E′(θ*) = 0 at θ* = −b/a', () => {
    expect(minimizer(q)).toBe(2);
    expect(derivative(q, minimizer(q))).toBe(0);
    expect(energy(q, 2)).toBe(-4);
  });
});

describe('contraction (der-2-5-1)', () => {
  it('one step multiplies the error by 1 − ηa', () => {
    for (const eta of [0.1, 0.25, 0.5, 0.7, 1, 1.3]) {
      const [t0, t1] = gdIterates(q, 5, eta, 1) as [number, number];
      expect(t1 - 2).toBeCloseTo(contractionFactor(q.a, eta) * (t0 - 2), 12);
    }
  });

  it('the iterates follow the closed form e(t) = (1 − ηa)^t e(0)', () => {
    const its = gdIterates(q, 5, 0.25, 12);
    expect(its).toHaveLength(13);
    its.forEach((theta, t) => expect(theta - 2).toBeCloseTo(errorAt(q.a, 0.25, 3, t), 12));
    // lesson default: factor 0.5, so e(4) = 3/16
    expect(its[4]).toBeCloseTo(2 + 3 / 16, 12);
  });

  it('η_opt = 1/a lands on θ* in one step from any start', () => {
    for (const theta0 of [-7, 0, 5, 9.5]) {
      const its = gdIterates(q, theta0, etaOpt(q.a), 3);
      expect(its[1]).toBeCloseTo(2, 12);
      expect(its[3]).toBeCloseTo(2, 12);
    }
    expect(etaOpt(q.a)).toBe(0.5);
    expect(etaDivergence(q.a)).toBe(1);
  });

  it('at 2η_opt the error keeps its size and flips sign', () => {
    const its = gdIterates(q, 5, etaDivergence(q.a), 6);
    its.forEach((theta, t) => expect(theta - 2).toBeCloseTo((-1) ** t * 3, 9));
  });

  it('above 2η_opt the error grows by ηa − 1 per step', () => {
    const its = gdIterates(q, 5, 1.25, 5);
    expect(Math.abs((its[5] as number) - 2)).toBeCloseTo(3 * 1.5 ** 5, 9);
  });
});

describe('regimes (der-2-5-2)', () => {
  it('classifies the five regimes by the sign and size of 1 − ηa', () => {
    expect(regime(2, 0)).toBe('frozen');
    expect(regime(2, 0.25)).toBe('monotone');
    expect(regime(2, 0.5)).toBe('exact');
    expect(regime(2, 0.75)).toBe('oscillating');
    expect(regime(2, 1)).toBe('bounce');
    expect(regime(2, 1.01)).toBe('divergent');
    // a = 3: η_opt = 1/3 is not a short decimal, but 1/a is exact enough
    expect(regime(3, etaOpt(3))).toBe('exact');
    expect(regime(3, etaDivergence(3))).toBe('bounce');
  });

  it('the regime agrees with what the iterates do', () => {
    for (const eta of [0.1, 0.3, 0.6, 0.9]) {
      const its = gdIterates(q, 5, eta, 40);
      expect(Math.abs((its[40] as number) - 2)).toBeLessThan(1e-2);
    }
    const div = gdIterates(q, 5, 1.1, 40);
    expect(Math.abs((div[40] as number) - 2)).toBeGreaterThan(3);
    const osc = gdIterates(q, 5, 0.75, 3);
    expect(Math.sign((osc[1] as number) - 2)).toBe(-1);
    expect(Math.sign((osc[2] as number) - 2)).toBe(1);
  });
});

describe('stepsToTolerance', () => {
  it('counts steps until |r|^t ≤ tol', () => {
    expect(stepsToTolerance(0, 1e-3)).toBe(1);
    expect(stepsToTolerance(0.5, 1e-3)).toBe(10); // 2^-10 < 1e-3 < 2^-9
    expect(stepsToTolerance(-0.5, 1e-3)).toBe(10);
    expect(stepsToTolerance(1, 1e-3)).toBe(Number.POSITIVE_INFINITY);
    expect(stepsToTolerance(-1.2, 1e-3)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('plotWindow', () => {
  it('is centered on θ* and contains θ(0) and its mirror image', () => {
    const w = plotWindow(q, 5);
    expect((w.x[0] + w.x[1]) / 2).toBeCloseTo(2);
    expect(w.x[1]).toBeGreaterThan(5);
    expect(w.x[0]).toBeLessThan(-1);
    expect(w.y[0]).toBeLessThan(-4);
    expect(w.y[1]).toBeGreaterThan(energy(q, 5));
  });
});
