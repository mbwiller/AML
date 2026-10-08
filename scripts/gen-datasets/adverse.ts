/** `tsx scripts/gen-datasets/adverse.ts` — regenerate src/data/adverse.json only. */
import { writeCase } from './lib';

const bytes = writeCase('adverse');
console.log(`wrote src/data/adverse.json (${(bytes / 1024).toFixed(0)} KB)`);
