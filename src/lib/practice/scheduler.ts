/**
 * Spaced repetition (VISION.md §9.5; tech-stack.md §6): a thin, pure wrapper
 * over ts-fsrs (FSRS-6, default weights) with desired retention 0.9 and the
 * four-button rating. Card state is a plain JSON object with millisecond
 * timestamps so it round-trips through IndexedDB, localStorage, and the
 * export file unchanged.
 *
 * Fuzz is off (ts-fsrs's default), so the same history always gives the same
 * schedule; learning steps are ts-fsrs's defaults (1 min, 10 min) and the
 * relearning step is 10 min.
 */
import {
  createEmptyCard,
  forgetting_curve,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';

export const REQUEST_RETENTION = 0.9;

const params = generatorParameters({ request_retention: REQUEST_RETENTION, enable_fuzz: false });
const scheduler = fsrs(params);

/** The four buttons, in display order, with their keyboard shortcuts 1–4. */
export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type RatingName = (typeof RATINGS)[number];

export const RATING_LABEL: Record<RatingName, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

const TO_GRADE: Record<RatingName, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** FSRS card phase. `new` cards have never been reviewed. */
export type Phase = 'new' | 'learning' | 'review' | 'relearning';

const PHASE: Record<State, Phase> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};
const STATE: Record<Phase, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Serializable FSRS memory state of one card. */
export interface CardState {
  phase: Phase;
  /** Next due time, Unix ms. */
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** Last review, Unix ms; absent for new cards. */
  lastReview?: number | undefined;
}

/** One entry of the review log. */
export interface ReviewEntry {
  rating: RatingName;
  /** When the review happened, Unix ms. */
  at: number;
  /** Phase before the review. */
  phase: Phase;
  /** Ms since the card's previous review; null for its first review. */
  elapsedMs: number | null;
  /** Interval the review scheduled, in days (0 while learning). */
  scheduledDays: number;
}

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: 0,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: STATE[s.phase],
    ...(s.lastReview !== undefined ? { last_review: new Date(s.lastReview) } : {}),
  };
}

function fromCard(c: Card): CardState {
  return {
    phase: PHASE[c.state],
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    ...(c.last_review ? { lastReview: c.last_review.getTime() } : {}),
  };
}

export function newCardState(now: number): CardState {
  return fromCard(createEmptyCard(new Date(now)));
}

/** Apply one rating at `now`. */
export function review(
  state: CardState,
  rating: RatingName,
  now: number,
): { state: CardState; entry: ReviewEntry } {
  const next = scheduler.next(toCard(state), new Date(now), TO_GRADE[rating]);
  const nextState = fromCard(next.card);
  return {
    state: nextState,
    entry: {
      rating,
      at: now,
      phase: state.phase,
      elapsedMs: state.lastReview === undefined ? null : Math.max(0, now - state.lastReview),
      scheduledDays: nextState.scheduledDays,
    },
  };
}

/** Due time each rating would produce, for the buttons' interval labels. */
export function preview(state: CardState, now: number): Record<RatingName, number> {
  const out = {} as Record<RatingName, number>;
  for (const r of RATINGS) out[r] = review(state, r, now).state.due;
  return out;
}

/** A card that has been reviewed and whose due time has come. New cards are never "due". */
export function isDue(state: CardState, now: number): boolean {
  return state.phase !== 'new' && state.due <= now;
}

/** Probability of recall at `now` under the FSRS-6 forgetting curve; 0 for new cards. */
export function retrievability(state: CardState, now: number): number {
  if (state.phase === 'new' || state.lastReview === undefined || state.stability <= 0) return 0;
  const days = Math.max(0, now - state.lastReview) / 86_400_000;
  return forgetting_curve(params.w, days, state.stability);
}

/** "1 min", "10 min", "3 h", "4 d", "2 mo", "1.5 y": how long until `due`. */
export function formatInterval(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} d`;
  const mo = Math.round(d / 30.4);
  if (mo < 12) return `${mo} mo`;
  return `${Math.round((d / 365) * 10) / 10} y`;
}
