/**
 * Build-time Atlas data for pages (Astro-dependent; the logic is in build.ts,
 * layout.ts, and paths.ts). Computed once per build and cached, so `/atlas`
 * and any future miniature on the home page share the same positions.
 */
import { getCollection } from 'astro:content';

import { isNavigable } from '@/lib/lessons';

import { buildGraph } from './build';
import { layoutGraph } from './layout';
import type { AtlasData } from './types';

let cache: Promise<AtlasData> | undefined;

export function getAtlasData(): Promise<AtlasData> {
  cache ??= compute();
  return cache;
}

async function compute(): Promise<AtlasData> {
  const [units, lessons, glossary, nodes, edges] = await Promise.all([
    getCollection('units'),
    getCollection('lessons'),
    getCollection('glossary'),
    getCollection('graphNodes'),
    getCollection('graphEdges'),
  ]);

  const graph = buildGraph({
    nodes: nodes.map((n) => n.data),
    glossary: glossary.map((g) => g.data),
    edges: edges.map((e) => e.data),
    lessons: lessons.map((l) => l.data),
    units: units.map((u) => u.data),
  });
  for (const w of graph.warnings) console.warn(`[atlas] ${w}`);

  // Draft lessons are hidden from navigation in production (src/lib/lessons.ts),
  // so drop their links; their derived edges stay because the graph's structure
  // does not depend on publication status.
  const navigable = new Set(
    lessons
      .filter((l) => isNavigable(l.data, import.meta.env.DEV))
      .map((l) => `${l.data.unit}/${l.data.slug}`),
  );
  const keep = (ids: string[]) => ids.filter((id) => navigable.has(id));

  const positions = new Map(
    layoutGraph(graph.nodes, graph.edges, graph.units).map((p) => [p.id, p]),
  );

  return {
    ...graph,
    lessons: graph.lessons.filter((l) => navigable.has(l.id)),
    nodes: graph.nodes.map((n) => {
      const p = positions.get(n.id);
      return {
        ...n,
        teaches: keep(n.teaches),
        requiredBy: keep(n.requiredBy),
        x: p?.x ?? 0,
        y: p?.y ?? 0,
      };
    }),
  };
}
