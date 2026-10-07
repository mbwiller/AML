/**
 * Pure math for `gda-fitter` (lessons 7.2 and 7.3): the GDA maximum-likelihood
 * fit (φ, μ_k, Σ_k, pooled Σ), the log posterior odds whose zero level set is
 * the Bayes boundary (quadratic in general, linear with a shared Σ), a
 * marching-squares zero contour, logistic regression by gradient descent for
 * the overlay, and the seeded synthetic two-class sampler. No React, no DOM;
 * every function is unit-tested in `math.test.ts`.
 *
 * The 2×2 covariance helpers (eigen-decomposition, ellipse level sets,
 * Cholesky sampling) are imported from `gaussian-2d-covariance/math` so the
 * two widgets agree on what an ellipse is.
 *
 * Notation follows STYLE_GUIDE.md §2.1: μ_k, Σ_k per class, Σ when shared,
 * φ = P(y = 1), θ for the boundary's normal, σ(z) for the sigmoid.
 */
import type { SeededRandom } from '../_shared/seeded-random';
import {
  determinant,
  type Sym2,
  type Vec2,
  cholesky2,
  mahalanobisSquared,
} from '../gaussian-2d-covariance/math';

export type { Sym2, Vec2 } from '../gaussian-2d-covariance/math';

export interface LabeledPoint {
  /** Stable index into the generated sample; survives moves and removals. */
  id: number;
  x: Vec2;
  y: 0 | 1;
}

/** `[id, x, y]`: a point moved by the reader to (x, y). */
export type MovedPoint = readonly [number, number, number];

/* ---------- small linear algebra ---------- */

export function inverse(m: Sym2): Sym2 {
  const det = determinant(m);
  return { a: m.c / det, b: -m.b / det, c: m.a / det };
}

export function matVec(m: Sym2, v: Vec2): Vec2 {
  return [m.a * v[0] + m.b * v[1], m.b * v[0] + m.c * v[1]];
}

export function dot(u: Vec2, v: Vec2): number {
  return u[0] * v[0] + u[1] * v[1];
}

/** Σ = R(angle) diag(s1², s2²) R(angle)ᵀ: axes of length s1, s2, the first at `angle`. */
export function rotatedCovariance(s1: number, s2: number, angle: number): Sym2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const l1 = s1 * s1;
  const l2 = s2 * s2;
  return { a: c * c * l1 + s * s * l2, b: c * s * (l1 - l2), c: s * s * l1 + c * c * l2 };
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/* ---------- synthetic data ---------- */

export interface SyntheticSpec {
  n: number;
  /** P(y = 1). */
  prior: number;
  /** Distance between the two class means. */
  separation: number;
  /** Orientation of class 1's covariance in degrees (class 0 is fixed at −20°). */
  rotation: number;
}

/** The population behind the synthetic sample, exposed so readouts can show the truth. */
export function syntheticPopulation(spec: SyntheticSpec): {
  mu: [Vec2, Vec2];
  sigma: [Sym2, Sym2];
} {
  const half = spec.separation / 2;
  // Means along a slight diagonal so neither covariance axis is aligned with the gap.
  const mu: [Vec2, Vec2] = [
    [-half, -half / 2],
    [half, half / 2],
  ];
  const sigma: [Sym2, Sym2] = [
    rotatedCovariance(1.4, 0.6, (-20 * Math.PI) / 180),
    rotatedCovariance(1.4, 0.6, (spec.rotation * Math.PI) / 180),
  ];
  return { mu, sigma };
}

/**
 * n points: y ~ Bernoulli(prior), then x = μ_y + L_y z with z ~ N(0, I) and
 * L_y the Cholesky factor of Σ_y. Deterministic for a given rng.
 */
export function syntheticPoints(spec: SyntheticSpec, rng: SeededRandom): LabeledPoint[] {
  const { mu, sigma } = syntheticPopulation(spec);
  const chol = [cholesky2(sigma[0]), cholesky2(sigma[1])] as const;
  const out: LabeledPoint[] = [];
  for (let i = 0; i < spec.n; i += 1) {
    const y: 0 | 1 = rng.uniform() < spec.prior ? 1 : 0;
    const z1 = rng.normal();
    const z2 = rng.normal();
    const l = chol[y];
    const m = mu[y];
    out.push({ id: i, x: [m[0] + l.l11 * z1, m[1] + l.l21 * z1 + l.l22 * z2], y });
  }
  return out;
}

