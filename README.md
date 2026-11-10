# Wysa Chat Revamp – Working Prototype

A clickable React prototype of the revamped Wysa chat, with two switchable design variants (A and B): Loader → Chat, Home, text chat with voice notes, and hands-free voice mode. Requirements: [docs/PRD.md](docs/PRD.md). UI source of truth: the Figma file linked in [CLAUDE.md](CLAUDE.md).

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

### Variants

- **Desktop:** the "Variants" button at the bottom-right, outside the phone frame, opens the prototype controls.
- **Mobile:** triple-tap the status bar.
- Switching keeps the conversation, the selected voice and the current screen. A voice turn in progress pauses and stays paused in the new variant.
- Share a variant directly with `?variant=B` (or `?variant=A`). Default is A.
- Add a variant or a control in `prototype` in `shared/config.ts`; the modal lists whatever is there.

### Design review shortcuts (dev only)

- `/?screen=home|chat|voice|voices` skips the loader.
- `/?state=listening|thinking|speaking|paused|reconnecting|failed|denied|timeout` shows a voice-mode state with sample text.
- Combine with a variant, for example `/?variant=B&state=speaking`.

## How it's put together

| Path | What it is |
|---|---|
| `shared/config.ts` | **The one config file**: greeting, persona prompt, turn limit, silence/timeouts, provider choice, voice mapping, variants and prototype controls. |
| `server/index.ts` | Small relay server. Holds API keys, relays requests, stores and logs nothing. |
| `server/providers/` | Provider layer: `reply` (LLM), `transcribe` (STT), `speak` (TTS). |
| `web/src/lib/conversation.ts` | The single shared conversation used by chat and voice mode. |
| `web/src/lib/speech.ts` | Mic level, browser/server STT, browser/server TTS, word-timed reveal. |
| `web/src/lib/useVoice.ts`, `useChat.ts` | Shared voice-mode state machine and chat behavior, used by both variants. |
| `web/src/screens/` | Screen containers (Loader, Home, Chat, Voice, ChooseVoice) that pick the variant's view. |
| `web/src/screens/a/`, `screens/b/` | Variant-specific UI only. |
| `web/src/components/VariantSwitcher.tsx` | The prototype controls modal. |
| `web/public/assets/` (`b/` for Variant B) | All design assets, downloaded from Figma (no Figma URLs at runtime). |

History, voice choice and variant live in browser memory only. A refresh starts over at the Loader (the `?variant=` link still applies).

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

Places where the build had to go beyond, or choose between, the Figma file and the PRD. Items 1–8 are Variant A or shared; 9–14 are Variant B.

1. **Loader and loader→Home transition.** The Figma code layer (node 269-1307) couldn't be read through the available Figma tools, so the loader was rebuilt from its rendered frame: the wordmark was cropped from that render as a PNG, the circle and text are recreated, and the transition is an approximation. Swap in the real code-layer source when it can be exported.
2. **Idle orb animation.** Figma's motion data scales the inner core to 2×, which doesn't match the static Idle frame. The animation ends at the static frame's size.
3. **Idle controls.** The Figma Idle frame shows Type/Mute. The PRD says no controls in Idle, so they're hidden.
4. **Reconnecting.** The PRD describes four static dots and no message text. The Figma frame now shows a plain ring plus text. The build uses Figma's ring and the PRD's no-text rule.
5. **Chat composer buttons.** In both variants the chat "Speak" pill opens full voice mode (confirmed by product, 10 Nov 2026). Variant A's mic records voice notes ("tap the mic to dictate"); Variant B has no voice-note entry in chat.
6. **No Figma frame, built from existing styles:** typing indicator, Thinking and Paused orbs, Mute active state, "Something went wrong · Retry", "You're offline" banner, progress and "voice not supported" tooltips, speaker playing state, mic-denied and "Couldn't catch that" messages.
7. **Listening ring.** `listen-ring.svg` is Figma's listening graphic with the bars removed, so the bars can move with the mic level.
8. **Fonts.** The composer uses Google Sans Flex (loaded from Google Fonts). SF Pro is used where the device has it (Apple devices). Elsewhere it falls back to the system font, so text metrics can differ slightly.
9. **B Speak pill style.** The PRD says "orange-outlined"; the Figma frame shows a white pill with orange text and icon. The build follows Figma. The same goes for the active Pause button (orange icon and label, no outline).
10. **B glow animations.** Figma's motion data slides each glow 250px in over 200ms and loops it every 2s. A looping jump looked broken, so the slide plays once each time a state is entered. The orb spins follow the motion data (a half-turn every 2s).
11. **B Listening orb** pulses slightly with mic level, on top of its Figma spin, so users can see the mic is live.
12. **B states with no frame:** Thinking (pulsing Listening orb), Reconnecting and "Couldn't connect" (static Listening orb with the error caption), the "Tap to start" timeout, typing dots, the retry line and tooltips.
13. **B Ready.** The mic opens straight away when voice mode is entered from Home. Returning from Choose a Voice, or switching variant into voice mode, lands on "Start Speaking" and waits for a tap, because browsers need a tap before they play audio.
14. **B Speak in chat** opens voice mode straight into Listening, like Speak on Home. The orange voice-note recorder stays in code but isn't reachable in B.
15. **B voice X → Chat.** Closing voice mode in B lands on the Chat thread, which shows the whole voice conversation; Chat's back arrow then goes Home. Variant A's X still goes Home.
16. **B Pause on Ready.** Pause is shown on the Start Speaking screen (per Figma), so it works there too: it cancels a mic that is still opening and holds in Paused until tapped again.
