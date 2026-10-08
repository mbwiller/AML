# bow-vectorizer

**Lesson 6.2 (Text as features).** `fit` a vocabulary on a seeded sample of NOTES reports, then `transform` a report you type or pick. The widget shows the report's tokens and what happens to each (kept with a column, stemmed to a root, removed as a stop word, or dropped because the training reports never contained it); the resulting sparse vector over the fitted vocabulary, as a strip over all |V| columns and as the list of nonzero entries (column, word, value), in binary or count mode; the number of nonzeros and the sum of the entries; and the vocabulary size before and after stop-word removal and stemming. When stop-word removal deletes a negation it says so ("no prior chemotherapy" and "prior chemotherapy" become the same vector, the lesson's pitfall).

## What it rebuilds

- **L9 p.12** (`docs/course-map/04-lectures-L8-L10.md`): the bag-of-words map φ(x) ∈ {0,1}^|V|, φ(x)_j = 1 if x contains word j; the strip is that column laid on its side.
- **L9 pp.13–15**: `CountVectorizer(binary=True)`, `fit_transform` learning the vocabulary from the training documents, and `vocabulary_` giving a word's column (the "column j" in the entries table; the "Fitted vocabulary" list is `vocabulary_` in column order).
- **L9 p.16**: counts instead of presence, stemming ("slowly", "slowness" → "slow"), and stop-word filtering ("the", "a", "and").
- Lesson 6.2's "Fit on training text, transform everything else": a word outside the fitted vocabulary has no column and `transform` drops it silently. The widget lists those words instead of dropping them silently.
- The course map's L9 widget idea 1, "BoW vectorizer: type a sentence, see the sparse 0/1 vector against a small vocabulary (p.12–15)".

## The math it depends on (`math.ts`, tested in `math.test.ts`)

- **Tokenizer.** scikit-learn's default `token_pattern` `(?u)\b\w\w+\b` after lowercasing: runs of two or more word characters, so punctuation and one-character words such as "a" never become tokens (the lesson states this). The test checks that on 300 NOTES reports the tokens agree with the dataset's own `tokenize` and `bagOfWords` once one-letter words are set aside.
- **Stop words.** A 144-word subset of scikit-learn's `ENGLISH_STOP_WORDS` (318 words) covering the function words in NOTES and common English. Like every standard list it contains "no", "not", "nor", "never", and "without"; the test shows "no prior chemotherapy" and "prior chemotherapy" become identical vectors.
- **Stemmer.** A tiny deterministic suffix stripper, **not** the Porter stemmer. In order, the first rule that leaves at least three letters: `-ness(es)` → "" (then `i` → `y`); `-ingly`, `-edly`, `-ly` → ""; `-ing`, `-ed` → "", then undouble a final double consonant or restore `e` after a three-letter consonant–vowel–consonant remainder; `-ies` → `y`; `-es` → "" after ss, x, zz, ch, sh; `-s` → "" unless the word ends in ss, us, or is. It maps slowly, slowness → slow; reports, reported, reporting → report; noted, notes → note; doses, dosing → dose; dizziness → dizzy. Where it differs from Porter: Porter maps increase, increases, increased all to "increas", this one gives increase, increase, increas; Porter has measure conditions and five steps. 24 cases are pinned in the test.
- **Order.** Stop-word removal on the raw token, then stemming (the order of the spam exercise, tasks 22–24).
- **fit.** The vocabulary is every distinct processed term of the training reports, sorted (CountVectorizer sorts too), with `index` playing the role of `vocabulary_`. The "before" size is the same fit with no preprocessing; the test checks raw ≥ stop words removed ≥ also stemmed at the defaults (strictly).
- **transform.** Counts c_j(x) or, with `binary`, min(c_j(x), 1); terms with no column are listed as dropped. The entries are sorted by column (the CSR row). The test checks that in count mode the entries sum to the kept tokens that have a column, in binary mode to the number of distinct such terms, and that repeating a word changes only its own entry, only in count mode.

## Data (`data.ts`, `pipeline.ts`)

NOTES (`src/lib/datasets/notes.ts`; 6,000 reports over a 2,000-word vocabulary). The widget does **not** import `src/data/notes.json` (about 320 KB gzipped). It regenerates the rows once, on first use, with the case's own `generate()` (about 10 ms), which is exactly what `pnpm gen:datasets` wrote and `pnpm check:datasets` verifies; the test checks several rows against the committed JSON. Report text is the dataset's `noteText` rendering. The training sample is the first `trainSize` reports of a seeded permutation (Fisher–Yates with the datasets' RNG); the default report is the `report`-th from the end of the same permutation, so it is never a training report. bow-nb-scorer's `data.ts` imports `notes.json`, so this widget imports the same helpers (`noteText`, `VOCABULARY_SIZE`, and in the test `tokenize`, `bagOfWords`, `VOCABULARY`) from `src/lib/datasets/` directly; bow-nb-scorer's `splitWords` maps straight to the fixed 2,000-word index and discards the strings, which this widget needs for stop words, stems, and dropped words.

## Params

| Param | Type | Range | Default | Note |
|---|---|---|---|---|
| `dataset` | enum | `notes` | `notes` | lesson 6.2 passes it |
| `binary` | boolean | | true | lesson 6.2 passes `true` |
| `removeStopWords` | boolean | | false | lesson 6.2 passes `false` |
| `stem` | boolean | | false | lesson 6.2 passes `false` |
| `trainSize` | int | 5–200 | 20 | reports the vocabulary is fitted on |
| `seed` | int | | 5 | training sample and default report |
| `report` | int | 0–999 | 0 | which held-out report fills the textbox ("Another held-out report" steps it) |

The typed text is widget state, not a param. A `figureState` object may set any param and, with a `text` key, the textbox.

Challenge (default): "Type a word the training reports never used: which column does it get? Then turn binary off and repeat a word three times, and turn on stop-word removal and stemming to watch |V| shrink." Lesson 6.2 overrides it with its own wording of the first two tasks.

## Rendering

Two columns from 640 px (textbox, held-out report button, token chips on the left; vocabulary sizes, the map typeset with `MathLabel`, the strip, the nonzero entries, dropped words, and the negation notice on the right), one column below; toggles, the training-size slider, and a collapsible fitted vocabulary underneath. Chip states differ by border and decoration as well as color (solid, accent border with "→ root", struck through, dashed). The strip draws one tick per nonzero column in `--viz-2`, height proportional to the value. The root carries `data-binary` and `data-vocab-size` for tests. Styles are in `styles.css` (prefix `bowv-`), imported by `Widget.tsx`. The static fallback (`fallback.ts`) draws the strip and the first nonzero entries for the default report.
