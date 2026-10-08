import { describe, expect, it } from 'vitest';

import {
  formatInterval,
  isDue,
  newCardState,
  preview,
  RATINGS,
  retrievability,
  review,
  type CardState,
} from './scheduler';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 7, 19, 30);

/** Review at each due time with the same rating; returns the intervals in days. */
function intervals(rating: 'good' | 'easy', n: number): number[] {
  let s: CardState = newCardState(T0);
  let now = T0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const next = review(s, rating, now).state;
    out.push((next.due - now) / DAY);
    s = next;
    now = next.due;
  }
  return out;
}

describe('scheduler', () => {
  it('starts new cards in the new phase, not due, with zero retrievability', () => {
    const s = newCardState(T0);
    expect(s.phase).toBe('new');
    expect(s.reps).toBe(0);
    expect(isDue(s, T0 + 10 * DAY)).toBe(false);
    expect(retrievability(s, T0)).toBe(0);
  });

  it('round-trips through JSON unchanged', () => {
    const s = review(newCardState(T0), 'good', T0).state;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('grows intervals with repeated Good once the card graduates', () => {
    const days = intervals('good', 7);
    // learning steps first (minutes), then day-scale intervals that keep growing
    expect(days[0]).toBeLessThan(1);
    const graduated = days.filter((d) => d >= 1);
    expect(graduated.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < graduated.length; i++) {
      expect(graduated[i]).toBeGreaterThan(graduated[i - 1] ?? 0);
    }
  });

  it('gives Easy longer intervals than Good', () => {
    const easy = review(newCardState(T0), 'easy', T0).state;
    const good = review(newCardState(T0), 'good', T0).state;
    expect(easy.due).toBeGreaterThan(good.due);
    expect(easy.phase).toBe('review');
  });

  it('resets to relearning with a short interval on Again, and counts the lapse', () => {
    let s = newCardState(T0);
    let now = T0;
    for (let i = 0; i < 4; i++) {
      s = review(s, 'good', now).state;
      now = s.due;
    }
    expect(s.phase).toBe('review');
    const before = s.due - (s.lastReview ?? 0);
    const { state: lapsed, entry } = review(s, 'again', now);
    expect(lapsed.phase).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due - now).toBeLessThan(DAY);
    expect(lapsed.due - now).toBeLessThan(before);
    expect(lapsed.stability).toBeLessThan(s.stability);
    expect(entry).toMatchObject({ rating: 'again', phase: 'review', at: now });
    expect(entry.elapsedMs).toBe(now - (s.lastReview ?? 0));
  });

  it('is due exactly from its due time on', () => {
    const s = review(newCardState(T0), 'easy', T0).state;
    expect(isDue(s, s.due - 1)).toBe(false);
    expect(isDue(s, s.due)).toBe(true);
    expect(isDue(s, s.due + DAY)).toBe(true);
  });

  it('has retrievability near 0.9 at the scheduled interval and decaying after', () => {
    const s = review(newCardState(T0), 'easy', T0).state;
    expect(retrievability(s, T0)).toBeCloseTo(1, 5);
    const atDue = retrievability(s, s.due);
    expect(atDue).toBeGreaterThan(0.85);
    expect(atDue).toBeLessThan(0.95);
    expect(retrievability(s, s.due + 30 * DAY)).toBeLessThan(atDue);
  });

  it('previews four increasing due times', () => {
    const p = preview(newCardState(T0), T0);
    const dues = RATINGS.map((r) => p[r]);
    for (let i = 1; i < dues.length; i++) expect(dues[i]).toBeGreaterThanOrEqual(dues[i - 1] ?? 0);
    expect(p.easy).toBeGreaterThan(p.again);
  });

  it('records a null elapsed time on the first review', () => {
    expect(review(newCardState(T0), 'good', T0).entry.elapsedMs).toBeNull();
  });
});

describe('formatInterval', () => {
  it('formats minutes, hours, days, months, and years', () => {
    expect(formatInterval(30_000)).toBe('1 min');
    expect(formatInterval(10 * 60_000)).toBe('10 min');
    expect(formatInterval(3 * 3_600_000)).toBe('3 h');
    expect(formatInterval(4 * DAY)).toBe('4 d');
    expect(formatInterval(65 * DAY)).toBe('2 mo');
    expect(formatInterval(550 * DAY)).toBe('1.5 y');
  });
});
