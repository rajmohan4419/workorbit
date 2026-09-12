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
