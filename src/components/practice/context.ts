/**
 * Shared state shape and helpers for the practice island's panels.
 */
import { localDay } from '@/lib/practice/due-summary';
import type { CardState } from '@/lib/practice/scheduler';
import { metaValue, type ProgressData, type ProgressStore } from '@/lib/practice/store';
import type { Deck } from '@/lib/practice/types';

export const NEW_TODAY_KEY = 'new-today';

export interface NewToday {
  day: string;
  count: number;
}

/** New cards introduced on the current local day. */
export function newTodayCount(data: ProgressData, now: number): number {
  const v = metaValue<NewToday>(data, NEW_TODAY_KEY);
  return v && v.day === localDay(now) ? v.count : 0;
}

export function cardStates(data: ProgressData): Map<string, CardState> {
  return new Map(data.cards.map((c) => [c.id, c]));
}

export interface PracticeContext {
  deck: Deck;
  data: ProgressData;
  store: ProgressStore;
  /** Apply a change to the in-memory copy (after writing it to the store). */
  update: (fn: (data: ProgressData) => ProgressData) => void;
  /** Re-read everything from the store (after an import). */
  reload: () => Promise<void>;
}
