/**
 * The SVG graph: nodes (circles sized by centrality, filled by field), edges
 * (one stroke per type, arrowheads via <marker>), wheel/pinch zoom and
 * pointer pan (a ~60-line hand-rolled version of d3-zoom's math, because
 * d3-zoom pulls in d3-transition, d3-interpolate, d3-color, and d3-drag for
 * ~40 KB gzipped), node drag, keyboard navigation along `requires`, and a
 * hover tooltip.
 *
 * Colors are CSS tokens (`fill-field-*`, var(--viz-boundary), …) so the graph
 * follows the theme without reading computed styles. All state that the rest
 * of the Atlas cares about (selection, hover, highlight) lives in Atlas.tsx;
 * this component owns only the zoom transform and dragged positions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { nodeRadius } from '@/lib/graph/radius';
import type { RequiresIndex } from '@/lib/graph/paths';
import type { AtlasData, AtlasEdge } from '@/lib/graph/types';

import { FIELD_FILL, FIELD_LABEL, TYPE_LABEL } from './fields';

export type GraphNode = AtlasData['nodes'][number];

export interface Highlight {
  /** Nodes kept at full strength; everything else is dimmed. Null: nothing dimmed. */
  nodes: Set<string> | null;
  /** Edge keys drawn as the prerequisite path (thick, full opacity). */
  edges: Set<string>;
}

export interface GraphProps {
  nodes: GraphNode[];
  edges: AtlasEdge[];
  requires: RequiresIndex;
  selectedId: string | null;
  highlight: Highlight;
  highlightMode: string;
  /** Bumps whenever the Atlas wants the view centered on `centerOn.id`. */
  centerOn: { id: string; n: number } | null;
  mastery: (id: string) => number;
  onSelect: (id: string | null) => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const LABEL_RADIUS = 13;
const LABEL_ZOOM = 1.5;

interface Point {
  x: number;
  y: number;
}

/** screen = graph × k + (x, y), the same convention as d3-zoom. */
interface Transform {
  x: number;
  y: number;
  k: number;
}

const IDENTITY: Transform = { x: 0, y: 0, k: 1 };

/** Scale by `factor` about the screen point `p`, clamped to the scale extent. */
function zoomAbout(t: Transform, factor: number, p: Point): Transform {
  const k = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.k * factor));
  const ratio = k / t.k;
  return { k, x: p.x - (p.x - t.x) * ratio, y: p.y - (p.y - t.y) * ratio };
}

const edgeKeyOf = (e: AtlasEdge) => `${e.from}--${e.type}--${e.to}`;

