import { useStore } from '../lib/store';
import { useChat } from '../lib/useChat';
import { ChatA } from './a/ChatA';
import { ChatB } from './b/ChatB';

export function Chat() {
  const variant = useStore((s) => s.variant);
  const c = useChat();
  return variant === 'B' ? <ChatB c={c} /> : <ChatA c={c} />;
}
