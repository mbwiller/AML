# Workstreams: who builds what

Two people, two Claude Code sessions, one product. The split is by **directory ownership and data contracts**, so the two streams can run fully in parallel and merge daily without conflicts.

| | **Workstream A — Platform & Interactives** | **Workstream B — Content & Assessment** |
|---|---|---|
| Owner | Matt | Jide |
| Owns | `src/components/**`, `src/layouts/**`, `src/pages/**`, `src/lib/**`, `src/styles/**`, `src/data/**`, `scripts/**`, `astro.config.mjs`, CI/deploy, `.github/**` | `src/content/**` (lessons, glossary, graph YAML, quizzes, flashcards, cases, homework bridges), `docs/course-map/**` |
| Shared (both review) | `src/content.config.ts`, `src/components/mdx/index.ts` (the component list), `docs/CONTENT_AUTHORING.md`, `STYLE_GUIDE.md`, `VISION.md`, `CLAUDE.md`, `.claude/**`, `package.json` | same |
| Deliverables | The app shell, design system, MDX component library, widget framework and the widgets, the Atlas, the practice engine (FSRS, graders, boss quizzes), progress and gamification, search, ingestion scripts, deployment; the reference lessons 1.3–1.4 that prove the template | The glossary, every unit's lessons (Units 6–7 first), the quiz bank, extra flashcards, the concept-graph YAML, the clinical case pages, the homework bridges, course-map updates for new lectures |
| Primary subagents | `widget-builder`, `content-reviewer` (for the reference lessons), general-purpose for scaffolding | `lesson-writer`, `math-reviewer`, `content-reviewer`, `lecture-ingester` |

## 1. Why this split

- **Disjoint trees.** A content PR never touches a component; a platform PR never edits prose. Merge conflicts become rare and small.
- **Contracts instead of coordination.** `docs/CONTENT_AUTHORING.md` fixes the component API and the YAML schemas; `src/content.config.ts` enforces them at build time. Content written today against the contract renders correctly when the component ships tomorrow (unknown widgets show a placeholder, unknown components fail validation loudly).
- **Different rhythms.** Platform work is build-test-iterate with many small files; content work is one long, careful document at a time with a review pass. Each session stays focused on one kind of work, which keeps context small and sessions short for both of us.
- **Both streams hit HW3.** Content ships Units 6–7 by Oct 13; platform ships the three widgets those units need plus the derivation and sticky-note components by the same date.

## 2. Integration contracts

| Contract | Defined in | Changed by |
|---|---|---|
| MDX component names and props | `docs/CONTENT_AUTHORING.md` §4, implemented in `src/components/mdx/` | PR with both reviewers |
| Lesson/glossary/quiz/flashcard/graph/case/homework schemas | `docs/CONTENT_AUTHORING.md` §2, §5–§9; enforced by `src/content.config.ts` and `scripts/validate-content.ts` | PR with both reviewers |
| Widget names and params | each widget's `manifest.ts`; the catalog in `VISION.md` §9.3 | A adds widgets; B requests them by opening an issue titled `widget: <name>` with the lesson and the slide figure it rebuilds |
| Glossary ids | `src/content/glossary/*.mdx` | B; A never invents a term id |
| Graph node ids | `src/content/graph/nodes.yaml` | B; A reads them to build the Atlas |
| Design tokens and `sym-*` classes | `src/styles/tokens.css`, `STYLE_GUIDE.md` §4 | A; B uses the class names in math |
| Datasets for cases | `scripts/gen-datasets/*.ts` → `src/data/*.json`; specs in `docs/reference/pedagogy-and-curriculum.md` Part C | A generates; B specifies and consumes |

## 3. Sequencing and dependencies

Day 1 (Oct 7): both streams start at once. A scaffolds the app and ships **M0** (`VISION.md` §15): the site builds and deploys, tokens and fonts exist, KaTeX renders with the macro file, and the MDX components in the contract render *plainly* (a `<Derivation>` that just lists its steps, a `<Sticky>` that is a tooltip). B does not wait for M0: it reads the course map and writes glossary terms and Unit 6 lessons as MDX. Once M0 is on `main` (target Oct 8), B previews its content with `pnpm dev`.

Nothing in B blocks on A except final visual polish. Nothing in A blocks on B except real content to test with; A uses `docs/CONTENT_AUTHORING.md` §11's skeleton and its own reference lessons (1.3–1.4) until Unit 6 lands.

