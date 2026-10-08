/**
 * Pure math for `generative-vs-discriminative-toggle` (lesson 6.1; L8
 * pp.30–41, L9 pp.2–4): the generative classifier's Bayes boundary as a
 * function of the prior p(y = 1), and the geometry the widget needs to show
 * it moving while the logistic-regression boundary does not.
 *
 * The fitting is not duplicated: the class-conditional Gaussians (GDA MLE),
 * the log posterior odds, the shared-Σ line, the zero contour, and logistic
 * regression by gradient descent all come from `gda-fitter/math`. This file
 * only swaps the prior and measures what that does.
 *
 * Notation (STYLE_GUIDE.md §2.1): φ̂ = n₁/n is the fitted prior, π the prior
 * the reader sets, θ and θ₀ a boundary's normal and offset.
 */
import {
  gdaScore,
  linearBoundary,
  lineScore,
  type Box,
  type GdaFit,
  type LabeledPoint,
  type LineParams,
  type Vec2,
} from '../gda-fitter/math';

export { lineScore } from '../gda-fitter/math';
export type { Box, GdaFit, LabeledPoint, LineParams, Vec2 } from '../gda-fitter/math';

/** log(p / (1 − p)). */
export function logit(p: number): number {
  return Math.log(p / (1 - p));
}

/**
 * The generative model with its class-conditionals p(x | y) kept and the
 * prior replaced by π: Bayes' rule then gives
 * log p(y=1|x)/p(y=0|x) = log p(x|y=1)/p(x|y=0) + log π/(1 − π).
 */
export function withPrior(fit: GdaFit, prior: number): GdaFit {
  return { ...fit, phi: prior };
}

/** Δ = logit π − logit φ̂: what moving the prior from φ̂ to π adds to the log odds at every x. */
export function priorShift(fitted: number, prior: number): number {
  return logit(prior) - logit(fitted);
}

/** Log posterior odds of the generative model under prior π (zero on the Bayes boundary). */
export function bayesScore(fit: GdaFit, prior: number, x: Vec2): number {
  return gdaScore(withPrior(fit, prior), x);
}

/** The shared-Σ Bayes boundary θᵀx + θ₀ = 0 under prior π. */
export function bayesLine(fit: GdaFit, prior: number): LineParams {
  return linearBoundary(withPrior(fit, prior));
}

/** Signed distance from x to the line θᵀx + θ₀ = 0, positive on the y = 1 side. */
export function signedDistance(line: LineParams, x: Vec2): number {
  return lineScore(line, x) / Math.hypot(line.theta[0], line.theta[1]);
}

/** How far a shared-Σ boundary moves when the log odds gain Δ everywhere: −Δ/‖θ‖ along θ. */
export function boundaryMove(line: LineParams, delta: number): number {
  return delta / Math.hypot(line.theta[0], line.theta[1]);
}

/** Points with a positive score, i.e. classified as y = 1. */
export function countPositive(points: readonly LabeledPoint[], score: (x: Vec2) => number): number {
  let k = 0;
  for (const p of points) if (score(p.x) > 0) k += 1;
  return k;
}

/** Angle in degrees between two boundaries' normals (0 = parallel and same orientation). */
export function angleBetween(a: LineParams, b: LineParams): number {
  const dot = a.theta[0] * b.theta[0] + a.theta[1] * b.theta[1];
  const na = Math.hypot(a.theta[0], a.theta[1]);
  const nb = Math.hypot(b.theta[0], b.theta[1]);
  const c = Math.max(-1, Math.min(1, dot / (na * nb)));
  return (Math.acos(c) * 180) / Math.PI;
}

/**
 * The part of the box where θᵀx + θ₀ > 0 (the "predict y = 1" side), as a
 * convex polygon: Sutherland–Hodgman clipping of the box's four corners by
 * one half-plane. Empty when the box lies wholly on the y = 0 side.
 */
export function positiveRegion(line: LineParams, box: Box): Vec2[] {
  const corners: Vec2[] = [
    [box.x[0], box.y[0]],
    [box.x[1], box.y[0]],
    [box.x[1], box.y[1]],
    [box.x[0], box.y[1]],
  ];
  const out: Vec2[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i] as Vec2;
    const b = corners[(i + 1) % corners.length] as Vec2;
    const sa = lineScore(line, a);
    const sb = lineScore(line, b);
    if (sa > 0) out.push(a);
    if (sa > 0 !== sb > 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Shoelace area of a simple polygon. */
export function polygonArea(poly: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i] as Vec2;
    const q = poly[(i + 1) % poly.length] as Vec2;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}
