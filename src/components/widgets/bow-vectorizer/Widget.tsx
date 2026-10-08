/**
 * `bow-vectorizer` (lesson 6.2; rebuilds L9 p.12's bag-of-words column,
 * pp.13–15's CountVectorizer `fit_transform` / `vocabulary_`, and p.16's
 * counts, stemming, and stop words): fit a vocabulary on a seeded sample of
 * NOTES reports, then type or pick a report and see its tokens, what
 * stop-word removal and a tiny stemmer do to them, the sparse vector over
 * the fitted vocabulary (binary or counts), the words that get no column,
 * and the vocabulary size before and after preprocessing.
 *
 * The text processing is in `math.ts`, the NOTES access in `data.ts`, the
 * fit/transform pipeline in `pipeline.ts`. Colors come only from
 * `useVizTheme()`. See README.md.
 */
import { Shuffle } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { VOCABULARY_SIZE } from '@/lib/datasets/notes-vocabulary';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { CLASSES } from './data';
import { params as paramsSchema, type Params } from './manifest';
import { NEGATIONS, type ProcessedToken } from './math';
import { defaultText, fitFor, vectorizeText } from './pipeline';
import './styles.css';

export { manifest } from './manifest';

const figureStateSchema = paramsSchema.partial();
const nf = new Intl.NumberFormat('en-US');

const STRIP_W = 320;
const STRIP_H = 36;

type TokenState = 'kept' | 'stemmed' | 'stop' | 'dropped';

function tokenState(t: ProcessedToken, index: ReadonlyMap<string, number>): TokenState {
  if (t.term === null) return 'stop';
  if (!index.has(t.term)) return 'dropped';
  return t.stemmed ? 'stemmed' : 'kept';
}

function tokenLabel(t: ProcessedToken, state: TokenState, column: number | undefined): string {
  switch (state) {
    case 'stop':
      return `${t.raw}: stop word, removed`;
    case 'dropped':
      return `${t.term ?? t.raw}: no column, dropped`;
    case 'stemmed':
      return `${t.raw}: stemmed to ${t.term ?? ''}, column ${column ?? ''}`;
    case 'kept':
      return `${t.raw}: column ${column ?? ''}`;
  }
}

