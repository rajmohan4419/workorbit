export const FILM_SECONDS = 10;
export const VISUAL_REVEAL_SECONDS = 2;
export const GREETING_REVEAL_SECONDS = 5;
const HEIGHT = 405;

const palettes = {
  diwali: ['#120b21', '#6e3025', '#ffd798'],
  'chhath-puja': ['#171d39', '#b3584b', '#ffdb8e'],
  christmas: ['#0b2227', '#1a5140', '#ffdb94'],
  birthday: ['#26152f', '#68366b', '#ffb9d5'],
  anniversary: ['#2b142a', '#763850', '#ffbcc4'],
  announcement: ['#0b2636', '#225d67', '#adf3ed'],
  celebrations: ['#211629', '#69502b', '#ffe1a0'],
};

const progress = (time, start, span) => Math.max(0, Math.min(1, (time - start) / span));
const ease = value => value * value * (3 - 2 * value);

function ellipse(ctx, x, y, radiusX, radiusY, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function glow(ctx, x, y, radius, color, opacity) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color);
  light.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawDiya(ctx, light, time, accent) {
  glow(ctx, 360, 222, 180, '#f08c41', light * .72);
  ellipse(ctx, 360, 329, 143, 11, '#10091e');
  const brass = ctx.createLinearGradient(230, 0, 490, 0);
  brass.addColorStop(0, '#7d3f31');
  brass.addColorStop(.52, accent);
  brass.addColorStop(1, '#8a462d');
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(232, 266);
  ctx.bezierCurveTo(254, 339, 466, 339, 488, 266);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, 360, 265, 128, 15, brass);
  ellipse(ctx, 360, 265, 120, 11, '#412035');
  ellipse(ctx, 360, 268, 97, 5, '#a35a40');
  ctx.strokeStyle = '#f5cda3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(352, 268);
  ctx.quadraticCurveTo(360, 264, 364, 252);
  ctx.stroke();
  if (light === 0) return;
  ctx.save();
  ctx.globalAlpha = light;
  ctx.translate(362, 257);
  ctx.scale(1 + Math.sin(time * 14) * .07, 1 + Math.sin(time * 11) * .06);
  ctx.fillStyle = '#ffad54';
  ctx.beginPath();
  ctx.moveTo(3, -104);
  ctx.bezierCurveTo(9, -64, 35, -48, 30, -22);
  ctx.bezierCurveTo(24, 8, -30, 9, -31, -23);
  ctx.bezierCurveTo(-31, -51, -5, -70, 3, -104);
  ctx.fill();
  ctx.fillStyle = '#fff4bd';
  ctx.beginPath();
  ctx.moveTo(2, -55);
  ctx.bezierCurveTo(1, -31, 19, -20, 15, -9);
  ctx.bezierCurveTo(7, 9, -16, 1, -15, -13);
  ctx.quadraticCurveTo(-14, -32, 2, -55);
  ctx.fill();
  ctx.restore();
}

function drawSunrise(ctx, light, time) {
  const horizon = 251;
  const sunY = horizon + 32 - light * 97;
  glow(ctx, 360, sunY, 230, '#ff9a5d', light * .72);
  ellipse(ctx, 360, sunY, 41, 41, '#ffda8f');
  ctx.fillStyle = '#28223b';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.quadraticCurveTo(82, 205, 199, horizon + 1);
  ctx.quadraticCurveTo(266, 266, 307, horizon + 8);
  ctx.quadraticCurveTo(544, 258, 590, 229);
  ctx.quadraticCurveTo(643, 211, 720, horizon);
  ctx.lineTo(720, 270);
  ctx.lineTo(0, 270);
  ctx.fill();
  const water = ctx.createLinearGradient(0, horizon + 8, 0, HEIGHT);
  water.addColorStop(0, '#58405a');
  water.addColorStop(1, '#15182c');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon + 8, 720, HEIGHT - horizon);
  for (let i = 0; i < 19; i++) {
    const y = 270 + i * 7;
    const pulse = Math.sin(time * 2 + i * 1.7);
    const width = (10 + i * 5) * (.68 + .28 * pulse);
    ctx.globalAlpha = light * (.16 + .30 * (1 - i / 19));
    ellipse(ctx, 360 + pulse * (4 + i / 2), y, width, 1 + i / 23, '#ffcc83');
  }
  ctx.globalAlpha = 1;
}

const emblems = {
  birthday: ['M-75 25h150v66h-150z M-45 17v-37m45 37v-48m45 48v-37', false],
  anniversary: ['M0 76C-165-7-53-92 0-27C53-92 165-7 0 76Z', false],
  announcement: ['M-80-5h38l88-44v101l-88-38h-38z M56-28l29-16 M57 0h39 M56 28l29 16', false],
  celebrations: ['M-75 84L-35-52 49 31Z M2-44l18-42 M42-27l53-21 M60 4l42 5', false],
  christmas: ['M0-92l17 65 65 17-65 17L0 72-17 7l-65-17 65-17Z', true],
};

const emblemPaths = new Map();

function drawEmblem(ctx, slug, light, accent) {
  glow(ctx, 360, 210, 170, accent, light * .4);
  const [shape, filled] = emblems[slug] ?? emblems.celebrations;
  ctx.save();
  ctx.translate(360, 210);
  ctx.globalAlpha = .22 + light * .78;
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (!emblemPaths.has(shape)) emblemPaths.set(shape, new Path2D(shape));
  const path = emblemPaths.get(shape);
  if (filled) ctx.fill(path);
  else ctx.stroke(path);
  ctx.restore();
}

export function drawFilmScene(ctx, width, height, slug, time) {
  const [night, dawn, accent] = palettes[slug] ?? palettes.celebrations;
  const light = ease(progress(time, VISUAL_REVEAL_SECONDS, 2.5));
  ctx.save();
  ctx.scale(width / 720, height / HEIGHT);
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, 720, HEIGHT);
  glow(ctx, 360, 174, 440, dawn, .24 + light * .76);
  for (let i = 0; i < 22; i++) {
    const x = 36 + (i * 113) % 645;
    const y = 31 + (i * 73) % 206;
    ctx.globalAlpha = .16 + light * (.20 + .14 * Math.sin(time * 2 + i));
    ellipse(ctx, x, y, 1 + (i % 3) * .4, 1 + (i % 3) * .4, accent);
  }
  ctx.globalAlpha = 1;
  if (slug === 'diwali') drawDiya(ctx, light, time, accent);
  else if (slug === 'chhath-puja') drawSunrise(ctx, light, time);
  else drawEmblem(ctx, slug, light, accent);
  ctx.restore();
}

export function greetingOpacity(time) {
  return ease(progress(time, GREETING_REVEAL_SECONDS, 1));
}
