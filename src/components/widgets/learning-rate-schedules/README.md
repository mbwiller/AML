# learning-rate-schedules

**Lesson 2.5 (Step size and conditioning), section "Decaying schedules".** Gradient descent with a decaying step size ηₜ on a loss whose gradient never exceeds G = 1, started a chosen distance from the minimum. The reader compares the schedules of L5 p.11 (plus a constant baseline) and sees which ones stall: a schedule whose total Σηₜ is smaller than the distance to cover can never arrive.

## What it rebuilds

- **L5 p.11** (`docs/course-map/02-lectures-L4-L5.md`): "Decaying learning rate": start large, reduce with iterations; the slide's three schedules ηₖ = η₀/(k+1) ("linear decay"), η₀/(k+1)² ("quadratic decay"), and η₀e^(−βk). The lesson renames the first two inverse and inverse-square; the widget's `schedule` values are `inverse`, `inverse-square`, `exponential`, and `constant`.
- **der-2-5-8** in the lesson (beyond the slides): ‖θ(T) − θ(0)‖ ≤ G Σ_{t<T} ηₜ, so reaching θ* from every start needs Σηₜ = ∞; Σ η₀/(t+1) = ∞, Σ η₀/(t+1)² = η₀π²/6, Σ η₀e^(−βt) = η₀/(1 − e^(−β)); and the Robbins–Monro pair Σηₜ = ∞, Σηₜ² < ∞ (eq. 2.5.5).
- Course-map L5 widget idea #2 ("Learning-rate schedule lab: … plot ηₖ, cumulative Σηₖ, and the iterate path; show which schedules stall"). VISION.md §9.3 lists `learning-rate-schedules` as P1.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- ηₜ for the four schedules; partial sums Σ_{s<t} ηₛ and Σ_{s<t} ηₛ².
- Closed-form infinite sums: Σηₜ is ∞ (constant, inverse), η₀π²/6 (inverse-square), η₀/(1 − e^(−β)) (exponential); Σηₜ² is ∞ (constant), η₀²π²/6 (inverse), η₀²π⁴/90 (inverse-square), η₀²/(1 − e^(−2β)) (exponential). The tests check partial sums of 200,000 terms against them.
- Robbins–Monro: only `inverse` meets both conditions (tested).
- The loss is the pseudo-Huber function E(θ) = √(1 + θ²) − 1 with θ* = 0: E'(θ) = θ/√(1 + θ²), so |E'| < 1 = G everywhere (der-2-5-8's bounded-gradient assumption), E''(0) = 1, and far from the minimum each step moves almost ηₜ. The tests check the travel bound |θ(t) − θ(0)| ≤ Σ_{s<t} ηₛ for every schedule and step, that inverse-square stays at least d0 − η₀π²/6 away, and that exponential with β = 0.1 arrives from 5 but stalls from 20 (its budget is ≈ 10.5).
- "Arrives" means |θ(t)| ≤ 0.1·d0 (within 10% of the starting distance). Inverse decay arrives, but slowly: near the minimum its error shrinks like 1/t.

## What the reader sees

- **Distance to the minimum |θ(t) − θ*|**, **step size ηₜ**, and (with `showCumulative`) **cumulative Σηₛ against the distance to cover** (a dashed rule at d0), with Σηₛ² as a thin line. The selected schedule is bold; the other three are faint. Each schedule has its own color and dash pattern (constant dotted, inverse solid, inverse-square dashed, exponential dash-dot), keyed in the table.
- **Panel**: schedule radio group, the formula and its two infinite sums, the outcome ("arrives at t = …", "stalls: Σηₜ = … < d0, so it can never get closer than …", or "still … away after T steps"), sliders for η₀, starting distance, β, T, the cumulative toggle, Play / Step / Show all.
- **Table**: for every schedule Σηₜ, Σηₜ², whether both Robbins–Monro conditions hold, and where it is after T steps.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `schedule` | `'constant' \| 'inverse' \| 'inverse-square' \| 'exponential'` | | `inverse` | lesson 2.5 passes `"inverse"` |
| `eta0` | number | 0.1–3 | 1 | η₀ |
| `beta` | number | 0.01–1 | 0.1 | exponential rate (ignored by the others) |
| `showCumulative` | boolean | | true | cumulative chart |
| `start` | number | 1–30 | 5 | d0 = \|θ(0) − θ*\| |
| `steps` | int | 20–1000 | 200 | T |

Lesson 2.5 passes `schedule="inverse" eta0={1} beta={0.1} showCumulative` with the challenge "Start far from the minimum. Which schedules stall before they arrive? …". At the defaults inverse-square stalls (budget π²/6 ≈ 1.64 < 5); raising the start to 20 makes exponential stall too.

## Motion, figure state, fallback

- Every series is drawn at once; **Play** reveals the iterations in strides of about T/100 every 45 ms; **Step** advances one stride; reduced motion makes Play show everything.
- `figureState`: any valid param keys are applied (`useFigureStateParams`).
- `fallback.ts` draws the four distance curves (the embedding's schedule bold) as token-colored SVG.
- Charts are React-drawn SVG (`_shared/plot-kit/MiniChart.tsx`), not Mafs: these are time series, not a coordinate plane. Styles: `styles.css` in this folder (prefix `lrs-`).
