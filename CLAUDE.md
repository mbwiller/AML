# CLAUDE.md — AML Atlas

Interactive, fully-derived learning platform for CS 5785 Applied Machine Learning (Cornell Tech, Fall 2026). Two developers work in parallel with Claude Code; this file and the imports below load into every session so both streams produce one product.

@STYLE_GUIDE.md

## Read this first, by task

| Task | Read |
|---|---|
| Any session | this file; `VISION.md` §6 (principles) |
| Writing or reviewing a lesson, glossary term, quiz, or graph YAML | `docs/CONTENT_AUTHORING.md`; the unit's file in `docs/course-map/`; `docs/reference/pedagogy-and-curriculum.md` Part B for the topic |
| Building a component, widget, page, or the practice engine | `VISION.md` §7–§9, §11–§13; `docs/reference/tech-stack.md` |
| Ingesting a new lecture or homework | `VISION.md` §9.10; `docs/course-map/00-course-overview.md`; `.claude/agents/lecture-ingester.md` |
| Deciding what to do next | `docs/WORKSTREAMS.md`; `VISION.md` §15 |

`docs/course-map/` records every slide of L1–L10 page by page (equations, what is stated vs derived, notation quirks, slide errors, polls, graph edges, widget ideas). **Do not re-read the PDFs to write a lesson**; read the course map. Re-read a PDF only when the map is ambiguous, and then fix the map in the same PR.

## Commands

The app scaffold lands in Workstream A's first PR. Once it exists:

```
pnpm install            # Node 24, pnpm 12
pnpm dev                # local preview
pnpm build              # static build (runs validate:content)
pnpm validate:content   # schemas, ids, [[term]] resolution, graph DAG, homework safety
pnpm lint && pnpm test  # eslint + prettier check; vitest
pnpm test:e2e           # playwright smoke + screenshots
```

## Map

```
AML Course Material/   raw slides, notebooks, homeworks, data — READ ONLY, never edit
docs/course-map/       the per-lecture content maps + homework map (source of truth for content)
docs/reference/        pedagogy & curriculum reference; tech-stack memo
docs/CONTENT_AUTHORING.md   MDX component contract + schemas (content ↔ platform interface)
docs/WORKSTREAMS.md    who owns what; backlogs; kickoff prompts
src/content/**         CONTENT workstream (lessons, glossary, graph, quizzes, flashcards, cases, homework)
src/components/**, src/lib/**, src/pages/**, src/layouts/**, src/styles/**   PLATFORM workstream
.claude/agents/        shared subagents: lesson-writer, widget-builder, math-reviewer, content-reviewer, lecture-ingester
.claude/rules/         path-scoped rules that load when you touch content / widgets / ui
```

## Non-negotiables

1. Every equation on the site is derived, proven, or explicitly cited as "stated on slide L*n* p.*k*" with a link to its derivation. No "it can be shown".
2. One algebraic move per derivation step; every step has a justification; ≤15 steps or chunk/collapse.
3. The professor's notation, normalized per `STYLE_GUIDE.md` §2.1; macros from `src/lib/katex-macros.ts`; never `\textcolor`.
4. Prerequisites are `[[term]]` sticky notes that exist in `src/content/glossary/`.
5. Colors, type, spacing, motion come from `src/styles/tokens.css` and `STYLE_GUIDE.md` §4. No hex/rgb outside that file. No new UI libraries.
6. MDX components come from `src/components/mdx/` and are provided globally; lesson files have no imports.
7. Widgets follow the contract in `STYLE_GUIDE.md` §7 (manifest, frame, tokens, keyboard, static fallback, both themes).
8. Never publish a numeric answer specific to a live homework (`VISION.md` R17). HW3 is live until 2026-10-19.
9. Never edit `AML Course Material/`. Never commit `.DS_Store`, build output, or `.claude/settings.local.json`.
10. Conventional commits with scopes (`content(u6-l3): …`, `widget(gda-fitter): …`); small PRs; `main` always builds.

## Workflow

- Branch per lesson or per widget: `content/u6-l3-naive-bayes`, `platform/derivation-component`. Open a PR with the template checklist; squash-merge.
- Use the shared subagents rather than doing everything in the main session: `lesson-writer` drafts, `math-reviewer` checks every step (required before `published`), `content-reviewer` checks voice/structure/ids/homework safety, `widget-builder` implements to the contract, `lecture-ingester` turns a new PDF into a course-map section and lesson stubs.
- Keep sessions focused: one lesson or one widget; read only the course-map file for the unit at hand; end with a PR.
- Changes to `VISION.md`, `STYLE_GUIDE.md`, `docs/CONTENT_AUTHORING.md`, `src/content.config.ts`, `src/styles/tokens.css`, `.claude/**` need the other developer's review.

## Course facts you will need

CS 5785, Prof. Kyra Gan, Mon/Wed 7:30 pm. Grading: participation 10%, HW 40%, midterm Kaggle 25%, final project 25%. Due: HW3 2026-10-19 (Naive Bayes + GDA), midterm Kaggle 2026-11-02, HW4 2026-11-18, HW5 2026-12-07, final 2026-12-17. Units 0–8 cover L1–L10 (see `docs/course-map/00-course-overview.md`). The lecture notation follows the open Kuleshov AML notes for this course number.
