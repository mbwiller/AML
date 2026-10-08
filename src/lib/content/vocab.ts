/**
 * Closed vocabularies shared by the content schemas and the browser
 * (docs/CONTENT_AUTHORING.md §5–§6). Kept free of Zod so that an island that
 * only needs the field list (the Atlas) does not bundle the schema library;
 * `schemas.ts` re-exports these, so importing from there still works.
 */

export const FIELDS = [
  'probability',
  'statistics',
  'linear-algebra',
  'calculus',
  'information-theory',
  'ml',
  'evaluation',
] as const;
export type Field = (typeof FIELDS)[number];

export const NODE_TYPES = ['concept', 'method', 'metric', 'prereq', 'dataset'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = ['requires', 'generalizes', 'contrasts', 'uses'] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];
