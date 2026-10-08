# encoding-explorer

**Lesson 1.1 (Components of a learning problem).** One categorical column (the zip codes 10040–10044 by default, or any 2–8 category labels such as ICD-like codes) encoded as an integer code, a standardized code, one-hot, or one-hot with the first column dropped. The widget shows the design matrix X that encoding produces, with or without the intercept column of ones, beside the targets y (one per category, set with sliders) and the least-squares fit ŷ. A readout gives the column count, the rank, whether θ is unique, and whether every target is reproduced. A comparison table answers the lesson's question ("which encodings can fit it exactly?") for every offered encoding at once. With one-hot and an intercept, the reader slides c along the null direction v = (1, −1, …, −1) and sees θ change while ŷ stays put.

## What it rebuilds

- **L2 pp.8–10** (`docs/course-map/01-lectures-L1-L3.md`): the zip-code column 10040, 10041, 10042, 10043, 10044 and the poll "How to represent the 5 zipcodes?" with its options (use as is, standardize, binary vector of length 5). The answer slide (p.10) states one-hot, 10044 ↦ [0, 0, 0, 0, 1], without the reason. The widget shows the reason: the first two options are the `integer` and `standardized` encodings, the third is `one-hot`.
- The course map's L2 widget idea "Encoding explorer: a categorical column (zipcodes); toggle integer-code vs one-hot and watch a linear fit's predictions change", and its "derive, don't state" item 1 (an integer code imposes an arbitrary order and spacing that a linear model exploits).
- Lesson 1.1's der-1-1-1 (steps 1–14): the equal spacing of a numeric code (steps 2–4), standardizing as an affine change (steps 5–6), one-hot reaching any targets (steps 7–10), and the dummy-variable trap and the drop-first fix (steps 11–14).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- **Codes.** `integer`: c_k is the category read as a number when every category is numeric (L2 p.9's "convert to numerical values and use as is"), otherwise its position 0, …, K − 1. `standardized`: z_k = (c_k − m)/s with the population standard deviation (ddof = 0, as sklearn's `StandardScaler`).
- **One-hot.** φ(k)_j = 1[j = k], K columns; `one-hot-drop-first` deletes column 1 (category 1 is the reference), as `pd.get_dummies(drop_first=True)` and `OneHotEncoder(drop="first")`.
- **Design matrix.** X has one row per category, an all-ones first column when `intercept`, then the encoded columns.
- **Rank** by a one-sided Jacobi SVD (Hestenes) with numpy's `matrix_rank` tolerance σ_max · max(n, p) · ε. Jacobi keeps high relative accuracy for the raw codes 10040…10044 beside a column of ones, so the rank (2) is not a rounding accident. With K categories: integer or standardized + intercept: p = 2, rank 2; one-hot without intercept: p = K, rank K; one-hot with intercept: p = K + 1, rank K (the K indicator columns sum to the ones column, step 11); drop-first with intercept: p = K, rank K; drop-first without intercept: p = K − 1, rank K − 1.
- **Fit.** The minimum-norm least-squares θ̂ = V Σ⁺ Uᵀ y (unique when rank = p). "Fits exactly" means max_k |y_k − ŷ_k| ≤ 10⁻⁷ (1 + max |y|).
- **Null direction.** When rank < p, the right singular vector for σ = 0, scaled so its first entry is 1; for one-hot with an intercept this is v = (1, −1, …, −1) (step 12), and every θ̂ + c v has the same predictions. The test checks Xv = 0 and that the predictions are unchanged for several c.
- **What the tests pin.** A ramp is fitted exactly by every encoding with an intercept; a peak at 10042 is reachable only by the one-hot encodings; integer and standardized give identical, equally spaced predictions; drop-first coefficients are the reference value and the differences (step 14); drop-first without an intercept pins the reference category at 0.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `categories` | string[] | 2–8 distinct, ≤12 chars | `["10040", …, "10044"]` | lesson 1.1 passes the five zip codes |
| `encodings` | enum[] | distinct, from `integer`, `standardized`, `one-hot`, `one-hot-drop-first` | all four | the options offered and the rows of the comparison table |
| `encoding` | enum | | `integer` | the one shown in the matrix (falls back to the first offered) |
| `intercept` | boolean | | true | prepend the column of ones |
| `targets` | number[] | ≤8 entries in [0, 10] | `[]` | target per category; missing entries use an even ramp from 2 to 4 |
| `shift` | number | −5–5 | 0 | c in θ̂ + c v (shown only when θ is not unique) |

There is no randomness, so there is no `seed`. A `figureState` object may set any param (it is parsed with the params schema made partial), so a `<Step>` can switch the encoding or the intercept.

Challenge (default): "Make the middle category the highest. Which encodings can still fit every target exactly? Then use one-hot with an intercept and slide c: the coefficients change, the predictions do not." Lesson 1.1 overrides it with its zip-code version.

## Rendering

Controls (a radio group for the encoding, a checkbox for the intercept) on top; then the design-matrix table (intercept column shaded, one-hot ones in bold; a horizontally scrolling container on phones), the column/rank/uniqueness/exact-fit line (also on the root as `data-columns`, `data-rank`, `data-unique`, `data-exact`), the model and θ̂ typeset with `MathLabel` (shared macros, `sym-theta` and `sym-yhat` classes), and a polite live explanation. Beside it, an SVG chart (fitted ŷ as bars in `--viz-2`, targets as rings in `--fg`, ▲ when ŷ leaves [0, 10]) and the comparison table with ✓/✗ and "yes"/"no" so color is never the only signal. Target sliders (`<Param>`, 44 px tall) fill the bottom in an auto-fit grid. Bars and dots tween with the 250 ms token duration; reduced motion turns that off. Styles are in `styles.css` (prefix `encx-`), imported by `Widget.tsx`. The static fallback (`fallback.ts`, sharing the geometry in `chart.ts`) draws the same chart with a one-line summary.
