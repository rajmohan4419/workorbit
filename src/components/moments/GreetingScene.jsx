import { useEffect, useRef, useState } from 'react';
import GreetingArtwork from './GreetingArtwork';
import './GreetingScene.css';

export default function GreetingScene({
  moment, sender, recipient, text, language, revealed, onReveal, shared = false,
}) {
  const [replay, setReplay] = useState(0);
  const messageRef = useRef(null);
  useEffect(() => {
    if (revealed) messageRef.current?.focus({ preventScroll: true });
  }, [revealed]);
  const OccasionHeading = shared ? 'h1' : 'h2';

  return (
    <section
      aria-label="Interactive greeting"
      className="moment-canvas"
      data-occasion={moment.slug}
      data-revealed={revealed}
    >
      <div className="moment-atmosphere" key={replay} aria-hidden="true">
        <div className="moment-halo" />
        {revealed && <div className="moment-embers"><i /><i /><i /><i /><i /><i /></div>}
      </div>
      <OccasionHeading className="moment-occasion"><span>{moment.title} Moment</span></OccasionHeading>
      <div className="moment-illustration" key={`art-${replay}`}>
        <GreetingArtwork occasion={moment.slug} />
      </div>
      {revealed ? (
        <div className="moment-stage">
          <div className="moment-message" key={replay}>
            {recipient && <p className="moment-recipient">Dear <bdi>{recipient}</bdi>,</p>}
            <p className="moment-wish" lang={language} dir="auto" ref={messageRef} tabIndex={-1}>{text}</p>
            {sender && <p className="moment-sender">From <bdi>{sender}</bdi></p>}
          </div>
        </div>
      ) : (
        <div className="moment-stage moment-invitation">
          <p className="moment-invitation-title">{moment.invitation}</p>
          <button type="button" className="moment-reveal" onClick={onReveal}>
            {moment.action} <span aria-hidden="true">✦</span>
          </button>
        </div>
      )}
      <div className="moment-card-footer">
        <span>Made with OrbitBoard Moments</span>
        {shared && revealed && (
          <button type="button" className="moment-replay" onClick={() => setReplay(count => count + 1)}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
              <path d="M4 9a6 6 0 1 1 1.5 5M4 5v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Replay
          </button>
        )}
      </div>
    </section>
  );
}
