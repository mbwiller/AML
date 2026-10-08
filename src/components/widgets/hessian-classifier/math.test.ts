import {
  actualKind,
  classifyEigenvalues,
  classifyHessian,
  contourLevels,
  eigenOf,
  evaluate,
  flatIndex,
  hessianFromEigen,
  HIGHER_ORDER,
  levelSets,
  makeSurface,
  quadraticForm,
  slice,
  type ActualKind,
  type CriticalKind,
  type Surface,
} from './math';

/** Sample f on a small disk around 0 and say what the critical point looks like. */
function numericKind(s: Surface): ActualKind {
  let above = false;
  let below = false;
  let zeroElsewhere = false;
  const f0 = evaluate(s, [0, 0]);
  for (const r of [0.01, 0.02, 0.05]) {
    for (let k = 0; k < 360; k += 1) {
      const t = (k * Math.PI) / 180;
      const d = evaluate(s, [r * Math.cos(t), r * Math.sin(t)]) - f0;
      if (d > 1e-12) above = true;
      else if (d < -1e-12) below = true;
      else zeroElsewhere = true;
    }
  }
  if (above && below) return 'saddle';
  if (above) return zeroElsewhere ? 'non-strict-minimum' : 'strict-minimum';
  if (below) return zeroElsewhere ? 'non-strict-maximum' : 'strict-maximum';
  return 'constant';
}

