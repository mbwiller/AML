/**
 * Pure math for `mse-bowl-gd` (lessons 1.4 and 2.4): the empirical risk of
 * a one-feature linear model with an explicit column of ones,
 *
 *   R̂(θ) = (1/n)‖Xθ − y‖²,  X = [x, 1],  θ = (θ_x, θ_one),
 *
 * its gradient (2/n)Xᵀ(Xθ − y) and Hessian H = (2/n)XᵀX, the least-squares
 * minimum, the level sets {θ : R̂(θ) = R̂(θ̂) + c} (ellipses, because R̂ is a
 * quadratic: R̂(θ) − R̂(θ̂) = (θ − θ̂)ᵀ(H/2)(θ − θ̂)), feature standardization,
 * and gradient descent with the three stopping rules of def-2-4-4.
 *
 * The coordinate order (feature first, then the ones column) is the Lecture
 * 4 companion's `['bmi', 'one']`. No React, no DOM; tested in `math.test.ts`.
 */
import { eigenSymmetric2, type Eigen2, type Sym2, type Vec2 } from '../gaussian-2d-covariance/math';
import type { XY } from '../line-fit-playground/data';
import { fitOls, mean } from '../line-fit-playground/math';

export type { Sym2, Vec2 } from '../gaussian-2d-covariance/math';

export const STOPPING_RULES = ['parameter-change', 'gradient-norm', 'loss-change'] as const;
export type StoppingRule = (typeof STOPPING_RULES)[number];

/** R̂(θ) = (1/n) Σ (θ_x x⁽ⁱ⁾ + θ_one − y⁽ⁱ⁾)². */
export function risk(d: XY, theta: Vec2): number {
  const n = d.x.length;
  let s = 0;
  for (let i = 0; i < n; i += 1) {
    const r = theta[0] * (d.x[i] as number) + theta[1] - (d.y[i] as number);
    s += r * r;
  }
  return s / n;
}

/** ∇R̂(θ) = (2/n) Xᵀ(Xθ − y), a column vector (θ_x, θ_one) component order. */
export function gradient(d: XY, theta: Vec2): [number, number] {
  const n = d.x.length;
  let g0 = 0;
  let g1 = 0;
  for (let i = 0; i < n; i += 1) {
    const xi = d.x[i] as number;
    const r = theta[0] * xi + theta[1] - (d.y[i] as number);
    g0 += r * xi;
    g1 += r;
  }
  return [(2 / n) * g0, (2 / n) * g1];
}

/** H = (2/n) XᵀX = 2 [[mean(x²), mean(x)], [mean(x), 1]]. */
export function hessian(d: XY): Sym2 {
  const n = d.x.length;
  let sxx = 0;
  let sx = 0;
  for (const xi of d.x) {
    sxx += xi * xi;
    sx += xi;
  }
  return { a: (2 / n) * sxx, b: (2 / n) * sx, c: 2 };
}

/** κ(H) = λ_max / λ_min (∞ when H is singular). */
export function conditionNumber(h: Sym2): number {
  const { values } = eigenSymmetric2(h);
  return values[1] > 0 ? values[0] / values[1] : Number.POSITIVE_INFINITY;
}

/** The least-squares minimum θ̂ = (θ̂_x, θ̂_one). */
export function leastSquares(d: XY): Vec2 {
  const fit = fitOls(d.x, d.y);
  return [fit.theta1, fit.theta0];
}

export interface Standardization {
  data: XY;
  /** Mean and standard deviation (1/n) of the raw feature. */
  mean: number;
  sd: number;
}

/**
 * z⁽ⁱ⁾ = (x⁽ⁱ⁾ − x̄) / s with s² = (1/n) Σ (x⁽ⁱ⁾ − x̄)² (the [[z-score]] of
 * lesson 2.5). Then mean(z) = 0 and mean(z²) = 1, so H = 2I and κ = 1.
 */
export function standardize(d: XY): Standardization {
  const m = mean(d.x);
  let ss = 0;
  for (const xi of d.x) ss += (xi - m) ** 2;
  const sd = Math.sqrt(ss / d.x.length) || 1;
  return { data: { x: d.x.map((xi) => (xi - m) / sd), y: d.y }, mean: m, sd };
}

/**
 * The same line in raw-feature coordinates: θ_z z + θ_one with z = (x − x̄)/s
 * is (θ_z / s) x + (θ_one − θ_z x̄ / s).
 */
export function toRawCoordinates(theta: Vec2, s: Pick<Standardization, 'mean' | 'sd'>): Vec2 {
  const slope = theta[0] / s.sd;
  return [slope, theta[1] - slope * s.mean];
}

export interface GdOptions {
  init: Vec2;
  eta: number;
  stopping: StoppingRule;
  tolerance: number;
  maxIterations: number;
}

export type GdStatus = 'converged' | 'max-iterations' | 'diverged';

export interface GdRun {
  /** θ⁽⁰⁾ … θ⁽ᴺ⁾ as [x0, one0, x1, one1, …]. */
  path: Float64Array;
  /** R̂(θ⁽ᵗ⁾) for t = 0 … N. */
  losses: Float64Array;
  /** Number of updates performed, N. */
  iterations: number;
  status: GdStatus;
  /** The stopping quantity at the last check (‖Δθ‖, ‖∇R̂‖, or |ΔR̂|). */
  lastCheck: number;
}

