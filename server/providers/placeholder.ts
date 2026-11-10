import type { ReplyProvider } from './types.ts';

// Used when no LLM is configured, so the prototype still has a conversation to show.
const REPLIES = [
  "That sounds like a lot to carry. Thank you for sharing it with me. What feels heaviest about it right now?",
  "I hear you. It makes sense to feel that way. Would it help to talk through what happened step by step?",
  "It takes courage to put that into words. Let's slow down together for a moment. What would feel like one small kind thing you could do for yourself today?",
  "That's a really understandable reaction. Sometimes our thoughts make things feel bigger than they are. What's the story your mind is telling you about this?",
  "I'm glad you're giving this some attention. Noticing how you feel is already a step. What would you like to feel instead?",
];
let i = 0;

export const placeholderProvider: ReplyProvider = {
  name: 'placeholder',
  async *reply(_messages, _system, signal) {
    const text = REPLIES[i++ % REPLIES.length];
    await sleep(600, signal);
    for (const word of text.split(/(?<= )/)) {
      await sleep(45, signal);
      yield word;
    }
  },
};

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
  });
}
