import { useStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';
import { VoiceA } from './a/VoiceA';
import { VoiceB } from './b/VoiceB';

/** One controller for both variants, so switching variant keeps the conversation state. */
export function Voice() {
  const variant = useStore((s) => s.variant);
  const v = useVoice(variant);
  return variant === 'B' ? <VoiceB v={v} /> : <VoiceA v={v} />;
}
