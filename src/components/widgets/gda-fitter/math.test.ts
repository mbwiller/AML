import { createSeededRandom } from '../_shared/seeded-random';
import { determinant, mahalanobisSquared } from '../gaussian-2d-covariance/math';
import { adverseProjection, featureStats } from './data';
import {
  accuracy,
  applyEdits,
  clipLineToBox,
  fitGda,
  fitLogistic,
  gdaScore,
  inverse,
  linearBoundary,
  lineScore,
  rotatedCovariance,
  syntheticPoints,
  syntheticPopulation,
  zeroContour,
  type LabeledPoint,
  type Vec2,
} from './math';

const close = (x: number, y: number, tol = 1e-9) => Math.abs(x - y) <= tol;

const spec = { n: 20_000, prior: 0.4, separation: 2, rotation: 40 };

describe('rotatedCovariance', () => {
  it('is diag(s1², s2²) at angle 0 and swaps the axes at 90°', () => {
    expect(rotatedCovariance(2, 1, 0)).toEqual({ a: 4, b: 0, c: 1 });
    const r = rotatedCovariance(2, 1, Math.PI / 2);
    expect(close(r.a, 1)).toBe(true);
    expect(close(r.b, 0)).toBe(true);
    expect(close(r.c, 4)).toBe(true);
  });

  it('has eigenvalues s1², s2² at every angle', () => {
    for (const angle of [-1.2, -0.3, 0.7, 1.5]) {
      const m = rotatedCovariance(1.4, 0.6, angle);
      expect(close(m.a + m.c, 1.4 ** 2 + 0.6 ** 2)).toBe(true);
      expect(close(determinant(m), (1.4 * 0.6) ** 2)).toBe(true);
    }
  });
});

describe('syntheticPoints', () => {
  it('is deterministic for a seed', () => {
    const a = syntheticPoints({ ...spec, n: 20 }, createSeededRandom(7));
    const b = syntheticPoints({ ...spec, n: 20 }, createSeededRandom(7));
    const c = syntheticPoints({ ...spec, n: 20 }, createSeededRandom(8));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.map((p) => p.id)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });
});

describe('fitGda (L10 p.17, p.20)', () => {
  const points = syntheticPoints(spec, createSeededRandom(7));
  const fit = fitGda(points, false);
  const truth = syntheticPopulation(spec);

  it('recovers φ, μ_k, and Σ_k on a large sample', () => {
    expect(Math.abs(fit.phi - spec.prior)).toBeLessThan(0.02);
    for (const k of [0, 1] as const) {
      const { mu, sigma } = fit.classes[k];
      expect(Math.abs(mu[0] - truth.mu[k][0])).toBeLessThan(0.05);
      expect(Math.abs(mu[1] - truth.mu[k][1])).toBeLessThan(0.05);
      const t = truth.sigma[k];
      expect(Math.abs(sigma.a - t.a)).toBeLessThan(0.08);
      expect(Math.abs(sigma.b - t.b)).toBeLessThan(0.08);
      expect(Math.abs(sigma.c - t.c)).toBeLessThan(0.08);
    }
    expect(fit.degenerate).toBe(false);
  });

  it('pooled Σ is the n_k-weighted average of the class covariances', () => {
    const shared = fitGda(points, true);
    const [c0, c1] = fit.classes;
    const n = c0.n + c1.n;
    for (const key of ['a', 'b', 'c'] as const) {
      const expected = (c0.n * c0.sigma[key] + c1.n * c1.sigma[key]) / n;
      expect(close(shared.pooled[key], expected, 1e-12)).toBe(true);
    }
    expect(shared.cov[0]).toBe(shared.pooled);
    expect(shared.cov[1]).toBe(shared.pooled);
  });

  it('is degenerate when a class has n_k ≤ d points, and with a shared Σ only when n − K < d', () => {
    const two: LabeledPoint[] = [
      ...points.filter((p) => p.y === 0).slice(0, 10),
      ...points.filter((p) => p.y === 1).slice(0, 2),
    ];
    expect(fitGda(two, false).degenerate).toBe(true);
    expect(fitGda(two, false).reason).toMatch(/n_1 = 2/);
    expect(fitGda(two, true).degenerate).toBe(false);
    expect(fitGda(two.slice(0, 10), false).reason).toMatch(/no points/);
    expect(fitGda(two.slice(9), true).reason).toMatch(/n − K = 1 < d/);
  });

  it('flags collinear classes as singular', () => {
    const line: LabeledPoint[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: [i / 10, i / 5] as Vec2,
      y: i % 2 === 0 ? 0 : 1,
    }));
    expect(fitGda(line, false).degenerate).toBe(true);
  });
});

