/**
 * Field and type vocabulary for the Atlas: display names and the Tailwind
 * token classes that color them (STYLE_GUIDE.md §4.1; tokens.css). Class
 * names are spelled out in full so Tailwind's scanner finds them.
 */
import { FIELDS, type Field } from '@/lib/content/vocab';

import type { AtlasEdgeType, AtlasNodeType } from '@/lib/graph/types';

export const FIELD_LABEL: Record<Field, string> = {
  probability: 'Probability',
  statistics: 'Statistics',
  'linear-algebra': 'Linear algebra',
  calculus: 'Calculus and optimization',
  'information-theory': 'Information theory',
  ml: 'ML methods',
  evaluation: 'Evaluation',
};

/** `fill-*` utilities, for SVG circles and legend swatches. */
export const FIELD_FILL: Record<Field, string> = {
  probability: 'fill-field-probability',
  statistics: 'fill-field-statistics',
  'linear-algebra': 'fill-field-linear-algebra',
  calculus: 'fill-field-calculus',
  'information-theory': 'fill-field-information',
  ml: 'fill-field-ml',
  evaluation: 'fill-field-evaluation',
};

/** `bg-*` utilities, for chip dots in HTML. */
export const FIELD_BG: Record<Field, string> = {
  probability: 'bg-field-probability',
  statistics: 'bg-field-statistics',
  'linear-algebra': 'bg-field-linear-algebra',
  calculus: 'bg-field-calculus',
  'information-theory': 'bg-field-information',
  ml: 'bg-field-ml',
  evaluation: 'bg-field-evaluation',
};

export const ALL_FIELDS: readonly Field[] = FIELDS;

export const TYPE_LABEL: Record<AtlasNodeType, string> = {
  concept: 'Concept',
  method: 'Method',
  metric: 'Metric',
  prereq: 'Glossary term',
  dataset: 'Dataset',
};

export const EDGE_LABEL: Record<AtlasEdgeType, string> = {
  requires: 'requires',
  generalizes: 'generalizes',
  contrasts: 'contrasts with',
  uses: 'uses',
};

export const EDGE_TYPES: readonly AtlasEdgeType[] = [
  'requires',
  'generalizes',
  'contrasts',
  'uses',
];
