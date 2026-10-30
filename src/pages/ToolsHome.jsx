import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Code2, Coins, BriefcaseBusiness, TrendingUp } from 'lucide-react';
import { LISTED_TOOLS } from '../data/toolCatalog';
import { logEvent } from '../lib/telemetry';

import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeHero } from '../components/toolsHome/ToolsHomeHero';
import { BusinessWorkspacesHero } from '../components/toolsHome/BusinessWorkspacesHero';
import { CategoryExplorer } from '../components/toolsHome/CategoryExplorer';
import { RecentToolsSection } from '../components/toolsHome/RecentToolsSection';
import { PrivacySection, CatalogCalloutSection, SupportCheckoutSection, ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

const intentMap = [
  { terms: ['reconcile', 'reconciliation', 'brs', 'statement', 'cash book', 'cheque', 'ledger'], slugs: ['bank-reconciliation', 'invoice-aging-report'] },
  { terms: ['salary', 'ctc', 'in hand', 'take home', 'take-home', 'hike', 'increment', 'offer', 'notice', 'experience'], slugs: ['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'] },
  { terms: ['emi', 'loan', 'interest', 'gst', 'sip', 'investment', 'invoice', 'bill', 'tax invoice'], slugs: ['gst-invoice-generator', 'bank-reconciliation', 'emi', 'gst', 'sip'] },
  { terms: ['json', 'jwt', 'base64', 'xml', 'markdown', 'timestamp', 'uuid', 'url', 'developer', 'api'], slugs: ['json-formatter', 'jwt-decoder', 'base64', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'unix-timestamp', 'uuid-generator', 'url-encoder'] },
  { terms: ['csv', 'xlsx', 'excel', 'spreadsheet', 'data processor', 'clean data'], slugs: ['excel-engine', 'csv-to-xlsx', 'xlsx-to-csv', 'json-to-xlsx', 'csv-to-pdf', 'csv-to-json'] },
  { terms: ['pdf', 'document'], slugs: ['pdf-workspace', 'pdf-merge', 'pdf-split', 'pdf-to-text', 'pdf-to-jpg', 'pdf-to-png', 'image-to-pdf', 'txt-to-pdf', 'pdf-compressor'] },
  { terms: ['image', 'jpg', 'jpeg', 'png', 'webp', 'photo', 'picture'], slugs: ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'image-resizer', 'image-compressor', 'image-metadata-remover', 'svg-to-png'] },
  { terms: ['timezone', 'time zone', 'world clock', 'pst', 'est', 'ist', 'utc', 'gmt', 'time difference', 'time-zone', 'clock', 'time'], slugs: ['timezone-converter', 'time-converter', 'unix-timestamp'] },
  { terms: ['convert', 'converter'], slugs: ['length-converter', 'weight-converter', 'temperature-converter', 'time-converter', 'timezone-converter'] },
  { terms: ['percentage', 'percent', '%'], slugs: ['percentage'] }
];

const categoryCards = [
  { category: 'Finance', label: 'Finance & Money', detail: 'Taxes, EMI, GST, loans & calculators', icon: Coins },
  { category: 'Career', label: 'Career & Salary', detail: 'CTC, hikes, notice & offer comparisons', icon: BriefcaseBusiness },
  { category: 'Developer', label: 'Developer Tools', detail: 'JSON, JWT, Base64, XML & diff checker', icon: Code2 },
  { category: 'Everyday', label: 'Everyday Utilities', detail: 'PDFs, converters, images & GIF tools', icon: Calculator },
  { category: 'Business', label: 'Business & SaaS', detail: 'Reconciliation, GST, Excel engine & SaaS metrics', icon: TrendingUp },
];

export default function ToolsHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || null;

  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory);
  const [prevUrlCategory, setPrevUrlCategory] = useState(urlCategory);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  if (urlCategory !== prevUrlCategory) {
    setPrevUrlCategory(urlCategory);
    setCategory(urlCategory);
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

  const handleCategoryCardClick = (targetCat) => {
    // If currently selected, toggle off (back to all)
    if (category === targetCat) {
      chooseCategory(null);
    } else {
      chooseCategory(targetCat);
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
  const showExploreCards = !query.trim();

  return (
    <div className="orbit-light min-h-screen flex bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors">
      <QuickAccessLeftSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <ToolsHomeHeader visitorCount={visitorCount} onSelectCategory={chooseCategory} />

        <main className="mx-auto w-full max-w-[1440px] px-3 pb-8 sm:px-6">
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

          {/* Task-Based Business & Financial Workspaces */}
          {showExploreCards && !category && (
            <BusinessWorkspacesHero />
          )}

          {/* Category Quick Selector Cards (Persistent & Click-to-Switch/Toggle) */}
          {showExploreCards && (
            <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-6 sm:py-8">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Browse by Work Context</p>
                  <h2 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                    What are you working on?
                  </h2>
                </div>
                {category && (
                  <button
                    type="button"
                    onClick={() => chooseCategory(null)}
                    className="self-start sm:self-auto text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline"
                  >
                    Clear filter (Show All)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {categoryCards.map(({ category: catName, label, detail, icon: Icon }) => {
                  const isActive = category === catName;
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => handleCategoryCardClick(catName)}
                      className={`group flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-150 ${
                        isActive
                          ? 'border-accent-500 bg-accent-50/80 dark:bg-accent-950/50 ring-2 ring-accent-400/40 shadow-xs'
                          : 'border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:border-accent-300 dark:hover:border-accent-600 hover:shadow-2xs'
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-accent-600 text-white'
                          : 'bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300 group-hover:bg-accent-100 dark:group-hover:bg-accent-900'
                      }`}>
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-1">
                          <span className={`block text-xs sm:text-sm font-semibold truncate ${
                            isActive ? 'text-accent-800 dark:text-accent-300 font-bold' : 'text-stone-900 dark:text-stone-100'
                          }`}>
                            {label}
                          </span>
                          {isActive && (
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300 bg-accent-100 dark:bg-accent-900/60 px-1.5 py-0.5 rounded-md">
                              Active
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-tight text-stone-500 dark:text-stone-400 line-clamp-2">
                          {detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active Category Tools View */}
          <CategoryExplorer
            query={query}
            category={category}
            setCategory={setCategory}
            chooseCategory={chooseCategory}
            categoryTools={categoryTools}
            addRecent={addRecent}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />

          {/* Recent Tools (shown on general exploration) */}
          {!category && !query.trim() && (
            <RecentToolsSection showExplore={true} recentTools={recentTools} addRecent={addRecent} />
          )}

          <PrivacySection />
          <SupportCheckoutSection />
          <CatalogCalloutSection />
        </main>

        <ToolsHomeFooter />
      </div>
    </div>
  );
}
