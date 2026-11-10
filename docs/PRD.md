# Wysa Chat Revamp – Working Prototype PRD (Tech view)

Exported: 10 Nov 2026 · Audience: Claude Code (builder)

## Objective

Build a working, clickable prototype of the revamped Wysa chat experience as a React web app shown inside a phone frame. The prototype covers launch, Home, text chat (typed and voice-note input) and a hands-free full-screen voice mode. Conversations are live: real speech-to-text, LLM-generated Wysa replies and text-to-speech.

## Problem being solved

- The revamp is a voice-first conversation model, and static Figma screens can't show how it feels: turn-taking, silence detection, synced spoken text, pausing, and switching between voice and text.
- Stakeholders need to experience it end to end, and a small group of users needs to try it, before the production build is committed.

## Requirements

### 1. Design source and fidelity

- Figma file: `https://www.figma.com/design/lIFjMFYtHlL9B7fmEhDJWd/Chat-Revamp`
  - Main flow frame: node `523-6574` (Home, Chat thread, Voice-note recorder, Voice mode: Idle / Wysa Speaking / Listening)
  - Loader → Home transition: node `269-1307`. This is a Figma code layer (Vite + React + TS app with its own assets). Pull its source through the Figma MCP and reuse it rather than rebuilding the animation.
  - Choose a Voice screen: node `526-8562`
- Use the Figma MCP (design context + screenshots) for every screen. Match spacing, colors, typography, icons and glow/gradient effects to the design. Download all assets locally, with no Figma asset URLs left in code.
- Screen size follows the Figma frames (412 × 917).
- On desktop, render the app centered inside a phone frame. On a mobile-width viewport, render full-screen without the frame.
- The status bar (time, signal, battery) is decorative.

### 2. Navigation map

- App launch → Loader → Chat thread.
- Chat thread back arrow → Home, played with the loader-to-home transition from the code layer.
- Home → Chat button → Chat thread.
- Home → Speak button or tap on the orb → Voice mode (Idle).
- Voice mode Type → Chat thread.
- Voice mode X → Home.
- Voice mode gear → Choose a Voice → Voice mode (Idle).

### 3. Loader

- Plays the code-layer animation once on launch, then transitions into the Chat thread.
- The Chat thread opens with one Wysa greeting already present (fixed text, editable in one config location; default: "Hi Peter! What's on your mind today?").

### 4. Home

- Header: "Hi Peter!" (hardcoded name), Crisis Help outlined pill, ⋮ menu.
- Hero card: animated orb with dots, "Tap to Talk", "What's on your mind today?", Chat and Speak pill buttons.
- "For your day" section with the Morning Check-in card, and the bottom nav (Home active, Therapist, Self-Care, Progress).
- Only the orb, Chat and Speak are functional. Every other element is visible and inert, with no hover/press feedback that suggests an action.

### 5. Chat thread

- Header: back arrow (left) and progress icon (right).
- Wysa messages: plain left-aligned text with no bubble, with a speaker icon below each message.
- User messages: right-aligned light-cyan rounded bubbles.
- The thread auto-scrolls to the newest message, with a soft gradient fade above the composer as in the design.
- Wysa replies stream in progressively, with a typing indicator shown before the first text arrives.
- The thread shows the full shared conversation, including turns from voice mode (user transcripts as bubbles, Wysa replies as text).

### 6. Composer

- Pill text input with the placeholder "Send a message" and a teal pill button on the right.
- Empty input: the button shows a waveform icon and "Speak", and opens the voice-note recorder (section 7).
- Non-empty input: the button becomes a send button. Enter key sends. Whitespace-only input counts as empty.
- After sending, the input clears and the user bubble appears immediately.

### 7. Voice-note recorder

- Replaces the composer while active: red bin icon (left), elapsed timer (mm:ss), live waveform driven by mic input level, teal circular check button (right).
- The check button stops recording, transcribes, and sends the transcript as a normal user message.
- The bin button discards the recording and restores the composer.

