/**
 * Pure helpers for /cases (VISION.md §7 "Cases", §9.8; framework-free,
 * unit-tested): the eight planned running examples and the summary
 * statistics of a generated dataset.
 */
import type { Dataset, DatasetVariable } from '@/lib/datasets/types';

export interface PlannedCase {
  id: string;
  name: string;
  /** Part C entry in docs/reference/pedagogy-and-curriculum.md. */
  spec: string;
  /** One line, used on the index while the case has no page. */
  tagline: string;
}

/** The eight cases of VISION §9.8, in Part C order. */
export const PLANNED_CASES: readonly PlannedCase[] = [
  {
    id: 'vasco',
    name: 'VASCO',
    spec: 'C1',
    tagline:
      'Dose–response regression: blood-pressure change against dose in a dose-finding trial.',
  },
  {
    id: 'adverse',
    name: 'ADVERSE',
    spec: 'C2',
    tagline: 'Adverse-event classification in a post-marketing cohort, at 6% prevalence.',
  },
  {
    id: 'tropo',
    name: 'TROPO',
    spec: 'C3',
    tagline: 'Diagnostic thresholds: troponin in two overlapping log-normal classes.',
  },
  {
    id: 'sepsis-4',
    name: 'SEPSIS-4',
    spec: 'C4',
    tagline: 'Four ICU sepsis phenotypes as a Gaussian mixture, for clustering and EM.',
  },
  {
    id: 'leuk-expr',
    name: 'LEUK-EXPR',
    spec: 'C5',
    tagline: 'Low-rank gene expression with more genes than patients, for PCA.',
  },
  {
    id: 'notes',
    name: 'NOTES',
    spec: 'C6',
    tagline: 'Adverse-event reports generated from a Naive Bayes model.',
  },
  {
    id: 'adapt-3',
    name: 'ADAPT-3',
    spec: 'C7',
    tagline: 'A response-adaptive three-arm trial, for bandits and reinforcement learning.',
  },
  {
    id: 'steps',
    name: 'STEPS',
    spec: 'C8',
    tagline: 'A micro-randomized mobile-health trial, for SGD and grouped cross-validation.',
  },
];

/** The planned cases followed by any extra case pages, each flagged with whether a page exists. */
export interface CaseIndexRow<C> {
  id: string;
  planned: PlannedCase | undefined;
  page: C | undefined;
}

export function caseIndex<C extends { id: string }>(pages: readonly C[]): CaseIndexRow<C>[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const rows: CaseIndexRow<C>[] = PLANNED_CASES.map((planned) => ({
    id: planned.id,
    planned,
    page: byId.get(planned.id),
  }));
  for (const p of pages) {
    if (!PLANNED_CASES.some((c) => c.id === p.id))
      rows.push({ id: p.id, planned: undefined, page: p });
  }
  return rows;
}

export interface NumericSummary {
  variable: DatasetVariable;
  mean: number;
  sd: number;
  min: number;
  max: number;
}

export interface CategoricalSummary {
  variable: DatasetVariable;
  /** Value → count, in ascending value order. */
  counts: { value: string; count: number }[];
}

export interface CaseStats {
  n: number;
  /** The binary label (symbol or name `y`) and its prevalence. */
  label: { variable: DatasetVariable; positives: number; prevalence: number } | undefined;
  numeric: NumericSummary[];
  categorical: CategoricalSummary[];
}

const NUMERIC_TYPES = new Set(['continuous', 'integer', 'probability']);

/** The label variable: binary, with symbol or name `y`. */
export function labelVariable(variables: readonly DatasetVariable[]): DatasetVariable | undefined {
  return variables.find((v) => v.type === 'binary' && (v.symbol === 'y' || v.name === 'y'));
}

/** n, prevalence of the label, mean/sd/range of numeric columns, counts of categorical ones. */
export function caseStats(
  dataset: Pick<Dataset<Record<string, unknown>>, 'rows' | 'variables'>,
): CaseStats {
  const rows = dataset.rows;
  const n = rows.length;
  const label = labelVariable(dataset.variables);
  const positives = label ? rows.filter((r) => Number(r[label.name]) === 1).length : 0;

  const numeric: NumericSummary[] = [];
  const categorical: CategoricalSummary[] = [];
  for (const v of dataset.variables) {
    if (v === label) continue;
    if (NUMERIC_TYPES.has(v.type)) {
      const xs = rows.map((r) => Number(r[v.name])).filter((x) => Number.isFinite(x));
      if (xs.length === 0) continue;
      const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
      const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
      numeric.push({
        variable: v,
        mean,
        sd: Math.sqrt(variance),
        min: Math.min(...xs),
        max: Math.max(...xs),
      });
    } else if (v.type === 'categorical' || v.type === 'binary') {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const key = String(r[v.name]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      categorical.push({
        variable: v,
        counts: [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, 'en', { numeric: true })),
      });
    }
  }
  return {
    n,
    label: label && { variable: label, positives, prevalence: n === 0 ? 0 : positives / n },
    numeric,
    categorical,
  };
}

/** A table cell for a dataset value: numbers to at most 4 significant decimals, arrays elided. */
export function formatCell(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toPrecision(4)));
  }
  if (Array.isArray(value)) return `[${value.length} values]`;
  if (value === null || value === undefined) return '—';
  return String(value);
}

/** `0.0612` → `6.1%`. */
export function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

/** A frontmatter parameter value as text: arrays joined, objects as `key: value` pairs. */
export function formatParameter(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatParameter).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${formatParameter(v)}`)
      .join('; ');
  }
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}
