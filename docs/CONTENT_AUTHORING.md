# Content authoring guide

This is the contract between the **content** workstream (lessons, glossary, quizzes, flashcards, graph, cases, homework bridges) and the **platform** workstream (the components that render them). Content is written against this contract *before* every component exists; the build validates it; the platform renders whatever validates. Change the contract only by PR with both developers' review.

Read first: `VISION.md` §6 (principles) and §8 (lesson anatomy), `STYLE_GUIDE.md` §1–§3 (voice, notation, structure), and the course-map file for your unit in `docs/course-map/`.

---

## 1. Where things live

| Thing | Path | Format |
|---|---|---|
| Units | `src/content/units.yaml` | YAML list |
| Lessons | `src/content/units/<unit-slug>/<nn>-<lesson-slug>.mdx` | MDX |
| Glossary (sticky notes) | `src/content/glossary/<term-id>.mdx` | MDX, one term per file |
| Concept graph | `src/content/graph/nodes.yaml`, `src/content/graph/edges.yaml` | YAML |
| Quiz bank | `src/content/quizzes/<unit-slug>.yaml` | YAML |
| Extra flashcards | `src/content/flashcards/<unit-slug>.yaml` | YAML (most cards are auto-generated; see §8) |
| Clinical cases | `src/content/cases/<case-id>.mdx` | MDX |
| Homework bridges | `src/content/homework/<hw-id>.mdx` | MDX |

Unit slugs: `u0-orientation`, `u1-linear-regression`, `u2-risk-and-gradient-descent`, `u3-logistic-regression-and-mle`, `u4-evaluating-classifiers`, `u5-overfitting-and-regularization`, `u6-generative-models-and-naive-bayes`, `u7-gaussian-discriminant-analysis`, `u8-unsupervised-learning-and-kmeans`, then `u9-…` as lectures land. Lesson files are numbered `01-`, `02-`, … within a unit.

Validate anything you write with `pnpm validate:content` (schemas, ids, `[[term]]` resolution, graph acyclicity, homework safety flags). The build runs the same checks.

## 2. Lesson frontmatter

```yaml
---
title: "Naive Bayes"                      # sentence case
unit: u6-generative-models-and-naive-bayes
order: 3                                  # → displayed as "6.3"
slug: naive-bayes                         # kebab-case, stable forever
summary: "From the parameter explosion to a closed-form MLE, smoothing, and a linear classifier."   # ≤ 240 chars
lectures:                                 # provenance; pages are the PDF page numbers
  - { lecture: 9, pages: "20-40" }
  - { lecture: 10, pages: "3-5" }
concepts:                                 # graph node ids this lesson TEACHES (must exist in nodes.yaml)
  - naive-bayes-assumption
  - bernoulli-naive-bayes
  - bernoulli-nb-mle
  - laplace-smoothing
  - nb-linear-classifier
prerequisites:                            # node ids it REQUIRES (concepts or glossary terms)
  - bayes-classifier
  - chain-rule-probability
  - conditional-independence
  - bernoulli
  - log-likelihood
  - lagrange-multipliers
homework: [hw3]                           # ids from src/content/homework/
cases: [notes]                            # ids from src/content/cases/ (a lesson may cite a case before its page exists; the validator warns until it does)
companions:                               # notebook cells this lesson uses
  - { notebook: "Code Companions/Lecture 8 Code Companion.ipynb", cells: "9-14" }
  - { notebook: "Lectures/NaiveBayes_Spam_exercise_sol.ipynb", cells: "all" }
estimatedMinutes: 50
status: draft                             # draft | review | published
authors: [jide]
---
```

Rules: `status: draft` lessons build but are hidden from navigation and the Atlas in production builds (they are visible under `pnpm dev`). `review` means ready for `math-reviewer` and `content-reviewer`. `published` requires both reports attached to the PR with zero unresolved findings.

## 3. Lesson anatomy checklist

Every lesson has these twelve parts in this order (from `VISION.md` §8). The component that renders each is in parentheses.