## 4. Workstream A backlog (ordered)

**M0 — Foundations (Oct 7–8)**
1. `pnpm create astro@latest` with React, MDX, Tailwind v4, Expressive Code; `markdown.processor: unified()`; remark-math + rehype-katex; the KaTeX pnpm override; `src/lib/katex-macros.ts`. Acceptance: a test lesson with `aligned`, `\tag`, macros and `\htmlClass` renders in light and dark. (Spike checklist: `docs/reference/tech-stack.md` Appendix B.)
2. `src/styles/tokens.css` from `STYLE_GUIDE.md` §4; fonts self-hosted; `data-theme` toggle without flash; `prose.css`.
3. `src/content.config.ts` with every collection in `docs/CONTENT_AUTHORING.md`; `scripts/validate-content.ts` (ids, `[[term]]` resolution, graph DAG, homework-safety flag on `live: true`); `pnpm validate:content`.
4. Plain versions of every MDX component in the contract, registered globally; the `[[term]]` remark plugin; `<Widget>` placeholder for unknown names.
5. Lesson layout (three columns, outline rail, next-lesson card), unit index, home stub; `/dev/kitchen-sink` rendering every component in both themes.
6. CI (lint, typecheck, test, build, validate) and deploy to Cloudflare with PR previews; `.github/PULL_REQUEST_TEMPLATE.md` with the definition of done.

**M1 — HW3-ready alpha (Oct 13)**
7. `<Derivation>` for real: goal banner, chunks, step reveal with keyboard, justifications in the margin, boxed result, URL fragments per step, `figureState` dispatch.
8. `<Sticky>` popover (Base UI), glossary page, field colors.
9. Widget framework: `WidgetFrame`, `Param`, `useVizTheme`, registry, `/dev/widgets`; then `bow-nb-scorer`, `gaussian-2d-covariance`, `gda-fitter`.
10. `<Check>` with MC and numeric graders (`src/lib/graders/`, tested).
11. Atlas v0: build-time graph JSON with precomputed layout; SVG + d3-force island; click → side panel; prerequisite highlighting.
12. Dataset generators for NOTES, ADVERSE, TROPO (specs in Part C).

**M2 — HW3 due (Oct 19)**
13. Flashcards: ts-fsrs wrapper + Dexie + review session UI + "due today"; auto-generation of cards from definitions and derivation results at build time; JSON export/import.
14. Widgets: `line-fit-playground`, `mse-bowl-gd`, `gd-1d-quadratic`, `gd-2d-eigen`, `dgp-sampler`.
15. Reference lessons 1.3 and 1.4 written by A (so the template is proven by its implementer), reviewed by B.
16. Homework bridge page type with readiness-gate rows.

**M3 — Midterm (Nov 2)**
17. Boss quizzes, mastery levels, XP, streaks, Atlas mastery glow, "you vs your past self".
18. Widgets: `threshold-roc`, `poly-degree-overfit`, `ridge-lasso-geometry`, `regularization-path`, `sigmoid-fit-1d`, `coin-mle`, `kmeans-stepper`.
19. Search (Pagefind), materials page with page-to-lesson index, cases pages, print stylesheet, Lighthouse ≥90/95.
20. `scripts/ingest-lecture` helpers (PDF page images for the agent, course-map template, stub generator).

## 5. Workstream B backlog (ordered)

