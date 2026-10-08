/**
 * Pure math for `gd-1d-quadratic` (lesson 2.5, der-2-5-1 and der-2-5-2;
 * L4 pp.48-49): gradient descent with a fixed step size η on
 * E(θ) = ½aθ² + bθ + c. No React, no DOM; tested in `math.test.ts`.
 *
 * Notation (STYLE_GUIDE.md §2.1): θ the parameter, θ* = −b/a the minimizer,
 * e(t) = θ(t) − θ* the error, η the step size, r = 1 − ηa the contraction
 * factor, η_opt = 1/a, divergence above 2η_opt = 2/a.
 */

export interface Quadratic1D {
  /** Curvature E''(θ) = a > 0. */
  a: number;
  b: number;
  c: number;
}

export function energy(q: Quadratic1D, theta: number): number {
  return 0.5 * q.a * theta * theta + q.b * theta + q.c;
}

/** E'(θ) = aθ + b. */
export function derivative(q: Quadratic1D, theta: number): number {
  return q.a * theta + q.b;
}

/** θ* = −b/a (first-order condition; a > 0). */
export function minimizer(q: Quadratic1D): number {
  return -q.b / q.a;
}

export function minimumValue(q: Quadratic1D): number {
  return energy(q, minimizer(q));
}

/** r = 1 − ηa: e(t+1) = r · e(t) (der-2-5-1 step 7). */
export function contractionFactor(a: number, eta: number): number {
  return 1 - eta * a;
}

/** η_opt = 1/a = 1/E''(θ): lands on θ* in one step from any start. */
export function etaOpt(a: number): number {
  return 1 / a;
}

/** 2η_opt = 2/a: the boundary between bouncing forever and divergence. */
export function etaDivergence(a: number): number {
  return 2 / a;
}

export type Regime = 'frozen' | 'monotone' | 'exact' | 'oscillating' | 'bounce' | 'divergent';

export const REGIME_LABEL: Record<Regime, string> = {
  frozen: 'no movement (η = 0)',
  monotone: 'monotone convergence',
  exact: 'exact in one step',
  oscillating: 'oscillating convergence',
  bounce: 'bounces forever',
  divergent: 'divergence',
};

/**
 * The regime of der-2-5-2, read from the sign and size of r = 1 − ηa.
 * `tol` absorbs float error when η was set to exactly η_opt or 2η_opt.
 */
export function regime(a: number, eta: number, tol = 1e-9): Regime {
  if (eta <= 0) return 'frozen';
  const r = contractionFactor(a, eta);
  if (Math.abs(r) <= tol) return 'exact';
  if (Math.abs(r + 1) <= tol) return 'bounce';
  if (r > 0) return 'monotone';
  if (r > -1) return 'oscillating';
  return 'divergent';
}

/** θ(0), θ(1), …, θ(steps) from θ(t+1) = θ(t) − η E'(θ(t)) (L4 p.48's update). */
export function gdIterates(q: Quadratic1D, theta0: number, eta: number, steps: number): number[] {
  const out = [theta0];
  let theta = theta0;
  for (let t = 0; t < steps; t += 1) {
    theta = theta - eta * derivative(q, theta);
    out.push(theta);
  }
  return out;
}

/** e(t) = (1 − ηa)^t e(0) (der-2-5-1 step 8). */
export function errorAt(a: number, eta: number, e0: number, t: number): number {
  return contractionFactor(a, eta) ** t * e0;
}

/**
 * The fewest steps t with |r|^t ≤ tol (the error shrunk by the factor tol):
 * 1 when r = 0, Infinity when |r| ≥ 1.
 */
export function stepsToTolerance(r: number, tol: number): number {
  const m = Math.abs(r);
  if (m === 0) return 1;
  if (m >= 1) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.ceil(Math.log(tol) / Math.log(m) - 1e-9));
}

/**
 * The plot window: centered on θ*, wide enough for θ(0) and its mirror image
 * (the first overshoot at η = 2η_opt lands there), never narrower than ±1.
 */
export function plotWindow(
  q: Quadratic1D,
  theta0: number,
): {
  x: [number, number];
  y: [number, number];
} {
  const star = minimizer(q);
  const half = Math.max(1.35 * Math.abs(theta0 - star), 1);
  const x: [number, number] = [star - half, star + half];
  const eMin = minimumValue(q);
  const eMax = eMin + 0.5 * q.a * half * half;
  const pad = 0.08 * (eMax - eMin);
  return { x, y: [eMin - pad, eMax + pad] };
}
