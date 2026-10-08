/**
 * The Atlas island (VISION.md §7 "Atlas", §9.4). Owns selection, filters,
 * the prerequisite highlight, URL sync (`?node=<id>`), and the mastery hook
 * (every node is `mastery-0` until the practice engine lands, M2).
 *
 * Hydrated with `client:visible` on /atlas, which is not a lesson page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Field } from '@/lib/content/vocab';
import { buildRequiresIndex, prerequisiteClosure, shortestPathToRoots } from '@/lib/graph/paths';
import { decodeAtlas, type AtlasWire } from '@/lib/graph/wire';

import './atlas.css';
import { ALL_FIELDS } from './fields';
import { Graph, type GraphNode, type Highlight } from './Graph';
import { Legend } from './Legend';
import { Panel } from './Panel';
import { Toolbar } from './Toolbar';

export interface AtlasProps {
  /** The graph in wire form (src/lib/graph/wire.ts); decoded once on mount. */
  wire: AtlasWire;
  /** Node to open on load; the URL's `?node=` wins when present. */
  initialNode?: string | undefined;
  /** Mastery per node id, 0–4 (VISION §9.6). Absent ids are 0. */
  mastery?: Record<string, number> | undefined;
}

const edgeKeyOf = (from: string, to: string, type: string) => `${from}--${type}--${to}`;

export function Atlas({ wire, initialNode, mastery }: AtlasProps) {
  const data = useMemo(() => decodeAtlas(wire), [wire]);
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const lessons = useMemo(() => new Map(data.lessons.map((l) => [l.id, l])), [data.lessons]);
  const requires = useMemo(() => buildRequiresIndex(data.edges), [data.edges]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPrerequisites, setShowPrerequisites] = useState(false);
  const [onlyPrerequisites, setOnlyPrerequisites] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    () => new Set(data.units.map((u) => u.id)),
  );
  const [selectedFields, setSelectedFields] = useState<Set<Field>>(() => new Set(ALL_FIELDS));
  const [centerOn, setCenterOn] = useState<{ id: string; n: number } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const center = useCallback((id: string) => {
    setCenterOn((c) => ({ id, n: (c?.n ?? 0) + 1 }));
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id === null) {
      setShowPrerequisites(false);
      setOnlyPrerequisites(false);
    }
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('node', id);
      else url.searchParams.delete('node');
      history.replaceState(null, '', url);
    } catch {
      /* history unavailable: the selection still works for this page */
    }
  }, []);

  // ?node=<id> (or the page's initialNode prop) opens the panel and centers on
  // load. Deferred a frame so the hydrated markup matches the server's first.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let id: string | null = null;
      try {
        id = new URLSearchParams(window.location.search).get('node');
      } catch {
        /* no location: fall through to the prop */
      }
      id = id && byId.has(id) ? id : (initialNode ?? null);
      if (id && byId.has(id)) {
        setSelectedId(id);
        center(id);
      }
      setLegendOpen(window.matchMedia('(width >= 1024px)').matches);
    });
    return () => cancelAnimationFrame(frame);
  }, [byId, initialNode, center]);

  // Escape closes the panel from anywhere in the island.
  useEffect(() => {
    if (selectedId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      select(null);
      document.getElementById(`atlas-node-${selectedId}`)?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedId, select]);

  // ---- derived sets --------------------------------------------------------
  const closure = useMemo(
    () => (selectedId ? prerequisiteClosure(selectedId, requires) : new Set<string>()),
    [selectedId, requires],
  );
  const roots = useMemo(
    () => (selectedId ? shortestPathToRoots(selectedId, requires).roots : []),
    [selectedId, requires],
  );

  const visibleNodes = useMemo<GraphNode[]>(() => {
    return data.nodes.filter((n) => {
      if (!selectedFields.has(n.field)) return false;
      if (n.unit !== undefined && !selectedUnits.has(n.unit)) return false;
      if (onlyPrerequisites && selectedId) return n.id === selectedId || closure.has(n.id);
      return true;
    });
  }, [data.nodes, selectedFields, selectedUnits, onlyPrerequisites, selectedId, closure]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => data.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)),
    [data.edges, visibleIds],
  );

  const highlight = useMemo<Highlight>(() => {
    if (!selectedId || !showPrerequisites) return { nodes: null, edges: new Set() };
    const nodes = new Set(closure);
    nodes.add(selectedId);
    const edges = new Set<string>();
    for (const e of data.edges) {
      if (e.type === 'requires' && nodes.has(e.from) && nodes.has(e.to))
        edges.add(edgeKeyOf(e.from, e.to, e.type));
    }
    return { nodes, edges };
  }, [selectedId, showPrerequisites, closure, data.edges]);

  const highlightMode = onlyPrerequisites
    ? 'prerequisites-only'
    : showPrerequisites && selectedId
      ? 'prerequisites'
      : 'none';

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const masteryOf = useCallback((id: string) => mastery?.[id] ?? 0, [mastery]);

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div className="atlas-root" data-atlas>
      <Toolbar
        units={data.units}
        nodes={data.nodes}
        selectedUnits={selectedUnits}
        selectedFields={selectedFields}
        onlyPrerequisites={onlyPrerequisites}
        hasSelection={selected !== undefined}
        visibleCount={visibleNodes.length}
        onToggleUnit={(id) => setSelectedUnits((s) => toggleIn(s, id))}
        onToggleField={(f) => setSelectedFields((s) => toggleIn(s, f))}
        onResetFilters={() => {
          setSelectedUnits(new Set(data.units.map((u) => u.id)));
          setSelectedFields(new Set(ALL_FIELDS));
        }}
        onToggleOnlyPrerequisites={() => setOnlyPrerequisites((v) => !v)}
        onFind={(id) => {
          select(id);
          center(id);
          document.getElementById(`atlas-node-${id}`)?.focus();
        }}
      />
      <div className="atlas-body">
        <Graph
          nodes={visibleNodes}
          edges={visibleEdges}
          requires={requires}
          selectedId={selectedId}
          highlight={highlight}
          highlightMode={highlightMode}
          centerOn={centerOn}
          mastery={masteryOf}
          onSelect={select}
        />
        <Legend open={legendOpen} />
        {selected && (
          <Panel
            node={selected}
            byId={byId}
            lessons={lessons}
            requires={requires}
            showPrerequisites={showPrerequisites}
            closureSize={closure.size}
            roots={roots}
            onToggleShowPrerequisites={() => setShowPrerequisites((v) => !v)}
            onSelect={(id) => {
              select(id);
              center(id);
            }}
            onClose={() => select(null)}
          />
        )}
      </div>
    </div>
  );
}
