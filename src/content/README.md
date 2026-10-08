# src/content

Everything here is the **content** workstream (lessons, glossary, graph, quizzes, flashcards, cases, homework bridges).
The platform workstream owns `src/content.config.ts`, `src/lib/content/**`, and `scripts/validate-content.ts`;
changes to those need the other developer's review. The contract is `docs/CONTENT_AUTHORING.md`.

```
src/content/
  units.yaml                  the units (id, title, order, summary, lectures, arc?)       collection: units
  units/<unit>/<nn>-<slug>.mdx  lessons (frontmatter §2, body §3–§4)                     collection: lessons
  glossary/<id>.mdx           one sticky note per term (§5); id = file name              collection: glossary
  graph/nodes.yaml            concept nodes (§6); glossary terms are nodes automatically collection: graphNodes
  graph/edges.yaml            hand-curated edges (§6); lesson prerequisites→concepts are derived   graphEdges
  quizzes/<unit>.yaml         a list of quiz items (§7); `unit` is set from the file name collection: quizzes
  flashcards/<unit>.yaml      a list of extra cards (§8)                                  collection: flashcards
  cases/<id>.mdx              the eight clinical cases (§9); id = file name              collection: cases
  homework/<id>.mdx           readiness gates and post-deadline walkthroughs (§9)        collection: homework
```

Missing files and empty directories are fine: every loader yields an empty collection.
The `.gitkeep` files only keep the directories in git.

## Validate

```
pnpm validate:content            # errors fail; warnings are listed
pnpm validate:content --strict   # warnings fail too (the lesson definition of done is zero warnings)
```

Checks: schemas; kebab-case ids, prefixes (`def-`, `der-`, `q-`, `fc-`), uniqueness; every cross-collection
reference; `[[term]]` and `sticky="…"` resolution; MDX component names against `src/components/mdx/names.ts`;
no `import`/`export`; the `requires` graph is acyclic; homework safety for `live: true`; derivation hygiene
(≤15 steps, `goalTex`/`resultTex`/`source`, a `justification` on every step); `published` lessons have a `<Widget>`.

Lesson references in quizzes, flashcards, cases, and nodes are the lesson `slug`, or `<unit>/<slug>` when a
slug is reused across units. Quiz and flashcard `unit` is never written by hand.
