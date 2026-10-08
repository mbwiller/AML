import { bernoulliPsi } from '@/lib/datasets';

import {
  VOCABULARY_SIZE,
  WORD_INDEX,
  allRows,
  countsFor,
  generativeParameters,
  modelFor,
  reportRow,
  trainingRows,
} from './data';
import { formatSigned } from './fallback';
import {
  countBernoulliNB,
  fitBernoulliNB,
  logJoint,
  presentSet,
  score,
  sigmoid,
  splitWords,
  topVotes,
  type TrainRow,
} from './math';

/** A tiny corpus over d = 4 words: word 3 appears only in class 1, word 0 in every report. */
const TINY: TrainRow[] = [
  { y: 0, w: [0, 1] },
  { y: 0, w: [0, 1, 2] },
  { y: 0, w: [0, 2, 2] },
  { y: 1, w: [0, 3] },
  { y: 1, w: [0, 1, 3, 3] },
];

describe('countBernoulliNB', () => {
  it('counts each word once per report (presence, not multiplicity)', () => {
    const c = countBernoulliNB(TINY, 4);
    expect(c.n).toBe(5);
    expect(c.nk).toEqual([3, 2]);
    expect([...c.docs[0]]).toEqual([3, 2, 2, 0]);
    expect([...c.docs[1]]).toEqual([2, 1, 0, 2]);
  });
});

describe('fitBernoulliNB', () => {
  it('without smoothing ψ_jk is the fraction of class-k reports containing word j (L9 p.32)', () => {
    const m = fitBernoulliNB(TINY, 4, false);
    expect(m.phi).toEqual([0.6, 0.4]);
    expect([...m.psi[0]]).toEqual([1, 2 / 3, 2 / 3, 0]);
    expect([...m.psi[1]]).toEqual([1, 0.5, 0, 1]);
  });

  it('with Laplace smoothing ψ_jk = (count + 1)/(n_k + 2) and φ is untouched', () => {
    const m = fitBernoulliNB(TINY, 4, true);
    expect(m.phi).toEqual([0.6, 0.4]);
    expect([...m.psi[0]]).toEqual([4 / 5, 3 / 5, 3 / 5, 1 / 5]);
    expect([...m.psi[1]]).toEqual([3 / 4, 2 / 4, 1 / 4, 3 / 4]);
  });
});

describe('score', () => {
  it('decomposes the log posterior odds exactly into prior + absent + present terms', () => {
    const m = fitBernoulliNB(TINY, 4, true);
    const s = score(m, [1, 3, 3]);
    expect(s.present).toEqual([1, 3]);
    const sum = s.priorTerm + s.absentTerm + s.votes.reduce((a, v) => a + v.vote, 0);
    expect(s.logOdds).toBeCloseTo(sum, 12);
    expect(s.logOdds).toBeCloseTo(logJoint(m, [1, 3], 1) - logJoint(m, [1, 3], 0), 12);
    expect(s.posterior).toBeCloseTo(sigmoid(s.logOdds), 12);
    expect(s.zeroEvents).toEqual([]);
    // By hand: prior log(0.4/0.6); present 1: log(0.5/0.6); present 3: log(0.75/0.2);
    // absent 0: log(0.25/0.2); absent 2: log(0.75/0.4).
    const expected =
      Math.log(0.4 / 0.6) +
      Math.log(0.5 / 0.6) +
      Math.log(0.75 / 0.2) +
      Math.log(0.25 / 0.2) +
      Math.log(0.75 / 0.4);
    expect(s.logOdds).toBeCloseTo(expected, 12);
  });

  it('smoothing off: a word seen only in class 1 makes log P(x | y = 0) = −∞ and P(serious | x) = 1', () => {
    const m = fitBernoulliNB(TINY, 4, false);
    const s = score(m, [0, 3]);
    expect(s.logJoint[1]).toBeGreaterThan(-Infinity);
    expect(s.logJoint[0]).toBe(-Infinity);
    expect(s.logOdds).toBe(Infinity);
    expect(s.posterior).toBe(1);
    expect(s.votes.find((v) => v.j === 3)?.vote).toBe(Infinity);
    expect(s.zeroEvents).toEqual([{ j: 3, k: 0, kind: 'present' }]);
  });

  it('smoothing off: a word in every class-1 report that is absent makes class 1 impossible', () => {
    const m = fitBernoulliNB(TINY, 4, false);
    // Word 0 is in every report of both classes; leaving it out zeroes both.
    // Word 3 is in every class-1 report, so its absence zeroes class 1 again.
    const s = score(m, [1]);
    expect(s.logJoint).toEqual([-Infinity, -Infinity]);
    expect(Number.isNaN(s.logOdds)).toBe(true);
    expect(Number.isNaN(s.posterior)).toBe(true);
    expect(s.zeroEvents).toEqual([
      { j: 0, k: 0, kind: 'absent' },
      { j: 0, k: 1, kind: 'absent' },
      { j: 3, k: 1, kind: 'absent' },
    ]);
    // Leaving out only word 2 (absent from every class-1 report) is fine for class 1.
    const t = score(m, [0, 1, 3]);
    expect(t.logJoint[1]).toBeGreaterThan(-Infinity);
    expect(t.logJoint[0]).toBe(-Infinity);
    expect(t.zeroEvents).toEqual([{ j: 3, k: 0, kind: 'present' }]);
  });

  it('smoothing on: the same inputs are finite', () => {
    const m = fitBernoulliNB(TINY, 4, true);
    for (const x of [[0, 3], [1], []]) {
      const s = score(m, x);
      expect(Number.isFinite(s.logOdds)).toBe(true);
      expect(s.zeroEvents).toEqual([]);
    }
  });

  it('ignores duplicates and out-of-range indices', () => {
    const m = fitBernoulliNB(TINY, 4, true);
    expect(score(m, [1, 1, 9, -1]).present).toEqual([1]);
    expect(presentSet([2, 2, 1, 2])).toEqual([2, 1]);
  });
});

