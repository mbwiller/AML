import { buildRequiresIndex, dependents, prerequisiteClosure, shortestPathToRoots } from './paths';
import type { AtlasEdge } from './types';

/**
 *   root1 ─┐
 *          ├─> mid ─> leaf
 *   root2 ─┘    │
 *   root1 ──────┘ (direct too)
 *   other -uses-> leaf (not a requires edge, must be ignored)
 */
const edges: Pick<AtlasEdge, 'from' | 'to' | 'type'>[] = [
  { from: 'root1', to: 'mid', type: 'requires' },
  { from: 'root2', to: 'mid', type: 'requires' },
  { from: 'mid', to: 'leaf', type: 'requires' },
  { from: 'root1', to: 'leaf', type: 'requires' },
  { from: 'other', to: 'leaf', type: 'uses' },
  { from: 'root1', to: 'mid', type: 'requires' },
];
const index = buildRequiresIndex(edges);

describe('buildRequiresIndex', () => {
  it('indexes only requires edges, without duplicates', () => {
    expect(index.prerequisites.get('mid')).toEqual(['root1', 'root2']);
    expect(index.prerequisites.get('leaf')).toEqual(['mid', 'root1']);
    expect(index.dependents.get('root1')).toEqual(['mid', 'leaf']);
    expect(index.prerequisites.has('other')).toBe(false);
    expect(index.dependents.has('other')).toBe(false);
  });
});

describe('prerequisiteClosure', () => {
  it('returns all transitive prerequisites, excluding the node itself', () => {
    expect([...prerequisiteClosure('leaf', index)].sort()).toEqual(['mid', 'root1', 'root2']);
    expect([...prerequisiteClosure('mid', index)].sort()).toEqual(['root1', 'root2']);
    expect(prerequisiteClosure('root1', index).size).toBe(0);
    expect(prerequisiteClosure('unknown', index).size).toBe(0);
  });
});

describe('dependents', () => {
  it('returns everything that transitively requires the node', () => {
    expect([...dependents('root2', index)].sort()).toEqual(['leaf', 'mid']);
    expect([...dependents('mid', index)]).toEqual(['leaf']);
    expect(dependents('leaf', index).size).toBe(0);
  });

  it('terminates on cycles', () => {
    const cyclic = buildRequiresIndex([
      { from: 'a', to: 'b', type: 'requires' },
      { from: 'b', to: 'a', type: 'requires' },
    ]);
    expect([...dependents('a', cyclic)].sort()).toEqual(['b']);
    expect([...prerequisiteClosure('a', cyclic)].sort()).toEqual(['b']);
  });
});

describe('shortestPathToRoots', () => {
  it('builds a BFS tree toward the roots with depths and the root list', () => {
    const { edges: tree, depth, roots } = shortestPathToRoots('leaf', index);
    expect(tree).toEqual([
      ['mid', 'leaf'],
      ['root1', 'leaf'],
      ['root2', 'mid'],
    ]);
    expect(Object.fromEntries(depth)).toEqual({ mid: 1, root1: 1, root2: 2 });
    expect(roots.sort()).toEqual(['root1', 'root2']);
  });

  it('is empty for a root', () => {
    const r = shortestPathToRoots('root1', index);
    expect(r.edges).toEqual([]);
    expect(r.depth.size).toBe(0);
    expect(r.roots).toEqual([]);
  });
});
