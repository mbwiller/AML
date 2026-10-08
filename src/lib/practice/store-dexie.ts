/**
 * The IndexedDB implementation of ProgressStore (Dexie). Kept thin: every
 * rule lives in the pure modules; this file only maps the interface onto four
 * tables. Loaded lazily by `openStore()` in ./store.ts.
 *
 * Schema v1 (database `aml-atlas`):
 *   cards    `id, due, phase`     one row per reviewed card (StoredCard)
 *   reviews  `id, cardId, at`     the review log (StoredReview)
 *   attempts `id, itemId, at`     quiz attempts (StoredAttempt)
 *   meta     `key`                small values (MetaEntry), e.g. `new-today`
 */
import Dexie, { type Table } from 'dexie';

import {
  DB_NAME,
  type MetaEntry,
  type ProgressStore,
  type StoredAttempt,
  type StoredCard,
  type StoredReview,
} from './store';

class AtlasDb extends Dexie {
  cards!: Table<StoredCard, string>;
  reviews!: Table<StoredReview, string>;
  attempts!: Table<StoredAttempt, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      cards: 'id, due, phase',
      reviews: 'id, cardId, at',
      attempts: 'id, itemId, at',
      meta: 'key',
    });
  }
}

export async function openDexieStore(): Promise<ProgressStore> {
  const db = new AtlasDb();
  await db.open();
  const all = [db.cards, db.reviews, db.attempts, db.meta];
  return {
    kind: 'indexeddb',
    async load() {
      const [cards, reviews, attempts, meta] = await Promise.all([
        db.cards.toArray(),
        db.reviews.toArray(),
        db.attempts.toArray(),
        db.meta.toArray(),
      ]);
      return { cards, reviews, attempts, meta };
    },
    async saveReview(card, review) {
      await db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.put(card);
        await db.reviews.put(review);
      });
    },
    async addAttempt(attempt) {
      await db.attempts.put(attempt);
    },
    async setMeta(entry) {
      await db.meta.put(entry);
    },
    async replace(data) {
      await db.transaction('rw', all, async () => {
        await Promise.all(all.map((t) => t.clear()));
        await db.cards.bulkPut(data.cards);
        await db.reviews.bulkPut(data.reviews);
        await db.attempts.bulkPut(data.attempts);
        await db.meta.bulkPut(data.meta);
      });
    },
    async clear() {
      await db.transaction('rw', all, async () => {
        await Promise.all(all.map((t) => t.clear()));
      });
    },
  };
}
