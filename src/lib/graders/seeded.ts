/**
 * Seeded numeric items (docs/CONTENT_AUTHORING.md §7): `seeded` maps each
 * parameter name to its candidate values and `formula` computes the key from
 * them. `sampleSeededParams` picks one value per parameter deterministically
 * from `seed`, so "new numbers" is reproducible and testable.
 */
import { evaluateFormula } from './formula';

export interface SeededItemLike {
  answer: number;
  seeded?: Readonly<Record<string, readonly number[]>> | undefined;
  formula?: string | undefined;
}

export interface SeededInstance {
  params: Record<string, number>;
  answer: number;
}

/** mulberry32: a small, well-distributed 32-bit PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string (FNV-1a), for seeds derived from item ids. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick one value per seeded parameter (in the item's key order) and evaluate
 * the formula. Items without `seeded` + `formula` return no params and the
 * bank answer.
 */
export function sampleSeededParams(item: SeededItemLike, seed: number): SeededInstance {
  if (!item.seeded || !item.formula) return { params: {}, answer: item.answer };
  const rand = mulberry32(seed);
  const params: Record<string, number> = {};
  for (const [name, values] of Object.entries(item.seeded)) {
    const index = Math.min(values.length - 1, Math.floor(rand() * values.length));
    const value = values[index];
    if (value !== undefined) params[name] = value;
  }
  return { params, answer: evaluateFormula(item.formula, params) };
}
