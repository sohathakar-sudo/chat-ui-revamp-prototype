import type { ChatTurn, VoiceName } from '../../shared/config.ts';

/** LLM: stream reply text for a conversation. Yields text chunks. */
export interface ReplyProvider {
  name: string;
  reply(messages: ChatTurn[], system: string, signal: AbortSignal): AsyncIterable<string>;
}

/** Speech-to-text: audio in, transcript out. */
export interface TranscribeProvider {
  name: string;
  transcribe(audio: Buffer, mimeType: string, signal: AbortSignal): Promise<string>;
}

export type WordTiming = { word: string; startMs: number; endMs: number };

/** Text-to-speech: text in, audio out, with optional word timings for the synced reveal. */
export interface SpeakProvider {
  name: string;
  speak(text: string, voice: VoiceName, voiceId: string, signal: AbortSignal): Promise<{
    audio: Buffer;
    mimeType: string;
    timings?: WordTiming[];
  }>;
}
