# generative-vs-discriminative-toggle

**Lesson 6.1 (Generative vs discriminative models).** The same ADVERSE patients (two standardized features, the 90-day hyperkalemia event as the label, about 6% events) classified two ways. **Generative:** fit the class-conditionals p(x | y = k) as Gaussians (the GDA maximum-likelihood fit, 1σ rings and × at the means), combine them with a prior π = p(y = 1) set by a slider, and draw the Bayes boundary, where the posterior odds equal 1. **Discriminative:** fit p(y | x) = σ(θᵀx + θ₀) directly by logistic regression. A radio group switches which model is in front (its boundary solid, its "classified as event" side shaded); the other model's boundary stays dashed for comparison. Sliding π moves the generative boundary and changes how many patients it flags; the logistic-regression boundary never moves, and the readout says why.

## What it rebuilds

- **L8 pp.30–33 and L9 p.2** (`docs/course-map/04-lectures-L8-L10.md`): the definitions (discriminative p_θ(y | x) "learns the decision boundary"; generative p_θ(x | y) with p(y)) and the paired illustration of a dashed boundary against class-conditional density contours (L8 p.33, the course map's figure 5).
- **L8 pp.36–41**: the Bayes classifier ŷ = argmax_y p(x | y) p(y), and the p.37 poll trap ("p(x | y = 0) = 0.6, p(x | y = 1) = 0.4 ⇒ always predict y = 0?" No: the prior matters). The prior slider is that poll as a picture.
- **L9 pp.3–4**: the discriminative side models only P(y | x); the generative side needs a prior and class-conditionals.
- The course map's L8 widget idea: "Generative vs discriminative toggle: 2-class 2-D data; left: logistic boundary; right: fitted class densities + Bayes boundary; slider for the prior p(y = 1) to show how the boundary moves (addresses the 0.6/0.4 poll trap)", and the VISION.md §9.3 P1 entry.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

Nothing is fitted twice: the GDA MLE (φ̂, μ̂_k, Σ̂_k or the pooled Σ̂), the log posterior odds, the shared-Σ line, the marching-squares zero contour, logistic regression by gradient descent, and the ADVERSE projection all come from `gda-fitter/math.ts` and `gda-fitter/data.ts` (README there). This widget adds:

- **The prior enters additively.** Bayes' rule gives log p(y=1|x)/p(y=0|x) = log p(x|y=1)/p(x|y=0) + log π/(1 − π). `withPrior(fit, π)` keeps the fitted class-conditionals and replaces φ̂ by π; `priorShift(φ̂, π) = logit π − logit φ̂ = Δ` is what moving the prior adds to the log odds at every x. The test checks this identity at several points for both covariance models.
- **Shared Σ: the boundary moves parallel.** With one Σ the odds are θᵀx + θ₀ with θ = Σ̂⁻¹(μ̂₁ − μ̂₀) and θ₀ containing log π/(1 − π) (lesson 7.3), so changing π changes only θ₀ (by Δ) and the line moves by Δ/‖θ‖ along −θ, toward the no-event mean when π grows (`boundaryMove`, `signedDistance`; tested).
- **Monotone flagging.** The number of patients with positive log odds never decreases as π grows (tested for both covariance models on the lesson's sample).
- **The lesson's numbers.** At the defaults (age and eGFR, n = 600, seed 7) the sample has 39 events (φ̂ = 0.065). At π ≈ φ̂ the shared-Σ Bayes boundary and logistic regression nearly coincide (normals under 10° apart, offsets within 0.5; tested) and neither flags anyone, because no patient's posterior reaches 1/2 at a 6.5% base rate. Moving π to 0.5 adds Δ ≈ +2.6 and the Bayes rule flags many patients (more than three times as many; tested), while the logistic-regression line, which has no prior input and absorbs the base rate into θ₀, is unchanged.
- **Geometry.** `positiveRegion` clips the plot window by the half-plane θᵀx + θ₀ > 0 (Sutherland–Hodgman) for the shading; `angleBetween` compares two boundaries' normals.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | enum | `adverse` | `adverse` | lesson 6.1 passes it |
| `features` | `[feature, feature]`, feature ∈ age, egfr, potassium, distinct | | `['age', 'egfr']` | lesson 6.1 passes `["age", "egfr"]` |
| `y` | enum | `y` | `y` | the label column (ADVERSE's 90-day event) |
| `model` | enum | `generative`, `discriminative` | `generative` | which boundary is solid |
| `prior` | number | 0.01–0.99 (slider step 0.005) | 0.06 | π = p(y = 1) of the generative model; 0.06 is ADVERSE's target prevalence |
| `sharedCovariance` | boolean | | true | pooled Σ (linear Bayes boundary); off gives the quadratic boundary |
| `showOther` | boolean | | true | the other model's boundary, dashed |
| `n` | int | 100–1000 | 600 | patients subsampled |
| `seed` | int | | 7 | subsample seed |

A `figureState` object may set any param (parsed with the params schema made partial), e.g. `{"model": "discriminative"}` or `{"prior": 0.5}`.

Challenge (default): "Slide the prior p(y = 1) from 0.06 up to 0.5. Which way does the generative boundary move, and how many more patients does it flag? Switch to the discriminative model and slide again." Lesson 6.1 overrides it with its own wording of the same task.

## Rendering

Mafs plane on the standardized window [−4, 4]² (the gda-fitter ADVERSE window), `preserveAspectRatio="contain"`. Patients are drawn in pixel space (circles for no event in `--viz-negative`, diamonds for events in `--viz-positive`, so shape carries the class too). Generative mode adds the fitted 1σ ellipses and × means. The Bayes boundary is `--viz-boundary`, logistic regression `--viz-4`; the active one is solid (3 px) and the other dashed. The active model's event side is a `Polygon` in `--viz-positive` at 10% (linear boundaries only). Beside the plot: the model radio group, the active model's equation typeset with `MathLabel` (shared macros; `sym-pos`, `sym-neg`, `sym-mu`, `sym-sigma`, `sym-theta`), the prior slider with a "set π to φ̂" button, a stats list (events in the sample, flagged by each model, Δ), and a polite live explanation. Toggles, feature choices, and the patient count sit underneath. The root carries `data-model` and `data-boundary`; boundary layers carry `data-layer` and `data-style` for the tests. Styles are in `styles.css` (prefix `gvd-`), imported by `Widget.tsx`. The static fallback (`fallback.ts`, sharing `scene.ts`) draws the scatter and both boundaries at the authored params.

## Size

The chunk carries `adverse.json` through `gda-fitter/data.ts`, shared with gda-fitter (Rollup puts it in a common chunk when both are built).
