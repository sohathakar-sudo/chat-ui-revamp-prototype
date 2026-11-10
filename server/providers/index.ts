// Provider registry. Add a new provider by implementing the interface in types.ts
// and registering it here; the UI never changes.
import { config } from '../../shared/config.ts';
import type { ReplyProvider, SpeakProvider, TranscribeProvider } from './types.ts';
import { anthropicProvider } from './anthropic.ts';
import { placeholderProvider } from './placeholder.ts';

function hasAnthropicCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function getReplyProvider(): ReplyProvider {
  if (config.providers.llm === 'anthropic' && hasAnthropicCredentials()) return anthropicProvider;
  return placeholderProvider;
}

// Server-side STT/TTS: fill these in once the team picks providers (see README).
// Return null while unconfigured; the browser then uses its built-in engines.
const transcribeProvider: TranscribeProvider | null = null;
const speakProvider: SpeakProvider | null = null;

export function getTranscribeProvider(): TranscribeProvider | null {
  if (config.providers.fallbackMode || config.providers.stt !== 'server') return null;
  return transcribeProvider;
}

export function getSpeakProvider(): SpeakProvider | null {
  if (config.providers.fallbackMode || config.providers.tts !== 'server') return null;
  return speakProvider;
}
