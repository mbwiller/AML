import { LAYOUT_DEFAULTS, layoutGraph, nodeRadius, seededRandom } from './layout';
import type { AtlasUnit } from './types';

const units: AtlasUnit[] = [
  { id: 'u1', title: 'One', order: 1 },
  { id: 'u2', title: 'Two', order: 2 },
  { id: 'u3', title: 'Three', order: 3 },
];

function sample(n: number) {
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `n${i}`,
    centrality: (i % 5) / 4,
    unit: units[i % 3]?.id,
  }));
  const edges = Array.from({ length: n - 1 }, (_, i) => ({
    from: `n${i}`,
    to: `n${i + 1}`,
    type: (i % 4 === 0 ? 'uses' : 'requires') as 'uses' | 'requires',
  }));
  return { nodes, edges };
}

describe('seededRandom', () => {
  it('is deterministic for a seed and in [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(40);
  });
});

describe('nodeRadius', () => {
  it('maps centrality in [0, 1] to 6–18 px', () => {
    expect(nodeRadius(0)).toBe(6);
    expect(nodeRadius(1)).toBe(18);
    expect(nodeRadius(2)).toBe(18);
    expect(nodeRadius(0.25)).toBe(12);
  });
});

describe('layoutGraph', () => {
  it('returns one position per node, inside a sane bounding box', () => {
    const { nodes, edges } = sample(40);
    const positions = layoutGraph(nodes, edges, units);
    expect(positions.map((p) => p.id)).toEqual(nodes.map((n) => n.id));
    for (const p of positions) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Math.abs(p.x - LAYOUT_DEFAULTS.width / 2)).toBeLessThan(LAYOUT_DEFAULTS.width);
      expect(Math.abs(p.y - LAYOUT_DEFAULTS.height / 2)).toBeLessThan(LAYOUT_DEFAULTS.height);
    }
  });

  it('is deterministic: same input, identical output', () => {
    const { nodes, edges } = sample(60);
    const a = layoutGraph(nodes, edges, units);
    const b = layoutGraph(nodes, edges, units);
    expect(a).toEqual(b);
  });

  it('changes with the seed', () => {
    const { nodes, edges } = sample(30);
    const a = layoutGraph(nodes, edges, units, { seed: 1 });
    const b = layoutGraph(nodes, edges, units, { seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('orders units left to right on average', () => {
    const { nodes, edges } = sample(90);
    const positions = new Map(layoutGraph(nodes, edges, units).map((p) => [p.id, p.x]));
    const meanX = (unit: string) => {
      const xs = nodes.filter((n) => n.unit === unit).map((n) => positions.get(n.id) ?? 0);
      return xs.reduce((s, x) => s + x, 0) / xs.length;
    };
    expect(meanX('u1')).toBeLessThan(meanX('u2'));
    expect(meanX('u2')).toBeLessThan(meanX('u3'));
  });

  it('ignores edges whose endpoints are missing', () => {
    const positions = layoutGraph(
      [{ id: 'a', centrality: 0 }],
      [{ from: 'a', to: 'ghost', type: 'requires' }],
      units,
    );
    expect(positions).toHaveLength(1);
  });
});
