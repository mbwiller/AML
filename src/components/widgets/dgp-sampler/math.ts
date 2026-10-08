/**
 * Pure math for `dgp-sampler` (lesson 2.1): draws from the linear
 * data-generating distribution of def-2-1-7,
 *
 *   X ~ N(0, σ_X²),  ε ~ N(0, σ_ε²) independent of X,  Y = α + βX + ε,
 *
 * the ordinary-least-squares line fitted to the first n draws, its sample R²
 * and training MSE, the same two numbers along a nested sequence of sample
 * sizes (the "R² vs n" curve), and the population R² they converge to.
 * No React, no DOM; every function is unit-tested in `math.test.ts`.
 *
 * Notation follows STYLE_GUIDE.md §2.1 and the lesson: α, β are the DGP's
 * intercept and slope; α̂, β̂ the OLS estimates; σ_ε the noise standard
 * deviation (never bare σ).
 */
import type { SeededRandom } from '../_shared/seeded-random';

export type Vec2 = readonly [number, number];

export interface Dgp {
  alpha: number;
  beta: number;
  sigmaX: number;
  sigmaEps: number;
}

/** Largest nested sample the widget draws; the n slider and the R² curve live inside it. */
export const N_MAX = 2000;

/**
 * Standard-normal pairs (z_i, e_i), i = 1..count. The DGP's draws are affine
 * images of these, so moving a slider rescales the same cloud instead of
 * redrawing it, and the first n draws are a prefix of the first n + 1.
 */
export interface StandardDraws {
  z: Float64Array;
  e: Float64Array;
}

export function standardDraws(count: number, rng: SeededRandom): StandardDraws {
  const z = new Float64Array(count);
  const e = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    z[i] = rng.normal();
    e[i] = rng.normal();
  }
  return { z, e };
}

/** x⁽ⁱ⁾ = σ_X z_i, y⁽ⁱ⁾ = α + β x⁽ⁱ⁾ + σ_ε e_i for the first n draws. */
export function sampleDgp(dgp: Dgp, draws: StandardDraws, n: number): Vec2[] {
  const count = Math.min(n, draws.z.length);
  const out: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = dgp.sigmaX * (draws.z[i] as number);
    out.push([x, dgp.alpha + dgp.beta * x + dgp.sigmaEps * (draws.e[i] as number)]);
  }
  return out;
}

/** Var(Y) = β²σ_X² + σ_ε² (der-2-1-6 step 7). */
export function varianceY(dgp: Dgp): number {
  return dgp.beta * dgp.beta * dgp.sigmaX * dgp.sigmaX + dgp.sigmaEps * dgp.sigmaEps;
}

/**
 * The population R² = Var(f*(X)) / Var(Y) = β²σ_X² / (β²σ_X² + σ_ε²), the
 * limit of the sample R² of OLS as n → ∞ (README.md derives it). NaN when
 * Var(Y) = 0 (β = 0 and σ_ε = 0): Y is constant and R² is 0/0.
 */
export function populationR2(dgp: Dgp): number {
  const total = varianceY(dgp);
  if (total <= 0) return Number.NaN;
  return (dgp.beta * dgp.beta * dgp.sigmaX * dgp.sigmaX) / total;
}

/**
 * Running centered moments (Welford): means and the centered sums
 * Sxx = Σ(x − x̄)², Syy = Σ(y − ȳ)², Sxy = Σ(x − x̄)(y − ȳ).
 */
export interface Moments {
  n: number;
  meanX: number;
  meanY: number;
  sxx: number;
  syy: number;
  sxy: number;
}

export const EMPTY_MOMENTS: Moments = { n: 0, meanX: 0, meanY: 0, sxx: 0, syy: 0, sxy: 0 };

export function addPoint(m: Moments, x: number, y: number): Moments {
  const n = m.n + 1;
  const dx = x - m.meanX;
  const dy = y - m.meanY;
  const meanX = m.meanX + dx / n;
  const meanY = m.meanY + dy / n;
  return {
    n,
    meanX,
    meanY,
    sxx: m.sxx + dx * (x - meanX),
    syy: m.syy + dy * (y - meanY),
    sxy: m.sxy + dx * (y - meanY),
  };
}

