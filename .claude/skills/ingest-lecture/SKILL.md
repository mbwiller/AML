---
name: ingest-lecture
description: Ingest a newly added lecture PDF, notebook, or homework from "AML Course Material/" into the course map, unit map, lesson stubs, graph nodes, and draft quiz items. Use when new course material lands in the repo.
---

# /ingest-lecture <path or lecture number>

1. Confirm the new file(s) under `AML Course Material/` with `git status` / `ls`.
2. Delegate to the `lecture-ingester` agent with the exact file paths and the current unit map (`docs/course-map/00-course-overview.md`). It reads every page visually and writes the course-map section in the standard template.
3. Review its proposed unit placement against `VISION.md` R3 (continue the previous unit if the lecture finishes its argument).
4. Verify: the course-map section has every template heading; lesson stubs have complete frontmatter and the derivation-gap TODOs; `nodes.yaml` has no duplicate ids; `pnpm validate:content` passes.
5. Open a PR titled `content(course-map): ingest L<n> <title>` and tag the other developer for review. Lesson writing starts only after the course-map section is merged.
