# bow-nb-scorer

**Lesson 6.3 (Naive Bayes).** Type a report; see its bag-of-words vector as chips (words outside the vocabulary are listed muted and ignored); a Bernoulli Naive Bayes fitted on a seeded subsample of the NOTES case votes word by word; the running log posterior odds and P(serious | x) update as you type; a Laplace-smoothing toggle exposes the log 0 = −∞ failure explicitly.

## What it rebuilds

- **L9 p.12** (`docs/course-map/04-lectures-L8-L10.md`): the bag-of-words column φ(x) ∈ {0,1}^|V| (church 0, doctor 1, …). The chips are the ones of that column for the typed report; the "n of 2,000 vocabulary words present" line is its sparsity.
- **L9 pp.35–38**: `psis[k] = X_k.mean(axis=0)`, `phis[k] = X_k.shape[0]/n`, and `nb_predictions` in log space (`logpxy = x*log(psis) + (1-x)*log(1-psis)`, `logpyx = logpxy.sum + logpy`). The slide clips `psis` to `[1e-14, 1 − 1e-14]` "to avoid log(0)"; the widget does not clip, so the −∞ the clip hides is on screen with smoothing off.
- The L9 widget idea in the course map: "Live BoW + NB spam scorer: type an email; show φ(x), per-word contributions log ψ_j1/ψ_j0 (coloured bars), running log-odds, final decision; toggle Laplace smoothing on/off to show the −∞ failure." Laplace smoothing is absent from the slides (course-map gap 4); the lesson's Pitfalls section introduces it, and this widget is its hook figure (`smoothing={false}` in the embedding).

## The math it depends on (`math.ts`, tested in `math.test.ts`)

Notation per STYLE_GUIDE.md §2.1: ψ_jk = P(x_j = 1 | y = k), priors φ_k; arrays are `psi[k][j]`. Class 1 is serious, class 0 non-serious.

- **MLE (L9 pp.30–33):** ψ̂_jk = (number of class-k reports containing word j) / n_k; φ̂_k = n_k / n. `countBernoulliNB` collects the document frequencies in one pass (presence, not multiplicity); `modelFromCounts` turns them into ψ and φ.
- **Laplace smoothing (lesson 6.3 Pitfalls):** ψ̂_jk = (count + 1) / (n_k + 2), the posterior mean under a Beta(1, 1) prior. φ is never smoothed.
- **Query in log space (L9 p.34, p.38):** log P(x, y = k) = log φ_k + Σ_j [x_j log ψ_jk + (1 − x_j) log(1 − ψ_jk)]. The decision is argmax_k; the posterior is σ(log P(x, y=1) − log P(x, y=0)).
- **The ledger:** log P(y=1 | x) / P(y=0 | x) = log φ₁/φ₀ + Σ_{j: x_j = 1} log ψ_j1/ψ_j0 + Σ_{j: x_j = 0} log (1 − ψ_j1)/(1 − ψ_j0). Each bar is one present word's log ψ_j1/ψ_j0; the absent words are summed into one line so the three lines add exactly to the score (`score` returns `priorTerm`, `absentTerm`, `votes`, and the test checks the identity).
- **The −∞ failure:** with smoothing off, a present word with ψ̂_jk = 0 (never in a class-k training report) gives log 0 = −∞ for class k, so that class's likelihood is exactly 0 whatever the other words say; an absent word with ψ̂_jk = 1 does the same through log(1 − ψ̂). `score` reports these as `zeroEvents` and the widget spells each one out. If both classes hit −∞ the posterior is 0/0 and shown as undefined. Branches are added only when selected, so 0 · (−∞) = NaN never arises in the finite case.
- **Fit recovery:** `math.test.ts` fits the full 6,000-report NOTES set and checks ψ̂ against the generative model's Bernoulli presence probabilities (`bernoulliPsi` of `generativeModel.parameters.psi`): mean absolute error < 0.01, maximum < 0.08, and φ̂₁ within 0.02 of 0.3.

## Data (`data.ts`)

NOTES (`src/data/notes.json`, 6,000 reports, classes non-serious / serious, 2,000-word vocabulary). The training subsample is the first `trainSize` rows of the seeded order from `sampleRows` (so a smaller `trainSize` is a prefix of a larger one); counts and models are cached per (trainSize, seed, smoothing). The default report is the `report`-th row from the *end* of the same seeded order, so it is outside the training subsample unless the subsample is everything. "Another report" steps `report`.

`notes.json` is imported directly (not through `loadDataset`) so the chunk carries only this dataset.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | enum | `notes` | `notes` | lesson 6.3 passes this explicitly |
| `smoothing` | boolean | | true | lesson 6.3 embeds with `false` (the hook) |
| `trainSize` | int | 200–6000 | 2000 | seeded training subsample size |
| `seed` | int | | 11 | subsample and default-report seed |
| `maxWords` | int | 3–30 | 12 | bars shown, largest \|vote\| first |
| `report` | int | 0–5999 | 0 | which seeded report fills the textarea |

The typed text is widget state, not a param (a state link restores the params and the seeded report, not free text). A `figureState` object may set any param and, with a `text` key, the textarea.

Challenge (default): "Add one rare word to the report and turn smoothing off. Find a word that makes a whole class impossible; then turn smoothing back on and read that word's vote." At the defaults, "intentional" is in 8 serious and 0 non-serious training reports, and "appetite" the reverse; the Vitest pins these as fixtures for the e2e spec.

## Rendering

Two columns from 640 px (textarea, chips, controls on the left; formula, bars, ledger, failure notice on the right), one column below. Bars are HTML (an `<ol>` with a centred track): serious votes extend right in `--viz-positive`, non-serious votes left in `--viz-negative`, every row also carries the signed number and the word "serious" / "non-serious" so color is never the only signal; infinite votes are full-length and dashed. Bar transitions use the token durations and the global `prefers-reduced-motion` rule. The formula is `MathLabel` with the shared macros and `sym-pos` / `sym-neg` classes. The failure notice is a polite live region. The static fallback (`fallback.ts`) draws the same bars and the score for the default report as plain SVG.

## Size

The chunk is dominated by `notes.json` (about 320 KB gzipped for the 6,000 token sequences), which the `trainSize` range 200–6000 requires in the browser; the code itself is a few KB. This is over the 150 KB guideline of STYLE_GUIDE.md §7 point 6; see the PR description for the options (a generated 2,000-row subsample, or build-time document-frequency tables).
