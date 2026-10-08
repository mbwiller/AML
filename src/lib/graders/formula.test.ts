import { describe, expect, it } from 'vitest';

import { evaluateFormula, FormulaError, formulaNames } from './formula';

describe('evaluateFormula', () => {
  it('evaluates the four operations with the usual precedence', () => {
    expect(evaluateFormula('1 + 2 * 3')).toBe(7);
    expect(evaluateFormula('(1 + 2) * 3')).toBe(9);
    expect(evaluateFormula('8 / 4 / 2')).toBe(1);
    expect(evaluateFormula('10 - 4 - 3')).toBe(3);
  });

  it('supports ^ and ** as right-associative powers that bind tighter than unary minus', () => {
    expect(evaluateFormula('2 ^ 3')).toBe(8);
    expect(evaluateFormula('2 ** 3 ** 2')).toBe(512);
    expect(evaluateFormula('-2 ^ 2')).toBe(-4);
    expect(evaluateFormula('(-2) ^ 2')).toBe(4);
  });

  it('reads the bank formulas with their parameters', () => {
    expect(evaluateFormula('s / n_k', { s: 6, n_k: 40 })).toBe(0.15);
    expect(evaluateFormula('a * a - b * b', { a: 5, b: 3 })).toBe(16);
    expect(evaluateFormula('K * d + K - 1', { K: 3, d: 200 })).toBe(602);
    expect(evaluateFormula('-rho / (1 - rho**2)', { rho: 0.8 })).toBeCloseTo(-2.2222, 4);
    expect(evaluateFormula('(n_k - 1) / n_k * s2', { n_k: 5, s2: 4 })).toBeCloseTo(3.2);
    expect(evaluateFormula('1 / (1 + exp(s0 - s1))', { s0: -805, s1: -800 })).toBeCloseTo(
      0.9933,
      4,
    );
    expect(
      evaluateFormula('log(p1 * (1 - p0) / (p0 * (1 - p1)))', { p1: 0.5, p0: 0.2 }),
    ).toBeCloseTo(Math.log(4));
  });

  it('knows log, ln, exp, sqrt, abs, floor, ceil, round, pi, and e', () => {
    expect(evaluateFormula('ln(e)')).toBeCloseTo(1);
    expect(evaluateFormula('sqrt(16) + abs(-2)')).toBe(6);
    expect(evaluateFormula('exp(0) * pi')).toBeCloseTo(Math.PI);
    expect(evaluateFormula('floor(7 / 2) + ceil(7 / 2) + round(2.4)')).toBe(9);
  });

  it('lets a parameter shadow a constant', () => {
    expect(evaluateFormula('e + 1', { e: 10 })).toBe(11);
  });

  it('accepts scientific notation, leading-dot decimals, and unicode × −', () => {
    expect(evaluateFormula('1.5e-3 * 1e3')).toBeCloseTo(1.5);
    expect(evaluateFormula('.5 × 4 − 1')).toBe(1);
  });

  it('rejects names it does not know', () => {
    expect(() => evaluateFormula('s / n_k', { s: 6 })).toThrow(FormulaError);
    expect(() => evaluateFormula('foo + 1')).toThrow(/unknown name "foo"/);
    expect(() => evaluateFormula('sin(1)')).toThrow(/unknown function "sin"/);
  });

  it('rejects anything that looks like code', () => {
    expect(() => evaluateFormula('Math.PI')).toThrow(FormulaError);
    expect(() => evaluateFormula('window["x"]')).toThrow(FormulaError);
    expect(() => evaluateFormula('1; 2')).toThrow(FormulaError);
    expect(() => evaluateFormula('a => a')).toThrow(FormulaError);
  });

  it('rejects malformed expressions and non-finite results', () => {
    expect(() => evaluateFormula('1 +')).toThrow(/unexpected end/);
    expect(() => evaluateFormula('(1 + 2')).toThrow(/expected "\)"/);
    expect(() => evaluateFormula('1 2')).toThrow(/unexpected "2"/);
    expect(() => evaluateFormula('')).toThrow(FormulaError);
    expect(() => evaluateFormula('1 / 0')).toThrow(/finite/);
    expect(() => evaluateFormula('log(0)')).toThrow(/finite/);
  });
});

describe('formulaNames', () => {
  it('lists parameters but not function names', () => {
    expect(formulaNames('log(p1 * (1 - p0) / (p0 * (1 - p1)))')).toEqual(['p1', 'p0']);
    expect(formulaNames('K * d + K - 1')).toEqual(['K', 'd']);
    expect(formulaNames('2 + 2')).toEqual([]);
  });
});
