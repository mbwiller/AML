/**
 * Pure content validation for `pnpm validate:content` (docs/CONTENT_AUTHORING.md §1).
 *
 * No file IO lives here. `parseContent` turns already-read files into typed
 * documents (reporting schema failures), and `validateContent` runs every
 * cross-document check on those documents. `runValidation` does both. The CLI
 * in `scripts/validate-content.ts` reads the tree and prints the findings; the
 * Vitest suite feeds in-memory fixtures.
 */
import { parse as parseYaml } from "yaml";
import type { z } from "zod";

// Relative on purpose: tsx and a config-less Vitest do not resolve the `@/` alias.
import { mdxComponentNames } from "../../components/mdx/names";
import {
  KEBAB_RE,
  caseSchema,
  flashcardFileSchema,
  glossarySchema,
  graphEdgeSchema,
  graphNodeSchema,
  homeworkSchema,
  lessonId,
  lessonSchema,
  quizFileSchema,
  unitSchema,
  type Case,
  type Flashcard,
  type GlossaryTerm,
  type GraphEdge,
  type GraphNode,
  type Homework,
  type Lesson,
  type QuizItem,
  type Unit,
} from "./schemas";
import {
  findBlocks,
  findComponentNames,
  findDerivations,
  findElements,
  findEsmLines,
  findHeadings,
  findJsxTags,
  findMathSpans,
  findStickyUses,
  maskNonProse,
  parseStringList,
  splitFrontmatter,
  type DerivationInfo,
} from "./mdx-scan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A file as read from disk; `path` is POSIX and relative to the repo root. */
export interface RawFile {
  path: string;
  text: string;
}

export interface Finding {
  file: string;
  line?: number;
  message: string;
}

/** A typed document with its provenance. `body` is empty for YAML entries. */
export interface Doc<T> {
  file: string;
  data: T;
  body: string;
  /** 1-based line where `body` starts in the file (MDX) or the item's index label (YAML). */
  bodyLine: number;
  /** For list files: the 0-based index of the item in its file. */
  index?: number;
}

export interface ContentSet {
  units: Doc<Unit>[];
  lessons: Doc<Lesson>[];
  glossary: Doc<GlossaryTerm>[];
  nodes: Doc<GraphNode>[];
  edges: Doc<GraphEdge>[];
  quizzes: Doc<QuizItem>[];
  flashcards: Doc<Flashcard>[];
  cases: Doc<Case>[];
  homework: Doc<Homework>[];
}

export interface ValidationResult {
  errors: Finding[];
  warnings: Finding[];
}

export interface ValidateOptions {
  /** "Today" for the homework due-date checks (defaults to the real clock). */
  now?: Date;
  /** Allowed MDX component names (defaults to the contract list in names.ts). */
  componentNames?: readonly string[];
}

export const CONTENT_ROOT = "src/content";

export function emptyContentSet(): ContentSet {
  return {
    units: [],
    lessons: [],
    glossary: [],
    nodes: [],
    edges: [],
    quizzes: [],
    flashcards: [],
    cases: [],
    homework: [],
  };
}

// ---------------------------------------------------------------------------
// Parsing: RawFile[] → ContentSet (+ schema errors)
// ---------------------------------------------------------------------------

type Kind =
  | "units"
  | "lesson"
  | "glossary"
  | "nodes"
  | "edges"
  | "quizzes"
  | "flashcards"
  | "case"
  | "homework"
  | "ignore"
  | "misplaced";

function classify(path: string, root: string): Kind {
  if (!path.startsWith(`${root}/`)) return "ignore";
  const rel = path.slice(root.length + 1);
  const base = rel.split("/").pop() ?? "";
  if (base.startsWith(".") || base === "README.md") return "ignore";
  if (rel === "units.yaml" || rel === "units.yml") return "units";
  if (rel === "graph/nodes.yaml" || rel === "graph/nodes.yml") return "nodes";
  if (rel === "graph/edges.yaml" || rel === "graph/edges.yml") return "edges";
  const isMdx = rel.endsWith(".mdx");
  const isYaml = rel.endsWith(".yaml") || rel.endsWith(".yml");
  if (!isMdx && !isYaml) return "ignore";
  const [dir] = rel.split("/");
  const depth = rel.split("/").length;
  if (dir === "units" && isMdx && depth === 3) return "lesson";
  if (dir === "glossary" && isMdx && depth === 2) return "glossary";
  if (dir === "cases" && isMdx && depth === 2) return "case";
  if (dir === "homework" && isMdx && depth === 2) return "homework";
  if (dir === "quizzes" && isYaml && depth === 2) return "quizzes";
  if (dir === "flashcards" && isYaml && depth === 2) return "flashcards";
  return "misplaced";
}

function basename(path: string): string {
  const b = path.split("/").pop() ?? path;
  return b.replace(/\.[^.]+$/, "");
}

