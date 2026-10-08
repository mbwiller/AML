/**
 * VASCO (Part C, C1): a six-arm dose-finding trial of an antihypertensive,
 * the regression backbone. Outcome: change in systolic blood pressure after
 * 8 weeks (negative = improvement).
 *
 * Model (Part C, verbatim; the Emax model):
 *   ΔSBP = E0 + Emax·D / (ED50 + D) + 0.15·(B − 150) + ε,
 *   E0 = −3 mmHg (placebo effect), Emax = −22 mmHg, ED50 = 6 mg,
 *   ε ~ N(0, 8²), B ~ N(155, 12²), D ∈ {0, 2.5, 5, 10, 20, 40} mg,
 *   n = 300 (50 per arm).
 * The second arguments are variances (STYLE_GUIDE §2.1); the generator
 * draws with standard deviations 8 and 12. The model is additive in dose
 * and baseline: there is no dose × baseline interaction in the truth, which
 * lessons 2.1 and 2.2 rely on (f*(D, B) = −3 − 22D/(6 + D) + 0.15(B − 150);
 * the placebo arm has mean −2.25 and variance 67.24 mmHg²).
 *
 * Names follow the lessons (1.2, 2.2): `dose`, `baseline_sbp`, `delta_sbp`,
 * arms `placebo`, `2.5mg`, …, `40mg`.
 *
 * Open choices (recorded in docs/decisions/2026-10-07-dataset-generators.md):
 * - Arms are assigned by permuted blocks of six (each block holds every arm
 *   once, in a seeded random order), so the 300 ids interleave the arms as
 *   enrolment would and every prefix of the trial is nearly balanced.
 * - Baseline SBP is rounded to 1 mmHg, as a clinic records it, and the
 *   outcome is computed from the rounded value, so every stored row satisfies
 *   the model exactly given its stored covariates. The outcome is rounded to
 *   0.1 mmHg.
 * - Age and sex appear in Part C's variable list but not in its outcome
 *   model; they are nuisance covariates, independent of dose, baseline, and
 *   outcome: age ~ N(57, 10²) clipped to [30, 85] and rounded; sex F with
 *   probability 0.48.
 */
import { clamp, createRng, round } from './random';
import type { Dataset, DatasetVariable } from './types';

export const ARMS = ['placebo', '2.5mg', '5mg', '10mg', '20mg', '40mg'] as const;
export type VascoArm = (typeof ARMS)[number];

/** Dose in mg for each arm, in the order of `ARMS`. */
export const ARM_DOSES: Readonly<Record<VascoArm, number>> = {
  placebo: 0,
  '2.5mg': 2.5,
  '5mg': 5,
  '10mg': 10,
  '20mg': 20,
  '40mg': 40,
};

export interface VascoRow {
  /** `VAS-0001` … in enrolment order. */
  id: string;
  arm: VascoArm;
  /** Daily dose, mg. */
  dose: number;
  /** Baseline systolic blood pressure, mmHg. */
  baseline_sbp: number;
  /** Years. */
  age: number;
  sex: 'F' | 'M';
  /** Change in systolic blood pressure at 8 weeks, mmHg (negative = improvement). */
  delta_sbp: number;
}

export type VascoDataset = Dataset<VascoRow>;

export const spec = {
  id: 'vasco' as const,
  title: 'VASCO: dose-finding trial of an antihypertensive',
  spec: 'C1',
  seed: 1,
  n: 300,
  perArm: 50,
  doses: [0, 2.5, 5, 10, 20, 40] as const,
  /** ΔSBP = e0 + emax·D/(ed50 + D) + baselineCoef·(B − baselineCenter) + N(0, noiseSd²). */
  outcome: {
    e0: -3,
    emax: -22,
    ed50: 6,
    baselineCoef: 0.15,
    baselineCenter: 150,
    noiseSd: 8,
  },
  baseline: { mean: 155, sd: 12 },
  age: { mean: 57, sd: 10, min: 30, max: 85 },
  femaleRate: 0.48,
};

/** The Emax dose–response term Emax·D / (ED50 + D), mmHg (0 at placebo). */
export function emaxEffect(dose: number): number {
  const { emax, ed50 } = spec.outcome;
  return (emax * dose) / (ed50 + dose);
}