describe('boundaries', () => {
  const points = syntheticPoints({ ...spec, n: 2000 }, createSeededRandom(3));

  it('with a shared Σ the zero level set of the odds lies on θᵀx + θ₀ = 0 with θ = Σ⁻¹(μ₁ − μ₀)', () => {
    const fit = fitGda(points, true);
    const line = linearBoundary(fit);
    const inv = inverse(fit.pooled);
    const [c0, c1] = fit.classes;
    const d: Vec2 = [c1.mu[0] - c0.mu[0], c1.mu[1] - c0.mu[1]];
    expect(close(line.theta[0], inv.a * d[0] + inv.b * d[1], 1e-12)).toBe(true);
    expect(close(line.theta[1], inv.b * d[0] + inv.c * d[1], 1e-12)).toBe(true);
    // The quadratic score and the line agree everywhere (not just at zero).
    for (const x of [
      [0, 0],
      [1.3, -2.1],
      [-4, 3],
      [2.2, 2.2],
    ] as Vec2[]) {
      expect(close(gdaScore(fit, x), lineScore(line, x), 1e-9)).toBe(true);
    }
    const box = { x: [-6, 6] as const, y: [-6, 6] as const };
    const contour = zeroContour((x, y) => gdaScore(fit, [x, y]), box, 48);
    expect(contour.length).toBeGreaterThan(0);
    for (const poly of contour) {
      for (const p of poly) expect(Math.abs(lineScore(line, p))).toBeLessThan(1e-6);
    }
  });

  it('per-class Σ gives a curved boundary whose contour points score ≈ 0', () => {
    const fit = fitGda(points, false);
    const box = { x: [-6, 6] as const, y: [-6, 6] as const };
    const contour = zeroContour((x, y) => gdaScore(fit, [x, y]), box, 64);
    expect(contour.length).toBeGreaterThan(0);
    const all = contour.flat();
    expect(all.length).toBeGreaterThan(20);
    for (const p of all) expect(Math.abs(gdaScore(fit, p))).toBeLessThan(0.05);
    // Not a line: the points are not all on the chord between the extremes.
    const line = linearBoundary(fit);
    const worst = Math.max(...all.map((p) => Math.abs(lineScore(line, p))));
    expect(worst).toBeGreaterThan(0.1);
  });

  it('clipLineToBox returns the two border crossings of a line, or null when it misses', () => {
    const box = { x: [-1, 1] as const, y: [-1, 1] as const };
    const seg = clipLineToBox({ theta: [1, -1], theta0: 0 }, box);
    expect(seg).not.toBeNull();
    const [p, q] = seg as [Vec2, Vec2];
    expect(close(Math.abs(p[0]), 1) && close(Math.abs(q[0]), 1)).toBe(true);
    expect(clipLineToBox({ theta: [0, 1], theta0: -5 }, box)).toBeNull();
  });

  it('zeroContour recovers the unit circle', () => {
    const box = { x: [-2, 2] as const, y: [-2, 2] as const };
    const rings = zeroContour((x, y) => 1 - x * x - y * y, box, 40);
    expect(rings).toHaveLength(1);
    const ring = rings[0] as Vec2[];
    expect(ring.length).toBeGreaterThan(30);
    for (const [x, y] of ring) expect(Math.abs(Math.hypot(x, y) - 1)).toBeLessThan(0.01);
    // Closed: first and last points coincide.
    const first = ring[0] as Vec2;
    const last = ring[ring.length - 1] as Vec2;
    expect(close(first[0], last[0]) && close(first[1], last[1])).toBe(true);
  });

  it('fitted ellipses are the Mahalanobis level sets of the fitted Σ_k', () => {
    const fit = fitGda(points, false);
    const { mu, sigma } = fit.classes[1];
    const x: Vec2 = [mu[0] + Math.sqrt(sigma.a), mu[1]];
    expect(
      close(
        mahalanobisSquared(sigma, [x[0] - mu[0], x[1] - mu[1]]),
        sigma.a / (sigma.a - sigma.b ** 2 / sigma.c),
        1e-9,
      ),
    ).toBe(true);
  });
});

