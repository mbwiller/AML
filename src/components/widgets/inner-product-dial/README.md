# inner-product-dial

**Lesson 2.3 (Gradients and optimality).** A fixed gradient g = ∇f(θ) drawn at true scale; a unit step u = (cos ϑ, sin ϑ) the reader turns, by dragging the handle on a dial (the circle of radius max(‖g‖, 1)), by the dial's own keyboard keys, by clicking anywhere on the plane, or with the ϑ slider; the projection of g on u, a bar along u of signed length gᵀu (green when positive, rose when negative, with the dashed perpendicular from g's tip); the dashed level line through θ perpendicular to g and the shaded half-plane of descent directions {u : gᵀu < 0}; the steepest-descent direction −g/‖g‖ as a short arrow and a diamond on the dial; and the rate gᵀu plotted against ϑ ∈ [0°, 360°] with the descent band shaded and a marker at the current ϑ. Readouts give g, ‖g‖, u, ϑ, the angle φ between u and g, D_u f(θ) = gᵀu, ‖g‖ cos φ (the same number, computed the other way), −g/‖g‖, and a one-line verdict (ascent, descent, level, or critical point when g = 0).

## What it rebuilds

- **L4 pp.16–17** (`docs/course-map/02-lectures-L4-L5.md`, Lecture 4, "A well-known vector property"): the left figure (a unit circle with two vectors A and B and their inner product) and the right figure ("Inner Product" against "Angle (degrees)" from 0 to 360, a cosine from 1 to −1 and back). Slide 17 relabels A = ∇f, B = Δx and concludes "the gradient is the direction of fastest increase". Here A is g, B is u, and the curve is the slide's curve with amplitude ‖g‖, plotted against the direction ϑ of u (so its peak sits at the direction of g instead of at 0°; φ is shown in the readout).
- **L4 p.37**: move opposite the gradient. The widget marks −g/‖g‖.
- The course map's L4 widget idea 3 ("Inner-product dial: fixed gradient vector, draggable unit Δx; live readout of ⟨∇f, Δx⟩ and the cosine plot from slide 16 with a moving marker") and the VISION §9.3 P1 row.

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- def-2-3-4 and der-2-3-1: for a unit u, D_u f(θ) = ∇f(θ)ᵀu. With g = ∇f(θ) and u = (cos ϑ, sin ϑ), the rate is g₁ cos ϑ + g₂ sin ϑ.
- der-2-3-2 (Cauchy–Schwarz) and der-2-3-3: gᵀu = ‖g‖‖u‖ cos φ = ‖g‖ cos φ, so the rate lies in [−‖g‖, ‖g‖], with the maximum only at u = g/‖g‖ and the minimum only at u = −g/‖g‖ (thm-2-3-2). The test checks the identity on 500 seeded random (g, u) pairs, the Cauchy–Schwarz bound, the extremes and their directions, and that the zeros sit at ϑ_g ± 90°.
- Descent directions: {u : gᵀu < 0} is an open half of the unit circle, the ϑ-interval (ϑ_g + 90°, ϑ_g + 270°) mod 360°. The plane's shaded region is the half-plane {x : gᵀx ≤ 0} clipped to a box by one Sutherland–Hodgman pass; the test checks its area is half the box and every vertex satisfies gᵀx ≤ 0.
- g = 0: every rate is 0, φ is undefined, there is no steepest direction, and the verdict reads "critical point" (thm-2-3-3's first-order condition, from the other side).

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `gradient` | `[number, number]` | each −5 to 5 | `[3, 4]` | g = ∇f(θ); sliders in steps of 0.5 |
| `angle` | number | 0 to 360 | 120 | ϑ, the direction of u in degrees; the slider runs 0 to 359 in steps of 1 |
| `showCosineCurve` | boolean | | true | the rate against ϑ (L4 p.16, right) |
| `showHalfSpace` | boolean | | true | shade the descent half-plane and the descent band on the curve |

Lesson 2.3 passes `gradient={[3, 4]} showCosineCurve={true} showHalfSpace={true}`. The default ϑ = 120° keeps u off the axes and the projection at the lesson's load. `figureState` from a `<Step figureState>` may set any subset of the params (validated with the manifest schema's `.partial()`), for example `{"angle": 233}` to show steepest descent for g = (3, 4).

Challenge (default): "Turn the unit step u all the way around. Where is the slope largest, where is it most negative, and where is it zero?"

## Rendering and access

Mafs (`Coordinates.Cartesian`, `Polygon`, `Line.*`, `Vector` for g, `Text`) on a square window whose half-width snaps to 2.5, 4, 6.5, or 9 so it rescales rarely as g changes. Unit-length arrows (u and −g/‖g‖) are drawn in pixel space with small heads, since Mafs' `<Vector>` head is sized for long arrows. The dial handle is a focusable `<g role="slider">` named "Direction of u on the dial" with `aria-valuenow`/`aria-valuetext`; Arrow keys turn u by 1°, Page Up/Down by 15°, Home returns to 0°; pointer drag uses pointer capture on a 44 px hit area (`touch-action: none` on the handle only, so the page still scrolls under a finger elsewhere). The ϑ slider is the shared `<Param>`. Colors via `useVizTheme()`: g `--viz-4`, u `--viz-3`, positive/negative rates `--viz-positive`/`--viz-negative`, the level line `--viz-boundary`; the sign of gᵀu is also carried by the bar's direction, the printed sign, and the verdict text. No animation (the focus ring's 120 ms fade is disabled under `prefers-reduced-motion`). Layout CSS lives in `styles.css` beside the widget (prefix `.ipd-`). The static fallback (`fallback.ts`) draws g, u, the projection, and the half-plane for no-JS, print, and pre-hydration.
