import { describe, expect, it } from 'vitest';

import { expectedAnswer, gradeNumeric, isWithinTolerance, parseNumber } from './numeric';

describe('parseNumber', () => {
  it('reads decimals in every common spelling', () => {
    expect(parseNumber('0.15')).toEqual({ ok: true, value: 0.15 });
    expect(parseNumber('.15')).toEqual({ ok: true, value: 0.15 });
    expect(parseNumber('15.')).toEqual({ ok: true, value: 15 });
    expect(parseNumber('  -3 ')).toEqual({ ok: true, value: -3 });
    expect(parseNumber('+2.5')).toEqual({ ok: true, value: 2.5 });
    expect(parseNumber('−2.22')).toEqual({ ok: true, value: -2.22 });
  });

  it('reads scientific notation', () => {
    expect(parseNumber('1.5e-3')).toEqual({ ok: true, value: 0.0015 });
    expect(parseNumber('2E2')).toEqual({ ok: true, value: 200 });
  });

  it('reads fractions', () => {
    expect(parseNumber('6/40')).toEqual({ ok: true, value: 0.15 });
    expect(parseNumber(' -2 / 3 ')).toEqual({ ok: true, value: -2 / 3 });
    expect(parseNumber('1.5/0.5')).toEqual({ ok: true, value: 3 });
  });

  it('rejects empty input, zero denominators, percentages, commas, and junk', () => {
    expect(parseNumber('')).toEqual({ ok: false, message: 'Enter a number first.' });
    expect(parseNumber('   ')).toEqual({ ok: false, message: 'Enter a number first.' });
    expect(parseNumber('1/0').ok).toBe(false);
    expect(parseNumber('15%')).toMatchObject({
      ok: false,
      message: expect.stringMatching(/percentage/),
    });
    expect(parseNumber('1,000')).toMatchObject({
      ok: false,
      message: expect.stringMatching(/commas/),
    });
    expect(parseNumber('sqrt(2)')).toMatchObject({
      ok: false,
      message: expect.stringMatching(/Could not read/),
    });
    expect(parseNumber('1e')).toMatchObject({ ok: false });
    expect(parseNumber('1/2/3')).toMatchObject({ ok: false });
    expect(parseNumber('Infinity')).toMatchObject({ ok: false });
  });
});

describe('isWithinTolerance', () => {
  it('is inclusive at the edge and absolute', () => {
    expect(isWithinTolerance(0.155, 0.15, 0.005)).toBe(true);
    expect(isWithinTolerance(0.145, 0.15, 0.005)).toBe(true);
    expect(isWithinTolerance(0.1551, 0.15, 0.005)).toBe(false);
    expect(isWithinTolerance(16, 16, 0)).toBe(true);
    expect(isWithinTolerance(16.0001, 16, 0)).toBe(false);
  });

  it('forgives floating-point noise at tolerance 0', () => {
    expect(isWithinTolerance(0.1 + 0.2, 0.3, 0)).toBe(true);
  });
});

describe('expectedAnswer', () => {
  it('uses the bank answer without params and the formula with them', () => {
    const item = { answer: 0.15, formula: 's / n_k' };
    expect(expectedAnswer(item)).toBe(0.15);
    expect(expectedAnswer(item, {})).toBe(0.15);
    expect(expectedAnswer(item, { s: 3, n_k: 20 })).toBe(0.15);
    expect(expectedAnswer(item, { s: 9, n_k: 50 })).toBe(0.18);
  });

  it('ignores params when the item has no formula', () => {
    expect(expectedAnswer({ answer: 2 }, { s: 1 })).toBe(2);
  });
});

describe('gradeNumeric', () => {
  const item = {
    answer: 0.15,
    tolerance: 0.005,
    formula: 's / n_k',
    explanation: 'Count and divide.',
  };

  it('grades decimals and fractions against the bank answer', () => {
    expect(gradeNumeric(item, '0.15')).toMatchObject({
      correct: true,
      value: 0.15,
      expected: 0.15,
    });
    expect(gradeNumeric(item, '6/40')).toMatchObject({
      correct: true,
      explanation: 'Count and divide.',
    });
    expect(gradeNumeric(item, '0.16')).toMatchObject({ correct: false });
    expect(gradeNumeric(item, '0.154')).toMatchObject({ correct: true });
  });

  it('grades a seeded instance against the formula', () => {
    const r = gradeNumeric(item, '0.18', { s: 9, n_k: 50 });
    expect(r).toMatchObject({ correct: true, expected: 0.18 });
    expect(gradeNumeric(item, '0.15', { s: 9, n_k: 50 }).correct).toBe(false);
  });

  it('reports a message instead of a verdict for unreadable input', () => {
    const r = gradeNumeric(item, 'about 0.15');
    expect(r.correct).toBe(false);
    expect(r.value).toBeUndefined();
    expect(r.message).toMatch(/Could not read/);
  });

  it('defaults tolerance to 0', () => {
    expect(gradeNumeric({ answer: 16 }, '16')).toMatchObject({ correct: true, tolerance: 0 });
    expect(gradeNumeric({ answer: 16 }, '16.01').correct).toBe(false);
  });
});
