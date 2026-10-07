<!--
  REFERENCE — tech-stack research memo, generated 2026-10-06 by a research agent with
  versions read from the npm registry that day. VISION.md §11 is the binding summary; this
  memo holds the alternatives considered, config snippets, the exact package list, and the
  first-week spike checklist. When a version here is stale, update VISION.md §11 and say so
  in the PR. Directory names in this memo differ slightly from VISION.md §11.2; VISION.md wins.
-->

# AML Interactive Learning Site — Technical Stack & Architecture Recommendation

Prepared 2026-10-06 for the CS 5785 (Cornell Tech) interactive learning site, repo `mbwiller/AML`. All package versions below were read directly from the npm registry on 2026-10-06 (`registry.npmjs.org/<pkg>/latest`) unless marked "unverified". Release dates and framework facts were verified via the linked sources.

---

## 0. Executive recommendation

**Build a static Astro 7 site with React 19 islands, MDX content collections, build-time KaTeX, Tailwind v4 design tokens, Base UI primitives, Mafs + D3 + Motion for interactives, a d3-force concept graph, and ts-fsrs/Dexie for spaced repetition — deployed to Cloudflare Workers Static Assets (GitHub Pages as the zero-config fallback).**

| Layer | Choice | Version (npm latest, 2026-10-06) |
|---|---|---|
| Framework | Astro (static output) | `astro` 7.3.6 |
| UI runtime for islands | React | `react` / `react-dom` 19.3.0, `@astrojs/react` 7.0.1 |
| Content | MDX via `@astrojs/mdx` on the unified (remark/rehype) pipeline | `@astrojs/mdx` 8.0.3, `@astrojs/markdown-remark` 7.3.2 |
| Math | KaTeX at build time (`remark-math` + `rehype-katex`, KaTeX forced to 0.19 via pnpm override) | `katex` 0.19.0, `remark-math` 6.0.0, `rehype-katex` 7.0.1 |
| Code blocks | Expressive Code (Shiki) | `astro-expressive-code` 0.44.2 |
| Styling | Tailwind CSS v4 (`@theme` tokens, OKLCH), `data-theme` dark mode | `tailwindcss` / `@tailwindcss/vite` 4.3.3 |
| Primitives | Base UI (shadcn's default since July 2026) | `@base-ui/react` 1.8.0, `shadcn` CLI 4.21.3 |
| Math viz | Mafs (coordinate-plane widgets) + D3 modules (scales/shapes/contours/force) rendered by React | `mafs` 0.21.0, `d3` 7.9.0 |
| Animation | Motion (formerly Framer Motion) | `motion` 14.0.0 |
| 3D (showcase only) | react-three-fiber + drei + three | `@react-three/fiber` 9.8.1, `@react-three/drei` 10.7.9, `three` 0.186.1 |
| Concept graph | custom React SVG + `d3-force` (fallback: `react-force-graph-2d`) | `d3-force` 3.0.0 / `react-force-graph-2d` 1.29.2 |
| Spaced repetition | ts-fsrs (FSRS-6) | `ts-fsrs` 5.4.2 |
| Client state | nanostores (+persistent) for progress/prefs; Dexie (IndexedDB) for review logs | `nanostores` 1.5.5, `@nanostores/persistent` 1.3.5, `@nanostores/react` 2.0.1, `dexie` 4.4.6 |
| Tooling | pnpm, TypeScript 6 (not 7 yet — see §9), ESLint 10 + Prettier 3, Vitest 5, Playwright 1.63, lefthook + commitlint | see §9 and Appendix A |
| Hosting | Cloudflare Workers Static Assets (primary) / GitHub Pages (fallback) | `wrangler` 4.148.0, `withastro/action` v6.1.3 |
| Node | 24 LTS (Astro 7 requires >= 22.12.0) | — |

**Why this and not Next.js:** the product is 90% prose-and-math with sprinkled interactivity. Astro ships zero JavaScript for the prose, renders every equation to HTML at build time, has first-class typed content collections with YAML/JSON loaders (perfect for the glossary, flashcard decks, and concept graph), and treats each interactive as an explicitly hydrated island (`client:visible`). Next.js 16 can do a static export, but it hydrates whole pages, its Turbopack MDX loader only accepts remark/rehype plugins as serializable strings, its content layer is third-party (Velite), and `output: 'export'` removes redirects/headers/image optimization ([Next.js static export docs](https://nextjs.org/docs/app/guides/static-exports)). Astro is also something Claude is very fluent in, and its directory conventions (content vs. components vs. islands) map almost one-to-one onto your two workstreams, which minimizes merge conflicts.

**The one wrinkle you must know about:** Astro 7 (released 2026-06-22) switched the default Markdown/MDX processor to Sätteri, a Rust pipeline that *does not run remark/rehype plugins* and *parses but does not render math* ([Astro 7 announcement](https://astro.build/blog/astro-7/), [v7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/), [InfoQ on Sätteri](https://www.infoq.com/news/2026/08/astro-satteri-rust/)). The unified pipeline remains officially supported and is still published in lockstep with Astro (`@astrojs/markdown-remark` 7.3.2 shipped the same day as Astro 7.3.6). Use it: install `@astrojs/markdown-remark` and set `markdown.processor: unified()`. The remark/rehype ecosystem is mature and deeply familiar to Claude; Sätteri's plugin ecosystem is two months old. Switching later is a config change.

---

## 1. Framework choice

### Candidates evaluated

**Astro 7.3.6** (7.0 on 2026-06-22). Vite 8 + Rolldown bundler, Rust `.astro` compiler, builds 15–61% faster than Astro 6 in the team's benchmarks ([astro.build/blog/astro-7](https://astro.build/blog/astro-7/)). Requires Node >= 22.12.0 (npm `engines`). Static output by default; React/Vue/Svelte islands via `client:load|idle|visible|media|only` directives ([directives reference](https://docs.astro.build/en/reference/directives-reference/)). Typed content collections with `glob()` and `file()` loaders for Markdown/MDX/JSON/YAML/TOML, Zod schemas, and `reference()` for cross-collection links ([content collections guide](https://docs.astro.build/en/guides/content-collections/)). `@astrojs/mdx` 8.0.3 delegates `.mdx` compilation to whichever Markdown processor you configure, and lets you inject custom components via `<Content components={...} />` so lesson authors never write import lines ([MDX integration guide](https://docs.astro.build/en/guides/integrations-guide/mdx/)). `@astrojs/react` 7.0.1 now uses `oxc-transform-react` for the JSX transform. Deploys anywhere static.

**Next.js 16.4.0** (App Router, Turbopack default, React 19.2+). Static export works but excludes dynamic routes without `generateStaticParams`, redirects/headers/rewrites, default image optimization, and ISR ([static export docs](https://nextjs.org/docs/app/guides/static-exports)). MDX requires `@next/mdx`; with Turbopack, remark/rehype plugins must be passed as string names with JSON-serializable options because loader options cannot be functions ([vercel/next.js#72917](https://github.com/vercel/next.js/issues/72917), [Nextra's Turbopack notes](https://nextra.site/docs/guide/turbopack)). Content typing needs Velite 0.4.0 (Contentlayer is abandoned; Velite is the recommended successor per [PkgPulse's 2026 comparison](https://www.pkgpulse.com/guides/contentlayer-vs-velite-vs-next-mdx-remote-mdx-content-2026)). Every page hydrates React even if it is pure prose. The strongest argument for Next is Claude's fluency and the Vercel path to a backend later — but you explicitly do not want a backend now.

**Vite 8.3.3 + React SPA.** Maximum flexibility, zero conventions. You would hand-roll MDX loading, routing, static prerendering (needed for SEO and instant first paint of math-heavy pages), and content typing. Too much glue for two people.

**Docusaurus 3.10.2 / Starlight 0.42.5.** Both are documentation-shaped: sidebar-driven, docs-first themes. Docusaurus has the most turnkey KaTeX story (`remark-math` 6 + `rehype-katex` 7 in config, [Docusaurus math docs](https://docusaurus.io/docs/markdown-features/math-equations)), but you will fight its theme the moment you want a custom learning UI (progress maps, full-screen graph, gamified dashboards). Starlight's KaTeX story is a known pain point ([withastro/starlight discussion #3455](https://github.com/withastro/starlight/discussions/3455)). Neither buys you anything you cannot get from plain Astro in an afternoon, and both take away design freedom.

### Decision: Astro 7 + React islands

Concrete reasons, in priority order:

1. **Math-heavy prose should be HTML, not hydrated React.** A derivation-heavy lesson can have 200+ KaTeX spans; Astro ships them as static HTML with the ~23 KB KaTeX CSS and only the fonts actually used. Zero client-side KaTeX.
2. **Islands make interactivity explicit and lazy.** `<Widget name="gd-trajectory" client:visible />` loads that widget's chunk only when it scrolls into view. 3D widgets (three.js is several hundred KB gzipped) never affect lessons that do not use them.
3. **Content collections are your CMS.** Lessons (MDX), glossary (MDX, one file per term), flashcard decks (YAML), quizzes (MDX or YAML), concepts (YAML) are all typed with Zod and cross-referenced with `reference()`. A broken reference fails the build, which is the right behaviour for two people adding content weekly.
4. **Two-workstream friendliness.** Content lives in `src/content/**`; app shell and interactives in `src/components/**`, `src/widgets/**`, `src/styles/**`. CODEOWNERS can enforce the boundary.
5. **Hosting is trivial** (static `dist/`).
6. **Claude fluency** is high for Astro, React, MDX, remark/rehype, Tailwind, and D3 — the whole stack is "boring on purpose".

Trade-offs accepted: islands cannot share React context across islands (use nanostores); Astro's dynamic-tag pattern cannot be combined with `client:*` directives, so the widget registry must live inside a single React island (see §3); the Sätteri default must be overridden (see §2).

---

## 2. Math rendering

### KaTeX vs MathJax

- **KaTeX 0.19.0** (2026-10-01). Synchronous, ~1 ms per equation, renders at build time via `katex.renderToString`, default output is `htmlAndMathml` (visual HTML plus hidden MathML for screen readers) ([KaTeX options](https://katex.org/docs/options.html)). Supports `aligned`, `align`, `align*`, `alignat`, `gather`, `cases`, `rcases`, all matrix variants, `equation`, `split`, `CD`; `\tag`/`\tag*`; `\newcommand`, `\def`, `\gdef` (persisting across expressions when `globalGroup`/`\gdef` is used); unstarred `align`/`gather`/`equation` auto-number (via CSS counters). Not supported: `\label`/`\ref`/`\eqref`, `\multicolumn`, `\cline` ([supported functions](https://katex.org/docs/supported.html)).
- **MathJax 4.1.3** (2026-07-03; v4.0 shipped 2025-08-05) adds line-breaking, 11 fonts, and a speech web worker ([MathJax v4.1.2 announcement](https://groups.google.com/g/mathjax-users/c/V79AFTup7wc)). It has broader TeX coverage (including `\label`/`\eqref` cross-references) but is slower, heavier, and its build-time story (`rehype-mathjax` 7.1.0, SVG output) produces bulkier HTML.

**Recommendation: KaTeX**, rendered at build time. The only thing you lose is `\eqref`; handle equation references with explicit `\tag{3.2}` plus a small `<EqRef id="3.2" />` MDX component that links to an `id` you set on the display block (KaTeX supports `\htmlId{}` and `\htmlClass{}` when `trust` is enabled — see below). Reserve MathJax only if you later need automatic cross-referencing across a whole lesson.

### Three KaTeX version facts that matter in 2026

1. **0.17.0 (2026-05-22)** changed the internal `__defineFunction` API; **0.18.0 (2026-07-17)** prefixed all internal CSS classes (`.base` → `.katex-base`, etc.), so custom CSS targeting KaTeX internals must be updated and *the renderer and stylesheet versions must match*; **0.19.0 (2026-10-01)** made missing-glyph metrics go through `strict` ([KaTeX CHANGELOG](https://github.com/KaTeX/KaTeX/blob/main/CHANGELOG.md)).
2. **CVE-2026-103923 / GHSA-238p-pmpm-9mq7** (low severity, prototype-pollution read gadget) is patched in 0.18.2 ([advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7)). You want >= 0.18.2.
3. **`rehype-katex` 7.0.1 (last published 2024-08-19) depends on `katex` `^0.16.0`**, and **Mafs 0.21.0 also depends on `katex` `^0.16`** (npm registry metadata). Left alone, pnpm would install KaTeX 0.16.47 for those packages while you load the 0.19 stylesheet, and every equation would render unstyled because of the class-prefix change.

**Fix:** pin one KaTeX everywhere with a pnpm override. pnpm 12 no longer reads the `pnpm` field in `package.json` (it warns and ignores it), so the override lives in `pnpm-workspace.yaml`, together with the build-script allowlist:

```yaml
# pnpm-workspace.yaml
packages: ['.']
overrides:
  katex: 0.19.0
allowBuilds:
  esbuild: true
  lefthook: true
```

`rehype-katex` only calls `katex.renderToString`, whose signature is unchanged, so the override is safe (several projects did exactly this after 0.18, e.g. [hamidfzm/glyph#866](https://github.com/hamidfzm/glyph/pull/866)). Import the stylesheet from the same package (`import 'katex/dist/katex.min.css'`) so CSS and renderer can never drift. If you would rather avoid the override, the alternative is a 25-line in-repo rehype plugin (`src/lib/markdown/rehype-katex-local.ts`) that visits `.math-inline`/`.math-display` nodes and calls `katex.renderToString` directly — Claude writes that reliably.

### Pipeline in Astro 7

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkDirective from 'remark-directive';
import rehypeSlug from 'rehype-slug';

export default defineConfig({
  site: 'https://aml.example.com',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkDirective],
      rehypePlugins: [
        rehypeSlug,
        [rehypeKatex, {
          output: 'htmlAndMathml',
          strict: 'warn',
          trust: (ctx) => ['\\htmlClass', '\\htmlId', '\\href'].includes(ctx.command),
          macros: { '\\R': '\\mathbb{R}', '\\E': '\\mathbb{E}', '\\argmin': '\\operatorname*{arg\\,min}' },
        }],
      ],
    }),
  },
  integrations: [expressiveCode(), mdx(), react()],
  vite: { plugins: [tailwindcss()] },
});
```

Notes: Expressive Code must precede `mdx()` in `integrations` and supports Astro 7 with either processor as of 0.44.0 ([Expressive Code releases](https://expressive-code.com/releases/)). Keep a single shared macro file (`src/lib/markdown/katex-macros.ts`) so notation is consistent across lessons written by two people — this is one of the highest-leverage consistency tools you have. Enabling `trust` only for `\htmlClass`/`\htmlId` lets authors write `\htmlClass{m-accent}{w}` and have colours come from your design tokens (and flip correctly in dark mode), instead of hard-coding `\textcolor{#...}`.

If you later want Sätteri's build speed: Sätteri 0.10.5 exposes `features: { math: true }` plus `mdastPlugins`; the community `satteri-katex` 0.1.1 plugin shows the pattern but pins `satteri ^0.9.5` and `katex ^0.16.25`, so you would write your own ~30-line MDAST plugin ([satteri-katex README](https://www.npmjs.com/package/satteri-katex)). Not worth it before the ecosystem settles.

### Theorem/proof environments and step-by-step reveals

These are MDX components, not LaTeX environments. KaTeX renders the math inside them because `remark-math` runs over the entire MDX tree, including JSX children, as long as the markdown inside a component is separated by blank lines (an MDX rule, not an Astro one).

```mdx
<Theorem name="Gauss–Markov">
Under $\mathbb{E}[\varepsilon \mid X] = 0$ and $\operatorname{Var}(\varepsilon \mid X) = \sigma^2 I$, OLS is BLUE.
</Theorem>

<Derivation title="Normal equations">
<Step note="Write the squared loss">
$$ L(w) = \lVert Xw - y \rVert_2^2 $$
</Step>
<Step note="Expand and differentiate">
$$ \nabla_w L = 2X^\top X w - 2X^\top y $$
</Step>
<Step note="Set the gradient to zero">
$$ w^\star = (X^\top X)^{-1} X^\top y \tag{1} $$
</Step>
</Derivation>
```

Implementation pattern that keeps math server-rendered: `Derivation.astro` renders all `<Step>` children to static HTML (KaTeX already applied), and wraps them in a small React island (`DerivationControls`, `client:idle`) that owns reveal state — "Next step", "Reveal all", keyboard `→`/`Space`, and optional persistence of "revealed" per lesson in nanostores. Animate reveals with Motion's `AnimatePresence` + `layout`, respecting `prefers-reduced-motion`.

> **As built (M1):** the reveal engine is a vanilla `<script>` module in `Derivation.astro` (≈2.7 KB gzipped) over pure, tested state in `src/lib/derivation-state.ts`, with CSS keyframes for the 250 ms reveal, not a React island — a lesson page would otherwise pay for the React runtime against its 60 KB budget (STYLE_GUIDE §8). The intent above (reveal state, keyboard, persistence in `localStorage` under `aml-derivation:<id>`) is kept; see `src/components/mdx/README.md`. The same approach yields `<Hint>`, `<Proof collapsible>`, and `<Callout type="intuition|warning|pitfall">` (callouts can also be written as `:::intuition` container directives via `remark-directive`, which authors often prefer).

MDX gotchas to test in the first spike: literal dollar signs in prose must be escaped (`\$5`), or set `singleDollarTextMath: false` and use `$$…$$` only; `<` inside inline math is fine because the math tokenizer consumes it, but `<` in plain MDX text starts JSX; curly braces inside math are fine for the same reason.

---

## 3. Content authoring model

### Collections (`src/content.config.ts`)

```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const units = defineCollection({
  loader: file('src/content/units.yaml'),
  schema: z.object({ id: z.string(), title: z.string(), order: z.number(), summary: z.string() }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: 'src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    unit: reference('units'),
    order: z.number(),
    summary: z.string().max(240),
    concepts: z.array(reference('concepts')).default([]),      // taught here
    prerequisites: z.array(reference('concepts')).default([]), // assumed
    lecture: z.object({ number: z.number(), pdf: z.string().optional(), notebook: z.string().optional() }).optional(),
    estimatedMinutes: z.number().default(30),
    difficulty: z.enum(['intro', 'core', 'advanced']).default('core'),
    status: z.enum(['draft', 'review', 'published']).default('draft'),
    xp: z.number().default(100),
  }),
});

const concepts = defineCollection({
  loader: file('src/content/concepts.yaml'),
  schema: z.object({
    id: z.string(), title: z.string(), unit: reference('units'),
    short: z.string().max(160),            // graph tooltip
    lesson: reference('lessons').optional(), // click-through target
    tags: z.array(z.string()).default([]),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '*.mdx', base: 'src/content/glossary' }),
  schema: z.object({ term: z.string(), aliases: z.array(z.string()).default([]), concept: reference('concepts').optional() }),
});

const decks = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/flashcards' }),
  schema: z.object({
    title: z.string(), lesson: reference('lessons'),
    cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string(), concept: reference('concepts').optional() })),
  }),
});

export const collections = { units, lessons, concepts, glossary, decks };
```

Why this shape: the **concept** is the atomic unit that the graph, flashcards, quizzes, and mastery tracking all key on. Lessons declare which concepts they teach and assume; the graph's edges are derived from that, so the graph can never drift from the content.

### The glossary / sticky notes

Store each term as a tiny MDX file (`src/content/glossary/covariance.mdx`) so definitions can contain real math. Usage in a lesson: `<Term id="covariance">covariance</Term>`. `Term.astro` does `getEntry('glossary', id)` + `render()` at build time and passes the rendered HTML to a React `TermPopover` island (Base UI `Popover` with `openOnHover`, 300 ms delay, click-to-pin on touch, focus-managed, `Positioner` with collision avoidance — [Base UI Popover](https://base-ui.com/react/components/popover)). Hydrate with `client:idle`. A `/glossary` page is generated from the same collection for free. CSS anchor positioning reached Baseline when Firefox 147 shipped it in January 2026, and `popover="hint"` is Chrome-only so far ([Chrome blog](https://developer.chrome.com/blog/popover-hint)); the Base UI island is the safe choice today and you can swap to native later without touching content.

### Widgets in MDX

Astro cannot combine dynamic component tags with `client:*` directives, so put the registry *inside* one React island:

```tsx
// src/widgets/registry.ts
export const registry = {
  'gd-trajectory': () => import('./gd-trajectory/Widget'),
  'sigmoid-boundary': () => import('./sigmoid-boundary/Widget'),
  'kmeans': () => import('./kmeans/Widget'),
} as const;

// src/components/mdx/Widget.astro
---
import WidgetHost from '@/widgets/WidgetHost';
const { name, ...params } = Astro.props;
---
<WidgetHost client:visible name={name} params={params} />
```

`WidgetHost` uses `React.lazy(registry[name])` so Vite code-splits each widget. Authors write `<Widget name="gd-trajectory" lr={0.1} />`. Every widget folder exports `Widget.tsx` plus `meta.ts` (Zod schema for params, title, default height) — the schema doubles as documentation and lets a build-time check validate every `<Widget>` usage.

Provide all MDX components globally from the lesson layout (`<Content components={mdxComponents} />`) so lesson files contain no imports — that is what keeps content files diff-friendly and stylistically uniform between the two of you.

### Incremental authoring workflow

A `pnpm new:lesson 07 "Logistic Regression"` script scaffolds the folder, frontmatter, and a checklist (concepts declared, deck present, quiz present). `status: draft` lessons build but are hidden from navigation and the graph until flipped to `published`. Lecture PDFs go to `public/lectures/` and are linked from frontmatter; notebook outputs are captured once (see §7).

---

## 4. Visualization libraries

| Library | Verdict | Why |
|---|---|---|
| **Mafs** 0.21.0 | **Use** for coordinate-plane widgets | Purpose-built React components for interactive math: `Coordinates.Cartesian/Polar`, `Plot.OfX/Parametric/VectorField/Inequality`, `Point`, `Vector`, `Line.*`, `Circle`, `Ellipse`, `Polygon`, `Transform`, `useMovablePoint`, `useStopwatch`, zoom/pan, themable via CSS variables, MIT ([mafs.dev](https://mafs.dev/), [GitHub](https://github.com/stevenpetryk/mafs)). Perfect for gradient-descent paths, sigmoid/decision boundaries, ridge/lasso geometry, 2-D Gaussian contours (via custom SVG children), PCA projections. **Risk:** last release 2024-10-20, peer `react >= 18` (installs on 19.3 but verify in the spike); experimental `LaTeX` component depends on `katex ^0.16` (covered by the override). It is small and MIT; if it ever blocks you, its primitives are easy to replicate. |
| **D3** 7.9.0 (modules) | **Use** as the maths/scales layer, React renders | `d3-scale`, `d3-shape`, `d3-contour` (Gaussian/loss contours), `d3-interpolate`, `d3-random`, `d3-force`, `d3-axis` only where SVG axes are needed. Pattern: D3 computes, React draws (no `d3-selection` DOM mutation inside React), which is the pattern Claude produces most reliably. D3 is in maintenance mode (7.9.0 is from March 2024) but it is the most stable dependency on this list. |
| **Motion** 14.0.0 (2026-10-02) | **Use** for all animation | `motion/react` for reveals, layout animations, spring-driven sliders; `animate()` and `useMotionValue` for driving k-means/gradient-descent frames; respects reduced motion ([motion.dev](https://motion.dev/)). |
| **react-three-fiber** 9.8.1 + **drei** 10.7.9 + **three** 0.186.1 | **Use sparingly** (1–3 showcase widgets) | A rotatable 3-D loss surface with a descending ball is the single most memorable visual in an ML course. R3F 9 pairs with React 19 ([R3F releases](https://github.com/pmndrs/react-three-fiber/releases)). Lazy-load only on those lessons (`client:visible`), provide a 2-D contour fallback for low-power devices. |
| Observable Plot 0.6.17 | Skip | Last release 2025-02-14; declarative chart grammar, not reactive/interactive-first. |
| Plotly.js 4.1.2 | Skip | 1.4 MB gz full bundle, 365 KB basic ([plotly dist README](https://github.com/plotly/plotly.js/blob/master/dist/README.md)); generic look that fights a custom design system. |
| Recharts 3.10.1 / visx 4.0.0 | Skip | Dashboard charts; visx adds little over D3 modules + React. |
| JSXGraph 1.14.0 (2026-10-05) | Fallback only | Actively maintained, strong geometry, but imperative API and its own look. |
| Desmos API | Skip | Requires an API key; free tier is for personal/non-commercial use ([Desmos API terms](https://www.desmos.com/api-terms?lang=en)). |

**Widget contract** (enforce via `.claude/rules/widgets.md` and a template): props validated by the `meta.ts` Zod schema; sizing via `react-use-measure` 2.1.7; colours only from `useVizTheme()` which reads CSS tokens (`--viz-1..6`, `--viz-positive`, `--viz-negative`, `--viz-boundary`); all sliders are the shared `<Param>` control (Base UI `Slider`) with a label, unit, and reset; a visible "What to try" caption; `aria-label`; works at 360 px width.

---

## 5. Concept graph

Candidates (versions from npm, 2026-10-06): `react-force-graph-2d` 1.29.2 (canvas, d3-force under the hood, published 2026-09-29), `reagraph` 4.32.0 (WebGL via three/R3F — pulls in three.js, overkill for 300 nodes), `sigma` 3.0.3 + `graphology` 0.26.0 (WebGL; built for 10k+ nodes), `cytoscape` 3.34.3 (richest algorithms, less idiomatic in React), `vis-network` 10.1.2 (dated look), `d3-force` 3.0.0 (just the simulation).

**Recommendation: a custom React SVG graph driven by `d3-force` (+ `d3-zoom`, `d3-drag`).** For 100–300 nodes and a few hundred edges, SVG is nowhere near its limits, and SVG gives you what a *beautiful, consistent* graph needs: nodes styled with your design tokens and CSS transitions, real typography for labels, keyboard focus and ARIA for accessibility, hover/selection states as CSS classes, KaTeX in labels via `<foreignObject>` if wanted, and dark mode for free. Prerequisite highlighting is a BFS over the edge list on hover/click: ancestors tinted one way, descendants another, everything else dimmed with a 150 ms transition. Click navigates to `concept.lesson`. A "focus mode" (press `F`) shows only the current unit.

Two refinements that make it feel premium:
1. **Precompute the layout at build time** (run `d3-force` for ~300 ticks in a Node script with a fixed seed, store `x,y` in `graph.json`) so the graph appears settled instantly; run the client simulation at low alpha only for drags. Deterministic layouts also make Playwright screenshots stable.
2. **Colour nodes by mastery** from the learner's FSRS state (see §6) — the graph becomes the progress map.

Fallback: if you want it in a day, `react-force-graph-2d` gives drag/zoom/hover/click out of the box with `nodeCanvasObject` for custom drawing; it is React-19 compatible (`peerDependencies: react: *`) ([react-force-graph](https://github.com/vasturiano/react-force-graph)). The cost is canvas styling (no CSS, read tokens via `getComputedStyle` at draw time) and weaker accessibility.

**Graph data:** nodes come from `src/content/concepts.yaml`; edges are **derived** at build time from every lesson's `concepts` and `prerequisites` arrays (`prereq -> concept` for each pair) plus an optional `src/content/edges.yaml` for hand-curated cross-links. `src/lib/graph/build.ts` produces `{nodes, edges}`, and `scripts/validate-graph.ts` (run in CI) checks that every reference resolves, the prerequisite relation is a DAG (topological sort), and warns about orphan concepts. The graph island receives the JSON as a prop (no fetch).

---

## 6. Flashcards, quizzes, gamification

### Spaced repetition: FSRS over SM-2

Use **`ts-fsrs` 5.4.2** (implements FSRS-6; API: `createEmptyCard()`, `fsrs(params)`, `repeat(card, now)` to preview the four outcomes, `next(card, now, Rating.Good)` to apply; parameters `request_retention` (default 0.9), `maximum_interval`, `enable_fuzz`, learning/relearning steps) ([ts-fsrs docs](https://open-spaced-repetition.github.io/ts-fsrs/)). FSRS is a data-fitted three-component memory model (difficulty, stability, retrievability); in the open benchmark FSRS-5 beats trainable SM-2 in 97.4% of collections and typically needs 20–40% fewer reviews for equal retention ([FSRS vs SM-2 comparison](https://l-m-sherlock.notion.site/What-are-the-main-differences-between-SM-2-and-FSRS-135c250163a180ca9029ea460136254c), [awesome-fsrs benchmark links](https://github.com/open-spaced-repetition/awesome-fsrs)). Use default parameters (per-user optimisation needs ~1,000 reviews); the retrievability function gives you a "mastery" number per card for free.

Card content: decks are YAML (short strings with `$…$`), rendered to HTML at build time by an Astro component calling `katex.renderToString`, and passed to the `FlashcardSession` island as `{id, frontHtml, backHtml, conceptId}`. Review UI: flip, four rating buttons (Again/Hard/Good/Easy) with keyboard `1–4`, "due today" count on the lesson page, and a global "Review" page across all decks.

### Storage

- **`@nanostores/persistent`** 1.3.5 (localStorage-backed atoms shared across islands and pages) for small state: XP, streak, completed sections, revealed derivations, theme, last visited lesson. Islands subscribe via `@nanostores/react` 2.0.1.
- **Dexie** 4.4.6 (IndexedDB) for the FSRS tables: `cards` (id, conceptId, due, stability, difficulty, state, reps, lapses, last_review) and `reviews` (cardId, rating, ts, elapsed). Indexed by `due` so "what is due" is one query; thousands of rows stay fast and are not subject to localStorage's ~5 MB cap. `idb-keyval` 6.3.0 is lighter but has no queries.
- **Export/import** a JSON backup (download + paste) from day one — it is the zero-backend "sync".
- **Optional sync later:** Supabase's free tier (2 projects, 500 MB Postgres, 50k MAU) pauses projects after a week of inactivity ([Supabase free plan limits](https://costbench.com/software/database-as-service/supabase/free-plan/)); fine for a semester, annoying over breaks. Defer; design the store with a `userId`-less, mergeable shape (last-write-wins per card) so sync is additive.

### Quizzes

Author quizzes in MDX alongside the lesson so math renders through the normal pipeline:

```mdx
<Quiz id="l07-q1" xp={30}>
<Q type="mc" answer="b" explain="The sigmoid saturates, so…">
What happens to $\sigma'(z)$ as $|z| \to \infty$?
- [a] It grows linearly
- [b] It goes to $0$
- [c] It goes to $1$
</Q>
<Q type="numeric" answer={0.25} tol={0.01} unit="">
Compute $\sigma'(0)$.
</Q>
<Q type="order" answer={[2,1,3]}>
Put the steps of the normal-equation derivation in order.
</Q>
</Quiz>
```

Grading runs client-side (answers are shipped in the HTML; this is a learning site, not an exam). Numeric answers accept tolerance; "order" questions use Motion's `Reorder` for drag-to-order derivation steps; `type="steps"` can reveal a worked solution step by step on a wrong answer.

### Gamification that stays tasteful

Keep it diegetic and informative: XP per section read (scroll-based), quiz, and review; a daily streak with a one-day "freeze" to avoid punishing weekends; **mastery per concept** (mean retrievability of that concept's cards blended with quiz accuracy) displayed as the fill colour of graph nodes and unit progress rings; a handful of badges tied to real milestones ("Derived the normal equations", "7-day streak", "Unit 2 mastered"), each a small SVG in your own illustration style; no leaderboards, no confetti by default (optional toggle). All of it is local; a "reset progress" button lives in settings.

---

## 7. In-browser Python

**Facts (2026-10):** Pyodide now versions with CPython: latest **314.0.7** (2026-09-14), Python 3.14.2, with `numpy` 2.4.6, `scipy` 1.18.0, `pandas` 3.0.2, `matplotlib` 3.10.8, **`scikit-learn` 1.8.0**, `sympy` 1.14.0 all available via `pyodide.loadPackage()` ([Pyodide packages](https://pyodide.org/en/stable/usage/packages-in-pyodide.html), [changelog](https://pyodide.org/en/stable/project/changelog.html)). JupyterLite is at 0.7.3 with `@jupyterlite/pyodide-kernel` 0.8.6; its docs describe a first load of ~6.4 MB plus 4–5 s initialisation for the core runtime alone ([JupyterLite custom Pyodide guide](https://jupyterlite.readthedocs.io/en/latest/howto/pyodide/pyodide.html)). The numpy + scipy + scikit-learn wheels add on the order of tens of MB (scipy is the big one); measure in a spike before promising anything — treat "20–30 MB compressed for the sklearn stack" as an estimate, not a verified number.

**Recommendation: static code + captured outputs by default; opt-in Pyodide for small numpy exercises; no JupyterLite in v1.**

- Static companions: a script (`scripts/capture-notebook.ts` + `nbconvert`) executes the course notebooks once and emits MDX snippets with Expressive Code frames (`title="lecture07.ipynb"`, line markers, collapsible sections, copy button) and the real outputs/figures as images. This is reproducible, fast, and looks better than a live REPL.
- Opt-in "Try it" cells: a `<PyCell>` island that lazy-loads Pyodide from the jsDelivr CDN on first click (never on page load), runs in a Web Worker, caches via the browser, and is limited to numpy/matplotlib-free exercises (vectorised gradient descent, a tiny perceptron). Show a progress bar and an honest "downloading ~10 MB" label.
- scikit-learn in the browser is feasible but heavy; add it only to a dedicated `/lab` page if students ask.
- Pyodide needs no special headers for the single-threaded build, so it works on any static host.

---

## 8. Design system

### Styling engine: Tailwind CSS v4

**`tailwindcss` 4.3.3** (4.3 released 2026-05-08: scrollbar utilities, new colours; [v4.3 blog](https://tailwindcss.com/blog/tailwindcss-v4-3)) via `@tailwindcss/vite` (`npx astro add tailwind`, then `@import "tailwindcss"` — [Astro styling guide](https://docs.astro.build/en/guides/styling/)). v4 moved configuration into CSS: tokens are declared in `@theme` and become both CSS variables and utilities, which is exactly what a two-person, agent-driven team needs — one file is the source of truth and agents cannot invent colours without touching it. CSS Modules and vanilla-extract were considered; both are fine but give agents too much freedom and require more per-component plumbing. Tailwind + `prettier-plugin-tailwindcss` (class ordering) + a tokens file is the most "self-correcting" option.

### Primitives: Base UI (via shadcn)

shadcn/ui consolidated Radix into a single `radix-ui` package in February 2026 and made **Base UI the default in July 2026**; Radix remains supported ([shadcn changelog: Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default), [unified Radix package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)). Use **`@base-ui/react` 1.8.0** (headless, accessible: Popover, PreviewCard, Dialog, Tabs, Slider, Tooltip, Toggle, Progress, Collapsible) with components copied into `src/components/ui/` by the `shadcn` 4.21.3 CLI, then restyled to your tokens. Note the old package name `@base-ui-components/react` is stale (1.0.0-rc.0); the live one is `@base-ui/react`. Icons: `lucide-react` 1.52.0.

### Typography for math

KaTeX ships its own Computer Modern–derived fonts and only supports that one math font family (changing it is a hack; [KaTeX issue #233](https://github.com/KaTeX/KaTeX/issues/233)). So choose body fonts that harmonise with Computer Modern rather than fighting it:

- **Prose:** Source Serif 4 (variable) — a sturdy, readable textbook serif whose weight and x-height sit comfortably next to KaTeX; `@fontsource-variable/source-serif-4` 5.3.0. (Alternative: STIX Two Text, `@fontsource/stix-two-text` 5.3.0, if you prefer a Times flavour.)
- **UI / navigation / labels / graph:** Inter (variable), `@fontsource-variable/inter` 5.3.0 (or Geist, `@fontsource-variable/geist` 5.3.0).
- **Code:** a monospace with clear `0/O` and `1/l` (JetBrains Mono or Geist Mono via fontsource — version unverified).
- Self-host everything (fontsource), `font-display: swap`, subset to Latin. Size inline math at 1.0em and display math at 1.05em; set `.katex-display { overflow-x: auto; }` for mobile.

### Tokens and dark mode

`src/styles/tokens.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-serif: "Source Serif 4 Variable", Georgia, serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
  --color-accent-500: oklch(0.62 0.17 255);
  /* …palette… */
}
:root {
  --bg: oklch(0.99 0 0); --fg: oklch(0.2 0.01 255); --muted: …;
  --viz-1: oklch(0.65 0.18 255); --viz-2: oklch(0.7 0.17 25); /* …6 categorical */
  --viz-positive: …; --viz-negative: …; --viz-boundary: …;
}
[data-theme=dark] { --bg: oklch(0.17 0.01 255); --fg: oklch(0.93 0.01 255); /* … */ }
```

Semantic tokens (`--bg`, `--fg`, `--surface`, `--border`, `--accent`, `--viz-*`, `--math-hl`) are the only things components may reference. Theme is a `data-theme` attribute set by an inline `<head>` script (reads localStorage, falls back to `prefers-color-scheme`) to avoid flash; KaTeX inherits `currentColor` so equations adapt automatically; Mafs exposes `--mafs-bg/--mafs-fg/--mafs-line-color` which you map to tokens. Prose styling lives in `src/styles/prose.css` (a hand-written `.prose` with heading rhythm, callout styles, `.katex-display` spacing) rather than a generic typography plugin, so the two of you share one rhythm.

### Keeping two Claude-driven workstreams visually unified

1. **`CLAUDE.md` (root, < 200 lines)** with commands, directory map, and the ten non-negotiables ("tokens only", "no new colours", "MDX components come from `src/components/mdx`", "widgets follow the contract", "math macros from `katex-macros.ts`", "conventional commits with scope"). Anthropic's own guidance recommends a small root file plus path-scoped `.claude/rules/*.md` that load on demand ([Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)).
2. **Path-scoped rules:** `.claude/rules/content.md` (lesson structure, frontmatter, notation, when to use `<Definition>` vs `<Theorem>`, how to add a glossary term), `.claude/rules/widgets.md` (contract above), `.claude/rules/ui.md` (Base UI only, tokens only, motion durations/easings, spacing scale).
3. **A living kitchen-sink page** (`/dev/kitchen-sink`, excluded from nav) rendering every MDX component, every token swatch, and one of each widget in light and dark. Playwright snapshots it; any style drift fails CI.
4. **`DESIGN.md`** with the voice (textbook-calm, no exclamation marks), spacing scale, motion rules (150/250/400 ms, standard easing), and screenshots of the reference sites in §10.
5. **Lint rules as guardrails:** `eslint-plugin-astro`, `typescript-eslint` strict, `react-hooks` 7, a tiny custom ESLint rule (or grep in CI) that rejects hex colours and `style={{ color: … }}` outside `src/styles/`.

---

## 9. Repo and tooling

| Concern | Choice | Notes |
|---|---|---|
| Package manager | **pnpm 12.9.1** | pnpm 12 (Aug 2026) rewrote the install engine in Rust; overrides (needed for KaTeX) and strict node_modules catch phantom deps. Commit `pnpm-lock.yaml`. |
| Node | **24 LTS** | Astro 7, Vitest 5 require >= 22.12.0; Node 24 is Active LTS until 2026-10-20, then Maintenance; Node 26 enters LTS this month ([Node release schedule](https://endoflife.date/nodejs)). Pin in `.nvmrc` and `engines`. |
| TypeScript | **6.0.3, `strict: true`** | TypeScript 7.0.2 (Go-native "Corsa", GA 2026-07-08, 8–12x faster — [InfoQ](https://www.infoq.com/news/2026/08/typescript-7-released/)) is out, **but `@astrojs/check` 0.9.10 peers `typescript ^5 || ^6` and `typescript-eslint` 8.71.1 requires `< 6.1`**. Stay on 6.0.x until both support 7; revisit in a month. |
| Lint/format | **ESLint 10.12.0 + Prettier 3.9.9** | Biome 2.5.15 is 10–25x faster, but it still lacks full `.astro` support and its type-aware rules are younger than typescript-eslint's ([PkgPulse Biome vs ESLint 2026](https://www.pkgpulse.com/blog/biome-vs-eslint-prettier-linting-2026)). You need `eslint-plugin-astro` 3.2.1, `typescript-eslint` 8.71.1, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-mdx` 3.8.1, `prettier-plugin-astro` 1.1.0, `prettier-plugin-tailwindcss` 0.8.1. (`eslint-plugin-jsx-a11y` 6.10.2 does not yet declare ESLint 10 support; add it with an override or skip.) |
| Unit tests | **Vitest 5.0.3** (2026-09-03; [Vitest 5 changes](https://blog.openreplay.com/vitest-5-changes/)) | Cover `src/lib/**` (FSRS scheduling wrapper, quiz grading, graph validation, markdown plugins). `vitest-browser-react` 2.3.0 for a few widget behaviour tests if desired. |
| E2E + visual | **Playwright 1.63.0** | Smoke-navigate every published lesson, assert no KaTeX `.katex-error`, and `toHaveScreenshot()` the kitchen-sink page plus two lessons in light/dark. |
| Hooks | **lefthook 2.1.17** + **commitlint 21.2.3** (`config-conventional`) | Pre-commit: prettier + eslint on staged files; commit-msg: conventional commits. |
| CI | GitHub Actions: `pnpm install --frozen-lockfile`, `astro check`, `tsc --noEmit`, `eslint`, `vitest run`, `astro build`, `validate-graph`, Playwright on PRs | Actions: `actions/checkout` v7, `actions/setup-node` v7, `pnpm/action-setup` v6. |
| Deploy | **Cloudflare Workers Static Assets** via `cloudflare/wrangler-action` v4.1.3 (or Cloudflare's git integration), **GitHub Pages** via `withastro/action` v6.1.3 as fallback | Cloudflare: unlimited bandwidth on the free tier and a root `*.workers.dev` domain (no `base` path to fight), preview URLs per branch; Cloudflare now positions Workers Static Assets as the successor to Pages for new projects ([Workers static assets](https://developers.cloudflare.com/workers/static-assets/), [Pages vs Workers 2026](https://www.morphllm.com/comparisons/cloudflare-pages-vs-workers)). GitHub Pages has a 100 GB/month soft limit and no PR previews, and a project site forces `base: '/AML'`, which is a recurring source of broken asset paths for agents ([Astro GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/)). |

### Branch strategy for two people + agents

- **Trunk-based with short-lived branches**: `main` is always deployable; branches named `content/l07-logistic`, `widget/gd-trajectory`, `ui/term-popover`, `graph/mastery-colours`. PRs required (one approval), squash-merge, CI green. Each person runs Claude Code in their own `git worktree`; subagents get `isolation: worktree`.
- **CODEOWNERS** by directory so reviews route automatically: `src/content/** @content-owner`, `src/components/** src/widgets/** src/styles/** src/layouts/** @app-owner`, shared files (`src/content/concepts.yaml`, `content.config.ts`, `astro.config.mjs`, `CLAUDE.md`, `.claude/**`) require both.
- **Conventional commits with scopes**: `content(l07): add logistic regression derivation`, `widget(gd): add momentum toggle`, `ui(popover): …`, `graph: …`, `chore(deps): …`. commitlint enforces it; the changelog becomes a semester log.
- **Contracts, not coordination:** the MDX component API (`src/components/mdx/README.md`), the widget contract, and the collection schemas are the interfaces. Content work never needs to touch components; component work never edits lesson prose. Schema changes are PRs with both reviewers.
- **Conflict hot spots:** `concepts.yaml` and `pnpm-lock.yaml`. Mitigate the first with one-concept-per-line YAML and a validation script; the second by never hand-editing and re-running `pnpm install` on conflict.

### Proposed directory layout

```
AML/
├─ CLAUDE.md                     # <200 lines: commands, map, non-negotiables
├─ DESIGN.md                     # voice, spacing, motion, references
├─ CODEOWNERS
├─ .claude/rules/{content,widgets,ui}.md
├─ .github/workflows/{ci,deploy}.yml
├─ astro.config.mjs  tsconfig.json  eslint.config.js  .prettierrc  lefthook.yml  wrangler.jsonc
├─ scripts/                      # new-lesson, validate-graph, capture-notebook, build-graph-layout
├─ public/                       # lectures/*.pdf, og images, favicons
├─ src/
│  ├─ content.config.ts
│  ├─ content/                   # ---- CONTENT WORKSTREAM ----
│  │  ├─ units.yaml
│  │  ├─ concepts.yaml           # graph nodes (shared ownership)
│  │  ├─ edges.yaml              # optional curated cross-links
│  │  ├─ lessons/u01-regression/01-linear-regression.mdx …
│  │  ├─ glossary/covariance.mdx …
│  │  └─ flashcards/l01-linear-regression.yaml …
│  ├─ components/                # ---- APP WORKSTREAM ----
│  │  ├─ mdx/                    # Definition, Theorem, Proof, Derivation/Step, Callout, Term, Figure, Quiz/Q, Widget, EqRef
│  │  ├─ ui/                     # Base UI-based primitives (shadcn-style, token-styled)
│  │  ├─ learn/                  # FlashcardSession, QuizRunner, ProgressRing, XpToast, StreakBadge
│  │  ├─ graph/                  # ConceptGraph island + hooks
│  │  └─ shell/                  # Header, Sidebar, ThemeToggle, Search (pagefind)
│  ├─ widgets/                   # one folder per interactive: Widget.tsx + meta.ts (+ README)
│  │  ├─ registry.ts  WidgetHost.tsx  _shared/ (useVizTheme, Param, Frame)
│  │  ├─ gd-trajectory/  sigmoid-boundary/  roc-curve/  ridge-lasso/  gaussian-contours/  kmeans/  loss-surface-3d/
│  ├─ layouts/                   # Base.astro, Lesson.astro, Unit.astro
│  ├─ pages/                     # index, units/[unit], lessons/[...slug], graph, review, glossary, dev/kitchen-sink
│  ├─ lib/                       # srs/ (ts-fsrs wrapper, Dexie db), progress/, graph/ (build, validate), markdown/ (katex-macros, plugins)
│  ├─ stores/                    # nanostores: progress, prefs, session
│  └─ styles/                    # tokens.css, global.css, prose.css, katex.css (overrides), mafs.css
└─ tests/  unit/  e2e/
```

---

## 10. Reference sites and what to borrow

- **Distill.pub** ([distill.pub](https://distill.pub/), [Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/)) — the gold standard for layout: a narrow measure for prose, wide "breakout" figures, margin notes, numbered figures with captions, restrained palette. Borrow the column system, figure captions, and the discipline of one idea per interactive.
- **MLU-Explain** ([mlu-explain.github.io](https://mlu-explain.github.io/)) — Amazon's visual essays (D3 + Svelte + scroll-driven steps). Borrow the scrollytelling pattern where a sticky figure updates as you read, the bias-variance and ROC/AUC visuals specifically, and the "start with a dataset you can see" opening.
- **Seeing Theory** ([seeing-theory.brown.edu](https://seeing-theory.brown.edu/)) — D3 probability/statistics explorables. Borrow its slow, legible animations (sampling, CLT), the per-unit structure of three visualizations, and its calm colour palette.
- **The Illustrated Transformer** ([jalammar.github.io](https://jalammar.github.io/illustrated-transformer/)) — static but exemplary: consistent colour-coding of tensors across every figure. Borrow the rule that each mathematical object keeps its colour throughout a lesson (your `\htmlClass` tokens enable exactly this).
- **Explorable Explanations / Nicky Case** ([explorabl.es](https://explorabl.es/), [ncase.me](https://ncase.me/)) — borrow the "play first, then explain" sequencing and the habit of asking the reader to predict before revealing.
- **Bartosz Ciechanowski** ([ciechanow.ski](https://ciechanow.ski/)) — the highest bar for polish: every figure is draggable, colour-coded to the text, with reduced-motion fallbacks. Borrow the practice of linking words in prose to the figure elements they describe (hover a term, the element highlights).
- **Immersive Linear Algebra** ([immersivemath.com](https://immersivemath.com/ila/)) — textbook structure with interactive figures inline. Borrow its numbered definitions/theorems and the idea that every figure is also a worked example.
- **setosa.io / Explained Visually** ([setosa.io/ev](https://setosa.io/ev/)) — borrow the micro-explorable: one small interactive that does one thing (eigenvectors, PCA, Markov chains).
- **Dive into Deep Learning** ([d2l.ai](https://d2l.ai/)) — borrow the code-companion rhythm (concept → equation → runnable code → output) and the exercise sections.
- **3Blue1Brown** ([3blue1brown.com](https://www.3blue1brown.com/)) — borrow the visual grammar for gradient descent (contours + ball), linear transformations as grid deformations, and the restraint of dark backgrounds with a few saturated accents. Your 3-D loss surface widget should feel like this.
- **Gradient-descent visualisers** (e.g., [Lili Jiang's "Why momentum really works", Distill 2017](https://distill.pub/2017/momentum/)) — borrow the paired view: trajectory on contours on the left, loss-vs-iteration on the right, both driven by the same sliders.

---

## Appendix A — Exact packages (npm latest, 2026-10-06)

**Runtime**
`astro@7.3.6`, `@astrojs/mdx@8.0.3`, `@astrojs/react@7.0.1`, `@astrojs/markdown-remark@7.3.2`, `@astrojs/sitemap@3.7.4`, `react@19.3.0`, `react-dom@19.3.0`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `oxc-transform-react@0.153.0` (peer of @astrojs/react 7; install if pnpm complains), `katex@0.19.0` (+ `pnpm.overrides.katex = 0.19.0`), `@types/katex@0.16.8`, `remark-math@6.0.0`, `rehype-katex@7.0.1`, `remark-directive@4.0.0`, `rehype-slug@6.0.0`, `rehype-autolink-headings@7.1.0`, `unist-util-visit@5.1.0`, `astro-expressive-code@0.44.2`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `prettier-plugin-tailwindcss@0.8.1`, `@base-ui/react@1.8.0`, `lucide-react@1.52.0`, `clsx@2.1.1`, `tailwind-merge@3.7.0`, `class-variance-authority@0.7.1`, `motion@14.0.0`, `mafs@0.21.0`, `d3@7.9.0` (or modules: `d3-scale`, `d3-shape`, `d3-contour`, `d3-interpolate`, `d3-random`, `d3-force@3.0.0`, `d3-zoom`, `d3-drag`, `d3-selection`), `@types/d3@7.4.3`, `react-use-measure@2.1.7`, `nanostores@1.5.5`, `@nanostores/persistent@1.3.5`, `@nanostores/react@2.0.1`, `dexie@4.4.6`, `ts-fsrs@5.4.2`, `zod@4.6.5` (Astro re-exports its own zod via `astro:content`; only add if you need zod outside collections), `astro-pagefind@2.0.1` + `pagefind@1.5.2` (static search), `@fontsource-variable/inter@5.3.0`, `@fontsource-variable/source-serif-4@5.3.0`, `@fontsource/stix-two-text@5.3.0` (optional), `@fontsource-variable/geist@5.3.0` (optional).

**3-D (only for showcase widgets)**
`three@0.186.1`, `@react-three/fiber@9.8.1`, `@react-three/drei@10.7.9`.

**Graph fallback**
`react-force-graph-2d@1.29.2`.

**Dev / tooling**
`typescript@6.0.3` (not 7.0.2 yet), `@astrojs/check@0.9.10`, `eslint@10.12.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.71.1`, `eslint-plugin-astro@3.2.1`, `astro-eslint-parser@3.2.0`, `eslint-plugin-react-hooks@7.1.1`, `eslint-plugin-mdx@3.8.1`, `globals@17.13.0`, `prettier@3.9.9`, `prettier-plugin-astro@1.1.0`, `vitest@5.0.3`, `happy-dom@20.14.5` (or `jsdom@30.1.2`), `@testing-library/react@16.3.3`, `vitest-browser-react@2.3.0` (optional), `@playwright/test@1.63.0`, `lefthook@2.1.17`, `@commitlint/cli@21.2.3`, `@commitlint/config-conventional@21.2.3`, `wrangler@4.148.0`, `pnpm@12.9.1`.

**GitHub Actions**: `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`, `withastro/action@v6` (Pages path) or `cloudflare/wrangler-action@v4`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`, `actions/configure-pages@v6`.

**Deliberately excluded**: `next@16.4.0`, `velite@0.4.0`, `@docusaurus/core@3.10.2`, `@astrojs/starlight@0.42.5`, `plotly.js@4.1.2`, `recharts@3.10.1`, `@visx/visx@4.0.0`, `@observablehq/plot@0.6.17`, `reagraph@4.32.0`, `sigma@3.0.3`, `cytoscape@3.34.3`, `vis-network@10.1.2`, `jsxgraph@1.14.0`, `mathjax@4.1.3`, `pyodide@314.0.7` (CDN-load only, not bundled), `@biomejs/biome@2.5.15`.

## Appendix B — First-week spike checklist

1. `pnpm create astro@latest` → add react, mdx, tailwind, expressive-code; switch `markdown.processor` to `unified()`; add the KaTeX override; render one lesson with `aligned`, `align` numbering, `\tag`, macros, and a `\htmlClass` colour in light/dark.
2. Confirm Mafs 0.21.0 mounts under React 19.3 inside a `client:visible` island; map its CSS variables to tokens.
3. Build `Term` popover (Base UI) with a glossary entry containing math.
4. Build the `Widget` registry + one widget (gradient descent on contours with lr/momentum sliders) end to end, including `meta.ts` validation.
5. Generate `graph.json` from three stub lessons; render the SVG/d3-force graph with prerequisite highlighting; snapshot it in Playwright.
6. Wire ts-fsrs + Dexie with one deck; verify export/import.
7. Deploy `main` to Cloudflare and a PR branch to a preview URL; set up CODEOWNERS and lefthook.
