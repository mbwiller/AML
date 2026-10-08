/**
 * Pure math for `inner-product-dial` (lesson 2.3): the directional
 * derivative of a differentiable f at θ along a unit vector u,
 *
 *   D_u f(θ) = ∇f(θ)ᵀu = ‖∇f(θ)‖ cos φ,
 *
 * where φ is the angle between u and the gradient g = ∇f(θ); the cosine
 * curve of that rate over the direction of u; the half-plane of descent
 * directions {u : gᵀu < 0}; and the steepest directions ±g/‖g‖
 * (thm-2-3-2, der-2-3-3). No React, no DOM; unit-tested in `math.test.ts`.
 *
 * Angles: ϑ (vartheta) is the direction of u measured counterclockwise from
 * the first axis, in degrees on [0, 360); φ is the unsigned angle between u
 * and g, in degrees on [0, 180].
 */

export type Vec2 = readonly [number, number];

const DEG = Math.PI / 180;

/** Below this norm the gradient is treated as zero (a critical point). */
export const ZERO_GRADIENT = 1e-9;

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function norm(a: Vec2): number {
  return Math.hypot(a[0], a[1]);
}

/** Angle in degrees reduced to [0, 360). */
export function wrapDegrees(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r === 0 ? 0 : r;
}

/** The unit vector u = (cos ϑ, sin ϑ). */
export function unitFromDegrees(deg: number): Vec2 {
  return [Math.cos(deg * DEG), Math.sin(deg * DEG)];
}

/** Direction of a nonzero vector, degrees in [0, 360). */
export function directionDegrees(v: Vec2): number {
  return wrapDegrees(Math.atan2(v[1], v[0]) / DEG);
}

/** D_u f(θ) = gᵀu: the slope of f along u (der-2-3-1). */
export function directionalDerivative(g: Vec2, u: Vec2): number {
  return dot(g, u);
}

/** φ ∈ [0°, 180°], the angle between u and g; NaN when either is zero. */
export function angleBetweenDegrees(g: Vec2, u: Vec2): number {
  const ng = norm(g);
  const nu = norm(u);
  if (ng < ZERO_GRADIENT || nu < ZERO_GRADIENT) return Number.NaN;
  const c = Math.min(Math.max(dot(g, u) / (ng * nu), -1), 1);
  return Math.acos(c) / DEG;
}

/** ‖g‖ cos φ for a unit u, the cosine form of the same rate (der-2-3-3 step 7). */
export function cosineForm(g: Vec2, u: Vec2): number {
  const phi = angleBetweenDegrees(g, u);
  return Number.isNaN(phi) ? 0 : norm(g) * Math.cos(phi * DEG);
}

/** The rate along the unit direction at angle ϑ: ‖g‖ cos(ϑ − ϑ_g). */
export function rateAtDegrees(g: Vec2, deg: number): number {
  return directionalDerivative(g, unitFromDegrees(deg));
}

export interface SteepestDirections {
  /** g/‖g‖, the steepest-ascent direction; null when g = 0. */
  ascent: Vec2 | null;
  /** −g/‖g‖, the steepest-descent direction. */
  descent: Vec2 | null;
  /** Directions of ascent, descent, and the two level directions (degrees). */
  ascentDeg: number;
  descentDeg: number;
  levelDeg: readonly [number, number];
  /** max over unit u of gᵀu, which is ‖g‖ (and the min is −‖g‖). */
  maxRate: number;
}

export function steepestDirections(g: Vec2): SteepestDirections {
  const ng = norm(g);
  if (ng < ZERO_GRADIENT) {
    return {
      ascent: null,
      descent: null,
      ascentDeg: Number.NaN,
      descentDeg: Number.NaN,
      levelDeg: [Number.NaN, Number.NaN],
      maxRate: 0,
    };
  }
  const a = directionDegrees(g);
  return {
    ascent: [g[0] / ng, g[1] / ng],
    descent: [-g[0] / ng, -g[1] / ng],
    ascentDeg: a,
    descentDeg: wrapDegrees(a + 180),
    levelDeg: [wrapDegrees(a + 90), wrapDegrees(a + 270)],
    maxRate: ng,
  };
}

export type RateKind = 'ascent' | 'descent' | 'level' | 'critical';

/**
 * To first order, f increases along u when gᵀu > 0, decreases when gᵀu < 0,
 * and does not change when gᵀu = 0 (within `tol`, relative to ‖g‖).
 * With g = 0 every direction is level: θ is a critical point.
 */
export function classifyRate(g: Vec2, u: Vec2, tol = 1e-3): RateKind {
  const ng = norm(g);
  if (ng < ZERO_GRADIENT) return 'critical';
  const r = directionalDerivative(g, u);
  if (Math.abs(r) <= tol * ng) return 'level';
  return r > 0 ? 'ascent' : 'descent';
}

/** The curve ϑ ↦ gᵀu(ϑ) sampled at `count` + 1 points on [0°, 360°]. */
export function cosineCurve(g: Vec2, count = 180): Vec2[] {
  const out: Vec2[] = [];
  for (let k = 0; k <= count; k += 1) {
    const deg = (360 * k) / count;
    out.push([deg, rateAtDegrees(g, deg)]);
  }
  return out;
}

/**
 * The ϑ-intervals in [0°, 360°] on which gᵀu(ϑ) < 0 (the descent directions),
 * as [start, end] pairs: one interval, or two when it wraps past 360°.
 */
export function descentIntervals(g: Vec2): [number, number][] {
  const s = steepestDirections(g);
  if (s.ascent === null) return [];
  const start = s.levelDeg[0];
  const end = start + 180;
  return end <= 360
    ? [[start, end]]
    : [
        [start, 360],
        [0, end - 360],
      ];
}

/**
 * The polygon {x : gᵀx ≤ 0} ∩ box (Sutherland–Hodgman against one
 * half-plane). Empty when g = 0. The box is [x0, x1] × [y0, y1].
 */
export function descentHalfPlane(
  g: Vec2,
  box: { x: readonly [number, number]; y: readonly [number, number] },
): Vec2[] {
  if (norm(g) < ZERO_GRADIENT) return [];
  const corners: Vec2[] = [
    [box.x[0], box.y[0]],
    [box.x[1], box.y[0]],
    [box.x[1], box.y[1]],
    [box.x[0], box.y[1]],
  ];
  const inside = (p: Vec2) => dot(g, p) <= 0;
  const out: Vec2[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    const p = corners[i] as Vec2;
    const q = corners[(i + 1) % corners.length] as Vec2;
    const pIn = inside(p);
    const qIn = inside(q);
    if (pIn) out.push(p);
    if (pIn !== qIn) {
      const fp = dot(g, p);
      const fq = dot(g, q);
      const t = fp / (fp - fq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

/** Shoelace area, for tests. */
export function polygonArea(points: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i] as Vec2;
    const q = points[(i + 1) % points.length] as Vec2;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/** Half-widths the plot window snaps to, so it rescales rarely as g changes. */
export const VIEW_STEPS = [2.5, 4, 6.5, 9] as const;

/** Half-width of the square plot window: room for g, the dial, and labels. */
export function viewHalfWidth(g: Vec2): number {
  const need = 1.25 * Math.max(norm(g), 1);
  return VIEW_STEPS.find((s) => s >= need) ?? 9;
}
