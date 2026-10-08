/**
 * Let a `<Step figureState='{"eta": 0.5}'>` drive a widget (STYLE_GUIDE.md §7
 * point 8): every key of the payload that is a param of the widget and
 * validates against that param's own schema is applied with `setParams`;
 * anything else is ignored. Shared by the lesson 2.5 widgets.
 */
import { useEffect } from 'react';
import type { z } from 'zod';

/** The valid param updates in a figure-state payload (pure; exported for tests). */
export function figureStatePatch(
  figureState: unknown,
  shape: Readonly<Record<string, z.ZodType>>,
): Record<string, unknown> {
  if (typeof figureState !== 'object' || figureState === null || Array.isArray(figureState)) {
    return {};
  }
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(figureState as Record<string, unknown>)) {
    const field = Object.hasOwn(shape, key) ? shape[key] : undefined;
    if (!field || value === undefined) continue;
    const parsed = field.safeParse(value);
    if (parsed.success) patch[key] = parsed.data;
  }
  return patch;
}

export function useFigureStateParams<P extends Record<string, unknown>>(
  figureState: unknown,
  shape: Readonly<Record<string, z.ZodType>>,
  setParams: (patch: Partial<P>) => void,
): void {
  useEffect(() => {
    const patch = figureStatePatch(figureState, shape);
    if (Object.keys(patch).length > 0) setParams(patch as Partial<P>);
  }, [figureState, shape, setParams]);
}
