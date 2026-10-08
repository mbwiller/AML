/**
 * Pure math for `linear-bias-probe` (lesson 1.2): a model that is linear in θ
 * on chosen VASCO features, fitted by least squares twice, once on the 300
 * trial patients and once on the whole population (n → ∞), and compared
 * with the true dose–response f*(D, B) of the generative model.
 *
 * - Features: raw dose D, log(1 + D) (Part C's suggestion), the Emax feature
 *   D/(6 + D) (lesson 1.1, der-1-1-3), and baseline B; optionally each dose
 *   feature times B (the "interaction" column).
 * - The population fit solves the normal equations with expectations in
 *   place of averages: D uniform over the six arms, B ~ N(155, 12²). Every
 *   entry of E[φφᵀ] and E[φ f*] is a polynomial of degree ≤ 2 in B, so a
 *   3-point Gauss–Hermite rule (exact to degree 5) gives them exactly.
 * - The squared bias E[(f_∞(X) − f*(X))²] is the part of the true risk that
 *   no amount of data removes (lesson 2.2, eq. 2.2.2, with f_∞ the best model
 *   in the class).
 *
 * No React, no DOM; every function is unit-tested in `math.test.ts`.
 */
import { ARM_DOSES, ARMS, spec, trueMean } from '@/lib/datasets/vasco';

export const FEATURES = ['dose', 'log1p_dose', 'emax_dose', 'baseline_sbp'] as const;
export type Feature = (typeof FEATURES)[number];

const DOSE_FEATURES: readonly Feature[] = ['dose', 'log1p_dose', 'emax_dose'];

/** TeX for each feature, as the lessons write it. */
export const FEATURE_TEX: Readonly<Record<Feature, string>> = {
  dose: 'D',
  log1p_dose: '\\log(1 + D)',
  emax_dose: '\\tfrac{D}{6 + D}',
  baseline_sbp: 'B',
};

/** Plain-text labels for controls and accessible names. */
export const FEATURE_LABELS: Readonly<Record<Feature, string>> = {
  dose: 'Dose D',
  log1p_dose: 'log(1 + D)',
  emax_dose: 'D/(6 + D)',
  baseline_sbp: 'Baseline B',
};

function doseFeature(f: Feature, dose: number): number {
  if (f === 'dose') return dose;
  if (f === 'log1p_dose') return Math.log1p(dose);
  if (f === 'emax_dose') return dose / (spec.outcome.ed50 + dose);
  return 0;
}

export interface ModelSpec {
  features: readonly Feature[];
  interaction: boolean;
}

export interface Column {
  /** TeX of the column ("1", "D", "B", "D \cdot B"). */
  tex: string;
  value(dose: number, baseline: number): number;
}

/**
 * The columns of the design matrix, in a canonical order: the intercept, the
 * chosen features in `FEATURES` order (duplicates ignored), then, when
 * `interaction` is on, each chosen dose feature times B.
 */
export function columns(model: ModelSpec): Column[] {
  const chosen = FEATURES.filter((f) => model.features.includes(f));
  const cols: Column[] = [{ tex: '1', value: () => 1 }];
  for (const f of chosen) {
    cols.push({
      tex: FEATURE_TEX[f],
      value: f === 'baseline_sbp' ? (_d, b) => b : (d) => doseFeature(f, d),
    });
  }
  if (model.interaction) {
    for (const f of chosen.filter((g) => DOSE_FEATURES.includes(g))) {
      const tex = f === 'dose' ? 'D \\cdot B' : `${FEATURE_TEX[f]} \\cdot B`;
      cols.push({ tex, value: (d, b) => doseFeature(f, d) * b });
    }
  }
  return cols;
}

export interface WeightedPoint {
  dose: number;
  baseline: number;
  y: number;
  w: number;
}

export interface Fit {
  cols: Column[];
  /** Coefficients in the raw units of each column. */
  theta: number[];
}

/**
 * Solve the square system A x = b by Gaussian elimination with partial
 * pivoting. A tiny ridge keeps an exactly singular system (a column that is
 * constant on the data) solvable; it does not move a well-posed solution.
 */
