/**
 * Pure math for `encoding-explorer` (lesson 1.1; L2 pp.9–10): encode one
 * categorical column four ways, build the design matrix with or without an
 * intercept, find its rank, and fit the K targets by least squares (the
 * minimum-norm solution when the columns are dependent). No React, no DOM;
 * every function is unit-tested in `math.test.ts`.
 *
 * Notation follows STYLE_GUIDE.md §2.1 and der-1-1-1: categories k = 1…K,
 * numeric code c_k, design matrix X (one row per category), targets y,
 * parameters θ with θ₀ the intercept.
 *
 * The linear algebra is a one-sided Jacobi SVD (Hestenes), which keeps high
 * relative accuracy even for the raw zip codes 10040…10044 next to a column
 * of ones (condition number ≈ 10⁴), so the rank and the exact-fit test do
 * not depend on luck.
 */

export const ENCODINGS = ['integer', 'standardized', 'one-hot', 'one-hot-drop-first'] as const;
export type Encoding = (typeof ENCODINGS)[number];

export const ENCODING_LABELS: Record<Encoding, string> = {
  integer: 'Integer code',
  standardized: 'Standardized code',
  'one-hot': 'One-hot',
  'one-hot-drop-first': 'One-hot, drop first',
};

/* ---------- encodings ---------- */

/**
 * The numeric code c_k of each category: the category read as a number when
 * every category is numeric (L2 p.9's "convert to numerical values and use as
 * is": 10040 ↦ 10040), otherwise its position 0, 1, …, K − 1.
 */
export function numericCodes(categories: readonly string[]): number[] {
  const parsed = categories.map((c) => (/^\s*-?\d+(\.\d+)?\s*$/.test(c) ? Number(c) : NaN));
  if (parsed.every(Number.isFinite)) return parsed;
  return categories.map((_, k) => k);
}

/** z-scores with the population standard deviation (ddof = 0, as sklearn's StandardScaler). */
export function standardize(values: readonly number[]): { z: number[]; mean: number; sd: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(n, 1));
  return { z: values.map((v) => (sd > 0 ? (v - mean) / sd : 0)), mean, sd };
}

export interface Design {
  /** Column names: "1" for the intercept, then the encoded columns. */
  names: string[];
  /** Which columns are the intercept / encoded (for styling). */
  kinds: ('intercept' | 'feature')[];
  /** K rows, one per category, p columns. */
  X: number[][];
}

/** The encoded columns of the K categories (no intercept). */
export function encodeColumns(
  categories: readonly string[],
  encoding: Encoding,
): { names: string[]; rows: number[][] } {
  const K = categories.length;
  switch (encoding) {
    case 'integer': {
      const c = numericCodes(categories);
      return { names: ['code'], rows: c.map((v) => [v]) };
    }
    case 'standardized': {
      const { z } = standardize(numericCodes(categories));
      return { names: ['z'], rows: z.map((v) => [v]) };
    }
    case 'one-hot':
      return {
        names: categories.map((c) => `=${c}`),
        rows: categories.map((_, k) => Array.from({ length: K }, (_, j) => (j === k ? 1 : 0))),
      };
    case 'one-hot-drop-first':
      return {
        names: categories.slice(1).map((c) => `=${c}`),
        rows: categories.map((_, k) =>
          Array.from({ length: K - 1 }, (_, j) => (j + 1 === k ? 1 : 0)),
        ),
      };
  }
}

/** The design matrix: an all-ones column first when `intercept`, then the encoded columns. */
export function designMatrix(
  categories: readonly string[],
  encoding: Encoding,
  intercept: boolean,
): Design {
  const { names, rows } = encodeColumns(categories, encoding);
  return {
    names: intercept ? ['1', ...names] : names,
    kinds: [...(intercept ? (['intercept'] as const) : []), ...names.map(() => 'feature' as const)],
    X: rows.map((r) => (intercept ? [1, ...r] : [...r])),
  };
}

/* ---------- SVD, rank, least squares ---------- */

export interface Svd {
  /** Left singular vectors as columns of an n × p array (zero columns where σ = 0). */
  U: number[][];
  /** p singular values, descending. */
  s: number[];
  /** Right singular vectors as columns of a p × p array. */
  V: number[][];
}

/**
 * One-sided Jacobi SVD of an n × p matrix: rotate pairs of columns until all
 * are orthogonal; the column norms are the singular values and the
 * accumulated rotations are V. Works for n < p too (dependent columns end at
 * norm 0).
 */
export function svd(X: readonly (readonly number[])[]): Svd {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  // Column-major working copy.
  const A: number[][] = Array.from({ length: p }, (_, j) => X.map((row) => row[j] ?? 0));
  const V: number[][] = Array.from({ length: p }, (_, j) =>
    Array.from({ length: p }, (_, i) => (i === j ? 1 : 0)),
  );
  const EPS = 1e-15;
  for (let sweep = 0; sweep < 60; sweep += 1) {
    let rotated = false;
    for (let i = 0; i < p - 1; i += 1) {
      for (let j = i + 1; j < p; j += 1) {
        const ai = A[i] as number[];
        const aj = A[j] as number[];
        let alpha = 0;
        let beta = 0;
        let gamma = 0;
        for (let r = 0; r < n; r += 1) {
          const x = ai[r] as number;
          const y = aj[r] as number;
          alpha += x * x;
          beta += y * y;
          gamma += x * y;
        }
        if (gamma === 0 || Math.abs(gamma) <= EPS * Math.sqrt(alpha * beta)) continue;
        rotated = true;
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let r = 0; r < n; r += 1) {
          const x = ai[r] as number;
          const y = aj[r] as number;
          ai[r] = c * x - s * y;
          aj[r] = s * x + c * y;
        }
        const vi = V[i] as number[];
        const vj = V[j] as number[];
        for (let r = 0; r < p; r += 1) {
          const x = vi[r] as number;
          const y = vj[r] as number;
          vi[r] = c * x - s * y;
          vj[r] = s * x + c * y;
        }
      }
    }
    if (!rotated) break;
  }
  const norms = A.map((col) => Math.sqrt(col.reduce((a, v) => a + v * v, 0)));
  const order = norms.map((_, j) => j).sort((a, b) => (norms[b] as number) - (norms[a] as number));
  const s = order.map((j) => norms[j] as number);
  // U as n × p (row-major), V as p × p (row-major), columns in descending σ order.
  const U = Array.from({ length: n }, (_, r) =>
    order.map((j) => {
      const sigma = norms[j] as number;
      return sigma > 0 ? ((A[j] as number[])[r] as number) / sigma : 0;
    }),
  );
  const Vout = Array.from({ length: p }, (_, r) =>
    order.map((j) => (V[j] as number[])[r] as number),
  );
  return { U, s, V: Vout };
}