### 8. Message playback

- The speaker icon under a Wysa message plays that message with the currently selected voice.
- While a message plays, its icon shows a playing state. Tapping it again stops playback.

### 9. Progress tooltip

- Tapping the chat header's progress icon shows a small tooltip anchored to the icon: "The updated progress tab will be accessible from here."

### 10. Voice mode

Full-screen view with X (top-left) and gear (top-right). States:

- **Idle:** large soft glowing teal orb, caption "Tap anywhere to start". No Type/Mute controls. Tapping anywhere except X and gear → Listening. This tap is also the user gesture that unlocks browser audio playback.
- **Listening:** orb with a ring and vertical bars animated by mic input level, caption "Listening". The live transcript is shown centered below, ending in "…" while partial. The turn ends automatically after 1.5s of silence (threshold in config), then → Thinking.
- **Thinking:** orb pulses softly, caption "Thinking…". Wait for the LLM reply, then → Wysa Speaking.
- **Wysa Speaking:** orb with animated bars, caption "Wysa Speaking". The reply is spoken in the selected voice, and the reply text is shown centered and revealed in sync: already-spoken words in dark text, upcoming words faded. When speech ends, the mic reopens automatically → Listening.
- **Paused:** entered via Mute. Speech output and mic both stop, the orb is static, caption "Paused", and no message text is shown. The Mute button shows an active/toggled state. Tapping Mute again resumes → Listening.
- **Reconnecting (error state):** orb with four static teal dots inside the glowing ring, no message text. The caption shows a small spinning ring followed by "Reconnecting" in the error color (coral red), per the provided reference. The app retries automatically in the background, and on success returns to the state it was in.
- **Caption slot rule:** the caption under the orb is the single place for every status and indicator on the voice screen, including Listening, Thinking…, Wysa Speaking, Paused, Reconnecting and all error or warning messages. No banners, toasts or inline messages elsewhere on the voice screen. Normal states use the default muted caption style. Errors and warnings use the error color, with the spinner only while a retry is in progress.
- Bottom controls in Listening, Thinking, Wysa Speaking, Paused and Reconnecting: Type (Aa) and Mute (mic-slash) circular buttons with labels.
- Every completed user turn and Wysa reply is added to the shared conversation in real time.

### 11. Choose a Voice

- Opening it from the gear pauses any active voice conversation.
- Layout: X (top-left), title "Choose a Voice", four cards, and a Continue button.
  - Cindy – A warm, softer voice
  - Daniel – A calm, lower voice
  - Lucy – British warm voice
  - Harrison – British calm voice
- Tapping a card selects it and plays a short sample line in that voice. Only one card can be selected at a time.
- Selected card: a small white circle with a teal check in the top-right corner, plus a subtle outline (per the provided reference). Unselected cards have neither.
- Default selection on first open: Cindy.
- Continue saves the selection and returns to voice mode (Idle). X discards any change and returns to voice mode (Idle).
- The selected voice applies to voice mode and message playback (section 8) for the rest of the session.

### 12. Conversation engine

- A single conversation is shared across text chat and voice mode.
- Wysa persona prompt (editable in one config location): a warm, empathetic, non-judgmental wellbeing companion using CBT-informed, supportive language. Replies are 2–4 short sentences, plain spoken language, with no markdown, lists or emojis, so they read and sound natural in both modes.
- Only the most recent ~20 turns are sent to the LLM with each request (count in config). Older turns stay visible in the thread.
- Reply text is streamed into the chat thread. In voice mode, speech starts as soon as enough text is available for natural playback.

### 13. Speech and AI providers

