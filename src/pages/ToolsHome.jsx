import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, FileText, Image, Code2 } from 'lucide-react';
import { LISTED_TOOLS } from '../data/toolCatalog';
import { logEvent } from '../lib/telemetry';

import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeHero } from '../components/toolsHome/ToolsHomeHero';
import { CategoryExplorer } from '../components/toolsHome/CategoryExplorer';
import { RecentToolsSection } from '../components/toolsHome/RecentToolsSection';
import { PrivacySection, CatalogCalloutSection, SupportCheckoutSection, ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

const intentMap = [
  { terms: ['salary', 'ctc', 'in hand', 'take home', 'take-home', 'hike', 'increment', 'offer', 'notice', 'experience'], slugs: ['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'] },
  { terms: ['emi', 'loan', 'interest', 'gst', 'sip', 'investment', 'invoice', 'bill', 'tax invoice'], slugs: ['gst-invoice-generator', 'emi', 'gst', 'sip'] },
  { terms: ['json', 'jwt', 'base64', 'xml', 'markdown', 'timestamp', 'uuid', 'url', 'developer', 'api'], slugs: ['json-formatter', 'jwt-decoder', 'base64', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'unix-timestamp', 'uuid-generator', 'url-encoder'] },
  { terms: ['csv', 'xlsx', 'excel', 'spreadsheet'], slugs: ['csv-to-xlsx', 'xlsx-to-csv', 'json-to-xlsx', 'csv-to-pdf', 'csv-to-json'] },
  { terms: ['pdf', 'document'], slugs: ['pdf-workspace', 'pdf-merge', 'pdf-split', 'pdf-to-text', 'pdf-to-jpg', 'pdf-to-png', 'image-to-pdf', 'txt-to-pdf', 'pdf-compressor'] },
  { terms: ['image', 'jpg', 'jpeg', 'png', 'webp', 'photo', 'picture'], slugs: ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'image-resizer', 'image-compressor', 'image-metadata-remover', 'svg-to-png'] },
  { terms: ['timezone', 'time zone', 'world clock', 'pst', 'est', 'ist', 'utc', 'gmt', 'time difference', 'time-zone', 'clock', 'time'], slugs: ['timezone-converter', 'time-converter', 'unix-timestamp'] },
  { terms: ['convert', 'converter'], slugs: ['length-converter', 'weight-converter', 'temperature-converter', 'time-converter', 'timezone-converter'] },
  { terms: ['percentage', 'percent', '%'], slugs: ['percentage'] }
];

const categoryLinks = [
  { label: 'Documents', detail: 'PDF and file tools', icon: FileText, query: 'PDF' },
  { label: 'Images', detail: 'Convert and resize', icon: Image, query: 'image' },
  { label: 'Calculators', detail: 'Money and everyday math', icon: Calculator, category: 'Finance' },
  { label: 'Developer tools', detail: 'Format and transform data', icon: Code2, category: 'Developer' }
];

export default function ToolsHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || null;

  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:favorites') || '[]'); } catch { return []; }
  });
  const [visitorCount, setVisitorCount] = useState(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:recent') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('orbitboard:favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => {
    const handleCount = (event) => {
      if (typeof event.detail === 'number' && Number.isFinite(event.detail)) setVisitorCount(event.detail);
    };
    window.addEventListener('orbitboard:visitor-count', handleCount);
    return () => window.removeEventListener('orbitboard:visitor-count', handleCount);
  }, []);
  useEffect(() => { localStorage.setItem('orbitboard:recent', JSON.stringify(recent)); }, [recent]);

  const toggleFavorite = (slug) => setFavorites(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [slug, ...prev]);
  const addRecent = (slug) => {
    setRecent(prev => [slug, ...prev.filter(x => x !== slug)].slice(0, 6));
    logEvent('tool.opened', { tool: slug });
  };
  const chooseCategory = (name) => {
    setCategory(name);
    setQuery('');
    if (name) {
      setSearchParams({ category: name });
    } else {
      setSearchParams({});
    }
    logEvent('category.explored', { category: name });
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    if (category) {
      setCategory(null);
      setSearchParams(val.trim() ? { q: val } : {});
    }
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const direct = LISTED_TOOLS.filter(tool => {
      const haystack = [tool.name, tool.description, tool.category, tool.slug, tool.slug.replace(/-/g, ' ')].join(' ').toLowerCase();
      return tokens.every(token => haystack.includes(token));
    });
    const intentSlugs = intentMap.filter(group => group.terms.some(term => q.includes(term))).flatMap(group => group.slugs);
    const merged = [...direct, ...intentSlugs.map(slug => LISTED_TOOLS.find(t => t.slug === slug))].filter(Boolean);
    return [...new Map(merged.map(tool => [tool.slug, tool])).values()].slice(0, 8);
  }, [query]);

  const categoryTools = useMemo(() => category ? LISTED_TOOLS.filter(tool => tool.category === category) : [], [category]);
  const recentTools = recent.map(slug => LISTED_TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4);
  const showExplore = !query.trim() && !category;

  return (
    <div className="orbit-light min-h-screen flex bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <ToolsHomeHeader visitorCount={visitorCount} onSelectCategory={chooseCategory} />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6">
        {/* Zone 1: Concise Hero Headline & Floating Search Bar with Category Chips */}
        <ToolsHomeHero
          query={query}
          setQuery={setQuery}
          onQueryChange={handleQueryChange}
          category={category}
          setCategory={chooseCategory}
          searchResults={searchResults}
          addRecent={addRecent}
          logEvent={logEvent}
        />

        {/* Category Quick Selector Cards */}
        {showExplore && (
          <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Browse by Work Context</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">What are you working on?</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {categoryLinks.map(({ label, detail, icon: Icon, query: suggestedQuery, category: suggestedCategory }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => suggestedCategory ? chooseCategory(suggestedCategory) : handleQueryChange(suggestedQuery)}
                  className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 text-left transition.5 hover:border-accent-300 dark:hover:border-accent-600 hover:shadow-xs"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">{label}</span>
                    <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <CategoryExplorer query={query} category={category} setCategory={setCategory} chooseCategory={chooseCategory} categoryTools={categoryTools} addRecent={addRecent} favorites={favorites} toggleFavorite={toggleFavorite} />
        <RecentToolsSection showExplore={showExplore} recentTools={recentTools} addRecent={addRecent} />
        <PrivacySection />
        <SupportCheckoutSection />
        <CatalogCalloutSection />
      </main>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
