import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const LANGUAGES = [{ code: 'en', label: 'English' }, { code: 'kn', label: 'ಕನ್ನಡ' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' }, { code: 'ml', label: 'മലയാളം' }, { code: 'mr', label: 'मराठी' }, { code: 'bn', label: 'বাংলা' }, { code: 'gu', label: 'ગુજરાતી' }, { code: 'pa', label: 'ਪੰਜਾਬੀ' }];

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
  const moment = useMemo(() => MOMENTS.find(item => item.slug === slug), [slug]);
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [translated, setTranslated] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const translate = async () => {
    if (!moment || language === 'en') return;
    setTranslating(true);
    setTranslationError('');
    try {
      const source = [moment.reveal, message.trim()].filter(Boolean).join('\n');
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: source, target: language }) });
      if (!response.ok) throw new Error('Translation unavailable');
      const data = await response.json();
      setTranslated({ language, source, value: data.translatedText });
    } catch { setTranslationError('Translation is unavailable. Your English greeting is still ready.'); }
    finally { setTranslating(false); }
  };
  if (!moment) return <main className="p-10"><h1>Moment not found</h1><Link to="/moments">Explore Moments</Link></main>;
  const sourceText = [moment.reveal, message.trim()].filter(Boolean).join('\n');
  const translatedText = translated?.language === language && translated?.source === sourceText ? translated.value : null;
  const greeting = [translatedText || sourceText, sender.trim() ? `From ${sender.trim()}` : ''].filter(Boolean).join('\n');
  const share = async () => {
    const text = [recipient.trim() ? `For ${recipient.trim()}` : '', greeting, 'Made with OrbitBoard Moments'].filter(Boolean).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: `${moment.title} greeting`, text, url: window.location.href }); } catch { /* User cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); window.alert('Greeting copied to clipboard'); }
      catch { window.alert('Sharing is not supported in this browser.'); }
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
        <label className="text-sm sm:col-span-2">Personal message<textarea maxLength={240} rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Add your wishes (optional)" className="mt-1 w-full rounded-xl border bg-transparent p-3"/></label>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">Greeting language
          <select value={language} onChange={e => { setLanguage(e.target.value); setTranslated(null); setTranslationError(''); }} className="mt-1 block rounded-xl border bg-transparent p-3">
            {LANGUAGES.map(item => <option key={item.code} value={item.code} className="text-slate-900">{item.label}</option>)}
          </select>
        </label>
        {language !== 'en' && <button type="button" disabled={translating} onClick={translate} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{translating ? 'Translating…' : 'Translate wishes'}</button>}
        {translatedText && <span className="text-xs text-green-700 dark:text-green-300">Translation ready — review before sharing</span>}
      </div>
      {translationError && <p role="status" className="mt-2 text-sm text-amber-700">{translationError}</p>}
      <section aria-label="Interactive greeting" className="relative mt-7 flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-center text-white" style={{ background: `radial-gradient(circle at 50% 70%, ${moment.accent}55, #17142d 75%)` }}>
        <div className={`text-7xl transition-all duration-700 motion-reduce:transition-none ${revealed ? 'scale-125 drop-shadow-2xl' : 'opacity-60'}`} aria-hidden="true">{moment.emoji}</div>
        {revealed ? <div aria-live="polite" className="mt-8 max-w-lg whitespace-pre-line">
          <h2 className="text-2xl font-bold">{recipient.trim() ? `Dear ${recipient.trim()},` : moment.title}</h2>
          <p className="mt-4 text-lg">{greeting}</p>
          <div className="mt-8 text-xs tracking-widest opacity-60">Made with OrbitBoard</div>
        </div> : <div className="mt-8"><p>{moment.prompt}</p><button onClick={() => setRevealed(true)} className="mt-5 rounded-full bg-white px-7 py-3 font-semibold text-slate-900">{moment.action} ✨</button></div>}
      </section>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => setRevealed(false)} className="rounded-full border px-6 py-3">Replay</button>
        <button disabled={!revealed} onClick={share} className="rounded-full bg-violet-700 px-6 py-3 text-white disabled:opacity-40">Share greeting</button>
      </div>
      <p className="mt-5 text-xs opacity-60">Preview only. Translated wishes are included in share text, but the shared link still opens the default template; saved personalized links and ₹9/₹29 paid branding are not yet enabled.</p>
    </div>
  </main>;
}
