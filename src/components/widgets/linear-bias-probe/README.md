# linear-bias-probe

**Lesson 1.2 (Datasets, models, and model classes).** A model that is linear in θ on chosen VASCO features (dose D, log(1 + D), D/(6 + D), baseline B, and optionally each dose feature × B), fitted by least squares on the 300 generated trial patients and on the whole population (n → ∞), against the true dose–response of the generative model. Three panels:

1. **Input plane** (dose × baseline): the fitted model's contours every 5 mmHg (solid) and the truth's (dashed), the patients as dots, and a probe point with a +10 mg arrow. Drag the probe or use the two sliders. Parallel straight contours are the three inductive biases at a glance: the same +10 mg step crosses the same number of contours wherever it starts (uniform effects) and at any baseline (independence), always in the same direction (monotonicity).
2. **Dose slice** at the probe's baseline: patients, arm means, the fitted model, the best model in the class (dotted, n → ∞), the true mean f\*(D, B) (dashed), and the +10 mg step on the model (solid arrow) and on the truth (dashed arrow).
3. **Residuals by arm**: y − ŷ for every patient, their arm means, and (dotted) the mean residual with infinitely many patients, E_B[f\*(d, B) − f_∞(d, B)]. That curve is the bias: it does not shrink with more data, only with a different model class.

Readouts: the fitted equation, the model's and the truth's change for the +10 mg step, the squared bias E[(f_∞ − f\*)²] over the trial population, and the training MSE.

## What it rebuilds

- **L2 pp.22–25** (`docs/course-map/01-lectures-L1-L3.md`): the model f_θ, the linear model class, "restrict the hypothesis space", and the three properties of linear regression (independence, monotonicity, uniform effects), stated on p.25 without proof. Lesson 1.2 proves them (der-1-2-2, der-1-2-4: f(x + Δ) − f(x) = θᵀΔ); the widget shows the consequence on a curved truth.
- **L2 p.12** (`old_man`): an interaction is a new column; the toggle adds D·B.
- **L3 pp.41–43** (true mechanism g(X) vs the fitted f(X; θ)): the dashed truth against the solid fit.
- Part C, C1 ("L2 linear regression on log(1 + D) … and the residual plot that reveals it"): the log(1 + D) feature and the residual panel.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- Truth (Part C, C1; `src/lib/datasets/vasco.ts`): f\*(D, B) = −3 − 22D/(6 + D) + 0.15(B − 150). Additive in D and B, with **no dose × baseline interaction** (lessons 2.1 and 2.2 compute with exactly this model).
- Sample fit: ordinary least squares on [1, features…, interactions…], solved by the normal equations on standardized columns (raw mg next to mmHg next to mg·mmHg is badly conditioned; lesson 2.5) with partial pivoting, then mapped back to raw units.
- Population fit (n → ∞): the same normal equations with expectations in place of averages, D uniform over the six arms and B ~ N(155, 12²). Every entry is a polynomial of degree ≤ 2 in B, so a 3-point Gauss–Hermite rule (exact to degree 5) gives them exactly. Squared bias E[(f_∞ − f\*)²] uses the same rule.
- Results the tests pin down: with D/(6 + D) and B the population fit recovers (E₀ − 0.15·150, E_max, 0.15) and the squared bias is 0 (the truth is in the class; lesson 1.1, der-1-1-3); with D and B it is about 11.8 mmHg² and the mean-residual curve is positive at 0 and 40 mg and negative in between (the Emax curve is concave in D); **adding D·B leaves the bias unchanged** (its population coefficient is exactly 0), so the interaction toggle shows the fitted plane's dose effect varying with baseline, which the additive truth does not need; a line's +10 mg step is 10θ_D everywhere, the truth's is −13.75 mmHg from 0 mg and −1.41 mmHg from 20 mg at any baseline.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | `'vasco'` | | vasco | lesson 1.2 passes it |
| `features` | array of `dose`, `log1p_dose`, `emax_dose`, `baseline_sbp` | ≤ 4 | `['dose', 'baseline_sbp']` | an intercept is always included; order does not matter |
| `showTruth` | boolean | | true | dashed truth, truth contours, truth step |
| `showInteraction` | boolean | | false | adds (each chosen dose feature) × B |
| `showPopulationFit` | boolean | | true | dotted n → ∞ fit |
| `probeDose` | number | 0–30 | 0 | base of the +10 mg step (slider step 2.5) |
| `probeBaseline` | number | 120–190 | 155 | baseline of the probe and of the slice |

`figureState` (from a `<Step figureState>`): any subset of the params, applied with `setParams`.

## Rendering

Plain SVG (three panels share scales and need axis titles, which Mafs does not draw), via `_shared/plot-scale.ts` and `_shared/PlotAxes.tsx`; contours by marching squares (`zeroContour` from `gda-fitter/math.ts`). Colors from `useVizTheme()`: model `--viz-6` (coral, the ML-methods field), truth `--viz-1` (teal, probability), patients `--muted`, arm means and probe `--fg`. Line style also carries the meaning (solid fit, dotted n → ∞, dashed truth), so color is never the only signal. Layout CSS is in `styles.css`, imported by `Widget.tsx`. The dataset is `src/data/vasco.json`, imported directly (`data.ts`) so the chunk carries no other case. The static fallback (`fallback.ts`) draws the dose slice. Test hooks: `.lbp[data-features]`, `data-testid="lbp-step-model|lbp-step-truth|lbp-bias|lbp-mse|lbp-equation"`, `data-layer="fit|truth|population-fit|bias-curve|model-contours|truth-contours"`.
