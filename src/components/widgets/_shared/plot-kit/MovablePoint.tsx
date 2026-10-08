/**
 * A focusable, draggable point on a Mafs plane with an accessible name
 * (STYLE_GUIDE.md §7 point 5; Mafs' own `<MovablePoint>` has none). Pointer
 * drag and arrow keys come from Mafs' `useMovable` (Shift = bigger steps,
 * Alt = finer); the hit area is a 44 px circle (§7 point 7).
 */
import { useMovable, useTransformContext, vec } from 'mafs';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

export interface MovablePointProps {
  point: readonly [number, number];
  onMove: (p: [number, number]) => void;
  /** Accessible name, e.g. "Starting point θ(0) at (−15, 15). Arrow keys move it." */
  label: string;
  color: string;
  /** Clamp/snap the proposed position. */
  constrain?: (p: [number, number]) => [number, number];
  testId?: string;
  /** Inner fill; pass the surface color for a hollow ring that hides less. */
  fill?: string;
}

const identity = (p: [number, number]): [number, number] => p;

export function MovablePoint({
  point,
  onMove,
  label,
  color,
  constrain = identity,
  testId,
  fill,
}: MovablePointProps) {
  const ref = useRef<SVGGElement>(null);
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  const move = useCallback(
    (p: vec.Vector2) => onMove(constrain([p[0], p[1]])),
    [onMove, constrain],
  );
  const { dragging } = useMovable({
    gestureTarget: ref as RefObject<Element>,
    onMove: move,
    point: [point[0], point[1]],
    constrain: (p) => constrain([p[0], p[1]]),
  });

  // use-gesture stops propagation, so focus the element ourselves on pointerdown.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = () => el.focus();
    el.addEventListener('pointerdown', onDown);
    return () => el.removeEventListener('pointerdown', onDown);
  }, []);

  const [cx, cy] = vec.transform([point[0], point[1]], matrix);
  return (
    <g
      ref={ref}
      tabIndex={0}
      role="button"
      aria-roledescription="draggable point"
      aria-label={label}
      className={dragging ? 'pk-movable pk-movable-dragging' : 'pk-movable'}
      data-testid={testId}
    >
      <circle cx={cx} cy={cy} r={22} fill="none" pointerEvents="all" />
      <circle className="pk-movable-ring" cx={cx} cy={cy} r={11} fill="none" />
      <circle cx={cx} cy={cy} r={6} fill={fill ?? color} stroke={color} strokeWidth={2.5} />
    </g>
  );
}
