/**
 * Pure helpers for homework bridges (VISION.md §7 "Homework bridge", §9.9;
 * framework-free, unit-tested). Resolves a readiness-gate skill id to the
 * lessons that teach it, the derivation that establishes it, and the quiz
 * items that practice it, by reading lesson frontmatter, the concept graph,
 * the quiz bank, and the lesson bodies (for `<Derivation id>` and
 * `<Check ids>`). Never touches answers: only ids and links (R17).
 *
 * Astro-dependent loading lives in `src/lib/site.ts` (`bridgeContext()`).
 */
import {
  findDerivations,
  findJsxTags,
  maskNonProse,
  parseStringList,
} from '@/lib/content/mdx-scan';
import { labelFromId } from '@/lib/markdown/numbering';

/** Where a practice item without an inline check sends the reader. */
export const PRACTICE_HREF = '/practice';

export interface BridgeLesson {
  /** Canonical `<unit>/<slug>`. */
  id: string;
  slug: string;
  unit: string;
  title: string;
  /** "6.3" */
  number: string;
  href: string;
  concepts: readonly string[];
  /** Raw MDX body, scanned for `<Derivation id>` and `<Check ids>`. */
  body: string;
}

export interface BridgeNode {
  id: string;
  label: string;
  unit: string;
  lesson?: string | undefined;
  derivation?: string | undefined;
}

export interface BridgeQuiz {
  id: string;
  concepts: readonly string[];
}

export interface BridgeContext {
  /** In course order. */
  lessons: BridgeLesson[];
  nodes: Map<string, BridgeNode>;
  /** Glossary id → term (glossary terms may be skills too). */
  glossary: Map<string, string>;
  quizzes: BridgeQuiz[];
  /** Derivation id → the lesson whose body defines it. */
  derivations: Map<string, BridgeLesson>;
  /** Quiz item id → the first lesson (course order) with a `<Check>` that includes it. */
  checks: Map<string, BridgeLesson>;
}

export interface BridgeInput {
  lessons: BridgeLesson[];
  nodes: BridgeNode[];
  glossary: { id: string; term: string }[];
  quizzes: BridgeQuiz[];
}

/** Index the lesson bodies once; the result answers every skill on every page. */
export function buildBridgeContext(input: BridgeInput): BridgeContext {
  const derivations = new Map<string, BridgeLesson>();
  const checks = new Map<string, BridgeLesson>();
  for (const lesson of input.lessons) {
    for (const d of findDerivations(lesson.body)) {
      if (d.id && !derivations.has(d.id)) derivations.set(d.id, lesson);
    }
    for (const tag of findJsxTags(maskNonProse(lesson.body))) {
      if (tag.name !== 'Check' || tag.closing) continue;
      for (const id of parseStringList(tag.attrs['ids'])) {
        if (!checks.has(id)) checks.set(id, lesson);
      }
    }
  }
  return {
    lessons: input.lessons,
    nodes: new Map(input.nodes.map((n) => [n.id, n])),
    glossary: new Map(input.glossary.map((g) => [g.id, g.term])),
    quizzes: input.quizzes,
    derivations,
    checks,
  };
}

export interface LessonLink {
  href: string;
  number: string;
  title: string;
}

export interface PracticeLink {
  id: string;
  href: string;
  /** True when the item is an inline `<Check>` in a lesson (else it goes to /practice). */
  inline: boolean;
}

export interface SkillResolution {
  id: string;
  label: string;
  /** False when the id is neither a graph node nor a glossary term. */
  known: boolean;
  lessons: LessonLink[];
  derivation: { id: string; label: string; href: string } | undefined;
  practice: PracticeLink[];
}

function link(lesson: BridgeLesson, hash?: string): LessonLink {
  return {
    href: hash ? `${lesson.href}#${hash}` : lesson.href,
    number: lesson.number,
    title: lesson.title,
  };
}

/**
 * Resolve one skill id:
 * - lessons: every lesson whose `concepts` include it, in course order; the
 *   node's `lesson` field adds its lesson (preferring the node's unit when a
 *   slug repeats) if frontmatter missed it;
 * - derivation: the node's `derivation`, linked at its anchor in the lesson
 *   whose body defines it (omitted when no lesson defines it);
 * - practice: quiz items whose `concepts` include it; each links to the
 *   inline `<Check>` that carries it (`#check-<id>`), else to /practice.
 */
