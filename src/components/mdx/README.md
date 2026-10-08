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
| `Derivation` | `id`, `title`, `goalTex`, `resultTex`, `source?` | `<section id class="derivation" data-derivation data-step-count tabindex="-1">`: label + `h3`, goal banner, control bar, chunks, control bar, boxed result with chip (`data-derivation-goal`, `data-derivation-result`, `data-flashcard-source`); step counter reset here; the slot is post-processed by `numberDerivationSteps` so each step gets `id="<id>-step-<n>"`. **Step engine** (vanilla module script, see below) | faded-example and "which step is wrong" variants |
| `Chunk` | `title` | `<div class="chunk" data-chunk [data-state=done\|current\|upcoming] [aria-current=step]>` with an `h4` (marker + sentence-case title + visually hidden state text) and `<ol class="steps">`; the engine sets the state | — |
| `Step` | `justification?`, `sticky?`, `fadeable?`, `figureState?` | `<li class="step" id="<derivation>-step-<n>" data-step data-n [data-fadeable] [data-figure-state] [data-sticky] [hidden] [data-revealed]>`: copy-link anchor (`a.step-link[data-step-link]`), math column + justification (Inter 14px, beside on ≥1024px) + "see: term" chip. A lone `$$…$$` that MDX parsed inline is promoted to display math. `.is-entering` animates the reveal, `.is-target` is the deep-link highlight | fading, sticky popover |
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
| `Sticky` | `id`, `first?` (from `[[term]]`, never hand-written) | `<span class="sticky [sticky-first]" data-sticky="<id>" data-field="<field>" role="button" tabindex="0" aria-haspopup="dialog" aria-expanded>`: dotted 1px underline in the field color (2px on first use), text stays `--fg`; plus one `<template data-sticky-card="<id>">` per term per page (`StickyCard`). Unknown ids render a muted "no entry yet" card; the build never fails | done (M1): see "Sticky notes" below |

Internal (not in the registry): `ResultBox`, `Section`, `Label`, `Chip`, `SourceChip`, `DerivationControls`, `StickyCard`.

## Derivation step engine

`Derivation.astro` carries one bundled `<script>` module (≈2.7 KB gzipped, no React: lesson pages stay under the 60 KB budget of STYLE_GUIDE §8; this is a deliberate departure from the React-island sketch in `docs/reference/tech-stack.md` §2) over the pure, Vitest-covered state in `src/lib/derivation-state.ts` (`nextState(state, action)`, `initialState`, `chunkStates`, `parseStepHash`, `stepId`, `storageKey`). One listener set per page drives every `section[data-derivation]`.

- **Progressive enhancement.** Without JS every step is visible and the control bars are hidden by CSS. A one-line inline script marks the section `data-enhanced` at parse time (so only the first step shows before the module runs); the module then sets `data-ready` and owns `hidden` / `data-revealed` on each `li[data-step]`. Hidden steps carry the `hidden` attribute, so screen readers skip them.
- **Controls.** `DerivationControls` under the goal banner and again under the last chunk: Next step · Reveal all · Reset · "3 of 12" (the top count is `aria-live="polite"`; the bottom copy is `aria-hidden`) · one numbered button per step (a hidden number reveals through it; a shown number scrolls to it) · key hints on pointer devices ≥1024px. Next/Reveal all use `aria-disabled` at the end so focus is not lost.
- **Keyboard** while the derivation holds focus or is under the pointer: `→` / Space next, `←` hide last, `a` reveal all, `r` reset. Ignored while typing in an input, textarea, select, or contenteditable, with a modifier held, or when Space lands on a button. A keyboard reveal moves focus to the new step (`tabindex="-1"`).
- **Motion.** A revealed step slides in from the margin by 8px and fades over `--duration-reveal` with `--ease-standard` (`.is-entering`, CSS keyframes in `Step.astro`); none under `prefers-reduced-motion`.
- **Fragments.** Steps are numbered 1…n across chunks server-side (`src/lib/markdown/derivation-steps.ts`) and the CSS counter counts the same elements, so `#<id>-step-<n>` is the visible number. Loading or `hashchange` to such a fragment reveals exactly steps 1…n, scrolls there, focuses it, and highlights it with `--math-hl` for 1.6 s (`.is-target`). The per-step link icon copies the absolute URL (clipboard; falls back to plain navigation) and sets the fragment with `history.replaceState`.
- **Persistence.** `localStorage['aml-derivation:<id>']` = revealed count, written on every user action; Reset removes it; reads and writes are wrapped in `try`/`catch`. A URL fragment wins over the stored count.
- **Where we are.** Each `[data-chunk]` gets `data-state` done / current / upcoming (current = the chunk holding the last revealed step), a glyph marker (✓ ▸ ○), `aria-current="step"` on the current chunk, and visually hidden "(done)" / "(upcoming)" text.
- **`aml:figure-state` event contract** (`src/lib/figure-state.ts`). When a step with `data-figure-state` becomes revealed, the engine parses it (`parseFigureState`: a JSON object, else ignored) and dispatches `new CustomEvent('aml:figure-state', { bubbles: true, detail: { derivation: '<derivation id>', step: <1-based n>, state: <object> } })` on the `section[data-derivation]`, then the same event on the nearest *preceding* `figure[data-widget]` in document order (`findWidgetHost`; a following widget is not driven). On first paint every revealed step's state is dispatched in order; on hiding steps, the latest still-visible step with a state is re-dispatched so the widget rolls back. Widget hosts (M1 item 9) listen on their own `figure`; `document`-level listeners receive it once per target.


