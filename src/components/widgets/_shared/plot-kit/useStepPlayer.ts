/**
 * Reveal an iterate sequence one step at a time (the gradient-descent widgets
 * of lesson 2.5). By default every iterate is shown at once, so a slider
 * change redraws instantly; the reader may press Play (a timer reveals one
 * more iterate per tick) or Step (one iterate per press).
 *
 * STYLE_GUIDE.md §4.4: nothing autoplays, and under `prefers-reduced-motion`
 * Play reveals the whole sequence at once instead of on a timer. Step is
 * always manual. Any change of `resetKey` (the params the sequence depends
 * on) stops playback and shows everything again.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  const mql = window.matchMedia(REDUCED);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** True when the reader asked the OS for reduced motion (false during SSR). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export interface StepPlayer {
  /** How many steps are revealed (0 … total); iterates 0 … shown are drawn. */
  shown: number;
  playing: boolean;
  /** True when every step is revealed. */
  complete: boolean;
  play: () => void;
  pause: () => void;
  /** Reveal one more step (from "everything shown" it restarts at step 0). */
  step: () => void;
  showAll: () => void;
}

interface PlayerState {
  key: string;
  /** null = everything. */
  shown: number | null;
  playing: boolean;
}

/**
 * @param total number of steps in the sequence
 * @param resetKey changes whenever the sequence changes (stop and show all)
 * @param intervalMs time between revealed steps while playing
 * @param stride steps revealed per tick and per Step press (long sequences)
 */
export function useStepPlayer(
  total: number,
  resetKey: string,
  intervalMs = 380,
  stride = 1,
): StepPlayer {
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState<PlayerState>({ key: resetKey, shown: null, playing: false });
  // A new resetKey means new params: show the whole sequence, stop playing.
  const current: PlayerState =
    state.key === resetKey ? state : { key: resetKey, shown: null, playing: false };
  const shown = Math.min(current.shown ?? total, total);
  const playing = current.playing && shown < total;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setState((s) => {
        if (s.key !== resetKey) return s;
        const next = Math.min((s.shown ?? total) + stride, total);
        return { key: resetKey, shown: next, playing: next < total };
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, resetKey, total, intervalMs, stride]);

  const play = useCallback(() => {
    if (reduced) {
      setState({ key: resetKey, shown: null, playing: false });
      return;
    }
    setState((s) => {
      const cur = s.key === resetKey ? (s.shown ?? total) : total;
      return { key: resetKey, shown: cur >= total ? 0 : cur, playing: true };
    });
  }, [reduced, resetKey, total]);

  const pause = useCallback(() => {
    setState((s) => ({
      key: resetKey,
      shown: s.key === resetKey ? s.shown : null,
      playing: false,
    }));
  }, [resetKey]);

  const step = useCallback(() => {
    setState((s) => {
      const cur = s.key === resetKey ? (s.shown ?? total) : total;
      return {
        key: resetKey,
        shown: cur >= total ? 0 : Math.min(cur + stride, total),
        playing: false,
      };
    });
  }, [resetKey, total, stride]);

  const showAll = useCallback(() => {
    setState({ key: resetKey, shown: null, playing: false });
  }, [resetKey]);

  return { shown, playing, complete: shown >= total, play, pause, step, showAll };
}
