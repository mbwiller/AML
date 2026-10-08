/**
 * Progress persistence (VISION.md §9.11; tech-stack.md §6 "Storage"): FSRS
 * card state, the review log, quiz attempts, and a little metadata, all in
 * the browser. No login, no network.
 *
 * `openStore()` prefers IndexedDB (Dexie, database `aml-atlas`, loaded as its
 * own chunk from ./store-dexie.ts) and falls back to one localStorage key
 * (`aml-practice`) when IndexedDB is unavailable (some private modes), then to
 * memory when storage is blocked entirely. All three implement the same small
 * interface, so the island never knows which one it has.
 *
 * The record shapes are last-write-wins mergeable without a user id (one card
 * row per card id; reviews and attempts keyed by `<id>@<ms>`), so import and
 * any later sync are additive. Export and import live in ./transfer.ts.
 */
import type { CardState, ReviewEntry } from './scheduler';

export const DB_NAME = 'aml-atlas';
export const LOCAL_STORE_KEY = 'aml-practice';

export interface StoredCard extends CardState {
  /** Deck card id (`card:def-6-3-1`, `fc-u6-l3-010`, …). */
  id: string;
  /** Last write, Unix ms. */
  updatedAt: number;
}

export interface StoredReview extends ReviewEntry {
  /** `<cardId>@<at>`: unique, so merging two logs never duplicates a review. */
  id: string;
  cardId: string;
}

export interface StoredAttempt {
  /** `<itemId>@<at>`. */
  id: string;
  itemId: string;
  unit: string;
  concepts: string[];
  correct: boolean;
  at: number;
  /** The chosen distractor's misconception id, when it had one. */
  misconception?: string | undefined;
  /** Seed of the quiz the attempt belonged to. */
  quizSeed?: number | undefined;
}

export interface MetaEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface ProgressData {
  cards: StoredCard[];
  reviews: StoredReview[];
  attempts: StoredAttempt[];
  meta: MetaEntry[];
}

export type StoreKind = 'indexeddb' | 'localstorage' | 'memory';

export interface ProgressStore {
  readonly kind: StoreKind;
  load(): Promise<ProgressData>;
  /** Write a card's new state and its review in one step. */
  saveReview(card: StoredCard, review: StoredReview): Promise<void>;
  addAttempt(attempt: StoredAttempt): Promise<void>;
  setMeta(entry: MetaEntry): Promise<void>;
  /** Replace everything (import after merging). */
  replace(data: ProgressData): Promise<void>;
  clear(): Promise<void>;
}

export const emptyProgress = (): ProgressData => ({
  cards: [],
  reviews: [],
  attempts: [],
  meta: [],
});

export const reviewId = (cardId: string, at: number) => `${cardId}@${at}`;
export const attemptId = (itemId: string, at: number) => `${itemId}@${at}`;

/** Group reviews by card id. */
export function reviewsByCard(reviews: readonly StoredReview[]): Map<string, StoredReview[]> {
  const out = new Map<string, StoredReview[]>();
  for (const r of reviews) {
    const list = out.get(r.cardId) ?? [];
    list.push(r);
    out.set(r.cardId, list);
  }
  return out;
}

export function metaValue<T>(data: ProgressData, key: string): T | undefined {
  return data.meta.find((m) => m.key === key)?.value as T | undefined;
}

// ---------------------------------------------------------------------------
// Pure helpers over a ProgressData snapshot (shared by the local and memory stores)
// ---------------------------------------------------------------------------

function upsert<T>(list: T[], item: T, keyOf: (t: T) => string): T[] {
  const k = keyOf(item);
  const i = list.findIndex((x) => keyOf(x) === k);
  if (i === -1) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

export function applyReview(
  data: ProgressData,
  card: StoredCard,
  review: StoredReview,
): ProgressData {
  return {
    ...data,
    cards: upsert(data.cards, card, (c) => c.id),
    reviews: upsert(data.reviews, review, (r) => r.id),
  };
}

export function applyAttempt(data: ProgressData, attempt: StoredAttempt): ProgressData {
  return { ...data, attempts: upsert(data.attempts, attempt, (a) => a.id) };
}

export function applyMeta(data: ProgressData, entry: MetaEntry): ProgressData {
  return { ...data, meta: upsert(data.meta, entry, (m) => m.key) };
}

// ---------------------------------------------------------------------------
// Memory and localStorage stores
// ---------------------------------------------------------------------------

/** Minimal Storage surface, so tests can pass a Map-backed fake. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function snapshotStore(
  kind: StoreKind,
  read: () => ProgressData,
  write: (d: ProgressData) => void,
): ProgressStore {
  return {
    kind,
    load: () => Promise.resolve(structuredClone(read())),
    saveReview: (card, review) => Promise.resolve(write(applyReview(read(), card, review))),
    addAttempt: (attempt) => Promise.resolve(write(applyAttempt(read(), attempt))),
    setMeta: (entry) => Promise.resolve(write(applyMeta(read(), entry))),
    replace: (data) => Promise.resolve(write(structuredClone(data))),
    clear: () => Promise.resolve(write(emptyProgress())),
  };
}

export function createMemoryStore(initial: ProgressData = emptyProgress()): ProgressStore {
  let data = structuredClone(initial);
  return snapshotStore(
    'memory',
    () => data,
    (d) => {
      data = d;
    },
  );
}

/** Parse the localStorage copy leniently: a corrupt value reads as empty. */
export function parseLocalProgress(raw: string | null): ProgressData {
  if (!raw) return emptyProgress();
  try {
    const v = JSON.parse(raw) as Partial<ProgressData> | null;
    return {
      cards: Array.isArray(v?.cards) ? v.cards : [],
      reviews: Array.isArray(v?.reviews) ? v.reviews : [],
      attempts: Array.isArray(v?.attempts) ? v.attempts : [],
      meta: Array.isArray(v?.meta) ? v.meta : [],
    };
  } catch {
    return emptyProgress();
  }
}

export function createLocalStore(
  storage: KeyValueStorage,
  key: string = LOCAL_STORE_KEY,
): ProgressStore {
  return snapshotStore(
    'localstorage',
    () => parseLocalProgress(storage.getItem(key)),
    (d) => storage.setItem(key, JSON.stringify(d)),
  );
}

function localStorageWorks(): boolean {
  try {
    const probe = '__aml_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** IndexedDB if it opens, else localStorage, else memory. */
export async function openStore(): Promise<ProgressStore> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no IndexedDB');
    const { openDexieStore } = await import('./store-dexie');
    return await openDexieStore();
  } catch {
    if (typeof localStorage !== 'undefined' && localStorageWorks()) {
      return createLocalStore(localStorage);
    }
    return createMemoryStore();
  }
}
