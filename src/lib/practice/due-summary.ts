/**
 * The due summary the practice island writes to localStorage after every
 * change and the home page's "Due today" card reads (VISION.md §7 "Home").
 * Dependency-free (types only), so the home page's script stays tiny.
 */
import type { CardState } from './scheduler';

export const NEW_PER_DAY = 10;
export const LEARN_AHEAD_MS = 20 * 60_000;
/** localStorage key the island writes after every change; the home page reads it. */
export const DUE_SUMMARY_KEY = 'aml-due-count';

/** Local calendar day `YYYY-MM-DD` (new-card limits reset at local midnight). */
export function localDay(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export interface QueueInput {
  /** Deck card ids in course order. */
  deck: readonly string[];
  states: ReadonlyMap<string, CardState>;
  now: number;
  /** New cards already introduced today. */
  newToday: number;
  newPerDay?: number;
}

export interface DueSummary {
  v: 1;
  /** When it was written, Unix ms. */
  at: number;
  /** Local day of `at`. */
  day: string;
  /**
   * When each reviewed card enters the queue (Unix ms), ascending: its due
   * time, or `LEARN_AHEAD_MS` earlier for a learning or relearning card.
   */
  dueTimes: number[];
  /** New cards still available on `day`. */
  newLeft: number;
  /** Deck cards never reviewed. */
  unseen: number;
  newPerDay: number;
}

export function makeDueSummary(input: QueueInput): DueSummary {
  const perDay = input.newPerDay ?? NEW_PER_DAY;
  const dueTimes: number[] = [];
  let unseen = 0;
  for (const id of input.deck) {
    const s = input.states.get(id);
    if (!s || s.phase === 'new') unseen++;
    else dueTimes.push(s.phase === 'review' ? s.due : s.due - LEARN_AHEAD_MS);
  }
  return {
    v: 1,
    at: input.now,
    day: localDay(input.now),
    dueTimes: dueTimes.sort((a, b) => a - b),
    newLeft: Math.min(unseen, Math.max(0, perDay - input.newToday)),
    unseen,
    newPerDay: perDay,
  };
}

export function parseDueSummary(raw: string | null): DueSummary | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<DueSummary> | null;
    if (
      v?.v === 1 &&
      Array.isArray(v.dueTimes) &&
      v.dueTimes.every((t) => typeof t === 'number') &&
      typeof v.day === 'string' &&
      typeof v.newLeft === 'number' &&
      typeof v.unseen === 'number' &&
      typeof v.newPerDay === 'number'
    ) {
      return v as DueSummary;
    }
  } catch {
    /* corrupt: ignore */
  }
  return null;
}

/**
 * Reviews due and new cards available at `now`, from a summary written
 * earlier. Matches `queueSize(buildQueue(…))` for the same state.
 */
export function countFromSummary(summary: DueSummary, now: number): { due: number; fresh: number } {
  const due = summary.dueTimes.filter((t) => t <= now).length;
  const fresh =
    summary.day === localDay(now) ? summary.newLeft : Math.min(summary.unseen, summary.newPerDay);
  return { due, fresh };
}
