# STYLE GUIDE — AML Atlas

This file is loaded into every Claude Code session on both developers' machines (via `CLAUDE.md`). It is the contract that keeps two parallel, agent-driven workstreams looking and reading like one product. If something here conflicts with `VISION.md`, `VISION.md` §6 (principles) wins and this file gets fixed.

Enforcement: Prettier and ESLint on save and in CI; a `validate-content` script on every build; a Playwright screenshot of the kitchen-sink page (`/dev/kitchen-sink`) that fails CI on visual drift; and the `math-reviewer` and `content-reviewer` agents before any lesson is marked `published`.

---

## 1. Voice and writing

- **Textbook-calm.** No exclamation marks. No hype ("powerful", "elegant", "beautiful" are banned as adjectives for math). Confidence comes from precision.
- **Second person for the reader, first person plural for the work.** "You can now compute…"; "We take logs so that products become sums."
- **One idea per paragraph; one algebraic move per derivation step.** If a paragraph has two "because"s, split it.
- **Define before use.** A symbol or term appears in a `<Definition>` or a `[[sticky-note]]` before it appears in running text. The first use of a glossary term in a lesson is written as `[[term]]`.
- **Say why, then what.** Lead with the question the result answers ("Which θ makes the observed data most probable?") before the result.
- **Headings in sentence case.** "Deriving the normal equations", not "Deriving The Normal Equations".
- **American spelling. Oxford comma. Numerals for all numbers with units or in math; words for small counts in prose ("three assumptions").**
- **No "it can be shown", "clearly", "obviously", "trivially", "left as an exercise".** If it is clear, show it in one line. If it is not, derive it or collapse it.
- **Slide provenance is always cited** with `<SlideRef lecture={7} pages="47" />` on definitions and results, and in the `source` prop of a `<Derivation>`.
- **Slide errors are corrected silently in the main line** and recorded in the lesson's Pitfalls section as a "spot the error" item ("L6 p.11 writes $+\#T/(1-\theta)$; the sign is wrong, here is why").
- **Homework safety (VISION R17).** Never publish a numeric answer specific to a *live* homework's parameters. General results and widgets that let the learner discover the answer are fine.

## 2. Mathematical conventions

### 2.1 Notation (normalized; footnote the slides' variant where they differ)