1. Header strip (auto from frontmatter + `<Frame>`)
2. Objectives (`<Objectives>`)
3. Hook (`<Hook>`)
4. Definitions (`<Definition>`)
5. Intuition (`<Intuition>`)
6. Derivations (`<Derivation>` → `<Chunk>` → `<Step>`; `<Proof collapsed>` for long proofs)
7. Explorable (`<Widget>`)
8. Worked example (`<Example>`; faded variants are generated from `<Derivation>` steps marked `fadeable`)
9. Check your understanding (`<Check>`)
10. Pitfalls (`<Pitfall>`)
11. Connections (`<Connections>`, `<Notebook>`, `<HomeworkBridge>`)
12. Summary card (`<Summary>`)

Skipping a part requires an MDX comment: `{/* no-hook: this is a notation-only lesson */}`.

## 4. Component reference

Lesson files contain **no imports**; every component below is provided globally. Markdown inside a component must be separated from the tags by blank lines (an MDX rule). Math works everywhere: props that end in `Tex` take raw TeX; the `title`, `justification`, `keyIdea`, `challenge`, `caption`, and `<Frame>` props take prose with `$…$` spans. A literal dollar is `\$`.

### `<Frame data="…" model="…" objective="…" optimizer="…" />`
The four-component strip for this lesson. One line each, may contain math.

### `<Objectives>` … `</Objectives>`
A markdown list of 3–6 items, each starting with a verb.

### `<Hook>` … `</Hook>`
≤120 words plus one `<Figure>` or `<Widget>`. Prefer a clinical question from a case.

### `<Definition id="def-6-3-1" title="Conditional independence" source="L9 p.24">` … `</Definition>`
Numbered automatically from `id`. Body: the definition, the course symbol, and an "Also written as:" line when textbooks differ. Registers a flashcard (statement → formula).

### `<Theorem id title source>`, `<Proposition …>`, `<Lemma …>`
Same props as `<Definition>`. A result's proof goes in a following `<Derivation>` or `<Proof>`.

### `<Intuition>` … `</Intuition>`
The 1-D / two-point case with a figure. Use the same `sym-*` colors as the following derivation.

### `<Derivation id title goalTex resultTex source>` → `<Chunk title>` → `<Step justification sticky fadeable figureState>`

```mdx
<Derivation
  id="der-6-3-2"
  title="The MLE of ψ_jk is a class-conditional word frequency"
  goalTex="\hat\psi_{jk} = \frac{\sum_{i:\,y^{(i)}=k} x^{(i)}_j}{n_k}"
  resultTex="\hat\psi_{jk} = \frac{\#\{i : y^{(i)}=k,\ x^{(i)}_j = 1\}}{\#\{i : y^{(i)} = k\}}"
  source="L9 p.32 (stated: 'recall from the MLE lecture')"
>

<Chunk title="Isolate the terms that involve ψ_jk">

<Step justification="Bernoulli pmf in product form" sticky="bernoulli">
$$\log P(x^{(i)}_j \mid y^{(i)} = k;\ \psi_{jk}) = x^{(i)}_j \log \psi_{jk} + (1 - x^{(i)}_j)\log(1 - \psi_{jk})$$
</Step>

<Step justification="only class-k examples contain ψ_jk; write s = Σ x_j^(i) over them and n_k for their count">
$$\ell(\psi_{jk}) = s \log \psi_{jk} + (n_k - s)\log(1 - \psi_{jk})$$
</Step>

</Chunk>

<Chunk title="Differentiate and solve">

<Step justification="derivative of log" sticky="derivative-of-log" fadeable>
$$\frac{d\ell}{d\psi_{jk}} = \frac{s}{\psi_{jk}} - \frac{n_k - s}{1 - \psi_{jk}}$$
</Step>

<Step justification="first-order condition" fadeable>
$$\frac{s}{\psi_{jk}} = \frac{n_k - s}{1 - \psi_{jk}} \;\Longrightarrow\; s(1-\psi_{jk}) = (n_k - s)\psi_{jk} \;\Longrightarrow\; \hat\psi_{jk} = \frac{s}{n_k}$$
</Step>

<Step justification="second derivative is negative, so this is a maximum" sticky="second-order-condition">
$$\frac{d^2\ell}{d\psi_{jk}^2} = -\frac{s}{\psi_{jk}^2} - \frac{n_k - s}{(1-\psi_{jk})^2} < 0$$
</Step>

</Chunk>

</Derivation>
```

