/**
 * "Which step is wrong" items (VISION.md §9.5): the derivation's steps are
 * shown with one replaced by `corrupt.replaceTex`; the learner picks the
 * changed step. `buildWhichStep` produces the list, `gradeWhichStep` checks
 * the pick, and `extractDerivationSteps` pulls the step TeX out of a lesson
 * body at build time with the mdx-scan helpers.
 */
import { findBlocks } from '@/lib/content/mdx-scan';

/** Grading needs only `corrupt.step`; the client copy omits the TeX and the explanation. */
export interface WhichStepItemLike {
  corrupt: { step: number; replaceTex?: string | undefined; explanation?: string | undefined };
}

/** Building the list needs the replacement TeX as well. */
export interface WhichStepBuildable {
  corrupt: { step: number; replaceTex: string };
}

export interface WhichStepStep {
  /** 1-based step number as it appears in the derivation. */
  number: number;
  tex: string;
  corrupted: boolean;
}

export interface WhichStepBuild {
  steps: WhichStepStep[];
  /** 0-based index of the corrupted step. */
  correctIndex: number;
}

/**
 * The step list with the corruption applied, or null when `corrupt.step` is
 * outside the derivation (the item is then rendered as unsupported).
 */
export function buildWhichStep(
  item: WhichStepBuildable,
  derivationSteps: readonly string[],
): WhichStepBuild | null {
  const target = item.corrupt.step;
  if (!Number.isInteger(target) || target < 1 || target > derivationSteps.length) return null;
  return {
    steps: derivationSteps.map((tex, i) => ({
      number: i + 1,
      tex: i + 1 === target ? item.corrupt.replaceTex : tex,
      corrupted: i + 1 === target,
    })),
    correctIndex: target - 1,
  };
}

export interface WhichStepResult {
  correct: boolean;
  /** 0-based index of the corrupted step. */
  correctIndex: number;
  explanation?: string | undefined;
}

export function gradeWhichStep(item: WhichStepItemLike, chosenIndex: number): WhichStepResult {
  const correctIndex = item.corrupt.step - 1;
  return {
    correct: chosenIndex === correctIndex,
    correctIndex,
    explanation: item.corrupt.explanation,
  };
}

/** Strip the `$$` or `$` fences and surrounding whitespace from a step body. */
function stepTex(inner: string): string {
  const text = inner.trim();
  const display = /^\$\$([\s\S]*?)\$\$$/.exec(text);
  if (display?.[1] !== undefined) return display[1].trim();
  const inline = /^\$([\s\S]*?)\$$/.exec(text);
  if (inline?.[1] !== undefined) return inline[1].trim();
  return text;
}

/**
 * The TeX of each `<Step>` inside `<Derivation id="derivationId">` of an MDX
 * body, in order; undefined when the derivation is not in the body.
 */
export function extractDerivationSteps(body: string, derivationId: string): string[] | undefined {
  const derivation = findBlocks(body, 'Derivation').find((d) => d.attrs['id'] === derivationId);
  if (!derivation) return undefined;
  return findBlocks(derivation.inner, 'Step').map((s) => stepTex(s.inner));
}
