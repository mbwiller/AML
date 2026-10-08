/**
 * The content width of an element, kept current with a ResizeObserver, so a
 * plain-SVG plot can be drawn at its real pixel size (text and markers stay
 * the same size at 360 px and at 1280 px). Shared with `mse-bowl-gd`.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useElementWidth<T extends HTMLElement>(
  initial: number,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth((prev) => (prev === w ? prev : w));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
