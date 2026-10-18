import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calculator, FileText, Image, Code2 } from 'lucide-react';
import { TOOLS } from '../data/toolCatalog';
import { logEvent } from '../lib/telemetry';

import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeHero } from '../components/toolsHome/ToolsHomeHero';
import { CategoryExplorer } from '../components/toolsHome/CategoryExplorer';
import { RecentToolsSection } from '../components/toolsHome/RecentToolsSection';
import { ToolCard } from '../components/toolsHome/ToolCard';
import { PrivacySection, CatalogCalloutSection, ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';

const intentMap = [
  { terms: ['salary', 'ctc', 'in hand', 'take home', 'take-home', 'hike', 'increment', 'offer', 'notice', 'experience'], slugs: ['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'] },
  { terms: ['emi', 'loan', 'interest', 'gst', 'sip', 'investment'], slugs: ['emi', 'gst', 'sip'] },
  { terms: ['json', 'jwt', 'base64', 'xml', 'markdown', 'timestamp', 'uuid', 'url', 'developer', 'api'], slugs: ['json-formatter', 'jwt-decoder', 'base64', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'unix-timestamp', 'uuid-generator', 'url-encoder'] },
  { terms: ['csv', 'xlsx', 'excel', 'spreadsheet'], slugs: ['csv-to-xlsx', 'xlsx-to-csv', 'json-to-xlsx', 'csv-to-pdf', 'csv-to-json'] },
  { terms: ['pdf', 'document'], slugs: ['pdf-workspace', 'pdf-merge', 'pdf-split', 'pdf-to-text', 'pdf-to-jpg', 'pdf-to-png', 'image-to-pdf', 'txt-to-pdf', 'pdf-compressor'] },
  { terms: ['image', 'jpg', 'jpeg', 'png', 'webp', 'photo', 'picture'], slugs: ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'image-resizer', 'image-compressor', 'image-metadata-remover', 'svg-to-png'] },
  { terms: ['timezone', 'time zone', 'world clock', 'pst', 'est', 'ist', 'utc', 'gmt', 'time difference', 'time-zone', 'clock', 'time'], slugs: ['timezone-converter', 'time-converter', 'unix-timestamp'] },
  { terms: ['convert', 'converter'], slugs: ['length-converter', 'weight-converter', 'temperature-converter', 'time-converter', 'timezone-converter'] },
  { terms: ['percentage', 'percent', '%'], slugs: ['percentage'] }
];

const featuredSlugs = ['ctc-to-inhand', 'emi', 'pdf-workspace', 'jpg-to-png', 'json-formatter', 'percentage', 'gratuity-calculator', 'timezone-converter'];
const categoryLinks = [
  { label: 'Documents', detail: 'PDF and file tools', icon: FileText, query: 'PDF' },
  { label: 'Images', detail: 'Convert and resize', icon: Image, query: 'image' },
  { label: 'Calculators', detail: 'Money and everyday math', icon: Calculator, category: 'Finance' },
  { label: 'Developer tools', detail: 'Format and transform data', icon: Code2, category: 'Developer' }
];

export default function ToolsHome() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [category, setCategory] = useState(null);

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
    logEvent('category.explored', { category: name });
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\\s+/).filter(Boolean);
    const direct = TOOLS.filter(tool => {
      const haystack = [tool.name, tool.description, tool.category, tool.slug, tool.slug.replace(/-/g, ' ')].join(' ').toLowerCase();
      return tokens.every(token => haystack.includes(token));
    });
    const intentSlugs = intentMap.filter(group => group.terms.some(term => q.includes(term))).flatMap(group => group.slugs);
    const merged = [...direct, ...intentSlugs.map(slug => TOOLS.find(t => t.slug === slug))].filter(Boolean);
    return [...new Map(merged.map(tool => [tool.slug, tool])).values()].slice(0, 8);
  }, [query]);

  const categoryTools = useMemo(() => category ? TOOLS.filter(tool => tool.category === category).slice(0, 10) : [], [category]);
  const featuredTools = featuredSlugs.map(slug => TOOLS.find(tool => tool.slug === slug)).filter(Boolean);
  const recentTools = recent.map(slug => TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4);
  const showExplore = !query.trim() && !category;

  return (
    <div className="orbit-light min-h-screen bg-[#fbf8f3] text-stone-800">
      <ToolsHomeHeader visitorCount={visitorCount} />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6">
        <ToolsHomeHero query={query} setQuery={setQuery} setCategory={setCategory} searchResults={searchResults} addRecent={addRecent} logEvent={logEvent} />

        {!query.trim() && !category && (
          <>
            <section className="mx-auto max-w-6xl pb-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Jump right in</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Popular tools</h2>
                </div>
                <a href="/tools" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">All tools <ArrowRight size={15} /></a>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {featuredTools.map(tool => <ToolCard key={tool.slug} tool={tool} onUse={addRecent} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} />)}
              </div>
            </section>
            <section className="mx-auto max-w-6xl border-t border-stone-200 py-7">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Browse by category</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">What are you working on?</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {categoryLinks.map(({ label, detail, icon: Icon, query: suggestedQuery, category: suggestedCategory }) => (
                  <button key={label} type="button" onClick={() => suggestedCategory ? chooseCategory(suggestedCategory) : setQuery(suggestedQuery)} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-sm sm:p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={20} /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold text-stone-900">{label}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{detail}</span></span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <CategoryExplorer query={query} category={category} setCategory={setCategory} chooseCategory={chooseCategory} categoryTools={categoryTools} addRecent={addRecent} favorites={favorites} toggleFavorite={toggleFavorite} />
        <RecentToolsSection showExplore={showExplore} recentTools={recentTools} addRecent={addRecent} />
        <PrivacySection />
        <CatalogCalloutSection />
      </main>
      <ToolsHomeFooter />
    </div>
  );
}
