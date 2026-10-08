import notesJson from '@/data/notes.json';
import { bagOfWords, noteText, tokenize, type NotesRow } from '@/lib/datasets/notes';
import { VOCABULARY } from '@/lib/datasets/notes-vocabulary';

import { heldOutRow, notesRows, trainingRows } from './data';
import { params } from './manifest';
import {
  NEGATIONS,
  STOP_WORDS,
  analyze,
  fitVocabulary,
  preprocess,
  stem,
  tokenizeText,
  transform,
} from './math';
import { defaultText, fitFor, vectorizeText } from './pipeline';

const defaults = params.parse({});

describe('tokenizer (CountVectorizer default token_pattern)', () => {
  it('lowercases and keeps runs of two or more word characters', () => {
    expect(tokenizeText('A patient, aged 54, reported NO rash; a rash.')).toEqual([
      'patient',
      'aged',
      '54',
      'reported',
      'no',
      'rash',
      'rash',
    ]);
    expect(tokenizeText(',;. a I')).toEqual([]);
  });

  it('agrees with the NOTES tokenizer on every report, except one-letter words', () => {
    const multi = (row: Pick<NotesRow, 'w'>) =>
      bagOfWords(row).filter(([j]) => (VOCABULARY[j] ?? '').length > 1);
    for (const row of notesRows().slice(0, 300)) {
      const text = noteText(row);
      const vocab = fitVocabulary([VOCABULARY.filter((w) => w.length > 1)]);
      const ours = transform(tokenizeText(text), vocab, false);
      const want = multi(row).map(([j, c]) => [vocab.index.get(VOCABULARY[j] ?? '') ?? -1, c]);
      expect(ours.entries).toEqual(want);
      expect(ours.dropped).toEqual([]);
      // The dataset's own tokenize sees the same words (plus "a").
      expect(tokenize(text).filter((j) => (VOCABULARY[j] ?? '').length > 1)).toHaveLength(ours.sum);
    }
  });
});

describe('stop words', () => {
  it('include the negations, which is the lesson 6.2 pitfall', () => {
    for (const w of NEGATIONS) expect(STOP_WORDS.has(w)).toBe(true);
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('chemotherapy')).toBe(false);
  });

  it('removal makes "no prior chemotherapy" and "prior chemotherapy" the same vector', () => {
    const opts = { removeStopWords: true, stem: false };
    const vocab = fitVocabulary([analyze('no prior chemotherapy', opts)]);
    const a = transform(analyze('no prior chemotherapy', opts), vocab, true);
    const b = transform(analyze('prior chemotherapy', opts), vocab, true);
    expect(a).toEqual(b);
    const keep = { removeStopWords: false, stem: false };
    const v2 = fitVocabulary([analyze('no prior chemotherapy', keep)]);
    expect(transform(analyze('no prior chemotherapy', keep), v2, true)).not.toEqual(
      transform(analyze('prior chemotherapy', keep), v2, true),
    );
  });

  it('preprocess marks removed tokens with a null term', () => {
    expect(preprocess(['the', 'rash'], { removeStopWords: true, stem: false })).toEqual([
      { raw: 'the', term: null, stemmed: false },
      { raw: 'rash', term: 'rash', stemmed: false },
    ]);
  });
});

describe('stemmer (tiny suffix stripper, not Porter)', () => {
  it.each([
    ['slowly', 'slow'],
    ['slowness', 'slow'],
    ['reports', 'report'],
    ['reported', 'report'],
    ['reporting', 'report'],
    ['rashes', 'rash'],
    ['doses', 'dose'],
    ['dosing', 'dose'],
    ['noted', 'note'],
    ['notes', 'note'],
    ['stopped', 'stop'],
    ['admitted', 'admit'],
    ['swelling', 'swell'],
    ['happiness', 'happy'],
    ['dizziness', 'dizzy'],
    ['studies', 'study'],
    ['seizures', 'seizure'],
    ['days', 'day'],
    ['glass', 'glass'],
    ['status', 'status'],
    ['diagnosis', 'diagnosis'],
    ['was', 'was'],
    ['rash', 'rash'],
    ['mg', 'mg'],
  ])('%s → %s', (word, root) => {
    expect(stem(word)).toBe(root);
  });

  it('is deterministic and idempotent on its own output for these words', () => {
    for (const w of ['slowly', 'reported', 'rashes', 'noted', 'stopped', 'dizziness']) {
      expect(stem(stem(w))).toBe(stem(w));
    }
  });

  it('merges inflections, so the fitted vocabulary shrinks', () => {
    const opts = { removeStopWords: false, stem: true };
    const vocab = fitVocabulary([
      analyze('reported reports reporting report slowly slowness', opts),
    ]);
    expect(vocab.terms).toEqual(['report', 'slow']);
  });
});