/** The reader's edits: moved points override their coordinates, removed ids disappear. */
export function applyEdits(
  points: readonly LabeledPoint[],
  moved: readonly MovedPoint[],
  removed: readonly number[],
): LabeledPoint[] {
  if (moved.length === 0 && removed.length === 0) return [...points];
  const gone = new Set(removed);
  const at = new Map<number, Vec2>();
  for (const [id, x, y] of moved) at.set(id, [x, y]);
  const out: LabeledPoint[] = [];
  for (const p of points) {
    if (gone.has(p.id)) continue;
    const x = at.get(p.id);
    out.push(x ? { ...p, x } : p);
  }
  return out;
}

/* ---------- GDA by maximum likelihood ---------- */

export interface ClassStats {
  n: number;
  /** Empirical mean, L10 p.20. */
  mu: Vec2;
  /** Empirical covariance with 1/n_k, L10 p.20 (undefined when n_k = 0: left at 0). */
  sigma: Sym2;
}

export interface GdaFit {
  n: number;
  /** φ = n_1 / n, L10 p.17. */
  phi: number;
  classes: readonly [ClassStats, ClassStats];
  /** Pooled Σ = (n_0 Σ_0 + n_1 Σ_1) / n, the shared-covariance MLE (lesson 7.3). */
  pooled: Sym2;
  shared: boolean;
  /** The covariance each class-conditional uses: Σ_k, or the pooled Σ twice. */
  cov: readonly [Sym2, Sym2];
  /**
   * True when the MLE does not exist (a class with n_k ≤ d = 2 points, or a
   * numerically singular covariance); the widget then draws no boundary.
   */
  degenerate: boolean;
  reason: string | null;
}

const DIMENSION = 2;

function classStats(points: readonly LabeledPoint[], k: 0 | 1): ClassStats {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    if (p.y !== k) continue;
    n += 1;
    sx += p.x[0];
    sy += p.x[1];
  }
  if (n === 0) return { n, mu: [0, 0], sigma: { a: 0, b: 0, c: 0 } };
  const mu: Vec2 = [sx / n, sy / n];
  let a = 0;
  let b = 0;
  let c = 0;
  for (const p of points) {
    if (p.y !== k) continue;
    const dx = p.x[0] - mu[0];
    const dy = p.x[1] - mu[1];
    a += dx * dx;
    b += dx * dy;
    c += dy * dy;
  }
  return { n, mu, sigma: { a: a / n, b: b / n, c: c / n } };
}

/** Numerically singular: det ≤ ε·tr², which catches collinear classes too. */
export function isSingular(m: Sym2): boolean {
  const tr = m.a + m.c;
  return !(determinant(m) > 1e-9 * tr * tr) || !(tr > 0);
}

export function fitGda(points: readonly LabeledPoint[], shared: boolean): GdaFit {
  const c0 = classStats(points, 0);
  const c1 = classStats(points, 1);
  const n = c0.n + c1.n;
  const phi = n > 0 ? c1.n / n : 0.5;
  const pooled: Sym2 =
    n > 0
      ? {
          a: (c0.n * c0.sigma.a + c1.n * c1.sigma.a) / n,
          b: (c0.n * c0.sigma.b + c1.n * c1.sigma.b) / n,
          c: (c0.n * c0.sigma.c + c1.n * c1.sigma.c) / n,
        }
      : { a: 0, b: 0, c: 0 };

  let reason: string | null = null;
  if (c0.n === 0 || c1.n === 0) {
    reason = 'one class has no points, so there is nothing to separate';
  } else if (shared) {
    if (n - 2 < DIMENSION) reason = `n − K = ${n - 2} < d = 2: the pooled Σ is singular`;
    else if (isSingular(pooled)) reason = 'the pooled covariance is singular';
  } else {
    for (const [k, c] of [c0, c1].entries()) {
      if (c.n <= DIMENSION) {
        reason = `class ${k} has n_${k} = ${c.n} ≤ d = 2 points: Σ_${k} is singular and the MLE does not exist`;
        break;
      }
      if (isSingular(c.sigma)) {
        reason = `class ${k}'s points are collinear: Σ_${k} is singular`;
        break;
      }
    }
  }
  return {
    n,
    phi,
    classes: [c0, c1],
    pooled,
    shared,
    cov: shared ? [pooled, pooled] : [c0.sigma, c1.sigma],
    degenerate: reason !== null,
    reason,
  };
}

/** log N(x; μ, Σ) in two dimensions. */
export function logGaussian(x: Vec2, mu: Vec2, sigma: Sym2): number {
  const d: Vec2 = [x[0] - mu[0], x[1] - mu[1]];
  return (
    -Math.log(2 * Math.PI) - 0.5 * Math.log(determinant(sigma)) - 0.5 * mahalanobisSquared(sigma, d)
  );
}

/**
 * The log posterior odds log[p(x | 1) φ] − log[p(x | 0) (1 − φ)]; its zero
 * level set is the Bayes decision boundary (lesson 7.2). Quadratic in x
 * unless the two covariances coincide.
 */
