# gd-1d-quadratic

**Lesson 2.5 (Step size and conditioning).** Gradient descent with a fixed step size η on the parabola E(θ) = ½aθ² + bθ + c. The reader moves η (and a, b, θ(0)) and watches the iterates walk down, land in one step, zigzag in, bounce forever, or fly off, while the contraction factor 1 − ηa moves along a strip that marks η_opt = 1/a and 2η_opt = 2/a.

## What it rebuilds

- **L4 p.48** (`docs/course-map/02-lectures-L4-L5.md`): "Convergence for quadratic surfaces": E = ½aw² + bw + c, the update w(k+1) = w(k) − η dE/dw, and η_opt = E''(w)⁻¹ = a⁻¹ ("can arrive at the optimum in a single step"). Stated on the slide without derivation; the lesson derives it in der-2-5-1.
- **L4 p.49**: the four panels (a)–(d) of a parabola with η < η_opt, η = η_opt, η_opt < η < 2η_opt, η > 2η_opt. The widget's parabola is all four panels at once, chosen by the η slider; the regime strip labels which panel you are in. The boundary η = 2η_opt ("bounces forever", the jittering picture of L4 p.47) is reachable exactly with the "η = 2η_opt" button.
- The L4 widget idea 7 in the course map: "GD on a 1-D parabola with η slider: show the contraction factor 1 − ηa, iterates, and the four regimes from slide 49; markers at η_opt and 2η_opt" (VISION.md §9.3 row `gd-1d-quadratic`).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- E'(θ) = aθ + b, θ* = −b/a, E''(θ) = a (der-2-5-1 steps 1–3).
- One step multiplies the error e(t) = θ(t) − θ* by 1 − ηa (der-2-5-1 step 7), so e(t) = (1 − ηa)^t e(0) (step 8). `gdIterates` runs the update itself; the tests check it against the closed form.
- Regimes from the sign and size of 1 − ηa (der-2-5-2): `frozen` (η = 0), `monotone` (0 < 1 − ηa < 1), `exact` (1 − ηa = 0, η = η_opt), `oscillating` (−1 < 1 − ηa < 0), `bounce` (1 − ηa = −1, η = 2η_opt), `divergent` (1 − ηa < −1). A tolerance of 1e-9 absorbs float error when η is set to exactly 1/a or 2/a.
- Steps until the error is below 1/1000 of e(0): the smallest t with |1 − ηa|^t ≤ 10⁻³.

## What the reader sees

- **Parabola** (Mafs, `preserveAspectRatio={false}`), window centered on θ* and wide enough for θ(0) and its mirror image. θ(0) is a square, later iterates are dots, joined by arrows; θ* is a dashed vertical line.
- **Regime strip**: η from 0 to 2.5 on top; zones monotone / oscillates / diverges shaded with `--viz-positive`, `--field-calculus`, `--viz-negative` and labelled in text (color is never the only carrier); ticks labelled η_opt and 2η_opt when `markers` lists them; the current η as a dark marker. With `showContraction`, the bottom axis is 1 − ηa (linear in η, so 0 sits under η_opt and −1 under 2η_opt).
- **Error by step**: stems of e(t) with the envelope ±|1 − ηa|^t |e(0)| (dashed, with `showContraction`).
- **Readouts** (KaTeX via `MathLabel`, `sym-theta` and `sym-eta` classes): E(θ) with the current coefficients, θ*, η_opt, 2η_opt, 1 − ηa evaluated, |e(T)|; the regime in words and the steps to 1/1000.
- **Controls**: η slider (step 0.01) plus "η = η_opt" and "η = 2η_opt" buttons (exact values for any a); a, b, θ(0) sliders; the contraction toggle; Play / Step / Show all.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `a` | number | 1–5 | 2 | curvature; η_opt = 1/a. a ≥ 1 keeps 2η_opt ≤ 2 inside the η slider's range |
| `b` | number | −10–10 | −4 | θ* = −b/a |
| `c` | number | −10–10 | 0 | shifts E only (shown in the formula, no slider) |
| `eta` | number | 0–2.5 | 0.25 | step size |
| `theta0` | number | −10–10 | 5 | starting point |
| `steps` | int | 1–40 | 12 | iterates drawn |
| `showContraction` | boolean | | true | factor axis, readout, and envelope |
| `markers` | `('eta_opt' \| 'two_eta_opt')[]` | | both | ticks on the strip and the preset buttons |

Lesson 2.5 passes `a={2} b={-4} c={0} eta={0.25} showContraction markers={["eta_opt", "two_eta_opt"]}` and its own challenge (one-step, oscillating, and divergent η, and where 1 − ηa sits relative to −1, 0, 1). At the lesson's values: θ* = 2, η_opt = 0.5, 2η_opt = 1, and the default η = 0.25 has factor 0.5.

## Motion, figure state, fallback

- Every iterate is drawn at once; slider changes redraw instantly. **Play** reveals one iterate per 380 ms tick; **Step** reveals one per press. Under `prefers-reduced-motion`, Play shows the whole sequence at once (`_shared/plot-kit/useStepPlayer.ts`).
- `figureState`: a `<Step figureState='{"eta": 0.5}'>` applies any valid param keys (`_shared/plot-kit/useFigureStateParams.ts`); lesson 2.5 does not use it yet.
- `fallback.ts` draws the parabola and the iterates for the embedding's params as token-colored SVG.
- Styles: `styles.css` in this folder (prefix `g1q-`), imported by `Widget.tsx`.
