import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Share2, ArrowLeft } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { trackEvent } from '../lib/analytics';

export const OCCASIONS = [
  { id: 'diwali', label: 'Diwali', heading: 'Happy Diwali', message: 'May the festival of lights fill your life with joy, peace and prosperity.', symbol: '✦' },
  { id: 'ugadi', label: 'Ugadi', heading: 'Happy Ugadi', message: 'Wishing you new beginnings, good health and abundant happiness.', symbol: '❀' },
  { id: 'birthday', label: 'Birthday', heading: 'Happy Birthday', message: 'May your special day bring wonderful memories and countless smiles.', symbol: '★' },
  { id: 'new-year', label: 'New Year', heading: 'Happy New Year', message: 'Here’s to fresh opportunities, meaningful moments and a beautiful year ahead.', symbol: '✧' },
  { id: 'christmas', label: 'Christmas', heading: 'Merry Christmas', message: 'May this season bring warmth, love and joy to you and your family.', symbol: '✳' },
];
export const THEMES = [
  { id: 'royal', label: 'Royal Violet', bg: '#271446', accent: '#F6D88C', foreground: '#FFFFFF' },
  { id: 'sunrise', label: 'Festive Sunrise', bg: '#9C321D', accent: '#FFE5A1', foreground: '#FFFFFF' },
  { id: 'midnight', label: 'Midnight Gold', bg: '#15263D', accent: '#EBCB82', foreground: '#FFFFFF' },
  { id: 'minimal', label: 'Minimal Ivory', bg: '#F8F3E8', accent: '#6942A0', foreground: '#252033' },
];
const WIDTH = 1080;
const HEIGHT = 1080;
const clean = (value, max = 160) => value.trim().slice(0, max);

function wrapLines(ctx, value, maxWidth, maxLines) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawWish(ctx, { occasion, theme, recipient, sender, message, attribution }) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, WIDTH - 104, HEIGHT - 104);
  ctx.strokeRect(70, 70, WIDTH - 140, HEIGHT - 140);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.accent;
  ctx.font = '90px Georgia, serif';
  ctx.fillText(occasion.symbol, 540, 275);
  ctx.font = 'bold 68px Georgia, serif';
  ctx.fillText(occasion.heading, 540, 390);
  ctx.fillStyle = theme.foreground;
  ctx.font = '34px Arial, sans-serif';
  ctx.fillText('Dear ' + (clean(recipient, 35) || 'Friends & Family') + ',', 540, 485);
  ctx.font = '36px Arial, sans-serif';
  const lines = wrapLines(ctx, clean(message, 200), 800, 5);
  lines.forEach((line, index) => ctx.fillText(line, 540, 580 + index * 55));
  ctx.fillStyle = theme.accent;
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText('With warm wishes,', 540, 830);
  ctx.font = 'bold 38px Georgia, serif';
  ctx.fillText(clean(sender, 40) || 'Your Friend', 540, 885);
  if (attribution) {
    ctx.globalAlpha = 0.75;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText('Created with OrbitBoard', 540, 995);
    ctx.globalAlpha = 1;
  }
}

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

  const share = async () => {
    setError('');
    try {
      const blob = await imageBlob('image/png');
      const file = new File([blob], 'orbitboard-wish.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: occasion.heading });
        trackEvent('wishes_studio_share', { method: 'native', occasion: occasionId });
      } else {
        // WhatsApp Web share URLs support text, not direct binary image uploads.
        const text = [occasion.heading, clean(message, 200), 'From ' + (clean(sender, 40) || 'Your Friend'), 'Create yours: https://orbitboard.in/tools/wishes-studio'].join('\n');
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
        trackEvent('wishes_studio_share', { method: 'whatsapp_text', occasion: occasionId });
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Sharing is unavailable. Download the image and attach it in WhatsApp.');
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
              <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400 px-4 py-2 font-semibold"><Share2 size={17} /> Share / WhatsApp</button>
            </div>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <p className="text-xs text-stone-500 dark:text-stone-400">On supported devices, Share sends the actual image. Otherwise WhatsApp opens with a text greeting; download and attach the card manually.</p>
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
