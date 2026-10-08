/**
 * Seeded randomness for widgets (STYLE_GUIDE.md §7 point 6): d3-random's
 * `randomLcg` source, so the same seed gives the same scatter on every
 * machine, in every theme, and in every Playwright run.
 *
 * Framework-free; `useSeededRandom.ts` wraps it for React.
 */
import { randomLcg, randomNormal, randomUniform } from 'd3-random';

export interface SeededRandom {
  seed: number;
  /** Standard normal draw, N(0, 1). */
  normal: () => number;
  /** Uniform draw on [0, 1). */
  uniform: () => number;
}

/** d3's LCG takes a seed in [0, 1); map any integer or float onto it. */
function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0.5;
  const frac = (Math.abs(seed) * 0.6180339887498949) % 1;
  return frac === 0 ? 0.5 : frac;
}

export function createSeededRandom(seed: number): SeededRandom {
  const source = randomLcg(normalizeSeed(seed));
  return {
    seed,
    normal: randomNormal.source(source)(0, 1),
    uniform: randomUniform.source(source)(0, 1),
  };
}
