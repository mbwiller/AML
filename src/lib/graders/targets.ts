/**
 * Where a wrong answer should send the learner (docs/CONTENT_AUTHORING.md §7).
 * Shared by `<Check>` (which picks the first target present on the page) and
 * the practice quiz (which resolves targets to lesson URLs at build time).
 */

export interface TargetableItem {
  type: string;
  concepts: readonly string[];
  explanation?: string | undefined;
  corrupt?: { explanation?: string | undefined } | undefined;
}

/**
 * Anchors, most specific first: `der-x-y-z-step-n` for a step cited in the
 * explanation ("der-7-1-4 step 10"), then that derivation; the item's own
 * target (`own`); the derivations that establish the item's `concepts`.
 */
export function derivationTargets(
  item: TargetableItem,
  nodeDerivation: ReadonlyMap<string, string>,
  own?: string,
): string[] {
  const out: string[] = [];
  const add = (t: string | undefined) => {
    if (t && !out.includes(t)) out.push(t);
  };
  if (own) add(own);
  const text = `${item.explanation ?? ''} ${item.type === 'which-step' ? (item.corrupt?.explanation ?? '') : ''}`;
  for (const m of text.matchAll(/\b(der-\d+-\d+-\d+)(?:\s+steps?\s+(\d+))?/g)) {
    if (m[2]) add(`${m[1]}-step-${m[2]}`);
    add(m[1]);
  }
  for (const c of item.concepts) add(nodeDerivation.get(c));
  return out;
}
