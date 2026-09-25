/**
 * Synthetic INFY-like dataset for the OrbitBoard Market Research prototype.
 *
 * This is intentionally deterministic and contains no real market data.
 * Do not present these observations as historical INFY prices.
 */

const START_PRICE = 1000;
const START_DATE = '2022-01-03';

const nextBusinessDay = (date) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString().slice(0, 10);
};

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const buildRows = ({
  count = 520,
  priceStart = START_PRICE,
  volumeBase = 1_000_000,
  oiStart = 100_000,
  eventEvery = 47,
  seedOffset = 1
} = {}) => {
  const rows = [];
  let date = START_DATE;
  let close = priceStart;
  let openInterest = oiStart;

  for (let index = 0; index < count; index += 1) {
    const drift = 0.00025;
    const cycle = Math.sin(index / 13) * 0.003;
    const noise = (pseudoRandom(index + seedOffset) - 0.5) * 0.012;
    const eventBoost = index > 0 && index % eventEvery === 0 ? 0.018 : 0;

    const dailyReturn = drift + cycle + noise + eventBoost;
    const open = close * (1 + (pseudoRandom(index + seedOffset + 100) - 0.5) * 0.006);
    const nextClose = close * (1 + dailyReturn);
    const high = Math.max(open, nextClose) * (1 + pseudoRandom(index + 200) * 0.006);
    const low = Math.min(open, nextClose) * (1 - pseudoRandom(index + 300) * 0.006);

    const volumeMultiplier = 0.75 + pseudoRandom(index + 400) * 0.8 + (eventBoost ? 1.4 : 0);
    const volume = Math.round(volumeBase * volumeMultiplier);

    const oiChange = (pseudoRandom(index + 500) - 0.47) * 0.018 + (eventBoost ? 0.035 : 0);
    openInterest = Math.max(10_000, Math.round(openInterest * (1 + oiChange)));

    rows.push({
      date,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(nextClose.toFixed(2)),
      volume,
      openInterest
    });

    close = nextClose;
    date = nextBusinessDay(date);
  }

  return rows;
};

export const INFY_SYNTHETIC_DAILY = buildRows();

export const INFY_SYNTHETIC_EVENTS = INFY_SYNTHETIC_DAILY
  .filter((row, index) => index > 0 && index % 47 === 0)
  .map((row, index) => ({
    id: `synthetic-event-${index + 1}`,
    securitySymbol: 'INFY',
    type: 'earnings',
    title: 'Synthetic quarterly event',
    description: 'Fictional event generated for the OrbitBoard prototype.',
    timestamp: `${row.date}T10:00:00.000Z`,
    source: 'OrbitBoard synthetic dataset'
  }));

export const INFY_SYNTHETIC_NEWS = INFY_SYNTHETIC_EVENTS.map((event, index) => ({
  id: `synthetic-news-${index + 1}`,
  eventId: event.id,
  publisher: 'OrbitBoard Demo',
  headline: `Synthetic INFY event #${index + 1}`,
  summary: 'Fictional market-news item used only to exercise the event/news data model.',
  publishedAt: event.timestamp,
  url: '#synthetic-data'
}));
