# hessian-classifier

**Lesson 2.3 (Gradients and optimality).** Level sets of the quadratic f(x) = ½xᵀHx around its critical point x = 0, with H = QΛQᵀ built from the reader's eigenvalues λ₁, λ₂ and rotation (Q = [q₁ q₂] the rotation by that angle); the eigenvectors q₁, q₂ drawn with their eigenvalues; the second-order test's verdict (minimum, maximum, saddle, or degenerate) from the signs of the eigenvalues of H; the matrix H, its eigenvalues recomputed from the matrix, and det H typeset live; and the 1-D slices t ↦ f(t q₁), f(t q₂) through the critical point. A "term beyond second order" choice adds +¼z⁴, −¼z⁴, or ⅓z³ along the flatter eigenvector (z = qᵀx for the eigenvalue of smallest magnitude). That term has zero Hessian at 0, so the verdict never changes, but the second line ("This f has …") reports what the critical point of the actual function is, which is how the reader answers the lesson's challenge for a singular H.

## What it rebuilds

- **L4 p.30** (`docs/course-map/02-lectures-L4-L5.md`, Lecture 4): "positive definite (eigenvalues positive) → local minimum; negative definite (eigenvalues negative) → local maximum", stated without proof. Lesson 2.3 proves it (der-2-3-6, der-2-3-7); the widget shows both cases.
- **L4 pp.27–28**: the 1-D second-derivative test and the critical point that is neither (inflection point). The slices panel is the 1-D picture along each eigenvector, where the slope of the slice is 0 and its curvature is λ_k.
- **L5 p.13**: saddle points named. The slides never state the indefinite case; der-2-3-7 derives it and the widget draws the f = 0 level set (the two lines through the saddle) in bold.
- The lesson's paragraph after der-2-3-7 (θ⁴, −θ⁴, θ³ all have f′(0) = f″(0) = 0): the higher-order terms are exactly those three, placed along the zero-eigenvalue direction.
- The course map's L4 widget idea 6 ("Hessian classifier: drag eigenvalues; render the quadratic surface and label min/max/saddle") and the VISION §9.3 P1 row. We draw level sets and slices instead of a 3-D surface (no three.js; the chunk stays small).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- H = Q diag(λ₁, λ₂) Qᵀ with Q = [[cos r, −sin r], [sin r, cos r]]: H₁₁ = λ₁cos²r + λ₂sin²r, H₁₂ = (λ₁ − λ₂) cos r sin r, H₂₂ = λ₁sin²r + λ₂cos²r. The eigen-decomposition of H is recomputed with `eigenSymmetric2` from `gaussian-2d-covariance/math.ts` (imported, not duplicated); the test checks it recovers {λ₁, λ₂}, Hv = λv, tr H = λ₁ + λ₂, and det H = λ₁λ₂.
- The test (der-2-3-6, der-2-3-7): all eigenvalues > 0 ⇒ strict local minimum; all < 0 ⇒ strict local maximum; some > 0 and some < 0 ⇒ saddle; an eigenvalue equal to 0 with the others of one sign ⇒ degenerate (the test is silent). |λ| ≤ 10⁻⁹ counts as 0. The Vitest covers all eleven sign patterns of two eigenvalues (both orders, with zeros), at four rotations each, through the assembled H; and that a zero alongside both signs is still a saddle.
- Along an eigenvector, f(t q_k) = ½λ_k t² (der-2-3-6 step 3, z = Qᵀv), checked in the test.
- The actual critical point with a higher-order term c·zᵖ along the flat eigenvector (`actualKind`): a decisive test is never overturned (the quadratic term beats any o(‖v‖²) remainder, der-2-3-6 step 7). When λ_flat = 0 and the other eigenvalue is λ_o: no term gives a non-strict minimum (λ_o > 0), a non-strict maximum (λ_o < 0), or a constant f (λ_o = 0); +¼z⁴ gives a strict minimum if λ_o > 0 and a saddle if λ_o < 0; −¼z⁴ the mirror image; ⅓z³ always a saddle (def-2-3-7: neither a minimum nor a maximum). The test checks every case against a brute-force sample of f on small circles around 0.
- Level sets: marching squares (`zeroContour` from `gda-fitter/math.ts`, imported) on a 96 × 96 grid for f = 0 and f = ±½s(k r₀)², k = 1…5, s = max(|λ₁|, |λ₂|, 0.5), r₀ = 3/5.5, so a definite quadratic's rings are evenly spaced along its stiffest axis. Degenerate one-node loops (the minimum itself) are dropped. The test checks the contour points satisfy f ≈ c and that a saddle has a zero level set.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `eigenvalues` | `[number, number]` | each −3 to 3 | `[2, 0.5]` | λ₁, λ₂; sliders in steps of 0.1, so 0 is reachable exactly |
| `rotation` | number | −90 to 90 | 0 | degrees from the θ₁ axis to q₁ |
| `showLevelSets` | boolean | | true | f > 0 solid, f < 0 dashed, f = 0 bold |
| `showEigenvectors` | boolean | | true | q₁, q₂ with their eigenvalues and eigen-axes |
| `higherOrder` | `'none' \| 'quartic' \| 'negQuartic' \| 'cubic'` | | `'none'` | +¼z⁴, −¼z⁴, ⅓z³ along the flatter eigenvector |

Lesson 2.3 passes `eigenvalues={[2, -1]} rotation={30} showLevelSets={true}` (a saddle). `figureState` from a `<Step figureState>` may set any subset of the params (validated with the manifest schema's `.partial()`), for example `{"eigenvalues": [2, 0], "higherOrder": "cubic"}`.

Notation: the lesson writes the spectral decomposition as H = QΛQᵀ (der-2-3-6 step 3), so the widget does too; "R" in the task brief is this Q.

Challenge (default): "Make the critical point a minimum, then a maximum, then a saddle. Then set one eigenvalue to 0 and try the higher-order terms: what does the Hessian alone fail to tell you?"

## Rendering and access

Mafs (`Coordinates.Cartesian`, `Polyline` for each level-set polyline with `data-level="pos|neg|zero"`, `Vector`, `Line.ThroughPoints` for the eigen-axes, `Text`, `Point`) on the square window ±3 (contours are traced over ±4.8 so a wide container is filled). Level-set sign is carried by line style as well as color (`--viz-2` solid for f > 0, `--viz-6` dashed for f < 0, `--viz-boundary` bold for f = 0); q₁ is `--viz-3`, q₂ `--viz-1`, all via `useVizTheme()`. The verdict is text, with `data-kind` (the test) and `data-actual` (the actual critical point) on the root for tests. The slices panel is plain React SVG with a text summary as its accessible name. Controls are the shared `<Param>` (λ₁, λ₂, rotation), `<Choice>` (higher-order term), and `<Toggle>`s. No animation, so `prefers-reduced-motion` needs no special case. Layout CSS lives in `styles.css` beside the widget (prefix `.hc-`). The static fallback (`fallback.ts`) draws the same level sets and eigenvectors for no-JS, print, and pre-hydration.
