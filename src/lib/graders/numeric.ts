/**
 * Numeric grader (VISION.md §9.5; docs/CONTENT_AUTHORING.md §7).
 *
 * `tolerance` is absolute: an answer is correct when |given − expected| ≤
 * tolerance (plus a 1e-9 relative floating-point guard). Inputs accepted:
 * decimals ("0.15", ".15", "15."), signed numbers, scientific notation
 * ("1.5e-3"), and fractions ("6/40"). Anything else is rejected with a
 * message the UI shows in place of a verdict.
 */
import { evaluateFormula } from './formula';

export interface NumericItemLike {
  answer: number;
  tolerance?: number | undefined;
  formula?: string | undefined;
  explanation?: string | undefined;
}

export type ParsedNumber = { ok: true; value: number } | { ok: false; message: string };

const SIGNED_NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;
const NUMBER_RE = new RegExp(`^${SIGNED_NUMBER}$`);
const FRACTION_RE = new RegExp(`^(${SIGNED_NUMBER})\\s*/\\s*(${SIGNED_NUMBER})$`);

export const NUMERIC_FORMAT_HINT = 'a decimal (0.15), a fraction (6/40), or 1.5e-3';

/** Parse learner input into a number, or explain why it cannot be read. */
export function parseNumber(raw: string): ParsedNumber {
  const text = raw.trim().replace(/−/g, '-').replace(/\s+/g, ' ');
  if (text === '') return { ok: false, message: 'Enter a number first.' };
  if (NUMBER_RE.test(text)) return { ok: true, value: Number(text) };
  const fraction = FRACTION_RE.exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return { ok: false, message: 'The denominator cannot be 0.' };
    return { ok: true, value: Number(fraction[1]) / denominator };
  }
  if (text.endsWith('%')) {
    return { ok: false, message: 'Enter a probability as a decimal, not a percentage.' };
  }
  if (text.includes(',')) {
    return { ok: false, message: 'Write the number without commas.' };
  }
  return { ok: false, message: `Could not read "${text}": enter ${NUMERIC_FORMAT_HINT}.` };
}

export interface NumericResult {
  correct: boolean;
  /** The parsed input, when it could be read. */
  value?: number | undefined;
  /** What this instance expects: the bank `answer`, or the formula at `params`. */
  expected: number;
  tolerance: number;
  /** Set when the input could not be parsed; `correct` is then false. */
  message?: string | undefined;
  explanation?: string | undefined;
}

/** The expected value for one instance: the formula at `params` when both exist, else `answer`. */
export function expectedAnswer(
  item: Pick<NumericItemLike, 'answer' | 'formula'>,
  params?: Readonly<Record<string, number>>,
): number {
  if (params && item.formula && Object.keys(params).length > 0) {
    return evaluateFormula(item.formula, params);
  }
  return item.answer;
}

export function isWithinTolerance(value: number, expected: number, tolerance: number): boolean {
  const guard = 1e-9 * Math.max(1, Math.abs(expected));
  return Math.abs(value - expected) <= tolerance + guard;
}

export function gradeNumeric(
  item: NumericItemLike,
  input: string,
  params?: Readonly<Record<string, number>>,
): NumericResult {
  const tolerance = item.tolerance ?? 0;
  const expected = expectedAnswer(item, params);
  const parsed = parseNumber(input);
  if (!parsed.ok) {
    return { correct: false, expected, tolerance, message: parsed.message };
  }
  return {
    correct: isWithinTolerance(parsed.value, expected, tolerance),
    value: parsed.value,
    expected,
    tolerance,
    explanation: item.explanation,
  };
}
