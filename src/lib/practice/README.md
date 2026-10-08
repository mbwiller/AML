# Practice engine

Flashcards with FSRS spaced repetition, the interleaving quiz builder, concept mastery, and progress storage (VISION.md §7 "Practice", §9.5, §9.6, §9.11). Everything here is framework-free and unit-tested except `data.ts` (Astro) and `store-dexie.ts` (IndexedDB). The UI is one React island on `/practice` (`src/components/practice/`); lesson pages load none of it.

| File | What it does |
|---|---|
| `cards.ts` | Builds the deck at build time from lesson bodies and `src/content/flashcards/*.yaml`. |
| `quiz-bank.ts` | Pre-renders every gradable quiz item and resolves its pitfall and derivation-step links to lesson URLs. |
| `render.ts` | The small MDX-prose subset cards and quiz items need (paragraphs, lists, emphasis, `[[term]]`, `<EqRef>`, KaTeX). |
| `data.ts` | Astro glue: `getDeck()`, `getQuizBank()`, served as `/practice/deck.json` and `/practice/quiz.json`. |
| `scheduler.ts` | ts-fsrs (FSRS-6, default weights) at desired retention 0.9; four ratings; fuzz off. |
| `queue.ts` | Today's queue: due cards (oldest first), then up to 10 new cards a day in course order, then learning cards due within 20 minutes. |
| `due-summary.ts` | The `aml-due-count` localStorage summary the home "Due today" card reads (dependency-free, ~0.5 KB). |
| `mastery.ts` | Concept mastery 0–4. |
| `interleave.ts` | The seeded quiz builder. |
| `store.ts`, `store-dexie.ts` | The progress store: IndexedDB, else localStorage, else memory. |
| `transfer.ts` | Export and import as JSON (lazy chunk; carries Zod). |

## How cards are generated

| Source | Card id | Type | Front | Back |
|---|---|---|---|---|
| `<Definition id title>` | `card:<def-id>` | `statement-formula` | title + "State the definition (and write its formula)" | the body's first display formula and its first prose block, in source order (a lead paragraph plus the list after it when there is no formula); "Also written as" lines are skipped; `\tag` and `\htmlId` are stripped |
| `<Derivation id title resultTex>` | `card:<der-id>:when` | `formula-when` | `resultTex` + "When does this hold, and why?" | the title (which states the conditions) + the `source` provenance |
| same, when the title names a key term | `card:<der-id>:cloze` | `cloze` | the title with the term blanked + `resultTex` | the term highlighted + `resultTex` |
| `src/content/flashcards/*.yaml` | its own `id` | its `type` | `front` (`{{c1::…}}` blanks become `[…]`, or a boxed `?` inside math) | `back` (and, for cloze, the front with answers) |

The cloze term is picked deterministically from titles of the form "<subject> is/are <term>…": leading articles are dropped, the phrase ends at the first comma, colon, or preposition, and it must be 1–4 plain words (no symbols, digits, or Greek) and not a negation. Otherwise the cloze is skipped. On the current content: "The MLE of μ_k is the [class mean]", "Laplace smoothing is the [MAP estimate] under a Beta(2, 2) prior", "With per-class covariances, the log-odds are [quadratic] in x".

Every card carries `lesson` (`<unit>/<slug>`), `lessonNumber`, `unit`, `concepts`, and `source` (`/units/<unit>/<slug>#<id>`; YAML cards with `derivationStep: "der-6-3-3#2"` link to `#der-6-3-3-step-2`). `concepts` are narrowed when the content says which concept a card exercises: a derivation's are the graph nodes whose `derivation` is its id; a definition's is the lesson concept whose id or label matches its title; otherwise the lesson's frontmatter `concepts`. Lessons hidden by `isNavigable` (drafts in production) contribute no cards. Ids never change unless the source id does.

## Data model