describe('fitLogistic', () => {
  const points = syntheticPoints({ ...spec, n: 500 }, createSeededRandom(11));

  it('decreases the mean log-loss monotonically and beats chance', () => {
    const fit = fitLogistic(points);
    expect(fit.loss).toHaveLength(400);
    for (let t = 1; t < fit.loss.length; t += 1) {
      expect(fit.loss[t]).toBeLessThanOrEqual((fit.loss[t - 1] as number) + 1e-12);
    }
    expect(fit.loss[fit.loss.length - 1]).toBeLessThan(Math.log(2));
    expect(accuracy(points, (x) => lineScore(fit, x))).toBeGreaterThan(0.8);
  });

  it('lands near the GDA line when the shared-Σ model is right', () => {
    const same = syntheticPoints({ ...spec, n: 4000, rotation: -20 }, createSeededRandom(5));
    const gda = linearBoundary(fitGda(same, true));
    const lr = fitLogistic(same, { steps: 2000 });
    const angle = (l: { theta: Vec2 }) => Math.atan2(l.theta[1], l.theta[0]);
    expect(Math.abs(angle(gda) - angle(lr))).toBeLessThan(0.15);
    expect(
      Math.abs(accuracy(same, (x) => lineScore(gda, x)) - accuracy(same, (x) => lineScore(lr, x))),
    ).toBeLessThan(0.02);
  });
});

describe('applyEdits', () => {
  const base: LabeledPoint[] = [
    { id: 0, x: [0, 0], y: 0 },
    { id: 1, x: [1, 1], y: 1 },
    { id: 2, x: [2, 2], y: 1 },
  ];

  it('moves by id and drops removed ids', () => {
    const out = applyEdits(base, [[1, 5, 5]], [2]);
    expect(out).toEqual([
      { id: 0, x: [0, 0], y: 0 },
      { id: 1, x: [5, 5], y: 1 },
    ]);
    expect(applyEdits(base, [], [])).toEqual(base);
  });
});

describe('adverseProjection', () => {
  it('standardizes with the cohort statistics and is deterministic for a seed', () => {
    const a = adverseProjection(['age', 'egfr'], 200, 7);
    const b = adverseProjection(['age', 'egfr'], 200, 7);
    expect(a).toEqual(b);
    expect(a).toHaveLength(200);
    expect(new Set(a.map((p) => p.id)).size).toBe(200);
    const age = featureStats('age');
    expect(Math.abs(age.mean - 63)).toBeLessThan(1.5);
    expect(a.every((p) => Math.abs(p.x[0]) < 5 && (p.y === 0 || p.y === 1))).toBe(true);
    // ≈ 6 % prevalence: a 400-patient sample has some events but is mostly class 0.
    const big = adverseProjection(['age', 'egfr'], 400, 1);
    const events = big.filter((p) => p.y === 1).length;
    expect(events).toBeGreaterThan(5);
    expect(events).toBeLessThan(80);
  });
});
