/**
 * The Atlas data contract (VISION.md §9.4; docs/CONTENT_AUTHORING.md §6).
 *
 * `AtlasGraph` is what `buildGraph` returns and what the `/atlas` page passes
 * to the island after `layoutGraph` has attached positions. Everything here is
 * plain JSON so that Astro can serialize it into the island's props.
 */
import type { Field } from '@/lib/content/vocab';

export type AtlasNodeType = 'concept' | 'method' | 'metric' | 'prereq' | 'dataset';
export type AtlasEdgeType = 'requires' | 'generalizes' | 'contrasts' | 'uses';

export interface AtlasLesson {
  /** `<unit>/<slug>` */
  id: string;
  unit: string;
  slug: string;
  title: string;
  /** "6.3" */
  number: string;
  /** `/units/<unit>/<slug>` */
  href: string;
}

export interface AtlasUnit {
  id: string;
  title: string;
  order: number;
}

export interface AtlasNode {
  id: string;
  label: string;
  type: AtlasNodeType;
  field: Field;
  /** Unit id; for glossary terms, `firstUsedIn` when set. */
  unit?: string;
  /** Lesson slug that teaches this node (from nodes.yaml). */
  lesson?: string;
  summary?: string;
  derivation?: string;
  /** Where a click-through goes: the lesson for concepts, `/glossary#<id>` for terms. */
  href?: string;
  /** In-degree and out-degree over every edge type. */
  inDegree: number;
  outDegree: number;
  /**
   * Centrality in [0, 1]: total degree over every edge type divided by the
   * largest total degree in the graph. Degree, not PageRank, because the
   * graph is small (≈100–300 nodes), the derived `requires` edges already
   * make foundational terms high-degree, and degree is explainable to a
   * learner ("this node touches 14 others"). Revisit when mastery lands.
   */
  centrality: number;
  /** Lesson ids whose `concepts` include this node. */
  teaches: string[];
  /** Lesson ids whose `prerequisites` include this node. */
  requiredBy: string[];
}

export interface AtlasEdge {
  from: string;
  to: string;
  type: AtlasEdgeType;
  /** True when derived from lesson frontmatter (prerequisites → concepts); false for edges.yaml. */
  derived: boolean;
}

export interface AtlasPosition {
  id: string;
  x: number;
  y: number;
}

export interface AtlasGraph {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  lessons: AtlasLesson[];
  units: AtlasUnit[];
  warnings: string[];
}

/** `AtlasGraph` with a position on every node: the island's `data` prop. */
export interface AtlasData extends Omit<AtlasGraph, 'nodes'> {
  nodes: (AtlasNode & { x: number; y: number })[];
}
