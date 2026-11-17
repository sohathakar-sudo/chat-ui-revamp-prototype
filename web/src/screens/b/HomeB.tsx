// Variant B Home (Figma 531:9413).
import { config } from '../../../../shared/config';
import { store, useStore } from '../../lib/store';
import { HomeStatusBar } from '../../components/StatusBar';
import { DuoOrb } from '../../components/DuoOrb';
import { PaperLayer } from '../../components/PaperLayer';
import type { HomeProps } from '../a/HomeA';
import './home-c.css';
import { TakingControlArt, SleepStoryArt, SkillTileArt, LockedBackdrop } from './HomeCArt';

export function HomeB({ startVoice, tip }: HomeProps) {
  // Variant C (Figma 778:7792) shares this Home; its differences are scoped with the `c` class.
  const isC = useStore((s) => s.variant) === 'C';
  const c = isC ? ' c' : '';
  const H = '/assets/c/home/';
  const main = (
    <>
      <div className="hb-hero">
        <img className="hb-hero-glow" src="/assets/b/home-hero-glow.svg" alt="" />
        <div className={`hb-top${c}`}>
          <HomeStatusBar />
          <div className="hb-head">
            <span className="crisis">Crisis Help</span>
            <img src={isC ? '/assets/c/fig-icon-more.svg' : '/assets/b/icon-more.svg'} width={24} height={24} alt="" />
          </div>
        </div>
        <div className="hb-body">
          <div className="hb-center">
            <div className="orb-btn hb-orb-wrap">
              <div className="hb-orb" style={{ cursor: 'default' }}>
                <DuoOrb tone="cycle" />
              </div>
              {tip && <div className="tooltip home-tip">Voice isn't supported in this browser.</div>}
            </div>
            <div className="hb-copy">
              <h1>Hi {config.userName}!</h1>
              <p>What’s on your mind today?</p>
            </div>
          </div>
          <div className="hb-pills">
            <button className="hb-pill" onClick={(e) => { e.stopPropagation(); store.go('chat', 'chat'); }}><img src="/assets/c/home-chat-icon.svg" width={20.625} height={14.625} alt="" />Chat</button>
            <button className="hb-pill speak" onClick={(e) => { e.stopPropagation(); startVoice('speak'); }}><img src="/assets/c/home-speak-waveform.svg" width={20} height={20} alt="" />Speak</button>
          </div>
        </div>
      </div>

      <div className={`today hb-today${c}`} aria-hidden>
        <h2>For your day</h2>
        <div className="list">
          <img className="connector" src="/assets/connector.svg" alt="" />
          <div className="task">
            <div className="milestone"><img src="/assets/b/milestone-current.svg" width={24} height={24} alt="" /></div>
            <div className="mc-card">
              <div className="content">
                <span className="tag">5 mins</span>
                <h3>Morning Check-in</h3>
                <p className="desc">Reflect on your day with gratitude</p>
                <div className="cta-row">
                  <span className="cta">Check in <img src="/assets/chevron-right-white.svg" width={18} height={18} alt="" /></span>
                </div>
              </div>
              <div className="overlay" />
              <div className="art"><div className="masked"><img src="/assets/mc-art.svg" alt="" /></div></div>
            </div>
          </div>
          {isC && (
            <div className="task">
              <img className="hc-ms" src={`${H}milestone-locked.svg`} width={32} height={32} alt="" />
              <div className="mc-card hc-plain hc-tc">
                <TakingControlArt />
                <div className="content">
                  <span className="tag">5 mins</span>
                  <h3>Taking Control</h3>
                </div>
                <div className="overlay" />
              </div>
            </div>
          )}
        </div>
        {isC && (
          <>
            <section className="hc-sleep">
              <div className="hc-sec-head"><h2>Unwind and sleep</h2><span className="hc-viewall">View all</span></div>
              <div className="task">
                <img className="hc-ms" src={`${H}milestone-locked-2.svg`} width={32} height={32} alt="" />
                <div className="mc-card hc-plain hc-ss">
                  <SleepStoryArt />
                  <div className="content">
                    <h3>Sleep Story</h3>
                    <p className="desc">Sleep better with sleep stories</p>
                    <div className="cta-row">
                      <span className="cta white">Start <img src={`${H}chevron-orange.svg`} width={18} height={18} alt="" /></span>
                    </div>
                  </div>
                  <div className="overlay" />
                </div>
              </div>
            </section>
            <section className="hc-skills">
              <div className="hc-sec-head">
                <h2>Unlocked skills</h2>
                <div className="hc-progress"><span>1 of 6 unlocked</span><img src={`${H}progress-dots.svg`} width={103.746} height={11.458} alt="" /></div>
              </div>
              <div className="hc-grid">
                <div className="hc-tile">
                  <SkillTileArt />
                  <div className="hc-tile-content">
                    <span className="tag">5 mins</span>
                    <div className="hc-tile-text"><h3>Taking Control</h3><p>Achieve restful,<br />deep sleep</p></div>
                  </div>
                </div>
                <div className="hc-tile locked">
                  <LockedBackdrop />
                  <div className="hc-lock-content">
                    <span className="hc-lock-badge"><img src={`${H}lock.svg`} width={18} height={18} alt="" /></span>
                    <p>Complete Check-ins to unlock</p>
                  </div>
                </div>
              </div>
              <div className="hc-navitem">
                <span className="left"><img src={`${H}blocks.svg`} width={24} height={24} alt="" />View all skills</span>
                <img src={`${H}chevron-right-dark.svg`} width={24} height={24} alt="" />
              </div>
            </section>
          </>
        )}
      </div>

    </>
  );
  return (
    <>
      <PaperLayer />
      {isC ? <div className="hc-scroll">{main}</div> : main}
      <nav className={`bottom-nav${c}`} aria-hidden>
        <div className="tab on"><img src={isC ? '/assets/c/fig-nav-home.svg' : '/assets/c/fig-nav-home-heart.svg'} alt="" />Home</div>
        <div className="tab"><img src={isC ? '/assets/c/fig-nav-therapist.svg' : '/assets/nav-therapist.svg'} alt="" />Therapist</div>
        <div className="tab"><span className="blocks"><span className="grid"><i /><i /><i /><i /></span></span>Self-Care</div>
        <div className="tab"><img src={isC ? '/assets/c/fig-nav-progress.svg' : '/assets/nav-progress.svg'} alt="" />Progress</div>
      </nav>
    </>
  );
}