function issueFindings(
  file: string,
  error: z.ZodError,
  label: string,
  line?: number,
): Finding[] {
  return error.issues.map((issue) => {
    const where = issue.path.length
      ? issue.path.map(String).join(".")
      : "(root)";
    const f: Finding = { file, message: `${label}${where}: ${issue.message}` };
    if (line !== undefined) f.line = line;
    return f;
  });
}

function parseYamlSafe(file: string, text: string, errors: Finding[]): unknown {
  try {
    return parseYaml(text) ?? null;
  } catch (e) {
    errors.push({
      file,
      message: `YAML parse error: ${(e as Error).message.split("\n")[0] ?? ""}`,
    });
    return undefined;
  }
}

function parseMdx<T>(
  file: string,
  text: string,
  schema: z.ZodType<T>,
  errors: Finding[],
): Doc<T> | undefined {
  const { frontmatter, body, bodyLine } = splitFrontmatter(text);
  if (frontmatter === null) {
    errors.push({ file, line: 1, message: "missing frontmatter (--- … ---)" });
    return undefined;
  }
  const raw = parseYamlSafe(file, frontmatter, errors);
  if (raw === undefined) return undefined;
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    errors.push(...issueFindings(file, parsed.error, "frontmatter.", 1));
    return undefined;
  }
  return { file, data: parsed.data, body, bodyLine };
}

function parseList<T>(
  file: string,
  text: string,
  schema: z.ZodType<T[]>,
  errors: Finding[],
  label: string,
): Doc<T>[] {
  const raw = parseYamlSafe(file, text, errors);
  if (raw === undefined) return [];
  if (raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push({ file, message: `${label} file must be a YAML list` });
    return [];
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success)
    return parsed.data.map((data, index) => ({
      file,
      data,
      body: "",
      bodyLine: 1,
      index,
    }));
  // Report per item so the id is visible when it exists.
  for (const issue of parsed.error.issues) {
    const [idx, ...rest] = issue.path;
    const item =
      typeof idx === "number"
        ? (raw[idx] as Record<string, unknown> | undefined)
        : undefined;
    const id = item && typeof item["id"] === "string" ? item["id"] : undefined;
    const who =
      typeof idx === "number"
        ? `item ${idx + 1}${id ? ` (${id})` : ""}`
        : label;
    const where = rest.length ? rest.map(String).join(".") : "(item)";
    errors.push({ file, message: `${who}: ${where}: ${issue.message}` });
  }
  return [];
}

/** Turn raw files into typed documents; schema and YAML failures become errors. */
export function parseContent(
  files: RawFile[],
  root: string = CONTENT_ROOT,
): { content: ContentSet; errors: Finding[]; warnings: Finding[] } {
  const content = emptyContentSet();
  const errors: Finding[] = [];
  const warnings: Finding[] = [];

  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const kind = classify(f.path, root);
    switch (kind) {
      case "ignore":
        break;
      case "misplaced":
        warnings.push({
          file: f.path,
          message:
            "file is not in a known collection location (see docs/CONTENT_AUTHORING.md §1); ignored",
        });
        break;
      case "units": {
        const raw = parseYamlSafe(f.path, f.text, errors);
        if (raw === undefined || raw === null) break;
        if (!Array.isArray(raw)) {
          errors.push({
            file: f.path,
            message: "units.yaml must be a YAML list",
          });
          break;
        }
        raw.forEach((item, index) => {
          const parsed = unitSchema.safeParse(item);
          if (parsed.success)
            content.units.push({
              file: f.path,
              data: parsed.data,
              body: "",
              bodyLine: 1,
              index,
            });
          else
            errors.push(
              ...issueFindings(f.path, parsed.error, `unit ${index + 1}: `),
            );
        });
        break;
      }
      case "nodes": {
        const raw = parseYamlSafe(f.path, f.text, errors);
        if (raw === undefined || raw === null) break;
        if (!Array.isArray(raw)) {
          errors.push({
            file: f.path,
            message: "nodes.yaml must be a YAML list",
          });
          break;
        }
        raw.forEach((item, index) => {
          const parsed = graphNodeSchema.safeParse(item);
          const id = (item as Record<string, unknown> | null)?.["id"];
          if (parsed.success)
            content.nodes.push({
              file: f.path,
              data: parsed.data,
              body: "",
              bodyLine: 1,
              index,
            });
          else
            errors.push(
              ...issueFindings(
                f.path,
                parsed.error,
                `node ${index + 1}${typeof id === "string" ? ` (${id})` : ""}: `,
              ),
            );
        });
        break;
      }
      case "edges": {
        const raw = parseYamlSafe(f.path, f.text, errors);
        if (raw === undefined || raw === null) break;
        if (!Array.isArray(raw)) {
          errors.push({
            file: f.path,
            message: "edges.yaml must be a YAML list",
          });
          break;
        }
        raw.forEach((item, index) => {
          const parsed = graphEdgeSchema.safeParse(item);
          if (parsed.success)
            content.edges.push({
              file: f.path,
              data: parsed.data,
              body: "",
              bodyLine: 1,
              index,
            });
          else
            errors.push(
              ...issueFindings(f.path, parsed.error, `edge ${index + 1}: `),
            );
        });
        break;
      }
      case "quizzes": {
        const unit = basename(f.path);
        for (const doc of parseList(
          f.path,
          f.text,
          quizFileSchema,
          errors,
          "quiz",
        )) {
          doc.data.unit = unit;
          content.quizzes.push(doc);
        }
        break;
      }
      case "flashcards": {
        const unit = basename(f.path);
        for (const doc of parseList(
          f.path,
          f.text,
          flashcardFileSchema,
          errors,
          "flashcard",
        )) {
          doc.data.unit = unit;
          content.flashcards.push(doc);
        }
        break;
      }
      case "lesson": {
        const doc = parseMdx(f.path, f.text, lessonSchema, errors);
        if (doc) content.lessons.push(doc);
        break;
      }
      case "glossary": {
        const doc = parseMdx(f.path, f.text, glossarySchema, errors);
        if (doc) content.glossary.push(doc);
        break;
      }
      case "case": {
        const doc = parseMdx(f.path, f.text, caseSchema, errors);
        if (doc) content.cases.push(doc);
        break;
      }
      case "homework": {
        const doc = parseMdx(f.path, f.text, homeworkSchema, errors);
        if (doc) content.homework.push(doc);
        break;
      }
    }
  }
  return { content, errors, warnings };
}

