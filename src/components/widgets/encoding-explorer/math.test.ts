import {
  ENCODINGS,
  defaultTargets,
  designMatrix,
  leastSquares,
  matVec,
  numericCodes,
  rank,
  shiftAlongNull,
  standardize,
  summarize,
  svd,
  targetsFor,
} from './math';

const ZIPS = ['10040', '10041', '10042', '10043', '10044'];
const RAMP = [2, 2.5, 3, 3.5, 4];
/** 10042 the highest-risk zip code (the lesson's challenge). */
const PEAK = [2, 2.5, 5, 3.5, 4];

describe('encodings', () => {
  it('reads numeric categories as numbers and others by position', () => {
    expect(numericCodes(ZIPS)).toEqual([10040, 10041, 10042, 10043, 10044]);
    expect(numericCodes(['E11', 'I10', 'J45'])).toEqual([0, 1, 2]);
  });

  it('standardizes with the population standard deviation', () => {
    const { z, mean, sd } = standardize([10040, 10041, 10042, 10043, 10044]);
    expect(mean).toBe(10042);
    expect(sd).toBeCloseTo(Math.SQRT2, 12);
    expect(z.map((v) => +v.toFixed(6))).toEqual([-1.414214, -0.707107, 0, 0.707107, 1.414214]);
  });

  it('builds each design matrix with the right shape and entries', () => {
    expect(designMatrix(ZIPS, 'integer', true).X[4]).toEqual([1, 10044]);
    expect(designMatrix(ZIPS, 'integer', false).X[0]).toEqual([10040]);
    const oh = designMatrix(ZIPS, 'one-hot', false);
    expect(oh.names).toEqual(['=10040', '=10041', '=10042', '=10043', '=10044']);
    // L2 p.10: 10044 ↦ [0, 0, 0, 0, 1].
    expect(oh.X[4]).toEqual([0, 0, 0, 0, 1]);
    const df = designMatrix(ZIPS, 'one-hot-drop-first', true);
    expect(df.names).toEqual(['1', '=10041', '=10042', '=10043', '=10044']);
    expect(df.X[0]).toEqual([1, 0, 0, 0, 0]);
    expect(df.X[2]).toEqual([1, 0, 1, 0, 0]);
    expect(df.kinds[0]).toBe('intercept');
  });

  it('every one-hot row sums to 1 (step 11 of der-1-1-1)', () => {
    for (const row of designMatrix(ZIPS, 'one-hot', false).X) {
      expect(row.reduce((a, b) => a + b, 0)).toBe(1);
    }
  });
});

describe('rank of the design matrix', () => {
  it('is full for the numeric codes, one-hot without an intercept, and drop-first', () => {
    expect(rank(designMatrix(ZIPS, 'integer', true).X)).toBe(2);
    expect(rank(designMatrix(ZIPS, 'standardized', true).X)).toBe(2);
    expect(rank(designMatrix(ZIPS, 'one-hot', false).X)).toBe(5);
    expect(rank(designMatrix(ZIPS, 'one-hot-drop-first', true).X)).toBe(5);
    expect(rank(designMatrix(ZIPS, 'one-hot-drop-first', false).X)).toBe(4);
  });

  it('drops by one for one-hot with an intercept: the dummy-variable trap', () => {
    const { X } = designMatrix(ZIPS, 'one-hot', true);
    expect(X[0]?.length).toBe(6);
    expect(rank(X)).toBe(5);
  });

  it('the SVD reconstructs X', () => {
    const { X } = designMatrix(ZIPS, 'integer', true);
    const { U, s, V } = svd(X);
    for (let i = 0; i < X.length; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        let v = 0;
        for (let k = 0; k < 2; k += 1) v += (U[i]?.[k] ?? 0) * (s[k] ?? 0) * (V[j]?.[k] ?? 0);
        expect(v).toBeCloseTo(X[i]?.[j] ?? NaN, 6);
      }
    }
  });
});