describe('topVotes', () => {
  it('orders by |vote| with infinities (and 0/0) first and ties by index', () => {
    const votes = [
      { j: 0, psi0: 0.5, psi1: 0.5, vote: 0.1 },
      { j: 1, psi0: 0.5, psi1: 0.5, vote: -2 },
      { j: 2, psi0: 0, psi1: 0.5, vote: Infinity },
      { j: 3, psi0: 0.5, psi1: 0.5, vote: 1.5 },
      { j: 4, psi0: 0, psi1: 0, vote: NaN },
    ];
    expect(topVotes(votes, 3).map((v) => v.j)).toEqual([2, 4, 1]);
  });
});

describe('sigmoid and formatting', () => {
  it('handles the limits', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(Infinity)).toBe(1);
    expect(sigmoid(-Infinity)).toBe(0);
    expect(Number.isNaN(sigmoid(NaN))).toBe(true);
    expect(sigmoid(-800)).toBe(0);
  });

  it('formats with a real minus sign and never prints −0.00', () => {
    expect(formatSigned(1.234)).toBe('+1.23');
    expect(formatSigned(-1.234)).toBe('−1.23');
    expect(formatSigned(-0.001)).toBe('+0.00');
    expect(formatSigned(Infinity)).toBe('+∞');
    expect(formatSigned(-Infinity)).toBe('−∞');
    expect(formatSigned(NaN)).toBe('0/0');
  });
});

describe('splitWords', () => {
  it('splits on letters, maps vocabulary hits, and lists unique misses in order', () => {
    const index = new Map([
      ['syncope', 7],
      ['fever', 2],
    ]);
    const r = splitWords('Fever, then syncope; FEVER. Zzz zzz qq!', index);
    expect(r.tokens).toEqual([2, 7, 2]);
    expect(r.unknown).toEqual(['then', 'zzz', 'qq']);
  });
});

describe('on the NOTES dataset', () => {
  it('the MLE on all 6,000 reports recovers φ and the Bernoulli ψ of the generative model', () => {
    const rows = allRows();
    expect(rows).toHaveLength(6000);
    const m = fitBernoulliNB(rows, VOCABULARY_SIZE, false);
    const truth = generativeParameters();
    const psiTrue = bernoulliPsi(truth.psi);
    expect(Math.abs((m.phi[1] ?? 0) - (truth.phi[1] ?? 0))).toBeLessThan(0.02);
    for (const k of [0, 1] as const) {
      let sumAbs = 0;
      let maxAbs = 0;
      for (let j = 0; j < VOCABULARY_SIZE; j += 1) {
        const err = Math.abs((m.psi[k][j] ?? 0) - (psiTrue[k]?.[j] ?? 0));
        sumAbs += err;
        maxAbs = Math.max(maxAbs, err);
      }
      // Standard error of a frequency over ≥1,700 reports is ≤ 0.012; the
      // worst of 2,000 words stays well under 0.08 and the mean under 0.01.
      expect(sumAbs / VOCABULARY_SIZE).toBeLessThan(0.01);
      expect(maxAbs).toBeLessThan(0.08);
    }
  });

  it('the seeded subsample is a prefix of the seeded order and the cached fit matches a fresh one', () => {
    const small = trainingRows(200, 11);
    const large = trainingRows(2000, 11);
    expect(large.slice(0, 200)).toEqual(small);
    expect(modelFor(2000, 11, true)).toBe(modelFor(2000, 11, true));
    const fresh = fitBernoulliNB(large, VOCABULARY_SIZE, true);
    expect([...modelFor(2000, 11, true).psi[1]]).toEqual([...fresh.psi[1]]);
    expect(reportRow(11, 0).id).toBe(reportRow(11, 0).id);
    expect(reportRow(11, 0).id).not.toBe(reportRow(11, 1).id);
  });

  it('fixture for the e2e spec: at the defaults, "intentional" is unseen in non-serious reports and "appetite" in serious ones', () => {
    // tests/e2e/widget-bow-nb-scorer.spec.ts types these words; if the
    // dataset is regenerated and this fails, update both.
    const c = countsFor(2000, 11);
    const j = WORD_INDEX.get('intentional');
    const a = WORD_INDEX.get('appetite');
    expect(j).toBeDefined();
    expect(a).toBeDefined();
    expect(c.docs[0][j ?? -1]).toBe(0);
    expect(c.docs[1][j ?? -1]).toBeGreaterThan(0);
    expect(c.docs[1][a ?? -1]).toBe(0);
    expect(c.docs[0][a ?? -1]).toBeGreaterThan(0);
    const unsmoothed = score(modelFor(2000, 11, false), [j ?? -1]);
    expect(unsmoothed.logOdds).toBe(Infinity);
    expect(score(modelFor(2000, 11, true), [j ?? -1]).logOdds).toBeLessThan(Infinity);
  });
});
