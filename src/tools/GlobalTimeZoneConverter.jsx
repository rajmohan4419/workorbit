import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowRight, Share2, Check, Sparkles } from 'lucide-react';
import { useToolShareContext } from '../lib/shareResults';
import {
  TIMEZONES,
  PRESETS,
  getUtcTimestamp,
  formatZoneTime,
  getOffsetMs,
  formatOffsetDiff,
  getInitialDateTime
} from './timezone/timezoneUtils';
import PresetSelector from './timezone/components/PresetSelector';
import SourceZoneCard from './timezone/components/SourceZoneCard';
import DestinationZoneSelector from './timezone/components/DestinationZoneSelector';
import ConversionResultsList from './timezone/components/ConversionResultsList';

export default function GlobalTimeZoneConverter() {
  const { updateSharePayload, openShareModal } = useToolShareContext();
  const initial = useMemo(() => {
    const base = getInitialDateTime();
    if (typeof window === 'undefined') {
      return { ...base, sourceZone: 'Asia/Kolkata', destinations: null };
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromParam = sp.get('from') || sp.get('sourceZone');
      const dateParam = sp.get('date');
      const timeParam = sp.get('time');
      const toParam = sp.get('to') || sp.get('dests');

      let validZone = 'Asia/Kolkata';
      if (fromParam && TIMEZONES.some(t => t.id.toLowerCase() === fromParam.toLowerCase())) {
        const found = TIMEZONES.find(t => t.id.toLowerCase() === fromParam.toLowerCase());
        if (found) validZone = found.id;
      }

      let validDate = base.date;
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        validDate = dateParam;
      }

      let validTime = base.time;
      if (timeParam && /^\d{1,2}:\d{2}$/.test(timeParam)) {
        validTime = timeParam.padStart(5, '0');
      }

      let validDests = null;
      if (toParam) {
        const rawList = toParam.split(',').map(s => s.trim().toLowerCase());
        const matched = TIMEZONES.filter(t => rawList.includes(t.id.toLowerCase())).map(t => t.id);
        if (matched.length > 0) validDests = matched;
      }

      return {
        date: validDate,
        time: validTime,
        sourceZone: validZone,
        destinations: validDests,
      };
    } catch {
      return { ...base, sourceZone: 'Asia/Kolkata', destinations: null };
    }
  }, []);

  const [sourceDate, setSourceDate] = useState(initial.date);
  const [sourceTime, setSourceTime] = useState(initial.time);
  const [sourceZone, setSourceZone] = useState(initial.sourceZone);
  const [selectedDestinations, setSelectedDestinations] = useState(initial.destinations || [
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
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('from', sourceZone);
      params.set('date', sourceDate);
      params.set('time', sourceTime);
      if (selectedDestinations.length > 0) {
        params.set('to', selectedDestinations.join(','));
      } else {
        params.delete('to');
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // ignore
    }
  }, [sourceZone, sourceDate, sourceTime, selectedDestinations]);

  // Live Result Share Context Registration
  useEffect(() => {
    const fromCity = (sourceZone || '').split('/').pop().replace('_', ' ');
    const toCity = selectedDestinations?.[0] ? selectedDestinations[0].split('/').pop().replace('_', ' ') : 'Global';
    updateSharePayload({
      headlineMetric: `${fromCity} ↔ ${toCity}`,
      subMetrics: [
        { label: 'Source Time', value: `${sourceTime} (${fromCity})` },
        { label: 'Date', value: sourceDate },
        { label: 'Active Zones', value: `${selectedDestinations.length} zones` },
      ],
      summaryText: `Coordinating meeting between ${fromCity} (${sourceTime}) and ${selectedDestinations.length} international time zones on OrbitBoard.`,
      queryParams: {
        from: sourceZone,
        date: sourceDate,
        time: sourceTime,
        to: selectedDestinations.join(','),
      },
    });
  }, [sourceZone, sourceDate, sourceTime, selectedDestinations, updateSharePayload]);

  const handleCopyShareLink = useCallback(async () => {
    const params = new URLSearchParams();
    if (sourceZone) params.set('from', sourceZone);
    if (sourceDate) params.set('date', sourceDate);
    if (sourceTime) params.set('time', sourceTime);
    if (selectedDestinations.length > 0) params.set('to', selectedDestinations.join(','));
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  }, [sourceZone, sourceDate, sourceTime, selectedDestinations]);

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

  const handleSelectAllDestinations = useCallback(() => {
    setSelectedDestinations(TIMEZONES.map(t => t.id));
  }, []);

  const handleDeselectAllDestinations = useCallback(() => {
    setSelectedDestinations([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Live Time Zone Meeting Converter</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">Convert team times across IST, EST, PST, GMT, BST, JST, and AEDT with automatic DST adjustment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-50 dark:bg-accent-950/50 text-accent-700 dark:text-accent-300 border border-accent-200 dark:border-accent-800 hover:bg-accent-100 dark:hover:bg-accent-900/50 transition cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Copy Shareable Link</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => openShareModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-[var(--orbit-border)] transition cursor-pointer shadow-2xs"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Share Scorecard</span>
          </button>
        </div>
      </div>

      {/* Quick Presets / Conversion Examples */}
      <PresetSelector presets={PRESETS} onSelectPreset={selectPreset} />

      {/* Source Timezone & Date/Time Selectors */}
      <SourceZoneCard
        sourceZone={sourceZone}
        setSourceZone={setSourceZone}
        sourceDate={sourceDate}
        setSourceDate={setSourceDate}
        sourceTime={sourceTime}
        setSourceTime={setSourceTime}
        timezones={TIMEZONES}
        onResetToNow={resetToNow}
        formattedSourceTime={sourceInfo.formatted}
      />

      {/* Destination Timezones Selection */}
      <DestinationZoneSelector
        selectedDestinations={selectedDestinations}
        sourceZone={sourceZone}
        filteredZones={filteredZones}
        filterQuery={filterQuery}
        setFilterQuery={setFilterQuery}
        onSelectAll={handleSelectAllDestinations}
        onDeselectAll={handleDeselectAllDestinations}
        onToggleDestination={toggleDestination}
      />

      {/* Converted Results & Comparison Cards */}
      <ConversionResultsList
        conversions={conversions}
        copiedAll={copiedAll}
        copiedSingle={copiedSingle}
        onCopyAll={handleCopyAll}
        onCopySingle={handleCopySingle}
      />

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <ArrowRight size={14} className="text-accent-400" /> Daylight Saving Time (DST) Awareness
        </p>
        <p>
          Calculations use real IANA time zones (e.g., <code className="text-slate-300">America/New_York</code>, <code className="text-slate-300">Europe/London</code>, <code className="text-slate-300">Asia/Kolkata</code>). Daylight saving time transitions (such as EDT/EST, BST/GMT, AEDT/AEST) are evaluated dynamically based on the specific date you select.
        </p>
      </div>
    </div>
  );
}
