import { createSeededRandom } from '../_shared/seeded-random';
import {
  angleBetweenDegrees,
  classifyRate,
  cosineCurve,
  cosineForm,
  descentHalfPlane,
  descentIntervals,
  directionalDerivative,
  directionDegrees,
  dot,
  polygonArea,
  rateAtDegrees,
  steepestDirections,
  unitFromDegrees,
  wrapDegrees,
  type Vec2,
} from './math';

describe('inner-product-dial math', () => {
  const g: Vec2 = [3, 4];

  it('gᵀu = ‖g‖ cos φ for random gradients and unit directions', () => {
    const rng = createSeededRandom(11);
    for (let k = 0; k < 500; k += 1) {
      const gk: Vec2 = [10 * rng.uniform() - 5, 10 * rng.uniform() - 5];
      const u = unitFromDegrees(360 * rng.uniform());
      expect(Math.hypot(u[0], u[1])).toBeCloseTo(1, 12);
      expect(directionalDerivative(gk, u)).toBeCloseTo(cosineForm(gk, u), 10);
      // and it is bounded by Cauchy–Schwarz
      expect(Math.abs(directionalDerivative(gk, u))).toBeLessThanOrEqual(
        Math.hypot(gk[0], gk[1]) + 1e-12,
      );
    }
  });

  it('the rate along the gradient is ‖g‖, against it −‖g‖, and 0 at right angles', () => {
    const s = steepestDirections(g);
    expect(s.maxRate).toBe(5);
    expect(s.ascent).not.toBeNull();
    expect(s.descent).not.toBeNull();
    expect(directionalDerivative(g, s.ascent as Vec2)).toBeCloseTo(5, 12);
    expect(directionalDerivative(g, s.descent as Vec2)).toBeCloseTo(-5, 12);
    expect(s.descent).toEqual([-0.6, -0.8]);
    expect(s.ascentDeg).toBeCloseTo((Math.atan2(4, 3) * 180) / Math.PI, 10);
    expect(s.descentDeg).toBeCloseTo(s.ascentDeg + 180, 10);
    for (const level of s.levelDeg) expect(rateAtDegrees(g, level)).toBeCloseTo(0, 12);
    expect(classifyRate(g, unitFromDegrees(s.levelDeg[0]))).toBe('level');
  });

  it('the sampled cosine curve peaks at the gradient direction', () => {
    const curve = cosineCurve(g, 3600);
    const best = curve.reduce((a, b) => (b[1] > a[1] ? b : a));
    const worst = curve.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(best[0]).toBeCloseTo(steepestDirections(g).ascentDeg, 0);
    expect(best[1]).toBeCloseTo(5, 4);
    expect(worst[1]).toBeCloseTo(-5, 4);
    expect(curve[0]?.[1]).toBeCloseTo(3, 12); // u = e₁ reads off ∂f/∂θ₁
  });

  it('φ is the unsigned angle between u and g', () => {
    expect(angleBetweenDegrees(g, g)).toBeCloseTo(0, 6);
    expect(angleBetweenDegrees([1, 0], [0, 1])).toBeCloseTo(90, 12);
    expect(angleBetweenDegrees([1, 0], [-1, 0])).toBeCloseTo(180, 12);
    expect(angleBetweenDegrees([1, 0], unitFromDegrees(-30))).toBeCloseTo(30, 10);
    expect(angleBetweenDegrees([0, 0], [1, 0])).toBeNaN();
  });

  it('classifies ascent, descent, level, and the critical case', () => {
    expect(classifyRate(g, [1, 0])).toBe('ascent');
    expect(classifyRate(g, [-1, 0])).toBe('descent');
    expect(classifyRate(g, [0.8, -0.6])).toBe('level');
    expect(classifyRate([0, 0], [1, 0])).toBe('critical');
    expect(cosineForm([0, 0], [1, 0])).toBe(0);
    expect(steepestDirections([0, 0]).ascent).toBeNull();
  });

  it('the descent directions form an open half of the circle', () => {
    const intervals = descentIntervals(g);
    const total = intervals.reduce((a, [s, e]) => a + (e - s), 0);
    expect(total).toBeCloseTo(180, 10);
    for (let deg = 0.5; deg < 360; deg += 1) {
      const inside = intervals.some(([s, e]) => deg > s && deg < e);
      expect(inside, `ϑ = ${deg}`).toBe(rateAtDegrees(g, deg) < 0);
    }
    // a gradient along +x: descent is (90°, 270°), one interval
    expect(descentIntervals([2, 0])).toEqual([[90, 270]]);
    expect(descentIntervals([0, 0])).toEqual([]);
  });

  it('the descent half-plane is {x : gᵀx ≤ 0} clipped to the box', () => {
    const box = { x: [-6, 6] as const, y: [-6, 6] as const };
    const poly = descentHalfPlane(g, box);
    expect(polygonArea(poly)).toBeCloseTo(72, 10); // half of 144: the line passes through 0
    for (const p of poly) expect(dot(g, p)).toBeLessThanOrEqual(1e-9);
    expect(descentHalfPlane([0, 0], box)).toEqual([]);
    expect(polygonArea(descentHalfPlane([1, 0], box))).toBeCloseTo(72, 10);
  });

  it('angles wrap to [0, 360)', () => {
    expect(wrapDegrees(-90)).toBe(270);
    expect(wrapDegrees(360)).toBe(0);
    expect(wrapDegrees(725)).toBe(5);
    expect(Object.is(wrapDegrees(-0), 0)).toBe(true);
    expect(directionDegrees([0, -1])).toBeCloseTo(270, 12);
  });
});
