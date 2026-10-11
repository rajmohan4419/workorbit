import { describe, it, expect, vi } from 'vitest';
import yahooFinance from 'yahoo-finance2';
import { handleSearch } from './search.js';
import { fetchStockData } from './stock.js';

vi.mock('yahoo-finance2', () => ({
  default: {
    search: vi.fn(),
    quote: vi.fn(),
    chart: vi.fn(),
    quoteSummary: vi.fn(),
  },
}));

describe('api/market/search.js and stock.js mapping', () => {
  it('handleSearch prioritizing Indian listings when dot not present', async () => {
    yahooFinance.search.mockResolvedValueOnce({
      quotes: [
        { symbol: 'INFY.NS', longname: 'Infosys Limited', exchange: 'NSE' },
        { symbol: 'INFY', shortname: 'Infosys Ltd ADR', exchDisp: 'NYSE' },
      ],
    });

    const results = await handleSearch('INFY');
    expect(results).toHaveLength(2);
    expect(results[0].symbol).toBe('INFY.NS');
    expect(results[1].symbol).toBe('INFY');
  });

  it('fetchStockData safely maps yahooFinance responses', async () => {
    yahooFinance.quote.mockResolvedValueOnce({
      symbol: 'INFY.NS',
      regularMarketPrice: 1500.0,
      regularMarketPreviousClose: 1480.0,
      currency: 'INR',
      longName: 'Infosys Limited',
      marketState: 'REGULAR',
      regularMarketDayLow: 1475.0,
      regularMarketDayHigh: 1510.0,
      fiftyTwoWeekLow: 1200.0,
      fiftyTwoWeekHigh: 1700.0,
      regularMarketVolume: 5000000,
      marketCap: 6000000000000,
    });

    yahooFinance.chart.mockResolvedValue({
      quotes: [
        { date: new Date('2024-01-01'), open: 1480, high: 1500, low: 1475, close: 1490, volume: 2000000 },
        { date: new Date('2024-01-02'), open: 1490, high: 1510, low: 1485, close: 1500, volume: 2500000 },
      ],
      events: {
        dividends: {
          '1705276800': { date: new Date('2024-01-15'), amount: 18.0 },
        },
        splits: {},
      },
    });

    yahooFinance.search.mockResolvedValueOnce({
      news: [
        {
          title: 'Infosys Q3 Results',
          publisher: 'Reuters',
          link: 'https://reuters.com/article/1',
          providerPublishTime: 1704067200,
        },
      ],
    });

    yahooFinance.quoteSummary.mockResolvedValueOnce({
      calendarEvents: {
        earnings: {
          earningsDate: [new Date('2024-04-15')],
        },
      },
    });

    const data = await fetchStockData('INFY.NS', '1y');

    expect(data.quote.symbol).toBe('INFY.NS');
    expect(data.quote.price).toBe(1500.0);
    expect(data.quote.change).toBe(20.0);
    expect(data.history).toHaveLength(2);
    expect(data.news).toHaveLength(1);
    expect(data.news[0].title).toBe('Infosys Q3 Results');
    expect(data.events.earnings).toHaveLength(1);
    expect(data.events.dividends).toHaveLength(1);
  });
});
