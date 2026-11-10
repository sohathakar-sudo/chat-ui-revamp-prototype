// Conversation engine: one shared conversation for text chat and voice mode.
import { config, type ChatTurn } from '../../../shared/config';
import { newId, store } from './store';

export type ReplyHandle = {
  messageId: string;
  /** Resolves with the full reply text; rejects on error/timeout. */
  done: Promise<string>;
  abort(): void;
};

export function isReplying() {
  return store.get().messages.some((m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'streaming'));
}

export function addUserMessage(text: string) {
  store.set((s) => ({ messages: [...s.messages, { id: newId(), role: 'user', text, status: 'done' }] }));
}

export function removeMessage(id: string) {
  store.set((s) => ({ messages: s.messages.filter((m) => m.id !== id) }));
}

function historyForLLM(): ChatTurn[] {
  return store
    .get()
    .messages.filter((m) => m.status === 'done' && m.text.trim())
    .map((m) => ({ role: m.role, content: m.text }));
}

export function requestReply(onDelta?: (full: string) => void): ReplyHandle {
  const messages = historyForLLM();
  const messageId = newId();
  store.set((s) => ({ messages: [...s.messages, { id: messageId, role: 'assistant', text: '', status: 'pending' }] }));

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), config.requestTimeoutMs);
  };

  const done = (async () => {
    let full = '';
    try {
      arm();
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`reply ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let finished = false;
      while (!finished) {
        const { value, done: eof } = await reader.read();
        if (eof) break;
        arm();
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line) as { t?: string; done?: boolean; error?: string };
          if (msg.error) throw new Error(msg.error);
          if (msg.t) {
            full += msg.t;
            store.updateMessage(messageId, { text: full, status: 'streaming' });
            onDelta?.(full);
          }
          if (msg.done) finished = true;
        }
      }
      if (!finished || !full.trim()) throw new Error('incomplete reply');
      full = full.trim();
      store.updateMessage(messageId, { text: full, status: 'done' });
      return full;
    } catch (err) {
      // Keep any partial text out of history; the turn shows as failed.
      store.updateMessage(messageId, { text: '', status: 'error' });
      throw err;
    } finally {
      clearTimeout(timer);
    }
  })();
  done.catch(() => {});

  return { messageId, done, abort: () => controller.abort() };
}

/** Chat "Retry": drop the failed reply and ask again for the same turn. */
export function retryReply(failedId: string) {
  removeMessage(failedId);
  return requestReply();
}
