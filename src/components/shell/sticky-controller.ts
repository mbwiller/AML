/**
 * Sticky-note popover controller (VISION.md §9.2; STYLE_GUIDE.md §5, §8).
 *
 * One controller per page, event-delegated at the document, no framework:
 * a lesson has dozens of stickies and ships no React runtime (§8 budget).
 *
 * DOM contract
 *   trigger   any element with `data-sticky="<glossary id>"`; `data-field`
 *             colors it; it should be focusable and carry
 *             `aria-haspopup="dialog"` and `aria-expanded`. A link trigger
 *             keeps its href as the no-JS fallback; the controller prevents
 *             navigation and opens the card instead.
 *   card      `<template data-sticky-card="<id>">` anywhere on the page
 *             (StickyCard.astro emits one per term per page). Its first
 *             `[data-sticky-title]` labels the dialog.
 *   host      one `<div id="sticky-popover" class="sticky-popover" role="dialog">`
 *             appended to <body>; `data-open` while visible, `data-side`
 *             = below | above, `data-field` copied from the trigger.
 *
 * Behaviour
 *   pointer   hover-intent open after 300 ms; stays open while the pointer is
 *             on the trigger or inside the card; closes 150 ms after leaving.
 *   click/tap toggles and pins (hover-out no longer closes); outside
 *             pointerdown closes.
 *   keyboard  Enter / Space on a trigger toggles; Escape closes and returns
 *             focus to the trigger; Tab from an open trigger moves into the
 *             card; Tab past the card's last link (or Shift+Tab before its
 *             first) closes it and continues from the trigger.
 *
 * Events (bubbling CustomEvents on the trigger, for widgets and derivations
 * that want to react): `sticky:open` and `sticky:close`, `detail: { id }`.
 */
import { placePopover } from '@/lib/popover';

const OPEN_DELAY = 300;
const CLOSE_GRACE = 150;
const HOST_ID = 'sticky-popover';
const TITLE_ID = 'sticky-popover-title';
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface State {
  trigger: HTMLElement | null;
  pinned: boolean;
  openTimer: number | undefined;
  closeTimer: number | undefined;
}

