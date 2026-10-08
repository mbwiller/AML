import {
  arrivalStep,
  infiniteSum,
  infiniteSumOfSquares,
  loss,
  lossGradient,
  partialSums,
  robbinsMonro,
  runSchedule,
  SCHEDULES,
  stallDistance,
  stepSize,
  stepSizes,
} from './math';

describe('the schedules of L5 p.11', () => {
  it('evaluate η₀/(t+1), η₀/(t+1)², η₀e^{−βt}, and a constant', () => {
    expect(stepSize('constant', 0.5, 0.1, 7)).toBe(0.5);
    expect(stepSize('inverse', 1, 0.1, 0)).toBe(1);
    expect(stepSize('inverse', 1, 0.1, 3)).toBe(0.25);
    expect(stepSize('inverse-square', 2, 0.1, 1)).toBe(0.5);
    expect(stepSize('exponential', 1, 0.1, 10)).toBeCloseTo(Math.exp(-1), 12);
  });

  it('partial sums of 1/(t+1) are the harmonic numbers', () => {
    const s = partialSums(stepSizes('inverse', 1, 0, 4));
    expect(s).toEqual([0, 1, 1.5, 1.5 + 1 / 3, 1.5 + 1 / 3 + 0.25]);
  });

  it('partial sums approach the closed-form infinite sums (der-2-5-8)', () => {
    const T = 200_000;
    for (const sched of ['inverse-square', 'exponential'] as const) {
      const xs = stepSizes(sched, 1.3, 0.1, T);
      const sum = partialSums(xs).at(-1) ?? 0;
      const sq = partialSums(xs.map((x) => x * x)).at(-1) ?? 0;
      expect(sum).toBeCloseTo(infiniteSum(sched, 1.3, 0.1), 4);
      expect(sq).toBeCloseTo(infiniteSumOfSquares(sched, 1.3, 0.1), 4);
    }
    // inverse: Σηₜ² → η₀²π²/6 while Σηₜ keeps growing like ln T
    const inv = stepSizes('inverse', 1, 0, T);
    expect(partialSums(inv.map((x) => x * x)).at(-1)).toBeCloseTo(Math.PI ** 2 / 6, 4);
    expect(partialSums(inv).at(-1)).toBeGreaterThan(Math.log(T));
    expect(infiniteSum('inverse', 1, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(infiniteSumOfSquares('constant', 1, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('exponential with β = 0.1 has total budget η₀/(1 − e^{−0.1}) ≈ 10.5 η₀', () => {
    expect(infiniteSum('exponential', 1, 0.1)).toBeCloseTo(10.508, 3);
  });

  it('only 1/(t+1) meets both Robbins–Monro conditions', () => {
    const both = SCHEDULES.filter((s) => {
      const rm = robbinsMonro(s);
      return rm.sumDiverges && rm.squaresConverge;
    });
    expect(both).toEqual(['inverse']);
    expect(robbinsMonro('constant')).toEqual({ sumDiverges: true, squaresConverge: false });
    expect(robbinsMonro('inverse-square')).toEqual({ sumDiverges: false, squaresConverge: true });
    expect(robbinsMonro('exponential')).toEqual({ sumDiverges: false, squaresConverge: true });
  });
});

describe('the bounded-gradient loss', () => {
  it('has minimum 0 at θ = 0, |E′| < 1, and E″(0) = 1', () => {
    expect(loss(0)).toBe(0);
    for (const t of [-100, -3, -0.2, 0.5, 7, 1e4])
      expect(Math.abs(lossGradient(t))).toBeLessThan(1);
    const h = 1e-4;
    expect((lossGradient(h) - lossGradient(-h)) / (2 * h)).toBeCloseTo(1, 6);
  });
});

describe('gradient descent with a schedule', () => {
  it('never travels farther than G·Σηₜ (der-2-5-8 step 2)', () => {
    for (const sched of SCHEDULES) {
      const its = runSchedule(sched, 1, 0.1, 8, 300);
      const sums = partialSums(stepSizes(sched, 1, 0.1, 300));
      its.forEach((theta, t) =>
        expect(Math.abs(theta - 8)).toBeLessThanOrEqual((sums[t] ?? 0) + 1e-12),
      );
    }
  });

  it('inverse-square stalls short of a far minimum; inverse and constant arrive', () => {
    const d0 = 5;
    const sq = runSchedule('inverse-square', 1, 0.1, d0, 2000);
    expect(arrivalStep(sq, 0.5)).toBeNull();
    expect(Math.abs(sq.at(-1) ?? 0)).toBeGreaterThanOrEqual(
      stallDistance(d0, infiniteSum('inverse-square', 1, 0.1)),
    );
    expect(stallDistance(d0, infiniteSum('inverse-square', 1, 0.1))).toBeCloseTo(
      5 - Math.PI ** 2 / 6,
      12,
    );
    const inv = arrivalStep(runSchedule('inverse', 1, 0.1, d0, 2000), 0.5);
    expect(inv).not.toBeNull();
    expect(inv).toBeGreaterThan(40); // needs Σηₜ = H_t ≳ 4.5, t ≈ 50
    const cst = arrivalStep(runSchedule('constant', 1, 0.1, d0, 2000), 0.5);
    expect(cst).not.toBeNull();
    expect(cst).toBeLessThan(10);
  });

  it('exponential arrives when its budget exceeds the distance, and stalls when it does not', () => {
    expect(arrivalStep(runSchedule('exponential', 1, 0.1, 5, 2000), 0.5)).not.toBeNull();
    const far = runSchedule('exponential', 1, 0.1, 20, 2000);
    expect(arrivalStep(far, 2)).toBeNull();
    expect(far.at(-1) ?? 0).toBeGreaterThan(20 - infiniteSum('exponential', 1, 0.1));
  });
});
