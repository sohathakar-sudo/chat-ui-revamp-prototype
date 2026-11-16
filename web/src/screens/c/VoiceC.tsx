// Variant C voice mode (Figma 681:2162 Landing, 681:2211 Speaking, 681:2248 Listening, 681:2294 Paused).
// The transcript is the whole conversation: scrollable, plain text, not interactive.
// Thinking, Reconnecting and Failed have no frame: built from these frames' parts (flag for design review).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { config } from '../../../../shared/config';
import { useStore } from '../../lib/store';
import { splitWords } from '../../lib/speech';
import type { VoiceError, VoiceModel } from '../../lib/useVoice';
import { DuoOrb } from '../../components/DuoOrb';
import { StatusBar } from '../../components/StatusBar';
import { FadeScrollbar, JumpToLatest } from './ChatC';
import { PaperLayer, useErrorPreview } from '../../components/PaperLayer';

// Figma 778:7697 shows a dummy "Error state" string; this copy is a stand-in, flagged for design review.
const ERROR_COPY: Record<VoiceError, string> = {
  mic: "I can't hear you. Allow mic access, then tap here to try again.",
  silence: "I didn't catch that. Tap here to try again.",
  network: 'Connection lost. Tap here to try again.',
  reply: "I couldn't respond just now. Tap here to try again.",
};

