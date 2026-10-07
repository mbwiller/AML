/**
 * ADVERSE (Part C, C2): a post-marketing cohort on the VASCO drug, with a
 * serious adverse event (hyperkalemia within 90 days) as the label.
 *
 * Model (Part C, verbatim): P(y = 1 | x) = σ(−4.5 + 0.03(age − 60)
 * − 0.04(eGFR − 70) + 1.2·NSAID + 0.6·1[K > 5.0] + 0.05·D), plus the "known
 * nonlinearity" Part C asks for: + 0.08·max(0, 30 − eGFR), a kink below
 * eGFR 30 that a tree finds and a linear logit cannot.
 *
 * Open choices (recorded in docs/decisions/2026-10-07-dataset-generators.md):
 * - Part C fixes the conditional model but not the covariate distribution.
 *   These marginals were chosen to be physiologically plausible and to put
 *   the prevalence at ≈ 6% under the stated coefficients:
 *   age ~ N(63, 12²) clipped to [18, 95] and rounded;
 *   eGFR = 72 − 0.8(age − 63) + N(0, 18²), clipped to [8, 130] (kidney
 *   function declines with age, so (age, eGFR) tilts downward: lesson 7.1);
 *   K = 4.2 + 0.008·max(0, 60 − eGFR) + N(0, 0.4²), clipped to [2.8, 6.8];
 *   NSAID ~ Bernoulli(0.25); dose uniform over the six VASCO arms
 *   {0, 2.5, 5, 10, 20, 40} mg; diabetes ~ Bernoulli(0.30 + 0.004(age − 63)).
 * - Diabetes is recorded but is not in the logit: a known-irrelevant feature
 *   for the regularization and feature-importance lessons.
 * - Each row stores its true risk `p`, so calibration and bias can be shown
 *   exactly (VISION §6 principle 6).
 */
import { clamp, createRng, round } from './random';
import type { Dataset, DatasetVariable } from './types';

export interface AdverseRow {
  /** `ADV-0001` … in generation order. */
  id: string;
  /** Years. */
  age: number;
  /** mL/min/1.73 m². */
  egfr: number;
  /** Serum potassium, mmol/L. */
  potassium: number;
  /** Concomitant NSAID. */
  nsaid: 0 | 1;
  /** VASCO dose, mg. */
  dose: number;
  /** Diabetes flag (not in the generative logit). */
  diabetes: 0 | 1;
  /** True event probability σ(logit(x)). */
  p: number;
  /** 1 if a hyperkalemia event within 90 days. */
  y: 0 | 1;
}

export type AdverseDataset = Dataset<AdverseRow>;

export const spec = {
  id: 'adverse' as const,
  title: 'ADVERSE: post-marketing adverse-event cohort',
  spec: 'C2',
  seed: 2,
  n: 5000,
  coefficients: {
    intercept: -4.5,
    age: 0.03,
    ageCenter: 60,
    egfr: -0.04,
    egfrCenter: 70,
    nsaid: 1.2,
    highPotassium: 0.6,
    potassiumThreshold: 5.0,
    dose: 0.05,
    /** Slope of the kink below `kinkEgfr`: + lowEgfrKink · max(0, kinkEgfr − eGFR). */
    lowEgfrKink: 0.08,
    kinkEgfr: 30,
  },
  covariates: {
    age: { mean: 63, sd: 12, min: 18, max: 95 },
    egfr: { intercept: 72, agingSlope: -0.8, sd: 18, min: 8, max: 130 },
    potassium: { base: 4.2, lowEgfrSlope: 0.008, lowEgfrBelow: 60, sd: 0.4, min: 2.8, max: 6.8 },
    nsaidRate: 0.25,
    doses: [0, 2.5, 5, 10, 20, 40] as const,
    diabetes: { base: 0.3, ageSlope: 0.004 },
  },
  targetPrevalence: 0.06,
};

