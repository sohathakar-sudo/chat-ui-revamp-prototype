import { dummyReply, streamDummyReply } from '../../shared/dummyScript.ts';
import type { ReplyProvider } from './types.ts';

export const placeholderProvider: ReplyProvider = {
  name: 'placeholder',
  async *reply(messages, _system, signal) {
    const users = messages.filter((m) => m.role === 'user');
    yield* streamDummyReply(dummyReply(users.length, users.at(-1)?.content), signal);
  },
};
