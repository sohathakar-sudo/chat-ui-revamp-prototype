// Home → Chat (both variants): once the bars are in, Wysa's latest message types in,
// then its playback control appears.
import { useEffect, useState } from 'react';
import { store, type Message } from './store';

const TYPE_CHAR_MS = 28;
/** Message ids already typed in, so re-mounting Chat (e.g. back from Voice) never retypes. */
const typedIds = new Set<string>();

export function useTypeIn(messages: Message[], startMs: number) {
  const [state] = useState(() => {
    const t = store.get().trans;
    const fromHome = t?.kind === 'home-chat' && t.stage === 'enter';
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.status === 'done');
    if (!last) return null;
    // First Chat mount (loader -> chat) has no transition: type the greeting once. Never retype
    // when arriving from Voice (transcript already seen) or for a message already typed.
    const first = !t && !typedIds.has(last.id);
    if (!fromHome && !first) return null;
    return { id: last.id, len: last.text.length };
  });
  const [shown, setShown] = useState(state ? 0 : Infinity);
  useEffect(() => {
    if (!state) return;
    typedIds.add(state.id);
    let n = 0;
    let iv = 0;
    const start = window.setTimeout(() => {
      iv = window.setInterval(() => {
        n += 1;
        setShown(n);
        if (n >= state.len) { window.clearInterval(iv); setShown(Infinity); }
      }, TYPE_CHAR_MS);
    }, startMs);
    return () => { window.clearTimeout(start); window.clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return { typingId: shown === Infinity ? null : state?.id ?? null, shown, typedId: state?.id ?? null };
}