export function gdaScore(fit: GdaFit, x: Vec2): number {
  const [c0, c1] = fit.classes;
  return (
    logGaussian(x, c1.mu, fit.cov[1]) +
    Math.log(fit.phi) -
    logGaussian(x, c0.mu, fit.cov[0]) -
    Math.log(1 - fit.phi)
  );
}

export interface LineParams {
  /** θ, the normal of the boundary θᵀx + θ₀ = 0. */
  theta: Vec2;
  theta0: number;
}

/**
 * With a shared Σ the odds are affine: θ = Σ⁻¹(μ_1 − μ_0),
 * θ₀ = −½ μ_1ᵀ Σ⁻¹ μ_1 + ½ μ_0ᵀ Σ⁻¹ μ_0 + log(φ / (1 − φ)) (lesson 7.3,
 * course-map gap 2 for L10).
 */
export function linearBoundary(fit: GdaFit): LineParams {
  const [c0, c1] = fit.classes;
  const inv = inverse(fit.pooled);
  const theta = matVec(inv, [c1.mu[0] - c0.mu[0], c1.mu[1] - c0.mu[1]]);
  const theta0 =
    -0.5 * dot(c1.mu, matVec(inv, c1.mu)) +
    0.5 * dot(c0.mu, matVec(inv, c0.mu)) +
    Math.log(fit.phi / (1 - fit.phi));
  return { theta, theta0 };
}

export function lineScore(line: LineParams, x: Vec2): number {
  return dot(line.theta, x) + line.theta0;
}

/** Fraction of points whose score's sign matches the label (score > 0 ⇒ ŷ = 1). */
export function accuracy(points: readonly LabeledPoint[], score: (x: Vec2) => number): number {
  if (points.length === 0) return 0;
  let correct = 0;
  for (const p of points) if ((score(p.x) > 0 ? 1 : 0) === p.y) correct += 1;
  return correct / points.length;
}

/* ---------- geometry for drawing ---------- */

export interface Box {
  x: readonly [number, number];
  y: readonly [number, number];
}

/** The segment of the line θᵀx + θ₀ = 0 inside the box, or null if it misses. */
export function clipLineToBox(line: LineParams, box: Box): [Vec2, Vec2] | null {
  const [a, b] = line.theta;
  const c = line.theta0;
  const hits: Vec2[] = [];
  const push = (p: Vec2) => {
    if (hits.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9)) return;
    hits.push(p);
  };
  const eps = 1e-9;
  if (Math.abs(b) > eps) {
    for (const x of box.x) {
      const y = -(a * x + c) / b;
      if (y >= box.y[0] - eps && y <= box.y[1] + eps) push([x, y]);
    }
  }
  if (Math.abs(a) > eps) {
    for (const y of box.y) {
      const x = -(b * y + c) / a;
      if (x >= box.x[0] - eps && x <= box.x[1] + eps) push([x, y]);
    }
  }
  if (hits.length < 2) return null;
  return [hits[0] as Vec2, hits[1] as Vec2];
}

/**
 * The zero level set of f on a (cells × cells) grid over the box by marching
 * squares, chained into polylines. Crossings are interpolated linearly along
 * cell edges, always from the lower-index node, so shared edges produce
 * bit-identical points and the chaining is exact.
 */
