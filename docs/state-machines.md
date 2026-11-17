# Implicit state machines – Chat Revamp (Variant C)

Source: Figma page "Nov 17 – Claude pass" (Iteration 4 + "Error & missing states") and the prototype code (`useVoice.ts`, `useChat.ts`, `Recorder.tsx`, `store.ts`). Mirrored in Figma under the "For Devs – State machines" section.

Legend: ✅ has a Figma frame · 🆕 frame added 17 Nov (needs design review) · ⚠️ no frame (gap)

---

## 1. Voice session

| State | Frame | Caption |
|---|---|---|
| Idle (first open) | ✅ Voice/Landing | "Tap to start" |
| Listening | ✅ Voice/Listening | "Listening" |
| Thinking | ✅ 789:9039 (outside Iteration 3) | "Thinking" |
| Speaking | ✅ Voice/Speaking | "Wysa Speaking" |
| Paused | ✅ Voice/Paused | "Paused" |
| Reconnecting | 🆕 Voice/Reconnecting | spinner + "Reconnecting" |
| Error: mic denied | 🆕 Voice/Error/MicDenied | |
| Error: nothing heard | 🆕 Voice/Error/NothingHeard | |
| Error: connection lost | 🆕 Voice/Error/ConnectionLost | |
| Error: reply failed | 🆕 Voice/Error/ReplyFailed | |

Transitions
- Idle → Listening: tap the orb (or auto-start when coming back from Chat after you've already talked).
- Listening → Thinking: you stop talking.
- Thinking → Speaking: first audio of the reply.
- Speaking → Listening: reply finished (auto).
- Listening / Thinking / Speaking / Reconnecting → Paused: Pause.
- Paused → back where it was: Resume (Speaking if any words were spoken, else Thinking; Listening otherwise).
- Listening → Error: nothing heard (silence timeout).
- Listening → Error: mic denied, or mic failed.
- Thinking → Error: reply failed.
- Listening / Thinking / Speaking → Reconnecting: went offline (Speaking drops the half-spoken reply).
- Reconnecting → previous flow: back online (re-requests the reply if one was pending).
- Reconnecting → Error: connection lost (gives up after a timeout).
- Any Error → tap the message: retry (Listening, or re-request the reply).
- Any → Chat: Type pill or X. Any → Choose a Voice: settings icon.

Gaps ⚠️
- Paused while Thinking or Reconnecting looks the same as Paused while Listening. Is that intended?
- No frame for "Thinking" inside the Iteration 3/4 set (only 789:9039).
- Error screens hide the orb, but there's no frame for what happens to the transcript while retrying.
- Reply arrives while Paused: it's held and plays on Resume. There's no visual cue that something is waiting.

## 2. Chat message box (composer)

| State | Frame |
|---|---|
| Empty | ✅ Chat/Active |
| Typing, one line | ✅ Chat/Typing/oneline |
| Typing, multi-line | ✅ Chat/Typing/Multiplelines |
| Recording | ✅ Chat/Dictation/Active |
| Recording paused | 🆕 Chat/Dictation/Paused (Play icon, "Resume", bars dimmed) |
| Transcribing (after Check) | ⚠️ spinner replaces waveform; no frame |
| Waiting for Wysa's reply (send blocked) | ⚠️ no frame |
| Error notice above the box | ✅ Chat/Error, Chat/Error/Dictate · 🆕 ReplyFailed / MicDenied / NothingHeard |
| Offline | 🆕 Chat/Offline |

Transitions
- Empty → Typing: type a character. Typing → multi-line: text wraps. Typing → Empty: send or clear.
- Empty/Typing → Recording: Mic. Recording ↔ Recording paused: Pause / Resume.
- Recording → Transcribing: Check. Transcribing → Typing: the text lands in the box for editing.
- Transcribing → Error "Nothing heard": empty transcript.
- Recording → Empty/Typing: Trash (discard).
- Mic → Error "Mic denied": permission refused. Tapping the notice reopens the recorder.
- Any error notice → cleared: you type or open the recorder.
- Online → Offline: banner shows; Send, Mic and Speak do nothing; an active recording stops.
- Speak pill → Voice session (Idle on first visit, Listening if you've talked before).

Gaps ⚠️
- Transcribing and "waiting for reply" have no frames.
- Offline: should the buttons look disabled? The prototype only blocks the tap.
- Error notice while typing: does it stay or go? (Prototype clears it on the first keystroke.)

## 3. Message (each bubble)

`pending → streaming → done | error`; `error → (tap) → pending`.
- Read aloud: shown only under Wysa's last finished message. Off ↔ Playing (tap; it stops when you record or enter Voice).

Gaps ⚠️ no frame for: streaming/typing-in reply, a failed bubble's own look (only the notice above the box), or Read aloud while playing.

## 4. Connectivity

`online ↔ offline`
- Chat: offline banner, actions blocked, recorder stops.
- Voice: Reconnecting, then Connection lost after a timeout.

Gaps ⚠️ no "back online" moment; no frame for a message typed while offline (blocked, not queued).

## 5. Microphone permission

`unknown → (OS prompt) → granted | denied`
- Denied shows the Mic denied notice (Chat) or error (Voice). Tapping retries, which re-prompts or fails again.

Gaps ⚠️ no path for "blocked permanently" (needs an "Open Settings" route) and no pre-permission explainer.

## 6. Screens and navigation

`Loader → Chat (6s)` · `Home → Chat | Voice` · `Chat ↔ Voice` · `Voice → Choose a Voice → Voice` · `Chat → Home`
- Voice entry has two modes: fresh (Tap to start) or resume (Listening).

Gaps ⚠️ Loader → Voice transition is undefined (marked "--" in Figma). Voice → Chat Text is still 🟡. Loader goes to Chat, not Home (audit D10).

## 7. Scroll

`at latest ↔ scrolled up`
- Scrolled up by more than one screen shows "Jump to latest". The scrollbar shows while scrolling.

Gaps ⚠️ new reply arrives while you're scrolled up (no "new message" cue); header/composer hiding on scroll (audit D11).
