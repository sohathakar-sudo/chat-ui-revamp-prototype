import { useSyncExternalStore } from 'react';
import { config, type VoiceName } from '../../../shared/config';

export type Screen = 'loader' | 'chat' | 'home' | 'voice' | 'voices';

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
};

let id = 0;
export const newId = () => `m${++id}`;

// Dev-only: /?screen=home|chat|voice|voices skips the loader for design review.
const devScreen = import.meta.env.DEV && typeof location !== 'undefined'
  ? (new URLSearchParams(location.search).get('screen') as Screen | null)
  : null;

let state: State = {
  screen: devScreen || (import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('state=') ? 'voice' : 'loader'),
  homeTransition: false,
  messages: [{ id: newId(), role: 'assistant', text: config.greeting, status: 'done' }],
  voice: config.defaultVoice,
  playingId: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  status: { llm: 'placeholder', stt: 'browser', tts: 'browser' },
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
  go(screen: Screen) {
    store.set({ screen });
  },
};

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
