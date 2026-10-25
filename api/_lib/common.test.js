import { describe, expect, it } from 'vitest';
import {
  calculateReturn,
  calculate52WeekPosition,
  calculateAnnualizedVolatility,
  calculateMaxDrawdown,
  computeStatistics,
} from './stats.js';
import { containsRecommendation, filterAnalysisData } from './recommendationFilter.js';

describe('Deterministic Statistics Module (stats.js)', () => {
  it('calculateReturn calculates percentage returns correctly', () => {
    expect(calculateReturn(100, 110)).toBe(10);
    expect(calculateReturn(100, 90)).toBe(-10);
    expect(calculateReturn(0, 100)).toBeNull();
    expect(calculateReturn(null, 100)).toBeNull();
    expect(calculateReturn(100, undefined)).toBeNull();
  });

  it('calculate52WeekPosition calculates range percentage correctly', () => {
    expect(calculate52WeekPosition(150, 100, 200)).toBe(50);
    expect(calculate52WeekPosition(100, 100, 200)).toBe(0);
    expect(calculate52WeekPosition(200, 100, 200)).toBe(100);
    expect(calculate52WeekPosition(250, 100, 200)).toBeNull(); // Out of bounds
    expect(calculate52WeekPosition(150, 200, 100)).toBeNull(); // High <= Low
  });

  it('calculateAnnualizedVolatility computes expected vol for fixture', () => {
    const history = [
      { close: 100 },
      { close: 102 },
      { close: 101 },
      { close: 103 },
      { close: 102 },
    ];
    const vol = calculateAnnualizedVolatility(history);
    expect(vol).toBeGreaterThan(0);
    expect(calculateAnnualizedVolatility([])).toBeNull();
  });

  it('calculateMaxDrawdown calculates peak-to-trough decline', () => {
    const history = [
      { close: 100 },
      { close: 120 }, // Peak
      { close: 90 },  // 25% drop from 120
      { close: 110 },
    ];
    expect(calculateMaxDrawdown(history)).toBe(25);
    expect(calculateMaxDrawdown([{ close: 100 }])).toBeNull();
  });

  it('computeStatistics handles empty and partial data safely', () => {
    const stats = computeStatistics({}, []);
    expect(stats.return_1m).toBeNull();
    expect(stats.range_52w_position).toBeNull();
    expect(stats.annualized_volatility).toBeNull();
    expect(stats.max_drawdown).toBeNull();
  });
});

describe('Recommendation Filter Module (recommendationFilter.js)', () => {
  it('detects buy/sell/hold/target price recommendations', () => {
    expect(containsRecommendation('You should buy INFY, target Rs 2000')).toBe(true);
    expect(containsRecommendation('Strong upside potential with bullish outlook')).toBe(true);
    expect(containsRecommendation('Kharido or becho depending on momentum')).toBe(true);
    expect(containsRecommendation('We issue a hold recommendation')).toBe(true);
  });

  it('does not flag factual corporate actions like share buybacks', () => {
    expect(containsRecommendation('The company announced a share buyback program.')).toBe(false);
    expect(containsRecommendation('Infosys is a holding company for tech assets.')).toBe(false);
    expect(containsRecommendation('Consolidated net profit grew by 12% year-over-year.')).toBe(false);
  });

  it('filterAnalysisData validates structure and rejects prohibited phrases', () => {
    const validData = {
      summary: 'Net revenue increased 10% YoY. The company completed a share buyback.',
      timeline: [{ date: '2024-01-10', event: 'Q3 Earnings Release' }],
      news_takeaways: [{ point: 'Revenue exceeded analysts expectations.' }],
      upcoming_events: [{ date: '2024-04-15', event: 'Q4 Financial Results' }],
      data_gaps: ['Dividend declaration date not yet announced.'],
    };

    const invalidData = {
      summary: 'Strong upside target price Rs 1500',
    };

    expect(filterAnalysisData(validData).valid).toBe(true);
    expect(filterAnalysisData(invalidData).valid).toBe(false);
  });
});

// ---- Origin allowlist and client IP (added in security batch) ----
import { resolveAllowedOrigin, getClientIp as getIp, getCorsHeaders as corsFor } from './common.js';

describe('resolveAllowedOrigin', () => {
  it('accepts exact trusted origins', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in')).toBe('https://orbitboard.in');
    expect(resolveAllowedOrigin('https://app.orbitboard.in')).toBe('https://app.orbitboard.in');
    expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('rejects lookalike domains that contain a trusted string', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in.attacker.example')).toBeNull();
    expect(resolveAllowedOrigin('https://evil-orbitboard.in')).toBeNull();
    expect(resolveAllowedOrigin('https://localhost.evil.test')).toBeNull();
  });

  it('rejects the wrong scheme or port', () => {
    expect(resolveAllowedOrigin('http://orbitboard.in')).toBeNull();
    expect(resolveAllowedOrigin('https://localhost:8080')).toBeNull();
  });

  it('rejects userinfo tricks and non-origin URLs', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in@evil.test')).toBeNull();
    expect(resolveAllowedOrigin('https://orbitboard.in/path')).toBeNull();
    expect(resolveAllowedOrigin('not a url')).toBeNull();
    expect(resolveAllowedOrigin('null')).toBeNull();
    expect(resolveAllowedOrigin(undefined)).toBeNull();
  });

  it('accepts extra origins passed in explicitly', () => {
    expect(resolveAllowedOrigin('https://staging.orbitboard.in', ['https://staging.orbitboard.in'])).toBe('https://staging.orbitboard.in');
  });
});

describe('getCorsHeaders (exact allowlist)', () => {
  it('echoes a trusted origin and varies on Origin', () => {
    const h = corsFor('https://orbitboard.in');
    expect(h['Access-Control-Allow-Origin']).toBe('https://orbitboard.in');
    expect(h['Vary']).toBe('Origin');
  });

  it('never reflects an attacker origin', () => {
    const h = corsFor('https://orbitboard.in.attacker.example');
    expect(h['Access-Control-Allow-Origin']).toBe('https://orbitboard.in');
  });
});

describe('getClientIp (proxy headers)', () => {
  it('prefers the Vercel-set forwarded IP', () => {
    expect(getIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 203.0.113.7' } })).toBe('203.0.113.7');
  });

  it('uses the right-most x-forwarded-for hop, not a client-supplied first value', () => {
    expect(getIp({ headers: { 'x-forwarded-for': '10.0.0.1, 198.51.100.4' } })).toBe('198.51.100.4');
  });

  it('falls back to the socket address', () => {
    expect(getIp({ headers: {}, socket: { remoteAddress: '192.0.2.9' } })).toBe('192.0.2.9');
  });
});