| Object | We write | Notes |
|---|---|---|
| Dataset | $\mathcal{D} = \{(x^{(i)}, y^{(i)})\}_{i=1}^{n}$ | superscript $(i)$ for examples; slides sometimes write $X_i$, $x_i$, $x(i)$ |
| Dimensions | $n$ examples, $d$ features, $K$ classes, $p$ features after $\phi$ | never $N$ or $m$ |
| Indices | $i$ examples, $j$ features, $k$ classes, $t$ or $(k)$ iterations as $\theta^{(t)}$ | avoid $i$ for features |
| Parameters | $\theta$ (vector), $\theta_j$ (component), $\hat\theta$ (estimate), $\theta^\star$ (optimum) | slides sometimes use $w$, $\mathbf{W}$ |
| Model | $f_\theta(x)$; model class $\mathcal{M}$ | |
| Design matrix | $X \in \mathbb{R}^{n\times d}$, rows $(x^{(i)})^\top$; target vector $y \in \mathbb{R}^n$ | least squares is $\lVert X\theta - y\rVert_2^2$, never $\theta^\top X$ |
| Intercept | absorbed as $x_0 = 1$ unless the lesson says otherwise | |
| Loss / risk | per-example $\ell(\hat y, y)$; empirical risk $\hat R(\theta) = \frac1n \sum_i \ell(f_\theta(x^{(i)}), y^{(i)})$; true risk $R(\theta) = \mathbb{E}_{(X,Y)\sim P}[\ell(f_\theta(X), Y)]$ | the slides' $\mathrm{Loss}$, $\mathrm{Div}$, $\mathrm{error}$ are all $\ell$; always keep the $\frac1n$ and say when the slides drop it |
| Gradient descent | $\theta^{(t+1)} = \theta^{(t)} - \eta\, \nabla_\theta \hat R(\theta^{(t)})$; gradients are column vectors | |
| Labels | $y$ is the true label, $\hat y = f_\theta(x)$ the prediction | the imported L7 slides use $y$ for output and $d$ for desired; we restate them |
| Sigmoid | $\sigma(z) = (1+e^{-z})^{-1}$; logit $z = \theta^\top x$ | noise standard deviation is $\sigma_\varepsilon$ to avoid the clash |
| Bernoulli likelihood | $p^{y}(1-p)^{1-y}$ | note once per lesson that the slides' $y p + (1-y)(1-p)$ is equal on $\{0,1\}$ |
| Gaussian | $\mathcal{N}(\mu, \sigma^2)$, second argument a **variance**; multivariate $\mathcal{N}(\mu, \Sigma)$ | state the convention whenever the slides are ambiguous |
| KL divergence | $D_{\mathrm{KL}}(p \,\|\, q) = \sum_x p(x)\log\frac{p(x)}{q(x)}$ | natural log; say "not a metric" |
| Regularization | $\hat R(\theta) + \lambda\,\Omega(\theta)$ with $\Omega = \lVert\theta\rVert_2^2$ or $\lVert\theta\rVert_1$ | note sklearn `alpha` $=\lambda$, `C` $= 1/\lambda$; note the factor-of-$n$ difference between L7 p.44 and p.47 |
| Naive Bayes | $\psi_{jk} = P(x_j = 1 \mid y = k)$, priors $\phi_k$ | code arrays are `psis[k, j]` |
| GDA | $\mu_k$, $\Sigma_k$ (shared: $\Sigma$) | |
| k-means | centroids $c_k$, assignment $z^{(i)}$, objective $J = \frac1n\sum_i \lVert x^{(i)} - c_{z^{(i)}}\rVert_2^2$ | squared norm (the slide omits the square) |
| Expectation, probability, indicator | $\mathbb{E}$, $P$ (or $p$ for densities), $\mathbb{1}[\cdot]$ | |

### 2.2 Macros (`src/lib/katex-macros.ts`, used by every page and widget)

`\R` $\to \mathbb{R}$ · `\E` $\to \mathbb{E}$ · `\Prob` $\to P$ · `\D` $\to \mathcal{D}$ · `\M` $\to \mathcal{M}$ · `\ex{i}` $\to x^{(i)}$ · `\ey{i}` $\to y^{(i)}$ · `\T` $\to {}^{\top}$ · `\norm{v}` $\to \lVert v \rVert$ · `\argmin`, `\argmax` (with limits) · `\KL{p}{q}` $\to D_{\mathrm{KL}}(p\,\|\,q)$ · `\ind{A}` $\to \mathbb{1}[A]$ · `\Normal` $\to \mathcal{N}$ · `\Var`, `\Cov`, `\tr`, `\diag`, `\sgn`. Do not define macros in lesson files.

### 2.3 Typesetting rules

- Inline math for symbols and short expressions; display math (`$$`) for anything with a fraction, sum, or that will be referenced. Multi-line derivations use `aligned` with the relation sign aligned (`&=`).
- Number only equations that are referenced later: `\tag{3.2}` with an `\htmlId{eq-3-2}` and `<EqRef id="eq-3-2" />` to link. Numbering is `<lesson>.<n>`.
- Boxed final results: the `<Derivation>` component boxes `result`; do not hand-box with `\boxed` in prose.
- Semantic color in math: `\htmlClass{sym-theta}{\theta}` (classes `sym-theta`, `sym-x`, `sym-y`, `sym-yhat`, `sym-eta`, `sym-lambda`, `sym-mu`, `sym-sigma`, `sym-pos`, `sym-neg`, `sym-boundary`). Never `\textcolor` or `\color`.
- A derivation step contains exactly one algebraic move. Its `justification` names the rule ("chain rule", "$\log$ of a product is a sum of logs", "linearity of expectation") and its `sticky` names the glossary term if the rule is a prerequisite.
- A `<Derivation>` has at most 15 steps; longer arguments are split into chunks of 3–5 steps with headings, or into a `<Proof collapsed>` plus a short stepped version of the key idea.
- Every derivation starts with a `goal` (the destination, in TeX) and ends with `result`. Readers should never wonder where they are going.
- Literal dollar signs in prose are escaped (`\$`).

