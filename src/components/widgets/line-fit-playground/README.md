# line-fit-playground

**Lesson 1.3 (Loss functions).** The Lecture 2 companion's 20 patients (BMI on the companion's axis against disease progression) with a line f_θ(x) = θ₀ + θ₁x the reader moves with two sliders. Each residual is drawn as a vertical segment, or as a square on that segment whose area is proportional to the squared residual. Beside the plot: the line typeset with the current numbers, a headline loss (MSE or MAE), and MAE, MSE, RMSE, and R² for "your line" next to the least-squares values. "Snap to OLS" jumps to the closed-form fit; with the MAE loss selected, "Snap to least absolute deviations" jumps to the MAE minimizer, which is a different line.

## What it rebuilds

- **L2 pp.20–21** (`docs/course-map/01-lectures-L1-L3.md`): the 20-patient BMI scatter and the black least-squares line from `LinearRegression().fit`. The data are exactly the companion's (`Code Companions/Lecture2code_companion.ipynb`, cell 8: `bmi * 30 + 25`, last 20 rows), from `src/data/diabetes-bmi-20.json` (`bmiRecentered`, `target`).
- **L3 p.4**: the hand-drawn candidate lines on the same scatter; every slider position is one model in 𝓜 = {f_θ : θ₀, θ₁ ∈ ℝ}.
- **L2 pp.29–31 and L3 pp.5–9**: absolute error drawn as vertical segments, squared error drawn as squares on the residuals (L2 p.31), RMSE, and R² = 1 − SS_res/SS_tot (L3 p.9); L3 p.40: "R² can be negative if your model is really bad". The course map's L1–L3 widget ideas "Line-fitting playground" and "Residual-metric dashboard" (sliders, MAE and MSE live, segments and squares, "set to OLS", R² going negative when the line is worse than the mean), and the VISION §9.3 row.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- Residuals r⁽ⁱ⁾ = y⁽ⁱ⁾ − (θ₀ + θ₁x⁽ⁱ⁾). MAE = (1/n)Σ|r⁽ⁱ⁾|, MSE = (1/n)Σ(r⁽ⁱ⁾)², RMSE = √MSE, R² = 1 − Σ(r⁽ⁱ⁾)² / Σ(y⁽ⁱ⁾ − ȳ)². The 1/n is kept (STYLE_GUIDE §2.1).
- Least squares in the centered form of the normal equations: θ̂₁ = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², θ̂₀ = ȳ − θ̂₁x̄. On the 20 patients this gives θ̂₁ = 37.378842160521216 and θ̂₀ = −797.0817390343261, each 1 ulp from the companion's printed 37.37884216052121 and −797.0817390343262 (cell 15). The test checks this to the printed precision (`src/lib/datasets/printed.ts`), and checks the normal equations (residuals sum to 0 and are orthogonal to x) and that nudging either parameter raises the MSE.
- Least absolute deviations: the MAE is convex and piecewise linear in θ, so a minimizer is a line through two data points; the widget tries all 190 pairs. On these data it is θ₀ ≈ −868.36, θ₁ ≈ 40.29, MAE 34.16 against least squares' 34.48 (and a larger MSE, 2192.5 against 2176.0). The test checks both inequalities and local optimality.
- The squares are drawn in pixel space with side |py − pŷ|, so with the y scale fixed their areas are proportional to r². They sit on the side of the segment with more room and are clipped to the plot.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | `'diabetes-bmi-20'` | | diabetes-bmi-20 | the only dataset for now |
| `theta0` | number | −1500 to 600 | −500 | intercept θ₀; slider step 1 |
| `theta1` | number | −20 to 80 | 25 | slope θ₁; slider step 0.1 |
| `showResiduals` | boolean | | true | vertical residual segments |
| `showSquares` | boolean | | false | squared residuals as squares |
| `loss` | `'mse' \| 'mae'` | | mse | the headline loss; `mae` adds the least-absolute-deviations snap |

The sliders cannot hit the least-squares values exactly, because of their steps; "Snap to OLS" sets the exact floats, and the readout shows θ to four decimals.

`figureState` (from a `<Step figureState>`): `{ theta0?, theta1?, showResiduals?, showSquares?, loss?, snap?: 'ols' | 'lad' }`, applied as params.

Challenge (default): "Move θ₀ and θ₁ to make the MSE as small as you can, then snap to OLS. How close did you get, and what happened to R² on the way?"

## Rendering

Plain SVG at the measured container width (`useElementWidth`), not Mafs: the axes are not to scale (BMI 22.5–28 against progression 0–350), the ticks are "nice" numbers on each axis, and the squares are pixel geometry. `geometry.ts` (window, scales, ticks, residual glyphs) is shared with the static fallback (`fallback.ts`), so the two pictures agree. `plot.ts` (scales, ticks, path strings, polyline thinning) and `data.ts` (the two companion views of the data) are shared with `mse-bowl-gd`.

Colors, all via `useVizTheme()`: patients `--viz-1`, the line `--viz-6`, residuals and squares `--viz-5`. Patients are circles and the line is solid, so color is not the only carrier of meaning. The root `<div class="lfp">` carries `data-loss`, `data-at-ols`, `data-theta0`, and `data-theta1` (full precision) for the tests. Controls stack under the plot below 640 px; the snap buttons are 44 px tall. Styles are in `styles.css` (prefix `.lfp-`), imported by `Widget.tsx`. The widget has no animation, so reduced motion changes nothing.
