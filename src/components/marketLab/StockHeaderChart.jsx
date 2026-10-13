import { useRef, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { createChart } from 'lightweight-charts';

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
];

export function StockHeaderChart({ quote, history, range, onRangeChange }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const price = quote?.price;
  const change = quote?.change;
  const changePercent = quote?.changePct ?? quote?.change_percent;
  const isPositive = (change ?? 0) >= 0;

  const formattedPrice = useMemo(() => {
    if (price == null) return '—';
    return new Intl.NumberFormat(quote?.currency === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }, [price, quote?.currency]);

  const formattedChange = useMemo(() => {
    if (change == null) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${(changePercent ?? 0).toFixed(2)}%)`;
  }, [change, changePercent]);

  // Lightweight Charts Integration
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    if (!history || history.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      lineColor: isPositive ? '#10b981' : '#f43f5e',
      topColor: isPositive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
      bottomColor: isPositive ? 'rgba(16, 185, 129, 0.0)' : 'rgba(244, 63, 94, 0.0)',
      lineWidth: 2,
    });

    const formattedData = history
      .filter((h) => h && h.date && typeof h.close === 'number')
      .map((h) => ({
        time: h.date,
        value: h.close,
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    if (formattedData.length > 0) {
      areaSeries.setData(formattedData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [history, isPositive]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-8 shadow-sm">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>{quote?.currency || 'INR'}</span>
            <span>•</span>
            <span>{quote?.marketState || quote?.market_state || 'REGULAR'}</span>
            {quote?.symbol && (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-800 font-bold border border-stone-200">
                {quote.symbol}
              </span>
            )}
            {quote?.delayed && (
              <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                Delayed
              </span>
            )}
          </div>

          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {quote?.name || quote?.symbol || 'Stock Overview'}
          </h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              {quote?.currency === 'INR' ? '₹' : '$'}{formattedPrice}
            </span>
            {change != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-sm font-bold ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {formattedChange}
              </span>
            )}
          </div>
          {quote?.asOf && (
            <div className="mt-2 text-xs text-stone-500 flex items-center gap-1">
              <Clock size={12} /> as of {new Date(quote.asOf).toLocaleString()}
            </div>
          )}
        </div>

        {/* Range Toggle Buttons */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-1.5 shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange(r.value)}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                range === r.value
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Price Line Chart / Lightweight Charts container */}
      <div className="relative mt-6 pt-4 border-t border-stone-200">
        <div className="flex justify-between items-center text-xs text-stone-500 mb-2">
          <span className="font-semibold text-stone-700">Historical Price Track ({range.toUpperCase()})</span>
        </div>

        {history && history.length > 0 ? (
          <div ref={chartContainerRef} className="w-full h-[220px]" />
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
            <p className="font-medium text-stone-700">Historical price data is unavailable</p>
            <p className="text-xs text-stone-500 mt-1">No configured provider is supplying historical price data for this range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