## 3. Content structure

- Follow the 12-section lesson anatomy in `VISION.md` §8 and the component contract in `docs/CONTENT_AUTHORING.md`. Sections may be short; skipping one requires an MDX comment saying why.
- IDs are kebab-case, globally unique, and never renamed after publish (add an alias instead): lessons `u6-l3-naive-bayes`, definitions `def-6-3-1`, derivations `der-6-3-2`, steps are numbered automatically, glossary `covariance`, graph nodes `bernoulli-nb-mle`, quiz items `q-u6-l3-004`, cards `fc-u6-l3-004`.
- Prerequisite terms are written `[[term]]` or `[[term|display text]]`; the term must exist in `src/content/glossary/`. Unknown terms fail the build.
- Clinical examples use the eight shared cases (`src/content/cases/`), with patient IDs that persist across lessons. Numbers in a worked example come from the generated dataset, never typed by hand.
- Code is shown with its real output (captured once by script), with the notebook and cell cited. From-scratch implementations must reproduce the companion's numbers to the printed precision.

## 4. Design tokens

All colors, type, spacing, radii, shadows, and motion come from `src/styles/tokens.css`. Components reference **semantic** tokens only. No hex, rgb, or named colors anywhere outside that file; CI greps for them.

### 4.1 Color

Neutral scale in OKLCH; semantic roles; a fixed set of **field colors** that mean the same thing everywhere (sticky notes, graph nodes, header chips, highlighted symbols).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `oklch(0.985 0.005 85)` (warm paper) | `oklch(0.17 0.012 260)` (deep slate) | page |
| `--surface` | `oklch(1 0 0)` | `oklch(0.21 0.012 260)` | cards, popovers |
| `--surface-2` | `oklch(0.96 0.006 85)` | `oklch(0.25 0.012 260)` | code, callouts |
| `--fg` | `oklch(0.22 0.015 260)` | `oklch(0.93 0.008 85)` | text |
| `--muted` | `oklch(0.50 0.015 260)` | `oklch(0.70 0.010 85)` | secondary text |
| `--border` | `oklch(0.88 0.008 85)` | `oklch(0.30 0.012 260)` | hairlines |
| `--accent` | `oklch(0.55 0.16 255)` | `oklch(0.75 0.14 255)` | links, primary actions, focus |
| `--field-probability` | `oklch(0.62 0.12 195)` teal | `oklch(0.78 0.11 195)` | |
| `--field-statistics` | `oklch(0.58 0.14 250)` blue | `oklch(0.76 0.12 250)` | |
| `--field-linear-algebra` | `oklch(0.56 0.16 300)` violet | `oklch(0.78 0.13 300)` | |
| `--field-calculus` | `oklch(0.72 0.15 75)` amber | `oklch(0.82 0.14 80)` | calculus and optimization |
| `--field-information` | `oklch(0.62 0.17 15)` rose | `oklch(0.78 0.14 15)` | information theory |
| `--field-ml` | `oklch(0.66 0.17 35)` coral | `oklch(0.80 0.14 35)` | ML methods |
| `--field-evaluation` | `oklch(0.62 0.15 150)` green | `oklch(0.78 0.13 150)` | metrics and evaluation |
| `--viz-1 … --viz-6` | the seven field colors minus evaluation, in the order above | | categorical series in widgets |
| `--viz-positive` / `--viz-negative` | green / rose | | class 1 / class 0, correct / incorrect |
| `--viz-boundary` | `--fg` at 70% | | decision boundaries, level sets |
| `--math-hl` | `--accent` at 18% alpha | | hovered symbol background |
| `--mastery-0 … --mastery-4` | neutral → accent ramp | | concept mastery fill |

