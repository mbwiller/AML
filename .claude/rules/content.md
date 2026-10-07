---
paths:
  - "src/content/**"
  - "docs/course-map/**"
---

# Content rules (loaded when you touch content)

- The contract is `docs/CONTENT_AUTHORING.md`; the voice and notation are `STYLE_GUIDE.md` §1–§3. Read the unit's course-map file, not the PDFs.
- Lesson files have no imports. Blank lines around markdown inside components. Escape literal dollar signs.
- Every equation: derived here, proven here, or `<SlideRef>` + link to its derivation. One move per `<Step>`; `justification` on every step.
- `[[term]]` for prerequisites; create the glossary file if missing (≤150 words, "what it is" + "how ML uses it").
- Ids are kebab-case and permanent. Quiz items go in the unit's YAML with `source` for polls.
- Numbers in examples come from `src/data/*.json` (the generated cases) or the companion notebooks, never typed from memory.
- Never answer a live homework's specific parameters (HW3 live until 2026-10-19).
- Run `pnpm validate:content` before opening the PR; set `status: review`, never `published`, yourself.
