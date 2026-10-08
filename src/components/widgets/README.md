# src/components/widgets

The explorables (VISION.md §9.3) and the framework that mounts them. The contract is `STYLE_GUIDE.md` §7; this file is how to meet it.

## How a `<Widget>` gets on the page

```
<Widget name="gaussian-2d-covariance" rho={0.75} challenge="…" />      (MDX, no imports)
  └─ src/components/mdx/Widget.astro            build time
       ├─ manifests.ts → getManifest(name)       no React: Zod + pure math only
       ├─ validateWidgetParams(manifest, props)  unknown / out-of-range props fail the build
       ├─ renders <figure class="widget" data-widget data-widget-params style="--widget-height">
       │    header (title, challenge) + static fallback SVG (manifest.fallback)
       └─ <WidgetHost client:visible name params height />   the one React island
            ├─ registry[name] via React.lazy  → the widget's own code-split chunk
            ├─ params state; restores #w=<name>:<base64url> after the module loads
            ├─ listens for `aml:figure-state` on its figure → `figureState` prop
            ├─ error boundary → static fallback shown again
            └─ <WidgetFrame> (reset, copy state link) → <Widget params initial setParams figureState />
```

An unknown `name` renders the M0 placeholder, so content can be written before a widget ships.

The figure gets `data-hydrated` once the widget module has loaded; `src/styles/widgets.css` hides the fallback overlay then, and shows it again for print. Before that (and without JavaScript) the reader sees the fallback at the reserved height, so there is no layout shift.

## Adding a widget

1. **Folder** `src/components/widgets/<name>/` with:
   - `manifest.ts`: `export const params = z.strictObject({ … every key .default(…) })`, `export type Params = z.output<typeof params>`, and `export const manifest = { name, title, challenge, usedIn, height, params, fallback? } satisfies WidgetManifest<typeof params>`. Keep it React-free (it is imported at build time by `Widget.astro`). `height` is the body height to reserve at desktop width.
   - `math.ts` + `math.test.ts`: pure computation, Vitest ("D3 computes, React draws").
   - `Widget.tsx`: `export default function X({ params, initial, setParams, figureState }: WidgetProps<Params>)` and `export { manifest } from './manifest'`. Render the body only; the frame is supplied by the host. Colors from `useVizTheme()`, randomness from `useSeededRandom(params.seed)`, sliders via `<Param>` (`defaultValue={initial.key}`), booleans via `<Toggle>`, math via `<MathLabel tex>`.
   - `fallback.ts` (optional but expected): `renderFallback(params): string` returning SVG with `var(--viz-*)` colors.
   - `README.md`: what it shows, which slide figure it rebuilds (lecture + page from `docs/course-map/`), the math it depends on, the params.
2. **Register** in `registry.ts` (`'<name>': () => import('./<name>/Widget')`) and in `manifests.ts` (`[m.name]: m`). `manifests.test.ts` fails if the two disagree.
3. **Styles** for the widget's own layout go in `src/styles/widgets.css` under a short prefix (`.g2c-…`); tokens only. Mafs variables are already mapped in `src/styles/mafs.css`.
4. **Demo and tests**: it appears on `/dev/widgets` automatically. Add a Playwright case in `tests/e2e/widgets.spec.ts` (hydrate, one keyboard interaction, screenshots in both themes). Check the gzipped size of `dist/_astro/Widget.*.js` for your chunk stays ≤150 KB.
5. **Content** invokes it with `<Widget name="<name>" …params challenge="…" />`; `challenge` overrides the manifest's. Match the content's prop names exactly in the manifest.

## Shared pieces (`_shared/`)

| File | Role |
|---|---|
| `WidgetFrame.tsx` | toolbar (Reset, Copy state link + polite status) and the reserved-height body; header optional (Widget.astro renders it) |
| `Param.tsx` | `<Param label tex? unit? value min max step defaultValue onChange format?>` native range, 44 px tall, `aria-valuetext`, reset; `<Toggle>` for booleans |
| `useVizTheme.ts` | `--viz-1..6`, `positive/negative/boundary`, `field.*`, `fg/bg/surface/surface2/muted/border/accent` as computed strings; re-reads on `data-theme` changes |
| `useSeededRandom.ts` / `seeded-random.ts` | d3-random LCG from `seed`; `normal()`, `uniform()` |
| `math-label.tsx` | `<MathLabel tex display?>` runtime KaTeX with `katexOptions` from `src/lib/katex-macros.ts` |
| `state-link.ts` | `encodeStateLink`, `decodeStateLink`, `withStateLink` (`#w=<name>:<base64url json>`), unit-tested |

## Driving a widget from a derivation

`<Step figureState='{"rho":0.9}'>` marks a step; when the derivation engine reveals it, it should dispatch `new CustomEvent('aml:figure-state', { detail })` on the nearest preceding `figure[data-widget]`. The host passes `detail` to the widget as `figureState`; what the widget does with it is its own business (typically `setParams`).
