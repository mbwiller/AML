/**
 * The quiz bank as the practice island needs it (VISION.md §7 "Practice",
 * §9.5): every gradable item of a visible lesson, with prompt, options,
 * explanations, and which-step lists rendered to KaTeX HTML at build time,
 * the grader's client copy, and the links a wrong answer offers, resolved to
 * lesson URLs (`#pitfall-<misconception>`, `#der-…-step-n`).
 *
 * Gradable today: `mc`, `numeric`, `which-step` (the graders in
 * src/lib/graders). Other types are left out until they have graders; the
 * quiz builder never samples an item it cannot grade. Pure and deterministic.
 */
import { findBlocks } from '@/lib/content/mdx-scan';
import type { GraphNode, QuizItem, Unit } from '@/lib/content/schemas';
import { buildWhichStep, extractDerivationSteps } from '@/lib/graders';
import { NUMERIC_FORMAT_HINT } from '@/lib/graders/numeric';
import { derivationTargets } from '@/lib/graders/targets';
import { isNavigable, lessonHref, lessonNumber } from '@/lib/lessons';
import { renderDisplayTex } from '@/lib/markdown/render-tex';

import { deckUnits, derivationIndex, type LessonSource } from './cards';
import { renderProse } from './render';
import type { QuizBank, QuizClientItem } from './types';

export interface QuizBankInput {
  items: QuizItem[];
  lessons: LessonSource[];
  units: Unit[];
  nodes?: Pick<GraphNode, 'id' | 'derivation'>[];
  dev: boolean;
}

const prose = (text: string | undefined) => (text ? renderProse(text) : '');

const key = (l: LessonSource) => `${l.data.unit}/${l.data.slug}`;

export function buildQuizBank(input: QuizBankInput): QuizBank {
  const visible = input.lessons.filter((l) => isNavigable(l.data, input.dev));
  const visibleIds = new Set(visible.map(key));
  const derivations = derivationIndex(visible);
  const nodeDerivation = new Map<string, string>();
  for (const n of input.nodes ?? []) if (n.derivation) nodeDerivation.set(n.id, n.derivation);

  // misconception id → the lessons whose <Pitfall> carries it, in lesson order
  const pitfalls = new Map<string, LessonSource[]>();
  for (const l of visible) {
    for (const b of findBlocks(l.body, 'Pitfall')) {
      const m = b.attrs['misconception'];
      if (typeof m !== 'string') continue;
      const list = pitfalls.get(m) ?? [];
      list.push(l);
      pitfalls.set(m, list);
    }
  }

  const resolveLesson = (ref: string, unit: string | undefined) => {
    if (ref.includes('/')) return visible.find((l) => key(l) === ref);
    const matches = visible.filter((l) => l.data.slug === ref);
    return matches.find((l) => l.data.unit === unit) ?? matches[0];
  };

  const stepsFor = (derivationId: string): string[] | undefined => {
    for (const l of input.lessons) {
      const steps = extractDerivationSteps(l.body, derivationId);
      if (steps) return steps;
    }
    return undefined;
  };

  const linkFor = (targets: string[]) => {
    for (const t of targets) {
      const step = /^(.+)-step-(\d+)$/.exec(t);
      const der = step?.[1] ?? t;
      const lesson = derivations.get(der);
      if (!lesson || !visibleIds.has(key(lesson))) continue;
      const n = lessonNumber(lesson.data.unit, lesson.data.order);
      return {
        href: `${lessonHref(lesson.data.unit, lesson.data.slug)}#${t}`,
        label: step ? `Go to step ${step[2]} (Lesson ${n})` : `Go to the derivation (Lesson ${n})`,
      };
    }
    return undefined;
  };

  const pitfallHref = (misconception: string | undefined, own: LessonSource) => {
    if (!misconception) return undefined;
    const list = pitfalls.get(misconception);
    if (!list?.length) return undefined;
    const lesson = list.includes(own) ? own : list[0];
    return lesson
      ? `${lessonHref(lesson.data.unit, lesson.data.slug)}#pitfall-${misconception}`
      : undefined;
  };

  const out: QuizClientItem[] = [];
  for (const item of input.items) {
    const lesson = resolveLesson(item.lesson, item.unit);
    if (!lesson) continue;
    const base = {
      id: item.id,
      unit: lesson.data.unit,
      lesson: key(lesson),
      lessonNumber: lessonNumber(lesson.data.unit, lesson.data.order),
      lessonTitle: lesson.data.title,
      concepts: [...item.concepts],
      ...(item.discriminates?.length ? { discriminates: [...item.discriminates] } : {}),
      difficulty: item.difficulty,
    };
    switch (item.type) {
      case 'mc':
        out.push({
          ...base,
          type: 'mc',
          promptHtml: prose(item.prompt),
          explanationHtml: prose(item.explanation),
          derivationLink: linkFor(derivationTargets(item, nodeDerivation)),
          options: item.options.map((o) => ({
            html: renderProse(o.text),
            ...(o.correct ? { correct: true as const } : {}),
            ...(o.misconception ? { misconception: o.misconception } : {}),
            ...(o.explanation ? { explanationHtml: prose(o.explanation) } : {}),
            ...(o.misconception && pitfallHref(o.misconception, lesson)
              ? { pitfallHref: pitfallHref(o.misconception, lesson) }
              : {}),
          })),
        });
        break;
      case 'numeric': {
        const seeded = Boolean(item.seeded && item.formula);
        const tolerance = item.tolerance > 0 ? `within ±${item.tolerance}` : 'exact';
        out.push({
          ...base,
          type: 'numeric',
          promptHtml: prose(item.prompt),
          explanationHtml: prose(item.explanation),
          derivationLink: linkFor(derivationTargets(item, nodeDerivation)),
          answer: item.answer,
          tolerance: item.tolerance,
          ...(seeded ? { seeded: item.seeded, formula: item.formula } : {}),
          hint: `Enter ${NUMERIC_FORMAT_HINT}; ${tolerance}.`,
        });
        break;
      }
      case 'which-step': {
        const steps = stepsFor(item.derivation);
        const built = steps ? buildWhichStep(item, steps) : null;
        if (!built) break;
        out.push({
          ...base,
          type: 'which-step',
          promptHtml:
            prose(item.prompt) ||
            'One step of this derivation has been changed so that it is wrong. Which one?',
          explanationHtml: prose(item.corrupt.explanation),
          derivationLink: linkFor(
            derivationTargets(item, nodeDerivation, `${item.derivation}-step-${item.corrupt.step}`),
          ),
          steps: built.steps.map((s) => ({ number: s.number, html: renderDisplayTex(s.tex) })),
          corrupt: { step: item.corrupt.step },
        });
        break;
      }
      default:
        break; // no grader yet (match, order, predict, estimate, code-trace)
    }
  }

  const units = deckUnits(input.units).filter((u) => out.some((i) => i.unit === u.id));
  return { version: 1, items: out, units };
}
