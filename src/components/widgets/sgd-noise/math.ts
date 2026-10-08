/**
 * Pure math for `sgd-noise` (lesson 2.5, def-2-5-5 and der-2-5-9; L5 p.14):
 * minibatch gradients on a seeded least-squares problem in two parameters,
 * their mean (unbiased for the full gradient), their spread (covariance
 * Σ₁/b, or Σ₁/b · (n − b)/(n − 1) without replacement), and constant-step SGD
 * paths. No React, no DOM; tested in `math.test.ts`.
 *
 * Notation (STYLE_GUIDE.md §2.1): ℓᵢ(θ) = (θᵀx⁽ⁱ⁾ − y⁽ⁱ⁾)², the empirical risk
 * R̂(θ) = (1/n) Σᵢ ℓᵢ(θ), ∇ℓᵢ(θ) = 2(θᵀx⁽ⁱ⁾ − y⁽ⁱ⁾) x⁽ⁱ⁾, the minibatch
 * gradient g_B = (1/b) Σₖ ∇ℓ_{Iₖ}, the single-example covariance
 * Σ₁(θ) = Cov(∇ℓ_I(θ)) for I uniform on {1, …, n}.
 */
import { createSeededRandom, type SeededRandom } from '../_shared/seeded-random';

export type Vec2 = readonly [number, number];

/** Half-width of the plot window around the least-squares solution θ̂. */
export const WINDOW = 3;

export interface Sym2 {
  a: number;
  b: number;
  c: number;
}

export interface Problem {
  n: number;
  x: Vec2[];
  y: number[];
}

/** The parameters the data are generated from (the least-squares fit lands near them). */
export const THETA_TRUE: Vec2 = [1, -1];
/** Noise standard deviation σ_ε of the targets. */
export const NOISE_SD = 0.5;
/**
 * Feature scale s: H = (2/n)XᵀX has eigenvalues near 5.5 and 1.35, so at the
 * lesson's η = 0.1 a gradient step is a visible fraction of the plot window
 * and GD is stable (η < 2/λmax ≈ 0.36).
 */
export const FEATURE_SCALE = 1.5;

/**
 * n examples with correlated features x = s·(z₁, 0.4z₁ + 0.6z₂), z ~ N(0, I),
 * s = FEATURE_SCALE, and y = θ_trueᵀx + σ_ε ε. The feature covariance
 * s²[[1, 0.4], [0.4, 0.52]]
 * makes the level sets of R̂ tilted ellipses (κ ≈ 4).
 */
export function makeProblem(n: number, seed: number): Problem {
  const rng = createSeededRandom(seed);
  const x: Vec2[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const z1 = rng.normal();
    const z2 = rng.normal();
    const xi: Vec2 = [FEATURE_SCALE * z1, FEATURE_SCALE * (0.4 * z1 + 0.6 * z2)];
    x.push(xi);
    y.push(THETA_TRUE[0] * xi[0] + THETA_TRUE[1] * xi[1] + NOISE_SD * rng.normal());
  }
  return { n, x, y };
}

/** ∇ℓᵢ(θ) = 2(θᵀxᵢ − yᵢ) xᵢ. */
export function exampleGradient(p: Problem, theta: Vec2, i: number): Vec2 {
  const xi = p.x[i] ?? [0, 0];
  const r = theta[0] * xi[0] + theta[1] * xi[1] - (p.y[i] ?? 0);
  return [2 * r * xi[0], 2 * r * xi[1]];
}

/** ∇R̂(θ) = (1/n) Σᵢ ∇ℓᵢ(θ) (der-2-5-9 step 1). */
export function fullGradient(p: Problem, theta: Vec2): Vec2 {
  let gx = 0;
  let gy = 0;
  for (let i = 0; i < p.n; i += 1) {
    const g = exampleGradient(p, theta, i);
    gx += g[0];
    gy += g[1];
  }
  return [gx / p.n, gy / p.n];
}

/** R̂(θ) = (1/n) Σᵢ (θᵀxᵢ − yᵢ)². */
export function empiricalRisk(p: Problem, theta: Vec2): number {
  let s = 0;
  for (let i = 0; i < p.n; i += 1) {
    const xi = p.x[i] ?? [0, 0];
    const r = theta[0] * xi[0] + theta[1] * xi[1] - (p.y[i] ?? 0);
    s += r * r;
  }
  return s / p.n;
}

/** The Hessian H = (2/n) XᵀX of R̂ (the same at every θ). */
export function hessian(p: Problem): Sym2 {
  let a = 0;
  let b = 0;
  let c = 0;
  for (const [u, v] of p.x) {
    a += u * u;
    b += u * v;
    c += v * v;
  }
  return { a: (2 * a) / p.n, b: (2 * b) / p.n, c: (2 * c) / p.n };
}

/** θ̂ solving ∇R̂(θ) = 0, i.e. the normal equations XᵀXθ = Xᵀy. */
export function leastSquares(p: Problem): Vec2 {
  const H = hessian(p);
  const g0 = fullGradient(p, [0, 0]); // = −(2/n) Xᵀy
  const det = H.a * H.c - H.b * H.b;
  // H θ̂ = −g0
  return [(-g0[0] * H.c + g0[1] * H.b) / det, (-g0[1] * H.a + g0[0] * H.b) / det];
}

