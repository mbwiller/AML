/**
 * NOTES (Part C, C6): synthetic adverse-event narratives, generated from a
 * Naive Bayes model so that NB's MLE provably recovers the parameters.
 *
 * Model. For report i: y ~ Bernoulli(φ₁) with φ = (0.7, 0.3) for
 * (non-serious, serious); length L ~ Poisson(25); then L words drawn i.i.d.
 * from Categorical(ψ_y) over the fixed 2,000-word vocabulary. That is the
 * multinomial NB model. Because L is Poisson, the per-word counts are
 * independent Poisson(25 ψ_jy), so the binarized vector has independent
 * coordinates with P(x_j = 1 | y) = 1 − exp(−25 ψ_jy): the Bernoulli NB
 * model of lesson 6.3 is also exactly correct for this data (`psiBernoulli`).
 *
 * Open choices (recorded in docs/decisions/2026-10-07-dataset-generators.md):
 * - ψ is built from slot base weights × a within-slot Zipf profile × a
 *   per-class log-normal perturbation (σ = 0.5) for every slot except the
 *   marker slots, whose class weights are fixed (4 in the up-weighted class,
 *   0.5 in the other). The perturbation uses the seed's "parameters" fork, so
 *   ψ is deterministic and is stored in `generativeModel.parameters.psi`.
 * - Rows store the sampled token sequence `w` (word indices in sampling
 *   order), not text: the text is a deterministic rendering of `w`
 *   (`noteText`), and storing it would double the file past 1 MB. The
 *   rendering groups tokens by slot in a clinical-note order and breaks them
 *   into short sentences, so `tokenize(noteText(row))` returns `w`'s bag.
 * - The bigram ("word dependencies") variant Part C mentions is a later
 *   dataset (`notes-dependent`), not part of this file.
 */
import { createRng, round, type Rng } from './random';
import {
  SLOTS,
  VOCABULARY,
  VOCABULARY_SIZE,
  WORD_INDEX,
  slotOf,
  wordsOfSlot,
  type Slot,
} from './notes-vocabulary';
import type { Dataset, DatasetVariable } from './types';

export interface NotesRow {
  /** `NOTE-0001` … in generation order. */
  id: string;
  /** 1 = serious, 0 = non-serious. */
  y: 0 | 1;
  /** Word indices into `parameters.vocabulary`, in sampling order (length ~ Poisson(25)). */
  w: number[];
}

export type NotesDataset = Dataset<NotesRow>;

/** Base weight of a slot in both classes (markers are handled separately). */
const SLOT_WEIGHT: Record<Slot, number> = {
  function: 5,
  serious: 0,
  nonserious: 0,
  symptom: 2,
  anatomy: 1,
  lab: 1,
  procedure: 1.2,
  descriptor: 1.5,
  verb: 1.5,
  time: 1,
  number: 0.8,
  history: 0.8,
  misc: 1,
  drug: 0.6,
};

export const spec = {
  id: 'notes' as const,
  title: 'NOTES: adverse-event narratives',
  spec: 'C6',
  seed: 6,
  n: 6000,
  classes: ['non-serious', 'serious'] as const,
  /** φ_k = P(y = k). */
  phi: [0.7, 0.3] as const,
  /** Document length is Poisson with this mean. */
  lengthMean: 25,
  vocabularySize: VOCABULARY_SIZE,
  /** Part C's up-weighted words, plus the rest of the marker slots. */
  seriousMarkers: wordsOfSlot('serious'),
  nonseriousMarkers: wordsOfSlot('nonserious'),
  /** Multiplicative weight of a marker in its own class and in the other class. */
  markerWeight: { own: 4, other: 0.5 },
  /** Within-slot Zipf exponent: word at position p gets (1 + p)^(−zipf). */
  zipf: 0.7,
  /** σ of the per-class log-normal perturbation on non-marker word weights. */
  perturbationSigma: 0.5,
  slotWeight: SLOT_WEIGHT,
};

const VARIABLES: DatasetVariable[] = [
  { name: 'id', type: 'id', description: 'Report id, NOTE-0001 onward, stable for the seed.' },
  {
    name: 'y',
    symbol: 'y',
    type: 'binary',
    description: '1 if the report is serious, 0 if non-serious (the class label).',
  },
  {
    name: 'w',
    symbol: 'w',
    type: 'tokens',
    description:
      'Word indices into parameters.vocabulary in sampling order; the bag of words is their multiset and noteText(row) renders them as a report.',
  },
];

const TEX = String.raw`y \sim \mathrm{Bernoulli}(\phi_1),\quad L \sim \mathrm{Poisson}(25),\quad w_1,\dots,w_L \mid y \overset{\text{iid}}{\sim} \mathrm{Categorical}(\psi_{\cdot y}),\qquad P(x_j = 1 \mid y = k) = 1 - e^{-25\psi_{jk}}`;

