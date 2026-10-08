/**
 * The shared slider control (STYLE_GUIDE.md §7 point 5): label, optional TeX
 * symbol, unit, min/max/step, live readout, and reset-to-default. A native
 * `<input type="range">` styled with tokens in `src/styles/widgets.css`:
 * keyboard-operable by default (arrows, Home/End, PageUp/PageDown), a 44 px
 * hit area, `aria-valuetext` carrying the formatted value and unit.
 */
import { RotateCcw } from 'lucide-react';
import { useId } from 'react';

import { MathLabel } from './math-label';

export interface ParamProps {
  /** Plain-text name, used as the accessible name ("Correlation ρ"). */
  label: string;
  /** Optional TeX shown before the label, decorative for assistive tech. */
  tex?: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The reset target (normally the authored value for this embedding). */
  defaultValue: number;
  onChange: (value: number) => void;
  /** Readout formatter; defaults to the step's decimal places. */
  format?: (value: number) => string;
}

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function Param({
  label,
  tex,
  unit,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  format,
}: ParamProps) {
  const id = useId();
  const fmt = format ?? ((v: number) => v.toFixed(decimalsOf(step)));
  const readout = unit ? `${fmt(value)} ${unit}` : fmt(value);
  const atDefault = Math.abs(value - defaultValue) < step / 2;

  return (
    <div className="param">
      <div className="param-head">
        <label htmlFor={id} className="param-label">
          {tex ? <MathLabel tex={tex} className="param-tex" aria-label={label} /> : null}
          <span className={tex ? 'param-label-text' : undefined}>{label}</span>
        </label>
        <output htmlFor={id} className="param-value" aria-live="off">
          {readout}
        </output>
        <button
          type="button"
          className="param-reset"
          onClick={() => onChange(defaultValue)}
          disabled={atDefault}
          aria-label={`Reset ${label} to ${fmt(defaultValue)}`}
          title={`Reset to ${fmt(defaultValue)}`}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>
      <input
        id={id}
        type="range"
        className="param-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </div>
  );
}

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A labelled checkbox for boolean params, styled like `<Param>`. */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="param-toggle">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