## Sticky notes (M1)

The popover is **not** the Base UI React island that `docs/reference/tech-stack.md` §3 proposed. A lesson has dozens of `[[term]]` uses and must ship no React runtime (STYLE_GUIDE §8: ≤60 KB gzipped JS per lesson page), so the card is a vanilla, event-delegated controller: `src/components/shell/sticky-controller.ts`, mounted once per page by `src/components/shell/StickyController.astro` from `Base.astro` (about 1.7 KB gzipped). Styles are global in `src/styles/sticky.css` and `src/styles/fields.css` (`[data-field]` → `--field-color`).

Build time: `StickyCard.astro` resolves the glossary entry (`glossaryEntry(id)` in `src/lib/site.ts`, then `render()`) and emits the card body once per page per term into `<template data-sticky-card="<id>">`, deduplicated through `Astro.locals.stickyCards` (typed in `src/env.d.ts`). A term used twenty times costs one copy. The card holds the term, its aliases, a field chip, the rendered body (KaTeX HTML and `sym-*` classes inherit the page's global CSS), and an "Open in glossary" link to `/glossary#<id>`.

DOM contract, for anything that wants a sticky (prerequisite chips in `Lesson.astro` already use it; a derivation step's "see: term" chip or a widget label can too):

- **Trigger:** any element with `data-sticky="<glossary id>"`; add `data-field="<field>"` for the color, make it focusable, and give it `aria-haspopup="dialog"` and `aria-expanded="false"`. A link trigger keeps its `href` as the no-JS fallback; the controller prevents navigation. The controller sets `aria-expanded` and `aria-controls="sticky-popover"` while open.
- **Card:** a `<template data-sticky-card="<id>">` anywhere on the page, normally from `<StickyCard id />`. Its `[data-sticky-title]` labels the dialog. A trigger with no template gets a runtime "no glossary entry on this page yet" card.
- **Host:** one `<div id="sticky-popover" class="sticky-popover" role="dialog" aria-labelledby="sticky-popover-title">` appended to `<body>`, `position: fixed`, placed by `placePopover` in `src/lib/popover.ts` (below, flipping above, clamped to the viewport); `data-open` while visible, `data-side="below|above"`, `data-field` copied from the trigger.
- **Behaviour:** hover-intent open after 300 ms on mouse/pen (stays open while the pointer is on the trigger or in the card, closes 150 ms after leaving); click or tap toggles and pins; outside pointerdown closes; Enter/Space toggles; Escape closes and returns focus; Tab from an open trigger moves into the card's links, Tab past the last (or Shift+Tab before the first) closes it and continues from the trigger. Opens with a 120 ms fade; instant under `prefers-reduced-motion`.
- **Events:** bubbling `CustomEvent`s on the trigger, `sticky:open` and `sticky:close`, with `detail: { id }`.

Tests: `src/lib/glossary.test.ts` (grouping, filtering, used-by, placement) and `tests/e2e/sticky.spec.ts` (hover, Escape, keyboard, phone tap, one template per term, screenshots in both themes).

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