// ---------------------------------------------------------------------------
// Validation: ContentSet → findings
// ---------------------------------------------------------------------------

const NUMERIC_ANSWER_MATH_RE = /(?:=|\\approx)\s*(?:\\[,;:!]\s*)*-?\d+\.\d+/;
const NUMERIC_ANSWER_PROSE_RE =
  /\banswer(?:\s+is)?\s*(?:[:=]\s*)?-?\d+(?:\.\d+)?\b/i;
const SOLUTION_HEADING_RE = /walkthrough|solution/i;
const MAX_STEPS = 15;

function startOfDayUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

class Collector {
  errors: Finding[] = [];
  warnings: Finding[] = [];
  error(file: string, message: string, line?: number) {
    this.errors.push(
      line === undefined ? { file, message } : { file, line, message },
    );
  }
  warn(file: string, message: string, line?: number) {
    this.warnings.push(
      line === undefined ? { file, message } : { file, line, message },
    );
  }
}

function itemLabel<T extends { id: string }>(doc: Doc<T>): string {
  return doc.index === undefined
    ? ""
    : `item ${doc.index + 1} (${doc.data.id}): `;
}

function checkUnique(
  out: Collector,
  what: string,
  items: { id: string; file: string; line?: number }[],
): Set<string> {
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const it of items) {
    const prev = seen.get(it.id);
    if (prev !== undefined) {
      out.error(
        it.file,
        `duplicate ${what} id "${it.id}" (also in ${prev})`,
        it.line,
      );
    } else {
      seen.set(it.id, it.file);
      ids.add(it.id);
    }
  }
  return ids;
}

interface LessonIndex {
  byId: Map<string, Doc<Lesson>>;
  bySlug: Map<string, Doc<Lesson>[]>;
}

function indexLessons(lessons: Doc<Lesson>[]): LessonIndex {
  const byId = new Map<string, Doc<Lesson>>();
  const bySlug = new Map<string, Doc<Lesson>[]>();
  for (const l of lessons) {
    byId.set(lessonId(l.data), l);
    const arr = bySlug.get(l.data.slug) ?? [];
    arr.push(l);
    bySlug.set(l.data.slug, arr);
  }
  return { byId, bySlug };
}

/** Resolve a lesson reference written as `<unit>/<slug>` or a bare slug. */
function resolveLesson(
  index: LessonIndex,
  ref: string,
): { doc?: Doc<Lesson>; reason?: string } {
  if (ref.includes("/")) {
    const doc = index.byId.get(ref);
    return doc ? { doc } : { reason: `no lesson with id "${ref}"` };
  }
  const matches = index.bySlug.get(ref) ?? [];
  if (matches.length === 1 && matches[0]) return { doc: matches[0] };
  if (matches.length === 0) return { reason: `no lesson with slug "${ref}"` };
  return {
    reason: `lesson slug "${ref}" is ambiguous (${matches.map((m) => lessonId(m.data)).join(", ")}); write <unit>/<slug>`,
  };
}

interface LessonScan {
  doc: Doc<Lesson>;
  derivations: DerivationInfo[];
}