/** Σ₁(θ) = (1/n) Σᵢ (∇ℓᵢ − ∇R̂)(∇ℓᵢ − ∇R̂)ᵀ (der-2-5-9 step 7). */
export function singleExampleCovariance(p: Problem, theta: Vec2): Sym2 {
  const m = fullGradient(p, theta);
  let a = 0;
  let b = 0;
  let c = 0;
  for (let i = 0; i < p.n; i += 1) {
    const g = exampleGradient(p, theta, i);
    const dx = g[0] - m[0];
    const dy = g[1] - m[1];
    a += dx * dx;
    b += dx * dy;
    c += dy * dy;
  }
  return { a: a / p.n, b: b / p.n, c: c / p.n };
}

/**
 * Cov(g_B) for b indices: Σ₁/b with replacement (der-2-5-9 step 7), times the
 * finite-population factor (n − b)/(n − 1) without replacement.
 */
export function minibatchCovariance(
  sigma1: Sym2,
  n: number,
  b: number,
  replacement: boolean,
): Sym2 {
  const fpc = replacement ? 1 : n > 1 ? Math.max(n - b, 0) / (n - 1) : 0;
  const k = fpc / b;
  return { a: sigma1.a * k, b: sigma1.b * k, c: sigma1.c * k };
}

/** √(E‖g_B − ∇R̂‖²) = √(tr Cov(g_B)) (der-2-5-9 step 8). */
export function theoreticalSpread(
  sigma1: Sym2,
  n: number,
  b: number,
  replacement: boolean,
): number {
  const m = minibatchCovariance(sigma1, n, b, replacement);
  return Math.sqrt(Math.max(m.a + m.c, 0));
}

/** b indices uniform on {0, …, n−1}: independent draws, or a without-replacement sample. */
export function drawBatch(rng: SeededRandom, n: number, b: number, replacement: boolean): number[] {
  if (replacement) {
    return Array.from({ length: b }, () => Math.min(Math.floor(rng.uniform() * n), n - 1));
  }
  // Partial Fisher–Yates: the first b entries of a uniform random permutation.
  const idx = Array.from({ length: n }, (_, i) => i);
  const m = Math.min(b, n);
  for (let k = 0; k < m; k += 1) {
    const j = k + Math.min(Math.floor(rng.uniform() * (n - k)), n - k - 1);
    const tmp = idx[k] as number;
    idx[k] = idx[j] as number;
    idx[j] = tmp;
  }
  return idx.slice(0, m);
}

/** g_B(θ) = (1/b) Σₖ ∇ℓ_{Iₖ}(θ). */
export function minibatchGradient(p: Problem, theta: Vec2, batch: readonly number[]): Vec2 {
  let gx = 0;
  let gy = 0;
  for (const i of batch) {
    const g = exampleGradient(p, theta, i);
    gx += g[0];
    gy += g[1];
  }
  const b = Math.max(batch.length, 1);
  return [gx / b, gy / b];
}

/** A seed for the minibatch stream, distinct from the data seed. */
export function batchSeed(seed: number, salt: number): number {
  return seed * 7919 + salt * 104_729 + 17;
}

/** K minibatch gradients at θ, each from a fresh batch (seeded, deterministic). */
export function sampleMinibatchGradients(
  p: Problem,
  theta: Vec2,
  b: number,
  K: number,
  seed: number,
  replacement: boolean,
): Vec2[] {
  const rng = createSeededRandom(batchSeed(seed, 1));
  const out: Vec2[] = [];
  for (let k = 0; k < K; k += 1)
    out.push(minibatchGradient(p, theta, drawBatch(rng, p.n, b, replacement)));
  return out;
}

export function meanVec(vs: readonly Vec2[]): Vec2 {
  if (vs.length === 0) return [0, 0];
  let x = 0;
  let y = 0;
  for (const v of vs) {
    x += v[0];
    y += v[1];
  }
  return [x / vs.length, y / vs.length];
}

/** √(mean ‖vₖ − center‖²): the RMS spread of the samples around `center`. */
export function rmsSpread(vs: readonly Vec2[], center: Vec2): number {
  if (vs.length === 0) return 0;
  let s = 0;
  for (const v of vs) s += (v[0] - center[0]) ** 2 + (v[1] - center[1]) ** 2;
  return Math.sqrt(s / vs.length);
}

/** θ(0) … θ(T) of constant-step SGD with a fresh minibatch each step. */
export function sgdPath(
  p: Problem,
  start: Vec2,
  eta: number,
  b: number,
  T: number,
  seed: number,
  replacement: boolean,
): Vec2[] {
  const rng = createSeededRandom(batchSeed(seed, 2));
  const out: Vec2[] = [start];
  let theta: Vec2 = start;
  for (let t = 0; t < T; t += 1) {
    const g = minibatchGradient(p, theta, drawBatch(rng, p.n, b, replacement));
    theta = [theta[0] - eta * g[0], theta[1] - eta * g[1]];
    out.push(theta);
  }
  return out;
}

/** θ(0) … θ(T) of full-batch gradient descent with the same η. */
export function gdPath(p: Problem, start: Vec2, eta: number, T: number): Vec2[] {
  const out: Vec2[] = [start];
  let theta: Vec2 = start;
  for (let t = 0; t < T; t += 1) {
    const g = fullGradient(p, theta);
    theta = [theta[0] - eta * g[0], theta[1] - eta * g[1]];
    out.push(theta);
  }
  return out;
}

/** RMS distance to `target` over the second half of a path (the noise floor). */
export function noiseFloor(path: readonly Vec2[], target: Vec2): number {
  const tail = path.slice(Math.floor(path.length / 2));
  return rmsSpread(tail, target);
}
