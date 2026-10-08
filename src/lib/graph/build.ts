/**
 * Concept-graph builder (VISION.md §9.4): pure, framework-free, unit-tested.
 *
 * Merges `nodes.yaml` with the glossary (every term is a node of type
 * `prereq`, VISION §9.2), `edges.yaml` with the `requires` edges derived from
 * lesson frontmatter (each `prerequisites` entry → each `concepts` entry,
 * mirroring `validateContent` in src/lib/content/validate.ts), dedupes, drops
 * edges whose endpoints are missing (reported as warnings), and attaches
 * degrees, centrality, and lesson references. Positions are added separately
 * by `layoutGraph` so this module never depends on d3.
 */
import {
  lessonId,
  type GlossaryTerm,
  type GraphEdge,
  type GraphNode,
  type Lesson,
  type Unit,
} from '@/lib/content/schemas';
import { lessonHref, lessonNumber } from '@/lib/lessons';

import type { AtlasEdge, AtlasGraph, AtlasLesson, AtlasNode, AtlasUnit } from './types';

export interface BuildGraphInput {
  nodes: GraphNode[];
  glossary: GlossaryTerm[];
  edges: GraphEdge[];
  lessons: Lesson[];
  units: Unit[];
}

export function edgeKey(edge: Pick<AtlasEdge, 'from' | 'to' | 'type'>): string {
  return `${edge.from}--${edge.type}--${edge.to}`;
}

export function buildGraph(input: BuildGraphInput): AtlasGraph {
  const warnings: string[] = [];

  // ---- nodes: nodes.yaml first, then glossary terms not already listed ----
  const byId = new Map<string, AtlasNode>();
  for (const n of input.nodes) {
    if (byId.has(n.id)) {
      warnings.push(`duplicate node "${n.id}" in nodes.yaml; keeping the first`);
      continue;
    }
    byId.set(n.id, {
      id: n.id,
      label: n.label,
      type: n.type,
      field: n.field,
      unit: n.unit,
      ...(n.lesson !== undefined && { lesson: n.lesson }),
      ...(n.summary !== undefined && { summary: n.summary }),
      ...(n.derivation !== undefined && { derivation: n.derivation }),
      ...(n.lesson !== undefined && { href: lessonHref(n.unit, n.lesson) }),
      inDegree: 0,
      outDegree: 0,
      centrality: 0,
      teaches: [],
      requiredBy: [],
    });
  }
  for (const g of input.glossary) {
    if (byId.has(g.id)) {
      warnings.push(`glossary term "${g.id}" is also a node in nodes.yaml; keeping the node`);
      continue;
    }
    byId.set(g.id, {
      id: g.id,
      label: g.term,
      type: 'prereq',
      field: g.field,
      ...(g.firstUsedIn !== undefined && { unit: g.firstUsedIn }),
      href: `/glossary#${g.id}`,
      inDegree: 0,
      outDegree: 0,
      centrality: 0,
      teaches: [],
      requiredBy: [],
    });
  }

  // ---- edges: curated first (they win on dedupe), then derived `requires` ----
  const edgesByKey = new Map<string, AtlasEdge>();
  const addEdge = (edge: AtlasEdge, source: string) => {
    if (edge.from === edge.to) {
      warnings.push(`${source}: self-edge on "${edge.from}" dropped`);
      return;
    }
    const missing = [edge.from, edge.to].filter((id) => !byId.has(id));
    if (missing.length > 0) {
      warnings.push(
        `${source}: edge ${edge.from} → ${edge.to} (${edge.type}) dropped; unknown ${missing.map((m) => `"${m}"`).join(', ')}`,
      );
      return;
    }
    const key = edgeKey(edge);
    if (!edgesByKey.has(key)) edgesByKey.set(key, edge);
  };
  for (const e of input.edges) addEdge({ ...e, derived: false }, 'edges.yaml');
  for (const l of input.lessons) {
    const source = `lesson ${lessonId(l)}`;
    for (const p of l.prerequisites)
      for (const c of l.concepts) {
        if (p === c) continue;
        addEdge({ from: p, to: c, type: 'requires', derived: true }, source);
      }
  }
  const edges = [...edgesByKey.values()];

  // ---- degrees and centrality (total degree, normalized; see types.ts) ----
  for (const e of edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (from) from.outDegree += 1;
    if (to) to.inDegree += 1;
  }
  let maxDegree = 0;
  for (const n of byId.values()) maxDegree = Math.max(maxDegree, n.inDegree + n.outDegree);
  for (const n of byId.values())
    n.centrality = maxDegree === 0 ? 0 : (n.inDegree + n.outDegree) / maxDegree;

  // ---- lessons: who teaches and who requires each node ----
  const unitOrder = new Map(input.units.map((u) => [u.id, u.order]));
  const lessons: AtlasLesson[] = [...input.lessons]
    .sort((a, b) => {
      const ua = unitOrder.get(a.unit) ?? Number.MAX_SAFE_INTEGER;
      const ub = unitOrder.get(b.unit) ?? Number.MAX_SAFE_INTEGER;
      return ua - ub || a.order - b.order;
    })
    .map((l) => ({
      id: lessonId(l),
      unit: l.unit,
      slug: l.slug,
      title: l.title,
      number: lessonNumber(l.unit, l.order),
      href: lessonHref(l.unit, l.slug),
    }));
  for (const l of input.lessons) {
    const id = lessonId(l);
    for (const c of l.concepts) {
      const node = byId.get(c);
      if (node) node.teaches.push(id);
      else warnings.push(`lesson ${id}: concept "${c}" is not a graph node`);
    }
    for (const p of l.prerequisites) {
      const node = byId.get(p);
      if (node) node.requiredBy.push(id);
      else warnings.push(`lesson ${id}: prerequisite "${p}" is not a graph node`);
    }
  }
  const lessonIndex = new Map(lessons.map((l, i) => [l.id, i]));
  const byCourseOrder = (a: string, b: string) =>
    (lessonIndex.get(a) ?? 0) - (lessonIndex.get(b) ?? 0);
  for (const n of byId.values()) {
    n.teaches.sort(byCourseOrder);
    n.requiredBy.sort(byCourseOrder);
  }

  const units: AtlasUnit[] = [...input.units]
    .sort((a, b) => a.order - b.order)
    .map((u) => ({ id: u.id, title: u.title, order: u.order }));

  return {
    nodes: [...byId.values()],
    edges,
    lessons,
    units,
    warnings,
  };
}
