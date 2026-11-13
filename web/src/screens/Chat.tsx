import { useStore } from '../lib/store';
import { useChat } from '../lib/useChat';
import { ChatA } from './a/ChatA';
import { ChatB } from './b/ChatB';
import { ChatC } from './c/ChatC';

export function Chat() {
  const variant = useStore((s) => s.variant);
  const c = useChat();
  if (variant === 'C') return <ChatC c={c} />;
  return variant === 'B' ? <ChatB c={c} /> : <ChatA c={c} />;
}