describe('hessian-classifier math', () => {
  it('classifies every sign pattern of two eigenvalues, including zero', () => {
    const cases: [number, number, CriticalKind][] = [
      [2, 1, 'minimum'],
      [0.1, 3, 'minimum'],
      [-2, -1, 'maximum'],
      [-0.1, -3, 'maximum'],
      [2, -1, 'saddle'],
      [-1, 2, 'saddle'],
      [2, 0, 'degenerate'],
      [0, 2, 'degenerate'],
      [-2, 0, 'degenerate'],
      [0, -2, 'degenerate'],
      [0, 0, 'degenerate'],
    ];
    for (const [l1, l2, kind] of cases) {
      expect(classifyEigenvalues([l1, l2]), `${l1}, ${l2}`).toBe(kind);
      // Same answer from the assembled H at several rotations (the shared eigen helper).
      for (const r of [0, 30, -45, 90]) {
        expect(classifyHessian(hessianFromEigen(l1, l2, r)), `${l1}, ${l2}, ${r}°`).toBe(kind);
      }
    }
    // A zero alongside both signs is still a saddle (lesson 2.3, after der-2-3-7).
    expect(classifyEigenvalues([1, 0, -1])).toBe('saddle');
  });

  it('H = Q diag(λ) Qᵀ has eigenvalues λ and eigenvectors the columns of Q', () => {
    for (const [l1, l2, r] of [
      [2, -1, 30],
      [3, 0.5, -70],
      [-1.5, -1.5, 10],
      [0, 2, 45],
    ] as const) {
      const h = hessianFromEigen(l1, l2, r);
      const e = eigenOf(h);
      expect(e.values[0]).toBeCloseTo(Math.max(l1, l2), 10);
      expect(e.values[1]).toBeCloseTo(Math.min(l1, l2), 10);
      // trace and determinant are invariant
      expect(h.a + h.c).toBeCloseTo(l1 + l2, 10);
      expect(h.a * h.c - h.b * h.b).toBeCloseTo(l1 * l2, 10);
      // H v = λ v for each eigenpair
      e.vectors.forEach((v, k) => {
        const lam = e.values[k] as number;
        expect(h.a * v[0] + h.b * v[1]).toBeCloseTo(lam * v[0], 10);
        expect(h.b * v[0] + h.c * v[1]).toBeCloseTo(lam * v[1], 10);
      });
    }
    // rotation 30°: the first column of Q is (cos 30°, sin 30°)
    const h = hessianFromEigen(2, -1, 30);
    const q1: [number, number] = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
    expect(quadraticForm(h, q1)).toBeCloseTo(1, 12); // ½ · 2 · 1²
  });

  it('along an eigenvector the slice is ½ λ t²', () => {
    const s = makeSurface(2, -1, 30, 'none');
    for (const t of [-2, -0.5, 1, 3]) {
      expect(slice(s, 0, t)).toBeCloseTo(0.5 * 2 * t * t, 10);
      expect(slice(s, 1, t)).toBeCloseTo(0.5 * -1 * t * t, 10);
    }
  });

  it('the higher-order term acts along the flattest eigenvector and leaves H alone', () => {
    const s = makeSurface(0, 2, 20, 'quartic');
    expect(flatIndex(s.values)).toBe(0);
    expect(s.values[s.flat]).toBe(0);
    expect(flatIndex([2, 0])).toBe(1);
    expect(flatIndex([1, -1])).toBe(1);
    expect(slice(s, s.flat, 2)).toBeCloseTo(0.25 * 16, 10);
    // second difference at 0 along the flat direction ≈ 0 (the term has zero Hessian)
    const hstep = 1e-3;
    const second =
      (slice(s, s.flat, hstep) - 2 * slice(s, s.flat, 0) + slice(s, s.flat, -hstep)) /
      (hstep * hstep);
    expect(Math.abs(second)).toBeLessThan(1e-5);
  });

  it('the actual critical point matches a numerical check for every case', () => {
    const eigs: [number, number][] = [
      [2, 1],
      [-2, -1],
      [2, -1],
      [2, 0],
      [-2, 0],
      [0, 0],
    ];
    const expected: Record<string, ActualKind> = {
      '2,1': 'strict-minimum',
      '-2,-1': 'strict-maximum',
      '2,-1': 'saddle',
      '2,0,none': 'non-strict-minimum',
      '2,0,quartic': 'strict-minimum',
      '2,0,negQuartic': 'saddle',
      '2,0,cubic': 'saddle',
      '-2,0,none': 'non-strict-maximum',
      '-2,0,quartic': 'saddle',
      '-2,0,negQuartic': 'strict-maximum',
      '-2,0,cubic': 'saddle',
      '0,0,none': 'constant',
      '0,0,quartic': 'non-strict-minimum',
      '0,0,negQuartic': 'non-strict-maximum',
      '0,0,cubic': 'saddle',
    };
    for (const [l1, l2] of eigs) {
      for (const term of HIGHER_ORDER) {
        const s = makeSurface(l1, l2, 25, term);
        const key = l2 === 0 || l1 === 0 ? `${l1},${l2},${term}` : `${l1},${l2}`;
        const want = expected[key];
        expect(actualKind(s), key).toBe(want);
        expect(numericKind(s), `numeric ${key} ${term}`).toBe(want);
      }
    }
  });

  it('level sets of a definite quadratic are ellipses with the right semi-axes', () => {
    const s = makeSurface(2, 0.5, 30, 'none');
    const levels = contourLevels(s.eigen, 3);
    expect(levels).toHaveLength(10);
    const sets = levelSets(s, { x: [-3, 3], y: [-3, 3] }, [1]);
    expect(sets[0]?.level).toBe(0);
    expect(sets[0]?.lines).toHaveLength(0); // f > 0 away from 0: no zero crossing
    const ring = sets[1]?.lines ?? [];
    expect(ring.length).toBeGreaterThan(0);
    for (const line of ring) for (const p of line) expect(evaluate(s, p)).toBeCloseTo(1, 1);
  });

  it('a saddle has a zero level set through the critical point', () => {
    const s = makeSurface(2, -1, 0, 'none');
    const zero = levelSets(s, { x: [-3, 3], y: [-3, 3] }, [])[0]?.lines ?? [];
    expect(zero.length).toBeGreaterThanOrEqual(2);
    for (const line of zero)
      for (const p of line) expect(Math.abs(evaluate(s, p))).toBeLessThan(0.1);
  });
});
