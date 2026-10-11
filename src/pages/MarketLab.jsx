import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/layout/SEO';
import { StockSearch } from '../components/marketLab/StockSearch';
import { StockHeaderChart } from '../components/marketLab/StockHeaderChart';
import { StockNewsEventsAnalysis } from '../components/marketLab/StockNewsEventsAnalysis';

export default function MarketLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol') || 'INFY.NS';

  const [selectedSymbol, setSelectedSymbol] = useState(symbolParam);
  const [range, setRange] = useState('1y');

  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Trigger data load & analysis when selectedSymbol or range changes
  useEffect(() => {
    let active = true;
    if (!selectedSymbol) return;

    async function fetchData() {
      setStockLoading(true);
      setStockError(null);
      try {
        const res = await fetch(
          `/api/market/stock?symbol=${encodeURIComponent(selectedSymbol)}&range=${encodeURIComponent(range)}`
        );
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to fetch stock data');
        }
        const data = await res.json();
        if (active) setStockData(data);
      } catch (err) {
        console.error('[MarketLab stock fetch error]', err);
        if (active) setStockError(err.message || 'Unable to load stock information.');
      } finally {
        if (active) setStockLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [selectedSymbol, range]);

  useEffect(() => {
    let active = true;
    if (!selectedSymbol) return;

    async function fetchAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisData(null);
      try {
        const res = await fetch('/api/market/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: selectedSymbol }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to generate AI analysis');
        }
        const data = await res.json();
        if (active) setAnalysisData(data);
      } catch (err) {
        console.error('[MarketLab analysis error]', err);
        if (active) setAnalysisError(err.message || 'AI analysis unavailable at this time.');
      } finally {
        if (active) setAnalysisLoading(false);
      }
    }

    fetchAnalysis();

    return () => {
      active = false;
    };
  }, [selectedSymbol]);

  const handleSelectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
    setSearchParams({ symbol });
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  const handleRetry = () => {
    // Force reload
    setSelectedSymbol((prev) => prev);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO
        title="Market Lab | AI Stock Research Assistant | OrbitBoard"
        description="Search stocks for current price, historical data, news, company events, and objective AI research summaries with OrbitBoard Market Lab."
        canonical="https://orbitboard.in/market-lab"
      />

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white">
            ORBIT<span className="text-violet-400">BOARD</span>
          </Link>
          <Link to="/tools" className="text-sm font-semibold text-slate-400 hover:text-white">
            All tools
          </Link>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
            <ArrowLeft size={16} /> OrbitBoard home
          </Link>
        </div>

        {/* Hero Section */}
        <div className="mt-6 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-800/70 bg-violet-950/60 px-3.5 py-1.5 text-xs font-bold text-violet-300">
            AI Stock Research Assistant
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-white">
            Research stocks with AI, without the noise.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Look up live quotes, historical performance, latest news, and objective AI summaries synthesized purely from public data.
          </p>

          <div className="mt-8">
            <StockSearch onSelectSymbol={handleSelectSymbol} currentSymbol={selectedSymbol} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mt-10">
          {stockLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-4 min-h-[300px]">
              <Loader2 size={32} className="animate-spin text-violet-400" />
              <p className="text-sm font-semibold">Loading stock market data for {selectedSymbol}...</p>
            </div>
          ) : stockError ? (
            <div className="rounded-3xl border border-rose-900/60 bg-rose-950/20 p-8 text-center text-rose-300 max-w-xl mx-auto">
              <AlertCircle size={32} className="mx-auto text-rose-400 mb-3" />
              <h2 className="text-lg font-bold">Failed to load market data</h2>
              <p className="mt-2 text-xs sm:text-sm text-rose-300/80">{stockError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-900/60 border border-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : stockData ? (
            <div>
              <StockHeaderChart
                quote={stockData.quote}
                history={stockData.history}
                range={range}
                onRangeChange={handleRangeChange}
              />

              <StockNewsEventsAnalysis
                news={stockData.news}
                events={stockData.events}
                analysis={analysisData}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
              />

              {/* Mandatory Disclaimer */}
              <div className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-950/30 p-4 text-xs sm:text-sm text-amber-200/90 text-center font-medium">
                Educational research summary generated by AI from public data. Not investment advice or a recommendation. Data may be delayed or incomplete.
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-500 py-12">
              Select or search a stock ticker above to view research data.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
