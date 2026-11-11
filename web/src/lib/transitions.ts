// Screen transitions for both variants. Each change runs in stages:
//   press (button feedback) → exit (old screen animates out) → swap → enter (new screen animates in).
// Screens read `store.trans` and add CSS classes; all timings live here (CSS at the end of styles.css).
// Any screen change without a timeline for the current variant switches instantly.
import { setNavigator, store, type Screen, type State, type Variant } from './store';

export type TransKind = 'home-chat' | 'home-voice' | 'chat-voice' | 'voice-chat' | 'chat-home';
export type Trans = {
  kind: TransKind;
  variant: Variant;
  stage: 'press' | 'exit' | 'enter';
  /** Which Home button was pressed (keeps its glow during the press delay). */
  source?: 'chat' | 'speak';
  /** Gradient swoosh across the screen, and its direction. */
  swoosh?: 'ltr' | 'rtl';
  /** When the enter stage ends (ms timestamp). Voice waits for this before opening the mic. */
  until: number;
};

type Timeline = { press: number; exit: number; enter: number; swoosh?: 'ltr' | 'rtl' };

const T: Record<Variant, Partial<Record<TransKind, Timeline>>> = {
  A: {
    // Hero expands into Chat; bars swap sideways; input rises; greeting types in.
    'home-chat': { press: 0, exit: 550, enter: 1500 },
    // Speak pill traces blue, then the same blue + white swoosh into Voice (see chat-voice).
    'home-voice': { press: 600, exit: 500, enter: 1500, swoosh: 'ltr' },
    // Input drops, messages go, then the screen settles back into the hero.
    'chat-home': { press: 0, exit: 650, enter: 1000 },
    // Press: a blue glow traces the Speak pill. Then a blue + white swoosh sweeps the whole screen
    // while Voice swaps in (bars swap, orb scales in with a slight overshoot). Flag: no Figma frame.
    'chat-voice': { press: 600, exit: 500, enter: 1500, swoosh: 'ltr' },
    // Orb shrinks away, text fades, bars swap; the thread keeps the voice transcript.
    'voice-chat': { press: 0, exit: 450, enter: 700 },
  },
  B: {
    'home-chat': { press: 0, exit: 450, enter: 900 },
    'home-voice': { press: 0, exit: 550, enter: 1500 },
    'chat-voice': { press: 0, exit: 300, enter: 1500, swoosh: 'ltr' },
    'voice-chat': { press: 0, exit: 300, enter: 700, swoosh: 'ltr' },
    'chat-home': { press: 0, exit: 300, enter: 900, swoosh: 'rtl' },
  },
};
/** Variant B swoosh duration (matched to the reference recording): two soft glows sweep across
 *  while the old screen fades out and the new one fades in underneath. */
export const SWOOSH_MS = 650;

let timers: number[] = [];

export function navigate(to: Screen, patch: Partial<State> = {}, source?: Trans['source']) {
  const s = store.get();
  const kind = `${s.screen}-${to}` as TransKind;
  const t = T[s.variant]?.[kind];
  if (!t || s.trans) {
    if (!s.trans) store.set({ screen: to, ...patch });
    return;
  }
  const base = { kind, variant: s.variant, source, swoosh: t.swoosh };
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
  return trans ? `tr-${trans.variant} tr-${trans.stage} tr-${trans.kind}` : '';
}
