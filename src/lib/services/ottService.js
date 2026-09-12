const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Fetch Trending in India
export async function getTrending(mediaType = 'all', timeWindow = 'day') {
  const res = await fetch(`${BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${API_KEY}&region=IN`);
  const data = await res.json();
  return data.results || [];
}

// Search Movies & Shows
export async function searchMedia(query) {
  if (!query.trim()) return [];
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&region=IN`);
  const data = await res.json();
  return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
}

// Get Streaming Providers (Filtered for India - IN)
export async function getWatchProviders(id, type = 'movie') {
  const res = await fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results?.IN || null;
}
