import { useMemo } from 'react';

import { createSeededRandom, type SeededRandom } from './seeded-random';

/**
 * A seeded RNG that is recreated only when `seed` changes, so a widget's
 * random draws are stable across re-renders and identical across machines.
 * Draw inside a `useMemo` keyed on `rng` and the sample size, never in render.
 */
export function useSeededRandom(seed: number): SeededRandom {
  return useMemo(() => createSeededRandom(seed), [seed]);
}
