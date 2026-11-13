// Single place for every non-secret setting. Imported by both the web app and the server.
// API keys never go here: they live in .env and are only read by the server.

export type VoiceName = 'Cindy' | 'Daniel' | 'Lucy' | 'Harrison';

export const config = {
  /** First Wysa message shown when the Chat thread opens. */
  greeting: "Hi Peter! What's on your mind today?",
  userName: 'Peter',

  /** Wysa persona, sent as the system prompt with every LLM request. */
  persona: [
    'You are Wysa, a warm, empathetic and non-judgmental wellbeing companion.',
    'Use supportive, CBT-informed language: reflect feelings, gently explore thoughts, and offer small practical steps when helpful.',
    'Reply in 2 to 4 short sentences of plain spoken language.',
    'Never use markdown, lists, headings or emojis, because every reply is both shown as text and read aloud.',
  ].join(' '),

  /** How many recent turns (user + Wysa messages) are sent to the LLM. Older ones stay visible. */
  maxTurnsSentToLLM: 20,

  voice: {
    /** Silence after speech that ends a voice turn. */
    silenceMs: 1500,
    /** No speech at all within this window after the mic opens → back to Idle. */
    noSpeechTimeoutMs: 8000,
    /** Variant A: auto-close voice mode after this long with no activity. */
    inactivityMs: 15000,
    /** Auto-end a single user turn after this long. */
    maxTurnMs: 60_000,
    /** Characters of reply text to buffer before voice mode starts speaking. */
    minCharsBeforeSpeaking: 60,
    /** Automatic retries before showing "Couldn't connect. Tap to retry". */
    maxRetries: 3,
    sampleLine: "Hi, I'm here whenever you want to talk.",
  },

  voiceNote: {
    maxMs: 120_000,
    minMs: 1000,
  },

  /** LLM or TTS with no response within this window counts as a failure. */
  requestTimeoutMs: 15_000,

  /** Progress tooltip auto-dismiss. */
  tooltipMs: 3000,

  /**
   * Providers. 'browser' = built-in Web Speech engines (fallback mode).
   * Server providers are implemented in server/providers/*. Switching here needs no UI change.
   */
  providers: {
    /** When true, STT and TTS use the browser engines regardless of the settings below. */
    fallbackMode: true,
    stt: 'browser' as 'browser' | 'server',
    tts: 'browser' as 'browser' | 'server',
    /** 'anthropic' uses ANTHROPIC_API_KEY from .env; 'placeholder' returns canned replies. */
    llm: 'anthropic' as 'anthropic' | 'placeholder',
    anthropicModel: 'claude-opus-5-5',
  },

  /**
   * Voice mapping. providerVoiceId is used by a server TTS provider (placeholders until decided).
   * browserHints pick the closest system voice in fallback mode (first match wins).
   */
  voices: {
    Cindy: {
      description: 'A warm, softer voice',
      providerVoiceId: 'TBD-cindy',
      browserHints: { lang: 'en-US', names: ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Allison', 'Ava', 'female'] },
      pitch: 1.05,
      rate: 0.95,
    },
    Daniel: {
      description: 'A calm, lower voice',
      providerVoiceId: 'TBD-daniel',
      browserHints: { lang: 'en-US', names: ['Aaron', 'Fred', 'Microsoft Guy', 'Microsoft Davis', 'Alex', 'Tom', 'male'] },
      pitch: 0.85,
      rate: 0.92,
    },
    Lucy: {
      description: 'British warm voice',
      providerVoiceId: 'TBD-lucy',
      browserHints: { lang: 'en-GB', names: ['Kate', 'Serena', 'Martha', 'Google UK English Female', 'Microsoft Sonia', 'Microsoft Libby', 'female'] },
      pitch: 1.05,
      rate: 0.95,
    },
    Harrison: {
      description: 'British calm voice',
      providerVoiceId: 'TBD-harrison',
      browserHints: { lang: 'en-GB', names: ['Daniel', 'Arthur', 'Oliver', 'Google UK English Male', 'Microsoft Ryan', 'Microsoft George', 'male'] },
      pitch: 0.9,
      rate: 0.92,
    },
  } satisfies Record<VoiceName, unknown>,

  defaultVoice: 'Cindy' as VoiceName,
  serverPort: 8787,
};

/**
 * Prototype controls (variant switcher modal). Add a variant or a control here; the modal
 * renders whatever is listed, so no new UI work is needed.
 */
export const prototype = {
  defaultVariant: 'A' as 'A' | 'B' | 'C',
  variants: [
    { id: 'A' as const, label: 'Variant A', tagline: 'Calm blue', description: 'Iteration 1: white and teal, glowing orb' },
    { id: 'B' as const, label: 'Variant B', tagline: 'Neutral, Contemplative', description: 'Iteration 2: pastel gradients, orange accent' },
    { id: 'C' as const, label: 'Variant C', tagline: 'Warm, Talk or Type', description: 'Iteration 3: orange Talk and Mic, scrolling voice transcript' },
  ],
  controls: [
    { id: 'variant' as const, label: 'Design variant' },
  ],
};

export const VOICE_ORDER: VoiceName[] = ['Cindy', 'Daniel', 'Lucy', 'Harrison'];

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
