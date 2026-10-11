export const TIMEZONES = [
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

export const PRESETS = [
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

export function getUtcTimestamp(year, month, day, hour, minute, timeZone) {
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

export function formatZoneTime(utcDate, timeZone) {
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

export function getOffsetMs(utcDate, timeZone) {
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

export function formatOffsetDiff(diffMs) {
  if (Math.abs(diffMs) < 60000) return 'Same time';
  const totalMinutes = Math.round(diffMs / 60000);
  const sign = totalMinutes > 0 ? '+' : '-';
  const absMins = Math.abs(totalMinutes);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  if (mins === 0) return `${sign}${hours} hr${hours !== 1 ? 's' : ''}`;
  return `${sign}${hours}h ${mins}m`;
}

export function getInitialDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${mins}` };
}
