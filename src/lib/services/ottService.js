import { supabase } from '../supabase';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// 1. Fetch Indian Watch Providers (Cache First)
export async function getWatchProviders(item, type = 'movie') {
  try {
    // A. Check Supabase Cache
    const { data: cached } = await supabase
      .from('ott_catalog_cache')
      .select('*')
      .eq('tmdb_id', item.id)
      .single();

    const now = new Date();
    if (cached && new Date(cached.expires_at) > now && cached.providers) {
      return cached.providers;
    }

    // B. Cache Miss or Expired: Fetch from TMDB API
    const res = await fetch(`${BASE_URL}/${type}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`);
    const json = await res.json();
    const indiaProviders = json.results?.IN || { flatrate: [], rent: [], buy: [] };

    // C. Upsert into Supabase for next 7 days
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

    await supabase.from('ott_catalog_cache').upsert({
      tmdb_id: item.id,
      title: item.title || item.name,
      media_type: type,
      release_year: year,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      overview: item.overview,
      providers: indiaProviders,
      last_synced_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'tmdb_id' });

    return indiaProviders;
  } catch (err) {
    console.error('Error fetching watch providers:', err);
    return null;
  }
}

// 2. Search Media (Movies + Shows)
export async function searchMedia(query) {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&region=IN`
    );
    const data = await res.json();
    return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

// 3. Daily Trending in India
export async function getTrending() {
  try {
    const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&region=IN`);
    const data = await res.json();
    return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (err) {
    console.error('Trending error:', err);
    return [];
  }
}

// Helper to construct direct watch / search URLs for platforms
export function getWatchUrl(providerName, title, tmdbLink) {
  const name = providerName.toLowerCase();
  const encodedTitle = encodeURIComponent(title);

  if (name.includes('netflix')) {
    return `https://www.netflix.com/search?q=${encodedTitle}`;
  }
  if (name.includes('prime') || name.includes('amazon')) {
    return `https://www.primevideo.com/search?phrase=${encodedTitle}`;
  }
  if (name.includes('hotstar') || name.includes('jiohotstar')) {
    return `https://www.hotstar.com/in/search?q=${encodedTitle}`;
  }
  if (name.includes('zee5') || name.includes('zee')) {
    return `https://www.zee5.com/search?q=${encodedTitle}`;
  }
  if (name.includes('sonyliv') || name.includes('sony')) {
    return `https://www.sonyliv.com/search?q=${encodedTitle}`;
  }
  if (name.includes('jiocinema')) {
    return `https://www.jiocinema.com/search/${encodedTitle}`;
  }
  return tmdbLink || `https://www.google.com/search?q=${encodedTitle}+watch+online`;
}

// Check if a platform matches selected filter
export function isProviderMatch(flatrateProviders, selectedPlatform) {
  if (!selectedPlatform || selectedPlatform === 'All') return true;
  if (!flatrateProviders || flatrateProviders.length === 0) return false;

  const target = selectedPlatform.toLowerCase();
  return flatrateProviders.some(p => {
    const pName = p.provider_name.toLowerCase();
    if (target === 'jiohotstar' || target === 'hotstar') {
      return pName.includes('hotstar') || pName.includes('jio');
    }
    if (target.includes('netflix')) return pName.includes('netflix');
    if (target.includes('amazon') || target.includes('prime')) return pName.includes('prime') || pName.includes('amazon');
    if (target.includes('sonyliv') || target.includes('sony')) return pName.includes('sony') || pName.includes('liv');
    if (target.includes('zee5') || target.includes('zee')) return pName.includes('zee');
    return pName.includes(target);
  });
}
