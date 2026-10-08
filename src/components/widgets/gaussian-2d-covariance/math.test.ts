import { createSeededRandom } from '../_shared/seeded-random';
import {
  cholesky2,
  covarianceMatrix,
  determinant,
  eigenSymmetric2,
  ellipsePoints,
  mahalanobisSquared,
  majorAxisAngle,
  peakDensity,
  sampleCovariance,
  standardNormals,
  transformSamples,
} from './math';

const close = (x: number, y: number, tol = 1e-9) => Math.abs(x - y) <= tol;

describe('covarianceMatrix', () => {
  it('builds [[σx², ρσxσy], [ρσxσy, σy²]]', () => {
    expect(covarianceMatrix(2, 1, 0.5)).toEqual({ a: 4, b: 1, c: 1 });
  });

  it('has det(Σ) = σx² σy² (1 − ρ²)', () => {
    for (const [sx, sy, rho] of [
      [1, 1, 0],
      [2, 1, 0.75],
      [0.5, 3, -0.9],
      [3, 3, 0.95],
    ] as const) {
      const expected = sx * sx * sy * sy * (1 - rho * rho);
      expect(close(determinant(covarianceMatrix(sx, sy, rho)), expected)).toBe(true);
    }
  });
});

describe('eigenSymmetric2', () => {
  it('returns the diagonal entries for a diagonal matrix, largest first', () => {
    const e = eigenSymmetric2({ a: 1, b: 0, c: 4 });
    expect(e.values).toEqual([4, 1]);
    expect(e.vectors[0]).toEqual([0, 1]);
    expect(e.vectors[1]).toEqual([-1, 0]);

    const f = eigenSymmetric2({ a: 4, b: 0, c: 1 });
    expect(f.values).toEqual([4, 1]);
    expect(f.vectors[0]).toEqual([1, 0]);
  });

  it('solves the L10 p.14 quartet member Σ_A = [[4, 3], [3, 4]]: λ = 7, 1 along y = ±x', () => {
    const e = eigenSymmetric2({ a: 4, b: 3, c: 4 });
    expect(close(e.values[0], 7)).toBe(true);
    expect(close(e.values[1], 1)).toBe(true);
    const r = Math.SQRT1_2;
    expect(close(e.vectors[0][0], r)).toBe(true);
    expect(close(e.vectors[0][1], r)).toBe(true);
  });

  it('returns orthonormal eigenvectors that satisfy Σv = λv', () => {
    for (const m of [
      covarianceMatrix(1, 1, 0.6),
      covarianceMatrix(2.5, 0.4, -0.95),
      covarianceMatrix(0.2, 3, 0.1),
      covarianceMatrix(1.3, 1.3, 0),
    ]) {
      const e = eigenSymmetric2(m);
      const [v1, v2] = e.vectors;
      expect(close(Math.hypot(v1[0], v1[1]), 1)).toBe(true);
      expect(close(Math.hypot(v2[0], v2[1]), 1)).toBe(true);
      expect(close(v1[0] * v2[0] + v1[1] * v2[1], 0)).toBe(true);
      for (const [v, l] of [
        [v1, e.values[0]],
        [v2, e.values[1]],
      ] as const) {
        expect(close(m.a * v[0] + m.b * v[1], l * v[0], 1e-8)).toBe(true);
        expect(close(m.b * v[0] + m.c * v[1], l * v[1], 1e-8)).toBe(true);
      }
      expect(close(e.values[0] + e.values[1], m.a + m.c)).toBe(true);
      expect(close(e.values[0] * e.values[1], determinant(m), 1e-8)).toBe(true);
      expect(e.values[0]).toBeGreaterThanOrEqual(e.values[1]);
    }
  });

  it('keeps v1 in the right half-plane so the arrow does not flip with ρ', () => {
    for (const rho of [-0.9, -0.3, 0, 0.3, 0.9]) {
      const e = eigenSymmetric2(covarianceMatrix(1.5, 1, rho));
      expect(e.vectors[0][0]).toBeGreaterThanOrEqual(0);
    }
    expect(Math.abs(majorAxisAngle(eigenSymmetric2(covarianceMatrix(1, 1, 0.5))))).toBeCloseTo(
      Math.PI / 4,
    );
  });
});

describe('ellipsePoints', () => {
  it('lie on the level set xᵀ Σ⁻¹ x = r²', () => {
    for (const m of [covarianceMatrix(2, 1, 0.75), covarianceMatrix(0.7, 2.2, -0.4)]) {
      for (const r of [1, 2]) {
        const pts = ellipsePoints(m, r, 64);
        expect(pts).toHaveLength(64);
        for (const p of pts) expect(close(mahalanobisSquared(m, p), r * r, 1e-8)).toBe(true);
      }
    }
  });

  it('is the circle of radius r for Σ = I', () => {
    for (const p of ellipsePoints({ a: 1, b: 0, c: 1 }, 2, 16)) {
      expect(close(Math.hypot(p[0], p[1]), 2)).toBe(true);
    }
  });
});

describe('sampling', () => {
  it('Cholesky factor reproduces Σ', () => {
    const m = covarianceMatrix(2, 1, 0.75);
    const { l11, l21, l22 } = cholesky2(m);
    expect(close(l11 * l11, m.a)).toBe(true);
    expect(close(l11 * l21, m.b)).toBe(true);
    expect(close(l21 * l21 + l22 * l22, m.c)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const a = standardNormals(5, createSeededRandom(7));
    const b = standardNormals(5, createSeededRandom(7));
    const c = standardNormals(5, createSeededRandom(8));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('sample covariance of 10 000 draws is within 5% of Σ', () => {
    const m = covarianceMatrix(2, 1, 0.75);
    const z = standardNormals(10_000, createSeededRandom(7));
    const s = sampleCovariance(transformSamples(z, m));
    expect(Math.abs(s.a - m.a) / m.a).toBeLessThan(0.05);
    expect(Math.abs(s.b - m.b) / m.b).toBeLessThan(0.05);
    expect(Math.abs(s.c - m.c) / m.c).toBeLessThan(0.05);
  });
});

describe('peakDensity', () => {
  it('matches the lesson 7.1 worked example: 1/(2π√7) for Σ_A', () => {
    expect(peakDensity({ a: 4, b: 3, c: 4 })).toBeCloseTo(0.0602, 4);
  });
});
