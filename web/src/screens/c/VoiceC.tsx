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
  silence: "Couldn't catch that. Tap here to try again.",
  network: 'Connection lost. Tap here to try again.',
  reply: "I couldn't respond just now. Tap here to try again.",
  blocked: 'Mic access is off. Open Settings to turn it on.',
  nomic: 'No microphone found. You can still type.',
};

export function VoiceC({ v }: { v: VoiceModel }) {
  const { phase, idleReason, resuming, caption, transcript, replyText, spokenWords, onScreenTap, toggleMute, leave, retryError } = v;
  const errPreview = useErrorPreview();
  // Error preview (desktop toggle) maps onto Figma's Voice/Error/* and Voice/Reconnecting frames.
  const previewError: VoiceError | null = errPreview === 'reply' || errPreview === 'mic' || errPreview === 'silence' || errPreview === 'network' || errPreview === 'blocked' || errPreview === 'nomic' ? errPreview : null;
  const previewReconnect = errPreview === 'reconnecting' || errPreview === 'offline';
  const voiceError: VoiceError | null | undefined = v.voiceError ?? previewError;
  const messages = useStore((s) => s.messages);
  const trans = useStore((s) => s.trans);
  const leaving = trans?.kind === 'voice-chat' && trans.stage !== 'enter';
  const pvSlow = errPreview === 'slow', pvHeld = errPreview === 'held', pvExplainer = errPreview === 'explainer';
  const pvVoice = pvSlow || pvHeld || pvExplainer;
  const thinking = phase === 'thinking' || pvSlow;
  const ready = phase === 'idle' && idleReason === 'initial' && !leaving && !resuming && !pvVoice;
  const paused = phase === 'paused' || pvHeld;
  const showHeld = paused && (v.held || pvHeld);
  const showExplainer = v.explainer || pvExplainer;
  // Voice/SlowReply: Thinking for more than 8s.
  const [slowThink, setSlowThink] = useState(false);
  useEffect(() => {
    setSlowThink(false);
    if (phase !== 'thinking') return;
    const t = setTimeout(() => setSlowThink(true), 8000);
    return () => clearTimeout(t);
  }, [phase]);
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


  const cap = previewReconnect && !v.voiceError ? { text: 'Reconnecting', err: true, spin: true }
    : pvHeld && !v.voiceError ? { text: 'Paused', err: false, spin: false }
    : thinking && (slowThink || pvSlow) && !v.voiceError ? { text: 'Still thinking…', err: false, spin: false }
    : caption;
  const label = cap !== caption ? cap!.text : ready ? 'Tap to start' : caption?.text ?? '';
  // Header: X + settings + menu in every state, as in the Figma frames (Paused included).
  const showGear = true;
  const showMenu = true;

  return (
    <div ref={rootRef} className={`scr vc${ready ? ' vc-ready' : ''}${thinking ? ' is-thinking' : ''}${paused ? ' is-paused' : ''}${voiceError ? ' is-error' : ''}${!ready && !grey && !voiceError && !thinking ? ' is-listening' : ''}`} onClick={voiceError ? undefined : onScreenTap}
      style={{ cursor: phase === 'idle' && !voiceError ? 'pointer' : undefined }}>
      <div className={`vc-glow vc-glow-bottom${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-landing.svg" alt="" /></div>
      <PaperLayer />
      <div className={`vc-glow vc-glow-top${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-top-landing.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-top speak${mounted && (speaking || thinking || voiceError) ? ' on' : ''}`}><img src="/assets/c/v-glow-top-speak.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-bottom listen${mounted && !ready && !grey && !voiceError && !thinking ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-listen.svg" alt="" /></div>

      <div className="vc-pglow blue"><i /></div>
      <div className="vc-pglow yellow"><i /></div>

      <StatusBar />
      <div className="vc-main">
        <div className="vc-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('chat', 'close'); }} aria-label="Back to chat">
            <img src="/assets/c/fig-back.svg" width={24} height={24} alt="" />
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
                  <img src="/assets/c/fig-list-42.svg" width={42} height={42} alt="" />
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
                <button className="vc-err" onClick={(e) => { e.stopPropagation(); if (voiceError === 'nomic') leave('chat', 'type'); else retryError(); }} aria-label={ERROR_COPY[voiceError]}>
                  {ERROR_COPY[voiceError]}
                </button>
              </div>
            ) : showExplainer ? (
              <div className="vc-orb-block vc-explain">
                <p>Wysa needs your mic to hear you. Nothing is stored without asking.</p>
                <button onClick={(e) => { e.stopPropagation(); if (pvExplainer) return; v.confirmExplainer(); }}>Allow microphone</button>
              </div>
            ) : (
            <div className={`vc-orb-block${!ready && !speaking && !thinking ? ' listen' : ''}`}>
              <div className={`vc-orb${paused ? ' hidden' : ''}${thinking ? ' pulse' : ''}`}>
                <div className="vc-orb-in">{thinking
                  ? <img className="vc-orb-think" src="/assets/c/v-orb-think.svg" alt="" />
                  : <DuoOrb tone={ready ? 'cycle' : speaking ? 'speak' : 'listen'} />}</div>
              </div>
              <p className={`vc-label${cap?.err ? ' err' : ''}`} role="status" aria-live="polite">
                <>{cap?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}{label}</>
                {showHeld && <span className="vc-sub">Reply ready when you resume</span>}
              </p>
            </div>
            )}
        </>
      </div>

      <div className="vc-ctrls" onClick={(e) => e.stopPropagation()}>
        <JumpToLatest scroller={scroller} landing={landing} className="vc-jump" newKey={[...messages].reverse().find((m) => m.role === 'assistant')?.id} />
        <button className={`vc-pill${grey ? ' grey' : ''}`} onClick={() => leave('chat', 'type')}>
          {/* Figma: Landing uses Keyboard 05eb9; Speaking/Listening/Paused use e6247. */}
          <img src={ready ? '/assets/c/keyboard-landing.svg' : '/assets/c/keyboard.svg'} width={24} height={24} alt="" />Type
        </button>
        <button className={`vc-pill${grey ? ' grey' : ''}${paused ? ' active' : ''}`} onClick={toggleMute}
          aria-pressed={paused} aria-label={paused ? 'Resume' : 'Pause'}>
          {/* Figma 9cc35: 20px square-outline pause icon in a 24px slot (#DE761E when paused). */}
          {/* Figma Voice/Paused: Play icon + "Resume" in #DE761E; otherwise the square-outline pause icon. */}
          {paused
            ? <><img src="/assets/c/v-play-active.svg" width={24} height={24} alt="" />Resume</>
            : <><img src="/assets/c/v-pause.svg" width={20} height={20} style={{ margin: 2 }} alt="" />Pause</>}
        </button>
      </div>
    </div>
  );
}
