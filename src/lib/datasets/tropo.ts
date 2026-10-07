/**
 * TROPO (Part C, C3): high-sensitivity troponin in an emergency-department
 * chest-pain cohort, the ROC/threshold backbone.
 *
 * Model (Part C, verbatim): MI ~ Bernoulli(0.15);
 * log T | MI = 0 ~ N(log 8, 0.6²); log T | MI = 1 ~ N(log 60, 0.9²), T in ng/L.
 * The second arguments are variances (STYLE_GUIDE §2.1); the generator
 * draws with standard deviations 0.6 and 0.9.
 *
 * Open choices (recorded in docs/decisions/2026-10-07-dataset-generators.md):
 * - Sex and time since symptom onset are nuisance variables, independent of
 *   MI status and of troponin, so the stated two log-normals remain the
 *   exact class-conditionals (the histogram-plus-slider explorable and the
 *   1-D GDA derivation of lesson 7.3 rely on that). Sex is F with
 *   probability 0.45; onset time is log-normal with median 3 h and σ = 0.8,
 *   clipped to [0.5, 48] h.
 * - Troponin is rounded to 0.1 ng/L, finer than assays report, so that the
 *   class medians are not distorted by rounding near the lower class.
 */
import { clamp, createRng, round } from './random';
import type { Dataset, DatasetVariable } from './types';

export interface TropoRow {
  /** `TRO-0001` … in generation order. */
  id: string;
  /** High-sensitivity troponin, ng/L. */
  troponin: number;
  /** 1 if myocardial infarction. */
  mi: 0 | 1;
  sex: 'F' | 'M';
  /** Hours from symptom onset to the blood draw. */
  onsetHours: number;
}

export type TropoDataset = Dataset<TropoRow>;

export const spec = {
  id: 'tropo' as const,
  title: 'TROPO: troponin for myocardial infarction',
  spec: 'C3',
  seed: 3,
  n: 2000,
  prevalence: 0.15,
  /** log T | MI = k ~ N(mu[k], sigma[k]²). */
  logTroponin: {
    mu: [Math.log(8), Math.log(60)] as const,
    sigma: [0.6, 0.9] as const,
    medians: [8, 60] as const,
  },
  femaleRate: 0.45,
  onsetHours: { logMedian: Math.log(3), sigma: 0.8, min: 0.5, max: 48 },
};

const VARIABLES: DatasetVariable[] = [
  { name: 'id', type: 'id', description: 'Patient id, TRO-0001 onward, stable for the seed.' },
  {
    name: 'troponin',
    symbol: 'T',
    type: 'continuous',
    unit: 'ng/L',
    description: 'High-sensitivity troponin; log-normal within each class.',
  },
  { name: 'mi', symbol: 'y', type: 'binary', description: '1 if myocardial infarction.' },
  { name: 'sex', type: 'categorical', description: 'F or M; independent of MI and troponin.' },
  {
    name: 'onsetHours',
    type: 'continuous',
    unit: 'h',
    description: 'Hours from symptom onset to the blood draw; independent of MI and troponin.',
  },
];

const TEX = String.raw`y \sim \mathrm{Bernoulli}(0.15),\qquad \log T \mid y = 0 \sim \mathcal{N}(\log 8,\ 0.6^2),\qquad \log T \mid y = 1 \sim \mathcal{N}(\log 60,\ 0.9^2)`;

export function generate(seed: number = spec.seed): TropoDataset {
  const rng = createRng(seed);
  const rows: TropoRow[] = [];
  for (let i = 0; i < spec.n; i++) {
    const mi = rng.bernoulli(spec.prevalence);
    const troponin = round(rng.logNormal(spec.logTroponin.mu[mi], spec.logTroponin.sigma[mi]), 1);
    const sex = rng.bernoulli(spec.femaleRate) === 1 ? 'F' : 'M';
    const onsetHours = round(
      clamp(
        rng.logNormal(spec.onsetHours.logMedian, spec.onsetHours.sigma),
        spec.onsetHours.min,
        spec.onsetHours.max,
      ),
      1,
    );
    rows.push({ id: `TRO-${String(i + 1).padStart(4, '0')}`, troponin, mi, sex, onsetHours });
  }
  return {
    id: spec.id,
    title: spec.title,
    spec: spec.spec,
    seed,
    generativeModel: {
      tex: TEX,
      parameters: {
        prevalence: spec.prevalence,
        logTroponin: {
          mu: [...spec.logTroponin.mu],
          sigma: [...spec.logTroponin.sigma],
          medians: [...spec.logTroponin.medians],
        },
        femaleRate: spec.femaleRate,
        onsetHours: spec.onsetHours,
      },
    },
    variables: VARIABLES,
    n: spec.n,
    rows,
  };
}