export function solve(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const p = b.length;
  const m = a.map((row, i) => [...row.map((v, j) => v + (i === j ? 1e-10 : 0)), b[i] ?? 0]);
  for (let c = 0; c < p; c++) {
    let best = c;
    for (let r = c + 1; r < p; r++) {
      if (Math.abs(m[r]?.[c] ?? 0) > Math.abs(m[best]?.[c] ?? 0)) best = r;
    }
    const tmp = m[c] as number[];
    m[c] = m[best] as number[];
    m[best] = tmp;
    const pivot = m[c] as number[];
    const pv = pivot[c] ?? 0;
    if (pv === 0) continue;
    for (let r = c + 1; r < p; r++) {
      const row = m[r] as number[];
      const f = (row[c] ?? 0) / pv;
      if (f === 0) continue;
      for (let k = c; k <= p; k++) row[k] = (row[k] ?? 0) - f * (pivot[k] ?? 0);
    }
  }
  const x = new Array<number>(p).fill(0);
  for (let r = p - 1; r >= 0; r--) {
    const row = m[r] as number[];
    let s = row[p] ?? 0;
    for (let k = r + 1; k < p; k++) s -= (row[k] ?? 0) * (x[k] ?? 0);
    const d = row[r] ?? 0;
    x[r] = d === 0 ? 0 : s / d;
  }
  return x;
}

/**
 * Weighted least squares, argmin_θ Σ w_i (θᵀφ(x_i) − y_i)². The non-intercept
 * columns are standardized first (raw mg next to mmHg next to mg·mmHg makes
 * XᵀX badly conditioned: lesson 2.5), then the coefficients are mapped back.
 */
export function fitWeighted(model: ModelSpec, points: readonly WeightedPoint[]): Fit {
  const cols = columns(model);
  const p = cols.length;
  let wsum = 0;
  const mean = new Array<number>(p).fill(0);
  for (const pt of points) {
    wsum += pt.w;
    cols.forEach((c, j) => (mean[j] = (mean[j] ?? 0) + pt.w * c.value(pt.dose, pt.baseline)));
  }
  for (let j = 0; j < p; j++) mean[j] = (mean[j] ?? 0) / wsum;
  const scale = new Array<number>(p).fill(0);
  for (const pt of points) {
    cols.forEach((c, j) => {
      scale[j] = (scale[j] ?? 0) + pt.w * (c.value(pt.dose, pt.baseline) - (mean[j] ?? 0)) ** 2;
    });
  }
  for (let j = 0; j < p; j++) scale[j] = Math.sqrt((scale[j] ?? 0) / wsum) || 1;
  mean[0] = 0;
  scale[0] = 1;

  const ata = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const aty = new Array<number>(p).fill(0);
  const z = new Array<number>(p).fill(0);
  for (const pt of points) {
    for (let j = 0; j < p; j++) {
      z[j] = ((cols[j]?.value(pt.dose, pt.baseline) ?? 0) - (mean[j] ?? 0)) / (scale[j] ?? 1);
    }
    for (let j = 0; j < p; j++) {
      const row = ata[j] as number[];
      for (let k = 0; k < p; k++) row[k] = (row[k] ?? 0) + pt.w * (z[j] ?? 0) * (z[k] ?? 0);
      aty[j] = (aty[j] ?? 0) + pt.w * (z[j] ?? 0) * pt.y;
    }
  }
  const beta = solve(ata, aty);
  const theta = beta.map((b, j) => (j === 0 ? b : b / (scale[j] ?? 1)));
  theta[0] =
    (beta[0] ?? 0) -
    beta.reduce((s, b, j) => (j === 0 ? s : s + (b * (mean[j] ?? 0)) / (scale[j] ?? 1)), 0);
  return { cols, theta };
}

export function predict(fit: Fit, dose: number, baseline: number): number {
  let s = 0;
  fit.cols.forEach((c, j) => (s += (fit.theta[j] ?? 0) * c.value(dose, baseline)));
  return s;
}

export interface Patient {
  dose: number;
  baseline: number;
  y: number;
}

/** Ordinary least squares on the trial patients. */
export function fitSample(model: ModelSpec, patients: readonly Patient[]): Fit {
  return fitWeighted(
    model,
    patients.map((p) => ({ dose: p.dose, baseline: p.baseline, y: p.y, w: 1 })),
  );
}

/** 3-point Gauss–Hermite rule for a standard normal: exact for polynomials of degree ≤ 5. */
const GH3 = [
  { z: -Math.sqrt(3), w: 1 / 6 },
  { z: 0, w: 2 / 3 },
  { z: Math.sqrt(3), w: 1 / 6 },
] as const;

