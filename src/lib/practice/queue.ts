/**
 * Today's review queue (VISION.md §7 "Practice"). Pure. The due summary the
 * home page reads lives in ./due-summary.ts and uses the same constants, so
 * the two counts always agree.
 *
 * Order of a session: cards already due (oldest first), then up to
 * `NEW_PER_DAY` new cards in course order, then learning cards that fall due
 * within `LEARN_AHEAD_MS` (so a card rated Again comes back after the others,
 * not immediately).
 */
import { LEARN_AHEAD_MS, NEW_PER_DAY, type QueueInput } from './due-summary';
import { isDue } from './scheduler';

export interface Queue {
  /** Reviewed cards due now, oldest due first. */
  due: string[];
  /** New cards for today, in course order. */
  fresh: string[];
  /** Learning cards due within the learn-ahead window, soonest first. */
  ahead: string[];
}

export function buildQueue(input: QueueInput): Queue {
  const { deck, states, now } = input;
  const perDay = input.newPerDay ?? NEW_PER_DAY;
  const order = new Map(deck.map((id, i) => [id, i]));
  const byDue = (a: string, b: string) =>
    (states.get(a)?.due ?? 0) - (states.get(b)?.due ?? 0) ||
    (order.get(a) ?? 0) - (order.get(b) ?? 0);

  const due: string[] = [];
  const ahead: string[] = [];
  const unseen: string[] = [];
  for (const id of deck) {
    const s = states.get(id);
    if (!s || s.phase === 'new') unseen.push(id);
    else if (isDue(s, now)) due.push(id);
    else if (s.phase !== 'review' && isDue(s, now + LEARN_AHEAD_MS)) ahead.push(id);
  }
  return {
    due: due.sort(byDue),
    fresh: unseen.slice(0, Math.max(0, perDay - input.newToday)),
    ahead: ahead.sort(byDue),
  };
}

/** The next card to show, or null when the session is over. */
export function nextCard(queue: Queue): string | null {
  return queue.due[0] ?? queue.fresh[0] ?? queue.ahead[0] ?? null;
}

export function queueSize(queue: Queue): number {
  return queue.due.length + queue.fresh.length + queue.ahead.length;
}

export { makeDueSummary } from './due-summary';
export type { DueSummary, QueueInput } from './due-summary';
