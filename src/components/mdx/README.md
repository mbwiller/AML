# src/components/mdx

The MDX components of the content contract (`docs/CONTENT_AUTHORING.md` §4), provided globally by the lesson layout through `mdxComponents` in `index.ts`. **Lesson files never import anything**; they write the tags and the layout supplies them. `names.ts` is the plain-TS list of names that `validate-content` reads without Astro; `index.ts` must satisfy it.

This is the plain M0 set: structurally correct, token-styled, no interactivity. Markup, ids, class hooks, and `data-*` attributes are stable so M1 can add behaviour without changing lesson files.

Conventions: the twelve anatomy sections are `h2` with fixed ids (`objectives`, `hook`, `intuition`, `connections`, `summary`); Definition, Theorem, Proposition, Lemma, Derivation, Example, and HomeworkBridge titles are `h3` with the box's `id`, so the outline rail is generated from `h2`/`h3`. Numbers come from `id` through `src/lib/markdown/numbering.ts`. Props that may contain `$…$` are rendered at build time by `src/lib/markdown/render-tex.ts` with the shared `katexOptions`. Colors, radii, and type are tokens only (`var(--…)` in scoped styles); callouts and boxes use hairline borders on `--surface`/`--surface-2`; field colors appear only on callout edges and chips.

| Component | Props | Renders | M1 adds |
|---|---|---|---|
| `Frame` | `data`, `model`, `objective`, `optimizer` (strings, may contain `$…$`) | `<dl id="frame">` with four cells: Data, Model class, Objective, Optimizer | the same four cells pinned in the left rail |
| `Objectives` | — | `<section id="objectives"><h2>` + the markdown list | items tick as checks are passed |
| `Hook` | — | `<section id="hook">` lede block with a left hairline, no heading | — |
| `Definition` / `Theorem` / `Proposition` / `Lemma` | `id`, `title`, `source?` | numbered box via `ResultBox` (`def-6-3-1` → "Definition 6.3.1"), `h3` title, slide chip, `data-flashcard-source` | flashcard extraction |
| `Intuition` | — | `<section id="intuition"><h2>` | — |
| `Derivation` | `id`, `title`, `goalTex`, `resultTex`, `source?` | `<section id class="derivation" data-derivation>`: label + `h3`, goal banner, chunks, boxed result with chip (`data-derivation-goal`, `data-derivation-result`, `data-flashcard-source`); step counter reset here | step reveal, faded-example and "which step is wrong" variants, `figureState` dispatch |
| `Chunk` | `title` | `<div class="chunk" data-chunk>` with an `h4` (sentence case) and `<ol class="steps">` | chunk outline |
| `Step` | `justification?`, `sticky?`, `fadeable?`, `figureState?` | `<li class="step" data-step [data-fadeable] [data-figure-state] [data-sticky]>`: math column + justification (Inter 14px, beside on ≥1024px) + "see: term" chip. A lone `$$…$$` that MDX parsed inline is promoted to display math | reveal, fading, sticky popover |
| `Proof` | `collapsed?`, `title?`, `keyIdea?` | `<details class="proof" data-proof [open]>`; summary "Proof · title" with the key idea always visible | restyled marker only |
| `EqRef` | `id` | `<a href="#eq-6-3-1" class="eqref">(6.3.1)</a>` | hover preview |
| `Callout` | `type?` (`note` default, `warning`, `slide`, `beyond`), `title?` | `<aside class="callout" data-type>` with icon + label; left edge `--muted` / `--field-calculus` / `--field-statistics` / `--field-linear-algebra` | — |
| `SlideRef` | `lecture`, `pages` | chip `<a class="chip slideref" href="/materials#L7-p47">L7 p.47</a>` (`12-14` → `pp.12–14`) | slide preview |
| `Widget` | `name`, `challenge?`, `…params` | placeholder `<figure class="widget" data-widget data-widget-params>` with the name, challenge, params JSON, 16rem reserved | the React island in `<WidgetFrame>`, manifest validation |
| `Figure` | `src`, `alt`, `caption?`, `source?` | `<figure class="figure">` with plain `<img loading="lazy">` and a figcaption + chip | `astro:assets` |
| `Example` | `case?`, `title?`, `id?` | `<section class="example" id="example-<slug>">` with `h3` "Worked example · title" and a case chip | faded variant |
| `Check` | `ids` | `<section class="check" data-check data-check-ids>` with one `<li data-check-item>` per id, rendered from the quiz bank at build time and graded in the browser by one vanilla controller (see "Check" below) | persistence, shuffling, the remaining item types |
| `Pitfall` | `title`, `misconception?` | `<aside class="pitfall" id="pitfall-<misconception>" data-misconception>`: "Pitfall" label, the false statement as title, the fix as body | — |
| `Connections` | — | `<section id="connections"><h2>` | graph neighborhood |
| `Notebook` | `path`, `cells` | chip "`<basename>` · cells 0–8" → `/materials#notebook-<slug>` | rendered cells with outputs |
| `HomeworkBridge` | `hw`, `skills` | `<section class="homework-bridge" id="homework-hw3">` with `h3` "Readiness gate · HW3", a Skill / Lesson section / Check table (— for now), link to `/homework/hw3` | sections and checks filled from the homework map |
| `Summary` | — | bordered `<section id="summary" data-flashcard-source><h2>Summary card</h2>` | flashcard extraction |
| `Sticky` | `id`, `first?` (from `[[term]]`, never hand-written) | dotted-underlined `<span class="sticky" data-sticky>` with a native tooltip | Base UI popover with the glossary entry |

