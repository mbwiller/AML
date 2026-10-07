# AML Atlas

An interactive, mathematically rigorous learning platform for **CS 5785 Applied Machine Learning** (Cornell Tech, Fall 2026). Every result the lectures state, we derive step by step; every prerequisite gets a sticky-note refresher where it is used; every method gets an explorable you can drag; every unit ends at the homework it prepares you for; and a concept graph shows how it all connects.

**Status (2026-10-06):** planning complete, build starting. Read `VISION.md`.

## Start here

| File | What it is |
|---|---|
| `VISION.md` | What we are building and why: requirements, principles, UX, feature specs, lesson plan, architecture, milestones |
| `STYLE_GUIDE.md` | How it looks and how code and content are written: voice, notation, tokens, components, widget contract, git conventions |
| `CLAUDE.md` | The brief loaded into every Claude Code session on both developers' machines |
| `docs/WORKSTREAMS.md` | Who builds what, the integration contracts, backlogs, kickoff prompts |
| `docs/START-HERE-JIDE.md` | Self-contained onboarding for the content workstream: reading order, session recipe, first five tasks |
| `docs/CONTENT_AUTHORING.md` | The MDX component contract and content schemas |
| `docs/course-map/` | Page-by-page maps of lectures L1–L10 and the homeworks: what is stated vs derived, notation, slide errors, polls, graph edges, widget ideas |
| `docs/reference/` | Pedagogy and curriculum reference; tech-stack memo |
| `AML Course Material/` | The raw lectures, code companions, homeworks, solutions, and data (read-only) |
| `CONVERSATION.md` | The founding conversation the vision is distilled from |

## Stack (summary)

Astro 7 (static) · MDX · React 19 islands · KaTeX at build time · Tailwind v4 tokens · Base UI · Mafs + D3 + Motion · d3-force concept graph · ts-fsrs + Dexie for spaced repetition · Vitest + Playwright · deployed on Vercel's free tier or run locally. Details and verified versions: `docs/reference/tech-stack.md`.

## Developing

The app scaffold is Workstream A's first PR; once merged:

```
pnpm install && pnpm dev
```

See `CLAUDE.md` for commands, the directory map, and the non-negotiables.
