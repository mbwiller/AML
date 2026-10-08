/**
 * The envelope every generated case dataset is written in (VISION §9.8,
 * STYLE_GUIDE §8). `scripts/gen-datasets` serializes one of these per case
 * to `src/data/<id>.json`; `src/lib/datasets/index.ts` reads them back.
 *
 * There is deliberately no `generatedAt`: the file is a pure function of the
 * generator code and the seed, so regenerating it must produce no diff.
 */

export type CaseId = 'notes' | 'adverse' | 'tropo';

export type VariableType =
  'id' | 'binary' | 'integer' | 'continuous' | 'categorical' | 'tokens' | 'probability';

/**
 * Reference datasets: real data a course companion uses, reproduced exactly
 * from a committed source file rather than sampled (no seed, no generative
 * model). See docs/decisions/2026-10-07-dataset-generators.md.
 */
export type ReferenceId = 'diabetes-bmi-20';

/** Every file in `src/data/`: the synthetic cases and the reference datasets. */
export type DatasetId = CaseId | ReferenceId;

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
  id: DatasetId;
  title: string;
  /**
   * Part C entry in docs/reference/pedagogy-and-curriculum.md, e.g. "C6"; for
   * a reference dataset, the companion notebook it reproduces.
   */
  spec: string;
  seed: number;
  generativeModel: GenerativeModel;
  variables: DatasetVariable[];
  n: number;
  rows: Row[];
}