Props: `goalTex` and `resultTex` are TeX without `$`. `justification` is plain text (may include `$…$`). The display math inside a `<Step>` may sit directly under the tag (as above) or be separated by blank lines; either renders in display mode. `source` is parsed as `L<n> p.<k>` or `L<n> pp.<a>-<b>` followed by an optional note in parentheses; anything else is shown verbatim. `sticky` is a glossary id shown beside that step. `fadeable` marks steps eligible for the generated faded-example and "which step is wrong" variants. `figureState` is a JSON string handed to the nearest preceding `<Widget>` when the step is revealed. ≤15 steps per derivation; one algebraic move per step.

What the platform does with this (so hints and quizzes can rely on it): steps are numbered 1…n across chunks and each gets the stable id `<derivation id>-step-<n>` (`der-6-3-2-step-7`), so `#der-6-3-2-step-7` deep-links to step 7 of Derivation 6.3.2 and the page opens with exactly steps 1–7 shown and step 7 highlighted. Steps reveal one at a time (`→`/Space, `←`, `a`, `r`, or the control bar); the count is remembered per derivation in the reader's browser. A revealed step's `figureState` must be a JSON *object*; it is parsed and dispatched as the DOM event `aml:figure-state` (`detail: { derivation, step, state }`) on the derivation and on the preceding `<Widget>`'s `figure[data-widget]`, which the widget host listens to (`src/lib/figure-state.ts`). A following `<Widget>` is not driven; put the explorable before the derivation that steps it.

### `<Proof collapsed title="Convergence of GD on L-smooth convex functions" keyIdea="telescoping the descent lemma">` … `</Proof>`
Full proof, folded; the key idea stays visible.

### `<EqRef id="eq-6-3-1" />`
Links to a display equation tagged with `\tag{6.3.1}` and `\htmlId{eq-6-3-1}{…}`.

### `[[term]]` and `[[term|display text]]`
Sticky-note popover for a glossary id: hover (300 ms) or tap opens the glossary card beside the term, Escape closes it, and the card links to `/glossary#term`. The underline is dotted in the term's field color; the first use in a lesson is emphasized (2px), later uses are lighter (1px). The card is built once per page per term from the glossary file, so repeat uses are free. Unknown ids fail validation (the page still builds, showing a "no entry yet" card, so a term can be written a little ahead of its glossary file). Prerequisite chips in the lesson header open the same card.

### `<Callout type="note | warning | slide | beyond">` … `</Callout>`
`slide` = "what the slide says, and how we normalize it"; `beyond` = "beyond the slides" (e.g., the MAP view of regularization).

### `<SlideRef lecture={7} pages="47" />`
Inline citation chip; links to the lecture PDF at that page (`/materials/files/lectures/<file>.pdf#page=<first page>`), or to the lecture's row on `/materials` when the PDF is not in the course folder.

### `<Widget name="bow-nb-scorer" dataset="notes" smoothing={false} challenge="Turn smoothing off and type a word the training set never saw." />`
Props beyond `name` and `challenge` are validated at build time against the widget's manifest (`src/components/widgets/<name>/manifest.ts`, a Zod schema in which every param has a default): an unknown prop or an out-of-range value fails the build with the offending prop named, so `<Widget name="…" />` alone is always valid. `challenge` overrides the manifest's default challenge line. The registered widgets, their params, ranges, and defaults are listed on `/dev/widgets`. If the widget does not exist yet, the build shows a placeholder with the name and params (content can be written before the widget ships). Reader state: the "copy state link" button in the frame puts the current params in the URL hash (`#w=<name>:<base64url>`), which the widget restores on load; a `<Step figureState>` reveal reaches the nearest preceding widget as its `figureState` prop.

