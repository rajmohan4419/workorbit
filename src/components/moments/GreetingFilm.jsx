import { useEffect, useRef, useState } from 'react';
import GreetingArtwork from './GreetingArtwork';
import { drawFilmScene, FILM_SECONDS, GREETING_REVEAL_SECONDS } from './filmFrames';
import { openFilmAudio, scheduleFilmScore } from './filmAudio';
import './GreetingFilm.css';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export default function GreetingFilm({ moment, greeting }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.(MOTION_QUERY).matches ?? false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [start, setStart] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [video, setVideo] = useState(null);
  const canvas = useRef(null);
  const wish = useRef(null);
  const audio = useRef(null);
  const recording = useRef(null);
  const downloadUrl = useRef('');
  const showStatic = reducedMotion || staticOnly;
  const showGreeting = revealed || showStatic;

  function stopAudio() {
    const active = audio.current;
    audio.current = null;
    if (active) void active.context.close().catch(() => {});
  }

  useEffect(() => {
    const preference = window.matchMedia?.(MOTION_QUERY);
    const change = event => setReducedMotion(event.matches);
    preference?.addEventListener('change', change);
    function visibilityChanged() {
      if (!document.hidden) return;
      stopAudio();
      setSound(false);
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      preference?.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibilityChanged);
      stopAudio();
      recording.current?.abort();
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    };
  }, []);

  useEffect(() => {
    if (showStatic) return;
    let frame;
    let announced = false;
    let context;
    function render(now) {
      const elapsed = start === null ? 0 : Math.max(0, Math.min(FILM_SECONDS, (now - start) / 1000));
      try {
        context ??= canvas.current?.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        drawFilmScene(context, 720, 405, moment.slug, elapsed);
      } catch {
        setStaticOnly(true);
        return;
      }
      if (!announced && elapsed >= GREETING_REVEAL_SECONDS) {
        announced = true;
        setRevealed(true);
      }
      if (start !== null && elapsed < FILM_SECONDS) frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [moment.slug, showStatic, start]);

  function play(withSound) {
    stopAudio();
    const started = performance.now();
    setStart(started);
    setRevealed(false);
    setSound(withSound);
    setNotice('');
    if (!withSound) return;
    try {
      const active = openFilmAudio();
      if (!active) throw new Error('Web Audio unavailable');
      audio.current = active;
      active.ready.then(() => {
        if (audio.current !== active) return;
        scheduleFilmScore(active.context, active.context.destination, moment.slug, (performance.now() - started) / 1000);
      }).catch(() => {
        if (audio.current !== active) return;
        stopAudio();
        setSound(false);
        setNotice('Sound is unavailable. You can still watch the greeting.');
      });
    } catch {
      setSound(false);
      setNotice('Sound is unavailable. You can still watch the greeting.');
    }
  }

  async function download() {
    if (recording.current) return;
    const controller = new AbortController();
    recording.current = controller;
    setExporting(true);
    setNotice('');
    setVideo(null);
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = '';
    stopAudio();
    let exportAudio;
    try {
      // Open audio on the click, before awaiting the lazy exporter.
      if (sound) {
        exportAudio = openFilmAudio();
        if (!exportAudio) throw new Error('Sound is unavailable. Mute the greeting to export a silent video.');
      }
      const { exportFilm } = await import('./exportFilm');
      const { blob, format } = await exportFilm({
        greeting: { ...greeting, title: `${moment.title} Moment` },
        fontFamily: getComputedStyle(wish.current).fontFamily,
        audio: exportAudio,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      downloadUrl.current = URL.createObjectURL(blob);
      setVideo({ url: downloadUrl.current, format });
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error.message || 'Video export failed. You can still share the greeting link.');
    } finally {
      if (exportAudio && exportAudio.context.state !== 'closed') void exportAudio.context.close().catch(() => {});
      recording.current = null;
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  return <section className="moment-canvas moment-film" aria-label="Interactive greeting" data-occasion={moment.slug} data-revealed={showGreeting}>
    <h1 className="moment-occasion"><span>{moment.title} Moment</span></h1>
    {showStatic
      ? <div className="moment-film-static"><GreetingArtwork occasion={moment.slug} /></div>
      : <canvas className="moment-film-canvas" width="720" height="405" ref={canvas} aria-hidden="true" />}
    <div className="moment-film-stage" aria-live="polite">
      <div className="moment-message" hidden={!showGreeting}>
        {greeting.recipient && <p className="moment-recipient">Dear <bdi>{greeting.recipient}</bdi>,</p>}
        <p className="moment-wish" lang={greeting.language} dir="auto" ref={wish}>{greeting.text}</p>
        {greeting.sender && <p className="moment-sender">From <bdi>{greeting.sender}</bdi></p>}
      </div>
      {!showGreeting && <p className="moment-invitation-title">{moment.invitation}</p>}
    </div>
    <div className="moment-film-controls">
      <button type="button" className="moment-reveal" onClick={() => play(sound)} disabled={exporting}>
        {start !== null || showStatic ? 'Replay' : moment.action}
      </button>
      {sound
        ? <button type="button" className="moment-replay" disabled={exporting} onClick={() => { stopAudio(); setSound(false); }}>Mute</button>
        : <button type="button" className="moment-replay" disabled={exporting} onClick={() => play(true)}>Play with sound</button>}
      <button type="button" className="moment-replay" disabled={exporting} onClick={download}>Download video</button>
    </div>
    {video && <a className="moment-shared-cta" href={video.url} download={`orbitboard-${moment.slug}.${video.format}`}>Save {video.format === 'mp4' ? 'MP4' : 'WebM'} video</a>}
    {(exporting || notice) && <p role="status" className="moment-film-status">{exporting ? 'Preparing your 10-second video. Keep this page open.' : notice}</p>}
    <div className="moment-card-footer"><span>Made with OrbitBoard Moments</span></div>
  </section>;
}
