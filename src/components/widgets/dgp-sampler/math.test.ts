import { createSeededRandom } from '../_shared/seeded-random';
import {
  logSizes,
  moments,
  olsFit,
  populationR2,
  r2Path,
  sampleDgp,
  standardDraws,
  varianceY,
  yHalfRange,
  Y_STEPS,
  type Dgp,
  type Vec2,
} from './math';

/** Direct, non-incremental OLS for comparison. */
function directOls(points: readonly Vec2[]) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const beta = sxy / sxx;
  const alpha = my - beta * mx;
  let rss = 0;
  let tss = 0;
  for (const [x, y] of points) {
    rss += (y - alpha - beta * x) ** 2;
    tss += (y - my) ** 2;
  }
  return { alpha, beta, r2: 1 - rss / tss, mse: rss / n };
}

describe('dgp-sampler math', () => {
  const lesson: Dgp = { alpha: 0, beta: 1, sigmaX: 1, sigmaEps: 1 };

  it('population R² is β²σ_X² / (β²σ_X² + σ_ε²) with its edge cases', () => {
    expect(populationR2(lesson)).toBeCloseTo(0.5, 12);
    expect(populationR2({ alpha: 3, beta: 2, sigmaX: 1.5, sigmaEps: 1 })).toBeCloseTo(9 / 10, 12);
    expect(populationR2({ alpha: 0, beta: 0, sigmaX: 1, sigmaEps: 1 })).toBe(0);
    expect(populationR2({ alpha: 0, beta: -1, sigmaX: 1, sigmaEps: 0 })).toBe(1);
    expect(populationR2({ alpha: 0, beta: 0, sigmaX: 1, sigmaEps: 0 })).toBeNaN();
    // The intercept never matters.
    expect(populationR2({ ...lesson, alpha: -3 })).toBe(populationR2(lesson));
    expect(varianceY({ alpha: 1, beta: 2, sigmaX: 0.5, sigmaEps: 3 })).toBeCloseTo(10, 12);
  });

  it('a large sample R² matches the population formula', () => {
    const n = 200_000;
    const cases: Dgp[] = [
      lesson,
      { alpha: 1.5, beta: -0.7, sigmaX: 1.8, sigmaEps: 2.2 },
      { alpha: -2, beta: 2, sigmaX: 0.4, sigmaEps: 0.3 },
      { alpha: 0, beta: 0.2, sigmaX: 1, sigmaEps: 2.5 },
    ];
    cases.forEach((dgp, k) => {
      const draws = standardDraws(n, createSeededRandom(100 + k));
      const fit = olsFit(sampleDgp(dgp, draws, n));
      expect(fit.r2, JSON.stringify(dgp)).toBeCloseTo(populationR2(dgp), 2);
      // The OLS coefficients and the training MSE converge too.
      expect(fit.betaHat).toBeCloseTo(dgp.beta, 1);
      expect(fit.alphaHat).toBeCloseTo(dgp.alpha, 1);
      expect(Math.abs(fit.trainMse - dgp.sigmaEps ** 2)).toBeLessThan(0.03 * dgp.sigmaEps ** 2);
    });
  });

  it('Welford OLS agrees with the direct formulas', () => {
    const dgp: Dgp = { alpha: 0.4, beta: -1.3, sigmaX: 1.2, sigmaEps: 0.8 };
    const points = sampleDgp(dgp, standardDraws(37, createSeededRandom(5)), 37);
    const fit = olsFit(points);
    const ref = directOls(points);
    expect(fit.alphaHat).toBeCloseTo(ref.alpha, 10);
    expect(fit.betaHat).toBeCloseTo(ref.beta, 10);
    expect(fit.r2).toBeCloseTo(ref.r2, 10);
    expect(fit.trainMse).toBeCloseTo(ref.mse, 10);
    expect(moments(points).n).toBe(37);
  });

  it('σ_ε = 0 puts every draw on the line: β̂ = β, R̂² = 1, training MSE 0', () => {
    const dgp: Dgp = { alpha: 2, beta: 1.5, sigmaX: 1, sigmaEps: 0 };
    const fit = olsFit(sampleDgp(dgp, standardDraws(20, createSeededRandom(3)), 20));
    expect(fit.betaHat).toBeCloseTo(1.5, 10);
    expect(fit.alphaHat).toBeCloseTo(2, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
    expect(fit.trainMse).toBeCloseTo(0, 10);
  });

  it('a constant Y has an undefined R² and too few points have no fit', () => {
    const flat = olsFit(
      sampleDgp(
        { alpha: 1, beta: 0, sigmaX: 1, sigmaEps: 0 },
        standardDraws(10, createSeededRandom(1)),
        10,
      ),
    );
    expect(flat.r2).toBeNaN();
    expect(flat.betaHat).toBeCloseTo(0, 12);
    expect(olsFit([[1, 2]]).betaHat).toBeNaN();
    expect(olsFit([]).r2).toBeNaN();
  });

  it('nested samples: the first n draws do not depend on how many are drawn', () => {
    const a = standardDraws(50, createSeededRandom(9));
    const b = standardDraws(2000, createSeededRandom(9));
    expect(Array.from(b.z.slice(0, 50))).toEqual(Array.from(a.z));
    expect(Array.from(b.e.slice(0, 50))).toEqual(Array.from(a.e));
  });

  it('the R² path equals refitting at each n', () => {
    const points = sampleDgp(lesson, standardDraws(400, createSeededRandom(2)), 400);
    const sizes = logSizes(3, 400, 20);
    const path = r2Path(points, sizes);
    expect(path.map((p) => p.n)).toEqual(sizes);
    for (const p of path) {
      const ref = olsFit(points.slice(0, p.n));
      expect(p.r2).toBeCloseTo(ref.r2, 10);
      expect(p.trainMse).toBeCloseTo(ref.trainMse, 10);
    }
    // Stops at the data it has.
    expect(r2Path(points.slice(0, 10), [3, 5, 50]).map((p) => p.n)).toEqual([3, 5]);
  });

  it('log sizes are strictly increasing integers from min to max', () => {
    const sizes = logSizes(3, 2000, 72);
    expect(sizes[0]).toBe(3);
    expect(sizes[sizes.length - 1]).toBe(2000);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1] as number);
    }
  });

  it('the y window snaps to a fixed list and covers the cloud', () => {
    expect(yHalfRange(lesson)).toBe(6);
    expect(Y_STEPS).toContain(yHalfRange({ alpha: 3, beta: 2, sigmaX: 2, sigmaEps: 3 }));
    expect(yHalfRange({ alpha: 0, beta: 0, sigmaX: 1, sigmaEps: 0 })).toBe(4);
  });
});
