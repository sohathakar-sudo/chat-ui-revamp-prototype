# Wysa Chat Revamp – Working Prototype

A clickable React prototype of the revamped Wysa chat: Loader → Chat, Home, text chat with voice notes, and hands-free voice mode. Requirements: [docs/PRD.md](docs/PRD.md). UI source of truth: the Figma file linked in [CLAUDE.md](CLAUDE.md).

Prototype only: not for clinical use, and not HIPAA-hardened.

## Run it locally

Needs Node 23.6 or newer (the server runs TypeScript directly).

```bash
npm install
cp .env.example .env     # optional: add ANTHROPIC_API_KEY for real replies
npm run dev
```

Open http://localhost:5173 in **Chrome** (best Web Speech support) and allow the microphone when asked. On a desktop window the app sits in a phone frame. Below 500px wide it goes full-screen.

Without an API key, Wysa answers from a small set of canned placeholder replies, so every flow still works.

### Design review shortcuts (dev only)

- `/?screen=home|chat|voice|voices` skips the loader.
- `/?state=listening|thinking|speaking|paused|reconnecting|failed|denied` shows a voice-mode state with sample text.

## How it's put together

| Path | What it is |
|---|---|
| `shared/config.ts` | **The one config file**: greeting, persona prompt, turn limit, silence/timeouts, provider choice, voice mapping. |
| `server/index.ts` | Small relay server. Holds API keys, relays requests, stores and logs nothing. |
| `server/providers/` | Provider layer: `reply` (LLM), `transcribe` (STT), `speak` (TTS). |
| `web/src/lib/conversation.ts` | The single shared conversation used by chat and voice mode. |
| `web/src/lib/speech.ts` | Mic level, browser/server STT, browser/server TTS, word-timed reveal. |
| `web/src/screens/` | Loader, Home, Chat, Voice, ChooseVoice. |
| `web/public/assets/` | All design assets, downloaded from Figma (no Figma URLs at runtime). |

History and voice choice live in browser memory only. A refresh starts over at the Loader.

## Providers

Each capability sits behind an interface in `server/providers/types.ts`. Switching providers is a config change and needs no UI change.

**LLM (reply).** Set `providers.llm` in `shared/config.ts`:
- `'anthropic'` (default) uses Claude (`claude-opus-5-5`, low effort for fast conversational replies) when `ANTHROPIC_API_KEY` is in `.env`. Server-side refusal fallback is on, so if the model declines a message the API retries it on a fallback model. Without a key it uses the placeholder.
- `'placeholder'` always returns canned replies.
- To add another LLM, implement `ReplyProvider` in a new file and return it from `getReplyProvider()` in `server/providers/index.ts`.

**Speech-to-text and text-to-speech.** These are in fallback mode by default (`providers.fallbackMode: true`): the browser's built-in engines, with Cindy/Daniel/Lucy/Harrison mapped to the closest system voices via `voices.*.browserHints`.

To plug in real providers once the team picks them:
1. Implement `TranscribeProvider` and/or `SpeakProvider` (see `types.ts`) in `server/providers/`, reading keys from `process.env`.
2. Assign them to `transcribeProvider` / `speakProvider` in `server/providers/index.ts`.
3. In `shared/config.ts` set `fallbackMode: false`, `stt: 'server'` and/or `tts: 'server'`.
4. Put each voice's provider ID in `voices.<Name>.providerVoiceId`.
5. Add the keys to `.env` (and `.env.example` without values).

If the TTS provider returns word timings, the spoken-text reveal uses them. Otherwise timings are estimated across the audio duration in proportion to word length.

## Deploy for stakeholders

```bash
npm run build
npm start          # serves the built app and the API on PORT (default 8787)
```

Any Node host that runs a long-lived process works (Render, Railway, Fly.io, a small VM). Set `ANTHROPIC_API_KEY` (and any future provider keys) as environment variables on the host, never in the code. The site must be served over **HTTPS**, or browsers will block the microphone.

## Design notes for review

Places where the build had to go beyond, or choose between, the Figma file and the PRD:

1. **Loader and loader→Home transition.** The Figma code layer (node 269-1307) couldn't be read through the available Figma tools, so the loader was rebuilt from its rendered frame: the wordmark was cropped from that render as a PNG, the circle and text are recreated, and the transition is an approximation. Swap in the real code-layer source when it can be exported.
2. **Idle orb animation.** Figma's motion data scales the inner core to 2×, which doesn't match the static Idle frame. The animation ends at the static frame's size.
3. **Idle controls.** The Figma Idle frame shows Type/Mute. The PRD says no controls in Idle, so they're hidden.
4. **Reconnecting.** The PRD describes four static dots and no message text. The Figma frame shows the static bars plus text. The build uses Figma's orb and the PRD's no-text rule.
5. **No Figma frame, built from existing styles:** typing indicator, send button state, Thinking and Paused orbs, Mute active state, "Something went wrong · Retry", "You're offline" banner, progress and "voice not supported" tooltips, speaker playing state, mic-denied and "Couldn't catch that" messages.
6. **Listening ring.** `listen-ring.svg` is Figma's listening graphic with the bars removed, so the bars can move with the mic level.
7. **Fonts.** SF Pro is used where the device has it (Apple devices). Elsewhere it falls back to the system font, so text metrics can differ slightly.
