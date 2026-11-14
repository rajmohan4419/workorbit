import { describe, expect, it } from 'vitest';
import { festivalTemplatePath, formatFestivalDates, millisecondsUntilIndiaMidnight, upcomingFestivals } from './festivalCalendar';

describe('festival rotation in Asia/Kolkata', () => {
  it('features Chhath starting at IST midnight and links its verified range to the template', () => {
    const before = new Date('2026-11-08T18:29:59.999Z');
    const open = new Date('2026-11-08T18:30:00.000Z');
    expect(upcomingFestivals(before).featured).toBeNull();
    expect(millisecondsUntilIndiaMidnight(before)).toBe(1);
    const { featured, upcoming } = upcomingFestivals(open);
    expect(festivalTemplatePath(featured)).toBe('/moments/chhath-puja');
    expect(formatFestivalDates(featured)).toBe('15–16 Nov 2026');
    expect(upcoming.map(({ id }) => id)).toEqual(['guru-nanak-jayanti-2026']);
  });

  it('keeps Chhath through its last IST day and removes it from all slots after midnight', () => {
    expect(upcomingFestivals(new Date('2026-11-16T18:29:59Z')).featured.id).toBe('chhath-puja-2026');
    const { featured, upcoming } = upcomingFestivals(new Date('2026-11-16T18:30:00Z'));
    expect(featured.id).toBe('guru-nanak-jayanti-2026');
    expect(festivalTemplatePath(featured)).toBeNull();
    expect(upcoming.map(({ id }) => id)).toEqual(['christmas-2026']);
  });

  it('rotates to Christmas and returns to the evergreen entry after the schedule ends', () => {
    expect(festivalTemplatePath(upcomingFestivals(new Date('2026-12-12T06:00:00Z')).featured)).toBe('/moments/christmas');
    expect(upcomingFestivals(new Date('2026-12-25T18:30:00Z'))).toEqual({ featured: null, upcoming: [] });
  });
});
