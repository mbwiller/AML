import { describe, expect, it } from 'vitest';

import {
  countFromSummary,
  localDay,
  makeDueSummary,
  parseDueSummary,
  LEARN_AHEAD_MS,
} from './due-summary';
import { buildQueue, nextCard, queueSize } from './queue';
import { newCardState, review, type CardState } from './scheduler';

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 7, 19, 30).getTime();
const deck = Array.from({ length: 15 }, (_, i) => `c${i}`);

function reviewed(rating: 'good' | 'easy' | 'again', at: number): CardState {
  return review(newCardState(at), rating, at).state;
}

describe('buildQueue', () => {
  it('offers up to ten new cards in course order when nothing has been reviewed', () => {
    const q = buildQueue({ deck, states: new Map(), now: T0, newToday: 0 });
    expect(q.due).toEqual([]);
    expect(q.fresh).toEqual(deck.slice(0, 10));
    expect(nextCard(q)).toBe('c0');
  });

  it('respects the new cards already introduced today', () => {
    const q = buildQueue({ deck, states: new Map(), now: T0, newToday: 7 });
    expect(q.fresh).toHaveLength(3);
    expect(buildQueue({ deck, states: new Map(), now: T0, newToday: 12 }).fresh).toEqual([]);
  });

  it('puts due cards first, oldest due first, and drops a card that was just rated Easy', () => {
    const states = new Map<string, CardState>([
      ['c3', reviewed('easy', T0 - 30 * DAY)],
      ['c5', reviewed('easy', T0 - 40 * DAY)],
      ['c7', reviewed('easy', T0)],
    ]);
    const q = buildQueue({ deck, states, now: T0, newToday: 0 });
    expect(q.due).toEqual(['c5', 'c3']);
    expect(q.fresh).not.toContain('c7');
    expect(q.fresh).toEqual(['c0', 'c1', 'c2', 'c4', 'c6', 'c8', 'c9', 'c10', 'c11', 'c12']);
    expect(nextCard(q)).toBe('c5');
  });

  it('brings learning cards back after the rest, within the learn-ahead window', () => {
    const states = new Map<string, CardState>([['c0', reviewed('again', T0)]]);
    const q = buildQueue({ deck: ['c0', 'c1'], states, now: T0, newToday: 1 });
    expect(q.due).toEqual([]);
    expect(q.fresh).toEqual(['c1']);
    expect(q.ahead).toEqual(['c0']);
    expect(queueSize(q)).toBe(2);
  });
});

describe('due summary', () => {
  it('matches the queue size now and counts cards that fall due later', () => {
    const states = new Map<string, CardState>([
      ['c3', reviewed('easy', T0 - 30 * DAY)],
      ['c7', reviewed('easy', T0)],
      ['c8', reviewed('again', T0)],
    ]);
    const input = { deck, states, now: T0, newToday: 3 };
    const summary = makeDueSummary(input);
    const q = buildQueue(input);
    const now = countFromSummary(summary, T0);
    expect(now.due + now.fresh).toBe(queueSize(q));
    expect(now.fresh).toBe(7);
    const c7 = states.get('c7');
    const later = countFromSummary(summary, (c7?.due ?? 0) + 1);
    expect(later.due).toBe(3);
  });

  it('resets the new-card allowance on a new local day', () => {
    const summary = makeDueSummary({ deck, states: new Map(), now: T0, newToday: 10 });
    expect(countFromSummary(summary, T0).fresh).toBe(0);
    expect(countFromSummary(summary, T0 + DAY).fresh).toBe(10);
    expect(summary.day).toBe(localDay(T0));
  });

  it('parses its own output and rejects junk', () => {
    const summary = makeDueSummary({ deck, states: new Map(), now: T0, newToday: 0 });
    expect(parseDueSummary(JSON.stringify(summary))).toEqual(summary);
    expect(parseDueSummary('{"v":2}')).toBeNull();
    expect(parseDueSummary('nope')).toBeNull();
    expect(parseDueSummary(null)).toBeNull();
  });

  it('enters learning cards into the count a learn-ahead window early', () => {
    const states = new Map<string, CardState>([['c0', reviewed('good', T0)]]);
    const summary = makeDueSummary({ deck: ['c0'], states, now: T0, newToday: 1 });
    const due = states.get('c0')?.due ?? 0;
    expect(summary.dueTimes).toEqual([due - LEARN_AHEAD_MS]);
  });
});
