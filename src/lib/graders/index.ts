/**
 * Grader dispatch (VISION.md §9.5). One entry point for the `<Check>`
 * controller today and the practice engine later. Item shapes are structural
 * so the bank entry and the trimmed `data-item` client copy both fit. Types
 * without a grader yet return `{ supported: false }`.
 */
import { gradeMc, type McItemLike } from './mc';
import { gradeNumeric, type NumericItemLike } from './numeric';
import { gradeWhichStep, type WhichStepItemLike } from './which-step';

export { evaluateFormula, FormulaError, formulaNames } from './formula';
export { gradeMc } from './mc';
export type { McItemLike, McOptionLike, McResult } from './mc';
export {
  expectedAnswer,
  gradeNumeric,
  isWithinTolerance,
  NUMERIC_FORMAT_HINT,
  parseNumber,
} from './numeric';
export type { NumericItemLike, NumericResult, ParsedNumber } from './numeric';
export { hashSeed, mulberry32, sampleSeededParams } from './seeded';
export type { SeededInstance, SeededItemLike } from './seeded';
export { buildWhichStep, extractDerivationSteps, gradeWhichStep } from './which-step';
export type {
  WhichStepBuild,
  WhichStepBuildable,
  WhichStepItemLike,
  WhichStepResult,
  WhichStepStep,
} from './which-step';

export type GradableItem =
  | ({ type: 'mc' } & McItemLike)
  | ({ type: 'numeric' } & NumericItemLike)
  | ({ type: 'which-step' } & WhichStepItemLike)
  | { type: 'match' | 'order' | 'predict' | 'estimate' | 'code-trace' };

/** A chosen option index (mc, which-step) or the raw text typed (numeric). */
export type GradeAnswer = number | string;

export interface GradeContext {
  /** Seeded parameter values for this numeric instance (from `sampleSeededParams`). */
  params?: Readonly<Record<string, number>> | undefined;
}

export interface Graded {
  supported: true;
  correct: boolean;
  explanation?: string | undefined;
  /** mc: the chosen distractor's misconception id. */
  misconception?: string | undefined;
  /** Why no verdict could be given (empty choice, unreadable number). */
  message?: string | undefined;
  /** mc, which-step: 0-based index of the right option. */
  correctIndex?: number | undefined;
}

export type GradeResult = Graded | { supported: false; reason: string };

export function grade(
  item: GradableItem,
  answer: GradeAnswer,
  ctx: GradeContext = {},
): GradeResult {
  switch (item.type) {
    case 'mc': {
      if (typeof answer !== 'number') {
        return { supported: true, correct: false, message: 'Choose an option first.' };
      }
      return { supported: true, ...gradeMc(item, answer) };
    }
    case 'numeric': {
      const r = gradeNumeric(item, String(answer), ctx.params);
      return {
        supported: true,
        correct: r.correct,
        explanation: r.explanation,
        message: r.message,
      };
    }
    case 'which-step': {
      if (typeof answer !== 'number') {
        return { supported: true, correct: false, message: 'Choose a step first.' };
      }
      return { supported: true, ...gradeWhichStep(item, answer) };
    }
    default:
      return { supported: false, reason: `no grader for "${item.type}" yet` };
  }
}
