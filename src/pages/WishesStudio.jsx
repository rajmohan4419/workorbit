import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Share2, ArrowLeft } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { trackEvent } from '../lib/analytics';

import { OCCASIONS, THEMES, WIDTH, HEIGHT, drawWish, clean } from '../lib/wishesStudio';

export default function WishesStudio() {
  const canvasRef = useRef(null);
  const [occasionId, setOccasionId] = useState('diwali');
  const [themeId, setThemeId] = useState('royal');
  const [recipient, setRecipient] = useState('Friends & Family');
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState(OCCASIONS[0].message);
  const [attribution, setAttribution] = useState(true);
  const [error, setError] = useState('');
  const occasion = OCCASIONS.find(item => item.id === occasionId) || OCCASIONS[0];
  const theme = THEMES.find(item => item.id === themeId) || THEMES[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) drawWish(ctx, { occasion, theme, recipient, sender, message, attribution });
  }, [occasion, theme, recipient, sender, message, attribution]);

  const selectOccasion = id => {
    const next = OCCASIONS.find(item => item.id === id);
    if (!next) return;
    setOccasionId(id);
    setMessage(next.message);
  };

  const imageBlob = type => new Promise((resolve, reject) => {
    const canvas = canvasRef.current;
    if (!canvas) { reject(new Error('Preview unavailable')); return; }
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), type, 0.92);
  });

  const download = async type => {
    setError('');
    try {
      const blob = await imageBlob(type);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'orbitboard-' + occasionId + '-wish.' + (type === 'image/png' ? 'png' : 'jpg');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackEvent('wishes_studio_download', { occasion: occasionId, format: type });
    } catch { setError('Unable to export image. Please try again.'); }
  };

  const whatsappText = [occasion.heading, clean(message, 200), 'From ' + (clean(sender, 40) || 'Your Friend'), 'Create yours: https://orbitboard.in/tools/wishes-studio'].join('\n');
  const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(whatsappText);

  const shareImage = async () => {
    setError('');
    try {
      // Build the file synchronously during the click so the browser retains user activation.
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Preview unavailable');
      const dataUrl = canvas.toDataURL('image/png');
      const binary = atob(dataUrl.split(',')[1]);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const file = new File([bytes], 'orbitboard-wish.png', { type: 'image/png' });
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        setError('Image sharing is not supported in this browser. Download the card and attach it in WhatsApp, or use Share via WhatsApp for a text greeting.');
        return;
      }
      await navigator.share({ files: [file], title: occasion.heading });
      trackEvent('wishes_studio_share', { method: 'native_image', occasion: occasionId });
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Image sharing failed. Download the card and attach it in WhatsApp.');
    }
  };

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-900 dark:text-stone-100">
      <ToolsHomeHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300"><ArrowLeft size={16} /> All tools</Link>
        <h1 className="mt-4 text-3xl font-bold">Free Festive Wishes & Greeting Card Maker</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">Personalize a greeting, preview it instantly and download a shareable image. Everything is created in your browser.</p>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section aria-label="Customize your greeting" className="space-y-4 rounded-2xl border border-[var(--orbit-border)] bg-white p-5 dark:bg-stone-900">
            <label className="block text-sm font-semibold">Occasion
              <select value={occasionId} onChange={event => selectOccasion(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900">
                {OCCASIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Card design
              <select value={themeId} onChange={event => setThemeId(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900">
                {THEMES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Recipient
              <input maxLength={35} value={recipient} onChange={event => setRecipient(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900" />
            </label>
            <label className="block text-sm font-semibold">Your name
              <input maxLength={40} placeholder="Your name" value={sender} onChange={event => setSender(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900" />
            </label>
            <label className="block text-sm font-semibold">Greeting message
              <textarea rows={4} maxLength={200} value={message} onChange={event => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900" />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attribution} onChange={event => setAttribution(event.target.checked)} /> Include small OrbitBoard credit</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => download('image/png')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white"><Download size={17} /> PNG</button>
              <button type="button" onClick={() => download('image/jpeg')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400 px-4 py-2 font-semibold">Download JPG</button>
              <button type="button" onClick={shareImage} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400 px-4 py-2 font-semibold"><Share2 size={17} /> Share image</button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('wishes_studio_share', { method: 'whatsapp_text', occasion: occasionId })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500 px-4 py-2 font-semibold text-emerald-700 dark:text-emerald-300">Share via WhatsApp</a>
            </div>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <p className="text-xs text-stone-500 dark:text-stone-400">Share image sends the PNG on supported devices. Share via WhatsApp sends the greeting text; to share the card itself on desktop, download it and attach the image in WhatsApp.</p>
          </section>
          <section aria-label="Live greeting card preview" className="rounded-2xl border border-[var(--orbit-border)] bg-white p-4 dark:bg-stone-900">
            <h2 className="mb-3 text-sm font-semibold">Live preview · Square card (1080 × 1080)</h2>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={occasion.heading + ' greeting card preview'} className="aspect-square w-full rounded-xl" />
          </section>
        </div>
        <section className="mt-8 max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-300">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Create and share festival wishes online</h2>
          <p>Choose Diwali, Ugadi, birthdays, New Year or Christmas. Edit your message and names, pick a design and save your greeting as a PNG or JPG. No account or upload is needed.</p>
        </section>
      </main>
      <ToolsHomeFooter />
    </div>
  );
}
