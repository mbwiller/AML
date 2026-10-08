/**
 * `bow-nb-scorer` (lesson 6.3; rebuilds L9 p.12's bag-of-words column and
 * pp.35–38's `nb_predictions` in log space): type a report; see its
 * bag-of-words chips; a Bernoulli Naive Bayes fitted on a seeded subsample of
 * NOTES scores it word by word (log ψ_j1/ψ_j0 bars), with the running log
 * posterior odds, P(serious | x), and, with Laplace smoothing off, the exact
 * log 0 = −∞ failure spelled out.
 *
 * The math is in `math.ts`; the dataset and the cached fits in `data.ts`.
 * Colors come only from `useVizTheme()`. See README.md.
 */
import { Shuffle } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { CLASSES, NOTES_SIZE, VOCABULARY, WORD_INDEX, modelFor, noteText, reportRow } from './data';
import { formatSigned } from './fallback';
import { params as paramsSchema, type Params } from './manifest';
import { score, splitWords, topVotes, type ZeroEvent } from './math';

export { manifest } from './manifest';

const FORMULA =
  String.raw`\log\frac{\Prob(y=\htmlClass{sym-pos}{1}\mid x)}{\Prob(y=\htmlClass{sym-neg}{0}\mid x)}` +
  String.raw` = \log\frac{\phi_1}{\phi_0}` +
  String.raw` + \sum_{j:\,x_j=1}\log\frac{\psi_{j1}}{\psi_{j0}}` +
  String.raw` + \sum_{j:\,x_j=0}\log\frac{1-\psi_{j1}}{1-\psi_{j0}}`;

const figureStateSchema = paramsSchema.partial();

const nf = new Intl.NumberFormat('en-US');

const plural = (n: number, noun: string) => `${nf.format(n)} ${noun}${n === 1 ? '' : 's'}`;

function describeZero(e: ZeroEvent, nk: readonly [number, number]): string {
  const word = VOCABULARY[e.j] ?? '?';
  const cls = CLASSES[e.k];
  const count = nf.format(nk[e.k]);
  return e.kind === 'present'
    ? `“${word}” appears in 0 of the ${count} ${cls} training reports, so ψ̂ = 0 and log ψ̂ = −∞: the ${cls} likelihood is exactly 0.`
    : `“${word}” appears in every one of the ${count} ${cls} training reports, so ψ̂ = 1 and its absence gives log(1 − ψ̂) = −∞: the ${cls} likelihood is exactly 0.`;
}

