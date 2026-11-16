# Variant C spec — Chat + Dictation (sections 5–9)

Sources: `web/src/screens/c/ChatC.tsx`, `lib/useChat.ts`, `lib/speech.ts`, `lib/useTypeIn.ts`, `components/Recorder.tsx` (skin `c`), `components/PaperLayer.tsx`, `styles.css`.
Figma refs: Chat/Active 778:7874, Typing single-line 778:7480, Typing multi-line 778:7452, Recorder 778:7906 (also 681:2443), Error 778:7986 / 778:8021. Frame 412 × 917.
Font everywhere: `--c-font` = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', system-ui, sans-serif`. Screen bg `#FBF8F3`, text `#0A0A24`.
Items marked **[DESIGN REVIEW]** have no Figma frame and were built from existing components/styles.

---

## 5. Chat screen — header, thread, Read aloud, offline

### 5.1 Header
**Behaviour**
- Back (left): stops message playback, returns Home (animated transition).
- Hamburger (right): toggles a "Work in progress" tooltip. Tooltip auto-dismisses after 3000 ms (`config.tooltipMs`) or on the next tap anywhere (pointerdown, capture).
- Header sits above the thread (z-3) with a soft drop shadow.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.cc-head` | height / padding | 72px / `0 16px 0 15.996px`; flex, space-between, centred |
| `.cc-head` | shadow | `drop-shadow(0 2px 4px rgba(0,0,0,.05))` |
| Back / Menu buttons | size | `.icon24` (24px); back icon `fig-back.svg` inset 16.67% (66.66%) |
| Hamburger icon | size | 24 × 24 `fig-hamburger.svg` |
| `.tooltip.cc-tip` | position | absolute, `top: 36px; right: -4px`, caret on top edge at `right: 12px` (6px triangle) |
| `.tooltip` | box | width 210px, padding 10px 12px, radius 12px, bg `--ink #3C3F58`, text `#fff` 13/18 |
| `.tooltip` | shadow / anim | `0 4px 12px rgba(0,0,0,.15)`; `pop-in` 160ms ease (the later `@keyframes pop-in` at styles.css:587 wins: scale .6 → 1.06 → 1 with fade, not a 4px slide) |