### `<Figure src="…" alt="…" caption="…" source="L10 p.14" />`
Static figure (SVG/PNG under `src/assets/figures/`). Use only when interactivity adds nothing.

### `<Example case="notes" title="Scoring a report" />` … `</Example>`
A worked example whose numbers come from the generated case dataset (`src/data/notes.json`); cite the record ids. The case chip links to `/cases/<id>`. Optional `homeworkReviewed` (boolean, renders nothing): set after you have checked the numbers are not answers to a live homework; silences the R17 warning (`<Example case="notes" title="…" homeworkReviewed>`).

### `<Check ids={["q-u6-l3-001", "q-u6-l3-002"]} />`
Inline check pulling items from the quiz bank (§7). Prefer 2–4 items per section.

### `<Pitfall title="Zero counts are not zero probabilities" misconception="nb-zero-prob">` … `</Pitfall>`
A false belief, stated, then the fix. `misconception` ids tag quiz distractors so a learner's own errors surface here.

### `<Connections>` … `</Connections>`
Markdown links to companion cells (`<Notebook path="Code Companions/Lecture 8 Code Companion.ipynb" cells="9-14" />`), homework problems, the next lesson, and graph neighbors.

### `<HomeworkBridge hw="hw3" skills={["bernoulli-nb-mle", "laplace-smoothing", "log-space-prediction"]} />`
Renders the readiness-gate rows for this lesson's contribution to a homework. Each skill id (a graph node or glossary id) is resolved at build time: "Learn it in" lists the lessons whose `concepts` include it (or the node's `lesson`) and the node's `derivation` at its anchor; "Practice" lists the quiz items whose `concepts` include it, each linked to the `<Check>` that carries it (else `/practice`). So tag quiz items with `concepts` and graph nodes with `derivation` and the gate fills itself. The homework page (`/homework/<hw>`) collects every lesson's bridge for that homework. For a live homework, never include answers.

### `<Summary>` … `</Summary>`
Definitions and results on one screen (markdown + math). Source of the lesson's flashcards together with the boxed results.

## 5. Glossary term files

```mdx
---
id: covariance
term: Covariance
aliases: [covariance matrix, cov]
field: probability          # probability | statistics | linear-algebra | calculus | information-theory | ml | evaluation
firstUsedIn: u2-risk-and-gradient-descent
related: [variance, correlation, multivariate-gaussian]
---

**What it is.** $\mathrm{Cov}(X, Y) = \mathbb{E}[(X - \mathbb{E}X)(Y - \mathbb{E}Y)]$: the average product of deviations. Positive when $X$ and $Y$ move together, zero when uncorrelated. For a vector $x$, the covariance matrix $\Sigma = \mathbb{E}[(x-\mu)(x-\mu)^\top]$ is symmetric and positive semi-definite, with variances on the diagonal.

**How ML uses it.** It is the shape of a Gaussian cloud: the eigenvectors of $\Sigma$ are the axes of its ellipse. GDA fits one $\Sigma_k$ per class; PCA diagonalizes it.

<Figure src="covariance-ellipse.svg" alt="Scatter with covariance ellipse" />
```

≤150 words, two parts, at most one figure or tiny widget. The initial term list (~72) is in `docs/reference/pedagogy-and-curriculum.md`; per-lecture refreshers are in each `docs/course-map/` file.

## 6. Concept graph

`nodes.yaml` (one node per line-block; glossary terms are nodes automatically):

```yaml
- id: bernoulli-nb-mle
  label: "Bernoulli NB MLE"
  type: method            # concept | method | metric | prereq | dataset
  field: ml
  unit: u6-generative-models-and-naive-bayes
  lesson: naive-bayes
  summary: "ψ_jk is the fraction of class-k documents containing word j; φ_k is the class proportion."
  derivation: der-6-3-2
```

