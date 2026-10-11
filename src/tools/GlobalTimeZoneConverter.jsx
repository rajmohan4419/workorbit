import { useState, useMemo, useCallback } from 'react';
import { Clock, Copy, Check, Calendar, ArrowRight, RotateCcw, Globe, Search } from 'lucide-react';

const TIMEZONES = [
  { id: 'Asia/Kolkata', name: 'India Standard Time (IST)', city: 'Kolkata / New Delhi', region: 'Asia / India' },
  { id: 'America/New_York', name: 'US Eastern Time (ET)', city: 'New York / Washington', region: 'North America / US' },
  { id: 'America/Chicago', name: 'US Central Time (CT)', city: 'Chicago / Dallas', region: 'North America / US' },
  { id: 'America/Denver', name: 'US Mountain Time (MT)', city: 'Denver / Phoenix', region: 'North America / US' },
  { id: 'America/Los_Angeles', name: 'US Pacific Time (PT)', city: 'Los Angeles / San Francisco', region: 'North America / US' },
  { id: 'UTC', name: 'Coordinated Universal Time (UTC)', city: 'UTC / GMT', region: 'Universal' },
  { id: 'Europe/London', name: 'UK / London (GMT/BST)', city: 'London', region: 'Europe / UK' },
  { id: 'Europe/Berlin', name: 'Central European Time (CET/CEST)', city: 'Berlin / Frankfurt', region: 'Europe / Germany' },
  { id: 'Europe/Paris', name: 'France / Paris (CET/CEST)', city: 'Paris', region: 'Europe / France' },
  { id: 'Europe/Zurich', name: 'Switzerland / Zurich', city: 'Zurich', region: 'Europe / Switzerland' },
  { id: 'Asia/Dubai', name: 'Gulf Standard Time (GST)', city: 'Dubai / Abu Dhabi', region: 'Middle East / UAE' },
  { id: 'Asia/Riyadh', name: 'Arabia Standard Time (AST)', city: 'Riyadh', region: 'Middle East / Saudi Arabia' },
  { id: 'Asia/Singapore', name: 'Singapore Standard Time (SGT)', city: 'Singapore', region: 'Asia / Singapore' },
  { id: 'Asia/Tokyo', name: 'Japan Standard Time (JST)', city: 'Tokyo', region: 'Asia / Japan' },
  { id: 'Asia/Hong_Kong', name: 'Hong Kong Time (HKT)', city: 'Hong Kong', region: 'Asia / Hong Kong' },
  { id: 'Asia/Shanghai', name: 'China Standard Time (CST)', city: 'Shanghai / Beijing', region: 'Asia / China' },
  { id: 'Asia/Bangkok', name: 'Indochina Time (ICT)', city: 'Bangkok', region: 'Asia / Thailand' },
  { id: 'Australia/Sydney', name: 'Australian Eastern Time (AEST/AEDT)', city: 'Sydney / Canberra', region: 'Australia' },
  { id: 'Australia/Melbourne', name: 'Australian Eastern Time (AEST/AEDT)', city: 'Melbourne', region: 'Australia' },
  { id: 'Pacific/Auckland', name: 'New Zealand Time (NZST/NZDT)', city: 'Auckland / Wellington', region: 'Pacific / New Zealand' },
  { id: 'America/Toronto', name: 'Canada Eastern Time', city: 'Toronto', region: 'North America / Canada' },
  { id: 'America/Vancouver', name: 'Canada Pacific Time', city: 'Vancouver', region: 'North America / Canada' },
  { id: 'America/Sao_Paulo', name: 'Brasilia Time (BRT)', city: 'São Paulo', region: 'South America / Brazil' },
  { id: 'Pacific/Honolulu', name: 'Hawaii Standard Time (HST)', city: 'Honolulu', region: 'Pacific / Hawaii' }
];

