import { describe, expect, it } from 'vitest';

import {
  KEY_ACTIONS,
  chunkStates,
  clampRevealed,
  countLabel,
  initialState,
  minRevealed,
  nextState,
  parseStepHash,
  parseStored,
  stepId,
  storageKey,
} from './derivation-state';

describe('reveal state machine', () => {
  const s = (revealed: number, total = 5) => ({ total, revealed });

  it('reveals one step at a time and stops at the end', () => {
    expect(nextState(s(1), { type: 'next' })).toEqual(s(2));
    expect(nextState(s(5), { type: 'next' })).toEqual(s(5));
  });

  it('hides the last step but never the first', () => {
    expect(nextState(s(3), { type: 'prev' })).toEqual(s(2));
    expect(nextState(s(1), { type: 'prev' })).toEqual(s(1));
  });

  it('reveals all and resets to the first step', () => {
    expect(nextState(s(2), { type: 'all' })).toEqual(s(5));
    expect(nextState(s(5), { type: 'reset' })).toEqual(s(1));
  });

  it('jumps to a step, clamped into range', () => {
    expect(nextState(s(1), { type: 'to', step: 4 })).toEqual(s(4));
    expect(nextState(s(4), { type: 'to', step: 2 })).toEqual(s(2));
    expect(nextState(s(1), { type: 'to', step: 99 })).toEqual(s(5));
    expect(nextState(s(3), { type: 'to', step: 0 })).toEqual(s(1));
    expect(nextState(s(3), { type: 'to', step: Number.NaN })).toEqual(s(1));
  });

  it('handles an empty derivation', () => {
    expect(minRevealed(0)).toBe(0);
    expect(nextState(s(0, 0), { type: 'next' })).toEqual(s(0, 0));
    expect(nextState(s(0, 0), { type: 'all' })).toEqual(s(0, 0));
    expect(clampRevealed(0, 3)).toBe(0);
  });

  it('maps the documented keys to actions', () => {
    expect(KEY_ACTIONS.ArrowRight).toEqual({ type: 'next' });
    expect(KEY_ACTIONS[' ']).toEqual({ type: 'next' });
    expect(KEY_ACTIONS.ArrowLeft).toEqual({ type: 'prev' });
    expect(KEY_ACTIONS.a).toEqual({ type: 'all' });
    expect(KEY_ACTIONS.r).toEqual({ type: 'reset' });
    expect(KEY_ACTIONS.g).toBeUndefined();
  });
});

describe('initial state', () => {
  it('shows the first step by default', () => {
    expect(initialState(7)).toEqual({ total: 7, revealed: 1 });
    expect(initialState(0)).toEqual({ total: 0, revealed: 0 });
  });

  it('restores a persisted count, clamped', () => {
    expect(initialState(7, { stored: 4 })).toEqual({ total: 7, revealed: 4 });
    expect(initialState(7, { stored: 40 })).toEqual({ total: 7, revealed: 7 });
    expect(initialState(7, { stored: 0 })).toEqual({ total: 7, revealed: 1 });
  });

  it('lets a step fragment win over storage', () => {
    expect(initialState(7, { stored: 6, hashStep: 2 })).toEqual({ total: 7, revealed: 2 });
  });
});

describe('chunk states', () => {
  it('marks done, current, and upcoming from the revealed prefix', () => {
    expect(chunkStates([3, 2, 4], 1)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(chunkStates([3, 2, 4], 3)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(chunkStates([3, 2, 4], 4)).toEqual(['done', 'current', 'upcoming']);
    expect(chunkStates([3, 2, 4], 9)).toEqual(['done', 'done', 'current']);
  });

  it('treats an empty chunk as done once passed', () => {
    expect(chunkStates([2, 0, 1], 2)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(chunkStates([2, 0, 1], 3)).toEqual(['done', 'done', 'current']);
  });
});

describe('ids, fragments, storage', () => {
  it('formats the count and the step id', () => {
    expect(countLabel({ total: 12, revealed: 3 })).toBe('3 of 12');
    expect(stepId('der-5-3-1', 7)).toBe('der-5-3-1-step-7');
    expect(storageKey('der-5-3-1')).toBe('aml-derivation:der-5-3-1');
  });

  it('parses only this derivation’s step fragments', () => {
    expect(parseStepHash('#der-5-3-1-step-7', 'der-5-3-1')).toBe(7);
    expect(parseStepHash('der-5-3-1-step-7', 'der-5-3-1')).toBe(7);
    expect(parseStepHash('#der-5-3-1-step-0', 'der-5-3-1')).toBeNull();
    expect(parseStepHash('#der-5-3-1-step-x', 'der-5-3-1')).toBeNull();
    expect(parseStepHash('#der-5-3-1', 'der-5-3-1')).toBeNull();
    expect(parseStepHash('#der-5-3-10-step-2', 'der-5-3-1')).toBeNull();
    expect(parseStepHash('', 'der-5-3-1')).toBeNull();
  });

  it('reads back only non-negative integers from storage', () => {
    expect(parseStored('4')).toBe(4);
    expect(parseStored(' 12 ')).toBe(12);
    expect(parseStored('-1')).toBeNull();
    expect(parseStored('abc')).toBeNull();
    expect(parseStored(null)).toBeNull();
    expect(parseStored(undefined)).toBeNull();
  });
});
