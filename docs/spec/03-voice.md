# Variant C – Voice mode

Sources: `web/src/screens/c/VoiceC.tsx`, `web/src/lib/useVoice.ts`, `web/src/components/DuoOrb.tsx`, `web/src/styles.css` (`.scr.vc`, `.vc*`, `.fade-sb`). Figma frames (Iteration 3): 778:7508 Landing, 778:7557 Speaking, 778:7598 Listening, 778:7745 Paused, 778:7697 Error, 789:9039 Thinking, 778:8412 Paper. Frame 412 x 917.
Frameless states (flag for design review): Reconnecting, Failed/error captions, jump-to-latest, overlay scrollbar, header icons kept in all states.

## 10. Voice mode overview

**Behaviour**
- Entry: Home "Speak" and Chat "Speak". Chat entry with an existing user message sets `voiceEntry='talk-resume'`: auto-listens once the transition ends. Otherwise the screen opens at Landing and waits for a tap.
- Exit: X (`leave('chat','close')`) returns to Chat; "Type" pill returns to Chat (source `type`); sliders icon opens Choose a Voice; a spoken farewell (`isFarewell`) sets `endingAfterReply`, and after Wysa's closing line the app returns Home instead of listening again.
- Layers (back to front, z-index): glows (-1) and paper layer, then `.vc-main` (1: header, transcript, orb block), then `.vc-ctrls` (2). `.scr.vc` uses `isolation:isolate`, so negative z-indexes stay inside it. Glows therefore sit behind everything; `.vc-main`, `.vc-head`, `.vc-orb-block`, `.vc-ctrls` are `background:transparent; box-shadow:none; backdrop-filter:none`.
- Tapping the screen calls `onScreenTap` (cursor pointer in idle) unless an error is showing.

**UI spec**

| Element | Property | Value |
|---|---|---|
| `.scr.vc` | background | `linear-gradient(180deg,#FFF 16.739%,#FBF8F3 49.673%,#FFF 82.606%)` (Figma 778:7508) |
| `.scr.vc` | overflow | hidden / clip, `justify-content:space-between` |
| `.vc-main` | layout | flex column, gap 24px, padding 0 24px, max-height 708px |
| `.vc-head` | layout | space-between, min-height 42px |
| `.vc-actions` | gap | 12px |
| Glow images | assets | `/assets/c/v-glow-{bottom-landing,top-landing,top-speak,bottom-listen}.svg`; each `.vc-glow` is rotated 180deg, opacity 0 to 1 over 600ms |
| Glow bottom (landing) | size / pos | 800x621, left `calc(50% + 18px - 400px)`, bottom -315px |
| Glow bottom.listen | pos | bottom -332px |
| Glow top | size / pos | 1048x771, left `calc(50% - 515px)`, top -513px |
| Glow top.speak | pos | left `calc(50% - 547px)` |

## 11. States

**Behaviour**
- Phases: idle, listening, thinking, speaking, paused, reconnecting, failed, denied. `idle` + `idleReason='initial'` is Landing ("ready"); `idle` + `'timeout'` (8s no speech, `noSpeechTimeoutMs`) shows "Tap to start" with the normal small orb.
- Landing shrinks: orb animates 190px to 100px (width/height/bottom, 400ms ease) when listening starts. `ready` is false while leaving or `resuming`.
- Reconnecting: after 8s (`RECONNECT_FAIL_MS`) with no recovery it fails to the network error.
- Any phase change clears `voiceError`.

**UI spec**

