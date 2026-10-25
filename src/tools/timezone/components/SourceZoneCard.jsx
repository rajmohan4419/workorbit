import { Clock, Calendar, RotateCcw } from 'lucide-react';

export default function SourceZoneCard({
  sourceZone,
  setSourceZone,
  sourceDate,
  setSourceDate,
  sourceTime,
  setSourceTime,
  timezones,
  onResetToNow,
  formattedSourceTime
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Clock size={16} className="text-accent-400" />
          Source Timezone & Date
        </div>
        <button
          type="button"
          onClick={onResetToNow}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 bg-accent-950/40 border border-accent-800/40 px-2.5 py-1 rounded-lg transition"
        >
          <RotateCcw size={12} /> Set to Now
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Source Time Zone</label>
          <select
            value={sourceZone}
            onChange={e => setSourceZone(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          >
            {timezones.map(tz => (
              <option key={tz.id} value={tz.id}>
                {tz.name} ({tz.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <div className="relative">
            <input
              type="date"
              value={sourceDate}
              onChange={e => setSourceDate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
            />
            <Calendar size={15} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
          <input
            type="time"
            value={sourceTime}
            onChange={e => setSourceTime(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-accent-500/30 bg-accent-950/20 px-4 py-3 flex items-center justify-between text-xs text-accent-300">
        <span className="font-semibold">Source Time:</span>
        <span className="font-mono text-sm text-white">{formattedSourceTime}</span>
      </div>
    </div>
  );
}
