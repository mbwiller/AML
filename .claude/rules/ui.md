---
paths:
  - "src/components/**"
  - "src/layouts/**"
  - "src/pages/**"
  - "src/styles/**"
---

# UI rules (loaded when you touch the app shell)

- Tokens only (`src/styles/tokens.css`; `STYLE_GUIDE.md` §4): no hex/rgb/named colors, no arbitrary Tailwind values, no inline styles except computed geometry.
- Primitives from `src/components/ui/` (Base UI, restyled). No other UI libraries. Icons: lucide-react.
- Static → `.astro`; interactive → React island with `client:visible` (widgets) or `client:idle` (controls). Never `client:load` on lesson pages.
- Motion: 120/250/400 ms, `cubic-bezier(0.2, 0, 0, 1)`, respects `prefers-reduced-motion`.
- Accessibility: visible focus rings, accessible names, Escape closes popovers, color never the only signal, KaTeX `htmlAndMathml`.
- Per-lesson-page JS budget ≤60 KB gzipped excluding widgets. Run `pnpm build` and check the kitchen-sink page in both themes before the PR.