describe('fit and transform', () => {
  const vocab = fitVocabulary([
    ['rash', 'mild', 'resolved'],
    ['syncope', 'admitted', 'rash'],
  ]);

  it('fit sorts the distinct terms; index is vocabulary_', () => {
    expect(vocab.terms).toEqual(['admitted', 'mild', 'rash', 'resolved', 'syncope']);
    expect(vocab.index.get('rash')).toBe(2);
  });

  it('counts vs binary: repeating a word changes one entry only in count mode', () => {
    const counts = transform(['rash', 'rash', 'rash', 'mild'], vocab, false);
    expect(counts.entries).toEqual([
      [1, 1],
      [2, 3],
    ]);
    expect(counts.sum).toBe(4);
    const binary = transform(['rash', 'rash', 'rash', 'mild'], vocab, true);
    expect(binary.entries).toEqual([
      [1, 1],
      [2, 1],
    ]);
    expect(binary.sum).toBe(2);
  });

  it('a word unseen in training has no column and is dropped', () => {
    const v = transform(['rash', 'zzqx', 'zzqx', 'mild'], vocab, false);
    expect(v.dropped).toEqual(['zzqx']);
    expect(v.size).toBe(5);
    expect(v.sum).toBe(2);
  });
});

describe('NOTES pipeline at the lesson defaults', () => {
  it('the regenerated rows are the committed notes.json rows', () => {
    const committed = (notesJson as unknown as { rows: NotesRow[] }).rows;
    const ours = notesRows();
    expect(ours).toHaveLength(committed.length);
    for (const i of [0, 1, 2, 999, 3000, 5999]) expect(ours[i]).toEqual(committed[i]);
  });

  it('the held-out report is not a training report', () => {
    const train = new Set(trainingRows(200, defaults.seed).map((r) => r.id));
    for (let k = 0; k < 20; k += 1) expect(train.has(heldOutRow(defaults.seed, k).id)).toBe(false);
  });

  it('preprocessing shrinks the vocabulary: raw ≥ stop words removed ≥ also stemmed', () => {
    const raw = fitFor({ ...defaults, removeStopWords: false, stem: false });
    const stop = fitFor({ ...defaults, removeStopWords: true, stem: false });
    const both = fitFor({ ...defaults, removeStopWords: true, stem: true });
    expect(raw.vocab.terms.length).toBe(raw.raw.terms.length);
    expect(stop.vocab.terms.length).toBeLessThan(raw.vocab.terms.length);
    expect(both.vocab.terms.length).toBeLessThan(stop.vocab.terms.length);
    expect(stop.raw).toEqual(raw.raw);
    expect(raw.ids).toHaveLength(defaults.trainSize);
  });

  it('vector sums: count mode sums to the kept tokens with a column, binary to the distinct ones', () => {
    const fit = fitFor(defaults);
    const doc = defaultText(defaults);
    const counts = vectorizeText(doc.text, fit.vocab, { ...defaults, binary: false });
    const binary = vectorizeText(doc.text, fit.vocab, { ...defaults, binary: true });
    const kept = counts.tokens.filter((t) => t.term !== null && fit.vocab.index.has(t.term));
    expect(counts.vector.sum).toBe(kept.length);
    expect(binary.vector.sum).toBe(new Set(kept.map((t) => t.term)).size);
    expect(binary.vector.entries.map(([j]) => j)).toEqual(counts.vector.entries.map(([j]) => j));
    // A held-out report with a 20-report vocabulary usually loses some words.
    expect(counts.vector.dropped.length).toBeGreaterThan(0);
  });
});
