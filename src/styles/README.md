# src/styles

| File         | What it is                                                                                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `global.css` | Entry point, imported once by `src/layouts/Base.astro`. `@import 'tailwindcss'` stays first; then fonts, `tokens.css`, KaTeX, `prose.css`, and body/focus/reduced-motion defaults.                                                                                                                            |
| `tokens.css` | The design tokens (`STYLE_GUIDE.md` §4): light values on `:root`, dark on `[data-theme='dark']`, the `dark` custom variant, and the `@theme inline` bridge that turns tokens into Tailwind utilities (`bg-surface`, `text-field-ml`, `rounded-card`, `shadow-popover`, `ease-standard`, `duration-micro`, …). |
| `katex.css`  | KaTeX size and overflow overrides, the `.sym-*` semantic symbol colors, and `.math-hl`.                                                                                                                                                                                                                       |
| `prose.css`  | The hand-written `.prose` class: Source Serif 4 at 18 px / 1.6 (17 px on phones), 68 ch measure, Inter headings, lists, tables, links, inline code.                                                                                                                                                           |

## Adding a token

1. Add the light value to `:root` and the dark value to `[data-theme='dark']` in `tokens.css` (or derive it with `var()` / `color-mix()` so it follows the theme on its own).
2. If components need a utility for it, add one line to the `@theme inline` block: `--color-<name>: var(--<name>);` (colors), `--radius-<name>`, `--shadow-<name>`, or `--ease-<name>`. Durations have no Tailwind namespace; add an `@utility duration-<name>` instead.
3. Document its role in `STYLE_GUIDE.md` §4. Changes to `tokens.css` need the other developer's review.

## The no-hex rule

Color values appear only in `tokens.css`, and only as `oklch(…)` or `color-mix(…)` of other tokens. Everywhere else (components, widgets, prose, MDX) use `var(--…)` or a token utility. No `#hex`, `rgb()`, `hsl()`, or named colors; no Tailwind arbitrary values (`p-[13px]`, `text-[#…]`); no Tailwind default palette (`text-blue-500`). CI greps for all of these.
