import { useEffect, useRef } from 'react';
import GreetingArtwork from './GreetingArtwork';
import './GreetingScene.css';

export default function GreetingScene({
  moment, sender, recipient, text, language, revealed, onReveal,
}) {
  const messageRef = useRef(null);
  useEffect(() => {
    if (revealed) messageRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  return (
    <section
      aria-label="Interactive greeting"
      className="moment-canvas"
      data-occasion={moment.slug}
      data-revealed={revealed}
    >
      <div className="moment-atmosphere" aria-hidden="true">
        <div className="moment-halo" />
        {revealed && <div className="moment-embers"><i /><i /><i /><i /><i /><i /></div>}
      </div>
      <h2 className="moment-occasion"><span>{moment.title} Moment</span></h2>
      <div className="moment-illustration">
        <GreetingArtwork occasion={moment.slug} />
      </div>
      {revealed ? (
        <div className="moment-stage">
          <div className="moment-message">
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

      </div>
    </section>
  );
}