/** θ⁽ᵗ⁾ from a run (clamped to the run's range). */
export function iterate(run: GdRun, t: number): Vec2 {
  const k = Math.max(0, Math.min(run.iterations, Math.trunc(t)));
  return [run.path[2 * k] as number, run.path[2 * k + 1] as number];
}

/**
 * Gradient descent θ⁽ᵗ⁺¹⁾ = θ⁽ᵗ⁾ − η∇R̂(θ⁽ᵗ⁾) (eq. 2.4.2) until a stopping
 * rule holds (def-2-4-4):
 *
 * - `parameter-change`: stop after the update with ‖θ⁽ᵗ⁺¹⁾ − θ⁽ᵗ⁾‖ ≤ ε, the
 *   Lecture 4 companion's loop (`while norm(theta − theta_prev) > threshold`);
 * - `loss-change`: stop after the update with |R̂(θ⁽ᵗ⁺¹⁾) − R̂(θ⁽ᵗ⁾)| ≤ ε;
 * - `gradient-norm`: stop before updating when ‖∇R̂(θ⁽ᵗ⁾)‖ ≤ ε.
 *
 * A run whose loss becomes non-finite or exceeds 10¹² times its start is
 * `diverged`; one that hits `maxIterations` is `max-iterations`.
 */
export function gradientDescent(d: XY, o: GdOptions): GdRun {
  const cap = Math.max(0, Math.trunc(o.maxIterations));
  const path = new Float64Array(2 * (cap + 1));
  const losses = new Float64Array(cap + 1);
  let theta: [number, number] = [o.init[0], o.init[1]];
  let loss = risk(d, theta);
  const blowUp = 1e12 * Math.max(1, loss);
  path[0] = theta[0];
  path[1] = theta[1];
  losses[0] = loss;
  let t = 0;
  let status: GdStatus = 'max-iterations';
  let lastCheck = Number.NaN;
  while (t < cap) {
    const g = gradient(d, theta);
    if (o.stopping === 'gradient-norm') {
      lastCheck = Math.hypot(g[0], g[1]);
      if (lastCheck <= o.tolerance) {
        status = 'converged';
        break;
      }
    }
    const next: [number, number] = [theta[0] - o.eta * g[0], theta[1] - o.eta * g[1]];
    const nextLoss = risk(d, next);
    t += 1;
    path[2 * t] = next[0];
    path[2 * t + 1] = next[1];
    losses[t] = nextLoss;
    if (!Number.isFinite(nextLoss) || nextLoss > blowUp) {
      status = 'diverged';
      break;
    }
    if (o.stopping === 'parameter-change') {
      lastCheck = Math.hypot(next[0] - theta[0], next[1] - theta[1]);
    } else if (o.stopping === 'loss-change') {
      lastCheck = Math.abs(nextLoss - loss);
    }
    theta = next;
    loss = nextLoss;
    if (o.stopping !== 'gradient-norm' && lastCheck <= o.tolerance) {
      status = 'converged';
      break;
    }
  }
  return {
    path: path.subarray(0, 2 * (t + 1)),
    losses: losses.subarray(0, t + 1),
    iterations: t,
    status,
    lastCheck,
  };
}

/**
 * Points on the level set {θ : (θ − θ̂)ᵀ A (θ − θ̂) = c} for a symmetric
 * positive-definite A (here A = H/2, so the set is R̂ = R̂(θ̂) + c): along each
 * eigenvector vₖ the semi-axis is √(c/λₖ).
 */
export function levelSet(center: Vec2, a: Sym2, c: number, count = 96, eigen?: Eigen2): Vec2[] {
  const e = eigen ?? eigenSymmetric2(a);
  const [l1, l2] = e.values;
  const [v1, v2] = e.vectors;
  if (!(l1 > 0) || !(l2 > 0) || !(c > 0)) return [];
  const r1 = Math.sqrt(c / l1);
  const r2 = Math.sqrt(c / l2);
  const out: Vec2[] = [];
  for (let k = 0; k <= count; k += 1) {
    const phi = (2 * Math.PI * k) / count;
    const u = r1 * Math.cos(phi);
    const w = r2 * Math.sin(phi);
    out.push([center[0] + u * v1[0] + w * v2[0], center[1] + u * v1[1] + w * v2[1]]);
  }
  return out;
}

/** `count` excess-risk levels c_k = top · ratio^k (k = 1 … count), largest first. */
export function contourLevels(top: number, count: number, ratio: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= count; k += 1) out.push(top * ratio ** k);
  return out;
}

/** Half the Hessian, A = XᵀX / n, whose quadratic form is the excess risk. */
export function halfHessian(h: Sym2): Sym2 {
  return { a: h.a / 2, b: h.b / 2, c: h.c / 2 };
}

/** (θ − θ̂)ᵀ A (θ − θ̂). */
export function excessRisk(a: Sym2, center: Vec2, theta: Vec2): number {
  const u = theta[0] - center[0];
  const w = theta[1] - center[1];
  return a.a * u * u + 2 * a.b * u * w + a.c * w * w;
}