export function Graph({
  nodes,
  edges,
  requires,
  selectedId,
  highlight,
  highlightMode,
  centerOn,
  mastery,
  onSelect,
}: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  // Mirror of `transform` for listeners that must not re-subscribe on every zoom frame.
  const transformRef = useRef(transform);
  const [overrides, setOverrides] = useState<Map<string, Point>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const tweenRef = useRef<number | null>(null);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const position = useCallback(
    (n: GraphNode): Point => overrides.get(n.id) ?? { x: n.x, y: n.y },
    [overrides],
  );

  // ---- zoom and pan --------------------------------------------------------
  const applyTransform = useCallback((t: Transform) => {
    transformRef.current = t;
    setTransform(t);
  }, []);

  const viewport = useCallback((): { width: number; height: number } => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 800, height: rect?.height ?? 600 };
  }, []);

  /** Pointer position relative to the SVG's top-left corner. */
  const local = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  // Wheel zoom about the cursor. Attached imperatively because React's wheel
  // listener is passive and could not call preventDefault() to stop page scroll.
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
      const factor = Math.pow(2, -event.deltaY * unit * (event.ctrlKey ? 10 : 1));
      applyTransform(zoomAbout(transformRef.current, factor, local(event.clientX, event.clientY)));
    };
    svgEl.addEventListener('wheel', onWheel, { passive: false });
    return () => svgEl.removeEventListener('wheel', onWheel);
  }, [applyTransform, local]);

  // Pan with one pointer on the background; pinch-zoom with two. Node drags
  // start on a node and are handled there (the event never reaches this path).
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const panRef = useRef<{ start: Point; origin: Transform } | null>(null);
  const pinchRef = useRef<{ dist: number; mid: Point; origin: Transform } | null>(null);
  const onBackgroundPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('[data-node]')) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = local(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, p);
    if (pointersRef.current.size === 1) {
      panRef.current = { start: p, origin: transformRef.current };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()] as [Point, Point];
      pinchRef.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        origin: transformRef.current,
      };
      panRef.current = null;
    }
  };
  const onBackgroundPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const p = local(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, p);
    const pan = panRef.current;
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()] as [Point, Point];
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scaled = zoomAbout(pinch.origin, dist / pinch.dist, pinch.mid);
      applyTransform({
        ...scaled,
        x: scaled.x + mid.x - pinch.mid.x,
        y: scaled.y + mid.y - pinch.mid.y,
      });
    } else if (pan) {
      applyTransform({
        ...pan.origin,
        x: pan.origin.x + p.x - pan.start.x,
        y: pan.origin.y + p.y - pan.start.y,
      });
    }
  };
  const onBackgroundPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.delete(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    panRef.current = null;
    pinchRef.current = null;
    const rest = [...pointersRef.current.values()];
    if (rest.length === 1)
      panRef.current = { start: rest[0] as Point, origin: transformRef.current };
  };
  const onDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('[data-node]')) return;
    applyTransform(zoomAbout(transformRef.current, 2, local(event.clientX, event.clientY)));
  };

  /** Move to `target` over 400 ms (STYLE_GUIDE §4.4), or snap when motion is reduced. */
  const animateTo = useCallback(
    (target: Transform) => {
      if (tweenRef.current !== null) cancelAnimationFrame(tweenRef.current);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        applyTransform(target);
        return;
      }
      const from = transformRef.current;
      const start = performance.now();
      const duration = 400;
      const step = (now: number) => {
        const u = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - u, 3);
        applyTransform({
          k: from.k + (target.k - from.k) * e,
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
        });
        tweenRef.current = u < 1 ? requestAnimationFrame(step) : null;
      };
      tweenRef.current = requestAnimationFrame(step);
    },
    [applyTransform],
  );

  // Fit the whole graph on first mount (positions are precomputed, so no jitter).
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || nodes.length === 0) return;
    fittedRef.current = true;
    const { width, height } = viewport();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const pad = 60;
    const k = Math.max(
      MIN_SCALE,
      Math.min(1.5, (width - pad) / (maxX - minX + 1), (height - pad) / (maxY - minY + 1)),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    applyTransform({ k, x: width / 2 - cx * k, y: height / 2 - cy * k });
  }, [nodes, viewport, applyTransform]);

  // Center on a node when asked (search, ?node=, panel links).
  useEffect(() => {
    if (!centerOn) return;
    const node = byId.get(centerOn.id);
    if (!node) return;
    const { width, height } = viewport();
    const p = overrides.get(node.id) ?? { x: node.x, y: node.y };
    const k = Math.max(transformRef.current.k, 1.2);
    animateTo({ k, x: width / 2 - p.x * k, y: height / 2 - p.y * k });
    // Only re-run when a new request arrives, not when positions drift.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOn]);

  // ---- drag ----------------------------------------------------------------
  const onPointerDown = (id: string) => (event: React.PointerEvent<SVGGElement>) => {
    if (event.button !== 0) return;
    const node = byId.get(id);
    if (!node) return;
    const p = position(node);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      ox: p.x,
      oy: p.y,
      moved: false,
    };
  };
  const onPointerMove = (id: string) => (event: React.PointerEvent<SVGGElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    const dx = (event.clientX - d.startX) / transform.k;
    const dy = (event.clientY - d.startY) / transform.k;
    if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 3) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) {
      setOverrides((prev) => new Map(prev).set(id, { x: d.ox + dx, y: d.oy + dy }));
    }
  };
  const onPointerUp = (id: string) => (event: React.PointerEvent<SVGGElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (!d.moved) onSelect(selectedId === id ? null : id);
  };

  // ---- keyboard ------------------------------------------------------------
  const focusNode = (id: string) => {
    document.getElementById(`atlas-node-${id}`)?.focus();
  };
  const nearest = (from: GraphNode, candidates: string[]): string | null => {
    const p = position(from);
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of candidates) {
      const c = byId.get(id);
      if (!c) continue;
      const q = position(c);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  };
  const onKeyDown = (id: string) => (event: React.KeyboardEvent<SVGGElement>) => {
    const node = byId.get(id);
    if (!node) return;
    switch (event.key) {
      case 'Enter':
      case ' ': {
        event.preventDefault();
        onSelect(id);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const target = nearest(node, requires.prerequisites.get(id) ?? []);
        if (target) focusNode(target);
        break;
      }
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const target = nearest(node, requires.dependents.get(id) ?? []);
        if (target) focusNode(target);
        break;
      }
      default:
    }
  };

  // ---- render --------------------------------------------------------------
  const { k } = transform;
  const labelSize = 12 / Math.min(Math.max(k, 0.8), 1.6);
  const showAllLabels = k >= LABEL_ZOOM;
  const hoveredNode = hovered ? byId.get(hovered) : undefined;
  const tooltipPos = hoveredNode ? position(hoveredNode) : null;

  return (
    <div className="atlas-stage" data-dragging={dragging || undefined}>
      <svg
        ref={svgRef}
        className="atlas-svg"
        role="group"
        aria-label={`Concept graph: ${nodes.length} concepts, ${edges.length} relations`}
        data-highlight-mode={highlightMode}
        data-node-count={nodes.length}
        data-edge-count={edges.length}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
        onPointerCancel={onBackgroundPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          <marker
            id="atlas-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="atlas-arrowhead" />
          </marker>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <g className="atlas-edges" aria-hidden="true">
            {edges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              const pa = position(a);
              const pb = position(b);
              const dx = pb.x - pa.x;
              const dy = pb.y - pa.y;
              const len = Math.hypot(dx, dy) || 1;
              const ra = nodeRadius(a.centrality) + 1;
              const rb = nodeRadius(b.centrality) + 3;
              const key = edgeKeyOf(e);
              const onPath = highlight.edges.has(key);
              const dim =
                highlight.nodes !== null &&
                !(highlight.nodes.has(e.from) && highlight.nodes.has(e.to));
              return (
                <line
                  key={key}
                  className="atlas-edge"
                  data-type={e.type}
                  data-derived={e.derived || undefined}
                  data-path={onPath || undefined}
                  data-dim={dim || undefined}
                  x1={pa.x + (dx / len) * ra}
                  y1={pa.y + (dy / len) * ra}
                  x2={pb.x - (dx / len) * rb}
                  y2={pb.y - (dy / len) * rb}
                  markerEnd={e.type === 'contrasts' ? undefined : 'url(#atlas-arrow)'}
                />
              );
            })}
          </g>
          <g className="atlas-nodes">
            {nodes.map((n) => {
              const p = position(n);
              const r = nodeRadius(n.centrality);
              const selected = n.id === selectedId;
              const onPath = highlight.nodes?.has(n.id) ?? false;
              const dim = highlight.nodes !== null && !onPath;
              const labelVisible =
                showAllLabels ||
                r >= LABEL_RADIUS ||
                selected ||
                hovered === n.id ||
                (highlight.nodes !== null && onPath);
              return (
                <g
                  key={n.id}
                  id={`atlas-node-${n.id}`}
                  className="atlas-node"
                  data-node={n.id}
                  data-type={n.type}
                  data-selected={selected || undefined}
                  data-dim={dim || undefined}
                  data-path={onPath || undefined}
                  transform={`translate(${p.x} ${p.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.label}, ${TYPE_LABEL[n.type].toLowerCase()}, ${FIELD_LABEL[n.field]}`}
                  aria-pressed={selected}
                  onPointerDown={onPointerDown(n.id)}
                  onPointerMove={onPointerMove(n.id)}
                  onPointerUp={onPointerUp(n.id)}
                  onPointerCancel={onPointerUp(n.id)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered((h) => (h === n.id ? null : h))}
                  onKeyDown={onKeyDown(n.id)}
                >
                  <circle className="atlas-halo" r={r + 4} data-mastery={mastery(n.id)} />
                  <circle className={`atlas-dot ${FIELD_FILL[n.field]}`} r={r} />
                  <text
                    className="atlas-label"
                    y={r + labelSize + 2}
                    fontSize={labelSize}
                    textAnchor="middle"
                    data-visible={labelVisible || undefined}
                    aria-hidden="true"
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {hoveredNode && tooltipPos && !dragging && (
        <div
          role="tooltip"
          className="atlas-tooltip"
          style={{
            left: tooltipPos.x * k + transform.x,
            top: tooltipPos.y * k + transform.y + nodeRadius(hoveredNode.centrality) * k + 8,
          }}
        >
          <strong>{hoveredNode.label}</strong>
          <span className="atlas-tooltip-meta">
            {TYPE_LABEL[hoveredNode.type]} · {FIELD_LABEL[hoveredNode.field]}
          </span>
          {hoveredNode.summary && <span>{truncate(hoveredNode.summary, 120)}</span>}
        </div>
      )}
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