export function moments(points: readonly Vec2[]): Moments {
  let m = EMPTY_MOMENTS;
  for (const [x, y] of points) m = addPoint(m, x, y);
  return m;
}

export interface OlsFit {
  n: number;
  /** α̂ = ȳ − β̂ x̄. */
  alphaHat: number;
  /** β̂ = Sxy / Sxx. */
  betaHat: number;
  /** RSS = Σ(y⁽ⁱ⁾ − α̂ − β̂x⁽ⁱ⁾)² = Syy − Sxy² / Sxx. */
  rss: number;
  /** TSS = Σ(y⁽ⁱ⁾ − ȳ)² = Syy. */
  tss: number;
  /** R̂² = 1 − RSS / TSS; NaN when TSS = 0. */
  r2: number;
  /** Training MSE = RSS / n. */
  trainMse: number;
}

const nanFit = (n: number): OlsFit => ({
  n,
  alphaHat: Number.NaN,
  betaHat: Number.NaN,
  rss: Number.NaN,
  tss: Number.NaN,
  r2: Number.NaN,
  trainMse: Number.NaN,
});

/**
 * OLS with an intercept from the centered moments. Needs n ≥ 2 and two
 * distinct x values (Sxx > 0); otherwise every field is NaN.
 */
export function olsFromMoments(m: Moments): OlsFit {
  if (m.n < 2 || !(m.sxx > 0)) return nanFit(m.n);
  const betaHat = m.sxy / m.sxx;
  const alphaHat = m.meanY - betaHat * m.meanX;
  // Clamp the tiny negative values cancellation can produce when σ_ε = 0.
  const rss = Math.max(m.syy - (m.sxy * m.sxy) / m.sxx, 0);
  const tss = m.syy;
  // TSS is a sum of squares of numbers that are exactly equal when Y is
  // constant, but rounding can leave ~1e-30; treat that as zero.
  const r2 = tss > 1e-12 * m.n ? Math.min(Math.max(1 - rss / tss, 0), 1) : Number.NaN;
  return { n: m.n, alphaHat, betaHat, rss, tss, r2, trainMse: rss / m.n };
}

export function olsFit(points: readonly Vec2[]): OlsFit {
  return olsFromMoments(moments(points));
}

/** About `count` distinct integers from `min` to `max`, evenly spaced in log n. */
export function logSizes(min: number, max: number, count: number): number[] {
  const out: number[] = [];
  const a = Math.log(min);
  const b = Math.log(max);
  for (let k = 0; k < count; k += 1) {
    const n = Math.round(Math.exp(a + ((b - a) * k) / Math.max(count - 1, 1)));
    if (out[out.length - 1] !== n) out.push(n);
  }
  return out;
}

export interface PathPoint {
  n: number;
  r2: number;
  trainMse: number;
}

/**
 * Sample R² and training MSE of OLS fitted to the first n points, for every
 * n in `sizes` (ascending), in one pass over `points`.
 */
export function r2Path(points: readonly Vec2[], sizes: readonly number[]): PathPoint[] {
  const out: PathPoint[] = [];
  let m = EMPTY_MOMENTS;
  let i = 0;
  for (const n of sizes) {
    while (i < n && i < points.length) {
      const p = points[i] as Vec2;
      m = addPoint(m, p[0], p[1]);
      i += 1;
    }
    if (m.n < n) break;
    const fit = olsFromMoments(m);
    out.push({ n, r2: fit.r2, trainMse: fit.trainMse });
  }
  return out;
}

/** Half-width of the scatter's x window: 3 standard deviations at the largest σ_X. */
export const X_HALF = 6;

/**
 * The half-height of the y window (centered on 0), snapped to a short list so
 * the axis changes rarely as the sliders move: room for the intercept plus
 * 2.5 standard deviations of βX and of ε.
 */
export const Y_STEPS = [4, 6, 8, 12, 16, 24] as const;

export function yHalfRange(dgp: Dgp): number {
  const need =
    Math.abs(dgp.alpha) + Math.abs(dgp.beta) * 2.5 * dgp.sigmaX + 2.5 * dgp.sigmaEps + 0.5;
  return Y_STEPS.find((s) => s >= need) ?? 24;
}
