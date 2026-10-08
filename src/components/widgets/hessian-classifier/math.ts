/**
 * Pure math for `hessian-classifier` (lesson 2.3): the quadratic
 * f(x) = ½ xᵀHx with H = Q diag(λ₁, λ₂) Qᵀ (Q the rotation by the reader's
 * angle), the second-order test that classifies its critical point at 0 from
 * the signs of the eigenvalues (der-2-3-6, der-2-3-7), and, for the
 * degenerate case, what an added higher-order term along the flat direction
 * does to the actual function (the lesson's θ⁴, −θ⁴, θ³ examples). Level sets
 * come from the marching-squares contour in `gda-fitter/math.ts` and the
 * eigen-decomposition from `gaussian-2d-covariance/math.ts`; neither is
 * duplicated here. No React, no DOM; unit-tested in `math.test.ts`.
 */
import { zeroContour, type Box } from '../gda-fitter/math';
import { eigenSymmetric2, type Eigen2, type Sym2, type Vec2 } from '../gaussian-2d-covariance/math';

export type { Box, Eigen2, Sym2, Vec2 };

/** Eigenvalues with |λ| at or below this are treated as exactly 0. */
export const ZERO_EIGENVALUE = 1e-9;

const DEG = Math.PI / 180;

/** H = Q diag(λ₁, λ₂) Qᵀ with Q = [[cos r, −sin r], [sin r, cos r]]. */
export function hessianFromEigen(lambda1: number, lambda2: number, rotationDeg: number): Sym2 {
  const c = Math.cos(rotationDeg * DEG);
  const s = Math.sin(rotationDeg * DEG);
  return {
    a: lambda1 * c * c + lambda2 * s * s,
    b: (lambda1 - lambda2) * c * s,
    c: lambda1 * s * s + lambda2 * c * c,
  };
}

/** The eigen-decomposition of H (λ₁ ≥ λ₂, unit eigenvectors), via the shared helper. */
export function eigenOf(h: Sym2): Eigen2 {
  return eigenSymmetric2(h);
}

/** ½ xᵀHx. */
export function quadraticForm(h: Sym2, x: Vec2): number {
  return 0.5 * (h.a * x[0] * x[0] + 2 * h.b * x[0] * x[1] + h.c * x[1] * x[1]);
}

export type CriticalKind = 'minimum' | 'maximum' | 'saddle' | 'degenerate';

/**
 * The second-order test at a critical point (der-2-3-6, der-2-3-7):
 * all eigenvalues > 0 ⇒ strict local minimum; all < 0 ⇒ strict local
 * maximum; some > 0 and some < 0 ⇒ saddle; otherwise (an eigenvalue is 0
 * and the rest share a sign) the test is silent: degenerate.
 */
export function classifyEigenvalues(
  values: readonly number[],
  tol = ZERO_EIGENVALUE,
): CriticalKind {
  const pos = values.some((v) => v > tol);
  const neg = values.some((v) => v < -tol);
  if (pos && neg) return 'saddle';
  const zero = values.some((v) => Math.abs(v) <= tol);
  if (zero) return 'degenerate';
  return pos ? 'minimum' : 'maximum';
}

/** Classify the critical point of ½xᵀHx from H itself (eigenvalues by the shared helper). */
export function classifyHessian(h: Sym2): CriticalKind {
  return classifyEigenvalues(eigenOf(h).values);
}

/** A term added along the flattest eigenvector q (smallest |λ|); its Hessian at 0 is 0. */
export const HIGHER_ORDER = ['none', 'quartic', 'negQuartic', 'cubic'] as const;

export type HigherOrder = (typeof HIGHER_ORDER)[number];

/** The scalar term as a function of z = qᵀx. */
export function higherOrderTerm(kind: HigherOrder, z: number): number {
  switch (kind) {
    case 'quartic':
      return 0.25 * z ** 4;
    case 'negQuartic':
      return -0.25 * z ** 4;
    case 'cubic':
      return z ** 3 / 3;
    default:
      return 0;
  }
}

/** Index (0 or 1) of the eigenvalue with the smallest |λ| (λ₂ on a tie): the flat direction. */
export function flatIndex(values: readonly [number, number]): 0 | 1 {
  return Math.abs(values[1]) <= Math.abs(values[0]) ? 1 : 0;
}

/** The columns of Q: q₁ = (cos r, sin r), q₂ = (−sin r, cos r). */
export function eigenvectorsFromRotation(rotationDeg: number): readonly [Vec2, Vec2] {
  const c = Math.cos(rotationDeg * DEG);
  const s = Math.sin(rotationDeg * DEG);
  return [
    [c, s],
    [-s, c],
  ];
}

