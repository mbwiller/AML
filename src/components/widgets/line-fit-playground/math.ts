/**
 * Pure math for `line-fit-playground` (lesson 1.3), also used by
 * `mse-bowl-gd`: the line f_θ(x) = θ₀ + θ₁x, its residuals, the four
 * regression metrics of L2 pp.29–31 and L3 pp.5–9, the least-squares fit,
 * and the least-absolute-deviations fit. No React, no DOM; tested in
 * `math.test.ts`.
 *
 * Notation (STYLE_GUIDE §2.1): θ₀ is the intercept, θ₁ the slope (the order
 * of the Lecture 2 companion); every average keeps its 1/n.
 */

export interface Line {
  /** Intercept θ₀. */
  theta0: number;
  /** Slope θ₁. */
  theta1: number;
}

export interface Metrics {
  /** (1/n) Σ |y⁽ⁱ⁾ − ŷ⁽ⁱ⁾| */
  mae: number;
  /** (1/n) Σ (y⁽ⁱ⁾ − ŷ⁽ⁱ⁾)² */
  mse: number;
  /** √MSE, in the units of y. */
  rmse: number;
  /** 1 − Σ(y − ŷ)² / Σ(y − ȳ)²; negative when the line is worse than predicting ȳ. */
  r2: number;
}

export function predict(line: Line, x: number): number {
  return line.theta0 + line.theta1 * x;
}

/** r⁽ⁱ⁾ = y⁽ⁱ⁾ − ŷ⁽ⁱ⁾ (positive when the point is above the line). */
export function residuals(x: readonly number[], y: readonly number[], line: Line): number[] {
  return x.map((xi, i) => (y[i] as number) - predict(line, xi));
}

export function mean(v: readonly number[]): number {
  let s = 0;
  for (const a of v) s += a;
  return v.length === 0 ? Number.NaN : s / v.length;
}

export function metrics(x: readonly number[], y: readonly number[], line: Line): Metrics {
  const n = x.length;
  const ybar = mean(y);
  let abs = 0;
  let sq = 0;
  let tot = 0;
  for (let i = 0; i < n; i += 1) {
    const yi = y[i] as number;
    const r = yi - predict(line, x[i] as number);
    abs += Math.abs(r);
    sq += r * r;
    tot += (yi - ybar) ** 2;
  }
  const mse = sq / n;
  return { mae: abs / n, mse, rmse: Math.sqrt(mse), r2: tot === 0 ? Number.NaN : 1 - sq / tot };
}

/**
 * Ordinary least squares, θ̂ = argmin (1/n)‖Xθ − y‖² with X = [1, x], in the
 * centered form of the normal equations (what scikit-learn's
 * `LinearRegression` solves): θ̂₁ = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², θ̂₀ = ȳ − θ̂₁x̄.
 * Reproduces the Lecture 2 companion's 37.37884216052121 / −797.0817390343262
 * to within 1 ulp (math.test.ts).
 */
export function fitOls(x: readonly number[], y: readonly number[]): Line {
  const n = x.length;
  const xbar = mean(x);
  const ybar = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (x[i] as number) - xbar;
    sxy += dx * ((y[i] as number) - ybar);
    sxx += dx * dx;
  }
  const theta1 = sxx === 0 ? 0 : sxy / sxx;
  return { theta0: ybar - theta1 * xbar, theta1 };
}

/**
 * Least absolute deviations, argmin (1/n) Σ |y − θ₀ − θ₁x|. The objective is
 * convex and piecewise linear in θ, so a minimizer sits at a vertex of the
 * pieces: a line through two data points with distinct x. With n = 20 there
 * are 190 such lines; take the best (ties: the first in index order).
 */
export function fitLad(x: readonly number[], y: readonly number[]): Line {
  const n = x.length;
  let best: Line = fitOls(x, y);
  let bestMae = metrics(x, y, best).mae;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = (x[j] as number) - (x[i] as number);
      if (Math.abs(dx) < 1e-12) continue;
      const theta1 = ((y[j] as number) - (y[i] as number)) / dx;
      const line = { theta0: (y[i] as number) - theta1 * (x[i] as number), theta1 };
      const m = metrics(x, y, line).mae;
      if (m < bestMae - 1e-12) {
        best = line;
        bestMae = m;
      }
    }
  }
  return best;
}