/** Find a cycle in a directed graph; returns the node sequence (closing on the first node) or null. */
export function findCycle(
  adjacency: Map<string, Set<string>>,
): string[] | null {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  const nodes = [...adjacency.keys()].sort();
  const visit = (u: string): string[] | null => {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of [...(adjacency.get(u) ?? [])].sort()) {
      const c = color.get(v) ?? WHITE;
      if (c === GRAY) {
        const start = stack.indexOf(v);
        return [...stack.slice(start), v];
      }
      if (c === WHITE) {
        const found = visit(v);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(u, BLACK);
    return null;
  };
  for (const n of nodes) {
    if ((color.get(n) ?? WHITE) === WHITE) {
      const found = visit(n);
      if (found) return found;
    }
  }
  return null;
}

/** Run every cross-document check. Pure: no IO, no clock unless `now` is omitted. */
export function validateContent(
  content: ContentSet,
  options: ValidateOptions = {},
): ValidationResult {
  const out = new Collector();
  const now = options.now ?? new Date();
  const allowedComponents = new Set(
    options.componentNames ?? mdxComponentNames,
  );
  const lineOf = (doc: Doc<unknown>, bodyLineNo: number) =>
    doc.bodyLine + bodyLineNo - 1;

  // ---- ids and uniqueness -------------------------------------------------
  const unitIds = checkUnique(
    out,
    "unit",
    content.units.map((u) => ({ id: u.data.id, file: u.file })),
  );
  const glossaryIds = checkUnique(
    out,
    "glossary",
    content.glossary.map((g) => ({ id: g.data.id, file: g.file, line: 1 })),
  );
  const nodeIds = checkUnique(
    out,
    "graph node",
    content.nodes.map((n) => ({ id: n.data.id, file: n.file })),
  );
  const caseIds = checkUnique(
    out,
    "case",
    content.cases.map((c) => ({ id: c.data.id, file: c.file, line: 1 })),
  );
  const homeworkIds = checkUnique(
    out,
    "homework",
    content.homework.map((h) => ({ id: h.data.id, file: h.file, line: 1 })),
  );
  const quizIds = checkUnique(
    out,
    "quiz item",
    content.quizzes.map((q) => ({ id: q.data.id, file: q.file })),
  );
  checkUnique(
    out,
    "flashcard",
    content.flashcards.map((c) => ({ id: c.data.id, file: c.file })),
  );
  checkUnique(
    out,
    "graph edge",
    content.edges.map((e) => ({
      id: `${e.data.from}--${e.data.type}--${e.data.to}`,
      file: e.file,
    })),
  );

  // Glossary terms are graph nodes automatically, so the two namespaces must not overlap.
  for (const n of content.nodes) {
    if (glossaryIds.has(n.data.id)) {
      out.error(
        n.file,
        `node "${n.data.id}" is also a glossary term; glossary terms are nodes automatically`,
      );
    }
  }
  const conceptIds = new Set<string>([...nodeIds, ...glossaryIds]);

  for (const q of content.quizzes) {
    if (!q.data.id.startsWith("q-"))
      out.error(q.file, `${itemLabel(q)}quiz ids start with "q-"`);
  }
  for (const c of content.flashcards) {
    if (!c.data.id.startsWith("fc-"))
      out.error(c.file, `${itemLabel(c)}flashcard ids start with "fc-"`);
  }

  // File name ↔ id agreement for one-entry-per-file collections (Astro derives entry ids from file names).
  for (const g of content.glossary) {
    if (basename(g.file) !== g.data.id) {
      out.error(
        g.file,
        `glossary id "${g.data.id}" must equal the file name "${basename(g.file)}"`,
        1,
      );
    }
  }
  for (const c of content.cases) {
    if (basename(c.file) !== c.data.id) {
      out.error(
        c.file,
        `case id "${c.data.id}" must equal the file name "${basename(c.file)}"`,
        1,
      );
    }
  }
  for (const h of content.homework) {
    if (basename(h.file) !== h.data.id) {
      out.error(
        h.file,
        `homework id "${h.data.id}" must equal the file name "${basename(h.file)}"`,
        1,
      );
    }
  }

  // ---- lessons: ids, location, order ------------------------------------
  const lessonIndex = indexLessons(content.lessons);
  checkUnique(
    out,
    "lesson",
    content.lessons.map((l) => ({
      id: lessonId(l.data),
      file: l.file,
      line: 1,
    })),
  );
  for (const [slug, docs] of lessonIndex.bySlug) {
    if (docs.length > 1) {
      out.warn(
        docs[1]?.file ?? "",
        `lesson slug "${slug}" is used in ${docs.length} units; references by bare slug are ambiguous`,
        1,
      );
    }
  }
  const ordersByUnit = new Map<string, Map<number, string>>();
  for (const l of content.lessons) {
    const parts = l.file.split("/");
    const dirUnit = parts[parts.length - 2];
    const base = basename(l.file);
    if (dirUnit !== l.data.unit) {
      out.warn(
        l.file,
        `frontmatter unit "${l.data.unit}" differs from the directory "${dirUnit ?? ""}"`,
        1,
      );
    }
    const expectedBase = `${String(l.data.order).padStart(2, "0")}-${l.data.slug}`;
    if (base !== expectedBase) {
      out.warn(
        l.file,
        `lesson file should be named "${expectedBase}.mdx" (order and slug)`,
        1,
      );
    }
    const orders = ordersByUnit.get(l.data.unit) ?? new Map<number, string>();
    const prev = orders.get(l.data.order);
    if (prev)
      out.warn(l.file, `order ${l.data.order} is also used by ${prev}`, 1);
    else orders.set(l.data.order, l.file);
    ordersByUnit.set(l.data.unit, orders);
  }

  // ---- lesson bodies: components, stickies, derivations, definitions -----
  const scans: LessonScan[] = [];
  const derivationIds = new Map<
    string,
    { file: string; line: number; steps: number }
  >();
  const definitionIds = new Map<string, string>();
  const resultIds = new Map<string, string>();

  const checkBodyBasics = (
    doc: Doc<unknown>,
    what: string,
    esmIsError: boolean,
  ) => {
    for (const name of findComponentNames(doc.body)) {
      if (!allowedComponents.has(name)) {
        const tag = findJsxTags(maskNonProse(doc.body)).find(
          (t) => t.name.split(".")[0] === name,
        );
        out.error(
          doc.file,
          `unknown component ${name}; the contract is docs/CONTENT_AUTHORING.md §4`,
          tag ? lineOf(doc, tag.line) : undefined,
        );
      }
    }
    for (const line of findEsmLines(doc.body)) {
      const msg = `${what} files contain no import/export statements; components are provided globally`;
      if (esmIsError) out.error(doc.file, msg, lineOf(doc, line));
      else out.warn(doc.file, msg, lineOf(doc, line));
    }
    for (const use of findStickyUses(doc.body)) {
      if (!KEBAB_RE.test(use.id)) {
        out.error(
          doc.file,
          `[[${use.id}]] is not a kebab-case glossary id and will not render as a sticky note`,
          lineOf(doc, use.line),
        );
      } else if (!glossaryIds.has(use.id)) {
        out.error(
          doc.file,
          `unresolved [[${use.id}]]: no glossary term with id "${use.id}"`,
          lineOf(doc, use.line),
        );
      }
    }
  };

  for (const l of content.lessons) {
    checkBodyBasics(l, "lesson", true);
    const masked = maskNonProse(l.body);
    const tags = findJsxTags(masked);

    const derivations = findDerivations(l.body);
    scans.push({ doc: l, derivations });
    for (const d of derivations) {
      const line = lineOf(l, d.line);
      if (!d.id) {
        out.error(l.file, "Derivation is missing an id (der-…)", line);
      } else {
        if (!KEBAB_RE.test(d.id) || !d.id.startsWith("der-")) {
          out.error(
            l.file,
            `Derivation id "${d.id}" must be kebab-case and start with "der-"`,
            line,
          );
        }
        const prev = derivationIds.get(d.id);
        if (prev)
          out.error(
            l.file,
            `duplicate Derivation id "${d.id}" (also in ${prev.file}:${prev.line})`,
            line,
          );
        else
          derivationIds.set(d.id, {
            file: l.file,
            line,
            steps: d.steps.length,
          });
      }
      if (d.unclosed)
        out.error(
          l.file,
          `Derivation${d.id ? ` "${d.id}"` : ""} has no closing </Derivation>`,
          line,
        );
      const label = d.id ? `Derivation "${d.id}"` : "Derivation";
      if (!d.goalTex) out.warn(l.file, `${label} is missing goalTex`, line);
      if (!d.resultTex) out.warn(l.file, `${label} is missing resultTex`, line);
      if (!d.source)
        out.warn(l.file, `${label} is missing source (slide provenance)`, line);
      if (d.steps.length > MAX_STEPS) {
        out.warn(
          l.file,
          `${label} has ${d.steps.length} steps; chunk or collapse beyond ${MAX_STEPS}`,
          line,
        );
      }
      if (d.steps.length === 0)
        out.warn(l.file, `${label} has no <Step>s`, line);
      d.steps.forEach((s, i) => {
        const sLine = lineOf(l, s.line);
        if (!s.justification?.trim())
          out.warn(
            l.file,
            `${label} step ${i + 1} has no justification`,
            sLine,
          );
        if (s.sticky !== undefined && !glossaryIds.has(s.sticky)) {
          out.error(
            l.file,
            `${label} step ${i + 1}: sticky="${s.sticky}" is not a glossary id`,
            sLine,
          );
        }
      });
    }

    const idTags: {
      name: string;
      prefix: string;
      strict: boolean;
      map: Map<string, string>;
    }[] = [
      { name: "Definition", prefix: "def-", strict: true, map: definitionIds },
      { name: "Theorem", prefix: "thm-", strict: false, map: resultIds },
      { name: "Proposition", prefix: "prop-", strict: false, map: resultIds },
      { name: "Lemma", prefix: "lem-", strict: false, map: resultIds },
    ];
    for (const { name, prefix, strict, map } of idTags) {
      for (const t of tags) {
        if (t.name !== name || t.closing) continue;
        const line = lineOf(l, t.line);
        const id = t.attrs["id"];
        if (typeof id !== "string" || !id) {
          out.error(l.file, `${name} is missing an id (${prefix}…)`, line);
          continue;
        }
        if (!KEBAB_RE.test(id))
          out.error(l.file, `${name} id "${id}" must be kebab-case`, line);
        if (!id.startsWith(prefix)) {
          const msg = `${name} id "${id}" should start with "${prefix}"`;
          if (strict) out.error(l.file, msg, line);
          else out.warn(l.file, msg, line);
        }
        const prev = map.get(id);
        if (prev)
          out.error(
            l.file,
            `duplicate ${name} id "${id}" (also in ${prev})`,
            line,
          );
        else map.set(id, `${l.file}:${line}`);
      }
    }

    // Step tags outside any Derivation still need resolvable stickies.
    const inDerivation = new Set(
      derivations.flatMap((d) => d.steps.map((s) => s.line)),
    );
    for (const t of tags) {
      if (t.name !== "Step" || t.closing || inDerivation.has(t.line)) continue;
      const sticky = t.attrs["sticky"];
      if (typeof sticky === "string" && !glossaryIds.has(sticky)) {
        out.error(
          l.file,
          `sticky="${sticky}" is not a glossary id`,
          lineOf(l, t.line),
        );
      }
    }

    const widgets = findElements(tags, "Widget", masked.length).length;
    if (l.data.status === "published" && widgets < 1) {
      out.warn(l.file, "status is published but the lesson has no <Widget>", 1);
    }
  }

  for (const g of content.glossary) checkBodyBasics(g, "glossary", true);
  for (const c of content.cases) checkBodyBasics(c, "case", true);
  for (const h of content.homework) checkBodyBasics(h, "homework", true);

  // ---- references ----------------------------------------------------------
  for (const l of content.lessons) {
    const d = l.data;
    if (!unitIds.has(d.unit))
      out.error(l.file, `unit "${d.unit}" is not in src/content/units.yaml`, 1);
    for (const c of d.concepts) {
      if (!conceptIds.has(c))
        out.error(
          l.file,
          `concepts: "${c}" is neither a graph node nor a glossary term`,
          1,
        );
    }
    for (const p of d.prerequisites) {
      if (!conceptIds.has(p))
        out.error(
          l.file,
          `prerequisites: "${p}" is neither a graph node nor a glossary term`,
          1,
        );
      if (d.concepts.includes(p)) {
        out.error(
          l.file,
          `"${p}" is listed in both concepts and prerequisites (a lesson cannot require what it teaches)`,
          1,
        );
      }
    }
    for (const h of d.homework)
      if (!homeworkIds.has(h))
        out.error(l.file, `homework: no homework with id "${h}"`, 1);
    for (const c of d.cases)
      if (!caseIds.has(c))
        out.error(l.file, `cases: no case with id "${c}"`, 1);
  }

  for (const q of content.quizzes) {
    const d = q.data;
    const label = itemLabel(q);
    if (d.unit !== undefined && !unitIds.has(d.unit)) {
      out.error(q.file, `quiz file name "${d.unit}" is not a unit id`);
    }
    const res = resolveLesson(lessonIndex, d.lesson);
    if (!res.doc)
      out.error(q.file, `${label}lesson: ${res.reason ?? "unresolved"}`);
    else if (d.unit !== undefined && res.doc.data.unit !== d.unit) {
      out.warn(
        q.file,
        `${label}lesson "${d.lesson}" belongs to unit "${res.doc.data.unit}", not "${d.unit}"`,
      );
    }
    for (const c of d.concepts) {
      if (!conceptIds.has(c))
        out.error(
          q.file,
          `${label}concepts: "${c}" is neither a graph node nor a glossary term`,
        );
    }
    for (const c of d.discriminates ?? []) {
      if (!conceptIds.has(c))
        out.warn(
          q.file,
          `${label}discriminates: "${c}" is neither a graph node nor a glossary term`,
        );
    }
    if (d.type === "which-step") {
      const der = derivationIds.get(d.derivation);
      if (!der)
        out.error(
          q.file,
          `${label}derivation: no <Derivation id="${d.derivation}"> in any lesson`,
        );
      else if (d.corrupt.step > der.steps) {
        out.error(
          q.file,
          `${label}corrupt.step ${d.corrupt.step} exceeds the ${der.steps} steps of "${d.derivation}"`,
        );
      }
    }
  }

  for (const c of content.flashcards) {
    const d = c.data;
    const label = itemLabel(c);
    if (d.unit !== undefined && !unitIds.has(d.unit)) {
      out.error(c.file, `flashcard file name "${d.unit}" is not a unit id`);
    }
    const res = resolveLesson(lessonIndex, d.lesson);
    if (!res.doc)
      out.error(c.file, `${label}lesson: ${res.reason ?? "unresolved"}`);
    else if (d.unit !== undefined && res.doc.data.unit !== d.unit) {
      out.warn(
        c.file,
        `${label}lesson "${d.lesson}" belongs to unit "${res.doc.data.unit}", not "${d.unit}"`,
      );
    }
    if (!conceptIds.has(d.concept)) {
      out.error(
        c.file,
        `${label}concept: "${d.concept}" is neither a graph node nor a glossary term`,
      );
    }
    if (d.derivationStep) {
      const [derId, stepStr] = d.derivationStep.split("#");
      const der = derId ? derivationIds.get(derId) : undefined;
      if (!der)
        out.error(
          c.file,
          `${label}derivationStep: no <Derivation id="${derId ?? ""}"> in any lesson`,
        );
      else if (Number(stepStr) < 1 || Number(stepStr) > der.steps) {
        out.error(
          c.file,
          `${label}derivationStep: step ${stepStr ?? ""} is outside 1–${der.steps} of "${derId ?? ""}"`,
        );
      }
    }
  }

  const taughtBy = new Map<string, string[]>();
  for (const l of content.lessons) {
    for (const c of l.data.concepts)
      taughtBy.set(c, [...(taughtBy.get(c) ?? []), lessonId(l.data)]);
  }
  for (const n of content.nodes) {
    const d = n.data;
    const label = `node "${d.id}": `;
    if (!unitIds.has(d.unit))
      out.error(
        n.file,
        `${label}unit "${d.unit}" is not in src/content/units.yaml`,
      );
    if (d.lesson !== undefined) {
      const res = resolveLesson(lessonIndex, d.lesson);
      if (!res.doc)
        out.error(n.file, `${label}lesson: ${res.reason ?? "unresolved"}`);
    } else if (!taughtBy.has(d.id)) {
      out.warn(
        n.file,
        `${label}no lesson teaches it (no \`lesson\` field and no lesson lists it in concepts)`,
      );
    }
    if (d.derivation !== undefined && !derivationIds.has(d.derivation)) {
      out.warn(
        n.file,
        `${label}derivation "${d.derivation}" is not (yet) a <Derivation> in any lesson`,
      );
    }
  }

  for (const e of content.edges) {
    const d = e.data;
    const label = `edge ${d.from} --${d.type}--> ${d.to}: `;
    if (!conceptIds.has(d.from))
      out.error(
        e.file,
        `${label}"${d.from}" is neither a graph node nor a glossary term`,
      );
    if (!conceptIds.has(d.to))
      out.error(
        e.file,
        `${label}"${d.to}" is neither a graph node nor a glossary term`,
      );
    if (d.from === d.to) out.error(e.file, `${label}self-loop`);
  }

  for (const h of content.homework) {
    for (const u of h.data.units) {
      if (!unitIds.has(u))
        out.error(h.file, `units: "${u}" is not in src/content/units.yaml`, 1);
    }
  }
  for (const c of content.cases) {
    for (const ref of c.data.usedIn) {
      const res = resolveLesson(lessonIndex, ref);
      if (!res.doc)
        out.error(c.file, `usedIn: ${res.reason ?? "unresolved"}`, 1);
    }
  }
  for (const g of content.glossary) {
    for (const r of g.data.related) {
      if (!glossaryIds.has(r))
        out.warn(g.file, `related: no glossary term with id "${r}"`, 1);
    }
    if (g.data.firstUsedIn !== undefined && !unitIds.has(g.data.firstUsedIn)) {
      out.error(
        g.file,
        `firstUsedIn: "${g.data.firstUsedIn}" is not in src/content/units.yaml`,
        1,
      );
    }
  }

  // In-body references that point at other collections (soft: content may land in either order).
  for (const l of content.lessons) {
    const tags = findJsxTags(maskNonProse(l.body));
    for (const t of tags) {
      if (t.closing) continue;
      const line = lineOf(l, t.line);
      if (t.name === "Check") {
        for (const id of parseStringList(t.attrs["ids"])) {
          if (!quizIds.has(id))
            out.warn(
              l.file,
              `<Check> references unknown quiz item "${id}"`,
              line,
            );
        }
      } else if (t.name === "HomeworkBridge") {
        const hw = t.attrs["hw"];
        if (typeof hw === "string" && !homeworkIds.has(hw)) {
          out.warn(
            l.file,
            `<HomeworkBridge> references unknown homework "${hw}"`,
            line,
          );
        }
        for (const s of parseStringList(t.attrs["skills"])) {
          if (!conceptIds.has(s))
            out.warn(
              l.file,
              `<HomeworkBridge> skill "${s}" is neither a graph node nor a glossary term`,
              line,
            );
        }
      } else if (t.name === "Example") {
        const c = t.attrs["case"];
        if (typeof c === "string" && !caseIds.has(c))
          out.warn(l.file, `<Example> references unknown case "${c}"`, line);
      }
    }
  }

  // ---- graph: the `requires` relation must be acyclic ------------------------
  const requires = new Map<string, Set<string>>();
  const edgeSource = new Map<string, string>();
  const addRequires = (from: string, to: string, file: string) => {
    if (!requires.has(from)) requires.set(from, new Set());
    if (!requires.has(to)) requires.set(to, new Set());
    requires.get(from)?.add(to);
    if (!edgeSource.has(`${from}>${to}`)) edgeSource.set(`${from}>${to}`, file);
  };
  for (const e of content.edges)
    if (e.data.type === "requires") addRequires(e.data.from, e.data.to, e.file);
  for (const l of content.lessons) {
    for (const p of l.data.prerequisites)
      for (const c of l.data.concepts) if (p !== c) addRequires(p, c, l.file);
  }
  const cycle = findCycle(requires);
  if (cycle) {
    const first = `${cycle[0] ?? ""}>${cycle[1] ?? ""}`;
    out.error(
      edgeSource.get(first) ??
        content.edges[0]?.file ??
        `${CONTENT_ROOT}/graph/edges.yaml`,
      `the requires relation has a cycle: ${cycle.join(" → ")}`,
    );
  }

  // ---- homework safety ------------------------------------------------------
  const today = startOfDayUtc(now);
  const liveHomework = new Set<string>();
  for (const h of content.homework) {
    const due = Date.parse(`${h.data.due}T00:00:00Z`);
    if (h.data.live) {
      liveHomework.add(h.data.id);
      if (due < today)
        out.warn(h.file, `live: true but due ${h.data.due} is in the past`, 1);
      for (const hd of findHeadings(h.body)) {
        if (SOLUTION_HEADING_RE.test(hd.text)) {
          out.error(
            h.file,
            `live homework must not contain a solution section ("${hd.text}")`,
            lineOf(h, hd.line),
          );
        }
      }
      for (const m of findMathSpans(h.body)) {
        if (NUMERIC_ANSWER_MATH_RE.test(m.tex)) {
          out.error(
            h.file,
            "live homework must not contain a numeric answer in math",
            lineOf(h, m.line),
          );
        }
      }
      maskNonProse(h.body, { math: false })
        .split("\n")
        .forEach((text, i) => {
          if (NUMERIC_ANSWER_PROSE_RE.test(text)) {
            out.error(
              h.file,
              "live homework must not state a numeric answer",
              lineOf(h, i + 1),
            );
          }
        });
    } else if (due > today) {
      out.warn(h.file, `live: false but due ${h.data.due} is in the future`, 1);
    }
  }
  for (const l of content.lessons) {
    if (!l.data.homework.some((h) => liveHomework.has(h))) continue;
    for (const ex of findBlocks(l.body, "Example")) {
      const hit =
        findMathSpans(ex.inner).find((m) =>
          NUMERIC_ANSWER_MATH_RE.test(m.tex),
        ) ??
        maskNonProse(ex.inner, { math: false })
          .split("\n")
          .map((text, i) => ({ text, line: i + 1 }))
          .find(({ text }) => NUMERIC_ANSWER_PROSE_RE.test(text));
      if (hit) {
        out.warn(
          l.file,
          "this lesson feeds a live homework and an <Example> states a numeric result; make sure it is not a homework answer (VISION R17)",
          lineOf(l, ex.innerLine + hit.line - 1),
        );
      }
    }
  }

  return { errors: out.errors, warnings: out.warnings };
}

// ---------------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------------

export interface ContentCounts {
  units: number;
  lessons: number;
  glossary: number;
  nodes: number;
  edges: number;
  quizzes: number;
  flashcards: number;
  cases: number;
  homework: number;
}

export function countContent(content: ContentSet): ContentCounts {
  return {
    units: content.units.length,
    lessons: content.lessons.length,
    glossary: content.glossary.length,
    nodes: content.nodes.length,
    edges: content.edges.length,
    quizzes: content.quizzes.length,
    flashcards: content.flashcards.length,
    cases: content.cases.length,
    homework: content.homework.length,
  };
}

export interface RunResult extends ValidationResult {
  content: ContentSet;
  counts: ContentCounts;
}

/** Parse and validate in one go. */
export function runValidation(
  files: RawFile[],
  options: ValidateOptions & { root?: string } = {},
): RunResult {
  const parsed = parseContent(files, options.root ?? CONTENT_ROOT);
  const checked = validateContent(parsed.content, options);
  return {
    content: parsed.content,
    counts: countContent(parsed.content),
    errors: [...parsed.errors, ...checked.errors],
    warnings: [...parsed.warnings, ...checked.warnings],
  };
}

/** The one-line summary printed by the CLI. */
export function summaryLine(result: RunResult): string {
  const c = result.counts;
  const plural = (n: number, s: string, p = `${s}s`) =>
    `${n} ${n === 1 ? s : p}`;
  return (
    `validate:content: ${plural(result.errors.length, "error")}, ${plural(result.warnings.length, "warning")} across ` +
    [
      plural(c.lessons, "lesson"),
      plural(c.glossary, "glossary term"),
      plural(c.nodes, "graph node"),
      plural(c.edges, "graph edge"),
      plural(c.quizzes, "quiz item"),
      plural(c.flashcards, "flashcard"),
      plural(c.cases, "case"),
      plural(c.homework, "homework bridge"),
      plural(c.units, "unit"),
    ].join(", ")
  );
}
