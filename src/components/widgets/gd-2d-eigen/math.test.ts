import {
  bestRate,
  bestStep,
  conditionNumber,
  eigenBasis,
  energy,
  FIVE_RATES,
  firstBelow,
  gdIterates,
  hessianFromEigen,
  levelSetEllipse,
  matVec,
  modeFactors,
  spectralRadius,
  stabilityBound,
  stepsToTolerance,
  toEigenCoords,
} from './math';

const close = (x: number, y: number, tol = 1e-9) => Math.abs(x - y) <= tol;

describe('the Hessian from eigenvalues and a rotation', () => {
  it('is diag(λ1, λ2) at rotation 0 (L4 p.53: a11 = 1, a22 = 3)', () => {
    expect(hessianFromEigen(1, 3, 0)).toEqual({ a: 1, b: 0, c: 3 });
  });

  it('has Aqᵢ = λᵢqᵢ for every rotation', () => {
    for (const phi of [-75, -30, 0, 30, 45, 90]) {
      const A = hessianFromEigen(1.5, 4, phi);
      const [q1, q2] = eigenBasis(phi);
      const a1 = matVec(A, q1);
      const a2 = matVec(A, q2);
      expect(close(a1[0], 1.5 * q1[0])).toBe(true);
      expect(close(a1[1], 1.5 * q1[1])).toBe(true);
      expect(close(a2[0], 4 * q2[0])).toBe(true);
      expect(close(a2[1], 4 * q2[1])).toBe(true);
      // trace and determinant are rotation-invariant
      expect(close(A.a + A.c, 5.5)).toBe(true);
      expect(close(A.a * A.c - A.b * A.b, 6)).toBe(true);
    }
  });
});

describe('gradient descent in the eigenbasis (der-2-5-4)', () => {
  it('each mode contracts by exactly 1 − ηλᵢ per step, at any rotation', () => {
    for (const phi of [0, 30, -60]) {
      const A = hessianFromEigen(1, 3, phi);
      const its = gdIterates(A, [-15, 15], 0.25, 10);
      const v0 = toEigenCoords([-15, 15], phi);
      const [r1, r2] = modeFactors(1, 3, 0.25);
      its.forEach((theta, t) => {
        const v = toEigenCoords(theta, phi);
        expect(close(v[0], r1 ** t * v0[0], 1e-9)).toBe(true);
        expect(close(v[1], r2 ** t * v0[1], 1e-9)).toBe(true);
      });
    }
  });

  it('the factors do not depend on the rotation (the lesson challenge)', () => {
    expect(modeFactors(1, 3, 0.5)).toEqual([0.5, -0.5]);
    expect(spectralRadius(1, 3, 0.5)).toBe(0.5);
  });

  it('the error norm is the eigen-coordinate norm (Q is orthogonal)', () => {
    const v = toEigenCoords([3, -4], 37);
    expect(close(Math.hypot(v[0], v[1]), 5)).toBe(true);
  });

  it('decreases E for η below 2/λmax and blows up above it', () => {
    const A = hessianFromEigen(1, 3, 20);
    const ok = gdIterates(A, [-15, 15], 0.6, 60);
    const bad = gdIterates(A, [-15, 15], 0.7, 60);
    expect(energy(A, ok[60] as [number, number])).toBeLessThan(1e-6);
    expect(energy(A, bad[60] as [number, number])).toBeGreaterThan(energy(A, [-15, 15]));
    expect(stabilityBound(1, 3)).toBeCloseTo(2 / 3);
  });
});

describe('condition number and the best step (der-2-5-5)', () => {
  it('κ = λmax/λmin, η* = 2/(λmax + λmin), ρ(η*) = (κ − 1)/(κ + 1)', () => {
    expect(conditionNumber(1, 3)).toBe(3);
    expect(conditionNumber(3, 1)).toBe(3);
    expect(bestStep(1, 3)).toBe(0.5);
    expect(bestRate(3)).toBe(0.5);
    for (const [l1, l2] of [
      [0.2, 5],
      [1, 1],
      [2.5, 0.7],
    ] as const) {
      const k = conditionNumber(l1, l2);
      expect(close(spectralRadius(l1, l2, bestStep(l1, l2)), bestRate(k))).toBe(true);
      // η* beats nearby step sizes
      expect(spectralRadius(l1, l2, bestStep(l1, l2) * 1.05)).toBeGreaterThanOrEqual(bestRate(k));
      expect(spectralRadius(l1, l2, bestStep(l1, l2) * 0.95)).toBeGreaterThanOrEqual(bestRate(k));
    }
  });

  it('κ = 100 needs about 690 steps to shrink the error a millionfold (lesson 2.5)', () => {
    expect(stepsToTolerance(bestRate(100), 1e-6)).toBeGreaterThan(680);
    expect(stepsToTolerance(bestRate(100), 1e-6)).toBeLessThan(700);
    expect(stepsToTolerance(1, 1e-3)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("L4 p.53's five learning rates", () => {
  it('reproduce the lesson table: worst |factor| 0.75, 0.667, 0.5, 1, 1.1', () => {
    const worst = FIVE_RATES.map((m) => spectralRadius(1, 3, m / 3));
    expect(worst.map((w) => Number(w.toFixed(3)))).toEqual([0.75, 0.667, 0.5, 1, 1.1]);
    const stiff = FIVE_RATES.map((m) => Number(modeFactors(1, 3, m / 3)[1].toFixed(2)));
    expect(stiff).toEqual([0.25, 0, -0.5, -1, -1.1]);
  });

  it('1.5 η2,opt is the fastest of the five', () => {
    const A = hessianFromEigen(1, 3, 0);
    const hits = FIVE_RATES.map((m) => firstBelow(gdIterates(A, [-15, 15], m / 3, 80), 1e-3));
    expect(hits).toEqual([23, 17, 10, null, null]);
  });
});

describe('levelSetEllipse', () => {
  it('has points with ½θᵀAθ = level', () => {
    const A = hessianFromEigen(1, 3, 30);
    const { radii, angle } = levelSetEllipse(1, 3, 30, 8);
    for (const t of [0, 1, 2.5]) {
      const x = radii[0] * Math.cos(t);
      const y = radii[1] * Math.sin(t);
      const p: [number, number] = [
        x * Math.cos(angle) - y * Math.sin(angle),
        x * Math.sin(angle) + y * Math.cos(angle),
      ];
      expect(close(energy(A, p), 8)).toBe(true);
    }
  });
});
