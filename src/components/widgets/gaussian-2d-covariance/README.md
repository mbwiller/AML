# gaussian-2d-covariance

**Lesson 7.1 (The multivariate Gaussian and covariance).** Sliders for σx, σy, and ρ; a seeded scatter from N(0, Σ); the 1σ and 2σ level sets; the eigenvectors of Σ scaled by √λ; the matrix Σ, its eigenvalues, and its determinant typeset live beside the plot.

## What it rebuilds

- **L10 p.12** (`docs/course-map/04-lectures-L8-L10.md`): the 2-D scatter of samples from N(u, Σ) with its covariance ellipse. The slide states N(u, Σ) without a density; the widget shows what Σ does to the cloud.
- **L10 p.14**, the covariance quartet on [−10, 10]²: positively correlated (ρ > 0), negatively correlated (ρ < 0), isotropic (σx ≈ σy, ρ = 0), vertically elongated (σy > σx). Lesson 7.1 embeds it with σx = σy = 2, ρ = 0.75 (its Σ_A) and asks the reader to reproduce the other three.
- The L10 widget idea "Covariance playground: sliders for σx, σy, ρ; live scatter + ellipse + the matrix" (course map, L10 widget ideas).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- Σ = [[σx², ρσxσy], [ρσxσy, σy²]]; det Σ = σx²σy²(1 − ρ²) (der-7-1-1 in lesson 7.1).
- Eigen-decomposition of a symmetric 2×2 matrix in closed form, λ = tr/2 ± √(((a − c)/2)² + b²), with orthonormal eigenvectors; v1 is kept in the right half-plane so the arrow does not flip as ρ crosses 0.
- Level sets {x : xᵀΣ⁻¹x = r²} are ellipses with semi-axes r√λ along the eigenvectors (der-7-1-4); the widget draws r = 1 and r = 2, and the eigenvector arrows have length √λ, so they end on the 1σ ellipse.
- Sampling by Cholesky: x = Lz with L = [[σx, 0], [ρσy, σy√(1 − ρ²)]] and z ~ N(0, I); standard normals come from d3-random's seeded LCG, drawn once per (n, seed) and re-transformed when Σ changes.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `sigmaX`, `sigmaY` | number | 0.2–3 | 1 | standard deviations |
| `rho` | number | −0.95–0.95 | 0.6 | correlation; ±1 excluded so Σ stays positive definite |
| `n` | int | 0–400 | 200 | sampled points |
| `seed` | int | | 7 | sampler seed |
| `showEigenvectors` | boolean | | true | |
| `showMatrix` | boolean | | true | Σ, λ1, λ2, det Σ panel |
| `showSamples` | boolean | | true | lesson 7.1 passes this explicitly |

Challenge (default): "Make the ellipse a circle without touching ρ. Then make it collapse to a line." (A circle needs ρ = 0 *and* σx = σy, so with ρ = 0.6 it is impossible: the point of the first half. The second half is ρ → ±0.95 with the determinant readout going to 0.)

## Rendering

Mafs (`<Mafs>`, `Coordinates.Cartesian`, `<Ellipse>`, `<Vector>`) on a fixed window [−7, 7]², `preserveAspectRatio="contain"` so a circle looks like a circle at any width. The scatter is one `<g data-layer="scatter">` of circles in pixel space (via `useTransformContext`), which is cheaper than 400 `<Point>`s. Colors: samples `--viz-1` at 50%, level sets `--viz-2`, eigenvectors `--viz-4`, all via `useVizTheme()`. The matrix uses `MathLabel` with the shared macros and `\htmlClass{sym-sigma}{\Sigma}`. Controls stack under the plot below 640 px. The static fallback (`fallback.ts`) draws the same picture as plain SVG for no-JS, print, and pre-hydration.
