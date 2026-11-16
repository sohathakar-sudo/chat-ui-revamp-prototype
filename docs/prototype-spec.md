# Wysa Chat Revamp – Prototype Spec (Variant C)

**Status:** Final reference for decisions · **Build:** commit `a98fdb4` on `test/chat-ui-revamp-prototype` · **Date:** 2026-11-16
**Figma:** file `lIFjMFYtHlL9B7fmEhDJWd`, section *Iteration 3* (778:7451) · **Frame:** 412 × 917

This documents every feature and UI spec in the Variant C prototype as built. Values come from the code and were cross-checked against it (about 120 claims). Where the build deliberately differs from Figma, or there's no Figma frame, it's called out and collected under **Open decisions** at the end.

**Contents:** Global, Loader, Transitions, Home (§1–4) · Chat, Composer, Scroll, Dictation, Chat errors (§5–9) · Voice mode, States, Audio-reactive gradients, Transcript, Controls, Voice errors (§10–15) · Open decisions

---
## Part A · Global, Loader, Transitions, Home

Scope: `store.variant === 'C'` only. Source paths are under `web/src/`.

## 1. Global

**Behaviour**
- App opens on "Choose a Variant" (`pick`); `?variant=C` skips it and goes to the loader. Dev-only `?screen=home|chat|voice|voices` skips the loader. (`lib/store.ts:40-58`)
- Phone frame is fixed 412 × 917. On desktop it is wrapped in a dark bezel and scaled via `--fit` (min of `(innerHeight-40)/941`, `(innerWidth-40)/436`, clamped 0.5-1). Below 501px width the bezel is dropped and the screen fills 100vw × 100dvh. (`App.tsx:25-33`, `styles.css:36-52`)
- Screens: `pick`, `loader`, `home`, `chat`, `voice`, `voices`. The swoosh overlay and loader overlay sit above `.scr-wrap` inside `.screen`.
- **Paper texture toggle** (desktop only, hidden below 501px): floating pill "Paper texture: On/Off", default Off. Sets `<html data-paper="on|off">`; `.paper-layer` is `display:none` unless on. localStorage key `wysa.paper` (`'1'`/`'0'`). Texture source: Figma Paper Chat 778:8372 / Voice Paper 778:8412. (`components/PaperLayer.tsx`)
- **Errors preview toggle** (desktop only, hidden below 501px): floating pill "Errors: On/Off" under the paper toggle, default Off. Sets `<html data-errors>`; read in screens via `useErrorPreview()` to force error states. localStorage key `wysa.errors` (`'1'`/`'0'`).
- Both toggles are prototype tooling, not part of the Figma design.
- Palette rule: no pure black; all "black" text/icons use `#0A0A24`. Page bg `#FBF8F3`. Yellow `#FEED9F`, orange `#DE761E`.
- Assets: all local in `web/public/assets/` (root = shared/base, `b/` = Variant B, `c/` = Variant C incl. `paper-texture.jpg`, `fig-*.svg` icons exported from Figma). No Figma URLs in code.

**UI spec**

