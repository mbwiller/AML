# true-vs-empirical-risk

**Lesson 2.2 (True risk and empirical risk).** The constant model f_θ(x) = θ with squared loss on one VASCO arm (placebo in the lesson). Top left: the true risk R(θ), in closed form from the generative model, and the training risk R̂(θ) on n patients, as parabolas over θ, with their minimizers θ\* = μ and θ̂ = ȳ (dotted drops), the gap R(θ̂) − R̂(θ̂) as a solid bar at θ̂, the patients' outcomes as ticks on the θ axis, and the scored θ marked on both curves. Top right: the formulas and the readouts. Bottom: one dot per training set for R̂(θ) − R(θ) at the scored θ, with the running mean (solid) against its expected value (dashed): 0 for a θ fixed in advance, −2σ²/n for the fitted ȳ. "Resample" draws a fresh training set (the next seeded draw), "Resample 100×" draws a hundred; changing n, the arm, the seed, or the scored θ starts a new record.

The first training set (draw 0, n ≤ 50) is the generated trial's own arm (the first n of its 50 patients); every later draw is a fresh, seeded sample of n patients from the generative model.

## What it rebuilds

- **L4 p.5** (`docs/course-map/02-lectures-L4-L5.md`): "Aka true risk", R(θ) = E\_{(X,Y)∼P} error(f(X; θ), g(X)) (with the slide's g(θ) typo corrected to Y, as lesson 2.2 does).
- **L4 pp.7–8 and p.10**: the empirical error (1/N) Σ error(f(X_i; θ), y_i) and θ̂ = argmin of it, "minimize the empirical risk over the drawn samples". The coral curve is exactly that average; the teal one is what it estimates.
- **L3 pp.41–45**: "we must learn the entire function from these few examples"; the patients' ticks are the few examples.
- The L3 widget idea "true function vs fitted function … the training-sample average error — previews true vs empirical risk" (course map, L3 suggested widgets).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- Arm distribution (Part C, C1; `armMoments` in `src/lib/datasets/vasco.ts`): within an arm with dose d, Y = f\*(d, B) + ε with B ~ N(155, 12²) and ε ~ N(0, 8²) independent, so μ = −3 − 22d/(6 + d) + 0.15·5 and σ² = 0.15²·144 + 64 = 67.24 mmHg². For placebo, μ = −2.25 (lesson 2.2's worked example).
- R(θ) = E[(Y − θ)²] = (θ − μ)² + σ² (der-2-2-5); R̂(θ) = (1/n) Σ (y⁽ⁱ⁾ − θ)² = (θ − ȳ)² + s² with s² the 1/n sample variance. Both are exact; the true risk needs no Monte Carlo.
- Expectations over training sets (der-2-2-2, der-2-2-5, eq. 2.2.6): E[R̂(θ)] = R(θ) for a θ chosen before seeing the data; E[R̂(ȳ)] = (n − 1)σ²/n and E[R(ȳ)] = (n + 1)σ²/n, a gap of 2σ²/n (2.69 mmHg² for placebo at n = 50, as the lesson computes). The Vitest checks these by a seeded Monte Carlo of 6,000 training sets at n = 5.
- Fresh draws use the dataset generators' PRNG (`createRng(seed).fork('<arm>/<n>/<draw>')`, Box–Muller), so a draw is the same on every machine and in the state link.

No homework-specific numbers: everything shown follows from the C1 case specification and the general results of lesson 2.2.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | `'vasco'` | | vasco | lesson 2.2 passes it |
| `arm` | `placebo`, `2.5mg`, `5mg`, `10mg`, `20mg`, `40mg` | | placebo | |
| `model` | `'constant'` | | constant | the only model class lesson 2.2 names |
| `n` | int | 2–500 | 50 | patients per training set |
| `showTrueRisk` | boolean | | true | |
| `showTrainingRisk` | boolean | | true | |
| `resample` | boolean | | true | shows the two resample buttons |
| `thetaMode` | `true-mean`, `fixed`, `fitted` | | true-mean | which θ is scored and recorded |
| `thetaOffset` | number | −10–10 | 4 | `fixed` mode: θ − θ\*, set by the "Fixed θ" slider |
| `seed` | int | | 5 | seed of the fresh training sets |
| `draw` | int | ≥ 0 | 0 | which training set (0 = the trial's arm when n ≤ 50) |

`figureState` (from a `<Step figureState>`): any subset of the params, applied with `setParams`.

## Rendering

Plain SVG via `_shared/plot-scale.ts` and `_shared/PlotAxes.tsx` (axis titles in mmHg and mmHg²). Colors from `useVizTheme()`: true risk `--viz-1` (teal, dashed), training risk `--viz-6` (coral, solid), gap and markers `--fg`; the line styles and the circle/square markers carry the same distinction. Labels with hats are typeset with `<MathLabel>` (KaTeX), not combining characters. Layout CSS is in `styles.css`, imported by `Widget.tsx`; controls stack under the plots below 640 px. The static fallback (`fallback.ts`) draws the risk panel for the first training set. Test hooks: `.tver[data-theta-mode][data-draw]`, `data-testid="tver-theta-star|tver-sigma2|tver-theta-hat|tver-train-hat|tver-true-hat|tver-gap|tver-theta|tver-train|tver-true|tver-mean-diff|tver-expected-diff"`, `data-layer="true-risk|training-risk|gap|rug|history"`.
