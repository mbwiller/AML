/**
 * Seeded randomness for the synthetic case datasets (STYLE_GUIDE §8: fixed
 * seeds, generated files never hand-edited). No dependency: a 32-bit PRNG
 * (mulberry32, seeded through a splitmix32 scramble so that small seeds such
 * as 1, 2, 3 give unrelated streams) plus the usual transforms. Every
 * function consumes a fixed number of uniforms per call, so a stream is
 * byte-for-byte reproducible across platforms: V8 ships its own fdlibm port
 * for `Math.exp`, `Math.log`, `Math.sin`, and `Math.cos`, so these do not
 * depend on the OS libm either.
 */

export interface Rng {
  /** The seed this stream was created from. */
  readonly seed: number;
  /** Uniform on [0, 1) with 32 bits of resolution. */
  uniform(): number;
  /** Uniform on [lo, hi). */
  uniformIn(lo: number, hi: number): number;
  /** Integer uniform on {lo, …, hi − 1}. */
  int(lo: number, hi: number): number;
  /** Standard normal by Box–Muller (two uniforms per draw, no caching). */
  normal(mean?: number, sd?: number): number;
  /** exp(N(mu, sigma²)): `mu` and `sigma` are on the log scale. */
  logNormal(mu: number, sigma: number): number;
  /** 1 with probability p, else 0. */
  bernoulli(p: number): 0 | 1;
  /** Index drawn with the given (unnormalized) weights, by inverse CDF. */
  categorical(weights: readonly number[]): number;
  /** Index drawn with a precomputed cumulative distribution (last entry 1). */
  categoricalCdf(cdf: readonly number[]): number;
  /** Poisson(lambda) by Knuth's method for lambda ≤ 30, else a normal approximation rounded. */
  poisson(lambda: number): number;
  /** Multivariate normal with mean `mean` and covariance `cov`, via Cholesky. */
  mvNormal(mean: readonly number[], cov: readonly (readonly number[])[]): number[];
  /** An element of `items`, uniformly. */
  pick<T>(items: readonly T[]): T;
  /** A new, independent stream derived from this one's seed and a label. */
  fork(label: string): Rng;
}

/** splitmix32 step: scrambles a 32-bit state and returns the next state. */
function splitmix32(state: number): number {
  let z = (state + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/** FNV-1a over a string, for `fork(label)`. */
function hashLabel(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Lower-triangular L with L Lᵀ = A for a symmetric positive-definite A.
 * Throws if A is not positive definite (a non-positive pivot).
 */
export function cholesky(a: readonly (readonly number[])[]): number[][] {
  const n = a.length;
  const l: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    const rowA = a[i];
    const rowL = l[i];
    if (!rowA || !rowL || rowA.length !== n) throw new Error('cholesky: matrix must be square');
    for (let j = 0; j <= i; j++) {
      const rowLj = l[j];
      if (!rowLj) throw new Error('cholesky: matrix must be square');
      let sum = rowA[j] ?? 0;
      for (let k = 0; k < j; k++) sum -= (rowL[k] ?? 0) * (rowLj[k] ?? 0);
      if (i === j) {
        if (sum <= 0) throw new Error(`cholesky: matrix is not positive definite (pivot ${i})`);
        rowL[i] = Math.sqrt(sum);
      } else {
        rowL[j] = sum / (rowLj[j] ?? 1);
      }
    }
  }
  return l;
}

/** Cumulative distribution (last entry exactly 1) from unnormalized weights. */
export function toCdf(weights: readonly number[]): number[] {
  let total = 0;
  for (const w of weights) {
    if (!(w >= 0)) throw new Error('toCdf: weights must be non-negative numbers');
    total += w;
  }
  if (total <= 0) throw new Error('toCdf: weights must not all be zero');
  const cdf = new Array<number>(weights.length);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += (weights[i] ?? 0) / total;
    cdf[i] = acc;
  }
  cdf[weights.length - 1] = 1;
  return cdf;
}

/** Create a seeded stream. The seed is any finite number; it is truncated to 32 bits. */
export function createRng(seed: number): Rng {
  if (!Number.isFinite(seed)) throw new Error('createRng: seed must be a finite number');
  const seed32 = Math.trunc(seed) >>> 0;
  let state = splitmix32(seed32);
  // Warm up so that nearby seeds do not start with correlated outputs.
  state = splitmix32(state);

  const uniform = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (mean = 0, sd = 1): number => {
    // Box–Muller; u1 is kept away from 0 so that log is finite.
    const u1 = 1 - uniform();
    const u2 = uniform();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const categoricalCdf = (cdf: readonly number[]): number => {
    const u = uniform();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (u < (cdf[mid] ?? 1)) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  const rng: Rng = {
    seed: seed32,
    uniform,
    uniformIn: (lo, hi) => lo + (hi - lo) * uniform(),
    int: (lo, hi) => lo + Math.floor(uniform() * (hi - lo)),
    normal,
    logNormal: (mu, sigma) => Math.exp(normal(mu, sigma)),
    bernoulli: (p) => (uniform() < p ? 1 : 0),
    categorical: (weights) => categoricalCdf(toCdf(weights)),
    categoricalCdf,
    poisson: (lambda) => {
      if (lambda <= 0) return 0;
      if (lambda > 30) return Math.max(0, Math.round(normal(lambda, Math.sqrt(lambda))));
      const limit = Math.exp(-lambda);
      let k = 0;
      let p = uniform();
      while (p > limit) {
        k += 1;
        p *= uniform();
      }
      return k;
    },
    mvNormal: (mean, cov) => {
      const l = cholesky(cov);
      const z = mean.map(() => normal());
      return mean.map((m, i) => {
        const row = l[i] ?? [];
        let acc = m;
        for (let k = 0; k <= i; k++) acc += (row[k] ?? 0) * (z[k] ?? 0);
        return acc;
      });
    },
    pick: (items) => {
      if (items.length === 0) throw new Error('pick: empty list');
      return items[Math.floor(uniform() * items.length)] as (typeof items)[number];
    },
    fork: (label) => createRng((seed32 ^ hashLabel(label)) >>> 0),
  };
  return rng;
}

/** Round to `decimals` places; used so that generated JSON is compact and stable. */
export function round(x: number, decimals: number): number {
  const f = 10 ** decimals;
  const r = Math.round(x * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

/** Clamp to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
