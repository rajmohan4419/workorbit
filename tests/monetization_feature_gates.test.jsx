/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GstInvoice } from '../src/tools/business/GstInvoice';
import BankReconciliation from '../src/tools/business/BankReconciliation';
import ExcelEngineWorkspace from '../src/tools/spreadsheet/ExcelEngineWorkspace';
import { processSpreadsheetBatch } from '../src/engines/excelEngine';
import * as usePlanModule from '../src/lib/monetization/usePlan';
import * as analyticsModule from '../src/lib/analytics';
import * as XLSX from 'xlsx';

describe('Monetization Feature Gates & Unrestricted Calculations', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('GstInvoice feature gates', () => {
    it('validates invoice inputs without a pricing gate before preparing a signed-in download', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        plan: 'free',
        isPaid: false,
        hasFeature: vi.fn().mockImplementation((feat) => feat === 'free_tier_features'),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <GstInvoice />
          </BrowserRouter>
        );
      });

      // Free on-screen calculation is accessible:
      expect(container.textContent).toContain('GST Invoice Generator');
      expect(container.textContent).toContain('Your Company / Seller Details');

      // Click Download PDF:
      const downloadBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Download PDF')
      );
      expect(downloadBtn).toBeTruthy();

      await act(async () => {
        downloadBtn.click();
      });

      expect(trackSpy).not.toHaveBeenCalledWith('advanced_exports');
      expect(container.textContent).toContain('Seller name is required.');
      expect(document.activeElement).toBe(container.querySelector('[role="alert"]'));
      expect(document.activeElement.textContent).toContain('Download needs attention');
    });

    it('gates save workspace for unentitled users and displays upgrade prompt', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        plan: 'free',
        isPaid: false,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <GstInvoice />
          </BrowserRouter>
        );
      });

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Save Workspace')
      );
      expect(saveBtn).toBeTruthy();

      await act(async () => {
        saveBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('saved_workspaces');
      expect(container.textContent).toContain('Saved Cloud Workspaces');
    });
  });

  describe('BankReconciliation feature gates', () => {
    it('routes XLSX exports through the shared account coordinator while preserving free reconciliation', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        plan: 'free',
        isPaid: false,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <BankReconciliation />
          </BrowserRouter>
        );
      });

      // On-screen free reconciliation demo loads:
      const demoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Load Sample Dataset')
      );
      expect(demoBtn).toBeTruthy();

      await act(async () => {
        demoBtn.click();
      });

      // Verify on-screen reconciliation calculated without gating:
      expect(container.textContent).toContain('Reconciliation Statement');
      expect(container.textContent).toContain('Matched (5)');

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      // Click export button:
      const exportBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Export Reconciliation Statement')
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn.click();
      });

      expect(trackSpy).not.toHaveBeenCalledWith('advanced_exports');
      expect(dispatchSpy.mock.calls.some(([event]) => event.type === 'orbitboard:preview-download' && event.detail.metered === true)).toBe(true);
    });
  });

  describe('ExcelEngine bulk processing gate', () => {
    it('gates batch processing for unentitled users while keeping single-file operations free', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        plan: 'free',
        isPaid: false,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <ExcelEngineWorkspace />
          </BrowserRouter>
        );
      });

      // Free on-screen single sheet operation works:
      const loadDemo = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Load Demo Sheet')
      );
      expect(loadDemo).toBeTruthy();

      await act(async () => {
        loadDemo.click();
      });

      expect(container.textContent).toContain('Ecommerce_Orders_Demo.xlsx');

      // Click Batch Process:
      const batchBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Batch Process (Bulk)')
      );
      expect(batchBtn).toBeTruthy();

      await act(async () => {
        batchBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('bulk_processing');
      expect(container.textContent).toContain('Batch & Bulk Processing');
    });

    it('processSpreadsheetBatch successfully aggregates multiple spreadsheet workbooks', async () => {
      const wb1 = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet([{ id: 1, val: 'A' }, { id: 2, val: 'B' }]);
      XLSX.utils.book_append_sheet(wb1, ws1, 'Sheet1');
      const buf1 = XLSX.write(wb1, { type: 'array', bookType: 'xlsx' });

      const wb2 = XLSX.utils.book_new();
      const ws2 = XLSX.utils.json_to_sheet([{ id: 3, val: 'C' }]);
      XLSX.utils.book_append_sheet(wb2, ws2, 'Sheet1');
      const buf2 = XLSX.write(wb2, { type: 'array', bookType: 'xlsx' });

      const batchRes = await processSpreadsheetBatch([buf1, buf2]);
      expect(batchRes.totalFiles).toBe(2);
      expect(batchRes.totalRows).toBe(3);
      expect(batchRes.results.length).toBe(2);
      expect(batchRes.allRows.length).toBe(3);
    });
  });
});
