import { describe, it, expect } from 'vitest';
import {
  validateSymbol,
  validateQuery,
  RateLimiter,
  containsRecommendation,
  filterAnalysisData,
} from './common.js';

describe('api/_lib/common.js', () => {
  it('validateSymbol', () => {
    expect(validateSymbol('INFY.NS')).toBe(true);
    expect(validateSymbol('AAPL')).toBe(true);
    expect(validateSymbol('RELIANCE.BO')).toBe(true);
    expect(validateSymbol('^NSEI')).toBe(true);
    expect(validateSymbol('')).toBe(false);
    expect(validateSymbol(null)).toBe(false);
    expect(validateSymbol('INVALID SYMBOL SPACES')).toBe(false);
  });

  it('validateQuery', () => {
    expect(validateQuery('INFY')).toBe('INFY');
    expect(validateQuery('  Infosys  ')).toBe('Infosys');
    expect(validateQuery(null)).toBeNull();
    expect(validateQuery('')).toBeNull();
    expect(validateQuery('a'.repeat(61))).toBeNull();
  });

  it('RateLimiter', () => {
    const limiter = new RateLimiter();
    const ip = '192.168.1.1';
    const endpoint = 'search';

    expect(limiter.isRateLimited(ip, endpoint, 3, 60)).toBe(false);
    expect(limiter.isRateLimited(ip, endpoint, 3, 60)).toBe(false);
    expect(limiter.isRateLimited(ip, endpoint, 3, 60)).toBe(false);
    // 4th request within window should be rate limited
    expect(limiter.isRateLimited(ip, endpoint, 3, 60)).toBe(true);
  });

  it('containsRecommendation', () => {
    expect(containsRecommendation('You should buy INFY, target Rs 2000')).toBe(true);
    expect(containsRecommendation('Strong buy recommendation')).toBe(true);
    expect(containsRecommendation('Set target price at $200')).toBe(true);
    expect(containsRecommendation('We recommend to hold')).toBe(true);
    expect(containsRecommendation('This is investment advice')).toBe(true);

    expect(containsRecommendation('Infosys announced quarterly revenue growth of 4.5%.')).toBe(false);
    expect(containsRecommendation('1-year price drawdown was -12.3%.')).toBe(false);
  });

  it('filterAnalysisData', () => {
    const validData = {
      summary: 'Infosys reported Q3 earnings.',
      timeline: [{ date: '2024-01-10', event: 'Earnings release', source_url: 'https://example.com' }],
      news_takeaways: [{ point: 'YoY revenue growth', source_url: 'https://example.com' }],
      things_to_watch: ['Next earnings call'],
      data_gaps: ['No ESG report'],
    };

    const validRes = filterAnalysisData(validData);
    expect(validRes.valid).toBe(true);
    expect(validRes.rejections).toHaveLength(0);

    const prohibitedData = {
      summary: 'You should buy INFY, target Rs 2000.',
    };

    const invalidRes = filterAnalysisData(prohibitedData);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.rejections.length).toBeGreaterThan(0);
  });
});
