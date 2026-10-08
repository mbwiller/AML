/**
 * Deterministic force layout for the Atlas (VISION.md §11.1: "layout
 * precomputed at build time with a fixed seed").
 *
 * Runs d3-force synchronously for a fixed number of ticks with a seeded random
 * source, so the same graph always yields the same positions: the page shows a
 * settled graph on first paint and Playwright screenshots are stable.
 *
 * Forces: link (shorter for `requires`), many-body repulsion, collision by
 * node radius, centering, and a weak x-force that orders nodes by unit so
 * earlier units sit to the left and later ones to the right.
 */
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

import { nodeRadius } from './radius';
import type { AtlasEdge, AtlasPosition, AtlasUnit } from './types';

export interface LayoutOptions {
  seed?: number;
  ticks?: number;
  width?: number;
  height?: number;
}

export const LAYOUT_DEFAULTS = {
  seed: 5785,
  ticks: 300,
  width: 1600,
  height: 1000,
} as const;

export { nodeRadius };

/** mulberry32: a small, fast, seedable PRNG returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
  /** 0..1 position of the node's unit in course order, or 0.5 when unknown. */
  unitFraction: number;
}

type SimLink = SimulationLinkDatum<SimNode> & { type: AtlasEdge['type']; derived: boolean };

export interface LayoutNode {
  id: string;
  centrality: number;
  unit?: string | undefined;
}

export function layoutGraph(
  nodes: LayoutNode[],
  edges: (Pick<AtlasEdge, 'from' | 'to' | 'type'> & { derived?: boolean | undefined })[],
  units: AtlasUnit[],
  options: LayoutOptions = {},
): AtlasPosition[] {
  const { seed, ticks, width, height } = { ...LAYOUT_DEFAULTS, ...options };
  const orders = [...units].sort((a, b) => a.order - b.order).map((u) => u.id);
  const unitFraction = (unit: string | undefined): number => {
    if (unit === undefined || orders.length < 2) return 0.5;
    const i = orders.indexOf(unit);
    return i < 0 ? 0.5 : i / (orders.length - 1);
  };

  // d3 mutates these objects (x, y, vx, vy), so build fresh copies. Initial
  // positions come from the seeded generator, scattered around the node's unit
  // column, so the seed decides the layout and units start roughly in order.
  const random = seededRandom(seed);
  const simNodes: SimNode[] = nodes.map((n) => {
    const fraction = unitFraction(n.unit);
    return {
      id: n.id,
      radius: nodeRadius(n.centrality),
      unitFraction: fraction,
      x: width * (0.15 + 0.7 * fraction) + (random() - 0.5) * width * 0.2,
      y: height * (0.2 + 0.6 * random()),
    };
  });
  const index = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks: SimLink[] = [];
  for (const e of edges) {
    const source = index.get(e.from);
    const target = index.get(e.to);
    if (source && target)
      simLinks.push({ source, target, type: e.type, derived: e.derived ?? false });
  }

  // Derived `requires` edges (every prerequisite × every concept of a lesson)
  // are dense, so they are kept weak: they place a lesson's concepts near their
  // prerequisites without collapsing the lesson into one blob.
  const simulation = forceSimulation<SimNode>(simNodes)
    .randomSource(random)
    .stop()
    .force(
      'link',
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((l) => (l.type === 'requires' ? (l.derived ? 110 : 80) : 130))
        .strength((l) => (l.type === 'requires' ? (l.derived ? 0.08 : 0.4) : 0.15)),
    )
    .force('charge', forceManyBody<SimNode>().strength(-420).distanceMax(600))
    .force(
      'collide',
      forceCollide<SimNode>()
        .radius((d) => d.radius + 14)
        .strength(0.9),
    )
    .force('center', forceCenter(width / 2, height / 2).strength(0.1))
    .force(
      'unit-x',
      forceX<SimNode>()
        .x((d) => width * (0.12 + 0.76 * d.unitFraction))
        .strength(0.12),
    )
    .force('y', forceY<SimNode>(height / 2).strength(0.07));

  simulation.tick(ticks);

  return simNodes.map((n) => ({
    id: n.id,
    x: round(n.x ?? width / 2),
    y: round(n.y ?? height / 2),
  }));
}

/** One decimal keeps the serialized JSON small without visible loss. */
function round(v: number): number {
  return Math.round(v * 10) / 10;
}
