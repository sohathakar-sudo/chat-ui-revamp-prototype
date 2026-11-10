// Home → Chat (both variants): once the bars are in, Wysa's latest message types in,
// then its playback control appears.
import { useEffect, useState } from 'react';
import { store, type Message } from './store';

const TYPE_CHAR_MS = 28;

export function useTypeIn(messages: Message[], startMs: number) {
  const [state] = useState(() => {
    const t = store.get().trans;
    if (!(t?.kind === 'home-chat' && t.stage === 'enter')) return null;
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.status === 'done');
    return last ? { id: last.id, len: last.text.length } : null;
  });
  const [shown, setShown] = useState(state ? 0 : Infinity);
  useEffect(() => {
    if (!state) return;
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