export function VoiceC({ v }: { v: VoiceModel }) {
  const { phase, idleReason, resuming, caption, transcript, replyText, spokenWords, onScreenTap, toggleMute, leave, retryError } = v;
  const errPreview = useErrorPreview();
  const voiceError: VoiceError | null | undefined = v.voiceError ?? (errPreview ? 'network' : null);
  const messages = useStore((s) => s.messages);
  const trans = useStore((s) => s.trans);
  const leaving = trans?.kind === 'voice-chat' && trans.stage !== 'enter';
  const ready = phase === 'idle' && idleReason === 'initial' && !leaving && !resuming;
  const paused = phase === 'paused';
  const speaking = phase === 'speaking';
  const grey = speaking || paused;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

  // Audio-reactive glows: Wysa's top glow breathes with a simulated speech envelope (TTS has no
  // readable stream), the bottom glow follows the live mic level. Smoothed (lerp) and written as CSS vars.
  const rootRef = useRef<HTMLDivElement>(null);
  const micLevel = v.micLevel;
  const phaseNow = useRef(phase);
  phaseNow.current = phase;
  useEffect(() => {
    let raf = 0, top = 0, bot = 0, tgt = 0, nextT = 0;
    const loop = (t: number) => {
      const ph = phaseNow.current;
      let topT = 0, botT = 0;
      if (ph === 'speaking') {
        if (t > nextT) { tgt = 0.25 + Math.random() * 0.75; nextT = t + 90 + Math.random() * 140; }
        topT = Math.min(1, tgt * (0.75 + 0.25 * Math.sin(t / 130)));
      } else if (ph === 'listening') {
        botT = Math.min(1, micLevel() * 1.8);
      }
      top += (topT - top) * 0.15;
      bot += (botT - bot) * 0.15;
      const el = rootRef.current;
      if (el) {
        el.style.setProperty('--vc-top', top.toFixed(3));
        el.style.setProperty('--vc-bot', bot.toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [micLevel]);

  // Hamburger: "Work in progress" tooltip, dismissed after a few seconds or on the next tap.
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(false), config.tooltipMs);
    const off = () => setTip(false);
    window.addEventListener('pointerdown', off, { once: true, capture: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', off, { capture: true }); };
  }, [tip]);

  // Whole transcript: Wysa left, user right. While Wysa speaks, her last line fills in word by word.
  const shown = ready ? [] : messages.filter((m) => m.text && m.status !== 'error' && m.status !== 'pending');
  let lastWysa = -1;
  shown.forEach((m, i) => { if (m.role === 'assistant') lastWysa = i; });
  const words = splitWords(replyText);
  const liveUser = phase === 'listening' && transcript.text ? transcript.text + (transcript.partial ? '…' : '') : '';

  // ChatGPT-style: a new user line is pinned to the top (just below the 32px fade); no follow-scroll during the reply.
  const scroller = useRef<HTMLDivElement>(null);
  const lastUserEl = useRef<HTMLParagraphElement>(null);
  let lastUserId = '';
  shown.forEach((m) => { if (m.role === 'user') lastUserId = String(m.id); });
  const userKey = liveUser ? 'live' : lastUserId;
  const spacerEl = useRef<HTMLDivElement>(null);
  const vcActive = useRef(false);
  const prevKey = useRef<string | null>(null);
  // Landing: user line 16px below the end of the 32px top fade (48px from the visible top).
  const LAND = 48;
  const landing = () => {
    const el = scroller.current, ln = lastUserEl.current;
    if (!el) return 0;
    if (!vcActive.current || !ln) return el.scrollHeight - el.clientHeight;
    return ln.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - LAND;
  };
  useLayoutEffect(() => {
    const el = scroller.current, sp = spacerEl.current;
    if (!el || !sp) return;
    const fit = () => {
      const ln = lastUserEl.current;
      if (!vcActive.current || !ln) return;
      const pb = parseFloat(getComputedStyle(el).paddingBottom) || 0;
      const below = sp.getBoundingClientRect().top - ln.getBoundingClientRect().top;
      const h = Math.max(0, Math.round((el.clientHeight - pb - LAND - below) * 100) / 100);
      if (sp.style.height !== `${h}px`) sp.style.height = `${h}px`;
    };
    const prev = prevKey.current;
    prevKey.current = userKey;
    if (prev === null) { if (userKey) el.scrollTop = el.scrollHeight; }
    else if (userKey && userKey !== prev && prev !== 'live') {
      vcActive.current = true;
      fit();
      const ln = lastUserEl.current;
      if (ln) el.scrollTo({ top: ln.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - LAND, behavior: 'smooth' });
    } else fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    Array.from(el.children).forEach((n) => { if (n !== sp) ro.observe(n); });
    return () => ro.disconnect();
  });


  const label = ready ? 'Tap to start' : caption?.text ?? '';
  // The Iteration-3 frames show the header icons inconsistently (Paused has neither, Speaking only
  // the gear). Per design review we keep X + gear + hamburger in every state so the functional gear
  // (voice settings) and hamburger stay reachable throughout. Flagged as a deviation from the frames.
  const showGear = true;
  const showMenu = true;

  return (
    <div ref={rootRef} className={`scr vc${ready ? ' vc-ready' : ''}${phase === 'thinking' ? ' is-thinking' : ''}${paused ? ' is-paused' : ''}`} onClick={voiceError ? undefined : onScreenTap}
      style={{ cursor: phase === 'idle' && !voiceError ? 'pointer' : undefined }}>
      <div className={`vc-glow vc-glow-bottom${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-landing.svg" alt="" /></div>
      <PaperLayer />
      <div className={`vc-glow vc-glow-top${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-top-landing.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-top speak${mounted && (speaking || phase === 'thinking') ? ' on' : ''}`}><img src="/assets/c/v-glow-top-speak.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-bottom listen${mounted && !ready && !grey && phase !== 'thinking' ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-listen.svg" alt="" /></div>

      <div className="vc-pglow blue"><i /></div>
      <div className="vc-pglow yellow"><i /></div>

      <StatusBar />
      <div className="vc-main">
        <div className="vc-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('chat', 'close'); }} aria-label="End session">
            <img src="/assets/c/close.svg" width={20} height={20} alt="" />
          </button>
          <div className="vc-actions">
            {showGear && (
              <button className="vc-icon" onClick={(e) => { e.stopPropagation(); leave('voices'); }} aria-label="Voice settings">
                <img src="/assets/c/sliders.svg" width={42} height={42} alt="" />
              </button>
            )}
            {showMenu && (
              <div className="progress-wrap">
                <button className="vc-icon" onClick={(e) => { e.stopPropagation(); setTip(true); }} aria-label="Menu">
                  <img src="/assets/c/fig-hamburger.svg" width={24} height={24} alt="" />
                </button>
                {tip && <div className="tooltip vc-tip" role="status">Work in progress</div>}
              </div>
            )}
          </div>
        </div>

        <>
            <div className="vc-transcript" ref={scroller}>
              {shown.map((m, i) =>
                m.role === 'user' ? (
                  <p key={m.id} className="vc-bubble" ref={String(m.id) === lastUserId && !liveUser ? lastUserEl : undefined}>{m.text}</p>
                ) : speaking && i === lastWysa ? (
                  <p key={m.id} className="vc-line vc-wysa">
                    {words.slice(0, spokenWords).join(' ')}
                    {spokenWords > 0 && spokenWords < words.length ? ' ' : ''}
                    <span className="later">{words.slice(spokenWords).join(' ')}</span>
                  </p>
                ) : (
                  <p key={m.id} className="vc-line vc-wysa">{m.text}</p>
                ),
              )}
              {liveUser && <p className="vc-bubble" ref={lastUserEl}>{liveUser}</p>}
              <div ref={spacerEl} className="vc-spacer" aria-hidden="true" />
            </div>
            <FadeScrollbar scroller={scroller} />
            {voiceError ? (
              <div className="vc-orb-block vc-err-block">
                <button className="vc-err" onClick={(e) => { e.stopPropagation(); retryError(); }} aria-label={ERROR_COPY[voiceError]}>
                  {ERROR_COPY[voiceError]}
                </button>
              </div>
            ) : (
            <div className={`vc-orb-block${!ready && !speaking && phase !== 'thinking' ? ' listen' : ''}`}>
              <div className={`vc-orb${paused ? ' hidden' : ''}${phase === 'thinking' ? ' pulse' : ''}`}>
                <div className="vc-orb-in">{phase === 'thinking'
                  ? <img className="vc-orb-think" src="/assets/c/v-orb-think.svg" alt="" />
                  : <DuoOrb tone={ready ? 'cycle' : speaking ? 'speak' : 'listen'} />}</div>
              </div>
              <p className={`vc-label${caption?.err ? ' err' : ''}`} role="status" aria-live="polite">
                <>{caption?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}{label}</>
              </p>
            </div>
            )}
        </>
      </div>

      <div className="vc-ctrls" onClick={(e) => e.stopPropagation()}>
        <JumpToLatest scroller={scroller} landing={landing} className="vc-jump" />
        <button className={`vc-pill${grey ? ' grey' : ''}`} onClick={() => leave('chat', 'type')}>
          <img src="/assets/c/keyboard.svg" width={24} height={24} alt="" />Type
        </button>
        <button className={`vc-pill${grey ? ' grey' : ''}${paused ? ' active' : ''}`} onClick={toggleMute}
          aria-pressed={paused} aria-label={paused ? 'Resume' : 'Pause'}>
          <img src={paused ? '/assets/c/pause-active.svg' : '/assets/c/pause.svg'} width={24} height={24} alt="" />Pause
        </button>
      </div>
    </div>
  );
}
