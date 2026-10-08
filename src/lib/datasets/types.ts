/**
 * The envelope every generated case dataset is written in (VISION §9.8,
 * STYLE_GUIDE §8). `scripts/gen-datasets` serializes one of these per case
 * to `src/data/<id>.json`; `src/lib/datasets/index.ts` reads them back.
 *
 * There is deliberately no `generatedAt`: the file is a pure function of the
 * generator code and the seed, so regenerating it must produce no diff.
 */

export type CaseId = 'notes' | 'adverse' | 'tropo' | 'vasco';

export type VariableType =
  'id' | 'binary' | 'integer' | 'continuous' | 'categorical' | 'tokens' | 'probability';

export interface DatasetVariable {
  /** Row key (or, for derived values, the accessor that computes it). */
  name: string;
  /** TeX symbol used for it in lessons, when there is one. */
  symbol?: string;
  type: VariableType;
  /** Physical unit, when there is one ("mg", "ng/L", "mL/min/1.73m²", "years"). */
  unit?: string;
  description: string;
}

export interface GenerativeModel {
  /** The model in TeX, as shown on the case page. */
  tex: string;
  /** The true parameters, so lessons can show an estimator recovering them. */
  parameters: Record<string, unknown>;
}

export interface Dataset<Row> {
  id: CaseId;
  title: string;
  /** Part C entry in docs/reference/pedagogy-and-curriculum.md, e.g. "C6". */
  spec: string;
  seed: number;
  generativeModel: GenerativeModel;
  variables: DatasetVariable[];
  n: number;
  rows: Row[];
}
