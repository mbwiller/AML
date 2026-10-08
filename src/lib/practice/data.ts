/**
 * Build-time deck and quiz bank for /practice (Astro-dependent; the logic is
 * in ./cards.ts and ./quiz-bank.ts). Computed once per build and cached; the
 * static endpoints `/practice/deck.json` and `/practice/quiz.json` serve them
 * so the island fetches them lazily instead of inlining ~2 MB of KaTeX HTML.
 */
import { getCollection } from 'astro:content';

import { buildDeck, type LessonSource } from './cards';
import { buildQuizBank } from './quiz-bank';
import type { Deck, QuizBank } from './types';

let sourceCache: ReturnType<typeof loadSources> | undefined;
const sources = () => (sourceCache ??= loadSources());

async function loadSources() {
  const [units, lessons, flashcards, quizzes, nodes, glossary] = await Promise.all([
    getCollection('units'),
    getCollection('lessons'),
    getCollection('flashcards'),
    getCollection('quizzes'),
    getCollection('graphNodes'),
    getCollection('glossary'),
  ]);
  const lessonSources: LessonSource[] = lessons.map((l) => ({ data: l.data, body: l.body ?? '' }));
  return {
    units: units.map((u) => u.data),
    lessons: lessonSources,
    flashcards: flashcards.map((f) => f.data),
    quizzes: quizzes.map((q) => q.data),
    nodes: nodes.map((n) => n.data),
    glossary: glossary.map((g) => g.data),
  };
}

let deckCache: Promise<Deck> | undefined;
let bankCache: Promise<QuizBank> | undefined;

export function getDeck(): Promise<Deck> {
  deckCache ??= sources().then((s) =>
    buildDeck({
      lessons: s.lessons,
      units: s.units,
      flashcards: s.flashcards,
      nodes: s.nodes,
      glossary: s.glossary,
      dev: import.meta.env.DEV,
    }),
  );
  return deckCache;
}

export function getQuizBank(): Promise<QuizBank> {
  bankCache ??= sources().then((s) =>
    buildQuizBank({
      items: s.quizzes,
      lessons: s.lessons,
      units: s.units,
      nodes: s.nodes,
      dev: import.meta.env.DEV,
    }),
  );
  return bankCache;
}