export function initStickies(doc: Document = document): void {
  const root = doc.documentElement;
  if (root.dataset['stickyController'] !== undefined) return;
  root.dataset['stickyController'] = '';

  const host = doc.createElement('div');
  host.id = HOST_ID;
  host.className = 'sticky-popover';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-labelledby', TITLE_ID);
  host.hidden = true;
  doc.body.append(host);

  const state: State = {
    trigger: null,
    pinned: false,
    openTimer: undefined,
    closeTimer: undefined,
  };

  const triggerOf = (target: EventTarget | null): HTMLElement | null =>
    target instanceof Element ? target.closest<HTMLElement>('[data-sticky]') : null;

  const inHost = (target: EventTarget | null): boolean =>
    target instanceof Node && host.contains(target);

  const clearTimers = (): void => {
    window.clearTimeout(state.openTimer);
    window.clearTimeout(state.closeTimer);
    state.openTimer = undefined;
    state.closeTimer = undefined;
  };

  const cardFor = (id: string): DocumentFragment => {
    const tpl = doc.querySelector<HTMLTemplateElement>(
      `template[data-sticky-card="${CSS.escape(id)}"]`,
    );
    if (tpl) return tpl.content.cloneNode(true) as DocumentFragment;
    // A trigger added at runtime (a widget, say) with no build-time card.
    const frag = doc.createDocumentFragment();
    const card = doc.createElement('div');
    card.className = 'sticky-card';
    const term = doc.createElement('span');
    term.className = 'sticky-card-term';
    term.dataset['stickyTitle'] = '';
    term.textContent = id.replace(/-/g, ' ');
    const note = doc.createElement('p');
    note.className = 'sticky-card-missing';
    note.textContent = 'No glossary entry on this page yet.';
    card.append(term, note);
    frag.append(card);
    return frag;
  };

  const position = (): void => {
    if (!state.trigger) return;
    const rect = state.trigger.getBoundingClientRect();
    const placed = placePopover(
      rect,
      { width: host.offsetWidth, height: host.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    host.style.top = `${placed.top}px`;
    host.style.left = `${placed.left}px`;
    host.dataset['side'] = placed.side;
  };

  const close = (returnFocus: boolean): void => {
    clearTimers();
    const trigger = state.trigger;
    if (!trigger) return;
    const hadFocusInside = inHost(doc.activeElement);
    state.trigger = null;
    state.pinned = false;
    delete host.dataset['open'];
    host.hidden = true;
    host.replaceChildren();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    if (returnFocus || hadFocusInside) trigger.focus({ preventScroll: true });
    trigger.dispatchEvent(
      new CustomEvent('sticky:close', { bubbles: true, detail: { id: trigger.dataset['sticky'] } }),
    );
  };

  const open = (trigger: HTMLElement, pinned: boolean): void => {
    clearTimers();
    if (state.trigger === trigger) {
      state.pinned ||= pinned;
      return;
    }
    if (state.trigger) close(false);
    const id = trigger.dataset['sticky'] ?? '';
    host.replaceChildren(cardFor(id));
    const title = host.querySelector<HTMLElement>('[data-sticky-title]');
    if (title) title.id = TITLE_ID;
    const field = trigger.dataset['field'];
    if (field) host.dataset['field'] = field;
    else delete host.dataset['field'];
    state.trigger = trigger;
    state.pinned = pinned;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', HOST_ID);
    host.hidden = false;
    position();
    // Next frame so the 120 ms opacity transition runs from 0 (instant under reduced motion).
    requestAnimationFrame(() => {
      if (state.trigger === trigger) host.dataset['open'] = '';
    });
    trigger.dispatchEvent(new CustomEvent('sticky:open', { bubbles: true, detail: { id } }));
  };

  const toggle = (trigger: HTMLElement): void => {
    if (state.trigger === trigger && state.pinned) close(false);
    else open(trigger, true);
  };

  const scheduleClose = (): void => {
    if (!state.trigger || state.pinned) return;
    window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(() => close(false), CLOSE_GRACE);
  };

  // --- pointer: hover intent on mouse/pen, nothing on touch ------------------
  doc.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    if (inHost(event.target)) {
      window.clearTimeout(state.closeTimer);
      return;
    }
    const trigger = triggerOf(event.target);
    if (!trigger) return;
    if (trigger === state.trigger) {
      window.clearTimeout(state.closeTimer);
      return;
    }
    if (trigger.contains(event.relatedTarget as Node | null)) return;
    window.clearTimeout(state.openTimer);
    state.openTimer = window.setTimeout(() => open(trigger, false), OPEN_DELAY);
  });

  doc.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const to = event.relatedTarget as Node | null;
    const trigger = triggerOf(event.target);
    if (trigger && !trigger.contains(to)) {
      window.clearTimeout(state.openTimer);
      if (trigger === state.trigger && !host.contains(to)) scheduleClose();
    }
    if (inHost(event.target) && !host.contains(to) && !state.trigger?.contains(to)) {
      scheduleClose();
    }
  });

  doc.addEventListener('pointerdown', (event) => {
    if (!state.trigger) return;
    if (inHost(event.target) || triggerOf(event.target) === state.trigger) return;
    close(false);
  });

  doc.addEventListener('click', (event) => {
    const trigger = triggerOf(event.target);
    if (!trigger || inHost(event.target)) return;
    event.preventDefault();
    toggle(trigger);
  });

  // --- keyboard ---------------------------------------------------------------
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.trigger) {
        event.preventDefault();
        close(true);
      }
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    const trigger = triggerOf(target);
    if (trigger && target === trigger) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle(trigger);
        return;
      }
      if (event.key === 'Tab' && !event.shiftKey && state.trigger === trigger) {
        const first = host.querySelector<HTMLElement>(FOCUSABLE);
        if (first) {
          event.preventDefault();
          state.pinned = true;
          first.focus();
        }
      }
      return;
    }
    if (event.key === 'Tab' && target && inHost(target) && state.trigger) {
      const focusables = Array.from(host.querySelectorAll<HTMLElement>(FOCUSABLE));
      const atFirst = target === focusables[0];
      const atLast = target === focusables[focusables.length - 1];
      if (event.shiftKey && atFirst) {
        event.preventDefault();
        close(true);
      } else if (!event.shiftKey && atLast) {
        // Focus the trigger, then let the browser continue to what follows it.
        close(true);
      }
    }
  });

  doc.addEventListener('focusin', (event) => {
    if (!state.trigger) return;
    if (inHost(event.target) || event.target === state.trigger) return;
    close(false);
  });

  // --- keep the card beside its trigger while it is open ----------------------
  const reposition = (): void => {
    if (state.trigger) position();
  };
  doc.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
}
