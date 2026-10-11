import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { TOOLS } from '../data/toolCatalog';
import { logEvent } from '../lib/telemetry';

import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { AsianGamesBanner } from '../components/toolsHome/AsianGamesBanner';
import { ToolsHomeHero } from '../components/toolsHome/ToolsHomeHero';
import { CategoryExplorer } from '../components/toolsHome/CategoryExplorer';
import { RecentToolsSection } from '../components/toolsHome/RecentToolsSection';
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

  useEffect(() => {
    localStorage.setItem('orbitboard:favorites', JSON.stringify(favorites));
  }, [favorites]);

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
    logEvent('category.explored', { category: name });
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const direct = TOOLS.filter(tool => {
      const haystack = [tool.name, tool.description, tool.category, tool.slug, tool.slug.replace(/-/g, ' ')].join(' ').toLowerCase();
      return tokens.every(token => haystack.includes(token));
    });
    const intentSlugs = intentMap.filter(group => group.terms.some(term => q.includes(term))).flatMap(group => group.slugs);
    const merged = [...direct, ...intentSlugs.map(slug => TOOLS.find(t => t.slug === slug))].filter(Boolean);
    return [...new Map(merged.map(tool => [tool.slug, tool])).values()].slice(0, 8);
  }, [query]);

  const categoryTools = useMemo(
    () => category ? TOOLS.filter(tool => tool.category === category).slice(0, 10) : [],
    [category]
  );

  const recentTools = recent.map(slug => TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4);
  const showExplore = !query.trim() && !category;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ToolsHomeHeader visitorCount={visitorCount} />

      <main className="px-4 sm:px-6">
        <AsianGamesBanner />

        <section className="relative py-10 sm:py-12 overflow-hidden rounded-b-[2.5rem]">
          <ToolsHomeHero
            query={query}
            setQuery={setQuery}
            setCategory={setCategory}
            searchResults={searchResults}
            addRecent={addRecent}
            logEvent={logEvent}
          />

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

          <RecentToolsSection
            showExplore={showExplore}
            recentTools={recentTools}
            addRecent={addRecent}
          />
        </section>

        <PrivacySection />
        <CatalogCalloutSection />
      </main>

      <ToolsHomeFooter />
    </div>
  );
}
