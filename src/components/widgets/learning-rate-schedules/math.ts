/**
 * Pure math for `learning-rate-schedules` (lesson 2.5, def-2-5-4 and
 * der-2-5-8; L5 p.11): the slide's three decaying schedules plus a constant
 * baseline, their partial sums Σηₜ and Σηₜ² (the Robbins–Monro quantities),
 * the closed-form infinite sums, and gradient descent with each schedule on a
 * loss whose gradient norm is at most G = 1. No React, no DOM; tested in
 * `math.test.ts`.
 *
 * The loss is the pseudo-Huber function E(θ) = √(1 + θ²) − 1 with minimizer
 * θ* = 0: E'(θ) = θ/√(1 + θ²), so |E'(θ)| < 1 everywhere (the bounded-gradient
 * assumption of der-2-5-8 step 2 with G = 1), E''(0) = 1 (a parabola near
 * the minimum), and far away it is nearly |θ| (each step moves almost ηₜ).
 */

export const SCHEDULES = ['constant', 'inverse', 'inverse-square', 'exponential'] as const;
export type Schedule = (typeof SCHEDULES)[number];

/** Upper bound on |E'(θ)| for the pseudo-Huber loss. */
export const G = 1;

/** ηₜ for t = 0, 1, 2, … (L5 p.11; "constant" is the no-decay baseline). */
export function stepSize(schedule: Schedule, eta0: number, beta: number, t: number): number {
  switch (schedule) {
    case 'constant':
      return eta0;
    case 'inverse':
      return eta0 / (t + 1);
    case 'inverse-square':
      return eta0 / ((t + 1) * (t + 1));
    case 'exponential':
      return eta0 * Math.exp(-beta * t);
  }
}

/** η₀, …, η_{T−1}. */
export function stepSizes(schedule: Schedule, eta0: number, beta: number, T: number): number[] {
  return Array.from({ length: T }, (_, t) => stepSize(schedule, eta0, beta, t));
}

/** Partial sums S_T = Σ_{t<T} xₜ for T = 0 … n (S_0 = 0). */
export function partialSums(xs: readonly number[]): number[] {
  const out = [0];
  let s = 0;
  for (const x of xs) {
    s += x;
    out.push(s);
  }
  return out;
}

/** Σ_{t≥0} ηₜ in closed form (der-2-5-8 steps 4-6); Infinity when it diverges. */
export function infiniteSum(schedule: Schedule, eta0: number, beta: number): number {
  switch (schedule) {
    case 'constant':
    case 'inverse':
      return Number.POSITIVE_INFINITY;
    case 'inverse-square':
      return (eta0 * Math.PI ** 2) / 6;
    case 'exponential':
      return eta0 / (1 - Math.exp(-beta));
  }
}

/** Σ_{t≥0} ηₜ² in closed form; Infinity when it diverges. */
export function infiniteSumOfSquares(schedule: Schedule, eta0: number, beta: number): number {
  switch (schedule) {
    case 'constant':
      return Number.POSITIVE_INFINITY;
    case 'inverse':
      return (eta0 * eta0 * Math.PI ** 2) / 6;
    case 'inverse-square':
      // Σ 1/k⁴ = π⁴/90
      return (eta0 * eta0 * Math.PI ** 4) / 90;
    case 'exponential':
      return (eta0 * eta0) / (1 - Math.exp(-2 * beta));
  }
}

export interface RobbinsMonro {
  /** Σηₜ = ∞ (enough total movement). */
  sumDiverges: boolean;
  /** Σηₜ² < ∞ (finite accumulated noise). */
  squaresConverge: boolean;
}

/** Which Robbins–Monro conditions (eq. 2.5.5) the schedule meets (independent of η₀, β > 0). */
export function robbinsMonro(schedule: Schedule): RobbinsMonro {
  return {
    sumDiverges: schedule === 'constant' || schedule === 'inverse',
    squaresConverge: schedule !== 'constant',
  };
}

/** The pseudo-Huber loss E(θ) = √(1 + θ²) − 1. */
export function loss(theta: number): number {
  return Math.sqrt(1 + theta * theta) - 1;
}

/** E'(θ) = θ/√(1 + θ²), |E'| < G = 1. */
export function lossGradient(theta: number): number {
  return theta / Math.sqrt(1 + theta * theta);
}

/** θ(0) … θ(T) from θ(t+1) = θ(t) − ηₜ E'(θ(t)). */
export function runSchedule(
  schedule: Schedule,
  eta0: number,
  beta: number,
  theta0: number,
  T: number,
): number[] {
  const out = [theta0];
  let theta = theta0;
  for (let t = 0; t < T; t += 1) {
    theta -= stepSize(schedule, eta0, beta, t) * lossGradient(theta);
    out.push(theta);
  }
  return out;
}

/** "Arrived" means within this fraction of the starting distance of θ*. */
export const ARRIVAL_FRACTION = 0.1;

/** First t with |θ(t) − θ*| ≤ tol, or null. */
export function arrivalStep(iterates: readonly number[], tol: number): number | null {
  const i = iterates.findIndex((theta) => Math.abs(theta) <= tol);
  return i === -1 ? null : i;
}

/**
 * The closest any run can get when Σηₜ = S < d0: by der-2-5-8 step 2 the
 * iterates stay within G·S of θ(0), so they never come nearer to θ* than
 * d0 − G·S (0 when the budget suffices).
 */
export function stallDistance(d0: number, totalSum: number): number {
  return Math.max(d0 - G * totalSum, 0);
}
