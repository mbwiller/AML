import type { AtlasData } from './types';
import { decodeAtlas, encodeAtlas } from './wire';

const data: AtlasData = {
  units: [
    { id: 'u6-nb', title: 'Naive Bayes', order: 6 },
    { id: 'u7-gda', title: 'GDA', order: 7 },
  ],
  lessons: [
    {
      id: 'u6-nb/naive-bayes',
      unit: 'u6-nb',
      slug: 'naive-bayes',
      title: 'Naive Bayes',
      number: '6.3',
      href: '/units/u6-nb/naive-bayes',
    },
  ],
  nodes: [
    {
      id: 'nb-mle',
      label: 'Bernoulli NB MLE',
      type: 'method',
      field: 'ml',
      unit: 'u6-nb',
      lesson: 'naive-bayes',
      summary: 'Counts.',
      derivation: 'der-6-3-2',
      href: '/units/u6-nb/naive-bayes',
      inDegree: 1,
      outDegree: 0,
      centrality: 0.5,
      teaches: ['u6-nb/naive-bayes'],
      requiredBy: [],
      x: 10.5,
      y: -3,
    },
    {
      id: 'bayes-rule',
      label: 'Bayes rule',
      type: 'prereq',
      field: 'probability',
      href: '/glossary#bayes-rule',
      inDegree: 0,
      outDegree: 1,
      centrality: 0.5,
      teaches: [],
      requiredBy: ['u6-nb/naive-bayes'],
      x: 0,
      y: 0,
    },
  ],
  edges: [
    { from: 'bayes-rule', to: 'nb-mle', type: 'requires', derived: true },
    { from: 'nb-mle', to: 'bayes-rule', type: 'contrasts', derived: false },
  ],
  warnings: [],
};

describe('wire format', () => {
  it('round-trips an AtlasData exactly (warnings excepted)', () => {
    const wire = encodeAtlas(data);
    expect(wire.v).toBe(1);
    expect(decodeAtlas(wire)).toEqual({ ...data, warnings: [] });
  });

  it('encodes nodes as positional tuples and edges as index tuples', () => {
    const wire = encodeAtlas(data);
    expect(wire.nodes[1]).toEqual([
      'bayes-rule',
      'Bayes rule',
      3, // prereq
      0, // probability
      -1,
      '',
      '',
      '',
      0,
      1,
      0.5,
      [],
      [0],
      0,
      0,
    ]);
    expect(wire.edges).toEqual([
      [1, 0, 0, 1],
      [0, 1, 2, 0],
    ]);
  });

  it('is far smaller than the plain JSON', () => {
    const plain = JSON.stringify(data).length;
    const compact = JSON.stringify(encodeAtlas(data)).length;
    expect(compact).toBeLessThan(plain * 0.7);
  });

  it('drops dangling references instead of throwing', () => {
    const wire = encodeAtlas({
      ...data,
      edges: [...data.edges, { from: 'ghost', to: 'nb-mle', type: 'uses', derived: false }],
      nodes: data.nodes.map((n) => ({ ...n, teaches: [...n.teaches, 'u9/nope'] })),
    });
    expect(wire.edges).toHaveLength(2);
    const decoded = decodeAtlas({ ...wire, edges: [...wire.edges, [0, 99, 0, 0]] });
    expect(decoded.edges).toHaveLength(2);
    expect(decoded.nodes[0]?.teaches).toEqual(['u6-nb/naive-bayes']);
  });
});