/** numpy's `matrix_rank` tolerance: σ_max · max(n, p) · machine ε. */
export function rankTolerance(s: readonly number[], n: number, p: number): number {
  return (s[0] ?? 0) * Math.max(n, p) * Number.EPSILON;
}

export function rank(X: readonly (readonly number[])[]): number {
  const { s } = svd(X);
  const tol = rankTolerance(s, X.length, X[0]?.length ?? 0);
  return s.filter((v) => v > tol).length;
}

export interface LeastSquares {
  /** The minimum-norm least-squares θ (the unique one when rank = p). */
  theta: number[];
  /** Xθ. */
  fitted: number[];
  residuals: number[];
  rank: number;
  /** Number of columns p. */
  p: number;
  /** rank = p: θ is unique. */
  unique: boolean;
  /** Every target reproduced (max |y − ŷ| below a relative tolerance). */
  exact: boolean;
  maxAbsResidual: number;
  /**
   * When rank < p: one direction v with Xv = 0, scaled so its first nonzero
   * entry is 1 (for one-hot with an intercept, v = (1, −1, …, −1)); every
   * θ + c·v has the same predictions. Null when θ is unique.
   */
  nullDirection: number[] | null;
}

export function matVec(X: readonly (readonly number[])[], v: readonly number[]): number[] {
  return X.map((row) => row.reduce((a, x, j) => a + x * (v[j] ?? 0), 0));
}

/** θ̂ = V Σ⁺ Uᵀ y (pseudo-inverse); fitted values, residuals, and the null direction. */
export function leastSquares(
  X: readonly (readonly number[])[],
  y: readonly number[],
): LeastSquares {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  const { U, s, V } = svd(X);
  const tol = rankTolerance(s, n, p);
  const r = s.filter((v) => v > tol).length;
  const theta = new Array<number>(p).fill(0);
  for (let k = 0; k < r; k += 1) {
    let uty = 0;
    for (let i = 0; i < n; i += 1) uty += ((U[i] as number[])[k] as number) * (y[i] ?? 0);
    const coef = uty / (s[k] as number);
    for (let j = 0; j < p; j += 1)
      theta[j] = (theta[j] as number) + coef * ((V[j] as number[])[k] as number);
  }
  const fitted = matVec(X, theta);
  const residuals = fitted.map((f, i) => (y[i] ?? 0) - f);
  const maxAbsResidual = residuals.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
  const scale = 1 + y.reduce((a, v) => Math.max(a, Math.abs(v)), 0);

  let nullDirection: number[] | null = null;
  if (r < p) {
    const v = V.map((row) => row[r] as number);
    const lead = v.find((x) => Math.abs(x) > 1e-9) ?? 1;
    nullDirection = v.map((x) => {
      const scaled = x / lead;
      return Math.abs(scaled - Math.round(scaled)) < 1e-9 ? Math.round(scaled) : scaled;
    });
  }
  return {
    theta,
    fitted,
    residuals,
    rank: r,
    p,
    unique: r === p,
    exact: maxAbsResidual <= 1e-7 * scale,
    maxAbsResidual,
    nullDirection,
  };
}

/** θ + c·v: another parameter vector with the same predictions (when v exists). */
export function shiftAlongNull(theta: readonly number[], v: readonly number[] | null, c: number) {
  if (!v) return [...theta];
  return theta.map((t, j) => t + c * (v[j] ?? 0));
}

/* ---------- targets ---------- */

/** The default targets when the embedding gives none: an even ramp from 2 to 4. */
export function defaultTargets(K: number): number[] {
  if (K <= 1) return [3];
  return Array.from({ length: K }, (_, k) => Math.round((2 + (2 * k) / (K - 1)) * 10) / 10);
}

/** `targets` padded or cut to K entries (missing entries from the default ramp). */
export function targetsFor(K: number, targets: readonly number[]): number[] {
  const ramp = defaultTargets(K);
  return ramp.map((d, k) => targets[k] ?? d);
}

export interface EncodingSummary {
  encoding: Encoding;
  /** Columns p, including the intercept when there is one. */
  p: number;
  rank: number;
  unique: boolean;
  exact: boolean;
  maxAbsResidual: number;
}

/** One row of the comparison table: fit the same targets with each encoding. */
export function summarize(
  categories: readonly string[],
  encoding: Encoding,
  intercept: boolean,
  y: readonly number[],
): EncodingSummary {
  const { X } = designMatrix(categories, encoding, intercept);
  const fit = leastSquares(X, y);
  return {
    encoding,
    p: fit.p,
    rank: fit.rank,
    unique: fit.unique,
    exact: fit.exact,
    maxAbsResidual: fit.maxAbsResidual,
  };
}
