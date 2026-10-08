/**
 * The MDX component names in the contract (docs/CONTENT_AUTHORING.md §4).
 * Plain TS so scripts/validate-content.ts can import it without Astro.
 * `Sticky` is produced by the remark plugin from `[[term]]`, never written by hand.
 */
export const mdxComponentNames = [
  'Frame',
  'Objectives',
  'Hook',
  'Definition',
  'Theorem',
  'Proposition',
  'Lemma',
  'Intuition',
  'Derivation',
  'Chunk',
  'Step',
  'Proof',
  'EqRef',
  'Callout',
  'SlideRef',
  'Widget',
  'Figure',
  'Example',
  'Check',
  'Pitfall',
  'Connections',
  'Notebook',
  'HomeworkBridge',
  'Summary',
  'Sticky',
] as const;

export type MdxComponentName = (typeof mdxComponentNames)[number];