/**
 * The population as weighted points: the six doses with probability 1/6
 * each (the balanced design) times the quadrature nodes for B ~ N(155, 12²),
 * each with target f*(D, B). Expectations of degree ≤ 5 in B are exact.
 */
export function populationPoints(): WeightedPoint[] {
  const out: WeightedPoint[] = [];
  for (const arm of ARMS) {
    const dose = ARM_DOSES[arm];
    for (const node of GH3) {
      const baseline = spec.baseline.mean + spec.baseline.sd * node.z;
      out.push({ dose, baseline, y: trueMean(dose, baseline), w: node.w / ARMS.length });
    }
  }
  return out;
}

/** The best model in the class: least squares on the whole population (n → ∞). */
export function fitPopulation(model: ModelSpec): Fit {
  return fitWeighted(model, populationPoints());
}

/** E[(f(X) − f*(X))²] over the trial population: the squared bias of f. */
export function squaredBias(fit: Fit): number {
  let s = 0;
  for (const pt of populationPoints()) s += pt.w * (predict(fit, pt.dose, pt.baseline) - pt.y) ** 2;
  return s;
}

/** The change of a prediction function for a step of `step` mg at (dose, baseline). */
export function doseStep(
  f: (dose: number, baseline: number) => number,
  dose: number,
  baseline: number,
  step = 10,
): number {
  return f(dose + step, baseline) - f(dose, baseline);
}

/** Mean squared error of a fit on the patients (the training risk). */
export function trainingMse(fit: Fit, patients: readonly Patient[]): number {
  if (patients.length === 0) return 0;
  let s = 0;
  for (const p of patients) s += (p.y - predict(fit, p.dose, p.baseline)) ** 2;
  return s / patients.length;
}

/** Per-arm mean residual y − f̂(x) on the patients, in arm order. */
export function armMeanResiduals(
  fit: Fit,
  patients: readonly Patient[],
): { dose: number; mean: number }[] {
  return ARMS.map((arm) => {
    const dose = ARM_DOSES[arm];
    const r = patients
      .filter((p) => p.dose === dose)
      .map((p) => p.y - predict(fit, p.dose, p.baseline));
    return { dose, mean: r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0 };
  });
}

/** Mean outcome of each arm's patients, in arm order. */
export function armMeans(patients: readonly Patient[]): { dose: number; mean: number }[] {
  return ARMS.map((arm) => {
    const dose = ARM_DOSES[arm];
    const y = patients.filter((p) => p.dose === dose).map((p) => p.y);
    return { dose, mean: y.length ? y.reduce((a, b) => a + b, 0) / y.length : 0 };
  });
}

/**
 * The population mean residual at dose d, E_B[f*(d, B) − f(d, B)]. Both
 * functions are linear in B, so it is their difference at E[B] = 155: the
 * systematic residual pattern that remains with infinitely many patients.
 */
export function meanResidualCurve(fit: Fit, dose: number): number {
  return trueMean(dose, spec.baseline.mean) - predict(fit, dose, spec.baseline.mean);
}

/** |coefficient| for TeX (the sign is typeset separately): two decimals, three significant figures below 0.1. */
export function formatCoef(v: number): string {
  const a = Math.abs(v);
  if (a < 1e-8) return '0';
  if (a >= 100) return a.toFixed(1);
  if (a >= 0.1) return a.toFixed(2);
  if (a >= 0.001) return a.toPrecision(3).replace(/0+$/, '').replace(/\.$/, '');
  const exp = Math.floor(Math.log10(a));
  return `${(a / 10 ** exp).toFixed(2)} \\times 10^{${exp}}`;
}

/** \hat f(x) = θ0 + θ1 φ1 + … typeset with signs. */
export function fitTex(fit: Fit, name = '\\hat f'): string {
  const terms = fit.cols.map((c, j) => {
    const v = fit.theta[j] ?? 0;
    const sign = v < 0 ? '-' : '+';
    const body = c.tex === '1' ? formatCoef(v) : `${formatCoef(v)}\\,${c.tex}`;
    return { sign, body };
  });
  return (
    `${name}(x) = ` +
    terms
      .map((t, i) => (i === 0 ? (t.sign === '-' ? `-${t.body}` : t.body) : ` ${t.sign} ${t.body}`))
      .join('')
  );
}
