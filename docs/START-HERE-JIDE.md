# Start here: Workstream B (Content & Assessment)

This file is for the Claude Code session Jide runs in this repo. It is self-contained: follow it top to bottom, and do not read more than it tells you to for the task at hand.

## What this project is, in four lines

AML Atlas turns CS 5785 Applied Machine Learning (Cornell Tech, Fall 2026) into an interactive site where every result the slides *state*, we *derive* step by step; every prerequisite gets a sticky-note refresher where it is used; every method gets an explorable; every unit ends at the homework it prepares you for; and a concept graph shows how it all connects. Matt builds the platform (components, widgets, graph, practice engine). **You build the content**: glossary, lessons, quiz banks, graph data, cases, homework bridges. The two streams meet through a written contract, so you never wait on a component to write a lesson.

## Your workstream in one table

| | |
|---|---|
| You own | `src/content/**` and `docs/course-map/**` |
| You never edit | `src/components/**`, `src/lib/**`, `src/styles/**`, `AML Course Material/**` |
| Your contract | `docs/CONTENT_AUTHORING.md` (component names, props, frontmatter, YAML schemas, definition of done) |
| Your source of truth for *what the slides say* | `docs/course-map/` (every slide of L1–L10 recorded page by page; do **not** open the PDFs unless the map is ambiguous) |
| Your source of truth for *what a topic must contain* | `docs/reference/pedagogy-and-curriculum.md` Part B (one checklist per topic, with free references in the same notation) |
| Your voice and notation rules | `STYLE_GUIDE.md` §1–§3 |
| Your agents | `lesson-writer` (drafts), `math-reviewer` (checks every step; required), `content-reviewer` (voice, structure, ids), `lecture-ingester` (new PDF → course map) |
| First priority | Units 6 and 7, because HW3 (due 2026-10-19) is on Naive Bayes and GDA |

## Reading order (do this once, in the first session)