| Element | Property | Value |
|---|---|---|
| Frame `.screen` | size / radius / bg | 412 × 917, radius 46px (0 on mobile), `#FBF8F3` |
| Device bezel (desktop) | padding / radius / bg | 12px, 58px, `#15171A`, shadow `0 30px 80px rgba(20,40,60,.25)` |
| Page body (desktop) | bg | `#E7ECEE` (mobile: `#FBF8F3`) |
| `--bg` / `--b-bg` | color | `#FBF8F3` |
| `--navy` / `--primary` / `--b-ink` | color | `#0A0A24` |
| `--b-orange` | color | `#DE761E` |
| Yellow (orb, swoosh, glows) | color | `#FEED9F` |
| Blue (orb, glows) | color | `#BEF5F1` |
| `--ink` | color | `#3C3F58` |
| `--sub` | color | `#575B7F` (subtitle, secondary captions) |
| `--muted` | color | `#9194B9` (voice captions) |
| `--teal` / `--teal-soft` | color | `#4999A5` / `#AAE5EC` |
| `--bubble` / `--cyan-50` | color | `#CEFAFF` / `#E2FDFF` (user bubble) |
| `--error` | color | `#D26969` |
| `--placeholder` | color | `#B1B4CE` |
| `--crisis` | color | `#FA7878` |
| `--cta` | color | `#BD5800` |
| `--secondary` | color | `#4E5355` |
| Font (C screens) `--c-font` | stack | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', system-ui, sans-serif` |
| Font (shared) `--sf` | stack | `"SF Pro", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", Arial, sans-serif` |
| Font `--sf-display` | stack | `"SF Pro Display", -apple-system, ... ` |
| Other fonts | used for | `Inter` (chat status bar time), `DM Sans` (loader label), `Roboto` (bottom nav) |
| Easing | tokens | `--ease-out cubic-bezier(.2,.8,.2,1)`, `--ease-in cubic-bezier(.4,0,1,1)`, `--overshoot cubic-bezier(.34,1.56,.64,1)` |
| Paper layer | geometry | `<img>` 917 × 917, left -252.5px, top 50% (translateY -50%), `object-fit:cover`, opacity 0.4, `mix-blend-mode:darken`, z-index 0 (Home: 1) |
| Toggle pills | style | fixed right 20px; paper top 20px, errors top 64px; padding 10 14, radius 100, white bg, 13px/500; pressed = `#0A0A24` bg, white text |
| Hero orb shadows | n/a | cards use `filter: drop-shadow` (see Home) |

## 2. Loader

**Behaviour**
- Shown after variant pick. Stays a minimum **6000 ms** (two full yellow→blue→yellow cycles of 3s), then `store.go('chat')`. (Non-C: 2400 ms.) (`screens/Loader.tsx:23-25`)
- Leads to **Chat** (not Home). A `LoaderOverlay` copy of the art is kept on top of freshly mounted Chat and fades out over 900 ms (overlay removed at 950 ms): whole layer fade-out 900ms `cubic-bezier(.4,0,.2,1)`, orb `blob-open` (scale 9, opacity .2) over 900ms, wordmark and label fade out 600ms. No blank frame. (`styles.css:72-74, 838`)
- Orb is the same `DuoOrb tone="cycle"` as Home, clipped (`overflow:hidden`), rotating and breathing. Both circles share one tint cycle (no phase offset).
- Loader→Home code layer (`.to-home.loader`, `homeTransition` flag, cleared after 1150 ms) reuses the same art with the `blob-open` expand.
- Copy: "Loading your safe corner..."

**UI spec**

| Element | Property | Value |
|---|---|---|
| Screen | bg | `#FBF8F3` |
| Wordmark `wysa-wordmark@2x.png` | position / size | top 109px, centred, 92 × 42 |
| Orb `.blob-orb` | position / size | centre x, top 417px (centred on it), 190 × 190 |
| Orb | breathe | `loader-orb-breathe` 3s ease-in-out infinite alternate, scale .88 → 1.06 |
| `.duo` inside | breathe | 6s (vs 4s), circle sizes 74% / 84%, drift radius 5px |
| Circle A | motion | `duo-cw` 30s linear + `loader-tint` 3s ease-in-out |
| Circle B | motion | `duo-ccw` 36s linear + `loader-tint` 3s ease-in-out |
| `loader-tint` | colors | 0%/100% `#FEED9F` (yellow), 50% `#BEF5F1` (blue) |
| Label | style | top 659px, full width, centred, DM Sans 17px, `#0A0A24` |

## 3. Transitions (Variant C)

