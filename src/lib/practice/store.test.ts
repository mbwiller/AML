import { describe, expect, it } from 'vitest';

import { newCardState, review } from './scheduler';
import {
  attemptId,
  createLocalStore,
  createMemoryStore,
  LOCAL_STORE_KEY,
  parseLocalProgress,
  reviewId,
  reviewsByCard,
  type ProgressStore,
  type StoredCard,
  type StoredReview,
} from './store';
import {
  buildExport,
  EXPORT_FORMAT,
  exportProgress,
  importProgress,
  mergeLocal,
  mergeProgress,
  parseExport,
} from './transfer';

/** A Map-backed Storage (node has no localStorage). */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const T0 = Date.UTC(2026, 9, 7, 19, 30);

function rate(
  id: string,
  rating: 'again' | 'good' | 'easy',
  at: number,
  from = newCardState(at),
): { card: StoredCard; review: StoredReview } {
  const r = review(from, rating, at);
  return {
    card: { id, ...r.state, updatedAt: at },
    review: { id: reviewId(id, at), cardId: id, ...r.entry },
  };
}

async function seed(store: ProgressStore) {
  const a = rate('card:def-6-3-1', 'good', T0);
  await store.saveReview(a.card, a.review);
  const b = rate('card:der-6-3-2:when', 'easy', T0 + 1000);
  await store.saveReview(b.card, b.review);
  await store.addAttempt({
    id: attemptId('q-u6-l3-001', T0),
    itemId: 'q-u6-l3-001',
    unit: 'u6-generative-models-and-naive-bayes',
    concepts: ['naive-bayes-assumption'],
    correct: false,
    misconception: 'nb-iid-confusion',
    at: T0,
  });
  await store.setMeta({ key: 'new-today', value: { day: '2026-10-07', count: 2 }, updatedAt: T0 });
}

describe('localStorage store', () => {
  it('persists cards, reviews, attempts, and meta under one key', async () => {
    const storage = new FakeStorage();
    const store = createLocalStore(storage);
    expect(store.kind).toBe('localstorage');
    await seed(store);
    // A second store over the same storage sees the same data (a reload).
    const data = await createLocalStore(storage).load();
    expect(data.cards.map((c) => c.id).sort()).toEqual(['card:def-6-3-1', 'card:der-6-3-2:when']);
    expect(data.reviews).toHaveLength(2);
    expect(data.attempts[0]?.misconception).toBe('nb-iid-confusion');
    expect(data.meta[0]?.value).toEqual({ day: '2026-10-07', count: 2 });
    expect(JSON.parse(storage.getItem(LOCAL_STORE_KEY) ?? '{}')).toHaveProperty('cards');
  });

  it('replaces a card row on a later review instead of duplicating it', async () => {
    const store = createLocalStore(new FakeStorage());
    const first = rate('c', 'easy', T0);
    await store.saveReview(first.card, first.review);
    const second = rate('c', 'good', first.card.due, first.card);
    await store.saveReview(second.card, second.review);
    const data = await store.load();
    expect(data.cards).toHaveLength(1);
    expect(data.cards[0]?.reps).toBe(2);
    expect(reviewsByCard(data.reviews).get('c')).toHaveLength(2);
  });

  it('reads a corrupt value as empty and clears', async () => {
    expect(parseLocalProgress('{oops')).toEqual({ cards: [], reviews: [], attempts: [], meta: [] });
    const storage = new FakeStorage();
    const store = createLocalStore(storage);
    await seed(store);
    await store.clear();
    expect((await store.load()).cards).toEqual([]);
  });

  it('memory store behaves the same', async () => {
    const store = createMemoryStore();
    await seed(store);
    expect((await store.load()).reviews).toHaveLength(2);
  });
});

describe('export and import', () => {
  it('round-trips practice data and the lesson-page keys through JSON', async () => {
    const storage = new FakeStorage();
    storage.setItem(
      'aml-last-lesson',
      JSON.stringify({ href: '/units/u/l', number: '6.3', title: 'NB', progress: 0.4, at: T0 }),
    );
    storage.setItem('aml-derivation:der-6-3-2', '5');
    storage.setItem('aml-theme', 'dark');
    const store = createLocalStore(storage);
    await seed(store);

    const json = await exportProgress(store, storage, T0 + 5000);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['format']).toBe(EXPORT_FORMAT);
    expect(parsed['version']).toBe(1);
    expect(Object.keys(parsed['local'] as object).sort()).toEqual([
      'aml-derivation:der-6-3-2',
      'aml-last-lesson',
    ]);

    // Clear everything, then import into a fresh store.
    const fresh = new FakeStorage();
    const target = createLocalStore(fresh);
    const result = await importProgress(target, fresh, json);
    expect(result.ok).toBe(true);
    const before = await store.load();
    const after = await target.load();
    expect(after.cards.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      before.cards.sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(after.reviews).toHaveLength(2);
    expect(after.attempts).toHaveLength(1);
    expect(after.meta).toEqual(before.meta);
    expect(fresh.getItem('aml-derivation:der-6-3-2')).toBe('5');
    expect(fresh.getItem('aml-last-lesson')).toContain('"6.3"');
    expect(fresh.getItem('aml-theme')).toBeNull();

    // Importing the same file again changes nothing.
    await importProgress(target, fresh, json);
    expect(await target.load()).toEqual(after);
  });

  it('rejects files that are not progress exports', async () => {
    const store = createMemoryStore();
    expect(parseExport('not json').ok).toBe(false);
    const wrong = await importProgress(store, null, JSON.stringify({ format: 'x', version: 1 }));
    expect(wrong.ok).toBe(false);
    const bad = buildExport({ cards: [], reviews: [], attempts: [], meta: [] }, {}, T0);
    const tampered = JSON.stringify({ ...bad, practice: { ...bad.practice, cards: [{ id: 1 }] } });
    const r = parseExport(tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('practice.cards');
  });

  it('merges cards by latest review and reviews as a union', () => {
    const old = rate('c', 'easy', T0);
    const newer = rate('c', 'good', old.card.due, old.card);
    const other = rate('d', 'good', T0);
    const merged = mergeProgress(
      { cards: [newer.card], reviews: [old.review, newer.review], attempts: [], meta: [] },
      {
        cards: [old.card, other.card],
        reviews: [old.review, other.review],
        attempts: [],
        meta: [],
      },
    );
    expect(merged.cards.find((c) => c.id === 'c')).toEqual(newer.card);
    expect(merged.cards.find((c) => c.id === 'd')).toEqual(other.card);
    expect(merged.reviews.map((r) => r.id)).toEqual([
      old.review.id,
      other.review.id,
      newer.review.id,
    ]);
  });

  it('merges lesson keys: later last lesson, larger derivation count', () => {
    const last = (at: number) =>
      JSON.stringify({ href: '/a', number: '1.1', title: 'A', progress: 0.1, at });
    expect(
      mergeLocal(
        { 'aml-last-lesson': last(10), 'aml-derivation:der-1': '7' },
        {
          'aml-last-lesson': last(5),
          'aml-derivation:der-1': '3',
          'aml-derivation:der-2': '2',
          'aml-theme': 'dark',
        },
      ),
    ).toEqual({ 'aml-derivation:der-2': '2' });
    expect(mergeLocal({ 'aml-last-lesson': last(5) }, { 'aml-last-lesson': last(10) })).toEqual({
      'aml-last-lesson': last(10),
    });
  });
});
