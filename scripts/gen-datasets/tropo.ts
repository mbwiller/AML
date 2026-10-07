/** `tsx scripts/gen-datasets/tropo.ts` — regenerate src/data/tropo.json only. */
import { writeCase } from './lib';

const bytes = writeCase('tropo');
console.log(`wrote src/data/tropo.json (${(bytes / 1024).toFixed(0)} KB)`);
