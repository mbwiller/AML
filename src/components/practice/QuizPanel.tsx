/**
 * Quiz tab: pick units and a count, then answer interleaved items one at a
 * time (src/lib/practice/interleave.ts), graded with src/lib/graders exactly
 * as the inline checks are. A wrong answer links to the pitfall or the
 * derivation step that fixes it. Every graded answer is stored as an attempt
 * (it feeds concept mastery).
 */
import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';

import {
  grade,
  hashSeed,
  sampleSeededParams,
  type GradableItem,
  type SeededInstance,
} from '@/lib/graders';
import { buildQuiz, freshSeed } from '@/lib/practice/interleave';
import { applyAttempt, attemptId, type StoredAttempt } from '@/lib/practice/store';
import type { QuizBank, QuizClientItem } from '@/lib/practice/types';

import type { PracticeContext } from './context';

const DEFAULT_COUNT = 10;

interface Answer {
  correct: boolean;
  /** Chosen option / step index, or the typed text. */
  given: number | string;
  misconception?: string | undefined;
}

type Phase =
  | { kind: 'setup' }
  | { kind: 'running'; seed: number; items: QuizClientItem[]; index: number; answers: Answer[] }
  | { kind: 'done'; seed: number; items: QuizClientItem[]; answers: Answer[] };

/** Fresh numbers for a seeded numeric item, from the quiz seed (VISION §9.5). */
function instanceFor(item: QuizClientItem, seed: number): SeededInstance | undefined {
  if (item.type !== 'numeric' || !item.seeded || !item.formula) return undefined;
  try {
    return sampleSeededParams(item, (seed ^ hashSeed(item.id)) >>> 0);
  } catch {
    return undefined; // a formula the evaluator rejects: keep the prompt's own numbers
  }
}

