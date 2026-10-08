/**
 * Multiple-choice grader (VISION.md §9.5). Pure; works on the bank item or on
 * the trimmed client copy, since only `options[].correct`,
 * `options[].misconception`, and the explanations are read.
 */

export interface McOptionLike {
  correct?: boolean | undefined;
  misconception?: string | undefined;
  explanation?: string | undefined;
}

export interface McItemLike {
  options: readonly McOptionLike[];
  explanation?: string | undefined;
}

export interface McResult {
  correct: boolean;
  /** The chosen distractor's misconception id, when it has one. */
  misconception?: string | undefined;
  /** The chosen option's own explanation, else the item's. */
  explanation?: string | undefined;
  /** 0-based index of the correct option (-1 if the item has none). */
  correctIndex: number;
}

export function gradeMc(item: McItemLike, chosenIndex: number): McResult {
  const correctIndex = item.options.findIndex((o) => o.correct === true);
  const chosen = Number.isInteger(chosenIndex) ? item.options[chosenIndex] : undefined;
  const correct = chosen !== undefined && chosenIndex === correctIndex;
  return {
    correct,
    misconception: correct ? undefined : chosen?.misconception,
    explanation: chosen?.explanation ?? item.explanation,
    correctIndex,
  };
}
