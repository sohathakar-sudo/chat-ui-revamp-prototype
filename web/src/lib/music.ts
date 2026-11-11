// Background ambience for Variant B. Plays on the Loader and Chat screens only
// (silent on Home, Voice, Choose-a-Voice and the variant chooser), pauses when the
// user toggles it off from the chat top bar, drops out in voice mode, and
// cross-fades on every screen change. Variant A never plays anything.
//
// The loop itself is supplied separately: drop an MP3 at
// web/public/assets/b/ambient.mp3 and it plays automatically. Until then the whole
// feature works silently — a missing/!loading file fails quietly. See README
// "Design notes for review".
import { store, type State } from './store';

const SRC = '/assets/b/ambient.mp3';
const TARGET_VOLUME = 0.5; // comfortable background level when on
const FADE_MS = 650; // matches the Variant B screen-transition feel

let audio: HTMLAudioElement | null = null;
let fadeRaf = 0;
let currentTarget = 0; // volume we're ramping toward (0 = off/paused)
let armed = false; // waiting for a user gesture to begin playback (autoplay was blocked)

/** Music is audible only in Variant B, when toggled on, on the Loader or Chat
 *  screen, and while the tab is visible. */
function wantsMusic(s: State): boolean {
  if (s.variant !== 'B' || !s.musicOn) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  return s.screen === 'loader' || s.screen === 'chat';
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio(SRC);
  a.loop = true;
  a.preload = 'auto';
  a.volume = 0;
  a.addEventListener('error', () => {}); // no track supplied yet: stay silent, don't throw
  audio = a;
  return a;
}

/** Ease the volume toward `to` over FADE_MS, pausing once it reaches 0. */
function ramp(to: number) {
  const a = ensureAudio();
  cancelAnimationFrame(fadeRaf);
  const from = a.volume;
  const start = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / FADE_MS);
    a.volume = from + (to - from) * k;
    if (k < 1) fadeRaf = requestAnimationFrame(tick);
    else if (to === 0) a.pause();
  };
  fadeRaf = requestAnimationFrame(tick);
}

/** Autoplay was blocked (e.g. a ?variant=B deep link lands on the Loader with no
 *  prior tap): start on the next pointer gesture. */
function armGesture() {
  if (armed) return;
  armed = true;
  const go = () => {
    armed = false;
    window.removeEventListener('pointerdown', go, true);
    sync();
  };
  window.addEventListener('pointerdown', go, { capture: true });
}

function sync() {
  const on = wantsMusic(store.get());
  const to = on ? TARGET_VOLUME : 0;
  // Nothing to do unless the desired state changed (or music should be on but got paused).
  if (to === currentTarget && !(on && !!audio && audio.paused)) return;
  currentTarget = to;
  if (to > 0) {
    const a = ensureAudio();
    if (a.paused) {
      // The first successful play() must happen inside a user gesture; once the
      // element is unlocked, later resumes (e.g. returning from voice) need no gesture.
      a.play()
        .then(() => ramp(to))
        .catch(() => { currentTarget = 0; armGesture(); });
    } else {
      ramp(to);
    }
  } else if (audio) {
    ramp(0);
  }
}

if (typeof window !== 'undefined') {
  store.subscribe(sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}