Internal (not in the registry): `ResultBox`, `Section`, `Label`, `Chip`, `SourceChip`.

## Check

`<Check ids={[…]} />` looks every id up in the `quizzes` collection at build time and renders what the graders in `src/lib/graders/` can grade. Unknown ids and item types without a grader render as muted rows and never fail the build.

| Item type | Renders as | Graded by |
|---|---|---|
| `mc` | fieldset of radios in file order (no shuffling yet; `data-shuffle-seed` is reserved for it) | `gradeMc` |
| `numeric` | text input (decimal, fraction, or scientific notation; `tolerance` is absolute) with a format hint; seeded items get a "New numbers" button that resamples `seeded` through `sampleSeededParams` and shows the new values under the prompt as `name = value` | `gradeNumeric` |
| `which-step` | radios over the derivation's steps, read from the lesson body that defines `derivation` with `extractDerivationSteps`, one step replaced by `corrupt.replaceTex` | `gradeWhichStep` |
| `match`, `order`, `predict`, `estimate`, `code-trace` | muted row ("arrive with the practice engine") | — |

Prompts, options, explanations, and step TeX go through `renderInlineTex` / `renderDisplayTex` at build time; the browser never loads KaTeX for a check.

DOM contract (stable; the practice engine builds on it rather than replacing it):

- `section.check[data-check][data-check-ids="a,b"]` wraps `ol.check-items`.
- `li.check-item[data-check-item=<id>][data-check-type=mc|numeric|which-step][data-check-state=idle|correct|incorrect|invalid][data-item=<json>][data-shuffle-seed=<n>][data-check-targets="der-…-step-3,der-…"]`. Unsupported rows carry `data-check-supported="false"` and no `data-item`.
- `data-item` is the trimmed client copy the grader needs: mc `{ type, options: [{ correct?, misconception? }] }`; numeric `{ type, answer, tolerance, seeded?, formula? }`; which-step `{ type, corrupt: { step } }`. Explanations are pre-rendered in the DOM, not shipped as JSON.
- Inside the `form[data-check-form]`: `p.check-prompt#check-<id>-prompt`; radios named `check-<id>` with `value` = 0-based index, or `input[name="answer"]#check-<id>-input` (`aria-describedby` the hint and the feedback); `button[data-check-action=grade|reset|resample]` with accessible names "Check answer to question n", "Try question n again", "New numbers for question n".
- `div[data-check-feedback][role=status]` holds the verdict (`[data-check-verdict]`, icon plus text), `[data-check-explanation]`, optional `[data-check-option-explanation=<index>]`, and two links the controller reveals on a wrong answer: `[data-check-pitfall-link]` → `#pitfall-<misconception>` when that `<Pitfall>` is on the page, `[data-check-derivation-link]` → the first of `data-check-targets` that exists on the page (`der-x-y-z-step-n` ids come from the derivation engine; `der-x-y-z` is the fallback).
- Seeded numeric items publish the current parameters as `data-check-params=<json>` on the `li` after "New numbers"; `p[data-check-params]` shows them.
- Every grade dispatches a bubbling `check:graded` CustomEvent on the `li` with `detail: { id, type, correct }`. State is in memory only.

Smoke page: `/dev/components-smoke` (`src/pages/dev/components-smoke.astro` + `_components-smoke.mdx`) renders the §11 skeleton and one of every other component. The real kitchen-sink page is `/dev/kitchen-sink`.