Rules: text contrast ≥ 4.5:1 on its surface in both themes; the field colors are never used for text smaller than 14 px; exactly one accent per screen.

### 4.2 Typography

| Role | Font | Size / line-height |
|---|---|---|
| Prose | Source Serif 4 (variable, self-hosted) | 18 px / 1.6 on desktop, 17 px / 1.6 on phones; measure 68 ch |
| UI, labels, nav, graph | Inter (variable) | 14–15 px / 1.4 |
| Code | JetBrains Mono (variable) | 14 px / 1.55 |
| Math | KaTeX fonts (cannot be changed) | inline 1.0 em; display 1.05 em; `.katex-display { overflow-x: auto }` |
| Headings | Inter, weights 600/700 | h1 2.0 rem, h2 1.5 rem, h3 1.2 rem, h4 1.0 rem uppercase tracking 0.04 em |

Scale: 12 / 13 / 14 / 15 / 17 / 18 / 20 / 24 / 32 / 40 px. Prose paragraphs are separated by 1 em; display math gets 1.25 em above and below.

### 4.3 Space, radius, elevation, breakpoints

- Spacing scale: 4 px base; use `1 2 3 4 6 8 12 16 24 32` (×4 px). No arbitrary values (`p-[13px]` is banned).
- Radii: 6 px (controls), 10 px (cards, callouts), 14 px (popovers), full (chips).
- Elevation: hairline borders by default; one soft shadow (`0 4px 20px oklch(0 0 0 / 0.08)`) for popovers and the widget frame only.
- Breakpoints: 640 (phone → tablet), 1024 (two columns), 1280 (three columns with margin notes).

### 4.4 Motion

- Durations: 120 ms (micro: hover, toggle), 250 ms (reveal, state change), 400 ms (layout, graph settle). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Derivation steps slide in from the margin by 8 px and fade; figure state changes tween; graph physics settle quickly from a precomputed layout.
- Everything respects `prefers-reduced-motion` (instant state changes, no springs). Nothing autoplays except widget demos the reader starts.
- Motion carries meaning or it does not exist. No confetti by default.

## 5. Layout

- Lesson page: left rail (outline + four-component frame, sticky), reading column (max 68 ch), right margin (justifications, sticky notes on hover) at ≥1280 px; two columns at ≥1024; single column below, with margin content inline as expandables.
- Figures and widgets may "break out" to the full content width (reading column + margin). Full-bleed is reserved for the Atlas and hero figures.
- Every page has a visible skip link, a sticky mini-header with the lesson title and progress, and a bottom "next lesson" card.
- Phones: 16 px side gutters; no horizontal scroll except inside `.katex-display` and code blocks; sliders are ≥ 44 px tall; popovers open on tap and close on outside tap.

## 6. Component rules

- Static content is `.astro`; anything interactive is a React island (`.tsx`) in `src/components/**` or `src/components/widgets/**`, hydrated with `client:visible` (widgets) or `client:idle` (controls). Never `client:load` on a lesson page.
- Primitives come from `src/components/ui/` (Base UI, restyled to tokens). No other UI libraries. Icons: `lucide-react`.
- Tailwind utility classes only reference tokens (`bg-surface`, `text-muted`, `text-field-probability`). No inline `style={{…}}` except for computed geometry in widgets.
- Components are named in PascalCase; files match the export (`Derivation.astro`, `StickyPopover.tsx`); widget folders are kebab-case and contain `Widget.tsx`, `manifest.ts`, `README.md`.
- Every MDX component is registered in `src/components/mdx/index.ts` and provided globally by the lesson layout; lesson files contain no imports.
- Props are typed and validated (Zod for manifests and content; TypeScript for the rest). No `any`.

## 7. Widget contract

A widget is accepted when all of the following hold:

