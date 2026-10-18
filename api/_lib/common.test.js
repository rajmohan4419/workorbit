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
