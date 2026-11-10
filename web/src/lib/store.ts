import { useSyncExternalStore } from 'react';
import { config, prototype, type VoiceName } from '../../../shared/config';
import type { Trans } from './transitions';

export type Screen = 'pick' | 'loader' | 'chat' | 'home' | 'voice' | 'voices';
export type Variant = (typeof prototype.variants)[number]['id'];

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** pending = waiting for first text (typing indicator); streaming = text arriving. */
  status: 'pending' | 'streaming' | 'done' | 'error';
};

export type State = {
  screen: Screen;
  /** Plays the loader-to-home transition over Home. */
  homeTransition: boolean;
  messages: Message[];
  voice: VoiceName;
  online: boolean;
  /** Wysa message whose speaker icon is playing. */
  playingId: string | null;
  status: { llm: string; stt: 'browser' | 'server'; tts: 'browser' | 'server' };
  /** Design variant (A/B). Session only; a link can preselect it with ?variant=B. */
  variant: Variant;
  /** Running Variant B screen transition, if any. */
  trans: Trans | null;
};

let id = 0;
export const newId = () => `m${++id}`;

// Dev-only: /?screen=home|chat|voice|voices skips the loader for design review.
const devScreen = import.meta.env.DEV && typeof location !== 'undefined'
  ? (new URLSearchParams(location.search).get('screen') as Screen | null)
  : null;

const linkVariant = typeof location !== 'undefined'
  ? (new URLSearchParams(location.search).get('variant') || '').toUpperCase()
  : '';
const linkVariantValid = prototype.variants.some((v) => v.id === linkVariant);
const initialVariant: Variant = linkVariantValid ? (linkVariant as Variant) : prototype.defaultVariant;

// Entry point: dev ?screen=/?state= shortcuts and a ?variant= link skip the chooser;
// otherwise the app opens on "Choose a Variant".
const startScreen: Screen = devScreen
  ? devScreen
  : import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('state=')
    ? 'voice'
    : linkVariantValid
      ? 'loader'
      : 'pick';

let state: State = {
  screen: startScreen,
  homeTransition: false,
  messages: [{ id: newId(), role: 'assistant', text: config.greeting, status: 'done' }],
  voice: config.defaultVoice,
  playingId: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  status: { llm: 'placeholder', stt: 'browser', tts: 'browser' },
  variant: initialVariant,
  trans: null,
};

const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State> | ((s: State) => Partial<State>)) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  updateMessage(mid: string, patch: Partial<Message>) {
    store.set((s) => ({ messages: s.messages.map((m) => (m.id === mid ? { ...m, ...patch } : m)) }));
  },
  go(screen: Screen, source?: 'chat' | 'speak') {
    nav(screen, {}, source);
  },
  /** Enter voice mode from Home or Chat (call inside the tap so audio is unlocked). */
  enterVoice(source?: 'chat' | 'speak') {
    nav('voice', {}, source);
  },
};

// Set by transitions.ts (avoids a circular import at module load).
let nav: (to: Screen, patch?: Partial<State>, source?: 'chat' | 'speak') => void = (to, patch) => store.set({ screen: to, ...patch });
export function setNavigator(fn: typeof nav) { nav = fn; }

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(state));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => store.set({ online: true }));
  window.addEventListener('offline', () => store.set({ online: false }));
  fetch('/api/status')
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => s && store.set({ status: s }))
    .catch(() => {});
}

// Dev-only handle for design review (freeze transitions at a given moment, inspect state).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __wysa: typeof store }).__wysa = store;
}
