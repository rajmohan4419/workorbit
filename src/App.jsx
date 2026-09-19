import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { searchMedia, getTrending } from './lib/services/ottService';
import MediaCard from './components/MediaCard';
import ToolsHome from './pages/ToolsHome';
import ToolPage from './pages/ToolPage';

const PLATFORMS = ['All', 'Netflix', 'JioHotstar', 'Amazon Prime Video', 'SonyLIV', 'Zee5'];

function RadarHome() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('All');

  useEffect(() => {
    let isMounted = true;
    if (!query.trim()) {
      getTrending().then(data => { if (isMounted) { setItems(data); setLoading(false); } });
      return () => { isMounted = false; };
    }
    const timer = setTimeout(async () => {
      const results = await searchMedia(query);
      if (isMounted) { setItems(results); setLoading(false); }
    }, 400);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [query]);

  const handleQueryChange = e => { setQuery(e.target.value); setLoading(true); };
  const handleClearQuery = () => { setQuery(''); setLoading(true); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800/80 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">ORBIT BOARD</span>
            <span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/20">RADAR • IN</span>
          </Link>
          <Link to="/tools" className="text-xs font-semibold text-slate-300 hover:text-violet-300">Free Tools →</Link>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Where is it streaming?</h1>
          <p className="text-sm text-slate-400 mb-6">Instant platform lookup across Hotstar, Netflix, Prime Video, SonyLIV, and Zee5.</p>
          <form onSubmit={e => e.preventDefault()} className="relative flex items-center">
            <input type="text" placeholder="Search movie, web series, or anime..." value={query} onChange={handleQueryChange} className="w-full bg-slate-900 border border-slate-800 rounded-full px-5 py-3.5 pr-28 text-sm focus:outline-none focus:border-violet-500 transition shadow-inner text-slate-100 placeholder-slate-500" />
            {query && <button type="button" onClick={handleClearQuery} className="absolute right-3 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">Clear</button>}
          </form>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{query.trim() ? `Search Results for "${query}"` : "Today's Trending in India"}</h2>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {PLATFORMS.map(platform => <button key={platform} onClick={() => setSelectedPlatform(platform)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${selectedPlatform === platform ? 'bg-violet-600 text-white border-violet-500 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}>{platform}</button>)}
          </div>
        </div>
        {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{[...Array(10)].map((_, i) => <div key={i} className="aspect-[2/3] bg-slate-900 animate-pulse rounded-xl" />)}</div>
          : items.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{items.map(item => <MediaCard key={item.id} item={item} selectedPlatform={selectedPlatform} />)}</div>
          : <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl"><p className="text-slate-500 text-sm">No titles found. Try searching for something else.</p></div>}
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">Orbit Board • Streaming data powered by TMDB & JustWatch</footer>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<RadarHome />} /><Route path="/tools" element={<ToolsHome />} /><Route path="/tools/:slug" element={<ToolPage />} /></Routes></BrowserRouter>;
}
