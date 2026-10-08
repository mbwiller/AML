# gda-fitter

**Lessons 7.2 (Gaussian discriminant analysis) and 7.3 (Shared covariance and logistic regression).** Two-class points on a Mafs plane; the GDA maximum-likelihood fit drawn as each class's 1σ and 2σ ellipses with × at the mean and the prior beside it; the Bayes decision boundary as the zero level set of the log posterior odds; a "shared covariance" toggle that pools Σ and turns the boundary into the line θᵀx + θ₀ = 0; a "logistic regression" toggle that overlays the gradient-descent fit as a dashed line; the fitted parameters typeset beside the plot with the training accuracy of each boundary. In edit mode the reader drags and removes points (the lesson challenges ask for it) and the fit follows.

## What it rebuilds

- **L10 p.15** (`docs/course-map/04-lectures-L8-L10.md`): GDA as the mixture with one Gaussian per class, P(x | y = k) = N(x; μ_k, Σ_k), "fit μ_k, Σ_k to be the empirical means and variances of each class". The widget shows those ellipses on top of the points they were fitted to.
- **L10 p.17 and p.20**: the closed-form MLE φ_k = n_k / n, μ_k = class mean, Σ_k = class covariance with 1/n_k. The readout is exactly these numbers.
- **L10 p.16 (decomposition) and the course map's L10 gap 2**: the slides never state that a shared Σ gives a linear boundary with w = Σ⁻¹(μ_1 − μ_0), nor the logistic-regression link. Lesson 7.3 derives it; the toggle shows it.
- The L10 widget idea "GDA fitter: draw/upload 2-class 2-D points; fitted class ellipses, priors, Bayes boundary; toggle shared covariance; overlay logistic regression" (course map, L10 widget ideas) and the VISION §9.3 row.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- MLE: φ̂ = n_1 / n, μ̂_k = (1/n_k) Σ_{i: y⁽ⁱ⁾ = k} x⁽ⁱ⁾, Σ̂_k = (1/n_k) Σ (x⁽ⁱ⁾ − μ̂_k)(x⁽ⁱ⁾ − μ̂_k)ᵀ (L10 p.20; der-7-2-* in lesson 7.2). Pooled Σ̂ = (n_0 Σ̂_0 + n_1 Σ̂_1) / n = (1/n) Σ_i (x⁽ⁱ⁾ − μ̂_{y⁽ⁱ⁾})(x⁽ⁱ⁾ − μ̂_{y⁽ⁱ⁾})ᵀ (lesson 7.3).
- Boundary: the zero set of log N(x; μ̂_1, Σ̂_1) + log φ̂ − log N(x; μ̂_0, Σ̂_0) − log(1 − φ̂), a quadratic in x, drawn by marching squares on a 56 × 56 grid over the view. With Σ̂_0 = Σ̂_1 = Σ̂ the quadratic terms cancel and the odds are θᵀx + θ₀ with θ = Σ̂⁻¹(μ̂_1 − μ̂_0), θ₀ = −½ μ̂_1ᵀ Σ̂⁻¹ μ̂_1 + ½ μ̂_0ᵀ Σ̂⁻¹ μ̂_0 + log(φ̂ / (1 − φ̂)); the widget then draws the clipped line and shows θ, θ₀. The test checks the contour points satisfy the line equation.
- Degeneracy: when a class has n_k ≤ d = 2 points (or its points are collinear), Σ̂_k is singular and the MLE does not exist (lesson 7.2, "the likelihood is unbounded"); the widget draws no ellipse or boundary and says why. With a shared Σ the condition is n − K ≥ d.
- Ellipses: level sets {x : (x − μ̂_k)ᵀ Σ̂_k⁻¹ (x − μ̂_k) = r²}, r = 1, 2, via the eigen-decomposition from `gaussian-2d-covariance/math.ts` (lesson 7.1), which this widget imports rather than duplicates.
- Logistic regression: full-batch gradient descent on the mean log-loss from θ = 0, η = 0.3, 400 steps, λ = 10⁻³ ridge so separable data does not diverge (lesson 7.3's contrast: same boundary family, different estimator). Deterministic, so no seed is needed; the test checks the loss decreases monotonically and that on data where the shared-Σ model is true the two lines nearly coincide.
- Synthetic data: y ~ Bernoulli(φ), x = μ_y + L_y z with Cholesky factors of Σ_0 = R(−20°) diag(1.4², 0.6²) R(−20°)ᵀ and Σ_1 the same ellipse rotated by the `rotation` slider; means ±(sep/2, sep/4). Setting `rotation` to −20° makes the shared-covariance model true. Draws come from the shared seeded d3-random LCG.
- ADVERSE: `src/data/adverse.json` (the generated cohort), two continuous columns standardized with the cohort mean and standard deviation, labeled by the hyperkalemia event, subsampled without replacement with the `seed` (same partial Fisher–Yates scheme as `sampleRows`). The JSON is imported directly, not through `src/lib/datasets/index.ts`, so the widget chunk does not carry `notes.json`.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | `'synthetic' \| 'adverse'` | | synthetic | lesson 7.2 passes `adverse` |
| `features` | `[feature, feature]`, feature ∈ age, egfr, potassium | | `['age', 'egfr']` | ADVERSE only |
| `n` | int | 50–400 | 200 | points drawn or patients subsampled |
| `seed` | int | | 7 | |
| `sharedCovariance` | boolean | | false | pooled Σ; linear boundary |
| `showLogisticRegression` | boolean | | false | dashed GD fit (the content's prop name; `figureState` also accepts `logisticOverlay`) |
| `separation` | number | 0.5–4 | 2 | synthetic only |
| `prior` | number | 0.05–0.95 | 0.5 | synthetic only, P(y = 1) |
| `rotation` | number | −90–90 | 40 | synthetic only, degrees |
| `editPoints` | boolean | | false | draggable points (first 60 per class) |
| `movedPoints` | `[id, x, y][]` | | `[]` | the reader's drags; in the state link |
| `removedPoints` | `id[]` | | `[]` | the reader's deletions; in the state link |

`figureState` (from a `<Step figureState>`): `{ sharedCovariance?, showLogisticRegression? | logisticOverlay?, highlight?: 'mu' | 'sigma' | 'boundary' | null }`. The booleans are applied as params; `highlight` thickens the means, the ellipses, or the boundary (fading the rest).

Challenge (default): "Turn shared covariance on and the boundary becomes a line. Turn it off and rotate class 1 until the boundary bends into a curve that closes around one class." (At rotation ≈ 70–90° the quadratic's level set is a closed curve around the narrower class in the direction of separation.)

## Rendering

Mafs (`<Mafs>`, `Coordinates.Cartesian`, `<Ellipse>`, `<Polyline>`, `<Text>`) on a fixed window [−6, 6]² (synthetic) or [−4, 4]² (ADVERSE, standardized units), `preserveAspectRatio="contain"`. Static points are one `<g data-layer="scatter-k">` per class in pixel space (circles for class 0, diamonds for class 1, so shape carries the class as well as color); the means are × markers. Draggable points are built on Mafs' `useMovable` with a focusable `<g role="button">` that has an accessible name, a 44 px hitbox, an accent focus ring, arrow-key movement, and a Delete key handler; "Remove selected point" and "Undo point edits" buttons cover pointer users. Colors: class 0 `--viz-negative`, class 1 `--viz-positive`, boundary `--viz-boundary`, logistic regression `--viz-4`, all via `useVizTheme()`. The root `<div class="gdf">` carries `data-boundary="linear|quadratic|none"` and `data-logistic="on|off"` for tests. Controls stack under the plot below 640 px; the static fallback (`fallback.ts`) draws the same picture as plain SVG for no-JS, print, and pre-hydration.
