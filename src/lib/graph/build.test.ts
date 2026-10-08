import type { GlossaryTerm, GraphEdge, GraphNode, Lesson, Unit } from '@/lib/content/schemas';

import { buildGraph, edgeKey } from './build';

const units: Unit[] = [
  { id: 'u6-nb', title: 'Naive Bayes', order: 6, summary: 's', lectures: 'L9' },
  { id: 'u7-gda', title: 'GDA', order: 7, summary: 's', lectures: 'L10' },
];

const node = (id: string, extra: Partial<GraphNode> = {}): GraphNode => ({
  id,
  label: id.replace(/-/g, ' '),
  type: 'concept',
  field: 'ml',
  unit: 'u6-nb',
  ...extra,
});

const term = (id: string, extra: Partial<GlossaryTerm> = {}): GlossaryTerm => ({
  id,
  term: id,
  aliases: [],
  field: 'probability',
  related: [],
  ...extra,
});

const lesson = (slug: string, extra: Partial<Lesson> = {}): Lesson => ({
  title: slug,
  unit: 'u6-nb',
  order: 1,
  slug,
  summary: 's',
  lectures: [],
  concepts: [],
  prerequisites: [],
  homework: [],
  cases: [],
  estimatedMinutes: 10,
  status: 'review',
  authors: [],
  ...extra,
});

describe('buildGraph', () => {
  it('merges nodes.yaml nodes with glossary terms as prereq nodes', () => {
    const g = buildGraph({
      nodes: [node('nb', { lesson: 'naive-bayes', summary: 'S' })],
      glossary: [term('bayes-rule', { firstUsedIn: 'u6-nb' })],
      edges: [],
      lessons: [],
      units,
    });
    expect(g.nodes.map((n) => n.id)).toEqual(['nb', 'bayes-rule']);
    const prereq = g.nodes[1];
    expect(prereq).toMatchObject({
      type: 'prereq',
      field: 'probability',
      unit: 'u6-nb',
      href: '/glossary#bayes-rule',
      label: 'bayes-rule',
    });
    expect(g.nodes[0]).toMatchObject({ href: '/units/u6-nb/naive-bayes', summary: 'S' });
    expect(g.warnings).toEqual([]);
  });

  it('derives requires edges from each lesson: prerequisites × concepts', () => {
    const g = buildGraph({
      nodes: [node('a'), node('b')],
      glossary: [term('p'), term('q')],
      edges: [],
      lessons: [lesson('l1', { concepts: ['a', 'b'], prerequisites: ['p', 'q'] })],
      units,
    });
    const keys = g.edges.map(edgeKey).sort();
    expect(keys).toEqual(['p--requires--a', 'p--requires--b', 'q--requires--a', 'q--requires--b']);
    expect(g.edges.every((e) => e.derived)).toBe(true);
  });

  it('dedupes derived edges against curated ones (curated wins) and drops self-edges', () => {
    const curated: GraphEdge[] = [
      { from: 'p', to: 'a', type: 'requires' },
      { from: 'a', to: 'a', type: 'uses' },
    ];
    const g = buildGraph({
      nodes: [node('a')],
      glossary: [term('p')],
      edges: curated,
      lessons: [lesson('l1', { concepts: ['a'], prerequisites: ['p', 'a'] })],
      units,
    });
    expect(g.edges).toEqual([{ from: 'p', to: 'a', type: 'requires', derived: false }]);
    expect(g.warnings).toEqual(['edges.yaml: self-edge on "a" dropped']);
  });

  it('drops edges with missing endpoints and reports them as warnings', () => {
    const g = buildGraph({
      nodes: [node('a')],
      glossary: [],
      edges: [{ from: 'ghost', to: 'a', type: 'generalizes' }],
      lessons: [lesson('l1', { concepts: ['a'], prerequisites: ['phantom'] })],
      units,
    });
    expect(g.edges).toEqual([]);
    expect(g.warnings).toEqual([
      'edges.yaml: edge ghost → a (generalizes) dropped; unknown "ghost"',
      'lesson u6-nb/l1: edge phantom → a (requires) dropped; unknown "phantom"',
      'lesson u6-nb/l1: prerequisite "phantom" is not a graph node',
    ]);
  });

  it('computes degrees and degree centrality normalized to the maximum', () => {
    const g = buildGraph({
      nodes: [node('a'), node('b'), node('c')],
      glossary: [],
      edges: [
        { from: 'a', to: 'b', type: 'requires' },
        { from: 'a', to: 'c', type: 'uses' },
        { from: 'b', to: 'c', type: 'contrasts' },
      ],
      lessons: [],
      units,
    });
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    expect(byId.get('a')).toMatchObject({ inDegree: 0, outDegree: 2, centrality: 1 });
    expect(byId.get('b')).toMatchObject({ inDegree: 1, outDegree: 1, centrality: 1 });
    expect(byId.get('c')).toMatchObject({ inDegree: 2, outDegree: 0, centrality: 1 });
  });

  it('attaches lessons that teach and require each node, in course order', () => {
    const g = buildGraph({
      nodes: [node('a', { unit: 'u7-gda' }), node('b')],
      glossary: [term('p')],
      edges: [],
      lessons: [
        lesson('later', { unit: 'u7-gda', order: 1, concepts: ['a'], prerequisites: ['b', 'p'] }),
        lesson('first', { unit: 'u6-nb', order: 2, concepts: ['b'], prerequisites: ['p'] }),
      ],
      units,
    });
    expect(g.lessons.map((l) => l.id)).toEqual(['u6-nb/first', 'u7-gda/later']);
    expect(g.lessons[0]).toMatchObject({ number: '6.2', href: '/units/u6-nb/first' });
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    expect(byId.get('p')?.requiredBy).toEqual(['u6-nb/first', 'u7-gda/later']);
    expect(byId.get('b')).toMatchObject({ teaches: ['u6-nb/first'], requiredBy: ['u7-gda/later'] });
    expect(g.units.map((u) => u.id)).toEqual(['u6-nb', 'u7-gda']);
  });

  it('keeps the first of duplicate ids and warns', () => {
    const g = buildGraph({
      nodes: [node('a', { label: 'first' }), node('a', { label: 'second' })],
      glossary: [term('a')],
      edges: [],
      lessons: [],
      units,
    });
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0]?.label).toBe('first');
    expect(g.warnings).toHaveLength(2);
  });
});
