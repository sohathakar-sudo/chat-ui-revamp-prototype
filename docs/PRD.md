# Wysa Chat Revamp – Working Prototype PRD (Tech view)

Exported: 10 Nov 2026 · Revised: 10 Nov 2026 · Audience: Claude Code (builder)

## Objective

Build one working, clickable prototype of the revamped Wysa chat experience as a React web app shown inside a phone frame, with two switchable design variants (A and B). Both variants cover launch, Home, text chat (typed and voice-note input) and a hands-free full-screen voice mode. Conversations are live: real speech-to-text, LLM-generated Wysa replies and text-to-speech. A variant switcher modal lets stakeholders and test users compare the variants on the same conversation.

## Problem being solved

- The revamp is a voice-first conversation model, and static Figma screens can't show how it feels: turn-taking, silence detection, synced spoken text, pausing, and switching between voice and text.
- Two competing design directions exist. The team needs to experience both on identical live behavior, with stakeholders and a small group of users, before choosing one and committing to the production build.

## Requirements

### 1. Design source and fidelity

- Figma file: `https://www.figma.com/design/lIFjMFYtHlL9B7fmEhDJWd/Chat-Revamp`
- **Shared: Loader → Home transition**, node `269-1307`. This is a Figma code layer (Vite + React + TS app with its own assets). Reuse its source rather than rebuilding the animation. The Figma MCP currently returns this source only as resource links that the build tools can't read. Until the source is exported (for example, the designer shares the code-layer project or zip), the loader stays rebuilt from the layer's rendered frame and is flagged for design review. Both variants use it.
- **Shared: screen-to-screen transitions.** The prototype-transition frames on page `146-748` (Voice ⇄ Home, Chat ⇄ Home, Chat ⇄ Voice, Loader → Chat, Loader → Home) are the reference for screen transitions. They need frame-level links (not the page link) before they can be read and built.
- **Variant A** ("Iteration 1" section, node `523-6574`). Always re-pull this section before changing Variant A; it has been revised since the first build.
  - Home `535:10521`
  - Chat/Active, empty composer `535:10388`
  - Chat/Active, typing `535:10486`
  - Chat/Active, voice-note recorder `535:10429`
  - Voice/Landing (Ready) `523:6686`
  - Voice/Speaking `523:6619`
  - Voice/Listening `523:6653`
  - Voice/Reconnecting `530:8646`
  - Voice/Settings (Choose a Voice) `526:8562`, including the selected-card style
- **Variant B** ("Iteration 2" section), node `531-8719`:
  - Home `531:9413`, Chat/Active `531:8808`, Chat/Typing `531:8779`, Voice/Landing `531:9276`, Voice/Speaking `531:9326`, Voice/Listening `531:9367`, Voice/Paused `531:10040`, Voice/Settings `532:10094`.
- Use the Figma MCP (design context + screenshots) for every screen. Match spacing, colors, typography, icons and gradient/glow effects to the design. Download all assets locally, with no Figma asset URLs left in code.
- Where this PRD and a Figma frame disagree on visuals, Figma wins; behavior and copy rules in this PRD win. Every known disagreement is listed in "Design decisions and open questions" below.
- Screen size follows the Figma frames (412 × 917).
- On desktop, render the app centered inside a phone frame. On a mobile-width viewport, render full-screen without the frame.
- The status bar (time, signal, battery) is decorative.
- Variant-specific UI lives in separate screen components per variant. All behavior (sections 3–12) is shared and must not be duplicated per variant.
- States with no Figma frame are built only from the variant's existing components and styles, and flagged for design review.

### 2. Variant switcher modal

- A modal panel for prototype controls. Today it holds one control: a Variant selector (A / B).
- Built so new controls and new variants can be added later by editing one config location (variant list with labels and descriptions, plus a list of controls), with no new UI work.
- Opening it:
  - Desktop: a small "Variants" button placed outside the phone frame, so it never appears inside the app UI.
  - Mobile (no frame): triple-tap on the status bar.
