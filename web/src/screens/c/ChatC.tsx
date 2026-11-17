// Variant C chat thread (Figma Iteration 3: Chat/Active 778:7874, Typing 778:7452 / 778:7480, recorder 778:7906, Error 778:7986).
// "Read aloud" sits only under Wysa's last message. Speak opens voice mode, the Mic dictates.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { markMicExplained, micExplained } from '../../lib/useVoice';
import { useTypeIn } from '../../lib/useTypeIn';
import { StatusBar } from '../../components/StatusBar';
import { Recorder } from '../../components/Recorder';
import { PaperLayer, useErrorPreview } from '../../components/PaperLayer';

// Overlay scrollbar: 3px thumb that follows the scroller and fades out ~1s after scrolling stops. Never takes pointer events.
// It has no Figma frame: flagged for design review. Must be rendered as a sibling right after the scroller (same positioned parent).
export function FadeScrollbar({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const thumb = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current, t = thumb.current;
    if (!el || !t) return;
    let raf = 0, hide = 0;
    const update = () => {
      raf = 0;
      const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = el;
      if (sh <= ch + 1) { t.style.opacity = '0'; return; }
      t.style.opacity = '1'; // always visible while there is more to scroll (Figma Voice/Scroll, audit D6)
      const h = Math.max(24, (ch / sh) * ch);
      const y = (st / (sh - ch)) * (ch - h);
      t.style.height = `${h}px`;
      t.style.top = `${el.offsetTop + y}px`;
      t.style.left = `${el.offsetLeft + el.offsetWidth - 3 - 4}px`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
      t.style.opacity = '1';
      clearTimeout(hide);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); clearTimeout(hide); };
  }, [scroller]);
  return <div ref={thumb} className="fade-sb" aria-hidden="true" />;
}

// "Jump to latest": shown once the user scrolls up more than one visible height from the landing spot.
// It has no Figma frame (built from the fig-plus circle style): needs design review.
export function JumpToLatest({ scroller, landing, className, newKey }: { scroller: RefObject<HTMLElement | null>; landing: () => number; className: string; newKey?: string }) {
  const [show, setShow] = useState(false);
  // Chat/NewReplyBelow: a new assistant message while the button is showing turns it into a "New message" pill.
  const [fresh, setFresh] = useState(false);
  const seenKey = useRef(newKey);
  useEffect(() => {
    if (newKey === seenKey.current) return;
    seenKey.current = newKey;
    if (show && newKey) setFresh(true);
  }, [newKey, show]);
  useEffect(() => { if (!show) setFresh(false); }, [show]);
  const lf = useRef(landing);
  lf.current = landing;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const check = () => setShow(lf.current() - el.scrollTop > el.clientHeight);
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [scroller]);
  if (fresh) {
    return (
      <button className={`jump-latest jump-new ${className}${show ? ' on' : ''}`} tabIndex={show ? 0 : -1}
        onClick={(e) => { e.stopPropagation(); scroller.current?.scrollTo({ top: lf.current(), behavior: 'smooth' }); }}>
        New message ↓
      </button>
    );
  }
  return (
    <button className={`jump-latest ${className}${show ? ' on' : ''}`} aria-label="Jump to latest message" tabIndex={show ? 0 : -1}
      onClick={(e) => { e.stopPropagation(); scroller.current?.scrollTo({ top: lf.current(), behavior: 'smooth' }); }}>
      <img src="/assets/c/fig-arrow-down.svg" width={56} height={56} alt="" />
    </button>
  );
}

