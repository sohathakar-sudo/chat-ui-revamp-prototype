import type { ChatTurn } from '../../shared/config.ts';
import type { ReplyProvider } from './types.ts';

// A scripted dummy conversation, used when no LLM is configured and as the automatic
// fallback when a real reply fails (see server/index.ts). It advances by conversation
// turn so it reads like a coherent Wysa session rather than random canned lines.
//
// Two scenarios are scripted; the active one is chosen by time of day (see pickScript).
// Each line is written to make sense after almost any user message for that moment.

// Scenario 1 — end of the day, extremely tired after a full day of work (a wind-down).
const END_OF_DAY = [
  "It sounds like today really took it out of you. You made it through, though, and that counts for something. What part of the day is sitting with you most right now?",
  "That makes complete sense after a day like that — your mind and body have been working hard. Right now you don't need to solve anything. Can we just let you arrive here for a moment? Take one slow breath with me.",
  "Good. Being this tired is your system asking for rest, not a sign you fell short. What's one small thing that would help you wind down tonight — something easy, not another task?",
  "That sounds kind. You've given a lot today; it's okay to turn some of that care back toward yourself now. Is there anything you'd like to set down before tomorrow?",
  "Thank you for letting it out here. Rest is allowed, and tomorrow can wait. I'll be here whenever you want to check in again — be gentle with yourself tonight.",
];

// Scenario 2 — checking the app right before a meeting (a quick grounding).
const BEFORE_MEETING = [
  "Sounds like you've got a meeting coming up. Let's take a quick moment to steady you before you walk in. How are you feeling about it?",
  "That's completely normal before something that matters. Let's ground you fast — take one slow breath in, and a longer breath out. What's the one thing you'd like to come away with from this meeting?",
  "That's a clear intention to walk in with. You're prepared enough, and you don't have to be perfect — just present. Anything else on your mind before you head in?",
  "You've got this. Go in steady, and remember you can take a breath any time you need to. I'll be right here afterwards if you want to talk it through.",
];

// After a scenario's script, keep the conversation open with gentle, reusable prompts.
const LOOP = [
  "I'm still here with you. Take your time — what feels most present for you right now?",
  "Thank you for sharing that. What would feel most supportive for you in this moment?",
];

/** Evening/night → the end-of-day wind-down; daytime → the pre-meeting grounding. */
function pickScript(): string[] {
  const h = new Date().getHours();
  return h >= 17 || h < 5 ? END_OF_DAY : BEFORE_MEETING;
}

export const placeholderProvider: ReplyProvider = {
  name: 'placeholder',
  async *reply(messages: ChatTurn[], _system, signal) {
    const script = pickScript();
    const userTurns = messages.filter((m) => m.role === 'user').length;
    const idx = Math.max(0, userTurns - 1);
    const text = idx < script.length ? script[idx] : LOOP[(idx - script.length) % LOOP.length];
    await sleep(600, signal);
    // Stream word by word so the client renders it like a live reply.
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