/** f*(D, B) = E[ΔSBP | D, B]: the true regression function (lesson 2.1). */
export function trueMean(dose: number, baseline: number): number {
  const { e0, baselineCoef, baselineCenter } = spec.outcome;
  return e0 + emaxEffect(dose) + baselineCoef * (baseline - baselineCenter);
}

/** Var(ΔSBP | D, B) = σ_ε², the noise floor. */
export function noiseVariance(): number {
  return spec.outcome.noiseSd ** 2;
}

/**
 * Mean and variance of ΔSBP within an arm, with the baseline averaged out
 * (B ~ N(155, 12²) independent of the arm): μ = f*(D, 155) and
 * σ² = 0.15²·12² + 8². For placebo, μ = −2.25 and σ² = 67.24 (lesson 2.2).
 * Computed from the unrounded model.
 */
export function armMoments(arm: VascoArm): { mean: number; variance: number } {
  const { baselineCoef, noiseSd } = spec.outcome;
  return {
    mean: trueMean(ARM_DOSES[arm], spec.baseline.mean),
    variance: baselineCoef ** 2 * spec.baseline.sd ** 2 + noiseSd ** 2,
  };
}

const VARIABLES: DatasetVariable[] = [
  { name: 'id', type: 'id', description: 'Patient id, VAS-0001 onward in enrolment order.' },
  {
    name: 'arm',
    type: 'categorical',
    description: 'Randomized arm: placebo, 2.5mg, 5mg, 10mg, 20mg, or 40mg (permuted blocks of 6).',
  },
  {
    name: 'dose',
    symbol: 'D',
    type: 'continuous',
    unit: 'mg',
    description: 'Daily dose of the arm.',
  },
  {
    name: 'baseline_sbp',
    symbol: 'B',
    type: 'integer',
    unit: 'mmHg',
    description: 'Systolic blood pressure at enrolment; N(155, 12²), rounded.',
  },
  {
    name: 'age',
    type: 'integer',
    unit: 'years',
    description: 'Nuisance covariate, independent of the outcome.',
  },
  { name: 'sex', type: 'categorical', description: 'F or M; nuisance covariate.' },
  {
    name: 'delta_sbp',
    symbol: String.raw`\Delta\mathrm{SBP}`,
    type: 'continuous',
    unit: 'mmHg',
    description: 'Change in systolic blood pressure at 8 weeks (negative = improvement).',
  },
];

const TEX = String.raw`\Delta\mathrm{SBP} = E_0 + \frac{E_{\max}\,D}{ED_{50} + D} + 0.15\,(B - 150) + \varepsilon,\qquad E_0 = -3,\ E_{\max} = -22,\ ED_{50} = 6,\qquad B \sim \mathcal{N}(155,\ 12^2),\ \varepsilon \sim \mathcal{N}(0,\ 8^2)`;

export function generate(seed: number = spec.seed): VascoDataset {
  const rng = createRng(seed);
  const assignment = rng.fork('assignment');
  const arms: VascoArm[] = [];
  for (let block = 0; block < spec.perArm; block++) {
    const order = [...ARMS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = assignment.int(0, i + 1);
      const tmp = order[i] as VascoArm;
      order[i] = order[j] as VascoArm;
      order[j] = tmp;
    }
    arms.push(...order);
  }

  const rows: VascoRow[] = arms.map((arm, i) => {
    const dose = ARM_DOSES[arm];
    const baseline = Math.round(rng.normal(spec.baseline.mean, spec.baseline.sd));
    const age = Math.round(
      clamp(rng.normal(spec.age.mean, spec.age.sd), spec.age.min, spec.age.max),
    );
    const sex = rng.bernoulli(spec.femaleRate) === 1 ? 'F' : 'M';
    const noise = rng.normal(0, spec.outcome.noiseSd);
    return {
      id: `VAS-${String(i + 1).padStart(4, '0')}`,
      arm,
      dose,
      baseline_sbp: baseline,
      age,
      sex,
      delta_sbp: round(trueMean(dose, baseline) + noise, 1),
    };
  });

  return {
    id: spec.id,
    title: spec.title,
    spec: spec.spec,
    seed,
    generativeModel: {
      tex: TEX,
      parameters: {
        arms: [...ARMS],
        doses: [...spec.doses],
        perArm: spec.perArm,
        outcome: spec.outcome,
        baseline: spec.baseline,
        age: spec.age,
        femaleRate: spec.femaleRate,
      },
    },
    variables: VARIABLES,
    n: spec.n,
    rows,
  };
}
