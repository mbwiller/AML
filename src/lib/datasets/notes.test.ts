import { describe, expect, it } from 'vitest';

import { VOCABULARY, VOCABULARY_SIZE, WORD_INDEX, slotOf, wordsOfSlot } from './notes-vocabulary';
import {
  bagOfWords,
  bernoulliPsi,
  generate,
  noteText,
  presentWords,
  spec,
  tokenize,
} from './notes';
import { stableStringify } from './serialize';

const dataset = generate();
const psi = dataset.generativeModel.parameters.psi as [number[], number[]];

describe('NOTES vocabulary', () => {
  it('has exactly 2,000 unique lowercase words in alphabetical order', () => {
    expect(VOCABULARY).toHaveLength(VOCABULARY_SIZE);
    expect(new Set(VOCABULARY).size).toBe(VOCABULARY_SIZE);
    expect([...VOCABULARY].sort()).toEqual([...VOCABULARY]);
    expect(VOCABULARY.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    expect(WORD_INDEX.get(VOCABULARY[17] ?? '')).toBe(17);
  });

  it("contains Part C's marker words in the marker slots", () => {
    for (const w of ['hospitalized', 'syncope', 'arrhythmia', 'icu', 'discontinued']) {
      expect(slotOf(w)).toBe('serious');
    }
    for (const w of ['mild', 'headache', 'resolved', 'nausea'])
      expect(slotOf(w)).toBe('nonserious');
    expect(wordsOfSlot('drug').length).toBeGreaterThan(100);
  });
});

describe('NOTES generator', () => {
  it('is deterministic: same seed gives the identical JSON string', () => {
    expect(stableStringify(generate(spec.seed))).toBe(stableStringify(dataset));
    expect(stableStringify(generate(spec.seed + 1))).not.toBe(stableStringify(dataset));
  });

  it('has n rows with unique, well-formed, stable ids', () => {
    expect(dataset.n).toBe(6000);
    expect(dataset.rows).toHaveLength(6000);
    const ids = dataset.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(6000);
    expect(ids.every((id) => /^NOTE-\d{4}$/.test(id))).toBe(true);
    expect(ids[0]).toBe('NOTE-0001');
    expect(ids[5999]).toBe('NOTE-6000');
  });

  it('stores the true parameters: phi, psi rows summing to 1, the vocabulary', () => {
    expect(dataset.generativeModel.parameters.phi).toEqual([0.7, 0.3]);
    expect(dataset.generativeModel.parameters.vocabulary).toEqual(VOCABULARY);
    for (const row of psi) {
      expect(row).toHaveLength(VOCABULARY_SIZE);
      const sum = row.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
      expect(row.every((p) => p > 0)).toBe(true);
    }
    const j = WORD_INDEX.get('hospitalized') ?? -1;
    expect(psi[1][j]).toBeGreaterThan((psi[0][j] ?? 0) * 4);
    const k = WORD_INDEX.get('mild') ?? -1;
    expect(psi[0][k]).toBeGreaterThan((psi[1][k] ?? 0) * 4);
  });

  it('label prior is within tolerance of phi', () => {
    const serious = dataset.rows.filter((r) => r.y === 1).length / dataset.n;
    expect(Math.abs(serious - 0.3)).toBeLessThan(0.02);
  });

  it('document length is Poisson(25)-like', () => {
    const lengths = dataset.rows.map((r) => r.w.length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    expect(Math.abs(mean - 25)).toBeLessThan(0.3);
  });

  it('per-word frequencies match psi within sampling tolerance (multinomial NB)', () => {
    for (const k of [0, 1] as const) {
      const counts = new Array<number>(VOCABULARY_SIZE).fill(0);
      let total = 0;
      for (const r of dataset.rows) {
        if (r.y !== k) continue;
        for (const j of r.w) counts[j] = (counts[j] ?? 0) + 1;
        total += r.w.length;
      }
      let l1 = 0;
      for (let j = 0; j < VOCABULARY_SIZE; j++) {
        const p = psi[k][j] ?? 0;
        const f = (counts[j] ?? 0) / total;
        l1 += Math.abs(f - p);
        const tol = 5 * Math.sqrt((p * (1 - p)) / total) + 4 / total;
        expect(Math.abs(f - p)).toBeLessThanOrEqual(tol);
      }
      expect(l1).toBeLessThan(0.3);
    }
  });

  it('per-word presence rates match the implied Bernoulli psi', () => {
    const pb = bernoulliPsi(psi);
    for (const k of [0, 1] as const) {
      const docs = dataset.rows.filter((r) => r.y === k);
      const present = new Array<number>(VOCABULARY_SIZE).fill(0);
      for (const r of docs) for (const j of presentWords(r)) present[j] = (present[j] ?? 0) + 1;
      for (let j = 0; j < VOCABULARY_SIZE; j++) {
        const p = pb[k]?.[j] ?? 0;
        const f = (present[j] ?? 0) / docs.length;
        const tol = 5 * Math.sqrt((p * (1 - p)) / docs.length) + 4 / docs.length;
        expect(Math.abs(f - p)).toBeLessThanOrEqual(tol);
      }
    }
  });

  it('renders a note whose tokens are exactly the row’s bag of words', () => {
    for (const r of dataset.rows.slice(0, 200)) {
      const text = noteText(r);
      expect(text.endsWith('.')).toBe(true);
      expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
      expect(bagOfWords({ w: tokenize(text) })).toEqual(bagOfWords(r));
    }
    expect(bagOfWords({ w: [5, 2, 5] })).toEqual([
      [2, 1],
      [5, 2],
    ]);
  });
});
