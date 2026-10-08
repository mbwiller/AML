/**
 * Pure math for `bow-nb-scorer` (lesson 6.3): the Bernoulli Naive Bayes
 * fit (L9 pp.29–33), the log-space query (L9 pp.34–38), the per-word ledger
 * that explains the score, and the zero-count events behind the −∞ failure.
 * No React, no DOM; every function is unit-tested in `math.test.ts`.
 *
 * Notation follows STYLE_GUIDE.md §2.1: ψ_jk = P(x_j = 1 | y = k), priors
 * φ_k, with code arrays `psi[k][j]`. Class 1 is "serious", class 0
 * "non-serious" (the NOTES dataset's `classes` order).
 */

export interface TrainRow {
  /** 1 = serious, 0 = non-serious. */
  y: 0 | 1;
  /** Word indices of the report (a multiset; only presence matters here). */
  w: readonly number[];
}

/** The sufficient statistics of a Bernoulli NB fit: class sizes and document frequencies. */
export interface NBCounts {
  /** Vocabulary size d. */
  d: number;
  /** Training set size n. */
  n: number;
  /** n_k: reports of class k. */
  nk: readonly [number, number];
  /** docs[k][j]: reports of class k that contain word j. */
  docs: readonly [Uint32Array, Uint32Array];
}

export interface BernoulliNB {
  d: number;
  n: number;
  nk: readonly [number, number];
  /** Laplace add-one smoothing applied to ψ (never to φ). */
  smoothing: boolean;
  /** φ_k = n_k / n. */
  phi: readonly [number, number];
  /** psi[k][j] = (docs[k][j] + α) / (n_k + 2α), α = 1 with smoothing, 0 without. */
  psi: readonly [Float64Array, Float64Array];
}

/** Count n_k and the per-class document frequency of every word (one pass). */
export function countBernoulliNB(rows: readonly TrainRow[], d: number): NBCounts {
  const docs: [Uint32Array, Uint32Array] = [new Uint32Array(d), new Uint32Array(d)];
  const nk: [number, number] = [0, 0];
  const seen = new Uint8Array(d);
  for (const row of rows) {
    nk[row.y] += 1;
    const target = docs[row.y];
    for (const j of row.w) {
      if (j < 0 || j >= d || seen[j]) continue;
      seen[j] = 1;
      target[j] = (target[j] ?? 0) + 1;
    }
    for (const j of row.w) if (j >= 0 && j < d) seen[j] = 0;
  }
  return { d, n: rows.length, nk, docs };
}

/**
 * The closed-form MLE (L9 p.32–33): ψ_jk is the fraction of class-k reports
 * containing word j, φ_k the fraction of reports in class k. With smoothing,
 * ψ_jk = (count + 1) / (n_k + 2), the posterior mean under a Beta(1, 1) prior.
 * A class with no training reports gets ψ = 1/2 (uninformative) and φ = 0.
 */
export function modelFromCounts(counts: NBCounts, smoothing: boolean): BernoulliNB {
  const alpha = smoothing ? 1 : 0;
  const psi = counts.docs.map((row, k) => {
    const nk = counts.nk[k] ?? 0;
    const out = new Float64Array(counts.d);
    const denom = nk + 2 * alpha;
    for (let j = 0; j < counts.d; j += 1) {
      out[j] = denom > 0 ? ((row[j] ?? 0) + alpha) / denom : 0.5;
    }
    return out;
  }) as [Float64Array, Float64Array];
  const n = Math.max(counts.n, 1);
  return {
    d: counts.d,
    n: counts.n,
    nk: counts.nk,
    smoothing,
    phi: [counts.nk[0] / n, counts.nk[1] / n],
    psi,
  };
}

export function fitBernoulliNB(
  rows: readonly TrainRow[],
  d: number,
  smoothing: boolean,
): BernoulliNB {
  return modelFromCounts(countBernoulliNB(rows, d), smoothing);
}

/** The set of distinct in-vocabulary word indices, in order of first appearance. */
export function presentSet(tokens: readonly number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const j of tokens) {
    if (seen.has(j)) continue;
    seen.add(j);
    out.push(j);
  }
  return out;
}

/** Natural log that returns −∞ at 0 instead of NaN for tiny negatives from rounding. */
const ln = (p: number): number => (p <= 0 ? -Infinity : Math.log(p));

/**
 * log P_θ(x, y = k) = log φ_k + Σ_j [x_j log ψ_jk + (1 − x_j) log(1 − ψ_jk)]
 * (L9 p.38's `logpxy.sum + logpy`, without the slide's clip to 1e-14). Each
 * branch is added only when selected, so a zero never multiplies a −∞.
 */
