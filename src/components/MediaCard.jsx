import { useEffect, useState } from 'react';
import { getWatchProviders, TMDB_IMAGE_BASE } from '../lib/services/ottService';

// Brand colors for top Indian OTT platforms
const PROVIDER_THEMES = {
  'JioHotstar': 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  'Disney Plus Hotstar': 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  'Netflix': 'bg-red-600/20 text-red-400 border-red-500/30',
  'Amazon Prime Video': 'bg-sky-600/20 text-sky-400 border-sky-500/30',
  'Zee5': 'bg-purple-600/20 text-purple-400 border-purple-500/30',
  'SonyLIV': 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  'JioCinema': 'bg-pink-600/20 text-pink-400 border-pink-500/30',
  'aha': 'bg-orange-600/20 text-orange-400 border-orange-500/30',
};

export default function MediaCard({ item }) {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);

  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const type = item.media_type || (item.title ? 'movie' : 'tv');

  useEffect(() => {
    let mounted = true;
    getWatchProviders(item, type).then(data => {
      if (mounted) {
        setProviders(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [item, type]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/40 transition duration-200 group">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
        {item.poster_path ? (
          <img
            src={`${TMDB_IMAGE_BASE}/w500${item.poster_path}`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Poster</div>
        )}
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold text-amber-400">
          ★ {item.vote_average ? item.vote_average.toFixed(1) : 'NR'}
        </div>
      </div>

      {/* Info & Providers */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-violet-300 transition">
            {title}
          </h3>
          <p className="text-slate-400 text-xs mb-3">{year} • {type.toUpperCase()}</p>
        </div>

        <div className="pt-2.5 border-t border-slate-800/80">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-1.5">
            Streaming in India
          </p>

          {loading ? (
            <div className="h-6 bg-slate-800 animate-pulse rounded" />
          ) : providers?.flatrate?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {providers.flatrate.map(p => {
                const badgeStyle = PROVIDER_THEMES[p.provider_name] || 'bg-slate-800 text-slate-300 border-slate-700';
                return (
                  <span
                    key={p.provider_id}
                    title={p.provider_name}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeStyle}`}
                  >
                    <img
                      src={`${TMDB_IMAGE_BASE}/w45${p.logo_path}`}
                      alt=""
                      className="w-3.5 h-3.5 rounded-sm object-cover"
                    />
                    <span className="truncate max-w-[80px]">{p.provider_name}</span>
                  </span>
                );
              })}
            </div>
          ) : providers?.rent?.length > 0 ? (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                Rent on {providers.rent[0]?.provider_name}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">Not streaming right now</p>
          )}
        </div>
      </div>
    </div>
  );
}