1. Folder `src/components/widgets/<name>/` with `Widget.tsx`, `manifest.ts` (Zod params schema with defaults, `title`, `challenge`, `usedIn`, `height`), and `README.md` (what it shows, which slide figure it rebuilds, the math it depends on).
2. Registered in `src/components/widgets/registry.ts`; code-split (`React.lazy`); appears on `/dev/widgets`.
3. Renders inside `<WidgetFrame>` (title, challenge line, reset, "copy state link", static fallback image for no-JS and print).
4. Colors only via `useVizTheme()` (reads `--viz-*`, `--field-*`, `--fg`, `--bg`); correct in light and dark without reload.
5. Controls are the shared `<Param>` (label, unit, min/max/step, reset) and shared buttons; sliders are keyboard-operable; every interactive element has an accessible name.
6. Deterministic: seeded randomness (`seed` param), no layout shift after mount (reserve height from the manifest), 60 fps on a 2020 laptop, ≤150 KB gzipped (3-D widgets excepted and lazy).
7. Works at 360 px width; touch targets ≥ 44 px.
8. Math inside the widget uses the same macros and `sym-*` classes as the prose beside it; a `figureState` prop lets a `<Step>` drive it.
9. One Vitest for any non-trivial computation (e.g., the GD iterate, the ROC points) and one Playwright screenshot in both themes.

## 8. Code conventions

- TypeScript strict; ESLint (typescript-eslint strict, react-hooks, astro, mdx) and Prettier (astro + tailwind plugins) clean. Imports use the `@/` alias. Named exports only (except Astro pages).
- Pure logic (`src/lib/**`: FSRS wrapper, graders, graph builder, content validators, dataset generators) is framework-free and unit-tested with Vitest. UI code holds no business logic.
- Performance budgets per lesson page: ≤60 KB gzipped JS excluding widgets; Lighthouse performance ≥90, accessibility ≥95. CI reports both.
- Accessibility: KaTeX `htmlAndMathml` output; focus rings visible (`--accent`, 2 px, offset 2 px); popovers are focus-managed and dismissible with Escape; color is never the only carrier of meaning (shapes or labels too).
- No network calls at runtime except optional, user-initiated ones (Pyodide later). No analytics in v1.
- Datasets are generated by `scripts/gen-datasets/*.ts` with fixed seeds into `src/data/*.json`; never hand-edit generated files.

## 9. Git, commits, and PRs

- `main` is always deployable. Branches: `platform/<thing>`, `content/<unit>-<lesson>`, `docs/<thing>`. Short-lived; merged daily; squash-merge.
- Conventional commits with scopes: `content(u6-l3): derive the Bernoulli NB MLE`, `widget(threshold-roc): add PR curve`, `ui(popover): …`, `atlas: …`, `practice: …`, `lib(fsrs): …`, `docs: …`, `vision: …`, `chore(deps): …`. Reference requirement IDs from `VISION.md` §3 when relevant (`R5`, `R12`).
- PR template checklist (copied into every PR): builds with zero content-validation warnings; lint and tests green; screenshots for anything visual (light and dark); for lessons, `math-reviewer` and `content-reviewer` reports attached with zero unresolved findings; for widgets, the contract in §7 ticked.
- Cross-tree changes (content touching `src/components`, platform touching `src/content`) and any change to `src/content.config.ts`, `astro.config.mjs`, `tokens.css`, `CLAUDE.md`, `STYLE_GUIDE.md`, `VISION.md`, or `.claude/**` need the other developer's review.
- Never commit `.DS_Store`, `node_modules`, build output, or `.claude/settings.local.json`.

## 10. Working with agents

- Read `docs/course-map/` before writing any lesson; do not re-read the PDFs unless the course map is ambiguous (it records the slides page by page).
- Use the shared subagents in `.claude/agents/`: `lesson-writer` (drafts a lesson from the course map against the contract), `widget-builder` (implements a widget to the contract), `math-reviewer` (checks every step of every derivation; must pass before `published`), `content-reviewer` (voice, structure, ids, sticky resolution, homework safety), `lecture-ingester` (new PDF → course map → stubs).
- One lesson or one widget per branch and per agent run. Small, reviewable diffs beat heroic ones.
- When the course map, this guide, or `VISION.md` is wrong, fix the document in the same PR as the code and say so in the PR description.
