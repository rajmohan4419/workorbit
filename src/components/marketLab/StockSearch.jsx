import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, X } from 'lucide-react';

const SUGGESTIONS = [
  { symbol: 'INFY.NS', name: 'Infosys Ltd' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
];

export function StockSearch({ onSelectSymbol, currentSymbol }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('[StockSearch error]', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onSelectSymbol(item.symbol, item.name);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (!val.trim()) {
      setResults([]);
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search stock by name or ticker (e.g. INFY, Reliance, AAPL)..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3.5 pl-12 pr-10 text-sm sm:text-base text-white placeholder-slate-500 shadow-xl backdrop-blur transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-400" size={18} />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (query.trim().length > 0 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl backdrop-blur">
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-400" /> Searching market listings...
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between rounded-xl p-3 text-left transition hover:bg-violet-950/40 hover:border-violet-500/30 border border-transparent"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {item.symbol}
                    {item.exchange && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                        {item.exchange}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-1">{item.name}</div>
                </div>
                <TrendingUp size={16} className="text-slate-600 group-hover:text-violet-400" />
              </button>
            ))
          ) : !loading && query.trim() ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No matching stocks found for "{query}".
            </div>
          ) : null}
        </div>
      )}

      {/* Popular suggestions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="text-slate-500 font-medium">Quick search:</span>
        {SUGGESTIONS.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => handleSelect(item)}
            className={`rounded-full border px-2.5 py-1 transition ${
              currentSymbol === item.symbol
                ? 'border-violet-500 bg-violet-950/60 text-violet-300 font-bold'
                : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            {item.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
