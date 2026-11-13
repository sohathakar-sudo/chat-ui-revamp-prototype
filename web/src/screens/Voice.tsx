import { useStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';
import { VoiceA } from './a/VoiceA';
import { VoiceB } from './b/VoiceB';
import { VoiceC } from './c/VoiceC';

/** One controller for both variants, so switching variant keeps the conversation state. */
export function Voice() {
  const variant = useStore((s) => s.variant);
  const v = useVoice(variant);
  if (variant === 'C') return <VoiceC v={v} />;
  return variant === 'B' ? <VoiceB v={v} /> : <VoiceA v={v} />;
}
