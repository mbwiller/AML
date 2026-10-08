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
| `Check` | `ids` | placeholder `<section class="check" data-check-ids>` listing the ids | the practice engine renders and grades |
| `Pitfall` | `title`, `misconception?` | `<aside class="pitfall" data-misconception>`: "Pitfall" label, the false statement as title, the fix as body | surfaced from quiz distractors |
| `Connections` | — | `<section id="connections"><h2>` | graph neighborhood |
| `Notebook` | `path`, `cells` | chip "`<basename>` · cells 0–8" → `/materials#notebook-<slug>` | rendered cells with outputs |
| `HomeworkBridge` | `hw`, `skills` | `<section class="homework-bridge" id="homework-hw3">` with `h3` "Readiness gate · HW3", a Skill / Lesson section / Check table (— for now), link to `/homework/hw3` | sections and checks filled from the homework map |
| `Summary` | — | bordered `<section id="summary" data-flashcard-source><h2>Summary card</h2>` | flashcard extraction |
| `Sticky` | `id`, `first?` (from `[[term]]`, never hand-written) | dotted-underlined `<span class="sticky" data-sticky>` with a native tooltip | Base UI popover with the glossary entry |

Internal (not in the registry): `ResultBox`, `Section`, `Label`, `Chip`, `SourceChip`.

Smoke page: `/dev/components-smoke` (`src/pages/dev/components-smoke.astro` + `_components-smoke.mdx`) renders the §11 skeleton and one of every other component. The real kitchen-sink page is `/dev/kitchen-sink`.
