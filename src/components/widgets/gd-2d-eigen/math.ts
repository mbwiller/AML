/**
 * Pure math for `gd-2d-eigen` (lesson 2.5, der-2-5-3 to der-2-5-5; L4
 * pp.50-53, L5 pp.7-9): gradient descent with one step size η on the 2-D
 * quadratic E(θ) = ½ θᵀAθ with A = Q diag(λ1, λ2) Qᵀ, Q the rotation by φ.
 * The minimizer is θ* = 0, so the error is θ itself. No React, no DOM;
 * tested in `math.test.ts`.
 *
 * Notation (STYLE_GUIDE.md §2.1, lesson 2.5): q1, q2 the eigenvectors (the
 * columns of Q), v = Qᵀθ the error in the eigenbasis, 1 − ηλi the per-mode
 * contraction factor, κ = λmax/λmin the condition number, ρ(η) = maxᵢ|1 − ηλᵢ|.
 */

export type Vec2 = readonly [number, number];

/** The plane is [−20, 20]², as on L4 p.53. */
export const DOMAIN = 20;

/** Symmetric 2×2 matrix [[a, b], [b, c]] (same shape as gaussian-2d-covariance's Sym2). */
export interface Sym2 {
  a: number;
  b: number;
  c: number;
}

const DEG = Math.PI / 180;

/** q1 = (cos φ, sin φ), q2 = (−sin φ, cos φ) for φ in degrees. */
export function eigenBasis(rotationDeg: number): readonly [Vec2, Vec2] {
  const c = Math.cos(rotationDeg * DEG);
  const s = Math.sin(rotationDeg * DEG);
  return [
    [c, s],
    [-s, c],
  ];
}

/** A = λ1 q1 q1ᵀ + λ2 q2 q2ᵀ (the spectral theorem read backwards, der-2-5-4 step 4). */
export function hessianFromEigen(lambda1: number, lambda2: number, rotationDeg: number): Sym2 {
  const [q1, q2] = eigenBasis(rotationDeg);
  return {
    a: lambda1 * q1[0] * q1[0] + lambda2 * q2[0] * q2[0],
    b: lambda1 * q1[0] * q1[1] + lambda2 * q2[0] * q2[1],
    c: lambda1 * q1[1] * q1[1] + lambda2 * q2[1] * q2[1],
  };
}

export function matVec(m: Sym2, v: Vec2): Vec2 {
  return [m.a * v[0] + m.b * v[1], m.b * v[0] + m.c * v[1]];
}

/** E(θ) = ½ θᵀAθ. */
export function energy(m: Sym2, theta: Vec2): number {
  const [x, y] = matVec(m, theta);
  return 0.5 * (theta[0] * x + theta[1] * y);
}

/** θ(0), …, θ(steps) from θ(t+1) = θ(t) − η Aθ(t) (∇E = Aθ, θ* = 0). */
export function gdIterates(m: Sym2, start: Vec2, eta: number, steps: number): Vec2[] {
  const out: Vec2[] = [start];
  let theta: Vec2 = start;
  for (let t = 0; t < steps; t += 1) {
    const g = matVec(m, theta);
    theta = [theta[0] - eta * g[0], theta[1] - eta * g[1]];
    out.push(theta);
  }
  return out;
}

/** v = Qᵀθ: the coordinates of θ along q1 and q2. */
export function toEigenCoords(theta: Vec2, rotationDeg: number): Vec2 {
  const [q1, q2] = eigenBasis(rotationDeg);
  return [q1[0] * theta[0] + q1[1] * theta[1], q2[0] * theta[0] + q2[1] * theta[1]];
}

/** The per-mode factors 1 − ηλ1, 1 − ηλ2 (der-2-5-4 step 6). */
export function modeFactors(lambda1: number, lambda2: number, eta: number): Vec2 {
  return [1 - eta * lambda1, 1 - eta * lambda2];
}

/** ρ(η) = maxᵢ |1 − ηλᵢ| (der-2-5-5 step 1). */
export function spectralRadius(lambda1: number, lambda2: number, eta: number): number {
  const [r1, r2] = modeFactors(lambda1, lambda2, eta);
  return Math.max(Math.abs(r1), Math.abs(r2));
}

/** κ = λmax / λmin (def-2-5-2). */
export function conditionNumber(lambda1: number, lambda2: number): number {
  return Math.max(lambda1, lambda2) / Math.min(lambda1, lambda2);
}

/** 2/λmax: GD converges from every start iff 0 < η < 2/λmax (eq. 2.5.2). */
export function stabilityBound(lambda1: number, lambda2: number): number {
  return 2 / Math.max(lambda1, lambda2);
}

/** η* = 2/(λmax + λmin), the best single step (der-2-5-5 step 4). */
export function bestStep(lambda1: number, lambda2: number): number {
  return 2 / (lambda1 + lambda2);
}

/** ρ(η*) = (κ − 1)/(κ + 1) (der-2-5-5 step 6). */
export function bestRate(kappa: number): number {
  return (kappa - 1) / (kappa + 1);
}

/** The fewest t with ρ^t ≤ tol; 1 when ρ = 0, Infinity when ρ ≥ 1. */
export function stepsToTolerance(rho: number, tol: number): number {
  const m = Math.abs(rho);
  if (m === 0) return 1;
  if (m >= 1) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.ceil(Math.log(tol) / Math.log(m) - 1e-9));
}

/**
 * The level set {θ : ½θᵀAθ = level}: an ellipse with semi-axes √(2·level/λᵢ)
 * along qᵢ. Returns the semi-axes and the angle of q1 in radians.
 */
export function levelSetEllipse(
  lambda1: number,
  lambda2: number,
  rotationDeg: number,
  level: number,
): { radii: Vec2; angle: number } {
  return {
    radii: [Math.sqrt((2 * level) / lambda1), Math.sqrt((2 * level) / lambda2)],
    angle: rotationDeg * DEG,
  };
}

/** L4 p.53's five step sizes, as multiples of the stiffest mode's η_opt = 1/λmax. */
export const FIVE_RATES = [0.75, 1, 1.5, 2, 2.1] as const;

/** Iteration index of the first iterate whose norm is ≤ tol·‖θ(0)‖, or null. */
export function firstBelow(iterates: readonly Vec2[], tol: number): number | null {
  const n0 = Math.hypot(...(iterates[0] ?? [0, 0]));
  if (n0 === 0) return 0;
  const i = iterates.findIndex((p) => Math.hypot(p[0], p[1]) <= tol * n0);
  return i === -1 ? null : i;
}

/** `count` points on the level set ½θᵀAθ = level (for SVG polygons). */
export function levelSetPoints(
  lambda1: number,
  lambda2: number,
  rotationDeg: number,
  level: number,
  count = 72,
): Vec2[] {
  const { radii, angle } = levelSetEllipse(lambda1, lambda2, rotationDeg, level);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (2 * Math.PI * i) / count;
    const x = radii[0] * Math.cos(t);
    const y = radii[1] * Math.sin(t);
    pts.push([x * c - y * s, x * s + y * c]);
  }
  return pts;
}

/** Contour levels E(θ(0))·s² for s = ¼, ½, ¾, 1, 5/4: ellipses through and around the start. */
export function contourLevels(e0: number): number[] {
  const base = e0 > 0 ? e0 : 1;
  return [0.25, 0.5, 0.75, 1, 1.25].map((s) => base * s * s);
}
