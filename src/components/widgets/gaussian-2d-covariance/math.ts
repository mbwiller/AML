/**
 * Pure math for `gaussian-2d-covariance` (lesson 7.1): the covariance matrix
 * from (σx, σy, ρ), the eigen-decomposition of a symmetric 2×2 matrix, the
 * level sets of N(0, Σ), and Cholesky sampling. No React, no DOM; every
 * function is unit-tested in `math.test.ts`.
 *
 * Notation follows STYLE_GUIDE.md §2.1: Σ is the covariance matrix, λ its
 * eigenvalues (λ1 ≥ λ2), v1 and v2 the unit eigenvectors.
 */
import type { SeededRandom } from '../_shared/seeded-random';

export type Vec2 = readonly [number, number];

/** Symmetric 2×2 matrix [[a, b], [b, c]]. */
export interface Sym2 {
  a: number;
  b: number;
  c: number;
}

export interface Eigen2 {
  /** λ1 ≥ λ2. */
  values: readonly [number, number];
  /** Unit eigenvectors for λ1 and λ2; v2 is v1 rotated by +90°. */
  vectors: readonly [Vec2, Vec2];
}

/** Σ = [[σx², ρσxσy], [ρσxσy, σy²]]. */
export function covarianceMatrix(sigmaX: number, sigmaY: number, rho: number): Sym2 {
  return { a: sigmaX * sigmaX, b: rho * sigmaX * sigmaY, c: sigmaY * sigmaY };
}

export function determinant(m: Sym2): number {
  return m.a * m.c - m.b * m.b;
}

export function trace(m: Sym2): number {
  return m.a + m.c;
}

/**
 * Eigen-decomposition of a symmetric 2×2 matrix in closed form:
 * λ = tr/2 ± sqrt(((a − c)/2)² + b²). The eigenvector for λ1 is the larger
 * of (b, λ1 − a) and (λ1 − c, b), which are both in its null space; the sign
 * is fixed so v1 points into the right half-plane (up when vertical) and does
 * not flip as the sliders move.
 */
export function eigenSymmetric2(m: Sym2): Eigen2 {
  const half = (m.a + m.c) / 2;
  const disc = Math.sqrt(((m.a - m.c) / 2) ** 2 + m.b * m.b);
  const l1 = half + disc;
  const l2 = half - disc;

  let v1: [number, number];
  const candA: [number, number] = [m.b, l1 - m.a];
  const candB: [number, number] = [l1 - m.c, m.b];
  const normA = Math.hypot(candA[0], candA[1]);
  const normB = Math.hypot(candB[0], candB[1]);
  if (Math.max(normA, normB) < 1e-12) {
    // Isotropic: any direction; take the x axis.
    v1 = [1, 0];
  } else if (normA >= normB) {
    v1 = [candA[0] / normA, candA[1] / normA];
  } else {
    v1 = [candB[0] / normB, candB[1] / normB];
  }
  if (v1[0] < 0 || (v1[0] === 0 && v1[1] < 0)) v1 = [-v1[0], -v1[1]];
  const v2: Vec2 = [-v1[1], v1[0]];
  return { values: [l1, l2], vectors: [v1, v2] };
}

/** Angle of v1 in radians, in (−π/2, π/2]. */
export function majorAxisAngle(e: Eigen2): number {
  return Math.atan2(e.vectors[0][1], e.vectors[0][0]);
}

/**
 * Points on the level set {x : xᵀ Σ⁻¹ x = r²}, the ellipse with semi-axes
 * r·√λ1 along v1 and r·√λ2 along v2:
 * x(t) = r(√λ1 cos t · v1 + √λ2 sin t · v2).
 */
export function ellipsePoints(m: Sym2, r: number, count = 96): Vec2[] {
  const e = eigenSymmetric2(m);
  const [v1, v2] = e.vectors;
  const s1 = r * Math.sqrt(Math.max(e.values[0], 0));
  const s2 = r * Math.sqrt(Math.max(e.values[1], 0));
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (2 * Math.PI * i) / count;
    const c = s1 * Math.cos(t);
    const s = s2 * Math.sin(t);
    pts.push([c * v1[0] + s * v2[0], c * v1[1] + s * v2[1]]);
  }
  return pts;
}

/** xᵀ Σ⁻¹ x, the squared Mahalanobis distance from the mean 0. */
export function mahalanobisSquared(m: Sym2, x: Vec2): number {
  const det = determinant(m);
  // Σ⁻¹ = (1/det) [[c, −b], [−b, a]]
  return (m.c * x[0] * x[0] - 2 * m.b * x[0] * x[1] + m.a * x[1] * x[1]) / det;
}

/**
 * Lower-triangular Cholesky factor L with L Lᵀ = Σ:
 * L = [[σx, 0], [ρσy, σy√(1 − ρ²)]] in terms of (σx, σy, ρ); here from Σ.
 */
export function cholesky2(m: Sym2): { l11: number; l21: number; l22: number } {
  const l11 = Math.sqrt(m.a);
  const l21 = l11 > 0 ? m.b / l11 : 0;
  const l22 = Math.sqrt(Math.max(m.c - l21 * l21, 0));
  return { l11, l21, l22 };
}

/** n independent draws of z ~ N(0, I₂). Deterministic for a given rng. */
export function standardNormals(n: number, rng: SeededRandom): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i += 1) out.push([rng.normal(), rng.normal()]);
  return out;
}

/** x = L z so that x ~ N(0, L Lᵀ) = N(0, Σ). */
export function transformSamples(z: readonly Vec2[], m: Sym2): Vec2[] {
  const { l11, l21, l22 } = cholesky2(m);
  return z.map(([z1, z2]) => [l11 * z1, l21 * z1 + l22 * z2]);
}

/** Sample covariance about the origin (the mean is known to be 0). */
export function sampleCovariance(points: readonly Vec2[]): Sym2 {
  let a = 0;
  let b = 0;
  let c = 0;
  for (const [x, y] of points) {
    a += x * x;
    b += x * y;
    c += y * y;
  }
  const n = Math.max(points.length, 1);
  return { a: a / n, b: b / n, c: c / n };
}

/** Peak density of N(0, Σ) in two dimensions: 1 / (2π |Σ|^{1/2}). */
export function peakDensity(m: Sym2): number {
  return 1 / (2 * Math.PI * Math.sqrt(Math.max(determinant(m), 0)));
}