All records are plain JSON with millisecond timestamps; card state is `CardState` from `scheduler.ts` (`phase`, `due`, `stability`, `difficulty`, `scheduledDays`, `learningSteps`, `reps`, `lapses`, `lastReview`).

IndexedDB database `aml-atlas`, schema version 1 (Dexie):

| Table | Primary key, indexes | Row |
|---|---|---|
| `cards` | `id`, `due`, `phase` | `StoredCard`: `CardState` + `id` + `updatedAt`; one row per card ever reviewed (unreviewed cards have no row) |
| `reviews` | `id` (`<cardId>@<ms>`), `cardId`, `at` | `StoredReview`: `rating`, `at`, `phase` before, `elapsedMs` since the previous review, `scheduledDays` |
| `attempts` | `id` (`<itemId>@<ms>`), `itemId`, `at` | `StoredAttempt`: `itemId`, `unit`, `concepts`, `correct`, `misconception?`, `quizSeed?` |
| `meta` | `key` | `{ key, value, updatedAt }`; today `new-today = { day, count }` |

When IndexedDB cannot open (some private modes) the same four arrays live under one localStorage key, `aml-practice`; when storage is blocked they live in memory and the Progress tab says so. After every change the island writes `aml-due-count` (see `due-summary.ts`): each reviewed card's queue-entry time plus today's new-card allowance, so the home page counts what is due now without opening IndexedDB.

## Export format

```json
{
  "format": "aml-atlas-progress",
  "version": 1,
  "exportedAt": "2026-10-07T19:30:00.000Z",
  "practice": { "cards": [], "reviews": [], "attempts": [], "meta": [] },
  "local": { "aml-last-lesson": "{…}", "aml-derivation:der-6-3-2": "5" }
}
```

`local` carries the raw values of the localStorage keys the lesson pages own (`aml-last-lesson`, every `aml-derivation:<id>`; not the theme). Import validates with Zod and merges: cards by latest review (`lastReview`, then `reps`, then `updatedAt`), reviews and attempts as a union by id, meta by `updatedAt`, `aml-last-lesson` by its `at`, derivation reveals by the larger count. Importing the same file twice is a no-op. A future version bumps `version` and adds a migration here.

## Mastery (0–4)

Read by the Progress tab now and by the Atlas glow and boss quizzes later (`masteryByConcept`). Over a concept's cards: `minR` is the lowest FSRS retrievability now (an unreviewed card counts as 0); a *spaced correct review* is any rating but Again given at least 0.8 day after that card's previous review; only those since the card's last Again count.

| Level | Name | Rule |
|---|---|---|
| 0 | Not started | no review and no quiz attempt |
| 1 | Attempted | any review or quiz attempt |
| 2 | Familiar | every card reviewed, `minR ≥ 0.70`, at least one spaced correct review |
| 3 | Proficient | `minR ≥ 0.85`, every card has ≥ 1 spaced correct review since its last lapse |
| 4 | Mastered | `minR ≥ 0.90`, every card has ≥ 2 spaced correct reviews since its last lapse |

A concept with quiz items but no cards stops at Attempted. Quiz accuracy does not promote yet; the boss quiz will.

## Quiz builder

`buildQuiz(pool, { units, count, seed, earlier? })`: buckets by primary concept, rotates through buckets alternating units, pulls an item's `discriminates` partner (same confusable set) in beside it, then orders blocks so neighbors do not share a concept. Seeded with mulberry32; the island draws a fresh seed per quiz and seeded numeric items get fresh numbers from it. `earlier` is the boss-quiz hook (VISION §9.5: two items from earlier units). Only `mc`, `numeric`, and `which-step` items are in the bank until the other types have graders.

## Hooks for later

- XP, streaks, and boss quizzes (VISION §9.6): read `reviews` and `attempts`; nothing is awarded yet.
- Atlas glow: pass `masteryByConcept(…)` levels to the Atlas island's existing `mastery` prop.
- Account sync: the shapes are last-write-wins per card id and union-by-id for logs, so `mergeProgress` is the sync merge.
