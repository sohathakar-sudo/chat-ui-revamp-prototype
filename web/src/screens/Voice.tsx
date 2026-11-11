import { useEffect } from 'react';
import { useStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';
import { playVoiceIndicator } from '../lib/speech';
import { VoiceA } from './a/VoiceA';
import { VoiceB } from './b/VoiceB';

/** One controller for both variants, so switching variant keeps the conversation state. */
export function Voice() {
  const variant = useStore((s) => s.variant);
  const v = useVoice(variant);
  // Blip when voice mode opens and again when it closes.
  useEffect(() => {
    playVoiceIndicator();
    return () => playVoiceIndicator();
  }, []);
  return variant === 'B' ? <VoiceB v={v} /> : <VoiceA v={v} />;
}