**M0 — Foundations (Oct 7–8)**
1. Read `docs/course-map/00-course-overview.md`, `04-lectures-L8-L10.md`, `05-homeworks.md`, `docs/CONTENT_AUTHORING.md`, and Part B topics (10)–(12) of `docs/reference/pedagogy-and-curriculum.md`.
2. Glossary: the ~25 terms Units 6–7 need (Bayes' rule, prior/likelihood/posterior, conditional independence, chain rule of probability, Bernoulli, categorical/multinomial, log-likelihood, Lagrange multipliers, Beta prior, log-sum-exp, multivariate Gaussian, covariance matrix, determinant, matrix inverse, trace, quadratic form, matrix calculus identities, positive semi-definite, eigenvectors as ellipse axes, …).
3. `src/content/graph/nodes.yaml` seeded from the "Concept-graph edges" sections of course-map files 01–04 (ids first; summaries can follow).
4. Lessons 6.1 and 6.3 drafted against the contract (`status: draft`).

**M1 — HW3-ready alpha (Oct 13)**
5. Unit 6 complete: 6.1 generative vs discriminative, 6.2 text as features, 6.3 Naive Bayes (with the Laplace smoothing, NB-is-linear, and multinomial sections the slides lack), 6.4 the spam exercise walkthrough.
6. Unit 7 complete: 7.1 multivariate Gaussian and covariance, 7.2 GDA MLE derived, 7.3 shared covariance ⇒ sigmoid posterior and the logistic-regression comparison.
7. Quiz bank for Units 6–7 including every poll from L8–L10; ≥10 items per lesson.
8. `src/content/homework/hw3.mdx` with `live: true`: skills map and lesson links only.
9. `math-reviewer` and `content-reviewer` passes on all seven lessons; flip to `review`.

**M2 — HW3 due (Oct 19)**
10. Units 1 and 2 (seven lessons) using the same process; glossary to ≥50 terms.
11. `hw1.mdx` with the walkthrough from `05-homeworks.md`; Unit 8 (k-means) drafted.
12. When L11/L12 land: run `lecture-ingester`, review its course-map section, place the unit, stub the lessons.

**M3 — Midterm (Nov 2)**
13. Units 3, 4, 5 and 8 complete; `hw2.mdx` with walkthrough and "level 2"; cases pages for all eight examples; Units 9–11 as lectures land; `hw3.mdx` flipped to `live: false` with the walkthrough after Oct 19.

## 6. Cadence and protocol

- **Daily:** push small PRs; review the other person's PRs that touch shared files within the day; keep `main` green.
- **Weekly (20 minutes):** walk the milestone table in `VISION.md` §15, re-prioritize, log any decision in `docs/decisions/`.
- **When a lecture lands:** whoever is free runs the ingestion (`VISION.md` §9.10); B reviews the course-map section; both agree on unit placement in the PR.
- **When a contract must change:** open the PR, tag the other person, do not merge without their review; update `docs/CONTENT_AUTHORING.md` in the same PR.
- **Session hygiene (both streams):** one lesson or one widget per session; start the session by naming the files you will touch; read only the course-map file for the unit at hand; finish with a PR, not a pile of uncommitted edits.

## 7. Kickoff prompts

Paste these into Claude Code in the repo root on day 1.

**Matt (Workstream A):**

> Read `CLAUDE.md`, then `VISION.md` §7–§9 and §11–§13, `STYLE_GUIDE.md`, `docs/CONTENT_AUTHORING.md`, and `docs/reference/tech-stack.md` §2–§3 and Appendix B. Then execute Workstream A item 1 from `docs/WORKSTREAMS.md` §4: scaffold the Astro 7 app on a branch `platform/scaffold`, with the unified processor, KaTeX and the override, the macro file, tokens, fonts, and dark mode. Prove it with a test lesson that renders `aligned`, `\tag`, our macros, and `\htmlClass` in both themes. Open a PR with screenshots. Use subagents in parallel for independent pieces (tokens.css, content.config.ts, CI) once the scaffold builds.

**Jide (Workstream B):**

> Read `CLAUDE.md`, then `VISION.md` §6, §8, §10.1 (Units 6–7), and §9.1–9.2; `STYLE_GUIDE.md` §1–§3; `docs/CONTENT_AUTHORING.md` in full; and `docs/course-map/04-lectures-L8-L10.md`. Then execute Workstream B item 2 from `docs/WORKSTREAMS.md` §5 on a branch `content/u6-glossary`: write the glossary terms Units 6–7 need, one MDX file each, following §5 of the authoring guide. Open a PR. Next session: lesson 6.3 Naive Bayes with the `lesson-writer` agent, then a `math-reviewer` pass, on branch `content/u6-l3-naive-bayes`.

## 8. Conflict avoidance

- Never edit the other stream's tree without a PR they review.
- `nodes.yaml`, `edges.yaml`, and the quiz YAML are one-record-per-block with blank lines between records, so diffs stay local.
- `pnpm-lock.yaml` is never hand-edited; on conflict, take `main` and re-run `pnpm install`.
- Widget names, glossary ids, and node ids are claimed by opening the file; check `git log -- <path>` before creating a new one with a similar name.
