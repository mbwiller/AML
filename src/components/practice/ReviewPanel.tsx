/**
 * Review tab: today's FSRS queue, one card at a time. Space reveals the back
 * (and, once revealed, rates Good); 1–4 rate Again / Hard / Good / Easy.
 * Every rating is written to the store before the next card shows, and a
 * polite live region says what happened and how many cards are left.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { localDay } from '@/lib/practice/due-summary';
import { buildQueue, nextCard, queueSize } from '@/lib/practice/queue';
import {
  formatInterval,
  newCardState,
  preview,
  RATING_LABEL,
  RATINGS,
  review,
  type RatingName,
} from '@/lib/practice/scheduler';
import { applyMeta, applyReview, reviewId, type StoredCard } from '@/lib/practice/store';

import { cardStates, NEW_TODAY_KEY, newTodayCount, type PracticeContext } from './context';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function ReviewPanel({
  ctx,
  active,
  onQuiz,
}: {
  ctx: PracticeContext;
  active: boolean;
  onQuiz: () => void;
}) {
  const { deck, data, store, update } = ctx;
  const [clock, setClock] = useState(() => Date.now());
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Synchronous guard: a key pressed while a rating is being saved is ignored. */
  const busyRef = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const movedFocus = useRef(false);

  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck]);
  const ids = useMemo(() => deck.cards.map((c) => c.id), [deck]);
  const states = useMemo(() => cardStates(data), [data]);
  const newToday = newTodayCount(data, clock);
  const queue = useMemo(
    () => buildQueue({ deck: ids, states, now: clock, newToday }),
    [ids, states, clock, newToday],
  );
  const currentId = nextCard(queue);
  const card = currentId ? byId.get(currentId) : undefined;
  const left = queueSize(queue);

  // Refresh the clock every 30 s so learning cards come back on time.
  useEffect(() => {
    const t = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const revealed = currentId !== null && revealedFor === currentId;

  const previews = useMemo(() => {
    if (!currentId) return null;
    const state = states.get(currentId) ?? newCardState(clock);
    return preview(state, clock);
  }, [currentId, states, clock]);

  const reveal = useCallback(() => {
    if (!card) return;
    setRevealedFor(card.id);
    movedFocus.current = true;
  }, [card]);

  useEffect(() => {
    if (revealed && movedFocus.current) {
      movedFocus.current = false;
      backRef.current?.focus();
    }
  }, [revealed]);

  const rate = useCallback(
    async (rating: RatingName) => {
      if (!card || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const t = Date.now();
      const before = states.get(card.id) ?? newCardState(t);
      const { state, entry } = review(before, rating, t);
      const stored: StoredCard = { id: card.id, ...state, updatedAt: t };
      const log = { id: reviewId(card.id, t), cardId: card.id, ...entry };
      try {
        await store.saveReview(stored, log);
        let meta: Parameters<typeof applyMeta>[1] | null = null;
        if (before.phase === 'new') {
          meta = {
            key: NEW_TODAY_KEY,
            value: { day: localDay(t), count: newTodayCount(data, t) + 1 },
            updatedAt: t,
          };
          await store.setMeta(meta);
        }
        update((d) => {
          const next = applyReview(d, stored, log);
          return meta ? applyMeta(next, meta) : next;
        });
        setClock(t);
        setRevealedFor(null);
        const remaining = queueSize(
          buildQueue({
            deck: ids,
            states: new Map(states).set(card.id, state),
            now: t,
            newToday: newToday + (before.phase === 'new' ? 1 : 0),
          }),
        );
        setAnnouncement(
          `Rated ${RATING_LABEL[rating]}. Next review in ${formatInterval(state.due - t)}. ` +
            (remaining === 0
              ? 'That was the last card for now.'
              : `${remaining} card${remaining === 1 ? '' : 's'} left.`),
        );
        requestAnimationFrame(() => frontRef.current?.focus());
      } catch {
        setAnnouncement('That rating could not be saved. Try again.');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [card, states, store, update, data, ids, newToday],
  );

  // Keyboard: Space reveals (then rates Good), 1–4 rate. Only while this tab is shown.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      const onControl =
        e.target instanceof HTMLElement && e.target.closest('button, a, [role="tab"]') !== null;
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (onControl) return;
        e.preventDefault();
        if (busyRef.current) return;
        if (!revealed) reveal();
        else void rate('good');
        return;
      }
      if (!revealed) return;
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      const r = RATINGS[i];
      if (r) {
        e.preventDefault();
        void rate(r);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, revealed, reveal, rate]);

  const nextDue = useMemo(() => {
    let min = Infinity;
    for (const s of states.values()) if (s.phase !== 'new' && s.due < min) min = s.due;
    return Number.isFinite(min) ? min : null;
  }, [states]);

  return (
    <div className="pr-review">
      <p className="pr-counts" data-review-remaining={left}>
        <span className="pr-count">
          <strong>{queue.due.length}</strong> due
        </span>
        <span className="pr-count">
          <strong>{queue.fresh.length}</strong> new
        </span>
        <span className="pr-count">
          <strong>{queue.ahead.length}</strong> learning
        </span>
        <span className="pr-count pr-count-total">{left} left today</span>
      </p>

      <p className="sr-only" role="status" aria-live="polite" data-review-status>
        {announcement}
      </p>

      {card ? (
        <section className="pr-card" aria-label={`Card: ${card.title}`} data-card-id={card.id}>
          <p className="pr-card-meta">
            <span>Lesson {card.lessonNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{card.lessonTitle}</span>
            {!states.has(card.id) && <span className="pr-chip">New</span>}
          </p>
          <div
            className="pr-face pr-front"
            ref={frontRef}
            tabIndex={-1}
            aria-label="Question"
            dangerouslySetInnerHTML={{ __html: card.frontHtml }}
          />
          {revealed && (
            <div className="pr-back-wrap">
              <div
                className="pr-face pr-back"
                ref={backRef}
                tabIndex={-1}
                aria-label="Answer"
                data-card-back
                dangerouslySetInnerHTML={{ __html: card.backHtml }}
              />
              <p className="pr-source">
                <a href={card.source}>
                  {card.origin === 'derivation'
                    ? 'Open the derivation'
                    : card.origin === 'definition'
                      ? 'Open the definition'
                      : 'Open the source'}{' '}
                  in Lesson {card.lessonNumber}
                </a>
                {card.provenance && <span className="pr-muted"> · {card.provenance}</span>}
              </p>
            </div>
          )}

          {!revealed ? (
            <div className="pr-actions">
              <button
                type="button"
                className="pr-button pr-button-primary"
                onClick={reveal}
                aria-keyshortcuts="Space"
              >
                Show answer <kbd aria-hidden="true">Space</kbd>
              </button>
            </div>
          ) : (
            <div className="pr-ratings" role="group" aria-label="How well did you recall it?">
              {RATINGS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  className={`pr-rating pr-rating-${r}`}
                  disabled={busy}
                  onClick={() => void rate(r)}
                  aria-keyshortcuts={String(i + 1)}
                  aria-label={`${RATING_LABEL[r]}: next review in ${previews ? formatInterval(previews[r] - clock) : ''}`}
                  data-rating={r}
                >
                  <span className="pr-rating-label">{RATING_LABEL[r]}</span>
                  <span className="pr-rating-interval">
                    {previews ? formatInterval(previews[r] - clock) : ''}
                  </span>
                  <kbd aria-hidden="true">{i + 1}</kbd>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="pr-empty" aria-label="Nothing to review">
          <h2 className="pr-h2">
            {deck.cards.length ? 'Nothing to review right now' : 'No cards yet'}
          </h2>
          <p className="pr-muted">
            {deck.cards.length === 0
              ? 'Cards are generated from published lessons; none are visible yet.'
              : nextDue !== null && nextDue > clock
                ? `Next review in ${formatInterval(nextDue - clock)}. New cards come ${NEW_CARDS_NOTE}.`
                : `New cards come ${NEW_CARDS_NOTE}.`}
          </p>
          <div className="pr-actions">
            <button type="button" className="pr-button" onClick={onQuiz}>
              Take a quiz instead
            </button>
          </div>
        </section>
      )}

      {card && (
        <p className="pr-hint" aria-hidden="true">
          Keys: <kbd>Space</kbd> show answer, then <kbd>1</kbd>–<kbd>4</kbd> to rate (
          <kbd>Space</kbd> is Good).
        </p>
      )}
    </div>
  );
}

const NEW_CARDS_NOTE = 'ten a day, in course order';