| Phase | Caption | Orb | Top glow | Bottom glow | Background | Pills |
|---|---|---|---|---|---|---|
| Landing (ready) | "Tap to start" (caption slot) | 190px, `DuoOrb tone=cycle` (yellow/blue drift), centred ~y412 (`bottom:206px`); duo sizes 74%/84%, r 5px | landing top glow on | landing bottom glow on | default gradient | white, normal |
| Listening | "Listening" | 100px `tone=listen` (blue), block `.listen` (flex-start, gap 12px) | off | `.listen` on, driven by `--vc-bot` | default gradient | white, normal |
| Thinking (Figma 789:9039) | "Thinking" | 100px `/assets/c/v-orb-think.svg`, `.pulse` (`orb-pulse` 1.6s alternate, scale .94-1.04, opacity .75-1) | `.speak` glow on, slides in `translateY(250px)` to 0, 200ms ease-out (`vc-think-glow-in`) | none (no blue glow) | flat `#FBF8F3` (`.is-thinking`) | white (not grey) |
| Speaking | "Wysa Speaking" | 100px `tone=speak` (yellow) | `.speak` on, driven by `--vc-top` | off | default gradient | `.grey` |
| Paused | "Paused" | orb `.hidden` (visibility hidden) | off | off; `.vc-pglow` blue + yellow glows slide to translateX(0), opacity 1 (1800ms/1600ms), `pause-breathe` 6.5s | default gradient | `.grey`; Pause pill `.active` |
| Reconnecting (no frame) | "Reconnecting" + 24px `spinner.svg` (spin .9s), colour `--error` | as listening | off | on | default | white |
| Failed / denied | caption err (`--error`) "Couldn't connect. Tap to retry" / mic-denied copy, replaced by `.vc-err` button when `voiceError` set (see 15) | hidden | off | on | default | white |

| Element | Property | Value |
|---|---|---|
| `.vc-orb-block` | size | height 178px, margin 0 -24px, padding-top 24px, column, centred, `space-between` |
| `.vc-orb` / `.vc-orb-in` | size | 100x100; ready 190x190 |
| `.vc-orb .duo` | duo sizes | a 78%, b 88%, r 3px |
| `.duo-listen` | colours | `#bef5f1` with `#ddf6f8` highlight; a opacity .7, b .5 |
| `.duo-speak` | colour | `#feed9f`; b opacity .5 |
| `.vc-label` | type | 300 16px/1.4 `--c-font`, rgba(60,63,88,.75), centred, min-height 44.8px, gap 10px, padding 0 24px |
| `.vc-pglow` | size | 620x560, blur 8px; blue `rgba(190,245,241,.9)`, yellow `rgba(254,237,159,.9)` |

## 12. Audio-reactive gradients

**Behaviour**
- One rAF loop in `VoiceC` writes `--vc-top` and `--vc-bot` (0..1, 3 decimals) on the root every frame, lerped with factor 0.15 toward targets.
- Speaking (top): TTS has no readable stream, so a simulated envelope: target `tgt = 0.25 + rand*0.75`, re-rolled every 90-230ms; `topT = min(1, tgt * (0.75 + 0.25*sin(t/130)))`.
- Listening (bottom): `botT = min(1, micLevel()*1.8)` from the live mic. All other phases target 0, so values decay to 0.

**UI spec**

| Element | Property | Value |
|---|---|---|
| `.vc-glow-top.speak.on` | transform | `rotate(180deg) translateY(calc(var(--vc-top)*-26px)) scale(calc(1 + var(--vc-top)*0.14))` (range 0 to -26px, scale 1 to 1.14) |
| `.vc-glow-top.speak.on` | opacity | `calc(0.78 + var(--vc-top)*0.22)` (0.78 to 1), `transition:none` |
| `.vc-glow-bottom.listen.on` | transform | `rotate(180deg) translateY(calc(var(--vc-bot)*34px)) scale(calc(1 + var(--vc-bot)*0.16))` (0 to 34px, scale 1 to 1.16) |
| `.vc-glow-bottom.listen.on` | opacity | `calc(0.75 + var(--vc-bot)*0.25)` (0.75 to 1), `transition:none` |

## 13. Transcript

**Behaviour**
- Whole conversation shown (not interactive, `user-select:none`): Wysa lines left plain text, user lines right in cyan bubbles. Hidden at Landing, and excludes empty, `error`, and `pending` messages.
- While speaking, Wysa's last line fills word by word: spoken words dark, remainder `.later` `#b1b4ce`.
- Live partial line: while listening, `transcript.text` (+ "…" if partial) shows as a bubble.
- Scroll rules: a new user line lands 16px below the 32px top fade (`LAND=48` from visible top) using smooth scroll. A trailing `.vc-spacer` is sized each layout (`clientHeight - paddingBottom - LAND - heightBelowLine`, min 0) so the line can reach that position without extra scroll room, i.e. capped. No auto-follow while Wysa replies. First mount with history jumps to bottom.
- Jump to latest: shown when `landing() - scrollTop > clientHeight`; click scrolls to the landing position. No Figma frame.
- Scrollbar: `FadeScrollbar` overlay thumb, hidden until scroll, fades out 1s after scrolling stops. No Figma frame.

