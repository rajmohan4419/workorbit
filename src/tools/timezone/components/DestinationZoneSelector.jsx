import { Globe, Search } from 'lucide-react';

export default function DestinationZoneSelector({
  selectedDestinations,
  sourceZone,
  filteredZones,
  filterQuery,
  setFilterQuery,
  onSelectAll,
  onDeselectAll,
  onToggleDestination
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Globe size={16} className="text-violet-400" />
          Compare Destination Time Zones ({selectedDestinations.length} selected)
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-800 hover:border-slate-700"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-800 hover:border-slate-700"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Filter destination search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder="Search destination time zones or cities..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
        />
      </div>

      {/* Checkbox grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {filteredZones.map(tz => {
          const isChecked = selectedDestinations.includes(tz.id);
          const isSource = tz.id === sourceZone;

          return (
            <label
              key={tz.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                isSource
                  ? 'border-violet-500/40 bg-violet-950/30 opacity-70 cursor-not-allowed'
                  : isChecked
                  ? 'border-violet-500/60 bg-slate-900 text-white'
                  : 'border-slate-800/80 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                disabled={isSource}
                checked={isChecked}
                onChange={() => onToggleDestination(tz.id)}
                className="rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-semibold truncate">{tz.name}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {tz.city} {isSource ? '(Source)' : ''}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