export function QuizPanel({ ctx }: { ctx: PracticeContext }) {
  const [bank, setBank] = useState<QuizBank | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [units, setUnits] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });

  useEffect(() => {
    let cancelled = false;
    fetch('/practice/quiz.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<QuizBank>;
      })
      .then((b) => {
        if (cancelled) return;
        setBank(b);
        setUnits(new Set(b.units.map((u) => u.id)));
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pool = useMemo(
    () => (bank ? bank.items.filter((i) => units.has(i.unit)) : []),
    [bank, units],
  );

  if (loadError) {
    return (
      <p className="pr-note" role="alert">
        The quiz bank could not be loaded ({loadError}).
      </p>
    );
  }
  if (!bank) {
    return (
      <p className="pr-note" aria-busy="true">
        Loading the quiz bank…
      </p>
    );
  }

  const start = (e: SyntheticEvent) => {
    e.preventDefault();
    const seed = freshSeed();
    const items = buildQuiz(pool, { units: [...units], count, seed });
    if (items.length === 0) return;
    setPhase({ kind: 'running', seed, items, index: 0, answers: [] });
  };

  if (phase.kind === 'setup') {
    const max = Math.max(1, pool.length);
    return (
      <form className="pr-quiz-setup" onSubmit={start} aria-label="Build a quiz">
        <fieldset className="pr-fieldset">
          <legend className="pr-legend">Units</legend>
          <div className="pr-unit-list">
            {bank.units.map((u) => {
              const n = bank.items.filter((i) => i.unit === u.id).length;
              return (
                <label key={u.id} className="pr-check">
                  <input
                    type="checkbox"
                    checked={units.has(u.id)}
                    onChange={(e) => {
                      const next = new Set(units);
                      if (e.target.checked) next.add(u.id);
                      else next.delete(u.id);
                      setUnits(next);
                    }}
                  />
                  <span>
                    Unit {u.number}: {u.title}
                    <span className="pr-muted"> · {n} items</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="pr-field">
          <label htmlFor="pr-quiz-count" className="pr-label">
            Questions
          </label>
          <input
            id="pr-quiz-count"
            className="pr-input pr-input-narrow"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
          />
          <span className="pr-muted">interleaved by concept, confusable pairs side by side</span>
        </div>
        <div className="pr-actions">
          <button
            type="submit"
            className="pr-button pr-button-primary"
            disabled={pool.length === 0}
          >
            Start quiz
          </button>
          {pool.length === 0 && <span className="pr-muted">Choose at least one unit.</span>}
        </div>
      </form>
    );
  }

  if (phase.kind === 'done') {
    return (
      <QuizResults
        items={phase.items}
        answers={phase.answers}
        onAgain={() => setPhase({ kind: 'setup' })}
      />
    );
  }

  const item = phase.items[phase.index];
  if (!item) return null;
  return (
    <QuizItemView
      key={`${phase.seed}-${phase.index}`}
      item={item}
      number={phase.index + 1}
      total={phase.items.length}
      seeded={instanceFor(item, phase.seed)}
      onGraded={async (answer) => {
        const at = Date.now();
        const attempt: StoredAttempt = {
          id: attemptId(item.id, at),
          itemId: item.id,
          unit: item.unit,
          concepts: item.concepts,
          correct: answer.correct,
          at,
          ...(answer.misconception ? { misconception: answer.misconception } : {}),
          quizSeed: phase.seed,
        };
        try {
          await ctx.store.addAttempt(attempt);
          ctx.update((d) => applyAttempt(d, attempt));
        } catch {
          /* the quiz still works; mastery just misses this attempt */
        }
      }}
      onNext={(answer) => {
        const answers = [...phase.answers, answer];
        if (phase.index + 1 >= phase.items.length) {
          setPhase({ kind: 'done', seed: phase.seed, items: phase.items, answers });
        } else {
          setPhase({ ...phase, index: phase.index + 1, answers });
        }
      }}
    />
  );
}

function QuizItemView({
  item,
  number,
  total,
  seeded,
  onGraded,
  onNext,
}: {
  item: QuizClientItem;
  number: number;
  total: number;
  seeded: SeededInstance | undefined;
  onGraded: (a: Answer) => Promise<void>;
  onNext: (a: Answer) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<(Answer & { message?: string | undefined }) | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const name = `pr-q-${item.id}`;
  const params = seeded?.params;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (result && !result.message) nextRef.current?.focus();
  }, [result]);

  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (result && !result.message) return;
    const given = item.type === 'numeric' ? text : choice;
    const r = grade(item as GradableItem, given ?? '', { params });
    if (!r.supported) return;
    if (r.message) {
      setResult({ correct: false, given: given ?? '', message: r.message });
      return;
    }
    const answer: Answer = {
      correct: r.correct,
      given: given ?? '',
      misconception: r.misconception,
    };
    setResult(answer);
    void onGraded(answer);
  };

  const graded = result && !result.message ? result : null;
  const chosenOption = item.type === 'mc' && choice !== null ? item.options[choice] : undefined;
  const pitfall = graded && !graded.correct ? chosenOption?.pitfallHref : undefined;
  const explanation = (graded && chosenOption?.explanationHtml) || item.explanationHtml;

  return (
    <form
      className="pr-quiz-item"
      onSubmit={submit}
      data-quiz-item={item.id}
      data-quiz-type={item.type}
      data-quiz-state={graded ? (graded.correct ? 'correct' : 'incorrect') : 'idle'}
      noValidate
    >
      <p className="pr-card-meta">
        <span>
          Question {number} of {total}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Lesson {item.lessonNumber} {item.lessonTitle}
        </span>
      </p>
      <h2 className="pr-quiz-prompt" ref={headingRef} tabIndex={-1} id={`${name}-prompt`}>
        <span className="sr-only">
          Question {number} of {total}.{' '}
        </span>
        <span dangerouslySetInnerHTML={{ __html: item.promptHtml }} />
      </h2>

      {item.type === 'numeric' && params && Object.keys(params).length > 0 && (
        <p className="pr-params">
          Use these values instead:{' '}
          <code>
            {Object.entries(params)
              .map(([k, v]) => `${k} = ${v}`)
              .join(', ')}
          </code>
        </p>
      )}

      {(item.type === 'mc' || item.type === 'which-step') && (
        <fieldset className="pr-options" aria-labelledby={`${name}-prompt`} disabled={!!graded}>
          <legend className="sr-only">{item.type === 'mc' ? 'Options' : 'Steps'}</legend>
          {(item.type === 'mc'
            ? item.options.map((o, i) => ({ key: i, html: o.html, step: undefined }))
            : item.steps.map((s, i) => ({ key: i, html: s.html, step: s.number }))
          ).map((o) => {
            const isRight =
              graded &&
              (item.type === 'mc'
                ? item.options[o.key]?.correct === true
                : o.key === item.corrupt.step - 1);
            return (
              <label
                key={o.key}
                className="pr-option"
                data-correct={isRight ? 'true' : undefined}
                data-chosen={choice === o.key ? 'true' : undefined}
              >
                <input
                  type="radio"
                  name={name}
                  value={o.key}
                  checked={choice === o.key}
                  onChange={() => {
                    setChoice(o.key);
                    if (result?.message) setResult(null);
                  }}
                />
                {o.step !== undefined && (
                  <span className="pr-step-number" aria-hidden="true">
                    {o.step}
                  </span>
                )}
                {o.step !== undefined && <span className="sr-only">Step {o.step}: </span>}
                <span className="pr-option-text" dangerouslySetInnerHTML={{ __html: o.html }} />
                {isRight && <span className="sr-only"> (the answer)</span>}
              </label>
            );
          })}
        </fieldset>
      )}

      {item.type === 'numeric' && (
        <div className="pr-field">
          <label htmlFor={`${name}-input`} className="pr-label">
            Your answer
          </label>
          <input
            id={`${name}-input`}
            className="pr-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={text}
            readOnly={!!graded}
            aria-invalid={result?.message ? true : undefined}
            aria-describedby={`${name}-hint ${name}-feedback`}
            onChange={(e) => {
              setText(e.target.value);
              if (result?.message) setResult(null);
            }}
          />
          <p className="pr-hint pr-hint-block" id={`${name}-hint`}>
            {item.hint}
          </p>
        </div>
      )}

      <div className="pr-feedback" id={`${name}-feedback`} role="status" aria-live="polite">
        {result?.message && <p className="pr-verdict pr-verdict-invalid">{result.message}</p>}
        {graded && (
          <>
            <p
              className={`pr-verdict ${graded.correct ? 'pr-verdict-correct' : 'pr-verdict-incorrect'}`}
            >
              <span aria-hidden="true">{graded.correct ? '✓' : '✗'}</span>{' '}
              {graded.correct ? 'Correct.' : 'Not quite.'}
              {!graded.correct && item.type === 'numeric' && (
                <span className="pr-muted"> The key is {expected(item, seeded)}.</span>
              )}
              {!graded.correct && item.type === 'which-step' && (
                <span className="pr-muted"> The changed step is step {item.corrupt.step}.</span>
              )}
            </p>
            {explanation && (
              <div className="pr-explanation" dangerouslySetInnerHTML={{ __html: explanation }} />
            )}
            {!graded.correct && (pitfall || item.derivationLink) && (
              <p className="pr-links">
                {pitfall && <a href={pitfall}>See the pitfall</a>}
                {item.derivationLink && (
                  <a href={item.derivationLink.href}>{item.derivationLink.label}</a>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <div className="pr-actions">
        {!graded ? (
          <button type="submit" className="pr-button pr-button-primary">
            Check
          </button>
        ) : (
          <button
            type="button"
            ref={nextRef}
            className="pr-button pr-button-primary"
            onClick={() => onNext(graded)}
          >
            {number === total ? 'See results' : 'Next question'}
          </button>
        )}
      </div>
    </form>
  );
}

/** The key at the shown parameters, to a readable precision. */
function expected(item: QuizClientItem & { type: 'numeric' }, seeded?: SeededInstance): string {
  return Number((seeded?.answer ?? item.answer).toPrecision(6)).toString();
}

function QuizResults({
  items,
  answers,
  onAgain,
}: {
  items: QuizClientItem[];
  answers: Answer[];
  onAgain: () => void;
}) {
  const right = answers.filter((a) => a.correct).length;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section className="pr-results" aria-labelledby="pr-results-title" data-quiz-results>
      <h2 className="pr-h2" id="pr-results-title" ref={headingRef} tabIndex={-1}>
        {right} of {items.length} correct
      </h2>
      <ol className="pr-result-list">
        {items.map((item, i) => {
          const a = answers[i];
          return (
            <li key={item.id} className="pr-result" data-correct={a?.correct ? 'true' : 'false'}>
              <span className="pr-result-mark" aria-hidden="true">
                {a?.correct ? '✓' : '✗'}
              </span>
              <span className="sr-only">{a?.correct ? 'Correct: ' : 'Incorrect: '}</span>
              <span className="pr-result-text">
                <span dangerouslySetInnerHTML={{ __html: item.promptHtml }} />
                {!a?.correct && item.derivationLink && (
                  <>
                    {' '}
                    <a href={item.derivationLink.href}>{item.derivationLink.label}</a>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="pr-actions">
        <button type="button" className="pr-button pr-button-primary" onClick={onAgain}>
          New quiz
        </button>
      </div>
    </section>
  );
}
