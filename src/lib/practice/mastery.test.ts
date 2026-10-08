import { describe, expect, it } from 'vitest';

import {
  conceptMastery,
  masteryByConcept,
  SPACED_MS,
  spacedCorrectSinceLapse,
  type CardHistory,
} from './mastery';
import {
  newCardState,
  review,
  type CardState,
  type RatingName,
  type ReviewEntry,
} from './scheduler';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 19, 0);

/** Replay ratings at the given times on one card. */
function history(steps: [RatingName, number][]): CardHistory & { state: CardState } {
  let state = newCardState(steps[0]?.[1] ?? T0);
  const reviews: ReviewEntry[] = [];
  for (const [rating, at] of steps) {
    const r = review(state, rating, at);
    state = r.state;
    reviews.push(r.entry);
  }
  return { state, reviews };
}

/** Good at each due time, n times, starting with Easy so day-scale intervals start at once. */
function studied(n: number): CardHistory & { state: CardState } {
  let h = history([['easy', T0]]);
  for (let i = 0; i < n; i++) {
    const at = h.state.due;
    const r = review(h.state, 'good', at);
    h = { state: r.state, reviews: [...h.reviews, r.entry] };
  }
  return h;
}

describe('spacedCorrectSinceLapse', () => {
  it('counts only correct reviews at least 0.8 day after the previous one', () => {
    const h = history([
      ['good', T0],
      ['good', T0 + 600_000],
      ['good', T0 + SPACED_MS + 600_000],
      ['hard', T0 + 3 * DAY],
    ]);
    expect(spacedCorrectSinceLapse(h.reviews)).toBe(2);
  });

  it('resets at the last lapse', () => {
    const h = history([
      ['easy', T0],
      ['good', T0 + 3 * DAY],
      ['again', T0 + 10 * DAY],
      ['good', T0 + 10 * DAY + 600_000],
    ]);
    expect(spacedCorrectSinceLapse(h.reviews)).toBe(0);
  });
});

describe('conceptMastery', () => {
  it('is Not started with no reviews and no attempts', () => {
    expect(conceptMastery([{ reviews: [] }], 0, T0).level).toBe(0);
  });

  it('is Attempted after a quiz attempt or a same-day review', () => {
    expect(conceptMastery([{ reviews: [] }], 1, T0).level).toBe(1);
    const h = history([['good', T0]]);
    expect(conceptMastery([h], 0, T0).level).toBe(1);
  });

  it('stays at Attempted while any card of the concept is unseen', () => {
    const seen = studied(3);
    const now = seen.state.lastReview ?? T0;
    expect(conceptMastery([seen, { reviews: [] }], 0, now).level).toBe(1);
  });

  it('promotes with spaced correct reviews: Familiar, Proficient, Mastered', () => {
    const one = studied(1);
    expect(conceptMastery([one], 0, one.state.lastReview ?? T0).level).toBe(3);
    const two = studied(2);
    expect(conceptMastery([two], 0, two.state.lastReview ?? T0).level).toBe(4);
    // Familiar: two cards, one spaced correct review between them.
    const fresh = history([['easy', T0]]);
    const now = Math.max(one.state.lastReview ?? 0, T0);
    const r = conceptMastery([one, fresh], 0, now);
    expect(r.level).toBe(2);
    expect(r.spaced).toBe(1);
  });

  it('demotes when retrievability decays', () => {
    const two = studied(2);
    const later = (two.state.lastReview ?? T0) + 3000 * DAY;
    const r = conceptMastery([two], 0, later);
    expect(r.minR).toBeLessThan(0.7);
    expect(r.level).toBe(1);
  });

  it('demotes after a lapse', () => {
    const two = studied(2);
    const at = two.state.due;
    const lapsed = review(two.state, 'again', at);
    const h = { state: lapsed.state, reviews: [...two.reviews, lapsed.entry] };
    expect(conceptMastery([h], 0, at).level).toBeLessThan(3);
  });

  it('caps concepts without cards at Attempted', () => {
    expect(conceptMastery([], 5, T0).level).toBe(1);
  });
});

describe('masteryByConcept', () => {
  it('groups cards and attempts by concept', () => {
    const two = studied(2);
    const now = two.state.lastReview ?? T0;
    const m = masteryByConcept({
      cards: [
        { id: 'a', concepts: ['x', 'y'] },
        { id: 'b', concepts: ['y'] },
      ],
      states: new Map([['a', two.state]]),
      reviews: new Map([['a', two.reviews]]),
      attempts: [{ concepts: ['z'] }],
      now,
    });
    expect(m.get('x')?.level).toBe(4);
    expect(m.get('y')?.level).toBe(1);
    expect(m.get('z')).toMatchObject({ level: 1, cards: 0, attempts: 1 });
  });
});
