import { Link } from 'react-router-dom';

const occasions = [
  { slug: 'diwali', label: '🪔 Diwali' },
  { slug: 'birthday', label: '🎂 Birthday' },
  { slug: 'anniversary', label: '💍 Anniversary' },
  { slug: 'announcement', label: '📣 Announcement' },
  { slug: 'celebrations', label: '🎉 Celebrations' },
];

export function MomentsMarquee() {
  return <section aria-label="OrbitBoard Moments" className="mx-auto max-w-6xl py-4">
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/40">
      <Link to="/moments" className="shrink-0 text-sm font-bold text-violet-800 dark:text-violet-200">✨ OrbitBoard Moments</Link>
      <div className="min-w-0 flex-1 overflow-x-auto" role="group" aria-label="Create a greeting">
        <div className="flex w-max items-center gap-2">
          {occasions.map(({ slug, label }) => <Link key={slug} to={`/moments/${slug}`} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-violet-700 dark:bg-violet-900 dark:text-white">{label}</Link>)}
        </div>
      </div>
      <Link to="/moments" className="shrink-0 text-xs font-semibold text-violet-800 underline dark:text-violet-200">Explore all →</Link>
    </div>
  </section>;
}