const PRESETS = [
  { label: 'UTC → IST', source: 'UTC', destinations: ['Asia/Kolkata'] },
  { label: 'IST → Pacific', source: 'Asia/Kolkata', destinations: ['America/Los_Angeles'] },
  { label: 'IST → London', source: 'Asia/Kolkata', destinations: ['Europe/London'] },
  { label: 'IST → Singapore', source: 'Asia/Kolkata', destinations: ['Asia/Singapore'] },
  { label: 'IST → Tokyo', source: 'Asia/Kolkata', destinations: ['Asia/Tokyo'] },
  { label: 'New York → India', source: 'America/New_York', destinations: ['Asia/Kolkata'] },
  { label: 'Dubai → India', source: 'Asia/Dubai', destinations: ['Asia/Kolkata'] },
  { label: 'Sydney → India', source: 'Australia/Sydney', destinations: ['Asia/Kolkata'] },
  { label: 'Major Tech Hubs', source: 'Asia/Kolkata', destinations: ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'] },
];

function getUtcTimestamp(year, month, day, hour, minute, timeZone) {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date(targetUtc));
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = parseInt(p.value, 10);
  }
  if (partMap.hour === 24) partMap.hour = 0;

  const localUtcFromParts = Date.UTC(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    partMap.hour,
    partMap.minute,
    partMap.second
  );

  const offsetMs = localUtcFromParts - targetUtc;
  return new Date(targetUtc - offsetMs);
}

function formatZoneTime(utcDate, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });

  const formatted = formatter.format(utcDate);

  // Get parts for detailed calculations
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  });

  const parts = partsFormatter.formatToParts(utcDate);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }

  if (partMap.hour === '24') partMap.hour = '00';

  const localDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${partMap.hour}:${partMap.minute}`;
  const tzName = partMap.timeZoneName || '';

  return {
    formatted,
    localDateStr,
    timeStr,
    tzName,
    year: parseInt(partMap.year, 10),
    month: parseInt(partMap.month, 10),
    day: parseInt(partMap.day, 10),
    hour: parseInt(partMap.hour, 10),
    minute: parseInt(partMap.minute, 10),
  };
}

function getOffsetMs(utcDate, timeZone) {
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  const parts = partsFormatter.formatToParts(utcDate);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = parseInt(p.value, 10);
  }
  if (partMap.hour === 24) partMap.hour = 0;

  const localUtc = Date.UTC(partMap.year, partMap.month - 1, partMap.day, partMap.hour, partMap.minute, partMap.second);
  return localUtc - utcDate.getTime();
}

function formatOffsetDiff(diffMs) {
  if (Math.abs(diffMs) < 60000) return 'Same time';
  const totalMinutes = Math.round(diffMs / 60000);
  const sign = totalMinutes > 0 ? '+' : '-';
  const absMins = Math.abs(totalMinutes);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  if (mins === 0) return `${sign}${hours} hr${hours !== 1 ? 's' : ''}`;
  return `${sign}${hours}h ${mins}m`;
}

function getInitialDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${mins}` };
}

