/**
 * Progress tab: cards by phase, reviews per day for the last 14 days, concept
 * mastery (src/lib/practice/mastery.ts) grouped by unit, and export/import
 * (src/lib/practice/transfer.ts, loaded only when used).
 */
import { useMemo, useRef, useState } from 'react';

import { localDay } from '@/lib/practice/due-summary';
import { MASTERY_NAMES, masteryByConcept, type MasteryInfo } from '@/lib/practice/mastery';
import { isDue } from '@/lib/practice/scheduler';
import { reviewsByCard } from '@/lib/practice/store';

import { cardStates, type PracticeContext } from './context';

const DAYS = 14;

function lastDays(now: number): { day: string; label: string; long: string }[] {
  const out: { day: string; label: string; long: string }[] = [];
  const base = new Date(now);
  base.setHours(12, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push({
      day: localDay(d.getTime()),
      label: String(d.getDate()),
      long: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return out;
}

/**
 * Reviews per day as HTML bars: one series, so no legend; the busiest day is
 * labeled directly. CSS lays the bars out so labels keep their real size at
 * 360 px; only each bar's height is computed inline. A visually hidden table
 * carries the same numbers for screen readers.
 */
function ReviewsChart({ counts }: { counts: { label: string; long: string; n: number }[] }) {
  const max = Math.max(0, ...counts.map((c) => c.n));
  const peak = max > 0 ? counts.findLastIndex((c) => c.n === max) : -1;
  const total = counts.reduce((a, c) => a + c.n, 0);
  return (
    <figure className="pr-chart">
      <div
        className="pr-chart-plot"
        role="img"
        aria-label={`Reviews per day over the last ${DAYS} days: ${total} in total${max > 0 ? `, at most ${max} on one day` : ''}.`}
      >
        {counts.map((c, i) => (
          <div
            key={c.long}
            className="pr-chart-day"
            title={`${c.long}: ${c.n} review${c.n === 1 ? '' : 's'}`}
          >
            <div className="pr-chart-track">
              {i === peak && <span className="pr-chart-value">{c.n}</span>}
              {c.n > 0 && (
                <div
                  className="pr-chart-bar"
                  style={{ height: `${Math.max(4, (c.n / max) * 100)}%` }}
                />
              )}
            </div>
            <span className="pr-chart-label">{c.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>Reviews per day</caption>
          <tbody>
            {counts.map((c) => (
              <tr key={c.long}>
                <th scope="row">{c.long}</th>
                <td>{c.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

function Meter({ level }: { level: number }) {
  return (
    <span className="pr-meter" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="pr-meter-cell" data-on={i <= level ? String(level) : undefined} />
      ))}
    </span>
  );
}

export function ProgressPanel({ ctx, now }: { ctx: PracticeContext; now: number }) {
  const { deck, data, store, reload } = ctx;
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const states = useMemo(() => cardStates(data), [data]);

  const phases = useMemo(() => {
    const out = { new: 0, learning: 0, review: 0, relearning: 0, due: 0 };
    for (const c of deck.cards) {
      const s = states.get(c.id);
      if (!s) out.new++;
      else {
        out[s.phase]++;
        if (isDue(s, now)) out.due++;
      }
    }
    return out;
  }, [deck, states, now]);

  const perDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of data.reviews) {
      const d = localDay(r.at);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return lastDays(now).map((d) => ({ ...d, n: counts.get(d.day) ?? 0 }));
  }, [data, now]);

  const mastery = useMemo(
    () =>
      masteryByConcept({
        cards: deck.cards,
        states,
        reviews: reviewsByCard(data.reviews),
        attempts: data.attempts,
        now,
      }),
    [deck, states, data, now],
  );

  /** Concepts grouped by the unit of their first card, in course order. */
  const groups = useMemo(() => {
    const unitOf = new Map<string, string>();
    const order: string[] = [];
    for (const c of deck.cards) {
      for (const k of c.concepts) {
        if (!unitOf.has(k)) {
          unitOf.set(k, c.unit);
          order.push(k);
        }
      }
    }
    for (const k of mastery.keys()) if (!unitOf.has(k)) order.push(k);
    return deck.units
      .map((u) => ({
        unit: u,
        concepts: order
          .filter((k) => unitOf.get(k) === u.id)
          .map((k) => ({ id: k, info: mastery.get(k) })),
      }))
      .filter((g) => g.concepts.length > 0);
  }, [deck, mastery]);

  const doExport = async () => {
    try {
      const { exportProgress } = await import('@/lib/practice/transfer');
      const json = await exportProgress(store, safeStorage());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aml-atlas-progress-${localDay(Date.now())}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ text: 'Progress exported. Keep the file to import it on another device.' });
    } catch {
      setStatus({ text: 'Export failed.', error: true });
    }
  };

  const doImport = async (file: File) => {
    try {
      const [{ importProgress }, text] = await Promise.all([
        import('@/lib/practice/transfer'),
        file.text(),
      ]);
      const r = await importProgress(store, safeStorage(), text);
      if (!r.ok) {
        setStatus({ text: r.error, error: true });
        return;
      }
      await reload();
      setStatus({
        text: `Imported ${r.summary.cards} cards, ${r.summary.reviews} reviews, and ${r.summary.attempts} quiz answers, merged with what was here.`,
      });
    } catch {
      setStatus({ text: 'Import failed: the file could not be read.', error: true });
    }
  };

  const storageNote =
    store.kind === 'indexeddb'
      ? 'Saved in this browser (IndexedDB).'
      : store.kind === 'localstorage'
        ? 'Saved in this browser (localStorage; IndexedDB is unavailable here).'
        : 'Storage is blocked here, so progress lasts only until you close the tab. Export it to keep it.';

  return (
    <div className="pr-progress">
      <section aria-labelledby="pr-cards-title">
        <h2 className="pr-h2" id="pr-cards-title">
          Cards
        </h2>
        <dl className="pr-stats" data-progress-phases>
          {(
            [
              ['New', phases.new, 'new'],
              ['Learning', phases.learning, 'learning'],
              ['Relearning', phases.relearning, 'relearning'],
              ['Review', phases.review, 'review'],
              ['Due now', phases.due, 'due'],
            ] as const
          ).map(([label, n, key]) => (
            <div key={key} className="pr-stat" data-phase={key}>
              <dt>{label}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pr-days-title">
        <h2 className="pr-h2" id="pr-days-title">
          Reviews per day
        </h2>
        <ReviewsChart counts={perDay} />
      </section>

      <section aria-labelledby="pr-mastery-title">
        <h2 className="pr-h2" id="pr-mastery-title">
          Concept mastery
        </h2>
        <p className="pr-muted pr-small">
          Levels rise only with correct reviews spaced at least a day apart, and fall when you
          forget. Not started · Attempted · Familiar · Proficient · Mastered.
        </p>
        {groups.map((g) => {
          const started = g.concepts.filter((c) => (c.info?.level ?? 0) > 0).length;
          return (
            <details key={g.unit.id} className="pr-unit">
              <summary>
                Unit {g.unit.number}: {g.unit.title}
                <span className="pr-muted">
                  {' '}
                  · {started} of {g.concepts.length} started
                </span>
              </summary>
              <ul className="pr-mastery-list">
                {g.concepts.map(({ id, info }) => (
                  <MasteryRow key={id} id={id} label={deck.concepts[id] ?? id} info={info} />
                ))}
              </ul>
            </details>
          );
        })}
      </section>

      <section aria-labelledby="pr-backup-title">
        <h2 className="pr-h2" id="pr-backup-title">
          Backup
        </h2>
        <p className="pr-muted pr-small">
          {storageNote} Export a JSON file to move your progress to another device; importing merges
          it with what is here.
        </p>
        <div className="pr-actions">
          <button type="button" className="pr-button" onClick={() => void doExport()}>
            Export progress
          </button>
          <button type="button" className="pr-button" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Progress file to import"
            data-import-input
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void doImport(f);
            }}
          />
        </div>
        <p
          className={`pr-status${status?.error ? 'pr-status-error' : ''}`}
          role="status"
          aria-live="polite"
          data-backup-status
        >
          {status?.text}
        </p>
      </section>
    </div>
  );
}

function MasteryRow({
  id,
  label,
  info,
}: {
  id: string;
  label: string;
  info?: MasteryInfo | undefined;
}) {
  const level = info?.level ?? 0;
  return (
    <li className="pr-mastery" data-concept={id} data-level={level}>
      <span className="pr-mastery-label">{label}</span>
      <Meter level={level} />
      <span className="pr-mastery-name">{MASTERY_NAMES[level]}</span>
    </li>
  );
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