export default function BowVectorizer({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const textareaId = useId();

  const doc = useMemo(
    () => defaultText({ seed: params.seed, report: params.report }),
    [params.seed, params.report],
  );
  const [text, setText] = useState(doc.text);
  const [docId, setDocId] = useState(doc.id);
  if (docId !== doc.id) {
    // The held-out report changed (seed or "Another report"): refill the textbox.
    setDocId(doc.id);
    setText(doc.text);
  }

  // A revealed <Step figureState> may set any param and, with `text`, the textbox.
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

  const fit = useMemo(
    () =>
      fitFor({
        trainSize: params.trainSize,
        seed: params.seed,
        removeStopWords: params.removeStopWords,
        stem: params.stem,
      }),
    [params.trainSize, params.seed, params.removeStopWords, params.stem],
  );
  const result = useMemo(
    () =>
      vectorizeText(text, fit.vocab, {
        binary: params.binary,
        removeStopWords: params.removeStopWords,
        stem: params.stem,
      }),
    [text, fit, params.binary, params.removeStopWords, params.stem],
  );

  const { vector, tokens } = result;
  const V = vector.size;
  const nnz = vector.entries.length;
  const zeroShare = V > 0 ? 1 - nnz / V : 1;
  const maxValue = Math.max(1, ...vector.entries.map(([, v]) => v));
  const removedNegations = params.removeStopWords
    ? [...new Set(tokens.filter((t) => t.term === null && NEGATIONS.has(t.raw)).map((t) => t.raw))]
    : [];
  const preprocessing = params.removeStopWords || params.stem;
  const presentColumns = useMemo(() => new Set(vector.entries.map(([j]) => j)), [vector]);

  const mapTex = params.binary
    ? String.raw`\phi(x) \in \{0, 1\}^{|V|},\quad \phi(x)_j = \min\big(c_j(x), 1\big),\quad |V| = ${V}`
    : String.raw`\phi_{\text{count}}(x) \in \{0, 1, 2, \dots\}^{|V|},\quad \phi_{\text{count}}(x)_j = c_j(x),\quad |V| = ${V}`;

  return (
    <div className="bowv" data-binary={params.binary ? 'on' : 'off'} data-vocab-size={V}>
      <div className="bowv-input">
        <label htmlFor={textareaId} className="bowv-label">
          Report to vectorize (transform)
        </label>
        <textarea
          id={textareaId}
          className="bowv-textarea"
          rows={4}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          spellCheck={false}
        />
        <div className="bowv-actions">
          <button
            type="button"
            className="widget-btn"
            onClick={() => set('report')((params.report + 1) % 1000)}
          >
            <Shuffle size={14} aria-hidden="true" />
            Another held-out report
          </button>
          <span className="bowv-muted">
            {doc.id} · labelled {CLASSES[doc.y]}
            {text !== doc.text ? ' · edited' : ''}
          </span>
        </div>

        <p className="bowv-label">
          {tokens.length} tokens (lowercased runs of two or more letters or digits)
        </p>
        <ul className="bowv-tokens" aria-label="Tokens of the report and what happened to each">
          {tokens.map((t, i) => {
            const state = tokenState(t, fit.vocab.index);
            const column = t.term === null ? undefined : fit.vocab.index.get(t.term);
            return (
              <li
                key={`${i}-${t.raw}`}
                className={`bowv-token bowv-token-${state}`}
                aria-label={tokenLabel(t, state, column)}
              >
                {state === 'stemmed' ? (
                  <>
                    {t.raw}
                    <span aria-hidden="true"> → </span>
                    <strong>{t.term}</strong>
                  </>
                ) : (
                  t.raw
                )}
              </li>
            );
          })}
        </ul>
        <p className="bowv-key" aria-hidden="true">
          <span className="bowv-token bowv-token-kept">has a column</span>
          <span className="bowv-token bowv-token-stemmed">
            stemmed → <strong>root</strong>
          </span>
          <span className="bowv-token bowv-token-stop">stop word</span>
          <span className="bowv-token bowv-token-dropped">no column</span>
        </p>
      </div>

      <div className="bowv-output">
        <dl className="bowv-stats" data-testid="bowv-stats">
          <dt>Vocabulary fitted on</dt>
          <dd>{params.trainSize} NOTES reports</dd>
          <dt>Words the NOTES generator can use</dt>
          <dd>{nf.format(VOCABULARY_SIZE)}</dd>
          <dt>|V| before preprocessing</dt>
          <dd data-testid="bowv-vocab-raw">{nf.format(fit.raw.terms.length)}</dd>
          <dt>|V| {preprocessing ? 'after preprocessing' : '(no preprocessing)'}</dt>
          <dd data-testid="bowv-vocab">{nf.format(V)}</dd>
        </dl>

        <div className="bowv-math">
          <MathLabel tex={mapTex} display />
        </div>

        <svg
          className="bowv-strip"
          viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          data-layer="strip"
        >
          <rect width={STRIP_W} height={STRIP_H} fill={theme.surface2} />
          <g stroke={theme.viz[1]} strokeWidth={2}>
            {vector.entries.map(([j, v]) => {
              const x = (STRIP_W * (j + 0.5)) / Math.max(V, 1);
              return <line key={j} x1={x} x2={x} y1={STRIP_H} y2={STRIP_H * (1 - v / maxValue)} />;
            })}
          </g>
        </svg>
        <p className="bowv-summary" data-testid="bowv-summary">
          {nnz} of {nf.format(V)} entries nonzero ({(100 * zeroShare).toFixed(1)}% zeros) · sum of
          entries {vector.sum}
        </p>

        <div className="bowv-entries-wrap">
          <table className="bowv-entries" data-testid="bowv-entries">
            <caption>Nonzero entries, by column (the sparse row)</caption>
            <thead>
              <tr>
                <th scope="col">column j</th>
                <th scope="col">word</th>
                <th scope="col">{params.binary ? 'φ(x)ⱼ' : 'cⱼ(x)'}</th>
              </tr>
            </thead>
            <tbody>
              {vector.entries.map(([j, v]) => (
                <tr key={j} data-word={fit.vocab.terms[j]}>
                  <td>{j}</td>
                  <td>{fit.vocab.terms[j]}</td>
                  <td className={v > 1 ? 'bowv-multi' : undefined}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bowv-status" role="status" aria-live="polite">
          {vector.dropped.length > 0 ? (
            <div data-testid="bowv-dropped">
              <p>
                No column, dropped by transform (never in the {params.trainSize} training reports):
              </p>
              <ul className="bowv-chips" aria-label="Words with no column">
                {vector.dropped.map((w) => (
                  <li key={w} className="bowv-token bowv-token-dropped">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="bowv-muted">Every kept word has a column.</p>
          )}
          {removedNegations.length > 0 ? (
            <p className="bowv-warn" data-testid="bowv-negations">
              Stop-word removal also deleted {removedNegations.map((w) => `“${w}”`).join(', ')}: “no
              prior chemotherapy” and “prior chemotherapy” now give the same vector.
            </p>
          ) : null}
        </div>
      </div>

      <div className="bowv-controls">
        <div className="bowv-toggles">
          <Toggle label="Binary (0/1)" checked={params.binary} onChange={set('binary')} />
          <Toggle
            label="Remove stop words"
            checked={params.removeStopWords}
            onChange={set('removeStopWords')}
          />
          <Toggle label="Stem (suffix stripping)" checked={params.stem} onChange={set('stem')} />
        </div>
        <Param
          label="Training reports"
          tex="n"
          value={params.trainSize}
          min={5}
          max={200}
          step={5}
          defaultValue={initial.trainSize}
          onChange={set('trainSize')}
        />
        <details className="bowv-vocab">
          <summary>Fitted vocabulary ({nf.format(V)} words, sorted; bold: in this report)</summary>
          <ol className="bowv-vocab-list" start={0}>
            {fit.vocab.terms.map((w, j) => (
              <li key={w} className={presentColumns.has(j) ? 'bowv-present' : undefined}>
                {w}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}
