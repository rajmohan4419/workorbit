import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MOMENT_LANGUAGES, MOMENT_SHARE_ID, SHARED_MOMENT_PATH } from '../lib/moments.js';

const MOMENTS = [
  { slug: 'diwali', title: 'Diwali', emoji: '🪔', prompt: 'Tap to light the diya', reveal: 'May your Diwali shine with joy and new beginnings!', action: 'Light the diya', accent: '#e9a23b' },
  { slug: 'birthday', title: 'Birthday', emoji: '🎂', prompt: 'Make a birthday wish', reveal: 'Happy Birthday! Here’s to a wonderful year ahead!', action: 'Make a wish', accent: '#b888ed' },
  { slug: 'anniversary', title: 'Anniversary', emoji: '💍', prompt: 'Celebrate your story', reveal: 'Happy Anniversary! May your journey together keep blooming.', action: 'Celebrate', accent: '#ed9cb6' },
  { slug: 'announcement', title: 'Announcement', emoji: '📣', prompt: 'Ready for the big reveal?', reveal: 'Something wonderful is happening!', action: 'Reveal', accent: '#8ccde2' },
  { slug: 'celebrations', title: 'Celebrations', emoji: '🎉', prompt: 'Let the celebration begin', reveal: 'Congratulations! Here’s to this special milestone!', action: 'Celebrate', accent: '#e6c96f' },
];

export function MomentsHome() {
  return <main className="min-h-screen px-5 py-12" style={{ color: 'var(--orbit-text, inherit)' }}>
    <div className="mx-auto max-w-5xl">
      <Link to="/" className="text-sm underline">← OrbitBoard</Link>
      <p className="mt-10 text-sm uppercase tracking-widest opacity-60">Create • Personalize • Share</p>
      <h1 className="mt-2 text-4xl font-bold">OrbitBoard Moments</h1>
      <p className="mt-3 max-w-2xl opacity-70">Little interactions. Big feelings. Create a memorable greeting and share it with someone special.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MOMENTS.map(moment => <Link key={moment.slug} to={`/moments/${moment.slug}`} className="rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl" style={{ background: 'var(--orbit-surface, rgba(128,128,128,.08))', borderColor: 'var(--orbit-border, rgba(128,128,128,.2))' }}>
          <span className="text-5xl" aria-hidden="true">{moment.emoji}</span>
          <h2 className="mt-5 text-xl font-semibold">{moment.title}</h2>
          <p className="mt-2 text-sm opacity-70">{moment.prompt}</p>
          <p className="mt-5 text-sm font-medium">Create a moment →</p>
        </Link>)}
      </div>
      <p className="mt-10 text-xs opacity-60">Early preview: free greetings include OrbitBoard branding. Premium options are coming later.</p>
    </div>
  </main>;
}

export function MomentExperience() {
  const { slug } = useParams();
  const moment = MOMENTS.find(item => item.slug === slug);
  if (!moment) return <main className="p-10"><h1>Moment not found</h1><Link to="/moments">Explore Moments</Link></main>;
  return <MomentEditor key={slug} moment={moment} />;
}