export default function BowNbScorer({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const textareaId = useId();

  const row = useMemo(() => reportRow(params.seed, params.report), [params.seed, params.report]);
  const [text, setText] = useState(() => noteText(row));
  const [rowId, setRowId] = useState(row.id);
  if (rowId !== row.id) {
    // The seeded report changed (seed or "Another report"): refill the textarea.
    setRowId(row.id);
    setText(noteText(row));
  }

  // A revealed <Step figureState> may set any param and, optionally, the text.
  // The text is applied during render (derived state); the params through the
  // host's setter in an effect, since that updates the host, not this island.
  const [appliedFigureState, setAppliedFigureState] = useState<unknown>(figureState);
  if (figureState !== appliedFigureState) {
    setAppliedFigureState(figureState);
    const nextText = (figureState as { text?: unknown } | null | undefined)?.text;
    if (typeof nextText === 'string') setText(nextText);
  }
  useEffect(() => {
    if (!figureState || typeof figureState !== 'object') return;
    const rest: Record<string, unknown> = { ...(figureState as Record<string, unknown>) };
    delete rest.text;
    const parsed = figureStateSchema.safeParse(rest);
    if (!parsed.success) return;
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ) as Partial<Params>;
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams]);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  const model = useMemo(
    () => modelFor(params.trainSize, params.seed, params.smoothing),
    [params.trainSize, params.seed, params.smoothing],
  );
  const words = useMemo(() => splitWords(text, WORD_INDEX), [text]);
  const result = useMemo(() => score(model, words.tokens), [model, words.tokens]);
  const bars = useMemo(() => topVotes(result.votes, params.maxWords), [result, params.maxWords]);

  const finiteMags = bars.map((v) => Math.abs(v.vote)).filter(Number.isFinite);
  const maxMag = Math.max(1e-9, ...finiteMags);
  const absentCount = model.d - result.present.length;
  const presentSum = result.votes.reduce((a, v) => a + v.vote, 0);
  const decision = Number.isNaN(result.logOdds)
    ? 'undefined (0/0)'
    : result.logOdds > 0
      ? CLASSES[1]
      : CLASSES[0];
  const failing = !params.smoothing && result.zeroEvents.length > 0;

  return (
    <div className="bnb">
      <div className="bnb-input">
        <label htmlFor={textareaId} className="bnb-label">
          Report text
        </label>
        <textarea
          id={textareaId}
          className="bnb-textarea"
          rows={4}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          spellCheck={false}
        />
        <div className="bnb-actions">
          <button
            type="button"
            className="widget-btn"
            onClick={() => set('report')((params.report + 1) % NOTES_SIZE)}
          >
            <Shuffle size={14} aria-hidden="true" />
            Another report
          </button>
          <span className="bnb-report-id">
            {row.id} · labelled {CLASSES[row.y]}
          </span>
        </div>

        <div className="bnb-chips-block">
          <p className="bnb-label">
            Bag of words: {result.present.length} of {nf.format(model.d)} vocabulary words present
          </p>
          <ul className="bnb-chips" aria-label="Words of the report that are in the vocabulary">
            {result.present.map((j) => (
              <li key={j} className="bnb-chip">
                {VOCABULARY[j]}
              </li>
            ))}
          </ul>
          {words.unknown.length > 0 ? (
            <p className="bnb-unknown">
              Not in vocabulary (ignored):{' '}
              {words.unknown.map((w, i) => (
                <span key={w}>
                  {i > 0 ? ', ' : ''}
                  <span className="bnb-chip bnb-chip-unknown">{w}</span>
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <div className="bnb-params">
          <Toggle
            label="Laplace smoothing (add one)"
            checked={params.smoothing}
            onChange={set('smoothing')}
          />
          <Param
            label="Training reports"
            tex="n"
            value={params.trainSize}
            min={200}
            max={6000}
            step={100}
            defaultValue={initial.trainSize}
            onChange={set('trainSize')}
            format={(v) => nf.format(v)}
          />
          <Param
            label="Bars shown"
            value={params.maxWords}
            min={3}
            max={30}
            step={1}
            defaultValue={initial.maxWords}
            onChange={set('maxWords')}
          />
        </div>
      </div>

      <div className="bnb-ledger">
        <div className="bnb-math">
          <MathLabel tex={FORMULA} display />
        </div>

        <p className="bnb-label">
          Largest votes among the {plural(result.present.length, 'present word')} (bar length is
          relative; dashed means infinite)
        </p>
        <ol className="bnb-bars" aria-label="Per-word votes, largest first">
          {bars.map((v) => {
            const infinite = !Number.isFinite(v.vote);
            const nan = Number.isNaN(v.vote);
            const serious = !nan && v.vote > 0;
            const frac = infinite ? 1 : Math.abs(v.vote) / maxMag;
            const width = `${(frac * 50).toFixed(2)}%`;
            const left = serious ? '50%' : `${(50 - frac * 50).toFixed(2)}%`;
            const color = serious ? theme.positive : theme.negative;
            return (
              <li key={v.j} className="bnb-bar-row">
                <span className="bnb-word">{VOCABULARY[v.j]}</span>
                <span className="bnb-track" aria-hidden="true">
                  <span
                    className={infinite ? 'bnb-fill bnb-fill-inf' : 'bnb-fill'}
                    data-layer="vote"
                    style={{ left, width, backgroundColor: color, borderColor: color }}
                  />
                </span>
                <span className="bnb-value">
                  {formatSigned(v.vote)}{' '}
                  <span className="bnb-dir">
                    {nan ? 'both 0' : serious ? 'serious' : 'non-serious'}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <dl className="bnb-sum">
          <dt>Prior, log φ₁/φ₀</dt>
          <dd>{formatSigned(result.priorTerm)}</dd>
          <dt>{plural(absentCount, 'absent word')}</dt>
          <dd>{formatSigned(result.absentTerm)}</dd>
          <dt>{plural(result.present.length, 'present word')}</dt>
          <dd>{formatSigned(presentSum)}</dd>
          <dt className="bnb-total">Log posterior odds</dt>
          <dd className="bnb-total" data-testid="bnb-score">
            {formatSigned(result.logOdds)}
          </dd>
          <dt className="bnb-total">P(serious | x)</dt>
          <dd className="bnb-total" data-testid="bnb-posterior">
            {Number.isNaN(result.posterior) ? 'undefined' : result.posterior.toFixed(3)}
          </dd>
          <dt>Decision</dt>
          <dd data-testid="bnb-decision">{decision}</dd>
        </dl>

        <div className="bnb-status" role="status" aria-live="polite">
          {failing ? (
            <div className="bnb-failure" data-testid="bnb-failure">
              <p className="bnb-failure-title">log 0 = −∞ without smoothing</p>
              <ul>
                {result.zeroEvents.slice(0, 3).map((e) => (
                  <li key={`${e.j}-${e.k}-${e.kind}`}>{describeZero(e, model.nk)}</li>
                ))}
              </ul>
              {result.zeroEvents.length > 3 ? (
                <p>…and {result.zeroEvents.length - 3} more such words.</p>
              ) : null}
              <p>
                {Number.isNaN(result.logOdds)
                  ? 'Both likelihoods are 0, so the posterior is 0/0: undefined.'
                  : `Whatever the other ${Math.max(result.present.length - 1, 0)} words say, that class is impossible. Turn smoothing on: ψ̂ becomes (count + 1)/(n_k + 2) and every vote is finite.`}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
