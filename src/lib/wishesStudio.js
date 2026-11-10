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
export const WIDTH = 1080;
export const HEIGHT = 1080;
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

