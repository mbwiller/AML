---
paths:
  - "src/components/widgets/**"
---

# Widget rules (loaded when you touch widgets)

- Contract: `STYLE_GUIDE.md` §7. Folder has `Widget.tsx`, `manifest.ts` (Zod params, title, challenge, usedIn, height), `README.md`; registered in `registry.ts`; shown on `/dev/widgets`.
- Colors only from `useVizTheme()`; controls only `<Param>`; always inside `<WidgetFrame>`; seeded randomness; reserved height; keyboard-operable; 360 px wide works; both themes; reduced motion.
- "D3 computes, React draws." Prefer Mafs for coordinate planes. Pure math lives in `math.ts` with a Vitest.
- Math labels use the shared KaTeX macros and `sym-*` classes so they match the prose.
- Hydrate with `client:visible` only; keep each widget ≤150 KB gzipped (3-D excepted).
