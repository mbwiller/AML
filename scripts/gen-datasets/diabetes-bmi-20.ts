/**
 * `tsx scripts/gen-datasets/diabetes-bmi-20.ts` — regenerate
 * src/data/diabetes-bmi-20.json only.
 *
 * The rows are read from `sources/diabetes-bmi-20.source.json` (the last 20
 * patients of scikit-learn's diabetes data, as the Lecture 2 and Lecture 4
 * companions take them; provenance in that file's `$comment`) by `generate()`
 * in `src/lib/datasets/diabetes-bmi-20.ts`. No Python and no network.
 */
import { writeCase } from './lib';

const bytes = writeCase('diabetes-bmi-20');
console.log(`wrote src/data/diabetes-bmi-20.json (${(bytes / 1024).toFixed(1)} KB)`);
