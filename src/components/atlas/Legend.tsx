/**
 * Legend: field colors, edge strokes, and the two non-color markers (dashed
 * ring = glossary term, halo = mastery), so color is never the only signal.
 */
import { ALL_FIELDS, EDGE_LABEL, EDGE_TYPES, FIELD_BG, FIELD_LABEL } from './fields';

export function Legend({ open }: { open: boolean }) {
  return (
    <details className="atlas-legend" open={open}>
      <summary>Legend</summary>
      <div className="atlas-legend-body">
        <ul className="atlas-legend-list" aria-label="Fields">
          {ALL_FIELDS.map((f) => (
            <li key={f}>
              <span className={`atlas-chip-dot ${FIELD_BG[f]}`} aria-hidden="true" />
              {FIELD_LABEL[f]}
            </li>
          ))}
        </ul>
        <ul className="atlas-legend-list" aria-label="Edge types">
          {EDGE_TYPES.map((t) => (
            <li key={t}>
              <svg width="36" height="10" aria-hidden="true" className="atlas-legend-stroke">
                <line className="atlas-edge" data-type={t} x1="1" y1="5" x2="35" y2="5" />
              </svg>
              {EDGE_LABEL[t]}
            </li>
          ))}
          <li>
            <svg width="36" height="12" aria-hidden="true" className="atlas-legend-stroke">
              <circle className="atlas-dot atlas-legend-prereq" cx="18" cy="6" r="5" />
            </svg>
            glossary term (dashed ring)
          </li>
          <li>
            <span className="atlas-legend-size" aria-hidden="true" />
            size: how many relations a node has
          </li>
        </ul>
      </div>
    </details>
  );
}
