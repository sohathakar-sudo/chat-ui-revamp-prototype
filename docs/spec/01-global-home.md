# Variant C – Global, Loader, Transitions, Home

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
