/**
 * Compact wire format for the Atlas island props.
 *
 * Astro serializes island props as JSON in an HTML attribute, so verbose
 * objects and repeated lesson ids add up fast (≈170 KB for 100 nodes). Here
 * nodes are positional tuples, edges reference node indices, and lesson
 * references are indices into the lesson table: ≈35 KB for the same graph and
 * well under 150 KB at 300 nodes. `decodeAtlas(encodeAtlas(d))` equals `d`.
 */
import { EDGE_TYPES, FIELDS, NODE_TYPES, type Field } from '@/lib/content/vocab';
import { lessonHref } from '@/lib/lessons';

import type {
  AtlasData,
  AtlasEdge,
  AtlasEdgeType,
  AtlasLesson,
  AtlasNodeType,
  AtlasUnit,
} from './types';

/**
 * [id, label, typeIndex, fieldIndex, unitIndex (−1 none), summary ('' none),
 *  lesson ('' none), derivation ('' none), inDegree, outDegree, centrality,
 *  teaches (lesson indices), requiredBy (lesson indices), x, y]
 *
 * `href` is not sent: it is `/glossary#<id>` for a term and the lesson page
 * for a node with a unit and lesson, exactly as build.ts derives it.
 */
export type WireNode = [
  string,
  string,
  number,
  number,
  number,
  string,
  string,
  string,
  number,
  number,
  number,
  number[],
  number[],
  number,
  number,
];

/** [fromIndex, toIndex, edgeTypeIndex, derived (0 | 1)] */
export type WireEdge = [number, number, number, 0 | 1];

export interface AtlasWire {
  v: 1;
  units: AtlasUnit[];
  lessons: AtlasLesson[];
  nodes: WireNode[];
  edges: WireEdge[];
}

export function encodeAtlas(data: AtlasData): AtlasWire {
  const unitIndex = new Map(data.units.map((u, i) => [u.id, i]));
  const lessonIndex = new Map(data.lessons.map((l, i) => [l.id, i]));
  const nodeIndex = new Map(data.nodes.map((n, i) => [n.id, i]));
  const lessonRefs = (ids: string[]) =>
    ids.map((id) => lessonIndex.get(id)).filter((i): i is number => i !== undefined);

  const nodes: WireNode[] = data.nodes.map((n) => [
    n.id,
    n.label,
    NODE_TYPES.indexOf(n.type),
    FIELDS.indexOf(n.field),
    n.unit === undefined ? -1 : (unitIndex.get(n.unit) ?? -1),
    n.summary ?? '',
    n.lesson ?? '',
    n.derivation ?? '',
    n.inDegree,
    n.outDegree,
    Math.round(n.centrality * 1000) / 1000,
    lessonRefs(n.teaches),
    lessonRefs(n.requiredBy),
    n.x,
    n.y,
  ]);
  const edges: WireEdge[] = [];
  for (const e of data.edges) {
    const from = nodeIndex.get(e.from);
    const to = nodeIndex.get(e.to);
    if (from === undefined || to === undefined) continue;
    edges.push([from, to, EDGE_TYPES.indexOf(e.type), e.derived ? 1 : 0]);
  }
  return { v: 1, units: data.units, lessons: data.lessons, nodes, edges };
}

export function decodeAtlas(wire: AtlasWire): AtlasData {
  const lessonId = (i: number) => wire.lessons[i]?.id ?? '';
  const nodes: AtlasData['nodes'] = wire.nodes.map((w) => {
    const [
      id,
      label,
      type,
      field,
      unit,
      summary,
      lesson,
      derivation,
      inDegree,
      outDegree,
      centrality,
      teaches,
      requiredBy,
      x,
      y,
    ] = w;
    const unitId = wire.units[unit]?.id;
    const href =
      NODE_TYPES[type] === 'prereq'
        ? `/glossary#${id}`
        : unitId !== undefined && lesson !== ''
          ? lessonHref(unitId, lesson)
          : '';
    return {
      id,
      label,
      type: (NODE_TYPES[type] ?? 'concept') as AtlasNodeType,
      field: (FIELDS[field] ?? 'ml') as Field,
      ...(unitId !== undefined && { unit: unitId }),
      ...(summary !== '' && { summary }),
      ...(href !== '' && { href }),
      ...(lesson !== '' && { lesson }),
      ...(derivation !== '' && { derivation }),
      inDegree,
      outDegree,
      centrality,
      teaches: teaches.map(lessonId).filter((l) => l !== ''),
      requiredBy: requiredBy.map(lessonId).filter((l) => l !== ''),
      x,
      y,
    };
  });
  const edges: AtlasEdge[] = [];
  for (const [from, to, type, derived] of wire.edges) {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b) continue;
    edges.push({
      from: a.id,
      to: b.id,
      type: (EDGE_TYPES[type] ?? 'requires') as AtlasEdgeType,
      derived: derived === 1,
    });
  }
  return { nodes, edges, lessons: wire.lessons, units: wire.units, warnings: [] };
}
