import { fitGda, gdaScore, linearBoundary } from '../gda-fitter/math';
import { params } from './manifest';
import {
  angleBetween,
  bayesLine,
  bayesScore,
  boundaryMove,
  countPositive,
  logit,
  polygonArea,
  positiveRegion,
  priorShift,
  signedDistance,
  type LabeledPoint,
} from './math';
import { BOX, bayesBoundary, fitDiscriminative, logisticBoundary, samplePoints } from './scene';

const defaults = params.parse({});
const points = samplePoints(defaults);
const shared = fitGda(points, true);
const separate = fitGda(points, false);
const PRIORS = [0.01, 0.03, 0.06, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 0.99];

describe('the prior enters the log odds additively', () => {
  it('logit and the shift Δ = logit π − logit φ̂', () => {
    expect(logit(0.5)).toBe(0);
    expect(priorShift(0.06, 0.5)).toBeCloseTo(Math.log(0.94 / 0.06), 12);
    expect(priorShift(0.2, 0.2)).toBe(0);
  });

  it('changing π adds Δ to the log odds at every x, whatever the covariance model', () => {
    for (const fit of [shared, separate]) {
      for (const x of [
        [0, 0],
        [1.5, -2],
        [-3, 1],
      ] as const) {
        const at = (pi: number) => bayesScore(fit, pi, [x[0], x[1]]);
        expect(at(0.5) - at(0.06)).toBeCloseTo(priorShift(0.06, 0.5), 10);
        // At π = φ̂ it is gda-fitter's own score.
        expect(at(fit.phi)).toBeCloseTo(gdaScore(fit, [x[0], x[1]]), 12);
      }
    }
  });

  it('with a shared Σ only θ₀ moves: θ is the same line normal at every prior', () => {
    const base = linearBoundary(shared);
    for (const pi of PRIORS) {
      const line = bayesLine(shared, pi);
      expect(line.theta[0]).toBeCloseTo(base.theta[0], 12);
      expect(line.theta[1]).toBeCloseTo(base.theta[1], 12);
      expect(line.theta0 - base.theta0).toBeCloseTo(priorShift(shared.phi, pi), 10);
    }
  });

  it('raising π moves the boundary toward the no-event mean by Δ/‖θ‖', () => {
    const mu0 = shared.classes[0].mu;
    const d = (pi: number) => signedDistance(bayesLine(shared, pi), mu0);
    // μ₀ sits on the y = 0 side at the fitted prior, closer to the line as π grows.
    expect(d(shared.phi)).toBeLessThan(0);
    for (let i = 1; i < PRIORS.length; i += 1) {
      expect(d(PRIORS[i] as number)).toBeGreaterThan(d(PRIORS[i - 1] as number));
    }
    const line = bayesLine(shared, 0.06);
    const delta = priorShift(0.06, 0.5);
    expect(d(0.5) - d(0.06)).toBeCloseTo(boundaryMove(line, delta), 10);
  });

  it('flags more patients as the prior rises (generative), never fewer', () => {
    for (const fit of [shared, separate]) {
      const counts = PRIORS.map((pi) => countPositive(points, (x) => bayesScore(fit, pi, x)));
      for (let i = 1; i < counts.length; i += 1) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1] as number);
      }
      expect(counts[counts.length - 1]).toBeGreaterThan(counts[0] as number);
    }
  });
});

describe('the ADVERSE default the lesson embeds', () => {
  it('has a ≈ 6% event rate', () => {
    expect(points).toHaveLength(600);
    expect(shared.phi).toBeGreaterThan(0.04);
    expect(shared.phi).toBeLessThan(0.09);
  });

  it('at π = φ̂ the shared-Σ Bayes boundary and logistic regression nearly coincide', () => {
    const lr = fitDiscriminative(points);
    expect(angleBetween(bayesLine(shared, shared.phi), lr)).toBeLessThan(10);
    expect(Math.abs(bayesLine(shared, shared.phi).theta0 - lr.theta0)).toBeLessThan(0.5);
  });

  it('the Bayes boundary is in the window at both ends of the challenge (0.06 and 0.5)', () => {
    for (const pi of [0.06, 0.5]) {
      expect(bayesBoundary(shared, pi).polylines).toHaveLength(1);
    }
    // And moving from 0.06 to 0.5 flags several times as many patients.
    const at = (pi: number) => countPositive(points, (x) => bayesScore(shared, pi, x));
    expect(at(0.5)).toBeGreaterThan(3 * Math.max(at(0.06), 1));
  });

  it('the logistic-regression boundary depends on the data only', () => {
    const a = logisticBoundary(fitDiscriminative(points));
    const b = logisticBoundary(fitDiscriminative(samplePoints(defaults)));
    expect(a.line).toEqual(b.line);
  });
});

describe('geometry', () => {
  it('positiveRegion clips the box by the half-plane θᵀx + θ₀ > 0', () => {
    const half = positiveRegion({ theta: [1, 0], theta0: 0 }, BOX);
    expect(polygonArea(half)).toBeCloseTo(32, 10);
    const all = positiveRegion({ theta: [1, 0], theta0: 10 }, BOX);
    expect(polygonArea(all)).toBeCloseTo(64, 10);
    expect(positiveRegion({ theta: [1, 0], theta0: -10 }, BOX)).toEqual([]);
    const corner = positiveRegion({ theta: [1, 1], theta0: -6 }, BOX);
    expect(polygonArea(corner)).toBeCloseTo(2, 10);
  });

  it('countPositive and angleBetween', () => {
    const pts: LabeledPoint[] = [
      { id: 0, x: [1, 0], y: 1 },
      { id: 1, x: [-1, 0], y: 0 },
      { id: 2, x: [2, 0], y: 0 },
    ];
    expect(countPositive(pts, (x) => x[0])).toBe(2);
    expect(angleBetween({ theta: [1, 0], theta0: 0 }, { theta: [0, 2], theta0: 1 })).toBeCloseTo(
      90,
      10,
    );
  });
});
