/**
 * The vectorizer pipeline for given params: fit the vocabulary on the seeded
 * training reports (with and without preprocessing, for the before/after
 * sizes), and transform a text. Shared by the live widget and the static
 * fallback; fits are cached by (trainSize, seed, options).
 */
import { heldOutRow, noteText, trainingRows } from './data';
import type { Params } from './manifest';
import {
  analyze,
  fitVocabulary,
  preprocess,
  tokenizeText,
  transform,
  type Options,
  type ProcessedToken,
  type SparseVector,
  type Vocabulary,
} from './math';

export interface Fit {
  /** Vocabulary with the current preprocessing. */
  vocab: Vocabulary;
  /** Vocabulary with no preprocessing (the "before" size). */
  raw: Vocabulary;
  /** Training report ids, for the readout. */
  ids: readonly string[];
}

const RAW: Options = { removeStopWords: false, stem: false };
const cache = new Map<string, Fit>();

export function fitFor(p: Pick<Params, 'trainSize' | 'seed' | 'removeStopWords' | 'stem'>): Fit {
  const key = `${p.trainSize}:${p.seed}:${p.removeStopWords ? 1 : 0}:${p.stem ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const texts = trainingRows(p.trainSize, p.seed).map((r) => ({ id: r.id, text: noteText(r) }));
  const opts: Options = { removeStopWords: p.removeStopWords, stem: p.stem };
  const fit: Fit = {
    vocab: fitVocabulary(texts.map((t) => analyze(t.text, opts))),
    raw: fitVocabulary(texts.map((t) => analyze(t.text, RAW))),
    ids: texts.map((t) => t.id),
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, fit);
  return fit;
}

export function defaultText(p: Pick<Params, 'seed' | 'report'>): {
  id: string;
  y: 0 | 1;
  text: string;
} {
  const row = heldOutRow(p.seed, p.report);
  return { id: row.id, y: row.y, text: noteText(row) };
}

export interface Vectorized {
  tokens: ProcessedToken[];
  vector: SparseVector;
}

export function vectorizeText(
  text: string,
  vocab: Vocabulary,
  p: Pick<Params, 'binary' | 'removeStopWords' | 'stem'>,
): Vectorized {
  const tokens = preprocess(tokenizeText(text), {
    removeStopWords: p.removeStopWords,
    stem: p.stem,
  });
  const terms = tokens.map((t) => t.term).filter((t): t is string => t !== null);
  return { tokens, vector: transform(terms, vocab, p.binary) };
}
