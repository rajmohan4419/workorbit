import { useState, useEffect } from 'react';
import { searchMedia, getTrending } from './lib/services/ottService';
import MediaCard from './components/MediaCard';

export default function App() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('trending');

  // Load trending on mount
  useEffect(() => {
    if (activeTab === 'trending' && !query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getTrending().then(data => {
        setItems(data);
        setLoading(false);
      });
    }
  }, [activeTab, query]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const results = await searchMedia(query);
    setItems(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              ORBIT BOARD
            </span>
            <span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/20">
              RADAR • IN
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Real-time Indian OTT availability tracker</p>
        </div>
      </header>

      {/* Hero & Search */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Where is it streaming?
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Instant platform lookup across Hotstar, Netflix, Prime Video, SonyLIV, and Zee5.
          </p>

          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search movie, web series, or anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-full px-5 py-3.5 pr-28 text-sm focus:outline-none focus:border-violet-500 transition shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-xs font-semibold transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results Grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {query ? `Search Results for "${query}"` : "Today's Trending in India"}
          </h2>
          {query && (
            <button
              onClick={() => { setQuery(''); setActiveTab('trending'); }}
              className="text-xs text-violet-400 hover:underline"
            >
              Reset to Trending
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-slate-900 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm">No titles found. Try searching for something else.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Orbit Board • Streaming data powered by TMDB & JustWatch
      </footer>
    </div>
  );
}