- Switching variant:
  - Conversation history and the selected voice carry over.
  - The app jumps to the equivalent screen in the other variant (Home → Home, Chat thread → Chat thread, Voice mode → Voice mode, Choose a Voice → Choose a Voice).
  - If a voice turn is in progress, the conversation pauses first and stays paused in the new variant.
- Default variant on first load: A. The chosen variant is remembered for the session.
- A link can preselect a variant, for example `?variant=B` to open straight into Variant B for user testing.
- The modal is styled neutrally (not part of either variant's design) and closes with X, Escape or a tap outside.

### 3. Navigation map

Labels and entry points differ by variant (A / B) where noted.

- App launch → Loader → Chat thread.
- Chat thread back arrow → Home, animated per variant (section 15).
- Home → Chat → Chat thread.
- Home → Speak or tap on the orb → Voice mode.
- Chat thread composer Speak pill → Voice mode (both variants; Variant B opens straight into Listening, like entering from Home).
- Voice mode Type → Chat thread.
- Voice mode X and Type → Chat thread (both variants). The Chat thread shows the whole voice conversation, and its back arrow then goes Home.
- Voice mode gear (A) / Wysa's Voice pill (B) → Choose a Voice → Voice mode (Ready).

### 4. Loader

- Plays the loader animation once on launch, then transitions into the Chat thread (see section 1 for the code-layer status).
- The Chat thread opens with one Wysa greeting already present (fixed text, editable in one config location; default: "Hi Peter! What's on your mind today?").

### 5. Home (shared behavior)

- "Hi Peter!" is a hardcoded name.
- Only the orb, Chat and Speak are functional. Crisis Help, the ⋮ menu, "For your day" cards and the bottom nav are visible and inert, with no press feedback that suggests an action.

### 6. Chat thread (shared behavior)

- Shows the full shared conversation, including turns from voice mode.
- Auto-scrolls to the newest message.
- Wysa replies stream in progressively, with a typing indicator shown before the first text arrives.
- Header right icon shows a placeholder tooltip anchored to the icon (text per variant, sections 13 and 14).
- Composer (controls per variant, sections 13 and 14):
  - The Speak pill opens full voice mode (both variants).
  - Voice-note entry opens the voice-note recorder (section 7): the mic button, Variant A only. Variant B has no voice-note entry in chat.
  - Empty input: no send button. Whitespace-only input counts as empty.
  - Non-empty input: a send button appears (A: in place of the mic; B: the composer expands and the Speak pill hides). Enter sends; Shift+Enter adds a new line.
  - The input grows with the text up to about 6 lines, then scrolls internally.
  - After sending, the input clears and the user message appears immediately.

### 7. Voice-note recorder (shared behavior)

- Replaces the composer while active: bin (discard), elapsed timer (mm:ss), live waveform driven by mic input level, check (send).
- Check stops recording, transcribes, and sends the transcript as a normal user message.
- Bin discards the recording and restores the composer.

### 8. Message playback

- The speaker icon (A) / "Read aloud" control (B) under a Wysa message plays that message with the currently selected voice.
- While a message plays, its control shows a playing state. Tapping it again stops playback.

### 9. Voice mode (shared state machine)

- **Ready:** mic is off, waiting to start. How the user leaves Ready differs per variant (sections 13 and 14).
- **Listening:** mic open, orb animates with mic input level, live transcript of the user's speech is shown (ending in "…" while partial). The turn ends automatically after 1.5s of silence (threshold in config), then → Thinking.
- **Thinking:** caption "Thinking…", orb pulses softly. Wait for the LLM reply, then → Wysa Speaking.
- **Wysa Speaking:** the reply is spoken in the selected voice and its text is revealed in sync: already-spoken words in dark text, upcoming words faded. When speech ends, the mic reopens automatically → Listening.
- **Paused:** entered via Mute (A) / Pause (B). Speech output and mic both stop and the orb is static. The control shows an active/toggled state. Tapping it again resumes → Listening. In Variant B, Pause also works from Ready (it cancels a mic that is still opening).
- **Reconnecting:** error state. The app retries in the background and on success returns to the state it was in.
- Controls: X and the voice settings entry are always shown. Type and Mute (A) / Pause (B) are shown in every state, Ready included.
- Every completed user turn and Wysa reply is added to the shared conversation in real time.
- **Caption slot rule:** the caption by the orb is the single place for every status and indicator on the voice screen: Listening, Thinking…, Wysa Speaking, Paused, Reconnecting, and all error or warning messages. No banners, toasts or inline messages elsewhere on the voice screen. Normal states use the variant's default caption style. Errors and warnings use the error color (coral red, `#D26969`), with a small spinning ring before the text only while a retry is in progress.

### 10. Choose a Voice (shared behavior)

- Opening it pauses any active voice conversation.
- Four cards: Cindy (A warm, softer voice), Daniel (A calm, lower voice), Lucy (British warm voice), Harrison (British calm voice).
- Tapping a card selects it and plays a short sample line in that voice. Only one card can be selected at a time.
- Selected card: a small white circle with a teal check in the top-right corner, plus a subtle outline. Unselected cards have neither.
- Default selection on first open: Cindy. (The Figma frames show Daniel selected only to illustrate the selected style.)
- Continue saves the selection and returns to voice mode in Ready. X discards any change and returns to voice mode in Ready.
- The selected voice applies to voice mode and message playback for the rest of the session.

### 11. Conversation engine

- A single conversation is shared across text chat, voice mode and both variants.
- Wysa persona prompt (editable in one config location): a warm, empathetic, non-judgmental wellbeing companion using CBT-informed, supportive language. Replies are 2–4 short sentences, plain spoken language, with no markdown, lists or emojis, so they read and sound natural in both modes.
- Only the most recent ~20 turns are sent to the LLM with each request (count in config). Older turns stay visible in the thread.
- Reply text is streamed into the chat thread. In voice mode, speech starts as soon as enough text is available for natural playback.

### 12. Speech and AI providers

- Speech-to-text, LLM and text-to-speech each sit behind a provider-agnostic layer (transcribe / reply / speak). Providers are selected and configured in one place, and switching provider requires no UI changes. Final providers are TBD by the team; build so they can be filled in later.
- Current build:
  - The LLM uses Claude (Anthropic) when an API key is set, and the placeholder reply generator otherwise.
  - STT and TTS run in fallback mode.
  - The server-side STT/TTS adapters are empty slots ready to fill.
- A small server component holds all provider API keys and relays requests. No keys are shipped to or readable in the browser.
- Voice mapping: Cindy, Daniel, Lucy and Harrison map to provider voice IDs in one config location, with placeholders until the team decides.
- Fallback mode (default until providers are configured):
  - STT and TTS use the browser's built-in speech engines, with the four voices mapped to the closest available system voices.
  - The LLM uses the configured provider, or the placeholder reply generator if none is set.
  - Fallback mode is switchable in config.
- Synced text reveal uses word timings from the TTS engine when available. When the engine provides none, timings are estimated by spreading words across the audio duration in proportion to word length.
- Session and data: conversation history, voice selection and variant choice live in memory for the current browser session only. The server component stores nothing: no transcripts, audio or replies are logged or persisted beyond relaying the request.
- Setup instructions (env file, how to plug in each provider, how to run locally and deploy for stakeholders) go in the README. Live speech needs Chrome and, when deployed, HTTPS (browsers block the mic otherwise).

### 13. Variant A screens

- **Visual language:**
  - white backgrounds (`#FFFFFD`)
  - teal accent `#4999A5`
  - pale teal orb rings (`#AAE5EC`; `#86CED8` at 60% on the Speaking and Reconnecting rings)
  - soft pale-cyan glows fading to white
- **Home** (`535:10521`): header "Hi Peter!", Crisis Help outlined pill, ⋮. Hero card with animated orb with dots, "Tap to Talk", "What's on your mind today?", Chat and Speak pill buttons. "For your day" section with Morning Check-in card, bottom nav (Home active).
- **Chat thread:**
  - Header: back arrow (left) and progress icon (right). Tooltip text: "The updated progress tab will be accessible from here."
  - Wysa messages: plain left-aligned text with a speaker icon below.
  - User messages: right-aligned light-cyan rounded bubbles.
  - Composer, empty (`535:10388`):
    - a white rounded card (28px radius) with the input on top; placeholder "Write, or tap the mic to dictate" (Google Sans Flex)
    - below the input: a white "Speak" pill with a waveform icon (left) that opens voice mode
    - a teal circular mic button (right): hold to dictate (section 7)
  - Composer, typing (`535:10486`): the card grows with the typed text, the Speak pill stays, and the mic is replaced by a teal circular send button.
  - Soft gradient fade above the composer.
  - Recorder (`535:10429`): red bin (left), timer, live waveform, teal circular check (right). Press the mic to start, press the check to stop and transcribe. While transcribing, a spinner replaces the waveform (no Figma frame — flagged for design review). The transcript lands in the composer as editable text, as if typed (`535:10486`); the user edits or sends it. The bin discards and returns to the empty composer.
- **Voice mode:**
  - Header: X (top-left), gear (top-right).
  - Ready (`523:6686`):
    - large soft-glowing orb, caption "Tap anywhere to start"
    - no Type/Mute controls
    - tapping anywhere except X and gear → Listening (this tap also unlocks browser audio)
  - Listening / Wysa Speaking (`523:6653` / `523:6619`):
    - orb with ring and animated vertical bars, caption under the orb
    - a single message centered below: the user's live transcript while Listening, Wysa's synced reply while Speaking
  - Thinking (no frame): the Listening orb with static bars and a softly pulsing glow.
  - Paused (no frame): the static Listening orb, caption "Paused", no message text on screen. The Mute button shows its active state.
  - Reconnecting (`530:8646`): plain glowing ring with no bars, no message text, caption with spinner and "Reconnecting" in coral red.
  - Bottom controls: Type (Aa) and Mute (mic-slash) circular buttons with labels.
- **Choose a Voice** (`526:8562`): title "Choose a Voice", four light-cyan cards, teal Continue button.

### 14. Variant B screens

- **Visual language:** soft pastel gradients (warm yellow and cool cyan), with orange as the accent (Speak, send, active Pause, Continue text).
- **Home:**
  - large gradient hero with a pastel orb above "Hi Peter!" and "What's on your mind today?"
  - white Chat and Speak (orange text) pill buttons
  - Crisis Help pill and ⋮ top-right
  - "For your day" section and bottom nav below
  - the orb is tappable → Voice mode
- **Chat thread:**
  - Header: back arrow (left) and history (clock) icon (right). Tooltip text: "Your past conversations will be accessible from here."
  - Wysa messages: plain text with a speaker icon and "Read aloud" label below. While playing, the control pulses (no color change).
  - User messages: light-cyan rounded bubbles that hug their text (16px padding, text up to 275px wide; spacing per `541-11791`).
  - Composer, empty (Chat/Active): white pill input "Send a message" with a white "Speak" pill (orange waveform icon and label, per Figma) that opens voice mode.
  - Composer, typing (Chat/Typing):
    - the composer expands into a multi-line rounded card holding the typed text
    - an orange circular send button sits at its bottom-right
    - the Speak pill is hidden
    - the background shows the warm/cool gradient glow at the bottom
  - Recorder: not reachable in Variant B, since its chat has no voice-note entry. An orange-accented version exists in code in case one is added.
- **Voice mode:**
  - Header: X (top-left), "Wysa's Voice" pill with a smiley-speech icon (top-right).
  - Ready (Voice/Landing):
    - "Start Speaking" title centered, with a large pastel orb below; Type and Pause visible
    - Ready stays until the user taps anywhere (except the header and controls); that tap opens the mic and unlocks audio
    - Ready → Listening: the large orb shrinks and glides down into the small Listening orb's place, "Start Speaking" blurs out, and the transcript and caption fade in
  - Transcript area (top, below header): shows only the latest exchange.
    - Wysa's latest line is left-aligned in dark text; the user's reply is right-aligned in grey beneath it.
    - When a new Wysa reply starts, the area clears and shows only that reply, then the user's next turn appears beneath it.
  - Listening: small cyan orb near the bottom, caption "Listening" under it, cool cyan glow at the bottom of the screen. The bottom glow rises and swells with the user's voice (mic level) and settles back when they stop.
  - Wysa Speaking: small yellow orb, caption "Wysa Speaking", warm yellow glow at the top of the screen. The top glow moves while Wysa speaks and settles when she stops. Synced reveal applies to Wysa's line in the transcript area.
  - Paused: the transcript stays visible, the orb is hidden, caption "Paused", and the Pause button shows an orange icon and orange label (per Figma; no outline).
  - Reconnecting (no frame): the Variant B layout with a static small orb, the transcript unchanged, and the caption with spinner and "Reconnecting" in coral red.
  - Bottom controls: Type (keyboard icon) bottom-left and Pause (pause icon) bottom-right, as white pills with labels.
- **Choose a Voice:** title "Choose a Voice", four cards each with a different soft pastel gradient blob, white Continue pill with orange text.

### 15. Variant B screen transitions

Timings live in one place (`web/src/lib/transitions.ts`). Durations not given below were chosen by the builder (~300–600ms per step). Variant A switches screens instantly for now.

- **Gradient swoosh** (shared): matched to the product owner's screen recording of the reference (code layer `280-1400`). Over about 650ms, a soft peach glow (`#FBCB9B`) enters low on the left and sweeps right and slightly up, fading as it goes, while a cyan glow (`#B7EEEF`) swells low-left behind it. The old screen fades out and the new one fades in underneath. Chat → Home is the mirror image (right to left).
- **Home → Chat:**
  - Chat pill press: subtle orange glow; the transition starts 0.2s after release.
  - The hero slides down while its content (greeting, question, pills) and the feed fade out.
  - On the blank screen, Chat's top bar and bottom bar come in.
  - Wysa's latest message types in; when it finishes, "Read aloud" pops in.
- **Home → Voice:**
  - Speak pill press: the same orange glow and 0.2s delay.
  - The hero expands to fill the screen as its content fades, leaving a blank screen.
  - Voice's top bar, bottom bar and both glows come in; "Start Speaking" blurs in (about 1s from the start); the orb scales up and settles.
  - Ready then waits for a tap before the mic opens.
- **Chat → Voice:** swoosh left to right while Chat fades out. The bars swap from Chat's to Voice's while the glows come in from the top and bottom; then "Start Speaking" blurs in and the orb settles.
- **Voice → Chat** (X or Type): swoosh left to right. The orb shrinks and disappears; the bars swap from Voice's to Chat's; the thread fades in.
- **Chat → Home** (back): swoosh right to left. The hero pops back up from below and the "For your day" feed and bottom nav slide up with it.
- Taps are ignored while a transition runs. Switching variant cancels a running transition. Reduced-motion settings skip the animations.

## Edge case summary

### Launch, session and variants

- Page refresh or reopen: history, voice selection and variant reset (unless the link preselects a variant), and the app restarts at the Loader.
- Variant switched mid-turn: covered in section 2 (conversation pauses, then stays paused in the new variant).

### Mic and permissions

- Mic permission denied: show "Wysa needs mic access to talk. Enable it in your browser settings."
  - In the Chat thread it appears inline above the composer.
  - In voice mode it appears in the caption slot in the error style (no spinner), and Type remains available as the way out.
- Browser without mic or speech support:
  - Every voice entry point shows a tooltip that voice isn't supported in this browser: Home Speak/orb, the composer Speak pill, and the composer mic (A).
  - Text chat remains fully functional.

### Voice mode

- No speech within 8s of the mic opening:
  - Variant A returns to Ready ("Tap anywhere to start").
  - Variant B closes the mic and shows the caption "Tap to start" under the orb; tapping anywhere except the header and controls reopens the mic.
- User turn longer than 60s: auto-end the turn and send.
- User speaks while Wysa is speaking: ignored. The mic reopens only after Wysa finishes.
- Pause/Mute during Thinking: the reply is held. On resume, the held reply plays (Wysa Speaking) before returning to Listening.
- Type tapped mid-speech: speech stops, the full reply text is in the thread, and the user lands in the Chat thread.
- X tapped mid-turn: all audio and mic stop immediately, completed parts of the turn are kept in history, and the user goes to Home (A) / the Chat thread (B).
- Browser tab hidden or backgrounded: auto-enter Paused.
- Voice changed mid-conversation: the new voice applies from Wysa's next reply.

### Text chat

- Send while a Wysa reply is in progress: the input stays editable, but send is disabled until the reply completes.
- Voice note at 2 minutes: auto-stop and send. Voice note under 1s: discarded silently. Empty transcription: show "Couldn't catch that, try again."
- Bin: discards immediately with no confirmation.
- Tapping a playback control while another message plays: the first stops and the new one plays.
- Header tooltips: auto-dismiss after 3s or on any tap.

### Failures

- LLM or TTS error, or no response within 15s:
  - In chat, show an inline "Something went wrong · Retry" under the failed turn.
  - In voice mode, enter Reconnecting and retry the same turn automatically up to 3 times.
  - If all retries fail, the caption changes to "Couldn't connect. Tap to retry" in the error style without the spinner, and tapping the screen retries the same turn.
- TTS fails but the LLM succeeds: show the reply as text (in chat, and in voice mode's message/transcript area) and continue to Listening once the text is shown.
- Offline:
  - In the Chat thread, a slim "You're offline" banner appears, and send, voice-note and voice-mode entry are disabled until the connection returns.
  - In voice mode, enter Reconnecting (no banner), the mic stays off, and the conversation resumes in Listening once the connection returns.
- Very long conversation: handled by the turn limit sent to the LLM (section 11), with no user-visible change.

## Out of scope

- Crisis Help flow and risk detection.
- Barge-in (interrupting Wysa by speaking).
- Home secondary content: ⋮ menu, "For your day" cards and bottom nav destinations.
- The Progress tab and conversation history screens (only their tooltips are in scope).
- Login, accounts, real user names and persistence across sessions.
- Analytics and logging, including A/B result tracking.
- Production hardening, including HIPAA compliance; this is a prototype, not for clinical use.
- Native iOS/Android builds.

## Design decisions and open questions

Decided:

1. **The chat Speak pill opens full voice mode in both variants** (confirmed by product, 10 Nov 2026). In Variant A the mic records voice notes; Variant B has no voice-note entry in chat. "Entering full voice mode from the Chat thread" is no longer out of scope.
2. **Variant A Ready shows Type and Mute** (Voice/Landing `523:6686`), updated 10 Nov 2026. Both controls are present in every voice state.
3. **Variant A Reconnecting** uses the Figma frame's plain ring. Earlier drafts described four static dots. It shows no message text, although the frame shows a transcript line.
4. **Variant A Ready orb entry animation** ends at the static frame's size. The Figma motion data scales the core to 2×, which doesn't match the frame.

Open:

1. **Loader code layer** (`269-1307`): the source must be exported by design before it can be reused (section 1). Until then the loader is an approximation.
2. **Transition references:** Variant A and B transitions are built from the product owner's written spec (section 15). Variant A: Home↔Chat (hero expand/settle, sideways top-bar swap, input rise, greeting types in), Home→Voice, Chat→Voice (Speak-pill glow blooms into a full-screen gradient) and Voice→Chat (transcript kept).
3. **Voice orb while talking (Variant A):** a placeholder grow-and-shrink pulse during Listening and Wysa Speaking. The final orb animation is still to be chosen.
3. **No-frame states needing design review:**
   - Shared: typing indicator, "Something went wrong · Retry", "You're offline" banner, header tooltips, message playing state, inline mic-denied and "Couldn't catch that" messages.
   - Variant A: Thinking and Paused orbs, Mute active state.
   - Variant B: Thinking, Reconnecting and the "Tap to start" timeout.

## Prototype review aids (dev builds only)

- `?variant=A|B` preselects a variant (also in production builds, per section 2).
- `?screen=home|chat|voice|voices` skips the loader to a screen.
- `?state=listening|thinking|speaking|paused|reconnecting|failed|denied` shows a voice-mode state with sample text, for checking against Figma without a microphone.