export function ChatC({ c }: { c: ChatModel }) {
  const typing = c.hasText && !c.recording;
  const multi = typing && c.multiline;
  const typeIn = useTypeIn(c.messages, 520);
  let lastWysa = -1;
  c.messages.forEach((m, i) => { if (m.role === 'assistant' && m.status === 'done') lastWysa = i; });
  const last = c.messages[c.messages.length - 1];
  const replyFailed = !!last && last.role === 'assistant' && last.status === 'error';
  // Error copy: Figma "Error & missing states" (Chat/Error/ReplyFailed, MicDenied, NothingHeard, Chat/Offline).
  const errPreview = useErrorPreview();
  const PREVIEW_COPY: Record<string, string> = {
    reply: "Couldn't send. Check your connection and try again.",
    network: "Couldn't send. Check your connection and try again.",
    mic: "I can't hear you. Allow mic access, then tap here to try again.",
    silence: "Couldn't catch that, try again.",
    blocked: 'Mic access is off. Open Settings to turn it on.',
    nomic: 'No microphone found. You can still type.',
  };
  const previewText = errPreview ? PREVIEW_COPY[errPreview] ?? null : null;
  const offline = !c.online || errPreview === 'offline';
  // Chat/BackOnline: after reconnecting, the banner turns teal and reads "You're back online" for 3s.
  const [backOnline, setBackOnline] = useState(false);
  const wasOnline = useRef(c.online);
  useEffect(() => {
    if (!wasOnline.current && c.online) {
      setBackOnline(true);
      const t = setTimeout(() => setBackOnline(false), 3000);
      wasOnline.current = c.online;
      return () => clearTimeout(t);
    }
    wasOnline.current = c.online;
  }, [c.online]);
  const showBack = !offline && (backOnline || errPreview === 'backonline');
  // Mic explainer (first time ever the chat mic is tapped): shown above the composer like the error notice.
  const [explain, setExplain] = useState(false);
  const showExplainer = explain || errPreview === 'explainer';
  const tapMic = () => { if (micExplained()) c.openRecorder('mic'); else setExplain(true); };
  const allowMic = () => {
    if (errPreview !== 'explainer') markMicExplained();
    setExplain(false);
    c.openRecorder('mic');
  };
  // Preview rows (desktop toggle): typing, slow reply, cut-off reply.
  const lastAssistantId = [...c.messages].reverse().find((m) => m.role === 'assistant')?.id;
  const errorText = c.notice ?? previewText ?? (replyFailed && !last?.text ? "Couldn't send. Check your connection and try again." : null);
  // The composer only slides in again when it comes back after dictation (audit T1: no replay after screen changes).
  const [returned, setReturned] = useState(false);
  const wasRec = useRef(c.recording);
  useEffect(() => { if (wasRec.current && !c.recording) setReturned(true); wasRec.current = c.recording; }, [c.recording]);
  const [plusTip, setPlusTip] = useState(false);
  useEffect(() => {
    if (!plusTip) return;
    const t = setTimeout(() => setPlusTip(false), 2000);
    return () => clearTimeout(t);
  }, [plusTip]);
  // ChatGPT-style scroll: a sent message goes to the top of the thread and stays there while the reply streams.
  const spacerRef = useRef<HTMLDivElement>(null);
  const userCount = c.messages.filter((m) => m.role === 'user').length;
  const prevUsers = useRef<number | null>(null);
  const active = useRef(false);
  const landing = () => {
    const th = c.threadRef.current;
    if (!th) return 0;
    const us = th.querySelectorAll<HTMLElement>('.msg.user'), u = us[us.length - 1];
    if (!active.current || !u) return th.scrollHeight - th.clientHeight;
    return u.getBoundingClientRect().top - th.getBoundingClientRect().top + th.scrollTop - 16;
  };
  const fitRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const th = c.threadRef.current, sp = spacerRef.current;
    if (!th || !sp) return;
    const lastUser = () => { const us = th.querySelectorAll<HTMLElement>('.msg.user'); return us[us.length - 1]; };
    // Spacer = visible height - 16px gap - (user msg top -> content bottom) - bottom padding, so max scrollTop == landing spot.
    const fit = () => {
      const u = lastUser();
      if (!active.current || !u) return;
      const pb = parseFloat(getComputedStyle(th).paddingBottom) || 0;
      const below = sp.getBoundingClientRect().top - u.getBoundingClientRect().top;
      const h = Math.max(0, Math.round((th.clientHeight - pb - 16 - below) * 100) / 100);
      if (sp.style.height !== `${h}px`) sp.style.height = `${h}px`;
    };
    fitRef.current = fit;
    const first = prevUsers.current === null;
    const sent = !first && userCount > (prevUsers.current ?? 0);
    prevUsers.current = userCount;
    if (first) { th.scrollTop = th.scrollHeight; }
    if (sent) {
      active.current = true;
      fit();
      const u = lastUser();
      if (u) th.scrollTo({ top: u.getBoundingClientRect().top - th.getBoundingClientRect().top + th.scrollTop - 16, behavior: 'smooth' });
    } else fit();
    const ro = new ResizeObserver(fit);
    ro.observe(th);
    Array.from(th.children).forEach((n) => { if (n !== sp) ro.observe(n); });
    return () => ro.disconnect();
  }, [c.messages, userCount, c.threadRef]);
  return (
    <div className={`scr chat chat-c${typing ? ' is-typing' : ''}${multi ? ' is-multi' : ''}${c.recording ? ' is-recording' : ''}`}>
      <PaperLayer />
      <img className="cc-glow-big" src="/assets/c/glow-big.svg" alt="" />
      <img className="cc-glow-small" src={typing ? '/assets/c/glow-small-typing.svg' : '/assets/c/glow-small.svg'} alt="" />
      <StatusBar />
      <div className="cc-head">
        <button className="icon24" onClick={c.back} aria-label="Back">
          <img className="cc-back" src="/assets/c/fig-back.svg" alt="" />
        </button>
        <div className="progress-wrap">
          <button className="icon24" onClick={c.toggleHeaderTip} aria-label="Menu">
            <img src="/assets/c/fig-list.svg" width={24} height={24} alt="" />
          </button>
          {c.headerTip && <div className="tooltip cc-tip" role="status">Work in progress</div>}
        </div>
      </div>
      {offline && <div className="offline" role="status">You're offline, please check your internet connection</div>}
      {showBack && <div className="offline back-online" role="status">You're back online</div>}

      <div className="thread cc-thread" data-manual-scroll="1" ref={c.threadRef}>
        {c.messages.map((m, i) => (
          <MessageRowC
            key={m.id}
            m={m}
            c={c}
            showRead={i === lastWysa}
            typing={typing}
            typed={m.id === typeIn.typingId ? m.text.slice(0, typeIn.shown) : undefined}
          />
        ))}
        {(errPreview === 'typing' || errPreview === 'slow') && !c.messages.some((m) => m.status === 'pending') && <TypingC forceSlow={errPreview === 'slow'} />}
        {errPreview === 'cutoff' && (
          <div className="msg wysa cc-wysa">
            <p className="text">It takes time. Guided meditations for acceptance in your toolkit will help. Once you accept it, you can move on and</p>
            <button className="cc-cutoff" onClick={() => {}}>Reply interrupted. Tap to retry.</button>
          </div>
        )}
        <div ref={spacerRef} aria-hidden="true" />
      </div>
      <FadeScrollbar scroller={c.threadRef} />

      {showExplainer && !c.recording && (
        <div className="cc-explainer" role="dialog" aria-label="Microphone access">
          <p>Wysa needs your mic to hear you. Nothing is stored without asking.</p>
          <button onClick={allowMic}>Allow microphone</button>
        </div>
      )}
      {errorText && !showExplainer && (
        <div className="cc-error" role="alert">
          {/* No separate Retry link (not in Figma 778:8021 / 778:7986): the error text itself is the retry target, as in voice mode. */}
          <button
            onClick={() => (c.notice ? c.openRecorder('mic') : last && c.retry(last.id))}
            aria-label={`${errorText} Tap to try again.`}
          >{errorText}</button>
        </div>
      )}

      {c.recording ? (
        <Recorder accent="orange" skin="c" onDenied={c.recorderDenied} onDone={c.recorderDone} />
      ) : (
        <div className={`cc-comp${returned ? ' cc-return' : ''}`}>
          <JumpToLatest scroller={c.threadRef} landing={landing} className="cc-jump" newKey={lastAssistantId} />
          <div className="cc-card">
            <textarea
              ref={c.inputRef}
              rows={1}
              value={c.text}
              placeholder="Write, or tap the mic to dictate"
              onChange={(e) => c.onText(e.target.value)}
              onKeyDown={c.onKeyDown}
              enterKeyHint="send"
              aria-label="Message"
            />
            <button className="cc-send" onClick={c.submit} disabled={!typing || c.replying || !c.online} tabIndex={typing ? 0 : -1} aria-label="Send">
              <img src="/assets/c/fig-paper-plane.svg" width={24} height={24} alt="" />
            </button>
            <div className="cc-row">
              <button className="cc-plus" onClick={() => setPlusTip((v) => !v)} aria-label="Add attachment">
                <img src="/assets/c/fig-plus.svg" width={56} height={56} alt="" />
              </button>
              {plusTip && <span className="tooltip cc-plus-tip" role="status">Coming soon: add attachments</span>}
              <button className="cc-talk" onClick={c.openVoiceMode} disabled={!c.online} aria-label="Speak with Wysa">
                <img src="/assets/c/fig-waveform.svg" width={24} height={24} alt="" />Speak
              </button>
              <button className="cc-mic" onClick={tapMic} disabled={!c.online} aria-label="Dictate">
                <img src="/assets/c/fig-microphone.svg" width={24} height={24} alt="" />
              </button>
              {c.voiceTip && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRowC({ m, c, showRead, typing, typed }: { m: Message; c: ChatModel; showRead: boolean; typing: boolean; typed?: string }) {
  const playing = c.playingId === m.id;
  if (m.role === 'user') {
    // No Figma frame for a sent message: plain right-aligned text, as in the Voice transcript. Flag for design review.
    return <div className="msg user"><div className="cc-bubble">{m.text}</div></div>;
  }
  if (m.status === 'pending') {
    return m.text ? null : <TypingC />;
  }
  if (m.status === 'error') {
    // Chat/Messages/ReplyCutOff: partial text stays, with a tap-to-retry line. No text: the error strip above the input (Figma 778:7986).
    if (!m.text) return null;
    return (
      <div className="msg wysa cc-wysa">
        <p className="text">{m.text}</p>
        <button className="cc-cutoff" onClick={() => c.retry(m.id)}>Reply interrupted. Tap to retry.</button>
      </div>
    );
  }
  return (
    <div className="msg wysa cc-wysa">
      <div className="text">{paras(typed ?? m.text)}{typed !== undefined && <span className="type-caret" />}</div>
      {showRead && m.status === 'done' && typed === undefined && (
        <button className={`cc-read${playing ? ' playing' : ''}`} onClick={() => c.togglePlayback(m.id)} aria-pressed={playing} aria-label={playing ? 'Stop reading aloud' : 'Read aloud'}>
          {playing
            ? <span className="cc-read-ico" aria-hidden="true" />
            : <img src={typing ? '/assets/c/fig-speaker-high-dim.svg' : '/assets/c/fig-speaker-high.svg'} width={20} height={18} alt="" />}
          {playing ? 'Stop reading' : 'Read aloud'}
        </button>
      )}
    </div>
  );
}

// Chat/Messages/WysaTyping + Chat/SlowReply: 3 dots; after 8s without text, a "Taking longer than usual…" line.
function TypingC({ forceSlow }: { forceSlow?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, []);
  return (
    <div className="msg wysa cc-typing" aria-label="Wysa is typing">
      <div className="typing-c"><i /><i /><i /></div>
      {(slow || forceSlow) && <p className="cc-slow" role="status">Taking longer than usual…</p>}
    </div>
  );
}

// Multi-paragraph replies: 24px gap between paragraphs (Figma Chat/Typing frames, audit D4).
function paras(text: string) {
  const parts = text.split(/\n\s*\n|\n/);
  return parts.length < 2 ? text : parts.map((p, i) => <p key={i} className="cc-para">{p}</p>);
}
