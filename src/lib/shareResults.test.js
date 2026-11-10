/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildShareableToolUrl,
  getPlatformShareUrls,
  generateResultScorecardBlob,
  copyScorecardImageToClipboard,
  canNativeShareScorecard,
} from './shareResults';

describe('Share Engine & Privacy Guardrails (shareResults.js)', () => {
  describe('buildShareableToolUrl', () => {
    it('serializes safe numeric, string, and boolean parameters', () => {
      const url = buildShareableToolUrl('compound-interest-calculator', {
        principal: '100000',
        rate: 8.5,
        years: 5,
        isActive: true,
      }, 'https://orbitboard.in');

      expect(url).toContain('https://orbitboard.in/tools/compound-interest-calculator?');
      expect(url).toContain('principal=100000');
      expect(url).toContain('rate=8.5');
      expect(url).toContain('years=5');
      expect(url).toContain('isActive=true');
    });

    it('strictly strips blocked PII and sensitive banking/tax keys', () => {
      const url = buildShareableToolUrl('bank-reconciliation', {
        matchRate: '94',
        accountNumber: '1234567890',
        bankAccount: 'HDFC-Primary',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        partyName: 'Secret Supplier Pvt Ltd',
        rawRows: [{ id: 1, text: 'Sensitive text' }],
        employeeName: 'John Doe',
      }, 'https://orbitboard.in');

      expect(url).toContain('matchRate=94');
      expect(url).not.toContain('accountNumber');
      expect(url).not.toContain('1234567890');
      expect(url).not.toContain('bankAccount');
      expect(url).not.toContain('gstin');
      expect(url).not.toContain('29ABCDE1234F1Z5');
      expect(url).not.toContain('partyName');
      expect(url).not.toContain('Secret Supplier');
      expect(url).not.toContain('employeeName');
      expect(url).not.toContain('rawRows');
    });

    it('handles empty or missing parameters gracefully', () => {
      const url = buildShareableToolUrl('emi', {}, 'https://orbitboard.in');
      expect(url).toBe('https://orbitboard.in/tools/emi');
    });
  });

  describe('getPlatformShareUrls', () => {
    it('returns pre-formatted intent URLs for all required social networks', () => {
      const urls = getPlatformShareUrls({
        title: 'GST Reconciliation Scorecard',
        text: '94% Matched on OrbitBoard',
        url: 'https://orbitboard.in/tools/gstr-2b-reconciliation',
      });

      expect(urls.whatsapp).toContain('https://api.whatsapp.com/send?text=');
      expect(urls.whatsapp).toContain(encodeURIComponent('https://orbitboard.in/tools/gstr-2b-reconciliation'));

      expect(urls.twitter).toContain('https://twitter.com/intent/tweet?');
      expect(urls.twitter).toContain(encodeURIComponent('https://orbitboard.in/tools/gstr-2b-reconciliation'));

      expect(urls.linkedin).toContain('https://www.linkedin.com/sharing/share-offsite/?url=');
      expect(urls.linkedin).toContain(encodeURIComponent('https://orbitboard.in/tools/gstr-2b-reconciliation'));

      expect(urls.telegram).toContain('https://t.me/share/url?');
      expect(urls.telegram).toContain(encodeURIComponent('https://orbitboard.in/tools/gstr-2b-reconciliation'));
    });
  });

  describe('generateResultScorecardBlob', () => {
    it('generates a PNG Blob for Finance category scorecard', async () => {
      const blob = await generateResultScorecardBlob({
        toolName: 'India Income Tax Calculator',
        category: 'Finance',
        headlineMetric: '₹ 1,12,500 Total Tax',
        subMetrics: [
          { label: 'Taxable Income', value: '₹ 14,25,000' },
          { label: 'Regime', value: 'New (115BAC)' },
          { label: 'Effective Rate', value: '7.5%' },
        ],
        shareUrl: 'https://orbitboard.in/tools/income-tax-india',
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');
    });

    it('generates a PNG Blob for Business category scorecard with fallback features', async () => {
      const blob = await generateResultScorecardBlob({
        toolName: 'Bank Reconciliation',
        category: 'Business',
        headlineMetric: '94% Match Rate',
        subMetrics: [],
        shareUrl: 'https://orbitboard.in/tools/bank-reconciliation',
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');
    });

    it('generates a PNG Blob for Developer category scorecard', async () => {
      const blob = await generateResultScorecardBlob({
        toolName: 'Diff Checker',
        category: 'Developer',
        headlineMetric: '14 Changed Lines',
        subMetrics: [
          { label: 'Additions', value: '+10 lines' },
          { label: 'Deletions', value: '-4 lines' },
        ],
        shareUrl: 'https://orbitboard.in/tools/diff-checker',
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');
    });
  });

  describe('Clipboard & Native Share APIs', () => {
    it('copies scorecard blob using navigator.clipboard.write', async () => {
      const mockWrite = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { write: mockWrite },
        writable: true,
        configurable: true,
      });
      globalThis.ClipboardItem = class ClipboardItem {
        constructor(data) {
          this.data = data;
        }
      };

      const testBlob = new Blob(['PNG_DATA'], { type: 'image/png' });
      const result = await copyScorecardImageToClipboard(testBlob);

      expect(result).toBe(true);
      expect(mockWrite).toHaveBeenCalled();
    });

    it('canNativeShareScorecard checks navigator.share', () => {
      Object.defineProperty(navigator, 'share', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      expect(canNativeShareScorecard()).toBe(true);
    });
  });
});
