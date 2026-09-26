export const INDEX_TYPES = Object.freeze({
  BROAD_MARKET: 'BROAD_MARKET',
  SECTORAL: 'SECTORAL'
});

const INDEX_DEFINITIONS = [
  { symbol: 'NIFTY50', name: 'Nifty 50', exchange: 'NSE', type: INDEX_TYPES.BROAD_MARKET, aliases: ['NIFTY 50', 'NIFTY50', 'NIFTY'], url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY--50' },
  { symbol: 'NIFTYNEXT50', name: 'Nifty Next 50', exchange: 'NSE', type: INDEX_TYPES.BROAD_MARKET, aliases: ['NIFTY NEXT 50', 'NIFTY NEXT50', 'NIFTYNEXT50'], url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-Next-50' },
  { symbol: 'NIFTY100', name: 'Nifty 100', exchange: 'NSE', type: INDEX_TYPES.BROAD_MARKET, aliases: ['NIFTY 100', 'NIFTY100'], url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-100' },
  { symbol: 'NIFTY200', name: 'Nifty 200', exchange: 'NSE', type: INDEX_TYPES.BROAD_MARKET, aliases: ['NIFTY 200', 'NIFTY200'], url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-200' },
  { symbol: 'NIFTY500', name: 'Nifty 500', exchange: 'NSE', type: INDEX_TYPES.BROAD_MARKET, aliases: ['NIFTY 500', 'NIFTY500'], url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-500' },
  { symbol: 'NIFTYBANK', name: 'Nifty Bank', exchange: 'NSE', type: INDEX_TYPES.SECTORAL, aliases: ['NIFTY BANK', 'NIFTYBANK', 'BANK NIFTY'], url: 'https://www.niftyindices.com/indices/equity/sectoral-indices/nifty-bank' },
  { symbol: 'NIFTYIT', name: 'Nifty IT', exchange: 'NSE', type: INDEX_TYPES.SECTORAL, aliases: ['NIFTY IT', 'NIFTYIT'], url: 'https://www.niftyindices.com/indices/equity/sectoral-indices/nifty-it' }
];

export const MARKET_INDEXES = Object.freeze(INDEX_DEFINITIONS.map(index => Object.freeze({ ...index })));

export function resolveIndex(query) {
  const normalized = String(query ?? '').trim().toUpperCase();
  return MARKET_INDEXES.find(index => index.aliases.some(alias => alias.toUpperCase() === normalized)) ?? null;
}
