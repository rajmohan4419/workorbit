import { useState, useMemo, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
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

  const handleSelectAllDestinations = useCallback(() => {
    setSelectedDestinations(TIMEZONES.map(t => t.id));
  }, []);

  const handleDeselectAllDestinations = useCallback(() => {
    setSelectedDestinations([]);
  }, []);

  return (
    <div className="space-y-6">
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
