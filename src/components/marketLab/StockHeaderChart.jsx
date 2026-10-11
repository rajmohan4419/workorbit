import { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
];

export function StockHeaderChart({ quote, history, range, onRangeChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const price = quote?.price;
  const change = quote?.change;
  const changePercent = quote?.change_percent;
  const isPositive = (change ?? 0) >= 0;

  const formattedPrice = useMemo(() => {
    if (price == null) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }, [price]);

  const formattedChange = useMemo(() => {
    if (change == null) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${(changePercent ?? 0).toFixed(2)}%)`;
  }, [change, changePercent]);

  // Compute SVG line path coordinates
  const { pathD, areaD, points, minVal, maxVal } = useMemo(() => {
    if (!history || history.length < 2) {
      return { pathD: '', areaD: '', points: [], minVal: 0, maxVal: 0 };
    }

    const closes = history.map((h) => h.close).filter((c) => c != null);
    if (closes.length < 2) {
      return { pathD: '', areaD: '', points: [], minVal: 0, maxVal: 0 };
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const rangeVal = max - min || 1;

    const width = 800;
    const height = 220;
    const padding = 20;

    const pts = history.map((item, idx) => {
      const x = padding + (idx / (history.length - 1)) * (width - 2 * padding);
      const y =
        height -
        padding -
        ((item.close - min) / rangeVal) * (height - 2 * padding);
      return { x, y, date: item.date, close: item.close };
    });

    const dStr = pts.reduce(
      (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      ''
    );

    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const aStr = `${dStr} L ${lastPt.x.toFixed(1)} ${height} L ${firstPt.x.toFixed(1)} ${height} Z`;

    return { pathD: dStr, areaD: aStr, points: pts, minVal: min, maxVal: max };
  }, [history]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-8 shadow-2xl backdrop-blur">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>{quote?.currency || 'USD'}</span>
            <span>•</span>
            <span>{quote?.market_state || 'REGULAR'}</span>
            {quote?.symbol && (
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-violet-300 font-bold">
                {quote.symbol}
              </span>
            )}
          </div>

          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
            {quote?.name || quote?.symbol}
          </h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {quote?.currency === 'INR' ? '₹' : '$'}{formattedPrice}
            </span>
            {change != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-sm font-bold ${
                  isPositive
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                }`}
              >
                {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {formattedChange}
              </span>
            )}
          </div>
        </div>

        {/* Range Toggle Buttons */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-1.5 shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange(r.value)}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                range === r.value
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
          <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Day Range</span>
          <span className="mt-1 font-bold text-slate-200 block">
            {quote?.day_range?.low != null ? `${quote.day_range.low} - ${quote.day_range.high}` : 'Not available'}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
          <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">52-Wk Range</span>
          <span className="mt-1 font-bold text-slate-200 block">
            {quote?.fifty_two_week_range?.low != null ? `${quote.fifty_two_week_range.low} - ${quote.fifty_two_week_range.high}` : 'Not available'}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
          <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Volume</span>
          <span className="mt-1 font-bold text-slate-200 block">
            {quote?.volume != null ? quote.volume.toLocaleString() : 'Not available'}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
          <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Market Cap</span>
          <span className="mt-1 font-bold text-slate-200 block">
            {quote?.market_cap != null ? `${(quote.market_cap / 1e9).toFixed(2)}B` : 'Not available'}
          </span>
        </div>
      </div>

      {/* SVG Price Line Chart */}
      <div className="relative mt-6 pt-4 border-t border-slate-800/60">
        <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-400">Historical Price Track ({range.toUpperCase()})</span>
          {activePoint && (
            <span className="font-bold text-violet-300 bg-violet-950/60 border border-violet-800/50 rounded-lg px-2.5 py-1 flex items-center gap-2">
              <Clock size={12} /> {activePoint.date}: {quote?.currency === 'INR' ? '₹' : '$'}{activePoint.close}
            </span>
          )}
        </div>

        {points.length > 1 ? (
          <div className="relative w-full h-[220px]">
            <svg
              viewBox="0 0 800 220"
              className="w-full h-full overflow-visible"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="chartGradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartGradientRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              <path
                d={areaD}
                fill={isPositive ? 'url(#chartGradientGreen)' : 'url(#chartGradientRed)'}
              />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover targets & indicator */}
              {points.map((pt, idx) => (
                <g key={pt.date || idx}>
                  <rect
                    x={pt.x - 8}
                    y={0}
                    width={16}
                    height={220}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                  {hoverIndex === idx && (
                    <g>
                      <line
                        x1={pt.x}
                        y1={0}
                        x2={pt.x}
                        y2={220}
                        stroke="#a78bfa"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
            Historical price chart unavailable for this symbol/range.
          </div>
        )}
      </div>
    </div>
  );
}