export default function GlobalTimeZoneConverter() {
  const initial = useMemo(() => getInitialDateTime(), []);
  const [sourceDate, setSourceDate] = useState(initial.date);
  const [sourceTime, setSourceTime] = useState(initial.time);
  const [sourceZone, setSourceZone] = useState('Asia/Kolkata');
  const [selectedDestinations, setSelectedDestinations] = useState([
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(null);

  const resetToNow = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    setSourceDate(`${year}-${month}-${day}`);
    setSourceTime(`${hours}:${mins}`);
  }, []);

  const sourceUtcDate = useMemo(() => {
    if (!sourceDate || !sourceTime) return new Date();
    const [y, m, d] = sourceDate.split('-').map(Number);
    const [h, min] = sourceTime.split(':').map(Number);
    if (!y || !m || !d || isNaN(h) || isNaN(min)) return new Date();
    return getUtcTimestamp(y, m, d, h, min, sourceZone);
  }, [sourceDate, sourceTime, sourceZone]);

  const sourceInfo = useMemo(() => {
    return formatZoneTime(sourceUtcDate, sourceZone);
  }, [sourceUtcDate, sourceZone]);

  const sourceOffsetMs = useMemo(() => {
    return getOffsetMs(sourceUtcDate, sourceZone);
  }, [sourceUtcDate, sourceZone]);

  const conversions = useMemo(() => {
    return selectedDestinations.map(destId => {
      const tzObj = TIMEZONES.find(t => t.id === destId) || { id: destId, name: destId, city: destId, region: '' };
      const info = formatZoneTime(sourceUtcDate, destId);
      const destOffsetMs = getOffsetMs(sourceUtcDate, destId);
      const diffMs = destOffsetMs - sourceOffsetMs;
      const diffText = formatOffsetDiff(diffMs);

      // Day difference relative to source local date
      const sourceDateVal = new Date(sourceInfo.year, sourceInfo.month - 1, sourceInfo.day);
      const destDateVal = new Date(info.year, info.month - 1, info.day);
      const dayDiff = Math.round((destDateVal - sourceDateVal) / (1000 * 60 * 60 * 24));

      let dayBadge = 'Same day';
      if (dayDiff > 0) dayBadge = `+${dayDiff} day (${info.formatted.split(',')[0]})`;
      else if (dayDiff < 0) dayBadge = `${dayDiff} day (${info.formatted.split(',')[0]})`;

      return {
        tzObj,
        info,
        diffText,
        dayBadge,
        dayDiff,
        destOffsetMs
      };
    });
  }, [selectedDestinations, sourceUtcDate, sourceOffsetMs, sourceInfo]);

  const toggleDestination = useCallback((id) => {
    setSelectedDestinations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const selectPreset = useCallback((preset) => {
    setSourceZone(preset.source);
    setSelectedDestinations(preset.destinations);
  }, []);

  const copyAllText = useMemo(() => {
    const srcObj = TIMEZONES.find(t => t.id === sourceZone);
    const lines = [
      `Global Time Zone Conversion`,
      `Source: ${sourceInfo.formatted} (${srcObj?.name || sourceZone})`,
      `---`
    ];
    conversions.forEach(c => {
      lines.push(`• ${c.tzObj.name} (${c.info.tzName}): ${c.info.formatted} [${c.diffText}]`);
    });
    return lines.join('\n');
  }, [sourceZone, sourceInfo, conversions]);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyAllText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // fallback if clipboard fails
    }
  }, [copyAllText]);

  const handleCopySingle = useCallback(async (tzId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSingle(tzId);
      setTimeout(() => setCopiedSingle(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const filteredZones = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter(tz =>
      tz.name.toLowerCase().includes(q) ||
      tz.id.toLowerCase().includes(q) ||
      tz.city.toLowerCase().includes(q) ||
      tz.region.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  return (
    <div className="space-y-6">
      {/* Quick Presets / Conversion Examples */}
      <div>
        <span className="text-xs font-medium text-slate-400 block mb-2">Quick Conversion Examples & Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => selectPreset(p)}
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-violet-500/50 hover:text-violet-400 hover:bg-slate-900 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Timezone & Date/Time Selectors */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Clock size={16} className="text-violet-400" />
            Source Timezone & Date
          </div>
          <button
            type="button"
            onClick={resetToNow}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2.5 py-1 rounded-lg transition"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              {TIMEZONES.map(tz => (
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
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 px-4 py-3 flex items-center justify-between text-xs text-violet-300">
          <span className="font-semibold">Source Time:</span>
          <span className="font-mono text-sm text-white">{sourceInfo.formatted}</span>
        </div>
      </div>

      {/* Destination Timezones Selection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Globe size={16} className="text-violet-400" />
            Compare Destination Time Zones ({selectedDestinations.length} selected)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDestinations(TIMEZONES.map(t => t.id))}
              className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-800 hover:border-slate-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedDestinations([])}
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
                  onChange={() => toggleDestination(tz.id)}
                  className="rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{tz.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{tz.city} {isSource ? '(Source)' : ''}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Converted Results & Comparison Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            Converted Time Comparison
          </h3>

          {conversions.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />}
              {copiedAll ? 'Copied All Results!' : 'Copy All Results'}
            </button>
          )}
        </div>

        {conversions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
            Select one or more destination time zones above to compare times.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {conversions.map(c => {
              const singleText = `${c.tzObj.name}: ${c.info.formatted} (${c.diffText})`;
              const isCopied = copiedSingle === c.tzObj.id;

              return (
                <div
                  key={c.tzObj.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{c.tzObj.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {c.info.tzName}
                      </span>
                      {c.dayDiff !== 0 && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.dayDiff > 0 ? 'bg-amber-950/60 border border-amber-800/60 text-amber-300' : 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-300'}`}>
                          {c.dayBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{c.tzObj.city} • {c.tzObj.region}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-900">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-bold text-violet-300 font-mono">
                        {c.info.formatted}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Offset vs source: <span className="text-slate-300">{c.diffText}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopySingle(c.tzObj.id, singleText)}
                      aria-label={`Copy ${c.tzObj.name} converted time`}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition shrink-0"
                    >
                      {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <ArrowRight size={14} className="text-violet-400" /> Daylight Saving Time (DST) Awareness
        </p>
        <p>
          Calculations use real IANA time zones (e.g., <code className="text-slate-300">America/New_York</code>, <code className="text-slate-300">Europe/London</code>, <code className="text-slate-300">Asia/Kolkata</code>). Daylight saving time transitions (such as EDT/EST, BST/GMT, AEDT/AEST) are evaluated dynamically based on the specific date you select.
        </p>
      </div>
    </div>
  );
}
