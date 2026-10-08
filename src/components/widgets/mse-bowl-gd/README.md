# mse-bowl-gd

**Lessons 1.4 (Least squares) and 2.4 (Gradient descent).** The contours of the empirical risk R̂(θ_bmi, θ_one) = (1/n)‖Xθ − y‖² for the Lecture 4 companion's 20 patients, drawn with equal units on both axes so each level set has its true shape. Over them: the gradient-descent path from θ⁽⁰⁾, with Play, Step, Run to stop, Restart, and an iteration slider; the start; the least-squares minimum θ̂; and the current iterate. Beside it: the update rule with η, the Hessian H = (2/n)XᵀX and its condition number κ, the stopping status ("Stopped after 10,165 iterations: ‖θ⁽ᵗ⁺¹⁾ − θ⁽ᵗ⁾‖ ≤ 1e−5"), θ⁽ᵗ⁾ against θ̂ with their MSEs, the same run in the other coordinates (raw against standardized), and, when asked, the data with the current line and its residuals. The standardization toggle replaces bmi by its z-score: the long flat valley (κ ≈ 474) becomes a round bowl (κ = 1), and the companion's 10,165 iterations become 49.

## What it rebuilds

- **The Lecture 4 companion's gradient-descent run** (`Code Companions/lecture4-code companion.ipynb`, cells 18–23; L4 slides 45–46 per `docs/course-map/02-lectures-L4-L5.md`): features `bmi` and `one`, target / 300, θ⁽⁰⁾ = (2, 1), η = 0.1, stop when ‖θ⁽ᵗ⁺¹⁾ − θ⁽ᵗ⁾‖ ≤ 10⁻⁵. The widget reproduces it: 10,165 iterations (the notebook's last printed line is iteration 10,100), ending at (3.71421938, 0.45772775) to the printed eight decimals (cell 21), while least squares is (3.73788422, 0.45796438) (cell 23). The data are `src/data/diabetes-bmi-20.json` (`bmiScaled`, `target`).
- **L4 pp.37–41 and 44–46**: multivariate gradient descent, convergence and its criteria, the overall algorithm, and the convex bowl a well-chosen step always descends (pp.37–41), then gradient descent for the linear model in PyTorch (pp.44–46); the course map's L4 widget ideas "Diabetes GD trainer" (η and feature scaling fixing the slow convergence) and the VISION §9.3 row ("contour of J(θ₀, θ₁) with a GD trajectory; η slider; standardization toggle shows the bowl rounding").
- **Lesson 2.4 def-2-4-4 and der-2-4-2** (the three stopping rules) and **lesson 2.5** (H = (2/n)XᵀX, κ, the 2/λ_max stability limit, and standardizing to κ = 1).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- R̂(θ) = (1/n)Σ(θ_x x⁽ⁱ⁾ + θ_one − y⁽ⁱ⁾)², ∇R̂(θ) = (2/n)Xᵀ(Xθ − y), H = (2/n)XᵀX = 2[[mean x², mean x], [mean x, 1]]. Because R̂ is quadratic, R̂(θ) − R̂(θ̂) = (θ − θ̂)ᵀ(H/2)(θ − θ̂) exactly, so the contours are the analytic ellipses {θ : (θ − θ̂)ᵀ(H/2)(θ − θ̂) = c}, with semi-axes √(c/λₖ) along the eigenvectors of H/2 (`eigenSymmetric2` from `gaussian-2d-covariance/math.ts`). No marching squares and no d3-contour (not a dependency). Levels are c = c_top · 0.4ᵏ, k = 1 … 14, where c_top is the largest excess risk at a corner of the window. Tests: the gradient against central differences, the excess-risk identity, and level-set points lying on their contour.
- θ̂ by the centered normal equations (`line-fit-playground/math.ts`); reproduces cell 23's slope, intercept, and MSE 0.024177787873230695 to the printed precision.
- Gradient descent θ⁽ᵗ⁺¹⁾ = θ⁽ᵗ⁾ − η∇R̂(θ⁽ᵗ⁾) with the stopping rules of def-2-4-4: `parameter-change` (stop after the update with ‖θ⁽ᵗ⁺¹⁾ − θ⁽ᵗ⁾‖ ≤ ε, the companion's loop), `loss-change` (stop after the update with |R̂(θ⁽ᵗ⁺¹⁾) − R̂(θ⁽ᵗ⁾)| ≤ ε), `gradient-norm` (stop before the update when ‖∇R̂(θ⁽ᵗ⁾)‖ ≤ ε); an iteration cap; and `diverged` when the loss becomes non-finite or exceeds 10¹² times its start. Tests: the companion's run (iterations in 10,100–10,199, θ to eight decimals, monotone loss), convergence to θ̂ with a tight tolerance, each rule's last check below its tolerance, the parameter rule with ε matching the gradient rule with ε/η (der-2-4-2), divergence above 2/λ_max, and the cap.
- Standardization z = (x − x̄)/s with s² = (1/n)Σ(x − x̄)²: mean z = 0 and mean z² = 1, so H = 2I and κ = 1. `toRawCoordinates` maps (θ_z, θ_one) back to slope θ_z/s and intercept θ_one − θ_z x̄/s, which the widget prints. Tests: H = 2I, κ = 1 against κ > 100 raw, the same least-squares line in both coordinates, and at least a hundredfold fewer iterations (49 against 10,165 at the companion's settings).

Useful numbers at the companion's settings: λ_max(H) = 2.0002, λ_min = 0.0042, κ = 474; the loss-change rule with ε = 10⁻⁵ stops after 24 iterations at θ ≈ (2.02, 0.443), far from θ̂; the gradient-norm rule after 15,616; η ≥ 1.0 no longer converges (2/λ_max = 0.9999).

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | `'diabetes-bmi-20'` | | diabetes-bmi-20 | lesson 2.4 passes it |
| `eta` | number | (0, 2] | 0.1 | slider 0.01–1.2 |
| `init` | `[number, number]` | each −20 to 20 | `[2, 1]` | θ⁽⁰⁾ = (θ_bmi, θ_one) in the coordinates being optimized; sliders −5 to 10 and −2 to 3 |
| `standardize` | boolean | | false | z-score bmi (1/n standard deviation) |
| `stopping` | `'parameter-change' \| 'gradient-norm' \| 'loss-change'` | | parameter-change | def-2-4-4 |
| `tolerance` | number | (0, 1] | 0.00001 | ε; slider on log₁₀ ε from −10 to −1 in steps of 0.5 |
| `maxIterations` | int | 10 to 200,000 | 50,000 | the iteration cap |
| `showResiduals` | boolean | | true | the data, the current line θ⁽ᵗ⁾ (in raw bmi units), and its residuals |

Lesson 2.4 embeds it with `dataset="diabetes-bmi-20" eta={0.1} init={[2, 1]} standardize={false} stopping="parameter-change" tolerance={0.00001} showResiduals={true}`; the build validates those props against this schema, and `tests/e2e/widget-mse-bowl-gd.spec.ts` checks the lesson's embed.

`figureState` (from a `<Step figureState>`): `{ eta?, standardize?, stopping?, tolerance?, init?, showResiduals? }`, applied as params.

Challenge (default): "Press Play and watch where the path ends compared with the least-squares point. Then turn on standardization: how many iterations does the same rule need now?"

## Rendering and motion

Plain SVG at the measured width with one unit equal to the same number of pixels on both axes (`geometry.ts`, shared with `fallback.ts`), so the raw bowl is visibly a long valley and the standardized one a set of circles. The window is the bounding box of the start, θ̂, and the path, padded by 12% and widened to the plot's aspect; a diverging path is followed only while it stays within four times the start-to-minimum box. The 10,000-step path is thinned to ≥ 1 px segments, and iterates at least 7 px apart are drawn as dots so the early, visible steps read as steps.

The run is computed in full whenever a param changes (10,165 updates of a 2-vector over 20 points take a few milliseconds) and starts shown at its end. Play animates the iterate from the start (or from where it is): runs of at most 60 iterations play at one step per 80 ms; longer runs play in log time over 5 s, so the first steps are as visible as the last thousands. With `prefers-reduced-motion: reduce`, Play jumps to the end without animating; Step, Run to stop, Restart, and the iteration slider work the same either way.

Colors, all via `useVizTheme()`: contours `--viz-2`, the path and the current iterate `--viz-4`, the start (open circle) and θ̂ (×) in `--fg`, and in the data panel the patients `--viz-1`, the line `--viz-6`, the residuals `--viz-5`. Markers differ in shape as well as color. The root `<div class="mbg">` carries `data-standardize`, `data-status` (`converged`, `diverged`, `max-iterations`), `data-iterations`, `data-t`, `data-playing`, and `data-theta` for the tests. Controls stack below 640 px; the transport buttons are 44 px tall. Styles are in `styles.css` (prefix `.mbg-`), imported by `Widget.tsx`.