`edges.yaml` (edges are also derived from every lesson's `prerequisites` → `concepts`; list only hand-curated extras here):

```yaml
- { from: coin-flip-mle, to: bernoulli-nb-mle, type: generalizes }
- { from: logistic-regression, to: nb-linear-classifier, type: contrasts }
```

Edge types: `requires` (default for derived edges), `generalizes`, `contrasts`, `uses`. The `requires` relation must be acyclic. Seed edges per lecture are in the "Concept-graph edges" sections of `docs/course-map/`.

## 7. Quiz bank

`src/content/quizzes/u6-generative-models-and-naive-bayes.yaml`:

```yaml
- id: q-u6-l3-001
  lesson: naive-bayes
  concepts: [naive-bayes-assumption]
  type: mc                      # mc | numeric | which-step | match | order | predict | estimate | code-trace
  difficulty: 1                 # 1 easy · 2 core · 3 stretch
  source: "L9 p.27 poll"        # or "original"
  prompt: |
    Naive Bayes assumes that, given the label, the features are
  options:
    - { text: "independent", correct: true }
    - { text: "identically distributed", misconception: nb-iid-confusion }   # misconception ids are optional (true/false items have none) but tag distractors wherever a Pitfall exists
    - { text: "uncorrelated across documents", misconception: nb-marginal-vs-conditional }
    - { text: "Gaussian", misconception: nb-requires-gaussian }
  explanation: |
    Conditional independence: $p(\mathbf{x}\mid y) = \prod_j p(x_j \mid y)$. Nothing is assumed about the marginal $p(\mathbf{x})$.
  discriminates: [naive-bayes-assumption, iid]

- id: q-u6-l3-004
  lesson: naive-bayes
  concepts: [bernoulli-nb-mle]
  type: numeric
  prompt: |
    In class $k$ there are $n_k = 40$ documents and the word "biopsy" appears in 6 of them. $\hat\psi_{\text{biopsy},k} = $
  answer: 0.15
  tolerance: 0.005
  seeded: { n_k: [20, 40, 50, 80], s: [3, 6, 9, 12] }   # optional: parameters resampled per attempt; answer computed as s/n_k
  formula: "s / n_k"

- id: q-u6-l3-007
  lesson: naive-bayes
  type: which-step
  derivation: der-6-3-2
  corrupt: { step: 4, replaceTex: "\\hat\\psi_{jk} = \\frac{n_k}{s}", explanation: "The fraction is inverted; ψ must lie in [0,1]." }
```

Every Poll Everywhere question in the course map becomes an item with `source: "L<n> p.<k> poll"` and the professor's intended key. Aim for ≥10 items per lesson, at least three types.

How `<Check>` reads these fields today (graders in `src/lib/graders/`):

- `tolerance` is **absolute**: an answer counts when $|\text{given} - \text{answer}| \le$ `tolerance`. Learners may type a decimal, a fraction (`6/40`), or scientific notation; the prompt should say how many decimals when the tolerance is tight.
- `formula` is evaluated by a small safe evaluator, not JavaScript: `+ - * / ^` (or `**`), parentheses, unary minus, `log`/`ln`, `exp`, `sqrt`, `abs`, `floor`, `ceil`, `round`, and the constants `pi`, `e`. Only the names in `seeded` are variables; anything else fails `pnpm validate:content`.
- The prompt's literal numbers are the default instance and `answer` is its key. When `seeded` is present, "New numbers" resamples one value per parameter and shows them beneath the prompt as `n_k = 20, s = 3`, so use parameter names a reader can match to the prompt's symbols.
- `which-step` reads the step TeX from the lesson that defines `derivation`; a wrong answer links to `#<derivation>-step-<n>` when the page has it.
- `explanation` text that cites `der-6-3-6 step 7` makes "Go to the derivation" link to that step when it is on the page.

## 8. Flashcards

Cards are generated at build time from every `<Definition>` (statement → formula) and every `<Derivation>` result (formula → when/why, plus one cloze on the term that carries the idea). The exact rules are in `src/lib/practice/README.md`; what they mean for authors:

- A definition card's back is the body's first display formula and its first paragraph (or list), in source order. Put the defining sentence and the defining formula first; "Also written as:" lines are left off the card.
- A derivation's `title` is the back of its "when/why" card, so state the conditions in it ("With a shared covariance, the GDA log-odds are affine in x"), and `resultTex` is its front.
- The cloze is taken from titles shaped "<subject> is/are <term>…", where the term is 1–4 plain words ("The MLE of μ_k is the class mean" → *class mean*). Other titles get no cloze; write a YAML `cloze` card if the idea needs one.
- Card ids come from the block ids (`card:def-6-3-1`, `card:der-6-3-2:when`, `card:der-6-3-2:cloze`), so renaming a `def-`/`der-` id resets learners' review history for that card.
- A derivation card's concepts are the graph nodes whose `derivation` is its id; a definition card's is the lesson concept whose id or label matches its title; otherwise the lesson's `concepts`. Set `derivation:` on graph nodes to make concept mastery precise.

Add hand-written cards only for things those miss:

```yaml
- id: fc-u6-l3-010
  lesson: naive-bayes
  concept: laplace-smoothing
  type: cloze                   # cloze | statement-formula | formula-when
  front: "Add-one smoothing: $\\hat\\psi_{jk} = \\dfrac{s + {{c1::1}}}{n_k + {{c2::2}}}$. Why 2 in the denominator?"
  back: "One pseudo-count for each of the two Bernoulli outcomes; it is the MAP estimate under a Beta(2,2) prior."
  derivationStep: "der-6-3-3#2"
```

## 9. Cases and homework bridges

`src/content/cases/notes.mdx`: frontmatter `id, title, tagline, variables (list), generativeModel (TeX + parameters), seed, usedIn (lesson ids)`; body tells the story in ≤300 words and shows a sample of the data. Specifications for all eight cases are in `docs/reference/pedagogy-and-curriculum.md` Part C.

`src/content/homework/hw3.mdx`: frontmatter `id, title, due (ISO date, quoted or bare), live (bool), units (ids)`; body is the readiness gate (one row per skill: skill → lesson section → check id) and, once `live: false`, the problem-by-problem walkthrough. HW1 and HW2 maps are already written in `docs/course-map/05-homeworks.md`.

## 10. Definition of done for a lesson

- [ ] All twelve parts present (or justified by comment)
- [ ] Every equation is derived, proven, or carries a `<SlideRef>` plus a link to where it is derived
- [ ] Every `<Derivation>` has `goalTex`, `resultTex`, `source`, ≤15 steps, one move per step, justifications on every step
- [ ] Every `[[term]]` resolves; every new term has a glossary file
- [ ] `concepts` and `prerequisites` exist in `nodes.yaml`; the lesson's seed edges from the course map are present
- [ ] ≥1 `<Widget>` (placeholder allowed while the widget is being built)
- [ ] ≥10 quiz items including every poll from the slides; ≥3 item types
- [ ] Pitfalls include the slide errors corrected in this lesson
- [ ] `<HomeworkBridge>` present if the lesson feeds a homework; no live-homework answers
- [ ] `pnpm validate:content` passes with zero warnings; `pnpm build` succeeds
- [ ] `math-reviewer` and `content-reviewer` reports attached, zero unresolved findings
- [ ] Frontmatter `status: review` → reviewer flips to `published`

## 11. Minimal skeleton

```mdx
---
title: "Title in sentence case"
unit: u6-generative-models-and-naive-bayes
order: 1
slug: generative-vs-discriminative
summary: "…"
lectures: [{ lecture: 8, pages: "19-43" }]
concepts: [generative-model, discriminative-model, bayes-classifier]
prerequisites: [bayes-rule, conditional-probability, softmax-regression]
homework: [hw3]
cases: [adverse]
estimatedMinutes: 35
status: draft
authors: [jide]
---

<Frame data="labeled pairs $(x^{(i)}, y^{(i)})$" model="a joint $p_\theta(x, y) = p_\theta(x \mid y)\,p_\theta(y)$" objective="maximize $\sum_i \log p_\theta(x^{(i)}, y^{(i)})$" optimizer="closed form (this unit)" />

<Objectives>

- Explain the difference between modeling $p(y \mid x)$ and $p(x \mid y)$.
- Derive the Bayes classifier and show why $p(x)$ drops out.
- Show that the MLE of a generative model splits into a prior problem and a class-conditional problem.

</Objectives>

<Hook>

A new hyperkalemia report arrives for a patient on 20 mg of the VASCO drug. One classifier draws a line through patient space; another asks, "how would a typical event look, and how would a typical non-event look?" Which one needs fewer patients to get good?

</Hook>

<Definition id="def-6-1-1" title="Discriminative model" source="L8 p.30">

A model of the conditional distribution $p_\theta(y \mid \mathbf{x}) : \mathcal{X} \to (\mathcal{Y} \to [0,1])$. It learns the decision boundary and says nothing about $p(\mathbf{x})$.

</Definition>

<Derivation id="der-6-1-1" title="The Bayes classifier" goalTex="\hat y = \argmax_y p(\mathbf{x} \mid y)\, p(y)" resultTex="\hat y = \argmax_y p(\mathbf{x} \mid y)\, p(y)" source="L8 p.39 (two lines)">

<Chunk title="Start from the posterior">

<Step justification="prediction is the most probable label">
$$\hat y = \argmax_y p(y \mid \mathbf{x})$$
</Step>

<Step justification="Bayes' rule" sticky="bayes-rule">
$$= \argmax_y \frac{p(\mathbf{x} \mid y)\, p(y)}{p(\mathbf{x})}$$
</Step>

<Step justification="the denominator does not depend on $y$, so it does not change the argmax" fadeable>
$$= \argmax_y p(\mathbf{x} \mid y)\, p(y)$$
</Step>

</Chunk>

</Derivation>

<Widget name="generative-vs-discriminative-toggle" dataset="adverse" challenge="Slide the prior $p(y=1)$ from 0.06 to 0.5. Which way does the boundary move, and why?" />

<Check ids={["q-u6-l1-001", "q-u6-l1-002"]} />

<Pitfall title="A larger class-conditional likelihood does not decide the label" misconception="ignore-prior">

$p_\theta(\mathbf{x} \mid y=0) = 0.6$ and $p_\theta(\mathbf{x} \mid y=1) = 0.4$ does not mean "predict 0". With $p(y=1) = 0.9$ the posterior favors class 1. (This is the L8 p.37 poll trap.)

</Pitfall>

<Connections>

- Companion: <Notebook path="Code Companions/Lecture 8 Code Companion.ipynb" cells="0-8" />
- Next: 6.2 Text as features

</Connections>

<HomeworkBridge hw="hw3" skills={["bayes-classifier", "generative-vs-discriminative"]} />

<Summary>

- Discriminative: $p_\theta(y\mid x)$, learns the boundary. Generative: $p_\theta(x \mid y)\,p_\theta(y)$, learns the data.
- Bayes classifier: $\hat y = \argmax_y p(\mathbf{x}\mid y)\,p(y)$; the prior matters.
- Generative MLE splits: $\sum_i \log p(x^{(i)} \mid y^{(i)}) + \sum_i \log p(y^{(i)})$.

</Summary>
```

## 12. Writing a derivation well

Decide the goal first; write the `resultTex` before the steps. Then write the steps backwards from the result until you reach something the reader already has; reverse them. For each step ask "what rule did I use?" and put it in `justification`; if the rule is a prerequisite, add `sticky`. Chunk every 3–5 steps with a heading that names the move, not the math ("Take logs so the product becomes a sum"). Mark the two or three steps a learner should be able to produce alone as `fadeable`. Finish by reading only the chunk headings and the result; if that summary makes sense on its own, the derivation is well-structured.
