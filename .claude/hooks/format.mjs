// PostToolUse hook: format code files with the project's Prettier after Claude edits them.
// Skips silently when the scaffold (node_modules/.bin/prettier) does not exist yet.
// Markdown/MDX are deliberately excluded so math is never reflowed by the formatter.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

let input = "";
try { input = readFileSync(0, "utf8"); } catch {}
let file;
try { file = JSON.parse(input)?.tool_input?.file_path; } catch {}
if (!file || !/\.(ts|tsx|astro|css|json|ya?ml)$/.test(file)) process.exit(0);
const prettier = "node_modules/.bin/prettier";
if (!existsSync(prettier)) process.exit(0);
try { execFileSync(prettier, ["--write", file], { stdio: "ignore" }); } catch {}
