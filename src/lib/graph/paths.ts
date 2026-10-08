/**
 * Prerequisite-path queries over the `requires` relation (VISION.md §7 "Atlas":
 * "its prerequisites highlighted as a path back to the roots").
 *
 * All functions are pure and work on a precomputed `RequiresIndex` so the
 * island can rebuild it once from the serialized edge list.
 */
import type { AtlasEdge } from './types';

export interface RequiresIndex {
  /** node → nodes it requires (edge `from` for every `requires` edge whose `to` is the node). */
  prerequisites: Map<string, string[]>;
  /** node → nodes that require it (edge `to` for every `requires` edge whose `from` is the node). */
  dependents: Map<string, string[]>;
}

export function buildRequiresIndex(
  edges: Pick<AtlasEdge, 'from' | 'to' | 'type'>[],
): RequiresIndex {
  const prerequisites = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key);
    if (list) {
      if (!list.includes(value)) list.push(value);
    } else map.set(key, [value]);
  };
  for (const e of edges) {
    if (e.type !== 'requires') continue;
    push(prerequisites, e.to, e.from);
    push(dependents, e.from, e.to);
  }
  return { prerequisites, dependents };
}

function reach(start: string, next: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const n of next.get(current) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  seen.delete(start);
  return seen;
}

/** Every ancestor of `nodeId` over `requires` (transitive prerequisites), excluding itself. */
export function prerequisiteClosure(nodeId: string, index: RequiresIndex): Set<string> {
  return reach(nodeId, index.prerequisites);
}

/** Every descendant of `nodeId` over `requires` (everything that transitively requires it). */
export function dependents(nodeId: string, index: RequiresIndex): Set<string> {
  return reach(nodeId, index.dependents);
}

/**
 * Breadth-first search from `nodeId` toward the roots (nodes with no
 * prerequisites). Returns, for every reachable ancestor, the edge on the
 * shortest path from `nodeId` to it, as `[from, to]` pairs in `requires`
 * direction (prerequisite → dependent). Concatenated, these edges form a tree
 * rooted at `nodeId` that the island draws as the highlighted prerequisite path.
 */
export function shortestPathToRoots(
  nodeId: string,
  index: RequiresIndex,
): { edges: [string, string][]; depth: Map<string, number>; roots: string[] } {
  const depth = new Map<string, number>([[nodeId, 0]]);
  const edges: [string, string][] = [];
  const roots: string[] = [];
  const queue = [nodeId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++] as string;
    const d = depth.get(current) ?? 0;
    const prereqs = index.prerequisites.get(current) ?? [];
    if (prereqs.length === 0 && current !== nodeId) roots.push(current);
    for (const p of prereqs) {
      if (!depth.has(p)) {
        depth.set(p, d + 1);
        edges.push([p, current]);
        queue.push(p);
      }
    }
  }
  depth.delete(nodeId);
  return { edges, depth, roots };
}
