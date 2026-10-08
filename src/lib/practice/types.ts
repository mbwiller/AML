/**
 * Wire types shared by the build-time deck and quiz-bank builders, the
 * static endpoints under /practice, and the practice island (VISION.md §9.5).
 * Framework-free; no runtime code.
 */

/** The three card shapes of VISION §9.5, as written in flashcard YAML. */
export type CardType = 'statement-formula' | 'formula-when' | 'cloze';

/** Where a card came from. */
export type CardOrigin = 'definition' | 'derivation' | 'yaml';

export interface DeckCard {
  /** `card:def-6-3-1`, `card:der-6-3-2:when`, `card:der-6-3-2:cloze`, or the YAML id `fc-u6-l3-010`. */
  id: string;
  type: CardType;
  origin: CardOrigin;
  /** Canonical lesson id `<unit>/<slug>`. */
  lesson: string;
  /** "6.3". */
  lessonNumber: string;
  lessonTitle: string;
  unit: string;
  /** Graph node or glossary ids the card exercises (mastery reads these). */
  concepts: string[];
  /** `/units/<unit>/<slug>#<id>`: the definition, derivation, or step the card was built from. */
  source: string;
  /** Plain-text label for lists and screen readers ("Naive Bayes assumption"). */
  title: string;
  /** Slide provenance as written on the source block ("L9 p.24"), when it has one. */
  provenance?: string | undefined;
  /** Build-time KaTeX HTML. */
  frontHtml: string;
  backHtml: string;
}

export interface DeckUnit {
  id: string;
  title: string;
  /** "6" for u6-…, else the unit's order. */
  number: string;
}

export interface Deck {
  version: 1;
  cards: DeckCard[];
  units: DeckUnit[];
  /** Concept id → display label (graph node label, glossary term, or the id). */
  concepts: Record<string, string>;
}

/** A quiz item as the practice island needs it: pre-rendered HTML plus the grader's client copy. */
interface QuizClientBase {
  id: string;
  unit: string;
  /** Canonical lesson id `<unit>/<slug>`. */
  lesson: string;
  lessonNumber: string;
  lessonTitle: string;
  concepts: string[];
  discriminates?: string[] | undefined;
  difficulty: number;
  promptHtml: string;
  explanationHtml: string;
  /** First derivation (step) link a wrong answer should offer, resolved to a lesson URL. */
  derivationLink?: { href: string; label: string } | undefined;
}

export interface QuizMcOption {
  html: string;
  correct?: true | undefined;
  misconception?: string | undefined;
  explanationHtml?: string | undefined;
  /** `/units/<unit>/<slug>#pitfall-<misconception>` when a lesson has that pitfall. */
  pitfallHref?: string | undefined;
}

export type QuizClientItem =
  | (QuizClientBase & { type: 'mc'; options: QuizMcOption[] })
  | (QuizClientBase & {
      type: 'numeric';
      answer: number;
      tolerance: number;
      seeded?: Record<string, number[]> | undefined;
      formula?: string | undefined;
      hint: string;
    })
  | (QuizClientBase & {
      type: 'which-step';
      steps: { number: number; html: string }[];
      corrupt: { step: number };
    });

export interface QuizBank {
  version: 1;
  items: QuizClientItem[];
  units: DeckUnit[];
}
