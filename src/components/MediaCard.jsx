import { useEffect, useState } from 'react';
import { getWatchProviders, TMDB_IMAGE_BASE } from '../lib/services/ottService';

export default function MediaCard({ item }) {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);

  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const type = item.media_type || (item.title ? 'movie' : 'tv');

  useEffect(() => {
    let mounted = true;
    getWatchProviders(item.id, type).then(data => {
      if (mounted) {
        setProviders(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [item.id, type]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition duration-200">
      <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
        {item.poster_path ? (
          <img
            src={`${TMDB_IMAGE_BASE}/w500${item.poster_path}`}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Poster</div>
        )}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-xs font-semibold text-amber-400">
          ★ {item.vote_average?.toFixed(1) || 'NR'}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-semibold text-sm line-clamp-1">{title}</h3>
        <p className="text-slate-400 text-xs mb-3">{year} • {type.toUpperCase()}</p>

        <div className="mt-auto pt-3 border-t border-slate-800">
          <p className="text-[11px] font-medium text-slate-400 mb-2">Streaming in India:</p>
          {loading ? (
            <div className="h-6 bg-slate-800 animate-pulse rounded" />
          ) : providers?.flatrate?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {providers.flatrate.map(p => (
                <img
                  key={p.provider_id}
                  src={`${TMDB_IMAGE_BASE}/w92${p.logo_path}`}
                  alt={p.provider_name}
                  title={`${p.provider_name} (Included with Sub)`}
                  className="w-6 h-6 rounded-md shadow"
                />
              ))}
              <span className="text-[10px] text-emerald-400 font-medium ml-1">Stream</span>
            </div>
          ) : providers?.rent?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {providers.rent.slice(0, 3).map(p => (
                <img
                  key={p.provider_id}
                  src={`${TMDB_IMAGE_BASE}/w92${p.logo_path}`}
                  alt={p.provider_name}
                  title={`${p.provider_name} (Rent)`}
                  className="w-6 h-6 rounded-md opacity-80"
                />
              ))}
              <span className="text-[10px] text-amber-400 font-medium ml-1">Rent</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">Not streaming right now</p>
          )}
        </div>
      </div>
    </div>
  );
}