function MomentEditor({ moment }) {
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [headline, setHeadline] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [translated, setTranslated] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [savedShare, setSavedShare] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const sourceText = [(headline ?? moment.reveal).trim(), message.trim()].filter(Boolean).join('\n');
  const translatedText = translated?.language === language && translated?.source === sourceText ? translated.value : null;
  const snapshot = {
    slug: moment.slug,
    sender: sender.trim(),
    recipient: recipient.trim(),
    text: translatedText ?? sourceText,
    language: translatedText ? language : 'en',
  };
  const draft = JSON.stringify(snapshot);
  const shareUrl = savedShare?.draft === draft ? savedShare.url : '';

  const translate = async () => {
    if (language === 'en') return;
    setTranslating(true);
    setTranslationError('');
    try {
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sourceText, target: language }) });
      if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Translation request failed (${response.status})`); }
      const data = await response.json();
      setTranslated({ language, source: sourceText, value: data.translatedText });
    } catch (error) { setTranslationError(`${error.message || 'Translation unavailable'}. Your English greeting is still ready.`); }
    finally { setTranslating(false); }
  };
  const saveShare = async () => {
    setSaving(true);
    setShareStatus('');
    try {
      const response = await requestShare({ action: 'create', ...snapshot });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (typeof data.id !== 'string' || !MOMENT_SHARE_ID.test(data.id)) throw new Error();
      setSavedShare({ draft, url: new URL(`${SHARED_MOMENT_PATH}#${data.id}`, window.location.origin).href });
    } catch (error) {
      setShareStatus(error.message || 'Could not create a share link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    setShareStatus('');
    if (navigator.share) {
      try {
        await navigator.share({ title: `${moment.title} greeting`, url: shareUrl });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('Link copied to clipboard.');
    } catch {
      setShareStatus('Select the link above to copy it.');
    }
  };

  return <main className="min-h-screen px-5 py-10">
    <div className="mx-auto max-w-3xl">
      <Link to="/moments" className="text-sm underline">← All Moments</Link>
      <h1 className="mt-7 text-3xl font-bold">{moment.title} Moment</h1>
      <p className="mt-2 text-sm opacity-70">Personalize the message, then interact with the scene.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Your name<input maxLength={60} value={sender} onChange={e => setSender(e.target.value)} placeholder="Sender name" className="mt-1 w-full rounded-xl border bg-transparent p-3"/></label>
        <label className="text-sm">Recipient<input maxLength={60} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient name" className="mt-1 w-full rounded-xl border bg-transparent p-3"/></label>
        <label className="text-sm sm:col-span-2">Greeting headline
          <textarea maxLength={200} rows={2} value={headline ?? moment.reveal} onChange={e => setHeadline(e.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3" />
          <button type="button" onClick={() => setHeadline(null)} className="mt-1 text-xs underline">Restore default message</button>
        </label>
        <label className="text-sm sm:col-span-2">Personal message<textarea maxLength={240} rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Add your wishes (optional)" className="mt-1 w-full rounded-xl border bg-transparent p-3"/></label>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">Greeting language
          <select value={language} onChange={e => { setLanguage(e.target.value); setTranslated(null); setTranslationError(''); }} className="mt-1 block rounded-xl border bg-transparent p-3">
            {MOMENT_LANGUAGES.map(item => <option key={item.code} value={item.code} className="text-slate-900">{item.label}</option>)}
          </select>
        </label>
        {language !== 'en' && <button type="button" disabled={translating} onClick={translate} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{translating ? 'Translating…' : 'Translate wishes'}</button>}
        {translatedText && <span className="text-xs text-green-700 dark:text-green-300">Translation ready — review before sharing</span>}
      </div>
      {translationError && <p role="status" className="mt-2 text-sm text-amber-700">{translationError}</p>}
      <GreetingScene moment={moment} {...snapshot} revealed={revealed} onReveal={() => setRevealed(true)} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => setRevealed(false)} className="rounded-full border px-6 py-3">Replay</button>
        {shareUrl ? <button type="button" onClick={share} className="rounded-full bg-violet-700 px-6 py-3 text-white">{navigator.share ? 'Share greeting' : 'Copy link'}</button>
          : <button type="button" disabled={!revealed || saving || translating} onClick={saveShare} className="rounded-full bg-violet-700 px-6 py-3 text-white disabled:opacity-40">{saving ? 'Creating link…' : 'Create share link'}</button>}
      </div>
      {shareUrl && <label className="mt-4 block text-sm">Share link
        <input readOnly value={shareUrl} onFocus={e => e.target.select()} className="mt-1 w-full rounded-xl border bg-transparent p-3" />
      </label>}
      {shareStatus && <p role="status" className="mt-2 text-sm">{shareStatus}</p>}
      <p className="mt-5 text-xs opacity-60">Creating a link saves this greeting and its names. Anyone with the link can open it. Changes need a new link.</p>
    </div>
  </main>;
}

function requestShare(body, signal) {
  return fetch('/api/moment-shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

export function SharedMoment() {
  const { hash } = useLocation();
  return <SharedGreeting key={hash} id={hash.slice(1)} />;
}

function SharedGreeting({ id }) {
  const validId = MOMENT_SHARE_ID.test(id);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await requestShare({ action: 'read', id }, controller.signal);
        if (!controller.signal.aborted) {
          if (response.status === 404) {
            setResult({ missing: true });
          } else if (!response.ok) {
            setResult({ unavailable: true });
          } else {
            const greeting = await response.json();
            if (!controller.signal.aborted) setResult({ greeting });
          }
        }
      } catch {
        if (!controller.signal.aborted) setResult({ unavailable: true });
      }
    }
    load();
    return () => controller.abort();
  }, [id, validId, attempt]);

  const moment = MOMENTS.find(item => item.slug === result?.greeting?.slug);
  return <main className="min-h-screen px-5 py-10">
    <div className="mx-auto max-w-3xl">
      <a href="/moments" className="text-sm underline">Create your own Moment</a>
      {!validId || result?.missing || (result?.greeting && !moment) ? <h1 className="mt-7 text-3xl font-bold">Greeting not found</h1>
        : result?.unavailable ? <div className="mt-7">
          <h1 className="text-3xl font-bold">Greeting temporarily unavailable</h1>
          <button type="button" className="mt-3 underline" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</button>
        </div>
          : moment ? <>
            <h1 className="mt-7 text-3xl font-bold">{moment.title} Moment</h1>
            <GreetingScene moment={moment} {...result.greeting} revealed={revealed} onReveal={() => setRevealed(true)} />
            {revealed && <button type="button" onClick={() => setRevealed(false)} className="mt-5 rounded-full border px-6 py-3">Replay</button>}
          </> : <p role="status" className="mt-7">Loading greeting…</p>}
    </div>
  </main>;
}

function GreetingScene({ moment, sender, recipient, text, language, revealed, onReveal }) {
  return <section aria-label="Interactive greeting" className="relative mt-7 flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-center text-white" style={{ background: `radial-gradient(circle at 50% 70%, ${moment.accent}55, #17142d 75%)` }}>
    <div className={`text-7xl transition-all duration-700 motion-reduce:transition-none ${revealed ? 'scale-125 drop-shadow-2xl' : 'opacity-60'}`} aria-hidden="true">{moment.emoji}</div>
    {revealed ? <div aria-live="polite" className="mt-8 max-w-lg whitespace-pre-line">
      <h2 className="text-2xl font-bold">{recipient ? `Dear ${recipient},` : moment.title}</h2>
      <p className="mt-4 text-lg" lang={language}>{text}</p>
      {sender && <p className="mt-2">From {sender}</p>}
      <div className="mt-8 text-xs tracking-widest opacity-60">Made with OrbitBoard</div>
    </div> : <div className="mt-8"><p>{moment.prompt}</p><button onClick={onReveal} className="mt-5 rounded-full bg-white px-7 py-3 font-semibold text-slate-900">{moment.action} ✨</button></div>}
  </section>;
}