**Behaviour**
- Stages: `press` → `exit` (old screen animates) → swap → `enter` (new screen animates) → end. Timings in `lib/transitions.ts`; `store.trans` drives classes `tr-C tr-{stage} tr-{kind} [tr-src-*]` on `.scr-wrap`. Any C screen change with no entry below is **instant** (e.g. Home→Choose a Voice, chat↔voices). A new navigation is ignored (instant set) while one is running. `cancelTransition()` clears timers on variant switch.
- Swoosh (when `swoosh` set and stage ≠ press): 650 ms (`SWOOSH_MS`) overlay, z-index 40, two blurred (22px) radial blobs: cyan `rgba(183,238,239)` and, for C, **yellow** `rgba(254,237,159)` (`.swoosh.c`, replaces B's peach). Cyan blob 95% × 62% sweeps low-left up (0,84%→18%,60%); yellow 72% × 48% sweeps low-left to right/up (-22%,74% → 88%,50%) fading out. ltr only used.
- All entries below are flagged **no Figma frame / design review** (motion only).
- Reduced motion: all stage animations collapse to 1 ms.

| Kind | press / exit / enter (ms) | Swoosh | What animates |
|---|---|---|---|
| `home-chat` | 0 / 450 / 900 | ltr | Exit: `.hb-hero` slides down 55% + fades (450 ease-in); `.hb-top`, `.hb-body` fade 250; `.hb-today`, `.bottom-nav` fade 300. Enter: `.cc-head` bar-in-top 400 (+120 delay); `.cc-comp` bar-in-bottom 400 (+120); `.cc-thread` fade 400 (+300); glows fade 600. |
| `home-voice` (Speak) | 0 / 550 / 1500 | ltr | Exit: hero expands to full height, radius 0, fades (550 ease-out); content fades 250. Enter: `.vc-head` bar-in-top 450; `.vc-ctrls` bar-in-bottom 450; `.vc-label` blur-in 700 (+450); `.vc-orb` orb-settle 750 overshoot (+300). Voice waits for `until` before opening mic. |
| `chat-voice` (Talk) | 0 / 300 / 700 | ltr | Old/new `.scr` fade-out 280 / fade-in 320; enter: `.vc-head`, `.vc-ctrls` bars 450, `.vc-label` blur-in 700 (+450), `.vc-orb` settle 750 (+300). |
| `voice-chat` source `type` | 700 / 450 / 600 | none | In-place morph after 700 ms press ("loading" caption lead-in). Exit: `.vc-head` out-top 300, `.vc-ctrls` out-bottom 350, transcript fade 300, `.vc-orb` orb-spin-out 450 (scale 0, rotate 200deg), label fade 250 (+200). Enter: `.cc-head` 400, `.cc-comp` 400, `.cc-thread` thread-expand 500 (+80, origin top), glows glow-in-left/right 600. |
| `voice-chat` source `close` (X) | 0 (press forced to 0) / 450 / 600 | ltr | `.scr` fade-out 280 / fade-in 320; exit bars out 300, orb-out 350, transcript fade 250; enter `.cc-head`/`.cc-comp` 400, `.cc-thread` fade 450 (+100). |
| `chat-home` | 0 / 650 / 1000 | none | Exit: `.cc-comp` a-sink 300; thread fade 250 (+200); glows fade 300 (+300); `.cc-head` out-top 250 (+380). Enter: `.hb-hero` `c-hero-settle` 600 (from height 100%, radius 0, so no flash); `.hb-top`/`.hb-body` fade 400 (+450); `.hb-today` slide-up 600 (+120); `.bottom-nav` slide-up 500 (+200). (Same timings as Variant A's chat-home.) |
| `voice-home` | 0 / 650 / 1000 | none | Exit: `.vc-ctrls` a-sink 300; transcript/label fade; orbs orb-out 300; glows fade 300 (+300); `.vc-head` out-top 250 (+380). Enter: identical to `chat-home`. |
| Not listed (`home-voices`, etc.) | instant | none | No transition. |

## 4. Home

**Behaviour**
- Variant C renders **Variant B's Home** (`HomeB`, Figma 531:9413) with C's icons. Root `.scr.home.home-b`. (`screens/Home.tsx:13`, `screens/b/HomeB.tsx`)
- Tappable: **Chat** pill → `store.go('chat','chat')`; **Speak** pill → `startVoice('speak')` (unlocks audio, `enterVoice`; if voice unsupported, shows tooltip "Voice isn't supported in this browser." for `config.tooltipMs` = 3000 ms, dismissed on next pointerdown). Triple-tap on status bar opens prototype controls.
- **Not tappable:** hero/orb (orb has `cursor:default`, no handler), Crisis Help, more icon, "For your day" card and CTA ("Check in", `cursor:default`), bottom nav tabs (all `aria-hidden`, decorative).
- Greeting `Hi {config.userName}!` (userName = "Peter"); subtitle "What’s on your mind today?".
- Orb: `DuoOrb tone="cycle"` — two blurred circles drifting in opposite directions; each shifts yellow `#FEED9F` → blue `#BEF5F1` → back, offset a quarter cycle, so the orb reads yellow, mixed, blue, mixed.
- Paper layer (if toggled on) renders under the hero at z-index 1.
- Hero entering from chat/voice uses `c-hero-settle` (section 3).

**UI spec**

| Element | Property | Value |
|---|---|---|
| Hero `.hb-hero` | size / radius / bg | 412 × 560, radius `0 0 32px 32px`, `linear-gradient(to bottom, #FFFEFC 15.446%, #FBF8F3 65.824%, #AAE5EC 102.77%)`, column, gap 36, overflow hidden |
| Hero glow `home-hero-glow.svg` | position / size | centred, top 322px, 560 × 178 |
| Status bar `.sb-home` | size | height 48; time "19:02" SF Pro Display 600 18px, ls -0.36px, `#0A0A24`, left 61.5 centre, top 16 |
| Status icons | geometry | battery right 27.4/top 18, 26.6 × 12.5; reception right 84.85/top 19, 18.15 × 11; LTE right 59.17/top 20.14, 19.5 × 9.9 |
| `.hb-top` | layout | padding 0 16px, column, gap 24 |
| `.hb-head` | layout | width 375, flex-end, gap 12 |
| "Crisis Help" | style | 95×34 pill, 1px `--crisis` (`#FA7878`) border, radius 82px, white bg (`.crisis`) |
| More icon `icon-more.svg` | size | 24 × 24 |
| `.hb-body` | layout | height 418, padding 0 24, centred column, gap 24 |
| `.hb-center` | layout | column, centred, gap 36 (orb → copy) |
| Orb `.hb-orb` | size | 124 × 124, overflow hidden; inner duo sizes 76% / 86%, drift radius 4px, breathe 4s alternate scale .98 → 1.04; circle blur 5px |
| Duo circle gradient | fill | `linear-gradient(195deg, rgba(255,248,238,.6) 0%, #FFF 14%, var(--duo-c) 80%)`; B circle opacity .7, angle 15deg; rotation A 22s cw, B 26s ccw; tint 32s ease-in-out (B offset -8s) |
| Greeting h1 | type | SF Pro 700 34px/1.2, letter-spacing 0.34px, `#0A0A24` |
| Subtitle | type | SF Pro 400 24px/1.2, `#575B7F`, width 350 centred |
| Greeting stack gap | spacing | 8px |
| `.hb-pills` | layout | full width, row, gap 20, padding 24px 10px |
| Pill `.hb-pill` | shape | flex:1, height 50, padding 10, radius 100, bg `#FFF`, `drop-shadow(0 0 3.5px rgba(80,159,170,.1))`, icon↔label gap 10 |
| Pill text | type | SF Pro 700 20px |
| Chat pill | color / icon | `#0A0A24`; `c/home-chat-icon.svg` 20.625 × 14.625 |
| Speak pill | color / icon | `#DE761E`; `c/home-speak-waveform.svg` 20 × 20 |
| Voice tooltip | position | `.home-tip` centred above orb, 10px gap, arrow down |
| "For your day" `.hb-today` | section | bg `#FBF8F3`, padding 24 16, gap 16; fills space under hero |
| Title h2 | type | weight 590, 26px/1.4, `#4E5355` |
| List | layout | 372 wide, padding 24 0; connector line `connector.svg` 172 × 3 rotated 90deg at left 15.5, top 141 |
| Milestone | size | 32 × 32 (24 icon, padding 4), `b/milestone-current.svg`; task row gap 16 |
| Card `.mc-card` | shape | flex 1, padding 20, radius 24, `linear-gradient(147.43deg, #00A89B 0%, #357FD5 101.52%)`, overflow hidden |
| Card tag "5 mins" | style | padding 9.6 12, radius 120, bg `rgba(255,255,255,.2)`, 590 14px, white |
| Card title "Morning Check-in" | type | 590 22px/1.2, white |
| Card desc "Reflect on your day with gratitude" | type | 16px/1.4, `rgba(255,255,255,.8)`, width 172 |
| Card CTA "Check in" + chevron 18px | style | height 50, padding 16 12 16 16, radius 120, bg `#BD5800`, 590 16px white, gap 8, right-aligned, drop-shadow `0 0 1px rgba(0,0,0,.25)` |
| Card art/overlay | layers | `mc-art.svg` masked at bottom (aspect 329.777/212); dark overlay `rgba(0,0,0,.2)` 400 × 300 |
| Bottom nav `.bottom-nav` | shape | absolute bottom, z 5, flex, padding 12 16, bg `#FFF`, top border `rgba(255,255,255,.17)`, shadow `drop-shadow(0 -4px 4px rgba(0,0,0,.1))` |
| Tab | layout / type | flex 1, height 66, column, gap 4, Roboto 16px/1.4, `#0A0A24`, opacity .6 (active 1, weight 700) |
| Tab icon | size | 40 × 40 (all tabs) |
| Home tab icon | asset | heart, `c/fig-nav-home-heart.svg` |
| Other tabs | assets | Therapist `nav-therapist.svg`, Self-Care 2×2 grid blocks (CSS), Progress `nav-progress.svg` |

**Design-review flags:** all Variant C transitions (section 3), the Loader→Chat crossfade, and the loader orb timing (6 s minimum, 3 s tint cycle) have no Figma frame; Loader→Home transition source node is `269-1307`.


---

## Part B · Chat and Dictation

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


---

## Part C · Voice mode

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

---

## Open decisions

### Built with no Figma frame (needs design sign-off)
| # | Item | Where | Notes |
|---|---|---|---|
| 1 | Sent user message (cyan bubble, 20/20/4/20 radius) in chat **and** voice | §5, §13 | Voice Listening frame 778:7598 shows plain text; the team asked for bubbles, so Figma should be updated |
| 2 | Wysa "thinking" dots in chat | §5 | Shared typing-dots component |
| 3 | Offline banner | §5 | Inherited from Variant A |
| 4 | Jump-to-latest button (42px white circle, down arrow) | §7, §13 | Shows after scrolling up more than one screen |
| 5 | Fading 3px scrollbar | §7, §13 | iOS-style overlay |
| 6 | "+" attachments button tooltip ("Coming soon: add attachments") | §6 | Feature itself is out of scope |
| 7 | Voice Reconnecting / Failed captions | §11 | Built from existing caption style |
| 8 | All screen transitions + loader timing (6s min, 3s tint cycle) | §2, §3 | Motion only, no frames |

### Deliberate differences from Figma
| # | Item | Decision | Figma |
|---|---|---|---|
| 9 | Input card while typing | Keeps idle 16px card, grows for lines; Speak/mic hide, send appears | 778:7480 pill / 778:7452 28px morph |
| 10 | Voice user text | Cyan bubble | Plain text (778:7598) |
| 11 | Voice Thinking orb | Keeps a gentle pulse | 789:9039 is static |
| 12 | Hamburger icon (chat + voice headers) | Provided 24px icon | 42px "List" asset |

### Placeholder copy (not final)
| # | Where | Current copy |
|---|---|---|
| 13 | Chat send failure | "Couldn't send. Check your connection and try again." |
| 14 | Voice: mic denied | "I can't hear you. Allow mic access, then tap here to try again." |
| 15 | Voice: no speech | "I didn't catch that. Tap here to try again." |
| 16 | Voice: connection lost | "Connection lost. Tap here to try again." |
| 17 | Voice: reply failed | "I couldn't respond just now. Tap here to try again." |

### Not yet built (from feedback, deferred)
- Image upload behind "+" (Later) · Home feed header height (Next) · Voice selection UI home in settings (Later) · Blue grounding orb for loading (No)
- Remaining audit items not approved: Home hero glow (7), composer pill wrapper (10), Read aloud style while recording (11), voice pill glow check (16) — see `docs/ui-audit.md`

### Prototype-only tools (not product features)
- Desktop-only **Paper texture** and **Errors** toggles (top right, ≥501px wide)