- Speech-to-text, LLM and text-to-speech each sit behind a provider-agnostic layer (transcribe / reply / speak). Providers are selected and configured in one place, and switching provider requires no UI changes. Final providers are TBD by the team; build so they can be filled in later.
- A small server component holds all provider API keys and relays requests. No keys are shipped to or readable in the browser.
- Voice mapping: Cindy, Daniel, Lucy and Harrison map to provider voice IDs in one config location, with placeholders until the team decides.
- Fallback mode (default until providers are configured): speech-to-text and text-to-speech use the browser's built-in speech engines, with the four voices mapped to the closest available system voices, and the LLM uses the configured provider or a placeholder reply generator if none is set. Fallback mode is switchable in config.
- Synced text reveal uses word timings from the TTS engine when available. When the engine provides none, timings are estimated by spreading words across the audio duration in proportion to word length.
- Setup instructions (env file, how to plug in each provider, how to run locally and deploy for stakeholders) go in the README.

### 14. Session and data

- Conversation history and the voice selection live in memory for the current browser session only.
- Nothing is stored on any server: no transcripts, audio or replies are logged or persisted by the server component beyond relaying the request.

## Edge case summary

### Launch and session

- Page refresh or reopen: history and voice selection reset, and the app restarts at the Loader.

### Mic and permissions

- Mic permission denied: show "Wysa needs mic access to talk. Enable it in your browser settings." In the Chat thread this appears inline above the composer. In voice mode it appears in the caption slot in the error style (no spinner), and Type remains available as the way out.
- Browser without mic or speech support: voice entry points (Home Speak/orb, composer Speak) show a tooltip that voice isn't supported in this browser. Text chat remains fully functional.

### Voice mode

- No speech within 8s of the mic opening: return to Idle ("Tap anywhere to start").
- User turn longer than 60s: auto-end the turn and send.
- User speaks while Wysa is speaking: ignored. The mic reopens only after Wysa finishes.
- Mute during Thinking: the reply is held. On resume, the held reply plays (Wysa Speaking) before returning to Listening.
- Type tapped mid-speech: speech stops, the full reply text is in the thread, and the user lands in the Chat thread.
- X tapped mid-turn: all audio and mic stop immediately, completed parts of the turn are kept in history, and the user goes to Home.
- Browser tab hidden or backgrounded: auto-enter Paused.
- Voice changed mid-conversation: the new voice applies from Wysa's next reply.

### Text chat

- Send while a Wysa reply is in progress: the input stays editable, but send is disabled until the reply completes.
- Voice note at 2 minutes: auto-stop and send. Voice note under 1s: discarded silently. Empty transcription: show "Couldn't catch that, try again."
- Bin: discards immediately with no confirmation.
- Tapping a speaker icon while another message plays: the first stops and the new one plays.
- Progress tooltip: auto-dismisses after 3s or on any tap.

### Failures

- LLM or TTS error, or no response within 15s: in chat, show an inline "Something went wrong · Retry" under the failed turn. In voice mode, enter Reconnecting and retry the same turn automatically up to 3 times. If all retries fail, the caption changes to "Couldn't connect. Tap to retry" in the error style without the spinner, and tapping the screen retries the same turn.
- TTS fails but the LLM succeeds: show the reply as text (in chat, and centered in voice mode) and continue to Listening once the text is shown.
- Offline: in the Chat thread, a slim "You're offline" banner appears and send and voice-note input are disabled until the connection returns. In voice mode, enter Reconnecting (no banner), the mic stays off, and the conversation resumes in Listening once the connection returns.
- Very long conversation: handled by the turn limit sent to the LLM (section 12), with no user-visible change.

## Out of scope

- Crisis Help flow and risk detection.
- Barge-in (interrupting Wysa by speaking).
- Home secondary content: ⋮ menu, "For your day" cards and bottom nav destinations.
- The Progress tab itself (only the tooltip is in scope).
- Entering full voice mode from the Chat thread.
- Login, accounts, real user names and persistence across sessions.
- Analytics and logging.
- Production hardening, including HIPAA compliance; this is a prototype, not for clinical use.
- Native iOS/Android builds.