**UI spec**

| Element | Property | Value |
|---|---|---|
| `.vc-transcript` | layout | flex column, overflow-y auto, native scrollbar hidden, padding 16px 14px 24px 0, margin-right -14px |
| `.vc-transcript` | edge fade mask | `linear-gradient(to bottom, transparent 0, #000 32px, #000 calc(100% - 48px), transparent 100%)` |
| `.vc-line` / `.vc-wysa` | type / size | 400 16px/24px, `#0A0A24`, padding 10px 0, width 354px (max 100%), pre-wrap |
| `.vc-wysa + .vc-wysa` | margin-top | 4px |
| `.vc-bubble` | box | fit-content, max-width 307px, margin 8px 0 8px auto, padding 12px 16px, radius 20 20 4 20, bg `--bubble`, text `--navy`, 16px/24px |
| `.vc-spacer` | height | 0 default, set by JS |
| `.fade-sb` | box | 3px wide, radius 100px, `rgba(10,10,36,.25)`, opacity transition 300ms, inset 4px from right edge, min thumb 24px |
| `.jump-latest.vc-jump` | box | 56x56 (`fig-arrow-down.svg`), centred, `bottom:calc(100% - 27px)` of `.vc-ctrls`; off: opacity 0, scale .85; on: scale 1, 160ms |

## 14. Controls

**Behaviour**
- Type pill: leaves to Chat (`type` transition). Pause pill: `toggleMute`, `aria-pressed` when paused, swaps icon to `pause-active.svg`, label stays "Pause", aria-label "Resume" when paused.
- `.grey` pills (Speaking, Paused) keep a grey shadow. Pause/Resume works from listening, thinking, speaking, reconnecting.
- Header: X (`close.svg` 20px) ends session to Chat; sliders (`sliders.svg` 42px) opens Choose a Voice; hamburger (`fig-hamburger.svg` 24px) shows a "Work in progress" tooltip (`config.tooltipMs`, or dismissed on next tap). Per design review all three icons show in every state, which deviates from the Iteration-3 frames (Paused has neither, Speaking only the gear). Flagged.

**UI spec**

| Element | Property | Value |
|---|---|---|
| `.vc-ctrls` | box | height 138px, padding 32px 24px 0, space-between, enter `cc-bottom-in 220ms` |
| `.vc-pill` | box | flex, gap 10px, padding 12px, radius 100px, bg `#fff`, 400 16px `--c-font`, `#0A0A24`, icon 24px |
| Type pill | width | 100px |
| Pause pill | width | 104px |
| `.vc-pill` / `.grey` | shadow | `filter: drop-shadow(0 0 3.5px #cacaca)` |
| `.vc-pill.active` | text | weight 590, colour `#de761e` (orange Pause text) |
| `.vc-icon` | size | 42x42 centred |
| `.vc-tip` | pos | top 48px, right 0 |

## 15. Voice errors

**Behaviour**
- Four kinds (`VoiceError`): `mic` (phase `denied`/`failed`), `silence` (phase `idle` after 8s no speech), `network` (STT failure or reconnect timeout), `reply` (reply failure). Error shows in place of the orb and label; the screen tap handler is disabled.
- Tap the text (`retryError`): resets attempts and reply; `network`/`reply` with last message from user re-sends (`beginReply`); otherwise `startListening` (re-requests mic).
- Copy is a stand-in; Figma 778:7697 only has dummy "Error state" text. Flag for design review.
- Preview: desktop "Errors: On/Off" toggle (`ErrorToggle`) forces the `network` error; dev hook `window.__voiceError('mic'|'silence'|'network'|'reply')` (DEV builds only) stops audio and forces each kind.

**UI spec**

| Kind | Copy |
|---|---|
| mic | I can't hear you. Allow mic access, then tap here to try again. |
| silence | I didn't catch that. Tap here to try again. |
| network | Connection lost. Tap here to try again. |
| reply | I couldn't respond just now. Tap here to try again. |

| Element | Property | Value |
|---|---|---|
| `.vc-err-block` | layout | orb block, `justify-content:flex-end`, padding 0 0 4px |
| `.vc-err` | box | button, width 316px, no border/background, centred, `word-break:break-word` |
| `.vc-err` | type / colour | 300 14px/1.4 `--c-font`, `#d26969` |
| `.vc-err` | a11y | `aria-label` = copy |