### 5.2 Thread — Wysa message, user bubble, typing-in, thinking dots
**Behaviour**
- Thread is a scroll container (`data-manual-scroll`, so the shared auto-scroll in `useChat` never runs; see section 7).
- Wysa message: plain text on the background, no bubble, left aligned. Failed (`status: error`) assistant messages render nothing in the thread; the failure is shown in the error strip (section 9).
- User message: right-aligned cyan bubble, tail bottom-right (radius 20/20/4/20). **[DESIGN REVIEW]** no Figma frame for a sent message.
- Typing-in reveal: on first Chat mount (loader to chat) and on Home to Chat, Wysa's latest done message reveals char by char (28 ms/char) after a 520 ms delay, with a blinking caret (`.type-caret`, 1.5px, `--b-ink`, 0.8s steps). Never retypes (ids remembered) when returning from Voice or re-mounting. Read aloud stays hidden until reveal ends.
- Thinking (pending reply): three dots (`.typing.b`), Wysa-side, aria-label "Wysa is typing". **[DESIGN REVIEW]** no Figma frame; built from the shared typing-dots component.
- Gap between any two messages: 24px (including user-user).
- Bottom of the thread fades under the composer via a mask.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.cc-thread` | padding | `0 24px 72px 30px`; `overflow-anchor: none`; native scrollbar hidden |
| `.cc-thread` | mask | `linear-gradient(to bottom, #000 calc(100% - 60px), transparent 100%)` |
| `.chat-c .msg + .msg` | margin-top | 24px |
| `.cc-wysa .text` | font / color | 400 16px/normal, `#0A0A24` |
| `.cc-wysa` | gap | 24px (text to Read aloud) |
| `.cc-bubble` | box | `fit-content`, max-width 307px, padding 12px 16px, `margin-left:auto` |
| `.cc-bubble` | radius / bg / color | `20px 20px 4px 20px` / `--bubble #CEFAFF` / `--navy #0A0A24` |
| `.cc-bubble` | font | 400 16px/24px; `pre-wrap`, `overflow-wrap:anywhere` |
| `.typing` (dots) | size / gap | 7px circles, gap 6px, row height 20px |
| `.typing.b i` | color / anim | `--b-orange` (opacity .35 base); `typing` 1.2s ease-in-out, stagger 0 / .15s / .3s, 3px lift at 30% |

### 5.3 Read aloud
**Behaviour**
- Shown only under the last Wysa message that is `done` (`i === lastWysa`), and only after its type-in has finished.
- Tap toggles playback of that message (resolved by id at tap time): if it is already playing, stops it; otherwise stops any other playback and speaks it with the selected voice (`store.voice`; browser TTS or server TTS depending on `status.tts`). `playingId` clears on end/error.
- While playing: label pulses (`speaker-pulse` 1s, opacity 1 to .55), `aria-pressed=true`, aria-label "Stop reading aloud".
- Playback stops on Back, on opening Speak/Dictate, and on unmount.
- Dims while the composer is in typing state.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.cc-read` | layout | flex, gap 10px, icon 20 × 18 (`fig-speaker-high.svg`) + "Read aloud" |
| `.cc-read` | font / color | 400 12px/20px; `#575B7F`, color transition 280ms ease-out |
| `.is-typing .cc-read` | color / icon | `#9194B9`; icon `fig-speaker-high-dim.svg` |

### 5.4 Offline banner
**Behaviour**
- When `online` is false, a pill "You're offline" renders under the header (role=status). Send, Speak and mic become disabled (50% opacity); an open recorder is closed.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.offline` | margin / padding | `0 24px` / `6px 12px`; radius 100px |
| `.offline` | bg / color / font | `rgba(210,105,105,.12)` / `--error #D26969` / 13px/18px centred |

**[DESIGN REVIEW]** banner is inherited from the shared (Variant A) component; no Variant C frame.

---

## 6. Composer

**Behaviour**
- **Idle** (no text): card shows empty textarea (placeholder "Write, or tap the mic to dictate") and a bottom row: **+** at left; **Speak** pill and orange **mic** at right.
- **Typing** (`hasText && !recording`, class `is-typing`): the card stays the same box (same DOM, no remount; `.cc-card` has a 320ms transition on radius/padding/row-gap/rows, but no typing-state rule changes them, so radius stays 16px). The textarea grows line by line (height transition 280ms) up to 144px, then scrolls internally. **Speak and mic fade out** (160ms, hidden, no pointer events) and a **paper-plane send** button (orange circle) scales/fades in at the bottom-right. Glow swaps to `glow-small-typing.svg`; `is-multi` is set when the textarea scrollHeight is >= 64px (2+ lines), but no CSS rule uses it: by team decision (feedback round 2: "input box must not shrink while typing") the card keeps its idle 16px shape, replacing the Figma 778:7480 pill / 778:7452 28px-radius morph. Figma should be updated to match.
- **+** shows tooltip "Coming soon: add attachments" (left-anchored above the button); toggles on tap, auto-hides after 2000 ms. No attachment is implemented.
- **Speak** opens full voice mode (needs `voiceSupported()`, otherwise tooltip "Voice isn't supported in this browser." for 3s). Entry is `talk-resume` if the user has already sent a message, else `talk-fresh` ("Tap to start"). Audio is unlocked on tap, playback stopped.
- **Mic** opens the dictation recorder (section 8) in place of the composer; same unsupported-browser tooltip.
- **Send**: tap or **Enter** (Shift+Enter inserts a newline; IME composition ignored). Disabled while Wysa is replying or offline. Sending clears the input, clears the error notice, and requests the reply.
- Dictation result is appended to existing text (space-joined), input focused with caret at end.
- Entry animation of the composer bar: `cc-bottom-in` 220ms ease-out.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.cc-comp` | padding | `12px 12px 24px` (z-3, flex-shrink 0) |
| `.cc-card` | bg / radius / shadow | `#fff` / 16px (constant; transition declared but unused) / `drop-shadow(0 4px 2px rgba(0,0,0,.05))` |
| `.cc-card` | layout | grid rows `auto 42px`, row-gap 8px, padding 16px 12px |
| textarea | box / font | padding 8px 12px; 400 16px/20px; `#0A0A24`; placeholder `#B1B4CE`; max-height 144px |
| textarea (typing) | width | `calc(100% - 46px)` (room for send) |
| `.cc-row` | height / gap | 42px / 8px, flex-end |
| `.cc-plus` | size | 42 × 42 hit area, icon 56 × 56 (`fig-plus.svg`, margin -7px), `margin-right:auto` |
| `.cc-plus-tip` | position | left 0, caret `left: 12px`, above button (`bottom: calc(100% + 10px)`) |
| `.cc-talk` (Speak) | box | height 42, padding 12px 16px, gap 10px, bg `#fff`, 1px `#fff` border, radius 140px, `drop-shadow(0 0 3px #CACACA)` |
| `.cc-talk` | font / color | 400 16px/normal; `#DE761E`; icon `fig-waveform.svg` 24 |
| `.cc-mic` | box | 42 × 42, padding 10px, radius 100px, bg `#DE761E`; icon `fig-microphone.svg` 24 |
| `.cc-send` | box | absolute, `right:12px; bottom:12px`, 46 × 46, padding 10px, radius 100px, bg `#DE761E`; icon `fig-paper-plane.svg` 24 |
| `.cc-send` | states | idle: opacity 0, hidden, scale .8; typing: opacity 1 (0.5 when disabled), scale 1 (220ms / 280ms) |
| Disabled Speak/mic | opacity | 0.5 |
| Glows | size/pos | big 1000px at `left: calc(50% - 339px)` (typing: -337px), `bottom:-663px`; small 771px `left: calc(50% - 541px)`, `bottom:-449px` |

---

## 7. Scroll rules (ChatGPT-style)

**Behaviour**
- **Initial mount**: thread jumps to bottom (`scrollTop = scrollHeight`), no animation.
- **Sent message**: when the user-message count increases, the new user message smooth-scrolls so its top lands **16px below the thread top** (i.e. 16px below the header), and stays there while Wysa's reply appears/types. Nothing else auto-scrolls.
- **No auto-follow**: the thread never follows streamed text; the user scrolls to read more. (Shared `useChat` auto-scroll is bypassed via `data-manual-scroll`.)
- **Spacer math**: a trailing spacer div sizes so the maximum scrollTop equals the landing spot: `spacer = threadClientHeight - paddingBottom - 16 - (spacerTop - lastUserTop)`, clamped >= 0, rounded to 0.01px. Recomputed via ResizeObserver on the thread and each child, and on every messages change. Before the first send in the session the spacer is inactive (0) and landing = bottom.
- **Landing spot** = last user message top relative to thread top + scrollTop - 16 (or bottom when inactive).
- **Jump to latest**: appears when `landing - scrollTop > clientHeight` (user is more than one screen above the landing spot); hides otherwise. Tap smooth-scrolls to the landing spot (not strictly the bottom). Hidden state is non-focusable and non-interactive.
- **Fading scrollbar**: native scrollbar hidden; a 3px overlay thumb follows scroll, fades in instantly and out 1000 ms after the last scroll event (opacity transition 300ms). Hidden when content fits. Never intercepts pointer events.

**UI spec**
| Element | Property | Value |
|---|---|---|
| Landing offset | gap below header | 16px |
| `.jump-latest` | size / position | 56 × 56 button, `left: 50%`; `.cc-jump`: `bottom: calc(100% - 7px)` (floats just above the card, inside `.cc-comp`) |
| `.jump-latest` | icon | `fig-arrow-down.svg` 56 × 56 (circle style, same as `fig-plus`) |
| `.jump-latest` | hidden / on | opacity 0, `translateX(-50%) scale(.85)`, no pointer events / opacity 1, scale 1; transition 160ms ease |
| `.fade-sb` | box | width 3px, min height 24px, radius 100px, bg `rgba(10,10,36,.25)` |
| `.fade-sb` | position | `left = scrollerLeft + scrollerWidth - 3 - 4` (4px from right edge), `top` tracks scroll within scroller |
| `.fade-sb` | fade | opacity 1 on scroll; 0 after 1000ms; transition 300ms ease; z-index 2 |

**[DESIGN REVIEW]** Jump-to-latest and the fading scrollbar have no Figma frame.

---

## 8. Dictation recorder (skin "c", Figma 778:7906)

**Behaviour**
- Replaces the composer card while `recording`. Max length `config.voiceNote.maxMs` = 120 000 ms (auto-finishes). Timer `mm:ss`, tabular, counts only un-paused time.
- **Recording**: waveform animates from live mic level (server STT) or a gentle pulse lifted by recognition activity (browser STT). Updated every ~80 ms; 25 bars, newest on the right.
- **Paused**: tap Pause pill -> label becomes **Resume**, timer and waveform freeze (bars drop to 5px flat), capture is held (MediaRecorder paused, or recognizer stopped and its text kept as a segment). Tap again resumes.
- **Done (orange tick)**: finishes, shows a spinner in place of the waveform while transcribing (min 400 ms; tick and Pause disabled), then the transcript is appended into the textarea (section 6). Empty result shows the notice "Couldn't catch that, try again." **[DESIGN REVIEW]** spinner state has no frame.
- **Trash (bin)**: always works, even while transcribing; discards everything and returns to the empty composer.
- **Mic denied** (browser or server mode): recorder closes, notice `I can't hear you. Allow mic access, then tap here to try again.` appears in the error strip (section 9); tapping it re-opens the recorder.
- Going offline closes the recorder. Opening the recorder stops message playback.
- Entry animation: `cc-bottom-in` 220ms.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.recorder.rec-c` | padding / bg | `12px 12px 24px` / none |
| `.rec-card` | box | full width (388 in frame), radius 28px, bg `#fff`, padding 12px, column gap 12px, shadow `drop-shadow(0 4px 2px rgba(0,0,0,.05))` (approx. 110px tall) |
| `.rec-top` | layout | flex, gap 12px, height 36px |
| `.rec-time` | font / color | 400 16px/20px; `#0A0A24` |
| `.rec-wave-c` | box | flex 1, height 24px, padding 4px 8px, `justify-content: space-between` |
| waveform bar | width / radius | 2px / 100px; `flex: none`; height transition 80ms linear |
| waveform bar | heights | pattern by index mod 4: **5 / 12 / 16 / 20 px** (max for each); live height = `max(5, min(base, 5 + level * 20 * base/20))`; paused = 5px |
| waveform bar | color | accent orange `#DE761E` (Variant C passes `accent="orange"`) |
| `.rec-actions` | layout | flex row, gap 12px, full width: bin / Pause pill (flex 1) / tick |
| `.rec-bin` | box | 42 × 42, bg `#fff`, radius 100px, `drop-shadow(0 0 3.5px #CACACA)`; icon `fig-trash.svg` 20 (red bin) |
| `.rec-pause` | box | height 42, flex 1, padding 12px 16px, gap 10px, bg `#fff`, 1px `#fff` border, radius 140px, `drop-shadow(0 0 3px #CACACA)` |
| `.rec-pause` | font / color | 400 16px/normal; `#3C3F58`; icon `fig-pause-circle.svg` 20 (margin 0 2px) |
| `.rec-ok` | box | 42 × 42, radius 100px, bg `#DE761E`; icon `fig-check.svg` 24 |
| disabled (busy) | opacity | 0.5 |
| `.rec-busy` | spinner | `spinner.svg` 24, `spin` 0.9s linear |

---

## 9. Chat error states

**Behaviour**
- A single strip above the composer shows the active error; its text is the retry target (no separate Retry link, matching voice mode). Strip has `role="alert"`; aria-label appends "Tap to try again."
- Precedence: (1) dictation notice (`c.notice`), (2) Errors-preview, (3) last message failed.
- **Reply failed** (last message is an assistant with `status: error`): copy `Couldn't send. Check your connection and try again.` Tap retries that reply (`retry(id)`, only if not already replying and online). The failed message itself is not rendered in the thread.
- **Mic denied** notice: `I can't hear you. Allow mic access, then tap here to try again.` Tap re-opens the dictation recorder.
- **Nothing heard** notice: `Couldn't catch that, try again.` Tap re-opens the recorder.
- Notices clear when the user types or sends. Typing/sending also clears them.
- **Voice unsupported**: tooltip (not strip) "Voice isn't supported in this browser." for 3s.
- **Offline**: banner "You're offline" (section 5.4), no strip.
- **Errors preview toggle** (desktop-only floating button "Errors: On/Off" under the Paper toggle, `wysa.errors` in localStorage, `<html data-errors>`): when On, the strip always renders with the reply-failed copy; a tap calls `retry(last.id)` on the last message (`retryReply` removes that message and requests a new reply, so in preview a tap on a healthy thread replaces Wysa's last reply; if the last message is the user's, it is removed). Purely a design-review aid; hidden below 501px.

**UI spec**
| Element | Property | Value |
|---|---|---|
| `.cc-error` | layout | full width, flex centred, padding 12px 0, z-3, above `.cc-comp` |
| `.cc-error button` | box | width 316px, text centred, padding 0 |
| `.cc-error button` | font / color | 300 (SF Pro Light) 14px/1.4; `#D26969` (`--error`) |
| `.err-toggle` | position | fixed, `right:20px; top:64px`, padding 10px 14px, radius 100px, bg `#fff` (on: `#0A0A24` / white text), 500 13px/1 |

**[DESIGN REVIEW]** Error copy is placeholder copy (Figma 778:7986 defines the strip layout and style; wording is not final). Mic-denied wording comes from the shared `MIC_DENIED` constant.
