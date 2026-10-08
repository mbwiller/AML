# sgd-noise

**Lesson 2.5 (Step size and conditioning), section "Stochastic and minibatch gradient descent".** A seeded least-squares problem in two parameters. At a draggable probe point θ the widget draws K minibatch steps −η g_B, their average, and the full-gradient step −η∇R̂; the reader raises the batch size and watches the fan tighten by √b while its center stays put. A second view runs constant-step SGD next to GD and shows the noise floor.

## What it rebuilds

- **L5 p.14** (`docs/course-map/02-lectures-L4-L5.md`): "Approximate the gradient at each step using either 1 sample (true SGD) or a few (minibatch SGD); noisy but unbiased." Stated on the slide; the lesson derives it in der-2-5-9 (E[g_B] = ∇R̂, Cov(g_B) = Σ₁/b).
- The lesson's two consequences: individual steps can point uphill, and a constant step size leaves a noise floor around θ̂ (the path view). The without-replacement paragraph (covariance times (n − b)/(n − 1), zero at b = n) is the "Sample with replacement" toggle.
- Course-map L5 widget idea #4 ("SGD noise explorer: a 2-D convex loss over n sample losses; batch-size slider from 1 to n; show the noisy gradient arrows, their mean equals the full gradient, and the trajectory jitter"). VISION.md §9.3 lists `sgd-noise` as P1.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- Data: x⁽ⁱ⁾ = 1.5·(z₁, 0.4z₁ + 0.6z₂) with z ~ N(0, I), y⁽ⁱ⁾ = θ_trueᵀx⁽ⁱ⁾ + 0.5ε, θ_true = (1, −1), from `createSeededRandom(seed)` (d3-random's LCG). The Hessian (2/n)XᵀX has eigenvalues near 5.5 and 1.35 (κ ≈ 4), so the level sets are tilted ellipses and η = 0.1 is stable.
- ℓᵢ(θ) = (θᵀx⁽ⁱ⁾ − y⁽ⁱ⁾)², R̂ = (1/n)Σℓᵢ, ∇ℓᵢ = 2(θᵀx⁽ⁱ⁾ − y⁽ⁱ⁾)x⁽ⁱ⁾; θ̂ from the normal equations.
- g_B = (1/b)Σₖ∇ℓ_{Iₖ} with Iₖ uniform and independent (def-2-5-5), or the first b of a seeded shuffle without replacement.
- Σ₁(θ) = (1/n)Σᵢ(∇ℓᵢ − ∇R̂)(∇ℓᵢ − ∇R̂)ᵀ; Cov(g_B) = Σ₁/b, times (n − b)/(n − 1) without replacement; √(E‖g_B − ∇R̂‖²) = √(tr Cov(g_B)).
- Tests: the mean of the n per-example gradients equals ∇R̂ exactly; the mean of 20,000 sampled minibatch gradients is within 5% for b = 1, 4, 16; the empirical spread matches √(tr Σ₁/b) and shrinks by about 2 and 4 at b = 4 and 16; without replacement b = n gives ∇R̂ exactly; GD converges to θ̂ while constant-step SGD keeps a floor that shrinks with b; everything is deterministic for a seed.

## What the reader sees

- **Arrows view** (Mafs, θ̂ ± 3): level sets of R̂ (`--viz-2`), θ̂ (× in `--viz-positive`), the probe (a ring; keyboard-movable, 44 px hit area), K thin steps −η g_B with dots at their tips (`--viz-1`), the theoretical 2σ ellipse of the tips (covariance η²Σ₁/b, dashed), their average (dashed `--field-ml` arrow), and the full-gradient step −η∇R̂ (solid `--fg` arrow, `showMeanGradient`).
- Readouts: ∇R̂(θ), ḡ = (1/K)Σ g_{B_k}, the RMS spread √((1/K)Σ‖g_{B_k} − ∇R̂‖²) next to √(tr Σ₁/b), the gap ‖ḡ − ∇R̂‖, and how many times smaller the spread is than at b = 1 (theory √b). With K = 400 the gap is small and the ratio is about 2.0 at b = 4 and 4.0 at b = 16.
- **Path view**: constant-step SGD (`--field-calculus`) and GD (dashed) from the probe for `pathSteps` steps; the RMS distance to θ̂ over the second half of the SGD path (the noise floor) against GD's distance.
- **Controls**: view, batch size (1 to n), minibatches drawn K, "New draws" (steps `drawSeed`), η, n, full-gradient and replacement toggles; Play / Step / Show all in the path view.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `n` | int | 10–400 | 100 | training examples |
| `batchSize` | int | 1–400 | 1 | b, clamped to n |
| `eta` | number | 0.01–0.5 | 0.1 | arrows are −η g |
| `showMeanGradient` | boolean | | true | the full-gradient arrow |
| `draws` | int | 1–400 | 40 | K minibatches at the probe |
| `replacement` | boolean | | true | def-2-5-5 draws with replacement |
| `view` | `'arrows' \| 'path'` | | `arrows` | |
| `probe` | `[number, number]` | each −3–3 | [−2.2, 0.2] | offset of θ from θ̂ |
| `pathSteps` | int | 10–300 | 80 | path view |
| `seed` | int | | 5 | data |
| `drawSeed` | int | ≥ 0 | 1 | minibatch stream |

Lesson 2.5 passes `n={100} batchSize={1} eta={0.1} showMeanGradient` with the challenge "At batch size 1, average many sampled gradient arrows at one point … Raise the batch size to 4 and then 16. By what factor does the spread of the arrows shrink?"

## Motion, figure state, fallback

- The arrows view is static. In the path view **Play** reveals the paths in strides every 60 ms, **Step** one stride per press; reduced motion makes Play show everything.
- `figureState`: any valid param keys are applied (`useFigureStateParams`).
- `fallback.ts` draws the level sets, up to 60 sampled steps, the full-gradient step, and θ̂ as token-colored SVG.
- Styles: `styles.css` in this folder (prefix `sgn-`).