export function logJoint(model: BernoulliNB, present: readonly number[], k: 0 | 1): number {
  const psi = model.psi[k];
  const isPresent = new Uint8Array(model.d);
  let total = ln(model.phi[k]);
  for (const j of present) {
    if (j < 0 || j >= model.d) continue;
    isPresent[j] = 1;
    total += ln(psi[j] ?? 0);
  }
  for (let j = 0; j < model.d; j += 1) {
    if (!isPresent[j]) total += ln(1 - (psi[j] ?? 0));
  }
  return total;
}

/** A word whose ψ_jk makes one class-conditional likelihood exactly 0. */
export interface ZeroEvent {
  j: number;
  /** The class whose likelihood is 0. */
  k: 0 | 1;
  /** `present`: word in x with ψ_jk = 0; `absent`: word not in x with ψ_jk = 1. */
  kind: 'present' | 'absent';
}

/** One present word's row in the ledger. */
export interface WordVote {
  j: number;
  psi0: number;
  psi1: number;
  /** log ψ_j1 − log ψ_j0: +∞, −∞, or NaN (both zero) without smoothing. */
  vote: number;
}

export interface Score {
  present: readonly number[];
  /** log φ_1 − log φ_0. */
  priorTerm: number;
  /** Σ_{j: x_j = 0} [log(1 − ψ_j1) − log(1 − ψ_j0)]. */
  absentTerm: number;
  /** Per present word, in the order given. */
  votes: readonly WordVote[];
  /** logJoint[k] = log P(x, y = k). */
  logJoint: readonly [number, number];
  /**
   * log P(y=1 | x) / P(y=0 | x) = priorTerm + absentTerm + Σ votes.
   * ±∞ when exactly one class has zero likelihood; NaN when both do.
   */
  logOdds: number;
  /** P(serious | x) = σ(logOdds); NaN when logOdds is NaN. */
  posterior: number;
  zeroEvents: readonly ZeroEvent[];
}

/** σ(z) with σ(±∞) = 1, 0 and σ(NaN) = NaN. */
export function sigmoid(z: number): number {
  if (Number.isNaN(z)) return NaN;
  if (z === Infinity) return 1;
  if (z === -Infinity) return 0;
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/** Score a bag of words against the model and explain the score word by word. */
export function score(model: BernoulliNB, tokens: readonly number[]): Score {
  const present = presentSet(tokens).filter((j) => j >= 0 && j < model.d);
  const [psi0, psi1] = model.psi;
  const isPresent = new Uint8Array(model.d);
  const zeroEvents: ZeroEvent[] = [];

  const votes: WordVote[] = present.map((j) => {
    isPresent[j] = 1;
    const p0 = psi0[j] ?? 0;
    const p1 = psi1[j] ?? 0;
    if (p0 <= 0) zeroEvents.push({ j, k: 0, kind: 'present' });
    if (p1 <= 0) zeroEvents.push({ j, k: 1, kind: 'present' });
    return { j, psi0: p0, psi1: p1, vote: ln(p1) - ln(p0) };
  });

  let absentTerm = 0;
  for (let j = 0; j < model.d; j += 1) {
    if (isPresent[j]) continue;
    const q0 = 1 - (psi0[j] ?? 0);
    const q1 = 1 - (psi1[j] ?? 0);
    if (q0 <= 0) zeroEvents.push({ j, k: 0, kind: 'absent' });
    if (q1 <= 0) zeroEvents.push({ j, k: 1, kind: 'absent' });
    absentTerm += ln(q1) - ln(q0);
  }

  const priorTerm = ln(model.phi[1]) - ln(model.phi[0]);
  const lj1 = logJoint(model, present, 1);
  const lj0 = logJoint(model, present, 0);
  const logOdds = lj1 - lj0;
  return {
    present,
    priorTerm,
    absentTerm,
    votes,
    logJoint: [lj0, lj1],
    logOdds,
    posterior: sigmoid(logOdds),
    zeroEvents,
  };
}

/** Votes sorted by |vote| descending (infinite first), limited to `max`. */
export function topVotes(votes: readonly WordVote[], max: number): WordVote[] {
  const mag = (v: number) => (Number.isNaN(v) ? Infinity : Math.abs(v));
  return [...votes].sort((a, b) => mag(b.vote) - mag(a.vote) || a.j - b.j).slice(0, max);
}

/** Lowercase alphabetic words of a text, split into vocabulary hits and misses. */
export function splitWords(
  text: string,
  index: ReadonlyMap<string, number>,
): { tokens: number[]; unknown: string[] } {
  const tokens: number[] = [];
  const unknown: string[] = [];
  const seenUnknown = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z]+/g)) {
    const j = index.get(m[0]);
    if (j !== undefined) tokens.push(j);
    else if (!seenUnknown.has(m[0])) {
      seenUnknown.add(m[0]);
      unknown.push(m[0]);
    }
  }
  return { tokens, unknown };
}