export function zeroContour(f: (x: number, y: number) => number, box: Box, cells = 64): Vec2[][] {
  const nx = cells + 1;
  const xs = Array.from({ length: nx }, (_, i) => box.x[0] + ((box.x[1] - box.x[0]) * i) / cells);
  const ys = Array.from({ length: nx }, (_, j) => box.y[0] + ((box.y[1] - box.y[0]) * j) / cells);
  const v = new Float64Array(nx * nx);
  for (let j = 0; j < nx; j += 1) {
    for (let i = 0; i < nx; i += 1) v[j * nx + i] = f(xs[i] as number, ys[j] as number);
  }
  const val = (i: number, j: number) => v[j * nx + i] as number;
  const edgePoint = (i0: number, j0: number, i1: number, j1: number): Vec2 => {
    const a = val(i0, j0);
    const b = val(i1, j1);
    const t = a === b ? 0.5 : a / (a - b);
    return [
      (xs[i0] as number) + ((xs[i1] as number) - (xs[i0] as number)) * t,
      (ys[j0] as number) + ((ys[j1] as number) - (ys[j0] as number)) * t,
    ];
  };

  const segments: [Vec2, Vec2][] = [];
  for (let j = 0; j < cells; j += 1) {
    for (let i = 0; i < cells; i += 1) {
      const s00 = val(i, j) > 0;
      const s10 = val(i + 1, j) > 0;
      const s11 = val(i + 1, j + 1) > 0;
      const s01 = val(i, j + 1) > 0;
      const crossings: Vec2[] = [];
      if (s00 !== s10) crossings.push(edgePoint(i, j, i + 1, j)); // bottom
      if (s10 !== s11) crossings.push(edgePoint(i + 1, j, i + 1, j + 1)); // right
      if (s01 !== s11) crossings.push(edgePoint(i, j + 1, i + 1, j + 1)); // top
      if (s00 !== s01) crossings.push(edgePoint(i, j, i, j + 1)); // left
      if (crossings.length === 2) {
        segments.push([crossings[0] as Vec2, crossings[1] as Vec2]);
      } else if (crossings.length === 4) {
        // Saddle: pair edges by the sign at the cell center.
        const center = (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4 > 0;
        const [bottom, right, top, left] = crossings as [Vec2, Vec2, Vec2, Vec2];
        if (center === s00) {
          segments.push([bottom, right], [top, left]);
        } else {
          segments.push([bottom, left], [top, right]);
        }
      }
    }
  }

  // Chain segments by exact endpoint keys.
  const key = (p: Vec2) => `${p[0]},${p[1]}`;
  const adjacency = new Map<string, number[]>();
  segments.forEach((seg, idx) => {
    for (const p of seg) {
      const k = key(p);
      const list = adjacency.get(k);
      if (list) list.push(idx);
      else adjacency.set(k, [idx]);
    }
  });
  const used = new Array<boolean>(segments.length).fill(false);
  const polylines: Vec2[][] = [];
  const extend = (line: Vec2[], fromEnd: boolean) => {
    for (;;) {
      const tip = (fromEnd ? line[line.length - 1] : line[0]) as Vec2;
      const next = (adjacency.get(key(tip)) ?? []).find((idx) => !used[idx]);
      if (next === undefined) return;
      used[next] = true;
      const [p, q] = segments[next] as [Vec2, Vec2];
      const other = key(p) === key(tip) ? q : p;
      if (fromEnd) line.push(other);
      else line.unshift(other);
    }
  };
  for (let idx = 0; idx < segments.length; idx += 1) {
    if (used[idx]) continue;
    used[idx] = true;
    const line: Vec2[] = [...(segments[idx] as [Vec2, Vec2])];
    extend(line, true);
    extend(line, false);
    polylines.push(line);
  }
  return polylines;
}

/* ---------- logistic regression by gradient descent ---------- */

export interface LogisticFit extends LineParams {
  /** Mean log-loss after each step, so a test can check it decreases. */
  loss: number[];
}

export interface LogisticOptions {
  steps?: number;
  /** Learning rate η. */
  eta?: number;
  /** Tiny L2 penalty so separable data does not send θ to infinity. */
  lambda?: number;
}

function meanLogLoss(points: readonly LabeledPoint[], line: LineParams, lambda: number): number {
  let total = 0;
  for (const p of points) {
    const z = lineScore(line, p.x);
    // log(1 + e^{-z}) for y = 1, log(1 + e^{z}) for y = 0, computed stably.
    const s = p.y === 1 ? z : -z;
    total += s >= 0 ? Math.log1p(Math.exp(-s)) : -s + Math.log1p(Math.exp(s));
  }
  return total / points.length + (lambda / 2) * dot(line.theta, line.theta);
}

/**
 * Full-batch gradient descent on the mean logistic loss from θ = 0:
 * ∇ = (1/n) Σ_i (σ(θᵀx⁽ⁱ⁾ + θ₀) − y⁽ⁱ⁾) [x⁽ⁱ⁾; 1] + λθ. Deterministic (no
 * randomness: the start is the origin), 400 steps by default.
 */
export function fitLogistic(
  points: readonly LabeledPoint[],
  { steps = 400, eta = 0.3, lambda = 1e-3 }: LogisticOptions = {},
): LogisticFit {
  let theta: Vec2 = [0, 0];
  let theta0 = 0;
  const loss: number[] = [];
  const n = Math.max(points.length, 1);
  for (let t = 0; t < steps; t += 1) {
    let g0 = 0;
    let g1 = 0;
    let gb = 0;
    for (const p of points) {
      const r = sigmoid(dot(theta, p.x) + theta0) - p.y;
      g0 += r * p.x[0];
      g1 += r * p.x[1];
      gb += r;
    }
    theta = [
      theta[0] - eta * (g0 / n + lambda * theta[0]),
      theta[1] - eta * (g1 / n + lambda * theta[1]),
    ];
    theta0 -= eta * (gb / n);
    loss.push(meanLogLoss(points, { theta, theta0 }, lambda));
  }
  return { theta, theta0, loss };
}