const VARIABLES: DatasetVariable[] = [
  { name: 'id', type: 'id', description: 'Patient id, ADV-0001 onward, stable for the seed.' },
  { name: 'age', type: 'integer', unit: 'years', description: 'Age at the start of therapy.' },
  {
    name: 'egfr',
    type: 'continuous',
    unit: 'mL/min/1.73m²',
    description:
      'Estimated glomerular filtration rate (kidney function); risk rises sharply below 30.',
  },
  {
    name: 'potassium',
    symbol: 'K',
    type: 'continuous',
    unit: 'mmol/L',
    description: 'Serum potassium at baseline.',
  },
  { name: 'nsaid', type: 'binary', description: '1 if a concomitant NSAID is taken.' },
  { name: 'dose', symbol: 'D', type: 'categorical', unit: 'mg', description: 'VASCO dose arm.' },
  {
    name: 'diabetes',
    type: 'binary',
    description: 'Diabetes flag; recorded but absent from the generative logit.',
  },
  {
    name: 'p',
    symbol: 'p',
    type: 'probability',
    description: 'True P(y = 1 | x) from the generative model.',
  },
  {
    name: 'y',
    symbol: 'y',
    type: 'binary',
    description: '1 if a hyperkalemia event within 90 days.',
  },
];

const TEX = String.raw`P(y = 1 \mid x) = \sigma\bigl(-4.5 + 0.03(\text{age} - 60) - 0.04(\text{eGFR} - 70) + 1.2\,\text{NSAID} + 0.6\,\mathbb{1}[K > 5.0] + 0.05\,D + 0.08\max(0, 30 - \text{eGFR})\bigr)`;

/** The generative logit, exposed so lessons can recompute a patient's true risk. */
export function logit(
  x: Pick<AdverseRow, 'age' | 'egfr' | 'potassium' | 'nsaid' | 'dose'>,
): number {
  const c = spec.coefficients;
  return (
    c.intercept +
    c.age * (x.age - c.ageCenter) +
    c.egfr * (x.egfr - c.egfrCenter) +
    c.nsaid * x.nsaid +
    c.highPotassium * (x.potassium > c.potassiumThreshold ? 1 : 0) +
    c.dose * x.dose +
    c.lowEgfrKink * Math.max(0, c.kinkEgfr - x.egfr)
  );
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function generate(seed: number = spec.seed): AdverseDataset {
  const rng = createRng(seed);
  const cv = spec.covariates;
  const rows: AdverseRow[] = [];
  for (let i = 0; i < spec.n; i++) {
    const age = Math.round(clamp(rng.normal(cv.age.mean, cv.age.sd), cv.age.min, cv.age.max));
    const egfr = round(
      clamp(
        cv.egfr.intercept + cv.egfr.agingSlope * (age - cv.age.mean) + rng.normal(0, cv.egfr.sd),
        cv.egfr.min,
        cv.egfr.max,
      ),
      1,
    );
    const potassium = round(
      clamp(
        cv.potassium.base +
          cv.potassium.lowEgfrSlope * Math.max(0, cv.potassium.lowEgfrBelow - egfr) +
          rng.normal(0, cv.potassium.sd),
        cv.potassium.min,
        cv.potassium.max,
      ),
      1,
    );
    const nsaid = rng.bernoulli(cv.nsaidRate);
    const dose = rng.pick(cv.doses);
    const diabetes = rng.bernoulli(
      clamp(cv.diabetes.base + cv.diabetes.ageSlope * (age - cv.age.mean), 0.02, 0.98),
    );
    const x = { age, egfr, potassium, nsaid, dose };
    const p = round(sigmoid(logit(x)), 4);
    const y = rng.bernoulli(p);
    rows.push({ id: `ADV-${String(i + 1).padStart(4, '0')}`, ...x, diabetes, p, y });
  }
  return {
    id: spec.id,
    title: spec.title,
    spec: spec.spec,
    seed,
    generativeModel: {
      tex: TEX,
      parameters: {
        coefficients: spec.coefficients,
        covariates: { ...spec.covariates, doses: [...spec.covariates.doses] },
        targetPrevalence: spec.targetPrevalence,
      },
    },
    variables: VARIABLES,
    n: spec.n,
    rows,
  };
}
