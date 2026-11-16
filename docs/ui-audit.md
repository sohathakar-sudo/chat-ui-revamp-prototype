# Variant C UI audit vs Figma (file lIFjMFYtHlL9B7fmEhDJWd)

Frames: Home 778:7792, Chat/Active 778:7874, Dictation 778:7906, Voice/Landing 778:7508, Voice/Speaking 778:7557, Voice/Listening 778:7598.
Skipped as intentional: background #FBF8F3, blacks to #0A0A24, voice captions 16px, input card not morphing while typing.
Line numbers refer to web/src/styles.css at audit time. Home C renders `HomeB.tsx` with `.hb-*` rules (which use Manrope), so the font items below affect the Variant C Home.

## Home (778:7792)

- [ ] Title "Hi Peter!" font family — Figma: SF Pro Bold 34/1.2, tracking 0.34px · Code: Manrope 700 (styles.css:412, `var(--manrope)`)
- [ ] Subtitle "What's on your mind today?" font family — Figma: SF Pro Regular 24/1.2 · Code: Manrope (styles.css:413)
- [ ] Subtitle color — Figma: #575b7f · Code: var(--secondary) = #4e5355 (styles.css:413, :root --secondary)
- [ ] Chat / Speak pill label size and family — Figma: SF Pro Bold 20px · Code: Manrope 700 16px (styles.css:415)
- [ ] Chat / Speak pills missing icons — Figma: Chat icon 20.6×14.6 left of label, Waveform 20×20 left of "Speak", gap 10 · Code: text only (HomeB.tsx:44-45, styles.css:415)
- [ ] Hero gradient — Figma: #fffefc 15.446% → #fbf8f3 65.824% → #aae5ec 102.77% · Code: #FBF8F3 64.554% → #a3ece7 100.82%, no #fffefc top stop (styles.css:402)
- [ ] Hero blur glow behind page — Figma: 907×907 ellipse at left -227, top -707, opacity 0.6 (node 778:7793) · Code: not present in `.home-b` (styles.css:398)

## Chat / Active (778:7874)

- [ ] Wysa message line-height — Figma: SF Pro Regular 16, line-height normal (about 19px) · Code: 16/24 (styles.css:858)
- [ ] Composer card inner gap — Figma: 8px between input pill and Speak/mic row · Code: row-gap 12px (styles.css:866)
- [ ] Composer input pill — Figma: separate white pill (radius 100, px12 py8) nested inside the 16px-radius card · Code: bare textarea with padding 8px 12px, no pill wrapper (styles.css:870-875). Visually identical on white, so only matters if the pill is meant to be a real element.

## Dictation (778:7906)

- [ ] "Read aloud" while recording — Figma: SF Pro Semibold 590, #9194b9 · Code: Regular 400, #575b7f; the #9194b9 colour only applies under `.is-typing`, and weight 590 is not set anywhere (styles.css:862, :901; ChatC.tsx:12 `typing = hasText && !recording`)
- [ ] Waveform — Figma: static 2px-wide bars, heights 5/12/16/20 in a fixed pattern, space-between, px8 py4 · Code: 200×24 SVG, generated bars (Recorder.tsx:196, styles.css:909). Compare bar width and spacing; the pattern itself is live by design.

## Voice / Landing (778:7508)

- [ ] Landing orb — Figma: 190×190 orb centred in a 596px-high block, "Tap to start" 24px below it · Code: the shared 100px orb in the 178px bottom block; `.vc-start`, `.vc-landing-orb` and `.vc-start-title` exist but VoiceC.tsx never uses them (styles.css:953-956, VoiceC.tsx:163-170)
- [ ] Caption colour — Figma: rgba(60,63,88,0.75) · Code: rgba(38,48,59,0.75) (styles.css:976)
- [ ] Caption box — Figma: 2 lines at 1.4 (second line blank), container about 44.8px high · Code: min-height 28px, so the caption sits about 19px lower than in Figma (styles.css:976)
- [ ] Type / Pause pill glow — Figma: #a3ece7 on Landing and Listening · Code: matches only when not `.grey`; confirm `grey` is false in those states (styles.css:984-989)

## Voice / Speaking (778:7557)

- [ ] Caption colour and box — same as Landing (rgba(60,63,88,0.75); two-line 1.4 box) · Code: rgba(38,48,59,0.75), min-height 28px (styles.css:976)
- [ ] Type pill width — Figma: fixed 100px · Code: auto width, about 89px (styles.css:984)
- [ ] Pause pill width — Figma: fixed 104px · Code: auto width (styles.css:984)
- [ ] Orb block layout — Figma: 100px orb, caption at the bottom, block 178px with pt24 · Code: same height, but the caption box differs (see above), so the orb-to-caption spacing differs (styles.css:971)

## Voice / Listening (778:7598)

- [ ] User transcript — Figma: plain right-aligned text, 16/24, #0a0a24, py10, no bubble · Code: cyan bubble (#cefaff), padding 12/16, radius 20/20/4/20, max-width 307 (styles.css:965, VoiceC.tsx:134)
- [ ] Orb to caption gap — Figma: 12px gap, orb block 100px then caption · Code: space-between in a 178px block (styles.css:971)
- [ ] Caption colour and box — same as Landing/Speaking (styles.css:976)

## Unsure / needs designer

- Voice header menu icon: Figma uses a 42×42 "List" asset (4f6dd) in all three voice frames. Code uses `fig-hamburger.svg` at 24px inside a 42px button. I did not compare glyph shapes. Check whether it is the same icon.
- Chat user bubble (`.cc-bubble`, cyan, 20/20/4/20 radius): no user message exists in the six frames. I could not verify it.
- Typing caret: Figma draws a 1px, 21px-high line before the placeholder as a fake caret. Code relies on the native caret (#0a0a24). Probably fine.
- Voice bubble vs plain text (Listening): the frame may be a simplified mock. Confirm with design that the Listening user text has no bubble.
- Home status bar: Figma draws its own 414×48 "iPhone Status bar" (19:02, LTE) inside the hero. Not compared, since `HomeStatusBar` is a shared component.
- Home "For your day" card and bottom nav: skimmed (tag, heading, description, CTA sizes match the Figma values). The bottom nav was not in the node context I pulled.
