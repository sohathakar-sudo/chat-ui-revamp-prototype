// Variant B screen transitions. Each change runs in stages:
//   press (button glow, ~0.2s after release) → exit (old screen animates out) → swap → enter (new screen animates in).
// Screens read `store.trans` and add CSS classes; all timings live here.
// Variant A, and any screen change without a timeline, switches instantly.
import { setNavigator, store, type Screen, type State } from './store';

export type TransKind = 'home-chat' | 'home-voice' | 'chat-voice' | 'voice-chat' | 'chat-home';
export type Trans = {
  kind: TransKind;
  stage: 'press' | 'exit' | 'enter';
  /** Which Home button was pressed (keeps its glow during the press delay). */
  source?: 'chat' | 'speak';
  /** Gradient swoosh across the screen, and its direction. */
  swoosh?: 'ltr' | 'rtl';
  /** When the enter stage ends (ms timestamp). Voice waits for this before opening the mic. */
  until: number;
};

const T: Record<TransKind, { press: number; exit: number; enter: number; swoosh?: 'ltr' | 'rtl' }> = {
  'home-chat': { press: 200, exit: 450, enter: 900 },
  'home-voice': { press: 200, exit: 550, enter: 1500 },
  'chat-voice': { press: 0, exit: 400, enter: 1500, swoosh: 'ltr' },
  'voice-chat': { press: 0, exit: 400, enter: 700, swoosh: 'ltr' },
  'chat-home': { press: 0, exit: 400, enter: 900, swoosh: 'rtl' },
};
/** Full swoosh duration; it fully covers the screen at its midpoint, when the swap happens. */
export const SWOOSH_MS = 800;

let timers: number[] = [];

export function navigate(to: Screen, patch: Partial<State> = {}, source?: Trans['source']) {
  const s = store.get();
  const kind = `${s.screen}-${to}` as TransKind;
  const t = T[kind];
  if (s.variant !== 'B' || !t || s.trans) {
    if (!s.trans) store.set({ screen: to, ...patch });
    return;
  }
  const base = { kind, source, swoosh: t.swoosh };
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  store.set({ trans: { ...base, stage: 'press', until: 0 } });
  at(t.press, () => store.set({ trans: { ...base, stage: 'exit', until: 0 } }));
  at(t.press + t.exit, () =>
    store.set({ screen: to, ...patch, trans: { ...base, stage: 'enter', until: Date.now() + t.enter } }));
  at(t.press + t.exit + t.enter, () => { store.set({ trans: null }); timers = []; });
}

/** Cancel a running transition (e.g. on variant switch); the app stays on the current screen. */
export function cancelTransition() {
  timers.forEach(clearTimeout);
  timers = [];
  if (store.get().trans) store.set({ trans: null });
}

setNavigator(navigate);

export function transClass(trans: Trans | null) {
  return trans ? `tr-${trans.stage} tr-${trans.kind}` : '';
}