/** Build ψ (2 × |V|), each row summing to 1 up to the stored rounding. */
export function buildPsi(rng: Rng): [number[], number[]] {
  const weights: [number[], number[]] = [
    new Array<number>(VOCABULARY_SIZE).fill(0),
    new Array<number>(VOCABULARY_SIZE).fill(0),
  ];
  for (const slot of SLOTS) {
    const list = wordsOfSlot(slot);
    list.forEach((word, pos) => {
      const j = WORD_INDEX.get(word);
      if (j === undefined) throw new Error(`notes: word "${word}" missing from the index`);
      const profile = (1 + pos) ** -spec.zipf;
      if (slot === 'serious' || slot === 'nonserious') {
        const [nonserious, serious] = weights;
        const ownRow = slot === 'serious' ? serious : nonserious;
        const otherRow = slot === 'serious' ? nonserious : serious;
        ownRow[j] = spec.markerWeight.own * profile;
        otherRow[j] = spec.markerWeight.other * profile;
      } else {
        const base = SLOT_WEIGHT[slot] * profile;
        weights[0][j] = base * Math.exp(rng.normal(0, spec.perturbationSigma));
        weights[1][j] = base * Math.exp(rng.normal(0, spec.perturbationSigma));
      }
    });
  }
  return weights.map((row) => {
    const total = row.reduce((a, b) => a + b, 0);
    return row.map((w) => round(w / total, 10));
  }) as [number[], number[]];
}

/** Bernoulli-model presence probabilities implied by ψ and the Poisson length. */
export function bernoulliPsi(psi: readonly (readonly number[])[], lengthMean = spec.lengthMean) {
  return psi.map((row) => row.map((p) => round(1 - Math.exp(-lengthMean * p), 8)));
}

export function generate(seed: number = spec.seed): NotesDataset {
  const rng = createRng(seed);
  const psi = buildPsi(rng.fork('parameters'));
  const cdfs = psi.map((row) => {
    const cdf = new Array<number>(row.length);
    let acc = 0;
    row.forEach((p, j) => {
      acc += p;
      cdf[j] = acc;
    });
    cdf[row.length - 1] = 1;
    return cdf;
  });

  const rows: NotesRow[] = [];
  for (let i = 0; i < spec.n; i++) {
    const y = rng.bernoulli(spec.phi[1]);
    const length = Math.max(1, rng.poisson(spec.lengthMean));
    const cdf = cdfs[y];
    if (!cdf) throw new Error('notes: missing class cdf');
    const w: number[] = [];
    for (let t = 0; t < length; t++) w.push(rng.categoricalCdf(cdf));
    rows.push({ id: `NOTE-${String(i + 1).padStart(4, '0')}`, y, w });
  }

  return {
    id: spec.id,
    title: spec.title,
    spec: spec.spec,
    seed,
    generativeModel: {
      tex: TEX,
      parameters: {
        classes: [...spec.classes],
        phi: [...spec.phi],
        lengthMean: spec.lengthMean,
        vocabulary: [...VOCABULARY],
        psi,
        seriousMarkers: [...spec.seriousMarkers],
        nonseriousMarkers: [...spec.nonseriousMarkers],
      },
    },
    variables: VARIABLES,
    n: spec.n,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Derived views of a row
// ---------------------------------------------------------------------------

/** Sparse counts `[wordIndex, count]`, sorted by word index. */
export function bagOfWords(row: Pick<NotesRow, 'w'>): [number, number][] {
  const counts = new Map<number, number>();
  for (const j of row.w) counts.set(j, (counts.get(j) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0] - b[0]);
}

/** Sorted indices of the words present (the Bernoulli feature vector's ones). */
export function presentWords(row: Pick<NotesRow, 'w'>): number[] {
  return bagOfWords(row).map(([j]) => j);
}

/** Rendering order of slots in a report, with marker and symptom words together. */
const RENDER_ORDER: readonly Slot[] = [
  'function',
  'verb',
  'descriptor',
  'serious',
  'nonserious',
  'symptom',
  'anatomy',
  'lab',
  'procedure',
  'drug',
  'time',
  'number',
  'history',
  'misc',
];
const SENTENCE_LENGTH = 8;

/**
 * Deterministic readable rendering of a row: tokens grouped by slot in a
 * clinical-note order, split into sentences of at most eight words.
 * `tokenize(noteText(row))` recovers the bag of `row.w` exactly.
 */
export function noteText(row: Pick<NotesRow, 'w'>, vocabulary: readonly string[] = VOCABULARY) {
  const rank = new Map(RENDER_ORDER.map((s, i) => [s, i] as const));
  const tokens = row.w.map((j, pos) => {
    const word = vocabulary[j];
    if (word === undefined) throw new Error(`noteText: word index ${j} out of range`);
    return { word, pos, rank: rank.get(slotOf(word)) ?? RENDER_ORDER.length };
  });
  tokens.sort((a, b) => a.rank - b.rank || a.pos - b.pos);
  const sentences: string[] = [];
  for (let i = 0; i < tokens.length; i += SENTENCE_LENGTH) {
    const chunk = tokens.slice(i, i + SENTENCE_LENGTH).map((t) => t.word);
    const first = chunk[0];
    if (first) chunk[0] = first.charAt(0).toUpperCase() + first.slice(1);
    sentences.push(`${chunk.join(' ')}.`);
  }
  return sentences.join(' ');
}

/** Lowercase word tokens of a text mapped to vocabulary indices; unknown words are dropped. */
export function tokenize(text: string, index: ReadonlyMap<string, number> = WORD_INDEX): number[] {
  const out: number[] = [];
  for (const m of text.toLowerCase().matchAll(/[a-z]+/g)) {
    const j = index.get(m[0]);
    if (j !== undefined) out.push(j);
  }
  return out;
}
