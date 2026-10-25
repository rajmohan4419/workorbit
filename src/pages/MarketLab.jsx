import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import SEO from '../components/layout/SEO';
import { StockSearch } from '../components/marketLab/StockSearch';
import { StockHeaderChart } from '../components/marketLab/StockHeaderChart';
import { StockNewsEventsAnalysis } from '../components/marketLab/StockNewsEventsAnalysis';

export default function MarketLab() {
  const { symbol: routeSymbol } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySymbol = searchParams.get('symbol');

  const activeSymbol = (routeSymbol || querySymbol || 'INFY.NS').toUpperCase();

  const [selectedSymbol, setSelectedSymbol] = useState(activeSymbol);
  const [range, setRange] = useState('1y');
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const currentSymbol = routeSymbol ? routeSymbol.toUpperCase() : selectedSymbol;

  // Fetch stock overview data
  useEffect(() => {
    let active = true;
    if (!currentSymbol) return;

    async function fetchData() {
      setStockLoading(true);
      setStockError(null);
      try {
        const res = await fetch(
          `/api/market/stock?symbol=${encodeURIComponent(currentSymbol)}&range=${encodeURIComponent(range)}`
        );
        const data = await res.json().catch(() => ({}));

        if (active) {
          if (!res.ok && data.code === 'PROVIDER_UNAVAILABLE') {
            setStockData(data); // Display provider unavailable UI gracefully
            setStockError('Market data provider is unconfigured in Phase 1.');
          } else if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch stock data');
          } else {
            setStockData(data);
          }
        }
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
  }, [currentSymbol, range, reloadTrigger]);

  // Fetch AI analysis
  useEffect(() => {
    let active = true;
    if (!currentSymbol) return;

    async function fetchAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisData(null);
      try {
        const res = await fetch('/api/market/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: currentSymbol }),
        });
        const data = await res.json().catch(() => ({}));

        if (active) {
          if (!res.ok && data.code === 'PROVIDER_UNAVAILABLE') {
            setAnalysisError('AI analysis is unavailable because underlying market data provider is unconfigured.');
          } else if (!res.ok) {
            throw new Error(data.error || 'Failed to generate AI analysis');
          } else {
            setAnalysisData(data);
          }
        }
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
  }, [currentSymbol, reloadTrigger]);

  const handleSelectSymbol = (symbol) => {
    const upper = symbol.toUpperCase();
    setSelectedSymbol(upper);
    setSearchParams({ symbol: upper });
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  const handleRetry = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  return (
    <div className="orbit-light min-h-screen bg-[#fbf8f3] text-stone-800 font-sans">
      <SEO
        title={`${currentSymbol} Research & Evidence | OrbitBoard Market Lab`}
        description={`Research current metrics, historical close performance, news, events, and objective evidence-based summaries for ${currentSymbol}.`}
        canonical={`https://orbitboard.in/market-lab/${currentSymbol}`}
        noindex={true}
      />

      <header className="sticky top-0 z-30 border-b border-[#e7dfd3] bg-[#fbf8f3]/95 backdrop-blur">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-stone-900">
            ORBIT<span className="text-accent-600">BOARD</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/market-lab" className="text-sm font-semibold text-stone-700 hover:text-stone-900">
              Market Lab
            </Link>
            <Link to="/tools" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
              All tools
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>

        {/* Hero / Search Section */}
        <div className="mt-6 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3.5 py-1.5 text-xs font-bold text-accent-800">
            AI Stock Research Assistant
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-stone-900">
            Evidence-based stock research.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600">
            Look up stock quotes, historical performance, news, corporate events, and objective AI research summaries without price targets or advice.
          </p>

          <div className="mt-8">
            <StockSearch onSelectSymbol={handleSelectSymbol} currentSymbol={currentSymbol} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mt-10">
          {stockLoading ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-4 min-h-[300px] shadow-sm">
              <Loader2 size={32} className="animate-spin text-accent-600" />
              <p className="text-sm font-semibold">Loading research data for {currentSymbol}...</p>
            </div>
          ) : stockError && !stockData ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 max-w-xl mx-auto shadow-sm">
              <AlertCircle size={32} className="mx-auto text-rose-600 mb-3" />
              <h2 className="text-lg font-bold">Failed to load market data</h2>
              <p className="mt-2 text-xs sm:text-sm text-rose-700">{stockError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white border border-rose-300 px-4 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100/50 shadow-sm"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : stockData ? (
            <div>
              {/* Header Quote & Chart */}
              <StockHeaderChart
                quote={stockData.quote}
                history={stockData.history}
                range={range}
                onRangeChange={handleRangeChange}
                dataAvailability={stockData.data_availability}
              />

              {/* Calculated Stats Panel */}
              {stockData.stats && (
                <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
                    <h2 className="text-lg font-black text-stone-900">Deterministic Key Statistics</h2>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
                      Calculated
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs sm:text-sm">
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">1-Month Return</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.return_1m !== null ? `${stockData.stats.return_1m}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">6-Month Return</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.return_6m !== null ? `${stockData.stats.return_6m}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">1-Year Return</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.return_1y !== null ? `${stockData.stats.return_1y}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">52-Wk Range Pos</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.range_52w_position !== null ? `${stockData.stats.range_52w_position}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">Annualized Vol</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.annualized_volatility !== null ? `${stockData.stats.annualized_volatility}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">Max Drawdown</span>
                      <span className="mt-1 font-extrabold text-stone-900 block">
                        {stockData.stats.max_drawdown !== null ? `${stockData.stats.max_drawdown}%` : 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Research Panels */}
              <StockNewsEventsAnalysis
                news={stockData.news}
                events={stockData.events}
                analysis={analysisData}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
                onRetryAnalysis={handleRetry}
              />
            </div>
          ) : (
            <div className="text-center text-sm text-stone-500 py-12">
              Select or search a stock ticker above to view research data.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
