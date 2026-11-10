import { MOMENT_SLUGS } from './moments.js';

export const FESTIVAL_TIME_ZONE = 'Asia/Kolkata';

// Update this list with verified local dates. Display windows include both endpoints.
export const FESTIVALS = [
  {
    id: 'chhath-puja-2026',
    title: 'Chhath Puja',
    region: 'Bihar and eastern Uttar Pradesh',
    startsOn: '2026-11-15',
    endsOn: '2026-11-16',
    displayFrom: '2026-11-09',
    priority: 1,
    templateId: 'chhath-puja',
    source: 'https://upyog.bihar.gov.in/c/holiday-calendar',
    details: 'https://tourism.bihar.gov.in/en/experiences/festivals-and-fairs/festivals/chhath-puja',
  },
  {
    id: 'guru-nanak-jayanti-2026',
    title: 'Guru Nanak Jayanti',
    region: 'Across India',
    startsOn: '2026-11-24',
    endsOn: '2026-11-24',
    displayFrom: '2026-11-17',
    templateId: null,
    source: 'https://www.indiapost.gov.in/holidays-list',
  },
  {
    id: 'christmas-2026',
    title: 'Christmas',
    region: 'Across India',
    startsOn: '2026-12-25',
    endsOn: '2026-12-25',
    displayFrom: '2026-12-12',
    templateId: 'christmas',
    source: 'https://www.indiapost.gov.in/holidays-list',
    details: 'https://www.incredibleindia.gov.in/en/festivals-and-events/christmas',
  },
];

const dateParts = new Intl.DateTimeFormat('en', {
  timeZone: FESTIVAL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const dateLabel = new Intl.DateTimeFormat('en-IN', {
  timeZone: FESTIVAL_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
});

function indiaDate(now) {
  const { year, month, day } = Object.fromEntries(dateParts.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${year}-${month}-${day}`;
}

export function millisecondsUntilIndiaMidnight(now) {
  const today = new Date(`${indiaDate(now)}T00:00:00+05:30`);
  return today.getTime() + 86_400_000 - now.getTime();
}

export function festivalTemplatePath(festival) {
  return MOMENT_SLUGS.includes(festival.templateId) ? `/moments/${festival.templateId}` : null;
}

export function upcomingFestivals(now = new Date()) {
  const today = indiaDate(now);
  const horizon = indiaDate(new Date(now.getTime() + 45 * 86_400_000));
  const current = FESTIVALS
    .filter(item => item.endsOn >= today && item.startsOn <= horizon)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const featured = current
    .filter(item => item.displayFrom <= today)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ?? null;
  return { featured, upcoming: current.filter(item => item !== featured).slice(0, 3) };
}

export function formatFestivalDates({ startsOn, endsOn }) {
  const format = date => dateLabel.format(new Date(`${date}T12:00:00+05:30`));
  if (startsOn === endsOn) return format(startsOn);
  return startsOn.slice(0, 7) === endsOn.slice(0, 7)
    ? `${Number(startsOn.slice(-2))}–${format(endsOn)}`
    : `${format(startsOn)} – ${format(endsOn)}`;
}