1. `CLAUDE.md` (loads automatically; skim the non-negotiables).
2. `VISION.md` §6 (principles), §8 (lesson anatomy), §10.1 (the lesson plan; read the Unit 6 and Unit 7 entries closely).
3. `STYLE_GUIDE.md` §1 (voice), §2 (notation and typesetting), §3 (structure).
4. `docs/CONTENT_AUTHORING.md` in full. The skeleton in §11 is what a finished lesson looks like.
5. `docs/course-map/00-course-overview.md` (unit map, notation conventions, known slide errors).
6. `docs/course-map/04-lectures-L8-L10.md` (your first unit's material).

Everything else is read only when a task needs it.

## The per-session recipe

One lesson (or one batch of glossary terms) per session. Always:

1. `git pull origin main`, then `git switch -c content/<unit>-<thing>` (for example `content/u6-l3-naive-bayes`).
2. Say which files you will create or edit before you start.
3. Draft with `@lesson-writer` (give it the lesson id from `VISION.md` §10.1 and the course-map section). For glossary batches or YAML, write directly.
4. Review with `@math-reviewer` (every derivation) and `@content-reviewer` (everything else). Fix findings; re-run until both verdicts are clean.
5. If the app scaffold exists on `main` (there is a `package.json`), run `pnpm install` once, then `pnpm validate:content` and fix anything it reports. If the scaffold is not there yet, self-check against `docs/CONTENT_AUTHORING.md` §10 instead.
6. Commit with a conventional message, for example `content(u6-l3): derive the Bernoulli NB MLE and Laplace smoothing`, push, and open a PR using the template. Set `status: review` in the lesson frontmatter; Matt flips it to `published`.
7. Stop. Next lesson, next session.

Keep sessions focused: read only the course-map file for the unit at hand, and let the agents carry the long drafts and reviews.

## Your first five tasks

**Task 1: glossary for Units 6–7.** Branch `content/u6-u7-glossary`. Create one MDX file per term in `src/content/glossary/` using the format in `docs/CONTENT_AUTHORING.md` §5 (≤150 words, "what it is" + "how ML uses it", `field`, `firstUsedIn`). Terms: `bayes-rule`, `prior-likelihood-posterior`, `conditional-probability`, `chain-rule-probability`, `conditional-independence`, `iid`, `bernoulli`, `categorical`, `multinomial`, `likelihood-vs-probability`, `log-likelihood`, `log-rules`, `first-order-condition`, `second-order-condition`, `lagrange-multipliers`, `beta-prior`, `conjugate-prior`, `log-sum-exp`, `gaussian`, `multivariate-gaussian`, `covariance`, `covariance-matrix`, `determinant`, `matrix-inverse`, `trace`, `quadratic-form`, `matrix-calculus-identities`, `positive-semidefinite`, `eigenvectors`, `euclidean-distance`, `z-score`, `argmax`. The three-sentence refreshers under "Prerequisite / sticky-note concepts" in `docs/course-map/04-lectures-L8-L10.md` are your raw material; the glossary list in `docs/reference/pedagogy-and-curriculum.md` has the one-liners. Done when every file validates (or passes the §5 format by inspection) and the PR is open.

**Task 2: lesson 6.1, generative vs discriminative.** Branch `content/u6-l1-generative-vs-discriminative`. Source: `docs/course-map/04-lectures-L8-L10.md`, L8 pp. 19–43 and L9 pp. 2–5. It is short and proves your workflow end to end. Derivations: the Bayes classifier (why $p(x)$ drops out), its optimality for 0/1 loss, and that the MLE of a joint model splits into a prior problem and a class-conditional problem. Include the L8 p.37 poll trap (0.6 vs 0.4 class-conditionals) as a pitfall and a quiz item. Clinical hook from the ADVERSE case. Also add the Unit 6 nodes to `src/content/graph/nodes.yaml` (ids from the "Concept-graph edges" section of the course map) and start `src/content/quizzes/u6-generative-models-and-naive-bayes.yaml`.

**Task 3: lesson 6.3, Naive Bayes.** Branch `content/u6-l3-naive-bayes`. Source: L9 pp. 20–40 and L10 pp. 3–5. This is the HW3 core. Derivations the slides lack and you must supply: the $2^d - 1$ parameter count (fixing the slide's $2^{d-1}$), the Bernoulli NB MLE for $\psi_{jk}$ (coin-flip style) and $\phi_k$ (Lagrange multiplier on the simplex), **Laplace smoothing** as a Beta-prior MAP estimate (the notebooks clip to $10^{-14}$ after hitting 34 zero probabilities; explain why that is a hack), log-space prediction with log-sum-exp, and **NB is a linear classifier** (write out the log-odds). Add a "beyond the slides" section on multinomial NB. Include every L9 poll (pp. 27, 39, 40). NOTES case for the worked example. Widget placeholder: `bow-nb-scorer`.

**Task 4: lessons 6.2 (text as features) and 6.4 (the spam exercise walkthrough).** One branch each. 6.4 itemizes all 24 tasks of `NaiveBayes_Spam_exercise` and what the solution did; the course map already lists them.

**Task 5: Unit 7 (7.1, 7.2, 7.3).** One branch each. Source: L9 pp. 41–46 and L10 pp. 6–21 plus Part B topic (12) in the pedagogy reference. The slides never write the multivariate Gaussian density, never carry out the GDA MLE, and never show that shared covariance gives a linear boundary and a sigmoid posterior; all three are yours to derive. Then `src/content/homework/hw3.mdx` with `live: true` (skills map and lesson links only; no answers), and the Unit 6–7 quiz banks to ≥10 items per lesson.

After Task 5 (target: Oct 13), continue with Units 1 and 2, the HW1 bridge, and Unit 8, in that order (`docs/WORKSTREAMS.md` §5).

## Rules that will save you a review round

- Every equation is derived here, proven here, or cited with `<SlideRef>` plus a link to where it is derived. "It can be shown" is banned.
- One algebraic move per `<Step>`, a `justification` on every step, `sticky` whenever a prerequisite is used, ≤15 steps per derivation (chunk or collapse beyond that).
- Normalize the professor's notation per `STYLE_GUIDE.md` §2.1 and footnote the slide's variant with `<Callout type="slide">`. Mark material the slides lack with `<Callout type="beyond">`.
- `[[term]]` for every prerequisite; create the glossary file if it is missing.
- Ids are kebab-case and permanent. Quiz items carry `source: "L9 p.27 poll"` when they come from a poll.
- Numbers in worked examples come from the notebooks or the generated case data, never from memory.
- Never write a numeric answer specific to a live homework. HW3 is live until 2026-10-19.
- Lesson files contain no imports; blank lines around markdown inside components; escape literal dollar signs.
- Do not touch `AML Course Material/`. If a new lecture appears there, run `/ingest-lecture` and open a PR for the course-map section before writing its lessons.

## When something is unclear

- The course map is ambiguous or seems wrong: read the specific PDF pages with the Read tool (equations are images), fix the course map in the same PR, and say so in the PR description.
- The contract lacks a component you need: do not invent one. Write the content with the closest existing component, and open an issue titled `contract: <what you need>` for Matt.
- A widget you want does not exist: use `<Widget name="…" />` anyway (it renders a placeholder) and open an issue titled `widget: <name>` with the lesson and the slide figure it rebuilds.
