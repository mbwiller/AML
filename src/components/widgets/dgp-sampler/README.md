# dgp-sampler

**Lesson 2.1 (Data-generating distributions).** A seeded scatter of n draws from the linear data-generating distribution of def-2-1-7, X ~ N(0, σ_X²), ε ~ N(0, σ_ε²) independent of X, Y = α + βX + ε; the true conditional mean line E[Y | X = x] = α + βx; the ordinary-least-squares line α̂ + β̂x fitted to the draws; the sample R̂², the training MSE, and the population R² beside it; and a small plot of the sample R² (or the training MSE) against n on nested samples from 3 to 2,000 draws, on a log axis, with the population value as a dashed line. "Draw again" changes the seed, so the reader sees P stay fixed while 𝒟 and the fitted line move.

## What it rebuilds

- **L3 p.37** (`docs/course-map/01-lectures-L1-L3.md`, Lecture 3): the linear data-generating process Y = α + βX + ε with the true function f*(X) = α + βX.
- **L3 p.40**: "When the DGP is truly linear, what does R² converge to as n → ∞?" with R² = 1 − RSS/TSS. The slide states the question and the R² formula, not the answer; the course map's derivation gap 6(d) and lesson 2.1's closing paragraph ask for the general limit, which this widget shows converging and the section below derives.
- The course map's L3 widget idea "DGP sampler: sliders for α, β, σ_X, σ_ε; draw n points from Y = α + βX + ε; fit OLS; plot R² vs n converging to its population limit", and the VISION §9.3 row.

**Homework safety (VISION R17).** The question on L3 p.40 was HW2 (due 2026-10-05, past). The widget states the general result for any (β, σ_X, σ_ε), which lesson 2.1 also states; it hard-codes no homework parameters (the slide's X ~ N(168, 30), ε ~ N(0, 20) are not defaults or presets). X is centered at 0 here because the intercept and the mean of X do not affect R².

## The math it depends on (`math.ts`, tested in `math.test.ts`)

**Sampling.** z_i, e_i ~ N(0, 1) from the shared seeded d3-random LCG; x⁽ⁱ⁾ = σ_X z_i and y⁽ⁱ⁾ = α + βx⁽ⁱ⁾ + σ_ε e_i. The standard normals depend only on the seed, so the sliders rescale one cloud instead of redrawing it, and the first n draws are a prefix of the first n + 1 (the R² curve is over nested samples).

**OLS with an intercept.** With centered sums S_xx = Σ(x⁽ⁱ⁾ − x̄)², S_xy = Σ(x⁽ⁱ⁾ − x̄)(y⁽ⁱ⁾ − ȳ), S_yy = Σ(y⁽ⁱ⁾ − ȳ)² (accumulated with Welford's update for stability):
β̂ = S_xy / S_xx, α̂ = ȳ − β̂x̄, RSS = S_yy − S_xy²/S_xx, TSS = S_yy, R̂² = 1 − RSS/TSS, training MSE = RSS/n. R̂² is undefined (shown as "undefined") when TSS = 0, which happens only when β = 0 and σ_ε = 0.

**Population R².** Lesson 2.1 (der-2-1-6) proves E[Y | X] = α + βX and Var(Y) = β²σ_X² + σ_ε². The population version of R² replaces each sample average by its expectation:

1. Divide numerator and denominator of RSS/TSS by n: R̂² = 1 − (RSS/n) / (TSS/n).
2. TSS/n = (1/n) Σ(y⁽ⁱ⁾ − ȳ)² is the sample variance of Y, which converges to Var(Y) = β²σ_X² + σ_ε² by the law of large numbers (lesson 2.2).
3. β̂ = (S_xy/n)/(S_xx/n) → Cov(X, Y)/Var(X) = βσ_X²/σ_X² = β, and α̂ → E[Y] − βE[X] = α, by the same law applied to each average and continuity of the ratio (σ_X > 0).
4. So the fitted line converges to the true line and RSS/n = (1/n) Σ(y⁽ⁱ⁾ − α̂ − β̂x⁽ⁱ⁾)² → E[(Y − α − βX)²] = E[ε²] = σ_ε².
5. Substitute steps 2 and 4 into step 1: R̂² → 1 − σ_ε² / (β²σ_X² + σ_ε²) = **β²σ_X² / (β²σ_X² + σ_ε²)** = Var(f*(X)) / Var(Y).

The limit is the share of Var(Y) the input explains. It does not depend on α (or on the mean of X), is 1 when σ_ε = 0, and is 0 when β = 0. The Vitest checks the formula's edge cases and that the sample R² of 200,000 draws matches it to two decimals for four parameter settings; it also checks that β̂ → β, α̂ → α, and the training MSE → σ_ε².

**Why the training MSE can dip below σ_ε² at small n** (the lesson's challenge): OLS chooses the line that minimizes the training RSS, so RSS ≤ Σ(ε⁽ⁱ⁾)², the RSS of the true line; on average RSS/n = σ_ε²(n − 2)/n. Lesson 2.2 derives the general version; the widget lets the reader see it on the "Training MSE" curve.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `alpha` | number | −3 to 3 | 0 | intercept α of the true line |
| `beta` | number | −2 to 2 | 1 | slope β |
| `sigmaX` | number | 0.2 to 2 | 1 | standard deviation of X |
| `sigmaEps` | number | 0 to 3 | 1 | noise standard deviation σ_ε |
| `n` | int | 3 to 1,000 | 20 | the curve continues to 2,000 |
| `showConditionalMean` | boolean | | true | draw E[Y \| X = x] = α + βx |
| `seed` | int | | 1 | "Draw again" adds 1; Reset restores it |
| `curve` | `'r2' \| 'mse'` | | `'r2'` | what the small plot tracks against n |

Lesson 2.1 passes `alpha={0} beta={1} sigmaX={1} sigmaEps={1} n={20} showConditionalMean={true}` (the defaults). `figureState` from a `<Step figureState>` may set any subset of the params (validated with the manifest schema's `.partial()`).

Challenge (default): "Draw again a few times at n = 20 and watch the OLS line move while the true line stays put. Then raise n: what does the sample R² settle near, and how does that number change with the slope, the spread of X, and the noise level?"

## Rendering

Mafs (`Coordinates.Cartesian`, `Line.ThroughPoints`) on x ∈ [−6, 6] and a y window centered on 0 whose half-height snaps to 4, 6, 8, 12, 16, or 24 so the axis changes rarely; `preserveAspectRatio={false}`. The scatter is one `<g data-layer="scatter">` of circles in pixel space. The true line is solid and the OLS line dashed, so line style carries the distinction as well as color (true line `--viz-4`, OLS `--viz-6`, draws `--viz-1`, all via `useVizTheme()`). The convergence plot is plain React SVG (`role="img"` with a text summary as its accessible name). Readouts are `<output>` elements with `data-testid` hooks. There is no animation, so `prefers-reduced-motion` needs no special case. Layout CSS lives in `styles.css` beside the widget (prefix `.dgp-`). The static fallback (`fallback.ts`) draws the same scatter and lines for no-JS, print, and pre-hydration.