describe('least squares on each encoding', () => {
  it('a ramp is fitted exactly by every encoding with an intercept', () => {
    for (const e of ENCODINGS) {
      const s = summarize(ZIPS, e, true, RAMP);
      expect(s.exact, e).toBe(true);
    }
  });

  it('the integer code recovers θ₁ = 0.5 per zip code and a huge intercept', () => {
    const fit = leastSquares(designMatrix(ZIPS, 'integer', true).X, RAMP);
    expect(fit.theta[1]).toBeCloseTo(0.5, 8);
    expect(fit.theta[0]).toBeCloseTo(2 - 0.5 * 10040, 5);
  });

  it('a peak at 10042 is reachable only by one-hot encodings', () => {
    const exact = Object.fromEntries(
      ENCODINGS.map((e) => [e, summarize(ZIPS, e, true, PEAK).exact]),
    );
    expect(exact).toEqual({
      integer: false,
      standardized: false,
      'one-hot': true,
      'one-hot-drop-first': true,
    });
  });

  it('integer and standardized codes give the same predictions (an affine change, step 6)', () => {
    const a = leastSquares(designMatrix(ZIPS, 'integer', true).X, PEAK).fitted;
    const b = leastSquares(designMatrix(ZIPS, 'standardized', true).X, PEAK).fitted;
    a.forEach((v, k) => expect(v).toBeCloseTo(b[k] ?? NaN, 8));
    // Equally spaced predictions (step 4).
    const diffs = a.slice(1).map((v, k) => v - (a[k] ?? 0));
    diffs.forEach((d) => expect(d).toBeCloseTo(diffs[0] ?? NaN, 8));
  });

  it('drop-first coefficients are the reference value and the differences (step 14)', () => {
    const fit = leastSquares(designMatrix(ZIPS, 'one-hot-drop-first', true).X, PEAK);
    expect(fit.unique).toBe(true);
    const want = [2, 0.5, 3, 1.5, 2];
    fit.theta.forEach((t, j) => expect(t).toBeCloseTo(want[j] ?? NaN, 10));
  });

  it('one-hot with an intercept: unique predictions, non-unique θ along (1, −1, …, −1)', () => {
    const { X } = designMatrix(ZIPS, 'one-hot', true);
    const fit = leastSquares(X, PEAK);
    expect(fit.unique).toBe(false);
    expect(fit.exact).toBe(true);
    expect(fit.nullDirection).toEqual([1, -1, -1, -1, -1, -1]);
    for (const c of [-3, 0.7, 12]) {
      const shifted = shiftAlongNull(fit.theta, fit.nullDirection, c);
      expect(shifted[0]).toBeCloseTo((fit.theta[0] ?? 0) + c, 10);
      matVec(X, shifted).forEach((v, k) => expect(v).toBeCloseTo(PEAK[k] ?? NaN, 9));
    }
  });

  it('drop-first without an intercept pins the reference category at 0', () => {
    const fit = leastSquares(designMatrix(ZIPS, 'one-hot-drop-first', false).X, PEAK);
    expect(fit.unique).toBe(true);
    expect(fit.exact).toBe(false);
    expect(fit.fitted[0]).toBe(0);
    expect(fit.maxAbsResidual).toBeCloseTo(2, 10);
  });

  it('the integer code without an intercept is a line through the origin', () => {
    const fit = leastSquares(designMatrix(ZIPS, 'integer', false).X, RAMP);
    expect(fit.exact).toBe(false);
    expect(fit.rank).toBe(1);
  });
});

describe('targets', () => {
  it('defaults to a ramp and pads or cuts authored targets to K', () => {
    expect(defaultTargets(5)).toEqual(RAMP);
    expect(targetsFor(3, [])).toEqual([2, 3, 4]);
    expect(targetsFor(3, [9])).toEqual([9, 3, 4]);
    expect(targetsFor(2, [1, 2, 3])).toEqual([1, 2]);
  });
});
