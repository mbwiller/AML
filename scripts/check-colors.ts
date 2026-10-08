/**
 * `pnpm exec tsx scripts/check-colors.ts`
 *
 * STYLE_GUIDE.md §4: every color comes from src/styles/tokens.css. This walks
 * src/ (skipping tokens.css, generated data, and Markdown/MDX) and fails with
 * file:line for any hard-coded color: hex in a color-bearing CSS declaration,
 * class attribute, or style attribute; raw rgb()/rgba()/hsl()/oklch(); named
 * CSS colors as Tailwind arbitrary values (`bg-[red]`); and arbitrary pixel
 * values (`p-[13px]`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const SKIP_FILES = new Set([path.join(SRC, 'styles', 'tokens.css')]);
const SKIP_DIRS = new Set([path.join(SRC, 'data')]);
const SKIP_EXT = new Set(['.md', '.mdx']);
const CHECK_EXT = new Set([
  '.ts',
  '.tsx',
  '.astro',
  '.css',
  '.js',
  '.mjs',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
]);

const NAMED_COLORS =
  'red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|cyan|magenta|teal|navy|lime|olive|maroon|silver|aqua|fuchsia|coral|salmon|gold|indigo|violet|crimson|tomato|turquoise|transparent';

interface Rule {
  name: string;
  re: RegExp;
}

const HEX = '#[0-9a-fA-F]{3,8}\\b';

const RULES: Rule[] = [
  {
    // `color: #fff`, `border: 1px solid #abc`, `box-shadow: 0 0 4px #000`, `fill="#fff"`,
    // `stroke: '#fff'` — a color-bearing property followed by a hex somewhere in the declaration.
    name: 'hex color in a CSS declaration',
    re: new RegExp(
      `\\b(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z-]+)?|(?:box-|text-)?shadow|outline(?:-color)?)\\s*[:=]\\s*["']?[^;"'\\n}]*?(?<=[:\\s(,"'])${HEX}`,
      'i',
    ),
  },
  {
    // `className="bg-[#fff]"`, `class="text-[#1a1a1a]"`, `style="color:#fff"`
    name: 'hex color in a class or style attribute',
    re: new RegExp(
      `\\b(?:class(?:Name)?|style)\\s*=\\s*(?:\\{?["'\`])[^"'\`\\n]*?(?<=[:\\s(,\\[])${HEX}`,
      'i',
    ),
  },
  {
    // Tailwind arbitrary values: `bg-[#fff]`, `text-[#000]`
    name: 'hex color in a Tailwind arbitrary value',
    re: new RegExp(`\\[${HEX}\\]`, 'i'),
  },
  { name: 'raw rgb()/rgba()', re: /\brgba?\(/ },
  { name: 'raw hsl()/hsla()', re: /\bhsla?\(/ },
  { name: 'raw oklch() outside tokens.css', re: /\boklch\(/ },
  {
    name: 'named CSS color as a Tailwind arbitrary value',
    re: new RegExp(
      `\\b(?:bg|text|border|fill|stroke|ring|outline|shadow|from|to|via|decoration|accent|caret)-\\[(?:${NAMED_COLORS})\\]`,
    ),
  },
  { name: 'arbitrary pixel value (use the spacing scale)', re: /\[\d+(?:\.\d+)?px\]/ },
];

interface Finding {
  file: string;
  line: number;
  rule: string;
  text: string;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(abs)) walk(abs, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (SKIP_FILES.has(abs) || SKIP_EXT.has(ext) || !CHECK_EXT.has(ext)) continue;
    out.push(abs);
  }
}

function check(file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, i) => {
    for (const rule of RULES) {
      if (rule.re.test(text)) {
        findings.push({ file, line: i + 1, rule: rule.name, text: text.trim() });
        break;
      }
    }
  });
  return findings;
}

const files: string[] = [];
walk(SRC, files);
const findings = files.flatMap(check);

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`${path.relative(root, f.file)}:${f.line}  ${f.rule}\n    ${f.text}`);
  }
  console.error(
    `\ncheck:colors found ${findings.length} hard-coded color(s) or arbitrary value(s). ` +
      'Use the semantic tokens in src/styles/tokens.css (STYLE_GUIDE.md §4).',
  );
  process.exit(1);
}

console.log(`check:colors: ${files.length} files clean.`);
