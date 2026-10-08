import { describe, expect, it } from 'vitest';

import {
  FIGURE_STATE_EVENT,
  createFigureStateEvent,
  dispatchFigureState,
  parseFigureState,
  type FigureStateDetail,
} from './figure-state';

describe('parseFigureState', () => {
  it('accepts a JSON object', () => {
    expect(parseFigureState('{"highlight":"psi","k":2}')).toEqual({ highlight: 'psi', k: 2 });
  });

  it('rejects anything that is not an object', () => {
    expect(parseFigureState('[1,2]')).toBeNull();
    expect(parseFigureState('"psi"')).toBeNull();
    expect(parseFigureState('42')).toBeNull();
    expect(parseFigureState('null')).toBeNull();
    expect(parseFigureState('{highlight: psi}')).toBeNull();
    expect(parseFigureState('')).toBeNull();
    expect(parseFigureState('   ')).toBeNull();
    expect(parseFigureState(null)).toBeNull();
    expect(parseFigureState(undefined)).toBeNull();
  });
});

describe('aml:figure-state event', () => {
  const detail: FigureStateDetail = {
    derivation: 'der-6-3-2',
    step: 4,
    state: { highlight: 'psi' },
  };

  it('is a bubbling CustomEvent named aml:figure-state carrying the detail', () => {
    const event = createFigureStateEvent(detail);
    expect(event).not.toBeNull();
    expect(event?.type).toBe(FIGURE_STATE_EVENT);
    expect(event?.bubbles).toBe(true);
    expect(event?.detail).toEqual(detail);
  });

  it('dispatches on the section, then on the widget host', () => {
    const section = new EventTarget();
    const host = new EventTarget();
    const log: string[] = [];
    section.addEventListener(FIGURE_STATE_EVENT, (e) => {
      log.push(`section:${(e as CustomEvent<FigureStateDetail>).detail.step}`);
    });
    host.addEventListener(FIGURE_STATE_EVENT, (e) => {
      log.push(`host:${(e as CustomEvent<FigureStateDetail>).detail.state.highlight}`);
    });

    const received = dispatchFigureState(detail, { section, host });

    expect(received).toEqual([section, host]);
    expect(log).toEqual(['section:4', 'host:psi']);
  });

  it('dispatches on the section alone when there is no host', () => {
    const section = new EventTarget();
    let count = 0;
    section.addEventListener(FIGURE_STATE_EVENT, () => {
      count += 1;
    });
    expect(dispatchFigureState(detail, { section, host: null })).toEqual([section]);
    expect(dispatchFigureState(detail, { section })).toEqual([section]);
    expect(count).toBe(2);
  });
});
