import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { festivalTemplatePath, formatFestivalDates, millisecondsUntilIndiaMidnight, upcomingFestivals } from '../lib/festivalCalendar';

const track = (festival, destination) => trackEvent('moments_festival_clicked', { festival: festival?.id ?? 'evergreen', destination });

function FestivalDate({ festival }) {
  return <span><time dateTime={festival.startsOn}>{formatFestivalDates(festival)}</time> · {festival.region}</span>;
}

export function UpcomingFestivals() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    function update() {
      const date = new Date();
      setNow(date);
      clearTimeout(timer);
      timer = window.setTimeout(update, millisecondsUntilIndiaMidnight(date));
    }
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const { featured, upcoming } = upcomingFestivals(now);
  const template = featured && festivalTemplatePath(featured);
  return (
    <section aria-labelledby="upcoming-festivals-title" className="mx-auto my-4 max-w-6xl rounded-2xl border border-amber-300/50 bg-amber-50/85 px-4 py-4 text-stone-900 dark:border-amber-900 dark:bg-stone-900 dark:text-amber-50 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="upcoming-festivals-title" className="text-xs font-bold uppercase tracking-widest text-amber-900 dark:text-amber-300">Upcoming Festivals &amp; Holidays</h2>
          {featured ? <>
            <h3 className="mt-1 text-lg font-semibold">{featured.title}</h3>
            <p className="text-sm text-stone-700 dark:text-stone-300"><FestivalDate festival={featured} /></p>
          </> : <p className="mt-1 text-sm">Send a little joy for any occasion with OrbitBoard Moments.</p>}
        </div>
        {template && <Link to={template} aria-label={`Create a Wish for ${featured.title}`} onClick={() => track(featured, 'template')} className="inline-flex min-h-11 items-center rounded-full bg-amber-950 px-4 text-sm font-semibold text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950">Create a Wish</Link>}
        {!featured && <Link to="/moments" onClick={() => track(null, 'moments')} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Explore OrbitBoard Moments</Link>}
        {featured && !template && <a href={featured.details ?? featured.source} onClick={() => track(featured, 'details')} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">About {featured.title}</a>}
      </div>
      {upcoming.length > 0 && <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-amber-900/15 pt-3 text-sm dark:border-amber-100/20">
        {upcoming.map(festival => {
          const path = festivalTemplatePath(festival);
          return <li key={festival.id}>
            {path
              ? <Link to={path} onClick={() => track(festival, 'template')} className="font-semibold underline underline-offset-4">{festival.title} wishes</Link>
              : <a href={festival.details ?? festival.source} onClick={() => track(festival, 'details')} className="font-semibold underline underline-offset-4">{festival.title}</a>}
            <span className="ml-2 text-stone-700 dark:text-stone-300"><FestivalDate festival={festival} /></span>
          </li>;
        })}
      </ul>}
    </section>
  );
}
