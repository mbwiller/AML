/**
 * The `<Derivation>` reveal engine as pure functions (STYLE_GUIDE.md §8:
 * logic lives in src/lib, framework-free, unit-tested). The vanilla script in
 * `src/components/mdx/Derivation.astro` is a thin DOM shell around these.
 *
 * A derivation with `total` steps shows a prefix of `revealed` steps. The first
 * step is always visible (when there is one), so `revealed` is clamped to
 * `[min(1, total), total]`. Step numbers are 1-based and run across chunks.
 */

export interface DerivationState {
  readonly total: number;
  readonly revealed: number;
}

export type DerivationAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'all' }
  | { type: 'reset' }
  | { type: 'to'; step: number };

export type ChunkState = 'done' | 'current' | 'upcoming';

/** Keyboard bindings (VISION.md §7): `→`/Space next, `←` hide last, `a` all, `r` reset. */
export const KEY_ACTIONS: Readonly<Record<string, DerivationAction>> = {
  ArrowRight: { type: 'next' },
  ' ': { type: 'next' },
  ArrowLeft: { type: 'prev' },
  a: { type: 'all' },
  r: { type: 'reset' },
};

/** The smallest allowed `revealed` for a derivation of `total` steps. */
export function minRevealed(total: number): number {
  return total > 0 ? 1 : 0;
}

/** Clamp a requested count into `[minRevealed, total]`; NaN and negatives clamp to the minimum. */
export function clampRevealed(total: number, revealed: number): number {
  const safeTotal = Math.max(0, Math.floor(total));
  const n = Number.isFinite(revealed) ? Math.floor(revealed) : 0;
  return Math.min(safeTotal, Math.max(minRevealed(safeTotal), n));
}

/** `nextState(state, action)`: the reveal state machine. Always returns a valid state. */
export function nextState(state: DerivationState, action: DerivationAction): DerivationState {
  const { total } = state;
  switch (action.type) {
    case 'next':
      return { total, revealed: clampRevealed(total, state.revealed + 1) };
    case 'prev':
      return { total, revealed: clampRevealed(total, state.revealed - 1) };
    case 'all':
      return { total, revealed: clampRevealed(total, total) };
    case 'reset':
      return { total, revealed: minRevealed(total) };
    case 'to':
      return { total, revealed: clampRevealed(total, action.step) };
  }
}

/**
 * The state a derivation opens in. A step fragment in the URL wins (hints
 * deep-link to "step 7", so exactly that prefix is shown); otherwise the
 * persisted count; otherwise the first step only.
 */
export function initialState(
  total: number,
  options: { stored?: number | null | undefined; hashStep?: number | null | undefined } = {},
): DerivationState {
  const { stored = null, hashStep = null } = options;
  if (hashStep !== null) return { total, revealed: clampRevealed(total, hashStep) };
  if (stored !== null) return { total, revealed: clampRevealed(total, stored) };
  return { total, revealed: minRevealed(total) };
}

/** Where we are, per chunk, from the chunk sizes in order (empty chunks count as upcoming). */
export function chunkStates(chunkSizes: readonly number[], revealed: number): ChunkState[] {
  const states: ChunkState[] = [];
  let seen = 0;
  for (const size of chunkSizes) {
    const first = seen + 1;
    const last = seen + size;
    seen = last;
    if (size <= 0) {
      states.push(last < revealed ? 'done' : 'upcoming');
    } else if (revealed >= first && revealed <= last) {
      states.push('current');
    } else if (revealed > last) {
      states.push('done');
    } else {
      states.push('upcoming');
    }
  }
  return states;
}

/** "3 of 12" — the text of the live count. */
export function countLabel(state: DerivationState): string {
  return `${state.revealed} of ${state.total}`;
}

/** The stable fragment id of a step: `der-6-3-2` + 7 → `der-6-3-2-step-7`. */
export function stepId(derivationId: string, step: number): string {
  return `${derivationId}-step-${step}`;
}

/**
 * The step number a URL fragment points at inside this derivation
 * (`#der-6-3-2-step-7` → 7); `null` for any other fragment.
 */
export function parseStepHash(hash: string, derivationId: string): number | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  let fragment = raw;
  try {
    fragment = decodeURIComponent(raw);
  } catch {
    /* keep the raw fragment */
  }
  const prefix = `${derivationId}-step-`;
  if (!fragment.startsWith(prefix)) return null;
  const rest = fragment.slice(prefix.length);
  if (!/^\d+$/.test(rest)) return null;
  const n = Number(rest);
  return n >= 1 ? n : null;
}

/** The localStorage key that remembers the revealed count: `aml-derivation:<id>`. */
export function storageKey(derivationId: string): string {
  return `aml-derivation:${derivationId}`;
}

/** A persisted count read back from storage; `null` unless it is a non-negative integer. */
export function parseStored(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}
