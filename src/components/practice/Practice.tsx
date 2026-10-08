/**
 * The practice island on /practice (VISION.md §7 "Practice"; §9.5, §9.6,
 * §9.11): three tabs over one progress store.
 *
 * - Review: the FSRS queue (src/lib/practice/queue.ts), front → reveal →
 *   Again / Hard / Good / Easy with next-interval previews; keys 1–4 and Space.
 * - Quiz: the interleaving quiz builder over the gradable quiz bank, graded
 *   with src/lib/graders.
 * - Progress: cards by phase, reviews per day, concept mastery, export/import.
 *
 * The deck and the quiz bank are static JSON fetched lazily (/practice/*.json).
 * After every change the island writes the due summary that the home page's
 * "Due today" card reads (src/lib/practice/due-summary.ts). Not a lesson page,
 * so React is fine here; lesson pages ship none of this.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { DUE_SUMMARY_KEY, makeDueSummary, NEW_PER_DAY } from '@/lib/practice/due-summary';
import { openStore, type ProgressData } from '@/lib/practice/store';
import type { Deck } from '@/lib/practice/types';

import { cardStates, newTodayCount, type PracticeContext } from './context';
import './practice.css';
import { ProgressPanel } from './ProgressPanel';
import { QuizPanel } from './QuizPanel';
import { ReviewPanel } from './ReviewPanel';

const TABS = [
  { id: 'review', label: 'Review' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'progress', label: 'Progress' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function tabFromHash(): TabId | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? (h as TabId) : null;
}

export function Practice() {
  const [tab, setTab] = useState<TabId>('review');
  const [opened, setOpened] = useState<Set<TabId>>(() => new Set(['review']));
  const [ctx, setCtx] = useState<Omit<PracticeContext, 'update' | 'reload'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** "Now" for the Progress tab: refreshed when a tab is chosen and after every change. */
  const [now, setNow] = useState(() => Date.now());
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const select = useCallback((id: TabId, focus = false) => {
    setTab(id);
    setNow(Date.now());
    setOpened((o) => (o.has(id) ? o : new Set([...o, id])));
    if (focus) tabRefs.current[id]?.focus();
    try {
      history.replaceState(null, '', `#${id}`);
    } catch {
      /* history unavailable */
    }
  }, []);

  // #review / #quiz / #progress selects a tab; deferred a frame so hydration matches the server.
  useEffect(() => {
    const apply = () => {
      const fromHash = tabFromHash();
      if (fromHash) select(fromHash);
    };
    const frame = requestAnimationFrame(apply);
    window.addEventListener('hashchange', apply);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', apply);
    };
  }, [select]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchJson<Deck>('/practice/deck.json'), openStore()])
      .then(async ([deck, store]) => {
        const data = await store.load();
        if (!cancelled) setCtx({ deck, store, data });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The home page's "Due today" reads this summary (zero cost there).
  useEffect(() => {
    if (!ctx) return;
    const now = Date.now();
    try {
      localStorage.setItem(
        DUE_SUMMARY_KEY,
        JSON.stringify(
          makeDueSummary({
            deck: ctx.deck.cards.map((c) => c.id),
            states: cardStates(ctx.data),
            now,
            newToday: newTodayCount(ctx.data, now),
            newPerDay: NEW_PER_DAY,
          }),
        ),
      );
    } catch {
      /* storage blocked: the home card keeps its default text */
    }
  }, [ctx]);

  const update = useCallback((fn: (data: ProgressData) => ProgressData) => {
    setCtx((c) => (c ? { ...c, data: fn(c.data) } : c));
    setNow(Date.now());
  }, []);

  const store = ctx?.store;
  const reload = useCallback(async () => {
    if (!store) return;
    const data = await store.load();
    setCtx((c) => (c ? { ...c, data } : c));
    setNow(Date.now());
  }, [store]);

  const full = useMemo<PracticeContext | null>(
    () => (ctx ? { ...ctx, update, reload } : null),
    [ctx, update, reload],
  );

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    const t = TABS[next];
    if (!t) return;
    e.preventDefault();
    select(t.id, true);
  };

  return (
    <div className="pr-root" data-practice data-ready={full ? 'true' : undefined}>
      <div className="pr-tabs" role="tablist" aria-label="Practice" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`pr-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pr-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="pr-tab"
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`pr-panel-${t.id}`}
          aria-labelledby={`pr-tab-${t.id}`}
          className="pr-panel"
          hidden={tab !== t.id}
          tabIndex={-1}
        >
          {error ? (
            <p className="pr-note" role="alert">
              The practice deck could not be loaded ({error}). Reload the page to try again.
            </p>
          ) : !full ? (
            <p className="pr-note" aria-busy="true">
              Loading your cards…
            </p>
          ) : !opened.has(t.id) ? null : t.id === 'review' ? (
            <ReviewPanel ctx={full} active={tab === 'review'} onQuiz={() => select('quiz', true)} />
          ) : t.id === 'quiz' ? (
            <QuizPanel ctx={full} />
          ) : (
            <ProgressPanel ctx={full} now={now} />
          )}
        </div>
      ))}
    </div>
  );
}
