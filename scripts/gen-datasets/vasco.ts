/** `tsx scripts/gen-datasets/vasco.ts` — regenerate src/data/vasco.json only. */
import { writeCase } from './lib';

const bytes = writeCase('vasco');
console.log(`wrote src/data/vasco.json (${(bytes / 1024).toFixed(0)} KB)`);
