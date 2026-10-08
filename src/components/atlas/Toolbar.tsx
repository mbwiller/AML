/**
 * Filters and search: unit chips, field chips, "only prerequisites of the
 * selected node", and a search box that focuses a node by label.
 */
import { Search } from 'lucide-react';
import { useId, useState } from 'react';

import type { Field } from '@/lib/content/vocab';
import type { AtlasUnit } from '@/lib/graph/types';

import { ALL_FIELDS, FIELD_BG, FIELD_LABEL } from './fields';
import type { GraphNode } from './Graph';

export interface ToolbarProps {
  units: AtlasUnit[];
  nodes: GraphNode[];
  selectedUnits: Set<string>;
  selectedFields: Set<Field>;
  onlyPrerequisites: boolean;
  hasSelection: boolean;
  visibleCount: number;
  onToggleUnit: (id: string) => void;
  onToggleField: (field: Field) => void;
  onResetFilters: () => void;
  onToggleOnlyPrerequisites: () => void;
  onFind: (id: string) => void;
}

export function Toolbar({
  units,
  nodes,
  selectedUnits,
  selectedFields,
  onlyPrerequisites,
  hasSelection,
  visibleCount,
  onToggleUnit,
  onToggleField,
  onResetFilters,
  onToggleOnlyPrerequisites,
  onFind,
}: ToolbarProps) {
  const listId = useId();
  const [query, setQuery] = useState('');

  const find = (value: string): boolean => {
    const q = value.trim().toLowerCase();
    if (!q) return false;
    const exact = nodes.find((n) => n.label.toLowerCase() === q);
    const partial = exact ?? nodes.find((n) => n.label.toLowerCase().includes(q));
    if (!partial) return false;
    onFind(partial.id);
    return true;
  };

  const allUnits = selectedUnits.size === units.length;
  const allFields = selectedFields.size === ALL_FIELDS.length;

  return (
    <div className="atlas-toolbar" role="region" aria-label="Atlas filters">
      <label className="atlas-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          list={listId}
          placeholder="Find a concept"
          aria-label="Find a concept by name"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            // A datalist pick arrives as a full label: jump straight to it.
            if (nodes.some((n) => n.label.toLowerCase() === value.trim().toLowerCase()))
              find(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              find(query);
            }
          }}
        />
        <datalist id={listId}>
          {nodes.map((n) => (
            <option key={n.id} value={n.label} />
          ))}
        </datalist>
      </label>

      <fieldset className="atlas-chipset">
        <legend>Units</legend>
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            className="atlas-chip atlas-chip-toggle"
            aria-pressed={selectedUnits.has(u.id)}
            title={u.title}
            onClick={() => onToggleUnit(u.id)}
          >
            U{u.order}
          </button>
        ))}
      </fieldset>

      <fieldset className="atlas-chipset">
        <legend>Fields</legend>
        {ALL_FIELDS.map((f) => (
          <button
            key={f}
            type="button"
            className="atlas-chip atlas-chip-toggle"
            aria-pressed={selectedFields.has(f)}
            onClick={() => onToggleField(f)}
          >
            <span className={`atlas-chip-dot ${FIELD_BG[f]}`} aria-hidden="true" />
            {FIELD_LABEL[f]}
          </button>
        ))}
      </fieldset>

      <label className="atlas-check">
        <input
          type="checkbox"
          checked={onlyPrerequisites}
          disabled={!hasSelection}
          onChange={onToggleOnlyPrerequisites}
          data-only-prerequisites
        />
        Only prerequisites of the selected node
      </label>

      <span className="atlas-toolbar-status" aria-live="polite">
        {visibleCount} of {nodes.length} shown
        {!(allUnits && allFields) && (
          <>
            {' · '}
            <button type="button" className="atlas-link-button" onClick={onResetFilters}>
              reset filters
            </button>
          </>
        )}
      </span>
    </div>
  );
}
