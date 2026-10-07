# VISION — AML Atlas

*An interactive, mathematically rigorous learning platform for CS 5785 Applied Machine Learning (Cornell Tech, Fall 2026).*

> **Name.** "AML Atlas", because the product's signature feature is a navigable map of how machine-learning concepts connect. Confirmed 2026-10-06.

**Status:** v1.0, written 2026-10-06 from `CONVERSATION.md` (the founding conversation between Matt and Jide), every lecture slide and notebook in `AML Course Material/` (read page-by-page by subject-explorer agents), the two homeworks and their solutions, and research into pedagogy, curriculum references, and tooling. This is the source of truth for *what* we are building and *why*. `STYLE_GUIDE.md` is the source of truth for *how it looks and how code and content are written*. `docs/WORKSTREAMS.md` says *who builds what*.

---

## Table of contents

1. [How to use this document](#1-how-to-use-this-document)
2. [The vision in one paragraph](#2-the-vision-in-one-paragraph)
3. [Requirements distilled from the founding conversation](#3-requirements-distilled-from-the-founding-conversation)
4. [Who it is for and what success looks like](#4-who-it-is-for-and-what-success-looks-like)
5. [The course we are mapping](#5-the-course-we-are-mapping)
6. [Product principles](#6-product-principles)
7. [The learning experience: site map and page-by-page UX](#7-the-learning-experience-site-map-and-page-by-page-ux)
8. [Lesson anatomy: the canonical template](#8-lesson-anatomy-the-canonical-template)
9. [Feature specifications](#9-feature-specifications)
10. [Content inventory and lesson plan](#10-content-inventory-and-lesson-plan)
11. [Architecture and technology](#11-architecture-and-technology)
12. [Data contracts](#12-data-contracts)
13. [Design direction](#13-design-direction)
14. [Ways of working: two developers, two Claudes, one style](#14-ways-of-working-two-developers-two-claudes-one-style)
15. [Milestones](#15-milestones)
16. [Quality bar, non-goals, and open decisions](#16-quality-bar-non-goals-and-open-decisions)

---

## 1. How to use this document

| If you are… | Read |
|---|---|
| A human deciding what to build next | §2, §3, §10, §15 |
| A Claude session about to write a **lesson** | §6, §8, §9.1–9.2, §9.9, §12.1, then `docs/course-map/` for the unit and `docs/reference/pedagogy-and-curriculum.md` Part B for the topic checklist |
| A Claude session about to build a **component or widget** | §7, §8, §9, §11, §12, `STYLE_GUIDE.md` |
| A Claude session about to **ingest a new lecture** | §9.10, `docs/course-map/00-course-overview.md` |
| Anyone resolving a disagreement about scope or style | §6 (principles) wins over §9 (features) wins over personal taste |

Every section is written so that it can be loaded alone. Cross-references point to files in this repo, never to anything outside it except cited references.

---

## 2. The vision in one paragraph

Take everything the course gives us (slides, code companions, homeworks, solutions, datasets) and turn it into a website where each unit can be *learned*, not just reviewed. Every equation the slides state, we derive step by step. Every concept the slides assume (covariance, Bayes' rule, convexity, eigenvalues), we explain in a sticky note exactly where it is needed. Every method gets an interactive visualization you can drag, so the math becomes a picture you can manipulate. Every unit ends with a gate that says "you are now ready for Homework n" and means it. Flashcards, quizzes, and a light layer of gamification make retention a habit rather than a cram. A full-screen concept graph shows how it all connects. The whole thing is beautiful enough that you want to open it, organized enough that two people and their AI agents can keep extending it every week as new lectures land, and rigorous enough to match the professor's own standard: "the what, the why, and the how (the math)."

---

## 3. Requirements distilled from the founding conversation

Matt is Speaker A and Jide is Speaker B in `CONVERSATION.md`. Each requirement below quotes or closely paraphrases the conversation; the ID is used throughout this document and in commit messages.

| ID | Requirement | Source |
|---|---|---|
| **R1** | Compile *all* course materials (slides, code companions, homeworks, solutions, datasets) into one interactive site with a section per unit/topic. | A: "take all of our materials from AML… build an interactive website that has sections where we can learn each unit" |
| **R2** | **Ongoing ingestion.** New slides arrive weekly; uploading one must add that knowledge to the site. The syllabus gives the overall map of topics to expect. | B: "has to be ongoing… upload a new slide and it will add that knowledge"; A: "we'll give it the syllabus" |
| **R3** | **Units follow the lectures, merged where a lecture continues the previous one.** An AI may also use general knowledge of what an AML course should contain. | A: "sections be based on the lectures and if there's any continuation between lectures, then it just carries forth in one lesson"; B: "AML is not a course that is only offered here" |
| **R4** | **Actually useful, not a regurgitation of the slides.** | B: "I want the material to be actually useful and not just a regurgitation" |
| **R5** | **Same mathematical rigor as the slides, but thoroughly explained and derived.** MLE, gradient descent, regression, supervised and unsupervised methods: show *fully* how each is derived, with proofs, so the learner gains intuition and appreciation. | A: "same mathematical rigor as the slides… thoroughly explained and derived where necessary… if I see MLE, I would like to see fully how it's derived… all of the math and the proofs" |
| **R6** | **Digestible.** Not "a ton of equations"; step by step. | B: "not just having a ton of equations… taking everything step by step" |
| **R7** | **Visualize the fundamentals.** | A: "I want to see how these technical fundamentals actually work, visualize them" |
| **R8** | **Clinical-trial examples are loved; keep them.** | A: "I really like the clinical trial examples… those are cool" |
| **R9** | **Draw the lines from lectures to homework to midterm.** Reading unit *n* should be sufficient to do homework *n*. | B: "drawing the lines that connect the homework to the lectures… you should be able to read unit two and then… do the homework because everything that you need… is contained in the unit" |
| **R10** | **Fun to look at, very well organized, aesthetically pleasing.** | A: "fun to look at… organized really well… really aesthetically pleasing"; B: "very aesthetically pleasing" |
| **R11** | **A materials section, flashcards, quizzes (mathematical and qualitative), and exercises that gamify learning.** | A: "material section… flashcards… quizzes that test more on mathematical as well as some of the qualitative… a little bit more gamified" |
| **R12** | **Sticky-note refreshers for prerequisite concepts** (stats, linear algebra, calculus) explaining the concept and how it is used in ML, right where it appears. | B: "whenever there's a new term… a little refresher… how that concept works and how it's used in the context of machine learning… a sticky note" |
| **R13** | **An interactive concept graph** you can drag around, showing how ML topics connect, in its own tab. | A: "drag my cursor around this graph network visualization of how these machine learning topics connect… a tab in this learning platform" |
| **R14** | **Materials provided:** lecture PDFs, Jupyter code companions, homework PDFs, our homework solutions, datasets, in subfolders of a shared repo. | A: "all of the lectures as PDFs, the code companions… the homeworks… our homework solution… data sets… organized into subfolders in a shared repository" |
| **R15** | **Built by both of us with Claude, in parallel, using subagents**; explore agents read the material and write a vision; research agents fill gaps; build agents work in parallel; a shared style guide keeps both people's agents unified. | A: "both going to be working on this using Claude… deploy sub agents in parallel… create a thorough vision MD file… research agents… built also in parallel… style guides… so that the overall style can be unified" |

Two requirements are implied rather than stated and are adopted here: **R16** the site must be usable on a laptop in class and on a phone on the subway (responsive, fast, offline-tolerant), and **R17** nothing we publish may give away a *live* homework's answers (we may teach every skill and derive every general result; we do not post HW3's numeric answers before its due date).

---

## 4. Who it is for and what success looks like

**Primary users:** Matt and Jide, graduate students in CS 5785, preparing for HW3 (Oct 19), the midterm Kaggle competition (Nov 2), HW4–HW5, and the final project. **Secondary users:** classmates, if we choose to share; future-semester students; ourselves in a year when we need to re-derive GDA for a job interview.

**The acceptance test for a unit** (from R9): a learner who has done nothing but work through the unit on the site, including its checks and its "Ready for HW n?" gate, can sit down and complete the corresponding homework problems without opening the slides. We validate this concretely: for each HW problem, `docs/course-map/05-homeworks.md` lists the skills required; the unit's gate must cover every one.

**The acceptance test for a derivation** (from R5–R6): a learner with the stated prerequisites can follow every step without an unexplained jump; every non-obvious step has a justification; every tool used in a step is either derived earlier or is a sticky note. The result is boxed and becomes a flashcard.

**Quantitative targets for the semester**

| Metric | Target |
|---|---|
| Units published with full derivations | All lectures released to date, within 7 days of release |
| Derivation backlog (results stated on slides but not yet derived on the site) | Zero for any unit whose homework is due within 7 days |
| Interactive widgets | ≥ 1 per lesson, ≥ 25 by the midterm |
| Sticky-note glossary | ≥ 72 terms (the list in `docs/reference/pedagogy-and-curriculum.md`) |
| Quiz bank | ≥ 10 items per lesson, every Poll Everywhere question from the slides included |
| Flashcards | Every boxed definition and result auto-generates at least one card |
| Lighthouse (performance / accessibility) | ≥ 90 / ≥ 95 on lesson pages |
| Build | Static; deploys on every merge to `main`; PR previews |

---

## 5. The course we are mapping

Full detail lives in `docs/course-map/00-course-overview.md` (schedule, unit map, homework bridges, notation conventions, known slide errors). The essentials:

- **CS 5785 Applied Machine Learning**, Prof. Kyra Gan, Cornell Tech, Fall 2026. Textbook *Dive into Deep Learning* (free). The lecture notation and ordering track the open Kuleshov–Kallus–Belongie *Applied Machine Learning* notes written for this course number, which is therefore our "same notation" reference.
- **Grading:** participation 10%, homeworks 40%, group midterm Kaggle 25%, group final project 25%. Each HW has a Canvas quiz on lecture material, programming questions, and written math.
- **Material so far (L1–L10):** intro; supervised learning and linear regression; data-generating distributions; empirical risk and gradient descent; logistic regression and MLE; classification evaluation; divergences and regularization; model selection; generative models and Naive Bayes; GDA; unsupervised learning and k-means. **Coming:** GMM/EM, density estimation, KNN, PCA, trees and forests, neural networks, CNNs, attention/diffusion, RL.
- **The derivation gap is the product.** Across L2–L10 only a handful of results are derived on the slides (the logistic log-likelihood, the coin-flip MLE, softmax, the Bayes "drop p(x)" step, the NB/GDA log-likelihood decompositions). Everything else is stated. Each file in `docs/course-map/` lists, per lecture, exactly which results are STATED-ONLY; that list is the platform's derivation backlog (§10.3).
- **HW3 (due Oct 19) focuses on Naive Bayes and GDA.** Units 6 and 7 are therefore the first content priority (§15).

---

## 6. Product principles

These resolve conflicts. When a feature request or a stylistic choice contradicts a principle, the principle wins.

1. **Derive, don't restate.** (R4, R5) A lesson may not contain an equation it does not either derive, prove, or explicitly mark as "stated on slide L*n* p.*k*; derived in Lesson *x.y*" with a link. "It can be shown that" is banned.
2. **Step by step, chunked, goal first.** (R6) Long derivations are split into named chunks of 3–5 steps ("Write the likelihood → Take logs → Differentiate → Solve"), reveal one step at a time, show the destination up front, and put each step's justification beside it. The reader controls pace.
3. **The professor's notation, normalized.** (R5) We use the slides' symbols ($\mathcal{D}$, $x^{(i)}$, $\theta$, $f_\theta$, $\eta$, $\psi_{jk}$, $\phi_k$, $\mu_k$, $\Sigma_k$, $c_k$) so nothing on the site looks foreign next to the slides, but we pick one convention where the slides drift and footnote the drift. Textbook alternatives appear in sticky notes, never in the main line.
4. **Prerequisites appear where they are used.** (R12) No separate "math background" chapter to skip. A sticky note is a ≤150-word popover with one figure, attached to the first use of a term in each lesson, and also collected in a browsable glossary.
5. **A picture for every idea, and you can touch it.** (R7) Each lesson has at least one interactive explorable whose state is shared with the derivation beside it. Static figures are acceptable only when interactivity adds nothing.
6. **Clinical examples run through the whole course.** (R8) Eight synthetic clinical datasets with known generative models (§9.8) recur across units, so the same patients show up in regression, classification, clustering, and PCA. Because the truth is known, bias and variance can be shown exactly.
7. **Every unit ends at the homework.** (R9) The last section of every unit is a readiness gate listing the exact skills the homework needs, each linked to the lesson section and the inline check that practices it. Earlier homeworks are teaching material; a live homework is never solved on the site (R17).
8. **Retention is designed, not hoped for.** (R11) Flashcards use FSRS spaced repetition; quizzes use question types that work for math (misconception-built distractors, numeric with tolerance, "which step is wrong", order-the-steps, predict-then-observe); practice interleaves neighboring concepts. Gamification is quiet: mastery levels per concept, XP with diminishing returns, review-day streaks, a boss quiz per unit, no leaderboards.
9. **Beautiful, calm, consistent.** (R10) One design system (`STYLE_GUIDE.md`) with tokens, one component library, one typographic voice. Motion only when it carries meaning. Dark and light mode are both first-class.
10. **Built to be extended weekly by two people and their agents.** (R2, R15) Content is files (MDX, YAML) with validated schemas; the app is a static site; ingestion of a new lecture is a documented, agent-assisted workflow that produces a course-map entry, lesson stubs, graph nodes, and a PR.

---

## 7. The learning experience: site map and page-by-page UX

```
/                      Home: "continue where you left off", today's reviews, course calendar, next due HW
/units                 Unit index (cards with progress rings), grouped by course arc
/units/<unit>/<lesson> Lesson page (the heart of the product)
/atlas                 Full-screen interactive concept graph
/practice              Flashcard reviews (FSRS queue), quiz builder, boss quizzes
/homework/<hw>         Homework bridge: readiness gate, skills map, linked lessons, past-HW walkthroughs
/glossary              All sticky-note terms, filterable by field (probability, linear algebra, calculus, …)
/materials             The original slides, notebooks, datasets, with "which lesson covers this page" links
/cases                 The clinical running examples: story, variables, generative model, which lessons use them
/search                Instant search across lessons, glossary, quiz bank
```

**Home.** A dashboard, not a landing page. Top: the course timeline with today marked and the next homework/midterm highlighted. Middle: "Continue" (the lesson you were in, at the step you stopped), "Due today" (FSRS reviews, with a one-click start), and the concept graph in miniature showing mastered nodes lit. Bottom: streak and XP, understated.

**Unit index.** Cards ordered by the course arc with a progress ring, lecture references ("L8 pp. 19–43, L9"), estimated time, and a "Ready for HW3?" badge when the gate is passed.

**Lesson page.** Three-column on wide screens: a sticky left rail with the lesson outline (sections, derivations, checks) and the four-component frame (Data · Model class · Objective · Optimizer) for this lesson; the reading column (max ~70 characters per line); a right margin for step justifications and sticky notes on hover. On phones the margin content becomes inline expandables. Keyboard: `→`/`space` reveals the next derivation step, `←` hides, `a` reveals all, `g` opens the graph focused on this lesson's node. Every heading, derivation, and step has a stable URL fragment so hints can deep-link to "step 7 of Derivation 5.3". The bottom of the page is the summary card (which is also the flashcard source), the readiness gate, and "next lesson".

**Atlas (concept graph).** Full-screen force-directed graph (~150–300 nodes). Nodes are concepts, methods, metrics, and prerequisites, colored by field; size by centrality; glow by mastery. Drag to rearrange; scroll to zoom; click a node to open a side panel with the definition, its lessons, its cards, and its prerequisites highlighted as a path back to the roots. Filters: by unit, by field, "show only what I've touched", "show prerequisites of X". A "guided tour" mode walks the course arc as an animated path. Edges have types (requires, generalizes, contrasts-with) with distinct strokes.

**Practice.** The FSRS review queue (four-button rating), a quiz builder ("10 questions from Units 5–7, interleaved"), and the boss quiz for each unit (10–12 items, ≥80% to pass, fresh random seeds on retake). Results feed mastery; wrong answers link to the derivation step or sticky note that fixes them.

**Homework bridge.** Per homework: due date; the readiness gate (skills × lesson sections × inline checks); the problem-by-problem map for *past* homeworks with our solution walked through and critiqued (for HW1 and HW2 the map already exists in `docs/course-map/05-homeworks.md`); for a *live* homework, only the skills map and lesson links.

**Glossary.** The sticky notes as a browsable, searchable reference, grouped by field, each showing "first used in" and "used by" lessons.

**Materials.** The original PDFs and notebooks (served from `AML Course Material/`) with a page-to-lesson index, so a learner reading the slides can jump to the derivation.

**Cases.** One page per clinical running example (§9.8): the story, the variables, the generative model with parameters, a sample of the data, and the lessons that use it.

---

## 8. Lesson anatomy: the canonical template

Every lesson follows this order. Sections may be short; they may not be skipped without a comment in the MDX saying why.

1. **Header strip.** Title, unit, estimated minutes, lecture provenance ("L5 pp. 17–50; L6 pp. 1–25"), prerequisite chips (each opens its sticky note), and the four-component frame filled in for this lesson.
2. **Objectives.** 3–6 statements beginning with a verb ("Derive…", "Explain why…", "Compute…").
3. **Hook.** ≤120 words and one figure or explorable. A clinical question from `/cases` wherever possible ("The Phase II trial needs a dose. Which one?").
4. **Definitions.** Numbered, boxed (`Def 3.2`), with the course symbol and an "also written as" line.
5. **Intuition.** The 1-D or two-point case, drawn, dual-coded with the formula (the same color for the term in the equation and the object in the figure).
6. **Derivations.** One `<Derivation>` per named result. Goal banner, chunks, step reveal, inline justifications, sticky notes on the step that needs them, result boxed and registered as a flashcard. Slide provenance on the result ("stated on L7 p.47").
7. **Explorable.** The figure the derivation ended on, now manipulable, with a challenge line ("find an $\eta$ that diverges").
8. **Worked example.** Numbers from the clinical dataset; then a faded version where the learner fills the last step(s).
9. **Check your understanding.** 2–4 inline items, graded instantly, each linking back to the step that fixes a wrong answer.
10. **Pitfalls.** Misconceptions as false statements with the fix, including the slide errors we corrected (as "spot the error" items).
11. **Connections.** Code companion cells, homework problems, the concept-graph neighborhood, the next lesson.
12. **Summary card.** Definitions and results on one screen. This is the flashcard source.

**Which treatment a result gets**

| Treatment | When | Examples |
|---|---|---|
| Step-reveal derivation (default) | Examinable; 4–15 steps; uses only prerequisites or earlier results | Normal equations; Bernoulli MLE → cross-entropy; ridge closed form; GDA posterior is a sigmoid; k-means monotonicity |
| Collapsed proof (full proof, folded; key idea visible) | Matters, but >15 steps or needs a tool outside the course | GD rate for $L$-smooth convex functions; Jensen; AUC = P(score⁺ > score⁻); k-means++ guarantee |
| Sticky note (≤150 words + one figure) | A prerequisite fact used *inside* a step | Chain rule; $\nabla_\theta \theta^\top A\theta = 2A\theta$; Bayes' rule; log turns products into sums |
| Proof sketch inline | One line suffices | "KL ≥ 0 by Jensen on $-\log$" with a link to the collapsed proof |

The full rationale, with citations to the learning-science literature, is in `docs/reference/pedagogy-and-curriculum.md` Part A.

---

## 9. Feature specifications

### 9.1 Math rendering and the derivation engine

- **KaTeX, rendered at build time** (remark-math + rehype-katex), so lesson pages ship no math JavaScript. Macros for course notation live in one file (`src/lib/katex-macros.ts`) and are used everywhere: `\D` for $\mathcal{D}$, `\R` for $\mathbb{R}$, `\E` for $\mathbb{E}$, `\ex{i}` for $x^{(i)}$, `\argmin`, `\argmax`, `\T` for transpose, `\norm{}`, `\KL{p}{q}`.
- **Semantic coloring.** Symbols that have a visual counterpart are wrapped (`\htmlClass{sym-theta}{\theta}`, KaTeX `trust` enabled for `\htmlClass` only) so hovering a symbol highlights its object in the adjacent figure and vice versa.
- **`<Derivation>`** takes `id`, `title`, `goal` (TeX), `result` (TeX), `source` (slide ref), and children `<Chunk title>` → `<Step justification? sticky? figureState? fadeable?>`. It renders the goal banner, the chunk outline, the step list with reveal controls, the boxed result, and registers the result as a flashcard. `figureState` lets a step update the sibling explorable. The same data drives three generated artifacts: the fully worked view, the faded-example variant (last *k* steps blank, learner fills in from three candidates or a math input), and the "which step is wrong" quiz item (one step corrupted).
- **`<Proof collapsed>`**, **`<Definition>`**, **`<Theorem>`/`<Proposition>`/`<Lemma>`**, **`<Intuition>`**, **`<Pitfall>`**, **`<Callout type="note|warning|slide">`**, **`<SlideRef lecture pages>`** are the remaining math-prose components. Their exact props are in `docs/CONTENT_AUTHORING.md`.
- **Numbering** is automatic per lesson (Def 3.1, Derivation 3.2) and stable across builds (derived from `id`, not position).

### 9.2 Sticky notes (the glossary)

- One MDX file per term in `src/content/glossary/`, with frontmatter `id, term, aliases, field, firstUsedIn, related` and a body of ≤150 words plus at most one figure or tiny explorable. The body has two parts: *what it is* and *how ML uses it*.
- Inline usage: `[[covariance]]` or `[[covariance|the covariance matrix]]` in MDX is turned by a remark plugin into a `<Sticky>` popover (hover on desktop, tap on mobile, keyboard accessible). The first use in a lesson is auto-marked; later uses render as a subtle dotted underline.
- The initial list of ~72 terms across probability, statistics, linear algebra, calculus/optimization, and information theory is in `docs/reference/pedagogy-and-curriculum.md` ("Sticky-note prerequisite glossary"), each tagged with the lecture where it is first needed. Each `docs/course-map/` file additionally lists the prerequisite concepts invoked per lecture with a suggested three-sentence refresher.
- Sticky notes are concept-graph nodes of type `prereq`, so the graph shows which prerequisites a unit leans on.

### 9.3 Interactive widgets (explorables)

Widgets are React islands, hydrated only when visible, each in `src/components/widgets/<name>/`, with a `manifest.ts` (name, params schema, default params, which lessons use it) and a Storybook-style demo page at `/dev/widgets` for review. All widgets share: the design tokens, a common `<WidgetFrame>` (title, challenge line, reset, "copy state link"), seeded randomness, keyboard operability, and a static fallback image for print and no-JS.

Catalog with priorities (the full per-lecture idea lists, with the slide figures they rebuild, are in each `docs/course-map/` file):

**P0 (needed for the first published units and HW3)**

| Widget | Lesson | What it does |
|---|---|---|
| `line-fit-playground` | 1.3 | Sliders for $\theta_0, \theta_1$ on the 20-patient BMI data; live MAE/MSE/RMSE/$R^2$; residual segments vs squares; "snap to OLS" |
| `mse-bowl-gd` | 1.4, 2.4 | Contour/3-D of $J(\theta_0,\theta_1)$ with a GD trajectory; $\eta$ slider; standardization toggle shows the bowl rounding |
| `gd-1d-quadratic` | 2.5 | $E = \tfrac12 a w^2 + bw + c$; $\eta$ slider; shows contraction factor $1-\eta a$ and the four regimes incl. markers at $\eta_{opt}$, $2\eta_{opt}$ |
| `gd-2d-eigen` | 2.5 | Elliptical bowl with eigenvalue and rotation sliders; per-mode contraction; condition number readout; reproduces the five-learning-rate slide |
| `dgp-sampler` | 2.1 | $\alpha,\beta,\sigma_X,\sigma_\varepsilon$ sliders; draw $n$ points; OLS fit; $R^2$ vs $n$ converging |
| `sigmoid-fit-1d` | 3.1, 3.3 | Draggable $\theta_0,\theta_1$ over 1-D two-class data; $P(Y=1\mid x)$, boundary, log-odds line, live NLL |
| `coin-mle` | 3.2 | Flip sequence editor; likelihood and log-likelihood curves; the maximum snaps to $\#H/(\#H+\#T)$ |
| `threshold-roc` | 4.1, 4.2 | Two overlapping score histograms (the troponin case); threshold slider updates confusion matrix, ROC point, PR point, and AUC; "random classifier" toggle |
| `poly-degree-overfit` | 5.2 | Degree 0–30 on the cosine data; coefficient magnitudes; train vs holdout MSE; reseed |
| `ridge-lasso-geometry` | 5.3 | Level-set ellipses with disk vs diamond; $\lambda'$ slider; shows tangency and whether a coordinate hits zero |
| `regularization-path` | 5.3 | Ridge and lasso coefficient paths on the diabetes data with a true $\lambda$ axis; non-zero count |
| `bow-nb-scorer` | 6.3 | Type an email; bag-of-words vector; per-word log-odds bars; running score; Laplace smoothing toggle exposing the $-\infty$ failure |
| `gaussian-2d-covariance` | 7.1 | $\sigma_x,\sigma_y,\rho$ sliders; scatter, ellipse, the matrix, eigenvectors |
| `gda-fitter` | 7.2, 7.3 | Two-class 2-D points; fitted ellipses and priors; Bayes boundary; "shared covariance" toggle makes it linear; logistic-regression overlay |
| `kmeans-stepper` | 8.1 | Lloyd's algorithm step by step with Voronoi cells; random restarts; k-means++ toggle; inertia trace |

**P1:** `true-vs-empirical-risk`, `inner-product-dial`, `hessian-classifier`, `kl-two-gaussians`, `softmax-playground`, `confusion-matrix-calculator`, `kfold-animator`, `generative-vs-discriminative-toggle`, `elbow-curve`, `param-count-explosion`, `likelihood-surface`, `learning-rate-schedules`, `sgd-noise`, `l2-vs-kl-in-z`, `weight-magnitude-steepness`. **P2:** `gmm-em-stepper`, `pca-rotating-axis`, `kde-bandwidth`, `tree-splitter`, `relu-bumps`, `backprop-graph`, `conv-slider`, `attention-heatmap`, `bandit-posteriors` (as those units arrive).

### 9.4 The concept graph (Atlas)

- **Data:** `src/content/graph/nodes.yaml` and `edges.yaml`, plus nodes/edges auto-derived from lesson frontmatter (`concepts`, `prerequisites`) and glossary frontmatter. A build step merges and validates (no dangling edges, no cycles in `requires`).
- **Node schema:** `id, label, type (concept|method|metric|prereq|dataset), field, unit, lesson, summary, derivationId?`. **Edge schema:** `from, to, type (requires|generalizes|contrasts|uses)`.
- **Rendering:** force-directed 2-D canvas (react-force-graph-2d over d3-force), draggable nodes, zoom/pan, hover tooltips, click → side panel. Mastery glow is the minimum FSRS retrievability over the node's cards. Edges of type `requires` animate as a path when "show prerequisites of X" is selected.
- **Starting edge list:** each `docs/course-map/` file has a "Concept-graph edges" section per lecture (~200 edges already written). Those are the seed.

### 9.5 Flashcards and quizzes

- **Scheduler:** FSRS via `ts-fsrs`, desired retention 0.9, four-button rating. Card state is stored per user in the browser (§9.11). The scheduler module is pure and unit-tested.
- **Card shapes per result:** cloze on the term that carries the idea; statement → formula with a "say it in words" back; formula → when/why it holds. Cards link to `conceptId` and, where relevant, `derivationId#step`.
- **Quiz item types** (each with a grader in `src/lib/graders/`): multiple choice with misconception-tagged distractors; numeric with tolerance and seeded parameters; "which step is wrong" (generated from derivation data); match term ↔ formula; order the steps; predict-then-observe (bound to a widget); parameter-estimation mini-table; code trace. Every Poll Everywhere question from the slides becomes an item with the professor's intent as the key (transcribed with suggested answers in `docs/course-map/`).
- **Practice sampling** interleaves by concept-graph neighborhood and deliberately pairs confusables (`discriminates: [ridge, lasso]`).
- **Boss quiz per unit:** 10–12 interleaved items including two from earlier units; ≥80% passes; fresh seeds on retake; passing lights the unit's crest and marks its node gold.

### 9.6 Gamification

Mastery per concept (Not started → Attempted → Familiar → Proficient → Mastered), promoted only by spaced correct retrievals and demoted by lapses; XP for completed derivations, correct checks, and reviews, with diminishing returns on repeats; streaks counted on review days with one weekly freeze; unit crests from boss quizzes; the Atlas lights up as you learn. No leaderboards: a private "you vs your past self" chart instead. Everything is quiet, dismissible, and never blocks content.

### 9.7 Code companions and notebooks

- Each notebook cell group is referenced from the lesson it belongs to (the notebook ↔ lecture mismatches are documented in `docs/course-map/00-course-overview.md`), rendered with syntax highlighting and the recorded outputs, and annotated ("this is slide L4 p.46").
- Where the companions delegate math to sklearn, the lesson adds from-scratch code (normal equations reproducing slope 37.3788 / intercept −797.08; a numpy GD loop; a numpy Bernoulli NB with smoothing).
- In-browser Python (Pyodide) is **not** in v1 (bundle and load cost); we show code with outputs and link to the notebook. Revisit after the midterm.

### 9.8 Clinical running examples and synthetic data

Eight synthetic clinical datasets, each with a stated generative model, fixed seed, and a page under `/cases`: **VASCO** (dose–response regression), **ADVERSE** (adverse-event classification, 6% prevalence), **TROPO** (diagnostic thresholds, two log-normals), **SEPSIS-4** (four-phenotype mixture for clustering/GMM), **LEUK-EXPR** (low-rank gene expression for PCA and $d>n$), **NOTES** (adverse-event text generated from a Naive Bayes model, so NB provably recovers it), **ADAPT-3** (response-adaptive three-arm trial for bandits/RL), **STEPS** (micro-randomized mobile-health trial for SGD and grouped CV). Full specifications with parameters are in `docs/reference/pedagogy-and-curriculum.md` Part C. Generation scripts live in `scripts/gen-datasets/` and write JSON to `src/data/`; lessons never embed raw numbers that cannot be regenerated. The course's own datasets (sklearn diabetes, Iris, 20 Newsgroups, the Enron spam set, Ames housing, the HW2 clinical-trial text) are used where the slides use them.

### 9.9 Homework bridges and readiness gates

- `docs/course-map/05-homeworks.md` holds the per-problem skill map for HW1 and HW2 and a forecast for HW3. Each HW gets a page with the readiness checklist; each checklist item links to a lesson section and an inline check.
- Past homeworks are teaching material: the walkthrough shows our solution, where it was weak (e.g., HW1 Part I 3b never calls `backward()`; the HW2 bonus was unattempted), and a "level 2" variant (ridge/lasso on Ames; TF-IDF on the trials).
- Live homeworks (R17): skills map and lessons only; no numeric answers for the specific HW parameters until after the due date. The lesson on $R^2$'s population limit, for example, derives the general result and lets a widget show convergence, exactly as the L3 slide intended.

### 9.10 Ongoing lecture ingestion (R2)

When a new PDF or notebook lands in `AML Course Material/`:

1. Run the `/ingest-lecture` skill (or ask the `lecture-ingester` agent). It reads the PDF *visually* (equations are images), produces a course-map section in the standard template (summary, objectives, ordered walkthrough with STATED/DERIVED marks, examples, figures, notation, prerequisites, derivation gaps, polls, continuity, graph edges, widget ideas), and appends it to the right `docs/course-map/` file or creates the next one.
2. It proposes unit placement (new unit, or continuation of the previous one) per R3 and updates `00-course-overview.md`.
3. It creates lesson stubs (frontmatter + section headings + TODOs listing the derivation gaps), adds graph nodes/edges, and adds the polls to the quiz bank as drafts.
4. It opens a PR. A human merges; the `lesson-writer` agent then fills the stubs; `math-reviewer` checks every derivation before publish.

Homework ingestion follows the same path and updates the homework map and bridge page.

### 9.11 Progress persistence

All progress (FSRS card state, mastery, XP, streaks, lesson position, widget states you chose to save) lives in the browser (IndexedDB via a tiny store with a localStorage fallback), with **export/import as JSON** so a learner can move between laptop and phone. Optional account sync is a post-midterm decision (§16). Nothing on the site requires a login.

---

## 10. Content inventory and lesson plan

### 10.1 Lessons for the material released so far

Slide ranges are exact; "gaps" names the main derivations the slides do not supply (full lists in `docs/course-map/`).

**Unit 0 — Orientation (L1).** 0.1 What machine learning is: supervised, unsupervised, self-supervised, RL via the "how ChatGPT is trained" pipeline; the course arc as a timeline. No derivations. One sorting exercise.

**Unit 1 — Supervised learning and linear regression (L2; L3 pp. 1–25).**
1.1 The five components of a learning problem; data representation (one-hot, discretization, feature engineering) on the diabetes data. *Gaps:* why one-hot beats integer codes.
1.2 Datasets, models, model classes; the three inductive biases of linear models, proven from linearity.
1.3 Loss functions: MAE, MSE, RMSE, $R^2$. *Gaps:* $R^2$ bounds, negativity, and its population limit under a linear DGP (general result only; HW2-safe).
1.4 Least squares: design matrix; **normal equations** (full derivation with the matrix-calculus sticky notes); projection view; 1-D closed form reproducing the notebook's 37.3788 / −797.08; **convexity of MSE** via the Hessian.

**Unit 2 — Data-generating distributions, risk, and gradient descent (L3 pp. 26–45; L4; L5 pp. 1–16).**
2.1 Random variables, axioms, iid, the data-generating distribution; $Y = f(X) + \varepsilon$; **$\mathbb{E}[Y\mid X]$ is the MSE-optimal predictor**.
2.2 **True risk vs empirical risk**: unbiasedness for fixed $\theta$, the LLN, and the selection-bias caveat that previews overfitting.
2.3 Derivatives, gradients, Hessians; **the gradient is the steepest-ascent direction** (Cauchy–Schwarz); first- and second-order conditions; gradients are perpendicular to level sets.
2.4 **The gradient-descent algorithm**; the MSE gradient $\tfrac{2}{n}X^\top(X\theta - y)$; convergence criteria; the PyTorch autograd loop (HW1's "autograd equivalent").
2.5 **Step size**: exact analysis on a quadratic ($\eta_{opt} = 1/a$, the $2\eta_{opt}$ threshold via the contraction factor), uncoupled coordinates, the eigenbasis and **condition number**, the descent lemma, decaying schedules (Robbins–Monro), SGD and minibatch unbiasedness.

**Unit 3 — Logistic regression and maximum likelihood (L5 pp. 17–50; L6 pp. 1–25).**
3.1 Classification vs regression; thresholded linear regression fails; **the sigmoid**: limits, symmetry, derivative, log-odds.
3.2 Why 0/1 loss cannot be optimized; estimating $P(Y=1\mid X)$; **the maximum-likelihood principle** with the dice, Gaussian, and coin-flip derivations (fixing the slide's sign error).
3.3 **Deriving the logistic-regression objective**: likelihood → log → drop $P(X_i)$ → NLL; equivalence of the slides' additive Bernoulli form to cross-entropy; **gradient** $\sum_i(\sigma(\theta^\top x^{(i)}) - y^{(i)})x^{(i)}$; **convexity**; why there is no closed form.
3.4 **Least squares is Gaussian MLE** (with the hidden constants); **MLE minimizes KL** to the empirical distribution (Gibbs' inequality; the conditional version the professor assigned as homework).
3.5 **Softmax regression**: construction, shift invariance, reduction to the sigmoid, NLL and gradient.

**Unit 4 — Evaluating classifiers (L6 pp. 26–38; L7 pp. 1–11).**
4.1 Accuracy and when it lies; the confusion matrix; sensitivity, specificity, balanced accuracy; precision, recall, **F1 as a harmonic mean** and why; the 31/20/14/35 worked example.
4.2 Thresholds; **the ROC curve** (monotonicity, the diagonal); **AUC and its probabilistic meaning**; PR curves and class imbalance; macro vs micro averaging; the Iris 0.8555 example.

**Unit 5 — Divergences, overfitting, and regularization (L7 pp. 12–54; L8 pp. 1–18).**
5.1 Choice of divergence: the desiderata; **L2 vs KL as functions of the logit** (convexity proven, vanishing gradient shown).
5.2 Overfitting and underfitting: the polynomial demo; large weights ⇒ steep functions; training vs generalization error; **the bias–variance decomposition** (full).
5.3 **Ridge**: closed form, invertibility, weight decay, shrinkage in the eigenbasis. **Lasso**: subgradients, soft-thresholding, the sparsity geometry made rigorous. Constrained ⇔ penalized (KKT). **MAP interpretation** (Gaussian and Laplace priors), marked "beyond the slides".
5.4 Model selection: train/dev/test, **K-fold cross-validation** (what it estimates; retrain afterwards; leakage; grouped folds for patients).

**Unit 6 — Generative models and Naive Bayes (L8 pp. 19–43; L9 pp. 1–40).** *HW3 priority.*
6.1 Generative vs discriminative; **the Bayes classifier and its optimality for 0/1 loss**; the prior matters (the 0.6/0.4 poll trap); MLE for a joint model factorizes.
6.2 Text as features: bag of words, stemming, stop words, rare words, `CountVectorizer`; the logistic-regression baseline on 20 Newsgroups.
6.3 **Naive Bayes**: the $2^d - 1$ parameter explosion; conditional independence via the chain rule; the Bernoulli NB model with its parameter count; **MLE derivation** ($\psi_{jk}$ as a coin flip; $\phi_k$ via a Lagrange multiplier); **Laplace smoothing** as a Beta-prior MAP estimate and why clipping to $10^{-14}$ is a hack; log-space prediction and log-sum-exp; **NB is a linear classifier**; multinomial NB.
6.4 The spam exercise, walked through: all 24 tasks, the 34 zero-probability words, and the stop-word/stemming extensions.

**Unit 7 — Gaussian discriminant analysis (L9 pp. 41–46; L10 pp. 1–21).** *HW3 priority.*
7.1 **The multivariate Gaussian** (density, which the slides never write), the covariance matrix, the "match the matrix to the cloud" quartet, eigenvectors as ellipse axes.
7.2 Gaussian mixtures as generative classifiers; **the GDA MLE** for $\phi_k, \mu_k, \Sigma_k$ carried out with the matrix-calculus sticky notes (the slides state the result).
7.3 **Shared covariance ⇒ linear boundary ⇒ the posterior is a sigmoid**: GDA vs logistic regression (same form, different fit, different assumptions); QDA; Gaussian NB = diagonal GDA (clarifying the poll).

**Unit 8 — Unsupervised learning and k-means (L10 pp. 22–49).**
8.1 Unsupervised tasks; the k-means model, **objective (squared norm, fixing the slide)**, **Lloyd's algorithm as coordinate descent with a monotonicity and termination proof**; feature scaling; local minima and k-means++; choosing $K$ with the elbow method (from the companion).

### 10.2 Future units (as lectures arrive)

9 GMM and EM (ELBO via Jensen, E/M steps, monotonicity, k-means as a limit) · 10 Density estimation, kernels, KNN · 11 Dimensionality reduction and PCA (variance-maximization and reconstruction views, SVD) · 12 Trees and random forests (CART, impurity, bagging variance formula) · 13 Neural networks and MLPs (backprop fully derived, initialization) · 14 CNNs · 15 Attention and diffusion · 16 Reinforcement learning (Bellman, policy gradient, bandits as adaptive trials). The topic-by-topic checklist of notation, derivations, visualizations, pitfalls, and free references for all of these is already written in `docs/reference/pedagogy-and-curriculum.md` Part B.

### 10.3 Derivation backlog (top of the list)

In priority order for the next two weeks: (1) Bernoulli NB MLE and Laplace smoothing; (2) GDA MLE for $\mu_k, \Sigma_k$; (3) shared-covariance ⇒ sigmoid posterior; (4) NB posterior is linear in $x$; (5) Bayes classifier optimality; (6) categorical MLE with the simplex constraint; (7) normal equations and MSE convexity; (8) steepest ascent and the GD update; (9) $\eta_{opt}$, $2\eta_{opt}$, condition number; (10) logistic NLL gradient and convexity; (11) MLE ≡ KL; (12) ridge closed form and lasso soft-thresholding; (13) bias–variance decomposition; (14) AUC as a probability; (15) k-means monotonicity. The complete per-lecture lists (≈60 items) are in `docs/course-map/`.

---

## 11. Architecture and technology

### 11.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 7** (static output) with **MDX** and **React 19** islands | Content-first; typed content collections with Zod schemas and cross-collection `reference()`; zero JS for prose; islands hydrate only the explorables (`client:visible`); trivial static deploys; Claude is fluent in it. **Gotcha:** Astro 7's default Markdown processor (Sätteri) does not run remark/rehype plugins, so we set `markdown.processor: unified()` from `@astrojs/markdown-remark` |
| Language / tooling | **TypeScript 6 (strict)**, **pnpm 12**, Node 24 LTS, ESLint 10 + Prettier 3 (Astro and Tailwind plugins), **Vitest 5** for pure logic, **Playwright** for smoke and screenshot checks, lefthook + commitlint | Keeps two agent-driven workstreams honest; graders, FSRS wrapper, graph builder, and content validators are unit-tested. TypeScript 7 waits until `@astrojs/check` and typescript-eslint support it |
| Styling | **Tailwind CSS v4** with `@theme` tokens in OKLCH (`src/styles/tokens.css`), `data-theme` dark mode; **Base UI** headless primitives (shadcn's default) copied into `src/components/ui/` and restyled to tokens | One tokens file is the only source of color; agents cannot invent colors without touching it |
| Math | **KaTeX 0.19** at build time via remark-math/rehype-katex; `trust` enabled only for `\htmlClass`/`\htmlId`; one shared macro file | Fast, server-rendered, print-friendly, MathML for screen readers. **Gotcha:** rehype-katex and Mafs pin `katex ^0.16` while 0.18 renamed every CSS class, so a **pnpm override pins `katex` to one version** or equations render unstyled |
| Code blocks | **Expressive Code** (Shiki) | Titles, line markers, collapsible sections, copy button; must precede `mdx()` in integrations |
| Explorables | **Mafs** for coordinate-plane widgets; **D3 modules** (scale, shape, contour, force, random, zoom, drag) computing while React renders; **Motion** for animation; react-three-fiber only for one showcase 3-D loss surface, lazy-loaded | Mafs makes math-plane widgets fast and consistent; "D3 computes, React draws" is the pattern Claude produces most reliably |
| Concept graph | Custom React SVG driven by **d3-force**, layout precomputed at build time with a fixed seed (react-force-graph-2d as the one-day fallback) | SVG nodes take design tokens, real typography, CSS transitions, keyboard focus and ARIA; 150–300 nodes is far below SVG's limits |
| State / storage | **nanostores** (+persistent) for small cross-island state; **Dexie** (IndexedDB) for FSRS cards and review logs, indexed by `due`; JSON export/import | No backend for v1; IndexedDB avoids localStorage's size cap and gives queries |
| Spaced repetition | **ts-fsrs** (FSRS-6) | Modern scheduler; per-card retrievability drives mastery |
| Search | Pagefind (static index at build) | Zero-backend full-text search |
| Hosting / CI | GitHub Actions for lint/test/build on every PR; **Vercel (free Hobby tier)** for the deployed site with per-PR previews, or simply `pnpm preview` locally. The build is fully static, so Cloudflare or GitHub Pages work too if Vercel ever stops being free | Zero cost; previews help review two parallel streams; no lock-in because `dist/` is plain files |

The tech-stack research memo with alternatives considered, config snippets, the exact package list with versions verified on 2026-10-06, and a first-week spike checklist is `docs/reference/tech-stack.md`; when it and this table disagree, update this table and say so in the PR.

### 11.2 Directory layout

```
AML-Platform/
├── AML Course Material/          # the raw material (read-only; never edit; new lectures land here)
├── docs/
│   ├── course-map/               # 00 overview · 01–04 lecture content maps · 05 homework map
│   ├── reference/                # pedagogy-and-curriculum.md · tech-stack.md
│   ├── CONTENT_AUTHORING.md      # MDX component contract, frontmatter schemas, lesson checklist
│   ├── WORKSTREAMS.md            # who builds what, integration contracts, cadence
│   └── decisions/                # ADR-style notes for anything we change our minds about
├── src/
│   ├── content/                  # ← CONTENT workstream owns this tree
│   │   ├── units/<unit-slug>/<lesson-slug>.mdx
│   │   ├── glossary/<term>.mdx
│   │   ├── quizzes/<unit>.yaml
│   │   ├── flashcards/<unit>.yaml
│   │   ├── graph/{nodes,edges}.yaml
│   │   ├── cases/<case>.mdx
│   │   └── homework/<hw>.mdx
│   ├── components/               # ← PLATFORM workstream owns this tree
│   │   ├── mdx/                  # Definition, Derivation, Step, Sticky, Check, …
│   │   ├── widgets/<name>/       # explorables (React islands) + manifest
│   │   ├── atlas/                # concept graph
│   │   ├── practice/             # flashcards, quiz engine, boss quiz
│   │   └── ui/                   # primitives (buttons, popover, tabs, progress ring)
│   ├── layouts/  pages/  lib/    # app shell; lib = fsrs, graders, graph-builder, progress, katex-macros
│   ├── styles/                   # tokens.css, global.css, katex.css overrides
│   └── data/                     # generated synthetic datasets (JSON)
├── scripts/                      # gen-datasets, validate-content, ingest helpers
├── public/
├── .claude/                      # agents, skills, path-scoped rules, shared settings (committed)
├── CLAUDE.md  VISION.md  STYLE_GUIDE.md  README.md  CONVERSATION.md
```

The two workstreams own disjoint trees (§14), which is what makes parallel, agent-driven work safe.

---

## 12. Data contracts

These are the interfaces between content and platform. They are validated at build time (Astro content collections + a `validate-content` script), so a content PR cannot break the site and a platform PR cannot silently change what content means. The authoritative, up-to-date schemas live in `src/content.config.ts` and `docs/CONTENT_AUTHORING.md`; this section states the intent.

### 12.1 Lesson frontmatter

```yaml
title: "Naive Bayes"
unit: 6                      # integer; unit slug derived from the overview table
order: 3                     # lesson order within the unit → "6.3"
slug: naive-bayes
summary: "From the parameter explosion to a closed-form MLE, smoothing, and a linear classifier."
lectures:                    # provenance
  - { lecture: 9, pages: "20-40" }
concepts: [naive-bayes, conditional-independence, bernoulli-nb-mle, laplace-smoothing]   # graph node ids this lesson *teaches*
prerequisites: [bayes-rule, chain-rule-probability, bernoulli, log-likelihood]           # node ids it *requires*
homework: [hw3]
cases: [notes]
estimatedMinutes: 45
status: draft | review | published
```

### 12.2 Derivation and step (inside MDX)

`<Derivation id="der-6-3-2" title="MLE of ψ_jk" goal="\hat\psi_{jk} = \frac{\sum_{i:y^{(i)}=k} x^{(i)}_j}{n_k}" source="L9 p.32 (stated)">` → `<Chunk title="Isolate the terms that involve ψ_jk">` → `<Step justification="log of a product is a sum of logs" sticky="log-rules">…TeX…</Step>`. Steps may carry `fadeable` (eligible for the faded-example variant) and `figureState='{"highlight":"psi"}'`.

### 12.3 Glossary term, graph nodes/edges, quiz items, flashcards

See §9.2, §9.4, §9.5 for the fields; exact YAML in `docs/CONTENT_AUTHORING.md`. Every id is a kebab-case string, globally unique, and never renamed once published (rename = add alias).

### 12.4 Widget manifest

```ts
export const manifest = {
  name: "threshold-roc",
  title: "Threshold → confusion matrix → ROC",
  params: z.object({ dataset: z.enum(["tropo","iris"]).default("tropo"), showPR: z.boolean().default(true) }),
  usedIn: ["4.1", "4.2"],
  challenge: "Find the threshold that maximizes F1. Is it 0.5?",
};
```

---

## 13. Design direction

`STYLE_GUIDE.md` has the tokens and rules; this is the intent.

**Feel.** Editorial and calm: a well-set mathematics book that happens to be alive. Warm off-white paper and ink in light mode; deep slate and soft white in dark mode. Generous whitespace, a measured line length, and figures that sit exactly beside the equation they explain. Nothing bounces. Delight comes from a derivation unfolding at your pace and a graph lighting up as you learn.

**Type.** A serif for reading (Source Serif 4), a sans for interface (Inter), a mono for code (JetBrains Mono), and KaTeX's own fonts for math, with sizes tuned so inline math sits on the serif baseline.

**Color.** One neutral scale plus a small set of **field colors** used consistently everywhere a field appears: probability (teal), statistics (blue), linear algebra (violet), calculus/optimization (amber), information theory (rose), ML methods (coral), evaluation (green). A sticky note, a graph node, a chip in the header strip, and a highlighted symbol in an equation all share the same field color, so the color itself teaches.

**Motion.** Step reveals slide in from the margin (120 ms, ease-out); figure state changes tween (250 ms); graph physics settle quickly; everything respects `prefers-reduced-motion`.

**Reference points.** Distill.pub for the derivation-beside-explorable rhythm; MLU-Explain for scrollytelling figures; Seeing Theory for probability stickies; Mathematics for Machine Learning for boxed definitions and margin notes; the Kuleshov AML notes for the four-component frame that the slides also use.

---

## 14. Ways of working: two developers, two Claudes, one style

Details, including the integration contracts and the weekly cadence, are in `docs/WORKSTREAMS.md`. The shape:

- **Workstream A — Platform & Interactives (Matt).** Scaffold, design system, the MDX component library, the widget framework and the P0 widgets, the Atlas, the practice engine (FSRS, graders, boss quizzes), progress and gamification, layouts/pages/search, CI/deploy, and the reference lesson that proves the template (Unit 1, lessons 1.3–1.4).
- **Workstream B — Content & Assessment (Jide).** The glossary, the unit lessons starting with Units 6–7 (HW3) and then 1–5 and 8, quiz banks and flashcard decks, the homework bridges, the clinical case pages, and the course-map updates as new lectures land.
- **Contracts, not coordination.** Content is written against the component API in `docs/CONTENT_AUTHORING.md` and validated by schema; platform renders whatever validates. Each workstream owns a disjoint directory tree; cross-tree changes go through a PR the other person reviews.
- **Shared brain.** `CLAUDE.md` (imports `STYLE_GUIDE.md`) loads into every session on both machines; `.claude/agents/` holds the shared subagents (`lesson-writer`, `widget-builder`, `math-reviewer`, `content-reviewer`, `lecture-ingester`); `.claude/settings.json` pre-approves safe commands and runs the formatter after edits.
- **Branches and PRs.** `main` is always deployable. Feature branches named `platform/<thing>` or `content/<unit>-<lesson>`. Small PRs, merged daily. The PR template carries the definition of done.
- **Definition of done for a lesson:** every section of the template present; every stated result derived or linked; `math-reviewer` pass with zero unresolved findings; every `[[term]]` resolves; at least one explorable; ≥10 quiz items and the summary card's flashcards generated; the readiness-gate items for its homework present; builds with zero validation warnings. **For a widget:** manifest, demo page entry, keyboard operability, static fallback, works in both themes, no layout shift, a Playwright screenshot.

---

## 15. Milestones

| When | Milestone | Platform (A) | Content (B) |
|---|---|---|---|
| **Oct 7–8** | **M0 Foundations** | Astro scaffold builds and deploys; tokens + fonts + dark mode; KaTeX + macros; `Definition`, `Derivation/Chunk/Step`, `Sticky`, `Callout`, `SlideRef` render (even if plain); content schema + `validate-content`; content preview works for a stub lesson | Read `docs/course-map/04`, `05`, `00`; glossary terms needed by Units 6–7 (~25); lesson 6.1 and 6.3 drafted against the contract; `nodes.yaml` seeded from the course-map edges |
| **Oct 13** | **M1 HW3-ready alpha** | `bow-nb-scorer`, `gaussian-2d-covariance`, `gda-fitter` widgets; inline `Check` with MC/numeric graders; lesson layout with outline rail; Atlas v0 (render nodes/edges, click → panel) | Units 6 and 7 complete (6.1–6.4, 7.1–7.3) with all derivations; HW3 bridge (skills map, no answers); quiz items for both units incl. all polls |
| **Oct 19** | **M2 HW3 due** | Flashcards with FSRS + review queue; progress persistence + export; `line-fit-playground`, `mse-bowl-gd`, `gd-1d-quadratic`, `gd-2d-eigen`, `dgp-sampler`; reference lessons 1.3–1.4 published | Units 1–2 complete; glossary ≥50 terms; HW1 bridge with the walkthrough; Unit 8 (k-means) drafted; course-map entries for L11–L12 as they land |
| **Nov 2** | **M3 Midterm** | Boss quizzes, mastery/XP/streaks, Atlas mastery glow + prerequisite paths; `threshold-roc`, `poly-degree-overfit`, `ridge-lasso-geometry`, `regularization-path`, `sigmoid-fit-1d`, `coin-mle`, `kmeans-stepper`; search; Lighthouse ≥90/95 | Units 3, 4, 5, 8 complete; HW2 bridge with walkthrough and "level 2"; Units 9–11 (GMM/EM, density, PCA) as lectures land; cases pages |
| **Nov 18** | **M4 HW4** | P1 widgets; `gmm-em-stepper`, `pca-rotating-axis`, `tree-splitter`, `relu-bumps`, `backprop-graph`; print stylesheet | Units 12–14 (trees, MLPs, CNNs); HW3 walkthrough (after due date); HW4 bridge |
| **Dec 7–17** | **M5 Finals** | `conv-slider`, `attention-heatmap`, `bandit-posteriors`; polish; optional account sync decision | Units 15–16; full-course boss quiz; final-project resource page |

Each milestone is also a tag on `main` and a deployed URL.

---

## 16. Quality bar, non-goals, and open decisions

**Quality bar.** We would be comfortable showing any published lesson to Prof. Gan. Every derivation is correct (reviewed by a second agent and spot-checked by a human), every slide error we fixed is footnoted, every number is reproducible from a script, and the site is fast and accessible.

**Non-goals for v1.** Accounts and server-side sync; in-browser Python execution; a general CMS; mobile apps; covering material beyond this course; leaderboards or social features; AI chat inside the site (we use Claude to *build* the site, not to answer questions on it; revisit after the midterm).

**Decided 2026-10-06** (see `docs/decisions/`): the name is **AML Atlas**; hosting is whatever is free (Vercel Hobby with PR previews, or local `pnpm preview`; the static build is portable); the site is for the two of us for now, so no login and no sharing work, while R17 (no live-homework answers) stays as a cheap habit.

**Open decisions:**
1. Account sync after the midterm (Supabase vs none).
2. Whether to include an LLM "ask about this step" helper after the midterm.

---

*This document is maintained by both workstreams. Change it in a PR titled `vision: …` and update the status line at the top.*