export interface Surface {
  h: Sym2;
  /** The reader's (λ₁, λ₂), in slider order. */
  values: readonly [number, number];
  /** The reader's (q₁, q₂), the columns of Q, matched to `values`. */
  vectors: readonly [Vec2, Vec2];
  /** H's eigen-decomposition recomputed from the matrix (λ₁ ≥ λ₂), what the test reads. */
  eigen: Eigen2;
  /** Index into `values`/`vectors` of the direction the higher-order term acts along. */
  flat: 0 | 1;
  term: HigherOrder;
}

export function makeSurface(
  lambda1: number,
  lambda2: number,
  rotationDeg: number,
  term: HigherOrder,
): Surface {
  const values: [number, number] = [lambda1, lambda2];
  const h = hessianFromEigen(lambda1, lambda2, rotationDeg);
  return {
    h,
    values,
    vectors: eigenvectorsFromRotation(rotationDeg),
    eigen: eigenOf(h),
    flat: flatIndex(values),
    term,
  };
}

/** f(x) = ½xᵀHx + term(qᵀx), q the flat eigenvector. */
export function evaluate(s: Surface, x: Vec2): number {
  const q = s.vectors[s.flat];
  return quadraticForm(s.h, x) + higherOrderTerm(s.term, q[0] * x[0] + q[1] * x[1]);
}

/** f along t ↦ t·q_k, the 1-D slice through the critical point along eigenvector k. */
export function slice(s: Surface, k: 0 | 1, t: number): number {
  const q = s.vectors[k];
  return evaluate(s, [t * q[0], t * q[1]]);
}

export type ActualKind =
  | 'strict-minimum'
  | 'strict-maximum'
  | 'saddle'
  | 'non-strict-minimum'
  | 'non-strict-maximum'
  | 'constant';

/**
 * What the critical point at 0 of the actual f is (def-2-3-7). When the test
 * is decisive the higher-order term cannot change the answer (der-2-3-6:
 * the quadratic term beats any remainder that is o(‖v‖²)). When it is
 * silent, the term along the flat direction decides, exactly as θ⁴, −θ⁴, θ³
 * do in one dimension.
 */
export function actualKind(s: Surface, tol = ZERO_EIGENVALUE): ActualKind {
  const test = classifyEigenvalues(s.eigen.values, tol);
  if (test === 'minimum') return 'strict-minimum';
  if (test === 'maximum') return 'strict-maximum';
  if (test === 'saddle') return 'saddle';
  const other = s.values[s.flat === 0 ? 1 : 0];
  const otherSign = other > tol ? 1 : other < -tol ? -1 : 0;
  switch (s.term) {
    case 'cubic':
      return 'saddle';
    case 'quartic':
      return otherSign > 0 ? 'strict-minimum' : otherSign < 0 ? 'saddle' : 'non-strict-minimum';
    case 'negQuartic':
      return otherSign < 0 ? 'strict-maximum' : otherSign > 0 ? 'saddle' : 'non-strict-maximum';
    default:
      return otherSign > 0
        ? 'non-strict-minimum'
        : otherSign < 0
          ? 'non-strict-maximum'
          : 'constant';
  }
}

/**
 * Contour levels: ±½ s (k r₀)² for k = 1..count, with s the largest |λ|
 * (at least 0.5) and r₀ = half / (count + 0.5). For a definite quadratic the
 * level sets along the stiffest axis are then evenly spaced at k·r₀.
 */
export function contourLevels(e: Eigen2, half: number, count = 5): number[] {
  const scale = Math.max(Math.abs(e.values[0]), Math.abs(e.values[1]), 0.5);
  const r0 = half / (count + 0.5);
  const out: number[] = [];
  for (let k = 1; k <= count; k += 1) {
    const c = 0.5 * scale * (k * r0) ** 2;
    out.push(c, -c);
  }
  return out;
}

export interface LevelSet {
  level: number;
  lines: Vec2[][];
}

/** Width of a polyline's bounding box; marching squares turns an isolated zero into a dot. */
function extent(line: readonly Vec2[]): number {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of line) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return Math.max(x1 - x0, y1 - y0);
}

/**
 * The level sets {x : f(x) = c} for c = 0 and each given c, by marching
 * squares. Degenerate polylines (a grid node exactly at an isolated zero,
 * such as the minimum itself) are dropped.
 */
export function levelSets(s: Surface, box: Box, levels: readonly number[], cells = 72): LevelSet[] {
  return [0, ...levels].map((level) => ({
    level,
    lines: zeroContour((x, y) => evaluate(s, [x, y]) - level, box, cells).filter(
      (line) => extent(line) > 1e-6,
    ),
  }));
}
