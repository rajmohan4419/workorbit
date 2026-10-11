import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyNewsDuplicates,
  enrichNewsEvidence,
  summarizeNewsIntelligence
} from './newsIntelligence.js';
import { NEWS_FRESHNESS, NEWS_DUPLICATE_STATUS, DEFAULT_NEWS_RULES } from './newsRules.js';

describe('newsIntelligence', () => {
  describe('classifyNewsDuplicates', () => {
    it('marks standalone unique news records as UNIQUE', () => {
      const records = [
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Infosys announces Q3 results',
          publishedAt: '2025-01-15T10:00:00Z',
          url: 'https://example.com/news/1'
        },
        {
          symbol: 'TCS',
          exchange: 'NSE',
          headline: 'TCS wins new contract',
          publishedAt: '2025-01-15T10:00:00Z',
          url: 'https://example.com/news/2'
        }
      ];

      const result = classifyNewsDuplicates(records);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
      assert.strictEqual(result[0].provenance.newsIntelligence.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
      assert.strictEqual(result[1].provenance.newsIntelligence.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
    });

    it('identifies exact duplicate records based on symbol, exchange, headline, date, and normalized url', () => {
      const records = [
        {
          entity: { symbol: 'infy', exchange: 'nse' },
          value: { headline: '  Infosys   Announces  Q3 Results!  ' },
          publishedAt: '2025-01-15T10:00:00Z',
          source: { url: 'HTTPS://Example.com/news/1/#section' }
        },
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'infosys announces q3 results',
          publishedAt: '2025-01-15T14:30:00Z', // Same publication date (2025-01-15)
          url: 'https://example.com/news/1/'
        }
      ];

      const result = classifyNewsDuplicates(records);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE);
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE);
    });

    it('identifies possible duplicates when headlines match within duplicateDateWindowDays but URLs differ', () => {
      const records = [
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Infosys CEO comments on AI growth',
          publishedAt: '2025-01-10T08:00:00Z',
          url: 'https://site-a.com/article1'
        },
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Infosys CEO comments on AI growth',
          publishedAt: '2025-01-11T18:00:00Z', // 1.4 days difference (<= 2 days window)
          url: 'https://site-b.com/article2'
        }
      ];

      const result = classifyNewsDuplicates(records);

      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE);
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE);
    });

    it('treats records with matching headlines as UNIQUE if outside duplicateDateWindowDays', () => {
      const records = [
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Infosys Quarterly Earnings Call',
          publishedAt: '2025-01-01T10:00:00Z',
          url: 'https://site-a.com/q1'
        },
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Infosys Quarterly Earnings Call',
          publishedAt: '2025-01-10T10:00:00Z', // 9 days difference (> 2 days)
          url: 'https://site-b.com/q2'
        }
      ];

      const result = classifyNewsDuplicates(records);

      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.UNIQUE);
    });

    it('handles records with missing date or missing attributes without throwing', () => {
      const records = [
        {},
        { headline: null }
      ];

      const result = classifyNewsDuplicates(records);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE); // Both normalize to empty keys
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE);
    });

    it('respects custom duplicateDateWindowDays rule', () => {
      const customRules = { ...DEFAULT_NEWS_RULES, duplicateDateWindowDays: 5 };
      const records = [
        {
          symbol: 'INFY',
          headline: 'Infosys news',
          publishedAt: '2025-01-01T00:00:00Z',
          url: 'https://a.com'
        },
        {
          symbol: 'INFY',
          headline: 'Infosys news',
          publishedAt: '2025-01-05T00:00:00Z', // 4 days apart
          url: 'https://b.com'
        }
      ];

      const result = classifyNewsDuplicates(records, customRules);

      assert.strictEqual(result[0].value.duplicateStatus, NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE);
      assert.strictEqual(result[1].value.duplicateStatus, NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE);
    });
  });

  describe('enrichNewsEvidence', () => {
    it('annotates records with freshness, timestamps, provenance and duplicateStatus', () => {
      const now = '2025-01-15T12:00:00Z';
      const records = [
        {
          symbol: 'INFY',
          exchange: 'NSE',
          headline: 'Fresh news item',
          publishedAt: '2025-01-15T08:00:00Z', // 4 hours old -> FRESH
          retrievedAt: '2025-01-15T10:00:00Z',
          source: { trust: 0.9, url: 'https://example.com/fresh' },
          provenance: { initial: 'data' }
        },
        {
          symbol: 'TCS',
          exchange: 'NSE',
          headline: 'Aging news item',
          publishedAt: '2025-01-13T12:00:00Z', // 48 hours old -> AGING
          source: { url: 'https://example.com/aging' }
        },
        {
          symbol: 'WIPRO',
          exchange: 'NSE',
          headline: 'Stale news item',
          publishedAt: '2025-01-10T12:00:00Z', // 120 hours old -> STALE
          source: { url: 'https://example.com/stale' }
        },
        {
          symbol: 'HCL',
          exchange: 'NSE',
          headline: 'Invalid date item',
          publishedAt: 'invalid-date',
          source: { url: 'https://example.com/invalid' }
        }
      ];

      const result = enrichNewsEvidence(records, { now });

      assert.strictEqual(result.length, 4);

      // Record 0 (Fresh)
      assert.strictEqual(result[0].value.freshness, NEWS_FRESHNESS.FRESH);
      assert.strictEqual(result[0].value.sourceTrust, 0.9);
      assert.strictEqual(result[0].value.retrievedAt, '2025-01-15T10:00:00Z');
      assert.strictEqual(result[0].provenance.initial, 'data');
      assert.strictEqual(result[0].provenance.newsIntelligence.freshness, NEWS_FRESHNESS.FRESH);
      assert.strictEqual(result[0].provenance.newsIntelligence.publicationTimeUsedForFreshness, true);

      // Record 1 (Aging)
      assert.strictEqual(result[1].value.freshness, NEWS_FRESHNESS.AGING);

      // Record 2 (Stale)
      assert.strictEqual(result[2].value.freshness, NEWS_FRESHNESS.STALE);

      // Record 3 (Invalid)
      assert.strictEqual(result[3].value.freshness, NEWS_FRESHNESS.INVALID);
    });

    it('works with empty array input and default parameters', () => {
      const result = enrichNewsEvidence();
      assert.deepStrictEqual(result, []);
    });

    it('preserves sourceTrust from record.value if record.source.trust is undefined', () => {
      const records = [
        {
          publishedAt: '2025-01-15T10:00:00Z',
          value: { sourceTrust: 0.85 }
        }
      ];

      const result = enrichNewsEvidence(records, { now: '2025-01-15T12:00:00Z' });
      assert.strictEqual(result[0].value.sourceTrust, 0.85);
    });
  });

  describe('summarizeNewsIntelligence', () => {
    it('returns zeroes for empty record list', () => {
      const summary = summarizeNewsIntelligence([]);
      assert.deepStrictEqual(summary, {
        total: 0,
        fresh: 0,
        aging: 0,
        stale: 0,
        invalid: 0,
        unique: 0,
        exactDuplicates: 0,
        possibleDuplicates: 0
      });
    });

    it('correctly aggregates freshness and duplicate status metrics', () => {
      const enrichedRecords = [
        { value: { freshness: NEWS_FRESHNESS.FRESH, duplicateStatus: NEWS_DUPLICATE_STATUS.UNIQUE } },
        { value: { freshness: NEWS_FRESHNESS.FRESH, duplicateStatus: NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE } },
        { value: { freshness: NEWS_FRESHNESS.AGING, duplicateStatus: NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE } },
        { value: { freshness: NEWS_FRESHNESS.STALE, duplicateStatus: NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE } },
        { value: { freshness: NEWS_FRESHNESS.INVALID, duplicateStatus: NEWS_DUPLICATE_STATUS.UNIQUE } }
      ];

      const summary = summarizeNewsIntelligence(enrichedRecords);

      assert.strictEqual(summary.total, 5);
      assert.strictEqual(summary.fresh, 2);
      assert.strictEqual(summary.aging, 1);
      assert.strictEqual(summary.stale, 1);
      assert.strictEqual(summary.invalid, 1);
      assert.strictEqual(summary.unique, 2);
      assert.strictEqual(summary.exactDuplicates, 2);
      assert.strictEqual(summary.possibleDuplicates, 1);
    });
  });
});