export function resolveSkill(ctx: BridgeContext, skill: string): SkillResolution {
  const node = ctx.nodes.get(skill);
  const term = ctx.glossary.get(skill);

  const lessons = ctx.lessons.filter((l) => l.concepts.includes(skill));
  if (node?.lesson) {
    const candidates = ctx.lessons.filter((l) => l.slug === node.lesson);
    const home = candidates.find((l) => l.unit === node.unit) ?? candidates[0];
    if (home && !lessons.includes(home)) {
      lessons.push(home);
      lessons.sort((a, b) => ctx.lessons.indexOf(a) - ctx.lessons.indexOf(b));
    }
  }

  const derId = node?.derivation;
  const derLesson = derId ? ctx.derivations.get(derId) : undefined;
  const derivation =
    derId && derLesson
      ? { id: derId, label: labelFromId(derId), href: `${derLesson.href}#${derId}` }
      : undefined;

  const practice = ctx.quizzes
    .filter((q) => q.concepts.includes(skill))
    .map((q): PracticeLink => {
      const host = ctx.checks.get(q.id);
      return host
        ? { id: q.id, href: `${host.href}#check-${q.id}`, inline: true }
        : { id: q.id, href: PRACTICE_HREF, inline: false };
    })
    .sort((a, b) => Number(b.inline) - Number(a.inline) || a.id.localeCompare(b.id));

  return {
    id: skill,
    label: node?.label ?? term ?? skill.replace(/-/g, ' '),
    known: Boolean(node ?? term),
    lessons: lessons.map((l) => link(l)),
    derivation,
    practice,
  };
}

/** Where a bare quiz id (as written in a homework table) links: its inline check, else /practice. */
export function practiceHref(ctx: BridgeContext, quizId: string): string {
  const host = ctx.checks.get(quizId);
  return host ? `${host.href}#check-${quizId}` : PRACTICE_HREF;
}

/** Quiz ids as written in homework tables: `q-u6-l3-009`. */
export const QUIZ_ID_RE = /\bq-u\d+-l\d+-\d{3}\b/g;

export type HomeworkState = 'live' | 'past' | 'upcoming';

/**
 * `live` when the frontmatter says so (R17 is the author's call, not the
 * clock's); otherwise `past` once the due date has passed, else `upcoming`.
 */
export function homeworkState(hw: { due: string; live: boolean }, today: Date): HomeworkState {
  if (hw.live) return 'live';
  const due = Date.parse(`${hw.due}T23:59:59Z`);
  return due < today.getTime() ? 'past' : 'upcoming';
}

/** True when the due date is before `today` (calendar days, UTC). */
export function isPastDue(due: string, today: Date): boolean {
  return Date.parse(`${due}T23:59:59Z`) < today.getTime();
}

/**
 * Link every bare quiz id in an HTML fragment (a homework table cell) to
 * where it is practiced. Only text outside tags and outside existing links
 * is touched, so attributes and hand-written links survive.
 */
export function linkQuizIds(html: string, hrefOf: (id: string) => string): string {
  let inLink = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) inLink++;
        else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1);
        return part;
      }
      if (inLink > 0) return part;
      return part.replace(
        QUIZ_ID_RE,
        (id) => `<a href="${hrefOf(id)}" data-practice-item="${id}"><code>${id}</code></a>`,
      );
    })
    .join('');
}

/** The course's homework calendar (docs/course-map/00-course-overview.md), for the /homework index. */
export const COURSE_HOMEWORK: readonly { id: string; title: string; due: string }[] = [
  { id: 'hw0', title: 'Homework 0', due: '2026-09-02' },
  { id: 'hw1', title: 'Homework 1', due: '2026-09-16' },
  { id: 'hw2', title: 'Homework 2', due: '2026-10-05' },
  { id: 'hw3', title: 'Homework 3', due: '2026-10-19' },
  { id: 'hw4', title: 'Homework 4', due: '2026-11-18' },
  { id: 'hw5', title: 'Homework 5', due: '2026-12-07' },
];

/** `2026-10-19` → `Monday, October 19, 2026` (UTC, so the build machine's zone never shifts it). */
export function formatDueDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
