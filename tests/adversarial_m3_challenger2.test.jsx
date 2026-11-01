/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

// Mock pdfjs-dist to prevent JSDOM DOMMatrix canvas crash
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: '',
}));

// App and Route components
import NotFound from '../src/pages/NotFound';
import ToolPageRoute from '../src/pages/ToolPageRoute';
import { loadToolPage } from '../src/lib/toolPageLoader';
import { TOOLS, LISTED_TOOLS, SLUG_REDIRECTS } from '../src/data/toolCatalog';
import toolVariants from '../src/data/toolVariants.json';

const PROJECT_ROOT = path.resolve('.');
const DIST_DIR = path.resolve('dist');
const PUBLIC_DIR = path.resolve('public');

describe('Adversarial M3 Verification Suite — Challenger 2', () => {
  let container;
  let root;

  beforeEach(async () => {
    // Preload lazy module
    await loadToolPage();
    // Reset document head and body
    document.title = '';
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
    root = null;
  });

  // =========================================================================
  // 1. URL Resolution Edge Cases: Unknown Routes
  // =========================================================================
  describe('1. URL Resolution Edge Cases: Unknown Routes', () => {
    it('renders NotFound component for unknown root-level route "/bad-route"', async () => {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/bad-route']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(container.textContent).toContain('404');
      expect(container.textContent).toContain('Page Not Found');
      expect(container.textContent).toContain("The page or tool you are looking for doesn't exist");

      // Verify robots meta tag set to noindex, follow
      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('noindex, follow');

      // Verify document.title
      expect(document.title).toBe('404 — Page Not Found | OrbitBoard');

      // Verify navigation links
      const toolsLink = container.querySelector('a[href="/tools"]');
      const homeLink = container.querySelector('a[href="/"]');
      expect(toolsLink).not.toBeNull();
      expect(homeLink).not.toBeNull();
    });

    it('renders NotFound component for unknown tool slug "/tools/invalid-route-xyz"', async () => {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/invalid-route-xyz']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(container.textContent).toContain('404');
      expect(container.textContent).toContain('Page Not Found');

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('noindex, follow');
      expect(document.title).toBe('404 — Page Not Found | OrbitBoard');
    });

    it('renders NotFound component for unknown tool slug with query params "/tools/non-existent-tool?q=test#hash"', async () => {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/non-existent-tool?q=test#hash']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(container.textContent).toContain('404');
      expect(container.textContent).toContain('Page Not Found');

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('noindex, follow');
    });

    it('properly redirects deprecated slugs configured in SLUG_REDIRECTS', async () => {
      expect(SLUG_REDIRECTS['loan-emi-calculator']).toBe('emi');
      function PathTracker() {
        return <div data-testid="live-tool">Live Tool Page</div>;
      }

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/loan-emi-calculator']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
              <Route path="/tools/emi" element={<PathTracker />} />
            </Routes>
          </MemoryRouter>
        );
      });

      // SLUG_REDIRECTS['loan-emi-calculator'] => 'emi'
      expect(container.querySelector('[data-testid="live-tool"]')).not.toBeNull();
    });
  });

  // =========================================================================
  // 2. Planned Tools Handling & Sitemap Exclusion
  // =========================================================================
  describe('2. Planned Tools Handling, Coming Soon & Sitemap Exclusion', () => {
    it('renders Coming Soon state with robots noindex for planned tool "image-cropper"', async () => {
      const plannedTool = TOOLS.find((t) => t.slug === 'image-cropper');
      expect(plannedTool).toBeDefined();
      expect(plannedTool.status).toBe('planned');

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/image-cropper']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
            </Routes>
          </MemoryRouter>
        );
      });

      // Allow lazy loading / suspense
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('Image Cropper is coming soon');
      expect(container.textContent).toContain("This tool isn't available yet. Explore the tools that work today.");
      expect(container.querySelector('a[href="/tools"]')).not.toBeNull();

      // Check robots meta
      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('noindex, follow');
    });

    it('renders Coming Soon state with robots noindex for planned tool "pdf-merger"', async () => {
      const plannedTool = TOOLS.find((t) => t.slug === 'pdf-merger');
      expect(plannedTool).toBeDefined();
      expect(plannedTool.status).toBe('planned');

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/pdf-merger']}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
            </Routes>
          </MemoryRouter>
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('PDF Merger is coming soon');
      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('noindex, follow');
    });

    it('strictly confirms 100% absence of EVERY planned tool in public/sitemap.xml and dist/sitemap.xml', () => {
      const publicSitemap = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8');
      const distSitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');

      const plannedTools = TOOLS.filter((t) => t.status === 'planned');
      expect(plannedTools.length).toBeGreaterThan(200);

      const foundInPublic = [];
      const foundInDist = [];

      for (const t of plannedTools) {
        if (publicSitemap.includes(`/tools/${t.slug}</loc>`)) {
          foundInPublic.push(t.slug);
        }
        if (distSitemap.includes(`/tools/${t.slug}</loc>`)) {
          foundInDist.push(t.slug);
        }
      }

      expect(foundInPublic, 'No planned tool may appear in public/sitemap.xml').toEqual([]);
      expect(foundInDist, 'No planned tool may appear in dist/sitemap.xml').toEqual([]);
    });

    it('strictly confirms NO planned tool is prerendered to dist/tools/<slug>', () => {
      const plannedTools = TOOLS.filter((t) => t.status === 'planned');
      const leakedPrerenderedDirs = [];

      for (const t of plannedTools) {
        const dir = path.join(DIST_DIR, 'tools', t.slug);
        if (fs.existsSync(dir)) {
          leakedPrerenderedDirs.push(t.slug);
        }
      }

      expect(leakedPrerenderedDirs, 'Planned tools must not be prerendered to dist/tools/').toEqual([]);
    });
  });

  // =========================================================================
  // 3. Variant Tool Routing & Parameter Pre-fills
  // =========================================================================
  describe('3. Variant Tool Routing & Parameter Pre-fills', () => {
    it('direct navigation to EMI variant loads and pre-fills parameters correctly', async () => {
      const slug = 'emi-calculator-50-lakh-20-years';
      const variant = toolVariants.find((v) => v.slug === slug);
      expect(variant).toBeDefined();

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[`/tools/${slug}`]}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
            </Routes>
          </MemoryRouter>
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verify header and title
      expect(document.title).toContain('50 Lakh');
      expect(container.textContent).toContain('₹50 Lakh Loan EMI Calculator (20 Years)');

      // Verify canonical URL points to base tool
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical).not.toBeNull();
      expect(canonical.getAttribute('href')).toBe('https://orbitboard.in/tools/emi');

      // Verify robots meta is index, follow
      const robots = document.querySelector('meta[name="robots"]');
      expect(robots.getAttribute('content')).toBe('index, follow');

      // Check pre-filled inputs in VariantEmi
      const inputs = container.querySelectorAll('input[type="number"]');
      const inputValues = Array.from(inputs).map((inp) => inp.value);
      // Principal = 5000000, Rate = 8.5, Years = 20
      expect(inputValues).toContain('5000000');
      expect(inputValues).toContain('8.5');
      expect(inputValues).toContain('20');

      // Check computed output: EMI is ₹ 43,391
      expect(container.textContent).toContain('43,391');
    });

    it('direct navigation to CTC variant loads and pre-fills parameters correctly', async () => {
      const slug = 'ctc-to-in-hand-12-lpa-new-regime';
      const variant = toolVariants.find((v) => v.slug === slug);
      expect(variant).toBeDefined();

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[`/tools/${slug}`]}>
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
            </Routes>
          </MemoryRouter>
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.title).toContain('12 LPA');
      expect(container.textContent).toContain('₹12 LPA Salary In-Hand Calculator (New Tax Regime)');

      // Canonical URL points to base tool ctc-to-inhand
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical).not.toBeNull();
      expect(canonical.getAttribute('href')).toBe('https://orbitboard.in/tools/ctc-to-inhand');

      // Verify pre-filled CTC is 1200000
      const ctcInput = Array.from(container.querySelectorAll('input[type="number"]')).find(
        (i) => i.value === '1200000'
      );
      expect(ctcInput).toBeDefined();

      // Verify regime select is "new"
      const regimeSelect = container.querySelector('select');
      expect(regimeSelect.value).toBe('new');

      // Computed monthly take-home should be ₹ 96,192
      expect(container.textContent).toContain('96,192');
    });

    it('all 28 variants have valid parameter structures and canonical URLs', () => {
      expect(toolVariants.length).toBe(28);

      for (const v of toolVariants) {
        expect(v.slug).toBeTruthy();
        expect(v.params).toBeDefined();

        if (v.baseToolSlug === 'emi') {
          expect(v.params.principal).toBeGreaterThan(0);
          expect(v.params.tenureYears).toBeGreaterThan(0);
          expect(v.params.interestRate).toBeGreaterThan(0);
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/emi');
        } else if (v.baseToolSlug === 'ctc-to-inhand') {
          expect(v.params.ctcAnnual).toBeGreaterThan(0);
          expect(['new', 'old']).toContain(v.params.regime);
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/ctc-to-inhand');
        }
      }
    });
  });

  // =========================================================================
  // 4. Build Artifacts, Prerendering & CleanUrls in dist/
  // =========================================================================
  describe('4. Build Artifacts, Prerendering & CleanUrls in dist/', () => {
    it('verifies all 7 static routes are prerendered with proper meta & canonical tags', () => {
      const staticRoutes = [
        { file: 'index.html', titlePart: 'OrbitBoard' },
        { file: path.join('tools', 'index.html'), titlePart: 'All Free Online Tools' },
        { file: path.join('about', 'index.html'), titlePart: 'About Us' },
        { file: path.join('contact', 'index.html'), titlePart: 'Contact Us' },
        { file: path.join('privacy', 'index.html'), titlePart: 'Privacy Policy' },
        { file: path.join('terms', 'index.html'), titlePart: 'Terms of Service' },
        { file: path.join('pricing', 'index.html'), titlePart: 'Pricing & Plans' },
      ];

      for (const route of staticRoutes) {
        const filePath = path.join(DIST_DIR, route.file);
        expect(fs.existsSync(filePath), `Static route ${route.file} must exist in dist`).toBe(true);

        const html = fs.readFileSync(filePath, 'utf8');
        expect(html).toContain('<title>');
        expect(html).toContain(route.titlePart);
        expect(html).toContain('<meta name="description"');
        expect(html).toContain('<link rel="canonical"');
        expect(html).toContain('<noscript>');
      }
    });

    it('verifies all 75 live tools and all 28 variants are prerendered in dist/tools/', () => {
      expect(LISTED_TOOLS.length).toBe(75);
      expect(toolVariants.length).toBe(28);

      for (const tool of LISTED_TOOLS) {
        const file = path.join(DIST_DIR, 'tools', tool.slug, 'index.html');
        expect(fs.existsSync(file), `Live tool ${tool.slug} must be prerendered`).toBe(true);
        const html = fs.readFileSync(file, 'utf8');
        expect(html).toContain(tool.name);
        expect(html).toContain('application/ld+json');
      }

      for (const variant of toolVariants) {
        const file = path.join(DIST_DIR, 'tools', variant.slug, 'index.html');
        expect(fs.existsSync(file), `Variant ${variant.slug} must be prerendered`).toBe(true);
        const html = fs.readFileSync(file, 'utf8');
        expect(html).toContain(variant.name);
        expect(html).toContain(`href="${variant.canonicalUrl}"`);
      }
    });

    it('verifies dist/404.html exists and contains robots noindex', () => {
      const file404 = path.join(DIST_DIR, '404.html');
      expect(fs.existsSync(file404), 'dist/404.html must exist').toBe(true);

      const html = fs.readFileSync(file404, 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex, follow" />');
      expect(html).toContain('404');
      expect(html).toContain('Page Not Found');
      expect(html).toContain('href="/tools"');
    });

    it('verifies sitemap.xml exists in both public/ and dist/ with exact 110 URLs and lastmod 2026-10-31', () => {
      const publicSitemap = path.join(PUBLIC_DIR, 'sitemap.xml');
      const distSitemap = path.join(DIST_DIR, 'sitemap.xml');

      expect(fs.existsSync(publicSitemap)).toBe(true);
      expect(fs.existsSync(distSitemap)).toBe(true);

      const pubXml = fs.readFileSync(publicSitemap, 'utf8');
      const distXml = fs.readFileSync(distSitemap, 'utf8');

      expect(pubXml.trim()).toBe(distXml.trim());

      const urlCount = (pubXml.match(/<url>/g) || []).length;
      expect(urlCount).toBe(110);

      const lastmodCount = (pubXml.match(/<lastmod>2026-10-31<\/lastmod>/g) || []).length;
      expect(lastmodCount).toBe(110);
    });

    it('verifies vercel.json includes cleanUrls: true and excludes unsafe-eval from CSP', () => {
      const vercelJsonPath = path.join(PROJECT_ROOT, 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      expect(vercelConfig.cleanUrls).toBe(true);

      // Check CSP
      const cspHeader = vercelConfig.headers
        .flatMap((h) => h.headers)
        .find((hdr) => hdr.key === 'Content-Security-Policy');

      expect(cspHeader).toBeDefined();
      expect(cspHeader.value).not.toContain("'unsafe-eval'");
      expect(cspHeader.value).toContain('sha256-fKZEcC922IMO+0G5BkycWTyqRY/A6lttqjgIVNaJfyU=');
    });

    it('verifies that every sitemap URL resolves to a real index.html file in dist (cleanUrls mapping)', () => {
      const distSitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
      const locMatches = Array.from(distSitemap.matchAll(/<loc>(https:\/\/orbitboard\.in[^<]*)<\/loc>/g)).map(
        (m) => m[1]
      );

      expect(locMatches.length).toBe(110);

      // Verify no duplicate URLs exist in sitemap
      const uniqueLocs = new Set(locMatches);
      expect(uniqueLocs.size).toBe(110);

      for (const loc of locMatches) {
        const urlObj = new URL(loc);
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/')) {
          pathname += 'index.html';
        } else {
          pathname += '/index.html';
        }
        // Remove leading slash
        const relPath = pathname.replace(/^\//, '');
        const targetPath = path.join(DIST_DIR, relPath);
        expect(
          fs.existsSync(targetPath),
          `Sitemap URL ${loc} must map to static file ${targetPath} for cleanUrls`
        ).toBe(true);
      }
    });

    it('verifies mathematical precision of all 16 EMI variants against independent formula', () => {
      const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');
      expect(emiVariants.length).toBe(16);

      for (const v of emiVariants) {
        const { principal, interestRate, tenureYears } = v.params;
        const p = principal;
        const r = interestRate / 1200;
        const n = tenureYears * 12;
        const expectedEmi = Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        const expectedTotalRepayment = expectedEmi * n;
        const expectedTotalInterest = expectedTotalRepayment - p;

        expect(v.computed.monthlyEmi).toBe(expectedEmi);
        expect(v.computed.totalInterest).toBe(expectedTotalInterest);
        expect(v.computed.totalRepayment).toBe(expectedTotalRepayment);
        expect(v.computed.tenureMonths).toBe(n);

        // Check intro text contains formatted monthly EMI
        const formattedEmi = Number(expectedEmi).toLocaleString('en-IN');
        expect(v.intro).toContain(`₹${formattedEmi}`);
      }
    });

    it('verifies mathematical precision of all 12 CTC variants against independent tax/PF engine', () => {
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');
      expect(ctcVariants.length).toBe(12);

      for (const v of ctcVariants) {
        const { ctcAnnual, regime } = v.params;
        const basicAnnual = (ctcAnnual * 0.40);
        const monthlyBasic = basicAnnual / 12;
        const employeePf = Math.min(monthlyBasic, 15000) * 0.12 * 12;
        const employerPf = employeePf;
        const grossCash = ctcAnnual - employerPf;
        const standardDeduction = regime === 'new' ? 75000 : 50000;
        const taxable = Math.max(0, grossCash - standardDeduction);

        let tax = 0;
        if (regime === 'new') {
          const slabs = [
            [400000, 0],
            [400000, 0.05],
            [400000, 0.10],
            [400000, 0.15],
            [400000, 0.20],
            [400000, 0.25],
            [Infinity, 0.30],
          ];
          let remaining = taxable;
          for (const [limit, rate] of slabs) {
            const amount = Math.min(remaining, limit);
            if (amount <= 0) break;
            tax += amount * rate;
            remaining -= amount;
          }
          if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
          tax = tax * 1.04;
        } else {
          const slabs = [
            [250000, 0],
            [250000, 0.05],
            [500000, 0.20],
            [Infinity, 0.30],
          ];
          let remaining = taxable;
          for (const [limit, rate] of slabs) {
            const amount = Math.min(remaining, limit);
            if (amount <= 0) break;
            tax += amount * rate;
            remaining -= amount;
          }
          if (taxable <= 500000) tax = Math.max(0, tax - 12500);
          tax = tax * 1.04;
        }

        const pt = grossCash / 12 >= 25000 ? 2500 : 0;
        const annualTakeHome = Math.max(0, grossCash - employeePf - tax - pt);
        const monthlyTakeHome = Math.round(annualTakeHome / 12);

        expect(v.computed.annualCtc).toBe(ctcAnnual);
        expect(v.computed.employeePf).toBe(Math.round(employeePf));
        expect(v.computed.standardDeduction).toBe(standardDeduction);
        expect(v.computed.incomeTax).toBe(Math.round(tax));
        expect(v.computed.annualTakeHome).toBe(Math.round(annualTakeHome));
        expect(v.computed.monthlyTakeHome).toBe(monthlyTakeHome);

        // Check intro text contains formatted monthly take-home
        const formattedTakeHome = Number(monthlyTakeHome).toLocaleString('en-IN');
        expect(v.intro).toContain(`₹${formattedTakeHome}`);
      }
    });

    it('verifies dynamic client route transition between variants cleanly updates inputs and calculations', async () => {
      // Simulate route navigation from 10L 10Y to 50L 20Y
      let navigateFn;

      function NavWatcher() {
        navigateFn = useNavigate();
        return null;
      }

      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/tools/emi-calculator-10-lakh-10-years']}>
            <NavWatcher />
            <Routes>
              <Route path="/tools/:slug" element={<ToolPageRoute />} />
            </Routes>
          </MemoryRouter>
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('₹10 Lakh Loan EMI Calculator (10 Years)');
      expect(container.textContent).toContain('12,399');

      // Now dynamically navigate to 50L 20Y via client router
      await act(async () => {
        navigateFn('/tools/emi-calculator-50-lakh-20-years');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('₹50 Lakh Loan EMI Calculator (20 Years)');
      expect(container.textContent).toContain('43,391');
    });
  });
});

