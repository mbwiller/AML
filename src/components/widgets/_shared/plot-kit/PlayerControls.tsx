/**
 * Play / Step / Show all buttons for a `useStepPlayer` sequence, using the
 * shared `.widget-btn` style. The status line is polite so screen readers
 * hear "Step 3 of 20" while stepping.
 */
import { Pause, Play, SkipForward, StepForward } from 'lucide-react';

import type { StepPlayer } from './useStepPlayer';

export interface PlayerControlsProps {
  player: StepPlayer;
  total: number;
  /** Noun for the status line ("Step", "Iteration"). */
  unit?: string;
}

export function PlayerControls({ player, total, unit = 'Step' }: PlayerControlsProps) {
  return (
    <div className="pk-player" role="group" aria-label="Iterates">
      {player.playing ? (
        <button type="button" className="widget-btn" onClick={player.pause}>
          <Pause size={14} aria-hidden="true" />
          Pause
        </button>
      ) : (
        <button type="button" className="widget-btn" onClick={player.play}>
          <Play size={14} aria-hidden="true" />
          Play
        </button>
      )}
      <button type="button" className="widget-btn" onClick={player.step}>
        <StepForward size={14} aria-hidden="true" />
        Step
      </button>
      <button
        type="button"
        className="widget-btn"
        onClick={player.showAll}
        disabled={player.complete && !player.playing}
      >
        <SkipForward size={14} aria-hidden="true" />
        Show all
      </button>
      <span className="pk-player-status" aria-live="polite" data-testid="pk-player-status">
        {unit} {player.shown} of {total}
      </span>
    </div>
  );
}
