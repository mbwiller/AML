# gd-2d-eigen

**Lesson 2.5 (Step size and conditioning).** Gradient descent with one step size η on the elliptical bowl E(θ) = ½θᵀAθ, where A has eigenvalues λ1, λ2 and eigenvectors rotated by φ. The reader sees one η serve two curvatures: the stiff mode caps η, the flat mode sets the pace, and the condition number κ = λmax/λmin decides how bad the compromise is.

## What it rebuilds

- **L4 p.50** ("Descents are uncoupled") and **L4 pp.51–52 / L5 p.7** (the vector update with one η; "η < 2 min η_i,opt"): with rotation 0, A = diag(λ1, λ2) and each coordinate is its own parabola (der-2-5-3).
- **L4 p.53** ("Dependence on learning rate"): five contour plots on [−20, 20]² with trajectories from about (−15, 15) for η = 0.75, 1, 1.5, 2, 2.1 × η2,opt with η1,opt = 1, η2,opt = 0.33. The five preset buttons set η = m/λmax for those multiples, and the "Compare the five step sizes" toggle draws all five side by side with ρ and the steps to 1/1000. The slide draws the stiff coordinate horizontally; the lesson's embedding (λ1 = 1, λ2 = 3) puts it on θ2, matching the lesson's table (θ1 has a = 1), so the zigzag here is vertical.
- **L5 pp.8–9**: "the optimal step size is inversely proportional to the eigenvalues of the Hessian" and "convergence is particularly slow if max η_i,opt / min η_i,opt is large": the rotation slider shows that only the eigenbasis matters (der-2-5-4), and the readouts give κ, η* = 2/(λmax + λmin), and ρ(η*) = (κ − 1)/(κ + 1) (der-2-5-5).
- Course-map widget ideas L4 #8 ("GD on a 2-D elliptical bowl … reproduce slide 53's five panels … toggle rotate") and L5 #1 ("Eigen-basis GD visualizer"); VISION.md §9.3 row `gd-2d-eigen`.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- A = λ1 q1q1ᵀ + λ2 q2q2ᵀ with q1 = (cos φ, sin φ), q2 = (−sin φ, cos φ) (spectral theorem, der-2-5-4 step 4). The minimizer is θ* = 0, so the error is θ.
- θ(t+1) = θ(t) − ηAθ(t); in eigen-coordinates v = Qᵀθ each mode is multiplied by 1 − ηλi (der-2-5-4 step 6), at any rotation. Tested for φ ∈ {0°, 30°, −60°}.
- κ = λmax/λmin; stability iff 0 < η < 2/λmax (eq. 2.5.2); ρ(η) = maxᵢ|1 − ηλi|; η* = 2/(λmax + λmin) with ρ(η*) = (κ − 1)/(κ + 1); steps to shrink by ε ≈ ln ε / ln ρ. The tests reproduce the lesson's table for L4 p.53 (worst factors 0.75, 0.667, 0.5, 1, 1.1; 1.5/λmax is fastest) and its "κ = 100 needs about 690 steps for a millionfold" figure.
- Level sets ½θᵀAθ = c are ellipses with semi-axes √(2c/λi) along qi; the plane draws the five through and around θ(0).

## What the reader sees

- **Plane** (Mafs, [−20, 20]², `preserveAspectRatio="contain"`): level sets (`--viz-2`), the iterates (`--field-calculus`), the draggable start θ(0) (keyboard: Tab to it, arrow keys move it in 0.5 steps; 44 px hit area), and with `showModes` the eigen-axes q1 (`--viz-1`) and q2 (`--viz-5`) labelled with their λ.
- **Panel**: η slider; presets 0.75, 1, 1.5, 2, 2.1 × 1/λmax and η*; Play / Step / Show all; κ, 2/λmax, η*, ρ(η), ρ(η*); a verdict (steps to 1/1000 of ‖θ(0)‖, never settles, or diverges).
- **Modes** (`showModes`): a table of λi, ηi,opt = 1/λi, 1 − ηλi, and the behavior per mode; the per-mode errors |vi(t)| on a log scale (mode 1 solid with dots, mode 2 dashed with squares, so color is not the only cue).
- **Five rates** (`showFive`): five small plain-SVG panels with ρ and steps for each multiple.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `lambda1`, `lambda2` | number | 0.1–5 | 1, 3 | eigenvalues along q1, q2 |
| `rotation` | number | −90–90 | 0 | φ in degrees |
| `eta` | number | 0–2 | 0.25 | step size |
| `start` | `[number, number]` | each −20–20 | [−15, 15] | θ(0), as on L4 p.53 |
| `steps` | int | 1–100 | 25 | iterates drawn |
| `showModes` | boolean | | true | eigen-axes, table, per-mode chart |
| `showFive` | boolean | | false | L4 p.53 small multiples |

Lesson 2.5 passes `lambda1={1} lambda2={3} rotation={0} eta={0.25} start={[-15, 15]} showModes` and asks the reader to reproduce L4 p.53 and then rotate by 30°: the per-mode factors in the table do not change.

## Motion, figure state, fallback

- All iterates are drawn at once; **Play** reveals one per 300 ms, **Step** one per press; reduced motion makes Play show everything at once.
- `figureState`: any valid param keys are applied (`useFigureStateParams`).
- `fallback.ts` draws the level sets and the path as token-colored SVG.
- Styles: `styles.css` in this folder (prefix `g2e-`).
