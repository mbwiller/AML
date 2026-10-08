/**
 * DIABETES-BMI-20: the 20-patient BMI → disease-progression data of Units 1–2
 * (VISION §9.3, §9.7). Real data, not a synthetic case: the last 20 rows
 * (`iloc[-20:]`, sklearn rows 422–441) of scikit-learn's diabetes dataset,
 * exactly as the course companions take them.
 *
 * - Lecture 2 companion, cell 8: `bmi * 30 + 25` ("recentered for ease of
 *   presentation") against the raw target; cell 15 prints the
 *   `LinearRegression` fit, slope 37.37884216052121, intercept
 *   −797.0817390343262. Rows carry this as `bmiRecentered`.
 * - Lecture 4 companion, cell 18: the scikit-learn-scaled `bmi` and a column
 *   of ones against `target / 300`; cells 20–21 run gradient descent and
 *   cell 23 prints the closed-form fit. Rows carry this as `bmiScaled`.
 *
 * The values come from `scripts/gen-datasets/sources/diabetes-bmi-20.source.json`
 * (provenance in its `$comment`); nothing is random, so `seed` is 0 and
 * `generativeModel` records the preprocessing rather than a model. The
 * printed companion outputs are stored in `parameters.companion` so lessons
 * and widgets can cite them; `diabetes-bmi-20.test.ts` checks that least
 * squares and gradient descent on these rows reproduce them.
 */
import source from '../../../scripts/gen-datasets/sources/diabetes-bmi-20.source.json';
import type { Dataset, DatasetVariable } from './types';

export interface DiabetesBmi20Row {
  /** `DIAB-422` … `DIAB-441`: the patient's row in scikit-learn's 442. */
  id: string;
  /** Row index in `load_diabetes()` (422–441). */
  sklearnRow: number;
  /** Body-mass index in kg/m² (`load_diabetes(scaled=False)`). */
  bmi: number;
  /** scikit-learn's scaled feature: centered, divided by sd·√442 (Lecture 4 companion). */
  bmiScaled: number;
  /** `30 · bmiScaled + 25`, the Lecture 2 companion's x axis (not a real BMI). */
  bmiRecentered: number;
  /** Quantitative disease progression one year after baseline ("diabetes risk"). */
  target: number;
}

export type DiabetesBmi20Dataset = Dataset<DiabetesBmi20Row>;

/** The fits the companions print, verbatim (strings keep the printed digits). */
export const companion = {
  lecture2: {
    notebook: 'Code Companions/Lecture2code_companion.ipynb',
    cells: { data: 8, fit: 15 },
    x: 'bmiRecentered',
    y: 'target',
    slope: '37.37884216052121',
    intercept: '-797.0817390343262',
  },
  lecture4: {
    notebook: 'Code Companions/lecture4-code companion.ipynb',
    cells: { data: 18, gd: 20, gdTheta: 21, sklearn: 23 },
    x: 'bmiScaled',
    y: 'target / 300',
    sklearn: {
      mse: '0.024177787873230695',
      coef: ['3.73788422', '0.'],
      intercept: '0.4579643832623464',
    },
    gd: {
      init: [2, 1],
      eta: 0.1,
      stopping: 'parameter-change',
      tolerance: 1e-5,
      /** `print(theta.detach().numpy())` after the loop: (bmi, one). */
      theta: ['3.71421938', '0.45772775'],
      /** The last `Iteration %d. MSE: %.6f` line printed (every 100 iterations). */
      lastPrinted: { iteration: 10100, mse: '0.024179' },
    },
  },
} as const;

export const spec = {
  id: 'diabetes-bmi-20' as const,
  title: 'DIABETES-BMI-20: body-mass index and diabetes progression, 20 patients',
  spec: 'Lecture 2 companion cell 8; Lecture 4 companion cell 18',
  seed: 0,
  n: 20,
  /** The Lecture 2 companion's recentering: x = 30 · bmiScaled + 25. */
  recenter: { scale: 30, shift: 25 },
  /** The Lecture 4 companion divides the target by 300. */
  targetScale: 300,
};

const VARIABLES: DatasetVariable[] = [
  {
    name: 'id',
    type: 'id',
    description: 'DIAB-422 to DIAB-441: the row of load_diabetes(), last 20 rows (iloc[-20:]).',
  },
  { name: 'sklearnRow', type: 'integer', description: 'Row index in load_diabetes(), 422 to 441.' },
  {
    name: 'bmi',
    type: 'continuous',
    unit: 'kg/m²',
    description: 'Body-mass index as measured (load_diabetes(scaled=False)).',
  },
  {
    name: 'bmiScaled',
    symbol: 'x',
    type: 'continuous',
    description:
      "scikit-learn's bmi feature: centered over the 442 patients and divided by sd·√442. The Lecture 4 companion's feature.",
  },
  {
    name: 'bmiRecentered',
    symbol: 'x',
    type: 'continuous',
    description:
      "30 · bmiScaled + 25, the Lecture 2 companion's x axis 'for ease of presentation'; not the measured BMI.",
  },
  {
    name: 'target',
    symbol: 'y',
    type: 'integer',
    description:
      'Disease progression one year after baseline (the slides’ "diabetes risk"). The Lecture 4 companion uses target / 300.',
  },
];

const TEX = String.raw`x_{\text{L2}} = 30\,\mathrm{bmi} + 25,\qquad \mathrm{bmi} = \frac{\mathrm{BMI} - \overline{\mathrm{BMI}}}{\sqrt{442}\; s_{\mathrm{BMI}}},\qquad y_{\text{L4}} = y / 300`;

interface SourceRow {
  index: number;
  bmi: number;
  bmiScaled: number;
  target: number;
}

export function generate(): DiabetesBmi20Dataset {
  const rows = (source.rows as SourceRow[]).map((r): DiabetesBmi20Row => ({
    id: `DIAB-${r.index}`,
    sklearnRow: r.index,
    bmi: r.bmi,
    bmiScaled: r.bmiScaled,
    // Same float64 operations as pandas' `X * 30 + 25`.
    bmiRecentered: r.bmiScaled * spec.recenter.scale + spec.recenter.shift,
    target: r.target,
  }));
  if (rows.length !== spec.n)
    throw new Error(`diabetes-bmi-20: expected 20 rows, got ${rows.length}`);
  return {
    id: spec.id,
    title: spec.title,
    spec: spec.spec,
    seed: spec.seed,
    generativeModel: {
      tex: TEX,
      parameters: {
        realData: true,
        source: source.source,
        bmiScaling: source.bmiScaling,
        recenter: spec.recenter,
        targetScale: spec.targetScale,
        companion,
      },
    },
    variables: VARIABLES,
    n: spec.n,
    rows,
  };
}
