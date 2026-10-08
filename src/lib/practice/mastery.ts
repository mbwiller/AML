/**
 * Concept mastery, 0–4 (VISION.md §9.6): Not started → Attempted → Familiar →
 * Proficient → Mastered. Pure. The Atlas glow and the unit boss quiz read
 * this later; nothing here awards XP or streaks.
 *
 * Inputs per concept: the FSRS state and review log of every deck card that
 * lists the concept, and the number of quiz attempts that touched it.
 *
 * - **Retrievability** `minR`: the lowest probability of recall now over the
 *   concept's cards (src/lib/practice/scheduler.ts); a card never reviewed
 *   counts as 0, so every card must have been seen before the level passes 1.
 * - **Spaced correct review**: a rating other than Again given at least
 *   `SPACED_MS` (0.8 day, so an evening-to-next-evening review counts) after
 *   that card's previous review. Same-session repetitions never promote.
 * - **Lapses demote**: only spaced correct reviews *after a card's last Again*
 *   count, so a lapse resets that card's progress, and its lower stability
 *   pulls `minR` down as it decays.
 *
 * | Level | Name        | Rule (all conditions)                                                   |
 * |-------|-------------|-------------------------------------------------------------------------|
 * | 0     | Not started | no review of the concept's cards and no quiz attempt                     |
 * | 1     | Attempted   | at least one review or quiz attempt                                      |
 * | 2     | Familiar    | every card reviewed, `minR ≥ 0.70`, ≥ 1 spaced correct review in total    |
 * | 3     | Proficient  | `minR ≥ 0.85`, every card has ≥ 1 spaced correct review since its lapse  |
 * | 4     | Mastered    | `minR ≥ 0.90`, every card has ≥ 2 spaced correct reviews since its lapse |
 *
 * A concept with no cards (quiz items only) stops at Attempted.
 */
import { retrievability, type CardState, type ReviewEntry } from './scheduler';

export const MASTERY_NAMES = [
  'Not started',
  'Attempted',
  'Familiar',
  'Proficient',
  'Mastered',
] as const;
export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export const SPACED_MS = 0.8 * 86_400_000;
export const THRESHOLDS = {
  familiar: { minR: 0.7, spacedTotal: 1 },
  proficient: { minR: 0.85, spacedPerCard: 1 },
  mastered: { minR: 0.9, spacedPerCard: 2 },
} as const;

export interface CardHistory {
  state?: CardState | undefined;
  /** This card's reviews, any order. */
  reviews: readonly ReviewEntry[];
}

/** Spaced correct reviews after the card's last Again. */
export function spacedCorrectSinceLapse(reviews: readonly ReviewEntry[]): number {
  const sorted = [...reviews].sort((a, b) => a.at - b.at);
  let count = 0;
  for (const r of sorted) {
    if (r.rating === 'again') count = 0;
    else if (r.elapsedMs !== null && r.elapsedMs >= SPACED_MS) count++;
  }
  return count;
}

export interface MasteryInfo {
  level: MasteryLevel;
  /** Lowest retrievability over the concept's cards now (0 when any is unseen or there are none). */
  minR: number;
  /** Spaced correct reviews since the last lapse, summed over the cards. */
  spaced: number;
  cards: number;
  reviewed: number;
  attempts: number;
}

export function conceptMastery(
  cards: readonly CardHistory[],
  attempts: number,
  now: number,
): MasteryInfo {
  const reviewed = cards.filter((c) => c.reviews.length > 0 && c.state && c.state.phase !== 'new');
  const rs = cards.map((c) => (c.state ? retrievability(c.state, now) : 0));
  const minR = rs.length ? Math.min(...rs) : 0;
  const perCard = cards.map((c) => spacedCorrectSinceLapse(c.reviews));
  const spaced = perCard.reduce((a, b) => a + b, 0);
  const minSpaced = perCard.length ? Math.min(...perCard) : 0;
  const touched = cards.some((c) => c.reviews.length > 0) || attempts > 0;

  let level: MasteryLevel = touched ? 1 : 0;
  const allSeen = cards.length > 0 && reviewed.length === cards.length;
  if (allSeen && minR >= THRESHOLDS.familiar.minR && spaced >= THRESHOLDS.familiar.spacedTotal) {
    level = 2;
    if (minR >= THRESHOLDS.proficient.minR && minSpaced >= THRESHOLDS.proficient.spacedPerCard) {
      level = 3;
      if (minR >= THRESHOLDS.mastered.minR && minSpaced >= THRESHOLDS.mastered.spacedPerCard) {
        level = 4;
      }
    }
  }
  return { level, minR, spaced, cards: cards.length, reviewed: reviewed.length, attempts };
}

export interface MasteryInput {
  /** Deck cards (only `id` and `concepts` are read). */
  cards: readonly { id: string; concepts: readonly string[] }[];
  states: ReadonlyMap<string, CardState>;
  /** Reviews grouped by card id. */
  reviews: ReadonlyMap<string, readonly ReviewEntry[]>;
  /** Quiz attempts (only `concepts` is read). */
  attempts?: readonly { concepts: readonly string[] }[];
  now: number;
}

/** Mastery of every concept that has a card or a quiz attempt. */
export function masteryByConcept(input: MasteryInput): Map<string, MasteryInfo> {
  const cardsOf = new Map<string, CardHistory[]>();
  for (const c of input.cards) {
    const h: CardHistory = {
      state: input.states.get(c.id),
      reviews: input.reviews.get(c.id) ?? [],
    };
    for (const concept of c.concepts) {
      const list = cardsOf.get(concept) ?? [];
      list.push(h);
      cardsOf.set(concept, list);
    }
  }
  const attemptsOf = new Map<string, number>();
  for (const a of input.attempts ?? []) {
    for (const concept of a.concepts) attemptsOf.set(concept, (attemptsOf.get(concept) ?? 0) + 1);
  }
  const out = new Map<string, MasteryInfo>();
  for (const concept of new Set([...cardsOf.keys(), ...attemptsOf.keys()])) {
    out.set(
      concept,
      conceptMastery(cardsOf.get(concept) ?? [], attemptsOf.get(concept) ?? 0, input.now),
    );
  }
  return out;
}
