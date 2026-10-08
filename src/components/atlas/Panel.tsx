/**
 * Side panel for the selected node: label, type and field chips, summary,
 * "Taught in" lesson links, "Requires" / "Required by" lists, the
 * "Show prerequisites" toggle, and a glossary link for terms.
 */
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { RequiresIndex } from '@/lib/graph/paths';
import type { AtlasLesson } from '@/lib/graph/types';

import { FIELD_BG, FIELD_LABEL, TYPE_LABEL } from './fields';
import type { GraphNode } from './Graph';

export interface PanelProps {
  node: GraphNode;
  byId: Map<string, GraphNode>;
  lessons: Map<string, AtlasLesson>;
  requires: RequiresIndex;
  showPrerequisites: boolean;
  /** Size of the prerequisite closure and its roots, for the toggle's caption. */
  closureSize: number;
  roots: string[];
  onToggleShowPrerequisites: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function Panel({
  node,
  byId,
  lessons,
  requires,
  showPrerequisites,
  closureSize,
  roots,
  onToggleShowPrerequisites,
  onSelect,
  onClose,
}: PanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move the heading into view (not focus: keyboard users keep focus on the
  // node so the arrow keys still walk the graph).
  useEffect(() => {
    headingRef.current?.scrollIntoView({ block: 'nearest' });
  }, [node.id]);

  const prereqs = (requires.prerequisites.get(node.id) ?? [])
    .map((id) => byId.get(id))
    .filter((n): n is GraphNode => n !== undefined)
    .sort((a, b) => a.label.localeCompare(b.label));
  const dependents = (requires.dependents.get(node.id) ?? [])
    .map((id) => byId.get(id))
    .filter((n): n is GraphNode => n !== undefined)
    .sort((a, b) => a.label.localeCompare(b.label));
  const taughtIn = node.teaches.map((id) => lessons.get(id)).filter(isLesson);
  const requiredIn = node.requiredBy.map((id) => lessons.get(id)).filter(isLesson);

  return (
    <aside className="atlas-panel" aria-labelledby="atlas-panel-title" data-atlas-panel>
      <div className="atlas-panel-head">
        <div className="atlas-chips">
          <span className="atlas-chip">{TYPE_LABEL[node.type]}</span>
          <span className="atlas-chip">
            <span className={`atlas-chip-dot ${FIELD_BG[node.field]}`} aria-hidden="true" />
            {FIELD_LABEL[node.field]}
          </span>
        </div>
        <button
          type="button"
          className="atlas-icon-button"
          aria-label="Close panel"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <h2 id="atlas-panel-title" ref={headingRef} className="atlas-panel-title">
        {node.label}
      </h2>
      {node.summary && <p className="atlas-panel-summary">{node.summary}</p>}

      <div className="atlas-panel-actions">
        <button
          type="button"
          className="atlas-button"
          aria-pressed={showPrerequisites}
          disabled={closureSize === 0}
          onClick={onToggleShowPrerequisites}
          data-show-prerequisites
        >
          {showPrerequisites ? 'Hide prerequisites' : 'Show prerequisites'}
        </button>
        <span className="atlas-panel-caption">
          {closureSize === 0
            ? 'No prerequisites: this is a root.'
            : `${closureSize} prerequisite${closureSize === 1 ? '' : 's'} back to ${roots.length} root${roots.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {node.type === 'prereq' && node.href && (
        <p className="atlas-panel-link">
          <a href={node.href}>Read the sticky note in the glossary</a>
        </p>
      )}
      {node.type !== 'prereq' && node.href && taughtIn.length === 0 && (
        <p className="atlas-panel-link">
          <a href={node.href}>Open the lesson</a>
        </p>
      )}

      {taughtIn.length > 0 && (
        <section className="atlas-panel-section">
          <h3>Taught in</h3>
          <ul>
            {taughtIn.map((l) => (
              <li key={l.id}>
                <a href={l.href}>
                  {l.number} · {l.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {requiredIn.length > 0 && (
        <section className="atlas-panel-section">
          <h3>Needed by lessons</h3>
          <ul>
            {requiredIn.map((l) => (
              <li key={l.id}>
                <a href={l.href}>
                  {l.number} · {l.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NodeList title="Requires" items={prereqs} onSelect={onSelect} />
      <NodeList title="Required by" items={dependents} onSelect={onSelect} />
      {node.derivation && (
        <p className="atlas-panel-caption">
          Established in derivation <code>{node.derivation}</code>.
        </p>
      )}
    </aside>
  );
}

function NodeList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: GraphNode[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="atlas-panel-section">
      <h3>
        {title} <span className="atlas-count">{items.length}</span>
      </h3>
      <ul className="atlas-node-list">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" className="atlas-link-button" onClick={() => onSelect(n.id)}>
              <span className={`atlas-chip-dot ${FIELD_BG[n.field]}`} aria-hidden="true" />
              {n.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function isLesson(l: AtlasLesson | undefined): l is AtlasLesson {
  return l !== undefined;
}
